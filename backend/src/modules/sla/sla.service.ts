import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Priority, SlaState, terminalStatuses } from '../../common/enums.js';
import { SlaPolicy } from '../../entities/sla.entity.js';
import { Ticket } from '../../entities/ticket.entity.js';
import { TicketActivity } from '../../entities/ticket-activities.entity.js';
import { slaView } from '../tickets/workflow.js';
import { UpdateSlaDto } from './sla.dto.js';

@Injectable()
export class SlaService
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private timer?: ReturnType<typeof setInterval>;
  private running?: Promise<{ escalated: number }>;
  private readonly logger = new Logger(SlaService.name);
  constructor(@Inject(DataSource) private readonly db: DataSource) {}
  onApplicationBootstrap() {
    if (process.env.SLA_SCHEDULER_ENABLED === 'false') return;
    this.timer = setInterval(() => {
      void this.sweep().catch(() =>
        this.logger.error('SLA sweep failed; will retry on the next interval'),
      );
    }, 60000);
    this.timer.unref();
  }
  async onApplicationShutdown() {
    if (this.timer) clearInterval(this.timer);
    await this.running?.catch(() => undefined);
  }
  list() {
    return this.db
      .getRepository(SlaPolicy)
      .find({ order: { resolutionMinutes: 'ASC' } });
  }
  async update(priority: Priority, dto: UpdateSlaDto) {
    if (dto.resolutionMinutes < dto.responseMinutes)
      throw new BadRequestException(
        'Resolution SLA must be at least the response SLA',
      );
    return this.db
      .getRepository(SlaPolicy)
      .save({
        priority,
        responseMinutes: dto.responseMinutes,
        resolutionMinutes: dto.resolutionMinutes,
      });
  }
  sweep(): Promise<{ escalated: number }> {
    if (this.running) return this.running;
    this.running = this.performSweep().finally(() => {
      this.running = undefined;
    });
    return this.running;
  }
  private async performSweep() {
    let escalated = 0;
    let after = '';
    // Keyset batches keep the job bounded in memory. Row locks avoid duplicate
    // audit events when multiple application instances run the scheduler.
    while (true) {
      const qb = this.db
        .getRepository(Ticket)
        .createQueryBuilder('t')
        .select('t.id')
        .where('t.status NOT IN (:...terminal)', { terminal: terminalStatuses })
        .andWhere('t.escalationLevel < 2');
      if (after) qb.andWhere('t.id > :after', { after });
      const batch = await qb.orderBy('t.id', 'ASC').take(200).getMany();
      if (!batch.length) break;
      for (const item of batch) {
        const changed = await this.db.transaction(async (em) => {
          const ticket = await em.findOne(Ticket, {
            where: { id: item.id },
            lock: { mode: 'pessimistic_write' },
          });
          if (!ticket || terminalStatuses.includes(ticket.status)) return false;
          const state = slaView(ticket);
          const states = [state.response, state.resolution];
          const level = states.includes(SlaState.BREACHED)
            ? 2
            : states.includes(SlaState.AT_RISK)
              ? 1
              : 0;
          if (level <= ticket.escalationLevel) return false;
          ticket.escalationLevel = level;
          await em.save(ticket);
          await em.save(
            TicketActivity,
            em.create(TicketActivity, {
              ticketId: ticket.id,
              actorId: null,
              action: level === 2 ? 'SLA_BREACHED' : 'SLA_AT_RISK',
              metadata: {
                response: state.response,
                resolution: state.resolution,
              },
              internal: false,
            }),
          );
          return true;
        });
        if (changed) escalated++;
      }
      after = batch[batch.length - 1].id;
    }
    return { escalated };
  }
}
