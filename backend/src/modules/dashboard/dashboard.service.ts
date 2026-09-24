import { Inject, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Ticket } from '../../entities/ticket.entity.js';
import { SlaState, terminalStatuses } from '../../common/enums.js';
import { slaView } from '../tickets/workflow.js';
@Injectable()
export class DashboardService {
  constructor(@Inject(DataSource) private readonly db: DataSource) {}
  async summary() {
    const byStatus: Record<string, number> = {};
    const workloads = new Map<string | null, number>();
    let total = 0,
      breached = 0,
      atRisk = 0,
      resolved = 0,
      resolutionMs = 0;
    // One repeatable-read snapshot keeps all counters mutually consistent.
    await this.db.transaction('REPEATABLE READ', async (em) => {
      let after = '';
      const now = new Date();
      while (true) {
        const qb = em.getRepository(Ticket).createQueryBuilder('t');
        if (after) qb.where('t.id > :after', { after });
        const batch = await qb.orderBy('t.id', 'ASC').take(500).getMany();
        if (!batch.length) break;
        for (const ticket of batch) {
          total++;
          byStatus[ticket.status] = (byStatus[ticket.status] ?? 0) + 1;
          if (!terminalStatuses.includes(ticket.status)) {
            workloads.set(
              ticket.assignedTo,
              (workloads.get(ticket.assignedTo) ?? 0) + 1,
            );
            const state = slaView(ticket, now);
            if ([state.response, state.resolution].includes(SlaState.BREACHED))
              breached++;
            else if (
              [state.response, state.resolution].includes(SlaState.AT_RISK)
            )
              atRisk++;
          }
          if (ticket.resolvedAt) {
            resolved++;
            resolutionMs += Math.max(
              0,
              ticket.resolvedAt.getTime() -
                (ticket.reopenedAt ?? ticket.createdAt).getTime() -
                ticket.pausedMilliseconds,
            );
          }
        }
        after = batch[batch.length - 1].id;
      }
    });
    return {
      total,
      byStatus,
      breached,
      atRisk,
      averageResolutionMinutes: resolved
        ? resolutionMs / resolved / 60000
        : null,
      workload: [...workloads].map(([assignedTo, count]) => ({
        assignedTo,
        count,
      })),
    };
  }
}
