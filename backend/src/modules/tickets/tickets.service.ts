import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { DataSource, EntityManager } from 'typeorm';
import { PageQuery } from '../../common/dto.js';
import {
  Priority,
  Role,
  Source,
  Status,
  terminalStatuses,
} from '../../common/enums.js';
import { Ticket } from '../../entities/ticket.entity.js';
import { TicketActivity } from '../../entities/ticket-activities.entity.js';
import { TicketComment } from '../../entities/ticket-comments.entity.js';
import { User } from '../../entities/users.entity.js';
import { SlaPolicy } from '../../entities/sla.entity.js';
import {
  AssignDto,
  CommentDto,
  CreateTicketDto,
  ResolveDto,
  StatusDto,
  TicketQuery,
} from './tickets.dto.js';
import { assertTransition, resumeSla, slaView } from './workflow.js';

@Injectable()
export class TicketsService {
  constructor(@Inject(DataSource) private readonly db: DataSource) {}
  private view(ticket: Ticket) {
    return Object.assign({}, ticket, { sla: slaView(ticket) });
  }
  private visible(ticket: Ticket, actor: User) {
    if (actor.role === Role.STUDENT && ticket.studentId !== actor.id)
      throw new NotFoundException('Ticket not found');
  }
  private owner(ticket: Ticket, actor: User) {
    if (
      actor.role === Role.STUDENT ||
      (actor.role === Role.STAFF && ticket.assignedTo !== actor.id)
    )
      throw new ForbiddenException(
        'Only the assigned staff member or an admin can perform this action',
      );
  }
  private active(ticket: Ticket) {
    if (terminalStatuses.includes(ticket.status))
      throw new BadRequestException('Ticket is resolved, closed or cancelled');
  }
  private async policy(em: EntityManager, priority: Priority) {
    const policy = await em.findOneBy(SlaPolicy, { priority });
    if (!policy)
      throw new BadRequestException(
        'SLA policy is not configured for this priority',
      );
    return policy;
  }
  private async activity(
    em: EntityManager,
    ticket: Ticket,
    actor: User,
    action: string,
    metadata: Record<string, unknown> = {},
    internal = false,
  ) {
    await em.save(
      TicketActivity,
      em.create(TicketActivity, {
        ticketId: ticket.id,
        actorId: actor.id,
        action,
        metadata,
        internal,
      }),
    );
  }
  private async locked(em: EntityManager, id: string, actor: User) {
    const ticket = await em.findOne(Ticket, {
      where: { id },
      lock: { mode: 'pessimistic_write' },
    });
    if (!ticket) throw new NotFoundException('Ticket not found');
    this.visible(ticket, actor);
    return ticket;
  }
  private async mutate(
    id: string,
    actor: User,
    action: (ticket: Ticket, em: EntityManager, now: Date) => Promise<void>,
  ) {
    return this.db.transaction(async (em) => {
      const ticket = await this.locked(em, id, actor);
      await action(ticket, em, new Date());
      await em.save(ticket);
      return this.view(ticket);
    });
  }
  async create(dto: CreateTicketDto, actor: User) {
    if (
      actor.role === Role.STUDENT &&
      dto.studentId &&
      dto.studentId !== actor.id
    )
      throw new ForbiddenException('Cannot create tickets for another student');
    const studentId = actor.role === Role.STUDENT ? actor.id : dto.studentId;
    if (!studentId)
      throw new BadRequestException(
        'studentId is required for staff-created tickets',
      );
    return this.db.transaction(async (em) => {
      const student = await em.findOne(User, {
        where: { id: studentId, role: Role.STUDENT, isActive: true },
        lock: { mode: 'pessimistic_read' },
      });
      if (!student)
        throw new BadRequestException(
          'Student must be an active student account',
        );
      const policy = await this.policy(em, dto.priority);
      const now = new Date();
      const ticket = em.create(Ticket, {
        ticketNumber: `TKT-${randomUUID().toUpperCase()}`,
        studentId,
        category: dto.category,
        subject: dto.subject,
        description: dto.description,
        priority: dto.priority,
        status: Status.NEW,
        source:
          actor.role === Role.STUDENT
            ? Source.STUDENT_PORTAL
            : Source.STAFF_CREATED,
        responseDueAt: new Date(now.getTime() + policy.responseMinutes * 60000),
        resolutionDueAt: new Date(
          now.getTime() + policy.resolutionMinutes * 60000,
        ),
        responseMinutes: policy.responseMinutes,
        resolutionMinutes: policy.resolutionMinutes,
        createdAt: now,
        assignedTo: null,
        assignedTeam: null,
        pendingReason: null,
        firstResponseAt: null,
        pausedAt: null,
        resolvedAt: null,
        resolvedBy: null,
        resolutionNote: null,
        resolutionCategory: null,
        closedAt: null,
        reopenedAt: null,
        reopenedBy: null,
        reopenReason: null,
      });
      await em.save(ticket);
      await this.activity(em, ticket, actor, 'CREATED', {
        source: ticket.source,
      });
      return this.view(ticket);
    });
  }
  async list(q: TicketQuery, actor: User) {
    const qb = this.db.getRepository(Ticket).createQueryBuilder('t');
    if (actor.role === Role.STUDENT)
      qb.andWhere('t.studentId = :studentId', { studentId: actor.id });
    for (const field of [
      'status',
      'priority',
      'category',
      'assignedTo',
    ] as const)
      if (q[field])
        qb.andWhere(`t.${field} = :${field}`, { [field]: q[field] });
    if (q.search)
      qb.andWhere('(t.subject ILIKE :search OR t.ticketNumber ILIKE :search)', {
        search: `%${q.search.replace(/[\\%_]/g, '\\$&')}%`,
      });
    const [items, total] = await qb
      .orderBy('t.createdAt', 'DESC')
      .addOrderBy('t.id', 'DESC')
      .skip((q.page - 1) * q.limit)
      .take(q.limit)
      .getManyAndCount();
    return {
      items: items.map((t) => this.view(t)),
      total,
      page: q.page,
      limit: q.limit,
    };
  }
  async get(id: string, actor: User) {
    const ticket = await this.db.getRepository(Ticket).findOneBy({ id });
    if (!ticket) throw new NotFoundException('Ticket not found');
    this.visible(ticket, actor);
    return this.view(ticket);
  }
  async assign(id: string, dto: AssignDto, actor: User) {
    return this.db.transaction(async (em) => {
      const assignee = await em.findOne(User, {
        where: { id: dto.assignedTo },
        lock: { mode: 'pessimistic_read' },
      });
      if (!assignee?.isActive || assignee.role === Role.STUDENT)
        throw new BadRequestException('Assignee must be active staff or admin');
      const ticket = await this.locked(em, id, actor);
      this.active(ticket);
      if (
        actor.role === Role.STUDENT ||
        (actor.role === Role.STAFF &&
          (ticket.assignedTo
            ? ticket.assignedTo !== actor.id
            : dto.assignedTo !== actor.id))
      )
        throw new ForbiddenException(
          'Staff may claim unassigned tickets for themselves or transfer tickets they own',
        );
      if (
        ticket.assignedTo === dto.assignedTo &&
        ticket.assignedTeam === dto.assignedTeam
      )
        throw new BadRequestException(
          'Ticket is already assigned to this user and team',
        );
      const oldValue = {
        assignedTo: ticket.assignedTo,
        assignedTeam: ticket.assignedTeam,
        status: ticket.status,
      };
      ticket.assignedTo = dto.assignedTo;
      ticket.assignedTeam = dto.assignedTeam;
      if (ticket.status === Status.NEW) ticket.status = Status.ASSIGNED;
      await em.save(ticket);
      await this.activity(em, ticket, actor, 'ASSIGNED', {
        oldValue,
        newValue: {
          assignedTo: dto.assignedTo,
          assignedTeam: dto.assignedTeam,
          status: ticket.status,
        },
      });
      return this.view(ticket);
    });
  }
  priority(id: string, priority: Priority, actor: User) {
    return this.mutate(id, actor, async (ticket, em) => {
      this.owner(ticket, actor);
      this.active(ticket);
      if (priority === ticket.priority)
        throw new BadRequestException('Priority is unchanged');
      const policy = await this.policy(em, priority);
      const oldValue = ticket.priority;
      // Reprioritization preserves time already consumed in this SLA cycle.
      const start = (ticket.reopenedAt ?? ticket.createdAt).getTime();
      ticket.responseDueAt = new Date(start + policy.responseMinutes * 60000);
      ticket.resolutionDueAt = new Date(
        start + policy.resolutionMinutes * 60000 + ticket.pausedMilliseconds,
      );
      ticket.responseMinutes = policy.responseMinutes;
      ticket.resolutionMinutes = policy.resolutionMinutes;
      ticket.priority = priority;
      await this.activity(em, ticket, actor, 'PRIORITY_CHANGED', {
        oldValue,
        newValue: priority,
      });
    });
  }
  status(id: string, dto: StatusDto, actor: User) {
    return this.mutate(id, actor, async (ticket, em, now) => {
      this.owner(ticket, actor);
      if (!ticket.assignedTo)
        throw new BadRequestException('Assign the ticket before starting work');
      assertTransition(ticket.status, dto.status);
      if (
        [Status.PENDING_STUDENT, Status.PENDING_INTERNAL].includes(
          dto.status,
        ) &&
        !dto.reason
      )
        throw new BadRequestException('A pending reason is required');
      const oldValue = ticket.status;
      resumeSla(ticket, now);
      ticket.status = dto.status;
      ticket.pendingReason = [
        Status.PENDING_STUDENT,
        Status.PENDING_INTERNAL,
      ].includes(dto.status)
        ? dto.reason!
        : null;
      if (dto.status === Status.PENDING_STUDENT) {
        ticket.pausedAt = now;
        ticket.firstResponseAt ??= now;
      }
      await this.activity(em, ticket, actor, 'STATUS_CHANGED', {
        oldValue,
        newValue: dto.status,
        reason: ticket.pendingReason,
      });
    });
  }
  resolve(id: string, dto: ResolveDto, actor: User) {
    return this.mutate(id, actor, async (ticket, em, now) => {
      this.owner(ticket, actor);
      if (ticket.status !== Status.IN_PROGRESS)
        throw new BadRequestException(
          'Only an IN_PROGRESS ticket can be resolved',
        );
      ticket.status = Status.RESOLVED;
      ticket.resolvedAt = now;
      ticket.resolvedBy = actor.id;
      ticket.resolutionNote = dto.resolutionNote;
      ticket.resolutionCategory = dto.resolutionCategory;
      ticket.firstResponseAt ??= now;
      await this.activity(em, ticket, actor, 'RESOLVED', {
        resolutionNote: dto.resolutionNote,
        resolutionCategory: dto.resolutionCategory,
        resolvedAt: now.toISOString(),
      });
    });
  }
  close(id: string, actor: User) {
    return this.mutate(id, actor, async (ticket, em, now) => {
      if (actor.role !== Role.STUDENT) this.owner(ticket, actor);
      if (ticket.status !== Status.RESOLVED)
        throw new BadRequestException('Only a RESOLVED ticket can be closed');
      ticket.status = Status.CLOSED;
      ticket.closedAt = now;
      await this.activity(em, ticket, actor, 'CLOSED');
    });
  }
  async reopen(id: string, reason: string, actor: User) {
    // Serializes with staff deactivation and assignment without acquiring locks in reverse order.
    const snapshot = await this.get(id, actor);
    return this.db.transaction(async (em) => {
      const assignee = snapshot.assignedTo
        ? await em.findOne(User, {
            where: { id: snapshot.assignedTo },
            lock: { mode: 'pessimistic_read' },
          })
        : null;
      const ticket = await this.locked(em, id, actor);
      if (actor.role !== Role.STUDENT) this.owner(ticket, actor);
      if (![Status.RESOLVED, Status.CLOSED].includes(ticket.status))
        throw new BadRequestException(
          'Only a RESOLVED or CLOSED ticket can be reopened',
        );
      if (ticket.assignedTo !== snapshot.assignedTo)
        throw new ConflictException(
          'Assignment changed concurrently; retry reopening the ticket',
        );
      const now = new Date();
      const policy = await this.policy(em, ticket.priority);
      const oldResolution = {
        resolvedAt: ticket.resolvedAt,
        resolvedBy: ticket.resolvedBy,
        resolutionNote: ticket.resolutionNote,
        resolutionCategory: ticket.resolutionCategory,
      };
      if (!assignee?.isActive) {
        ticket.assignedTo = null;
        ticket.assignedTeam = null;
      }
      ticket.status = Status.REOPENED;
      ticket.reopenedAt = now;
      ticket.reopenedBy = actor.id;
      ticket.reopenReason = reason;
      ticket.reopenCount += 1;
      ticket.resolvedAt = null;
      ticket.resolvedBy = null;
      ticket.resolutionNote = null;
      ticket.resolutionCategory = null;
      ticket.closedAt = null;
      ticket.firstResponseAt = null;
      ticket.pausedAt = null;
      ticket.pendingReason = null;
      ticket.pausedMilliseconds = 0;
      ticket.escalationLevel = 0;
      ticket.responseMinutes = policy.responseMinutes;
      ticket.resolutionMinutes = policy.resolutionMinutes;
      ticket.responseDueAt = new Date(
        now.getTime() + policy.responseMinutes * 60000,
      );
      ticket.resolutionDueAt = new Date(
        now.getTime() + policy.resolutionMinutes * 60000,
      );
      await em.save(ticket);
      await this.activity(em, ticket, actor, 'REOPENED', {
        reason,
        previousResolution: oldResolution,
        assignedTo: ticket.assignedTo,
      });
      return this.view(ticket);
    });
  }
  cancel(id: string, reason: string, actor: User) {
    return this.mutate(id, actor, async (ticket, em, now) => {
      if (actor.role !== Role.STUDENT) this.owner(ticket, actor);
      if (
        ![Status.NEW, Status.ASSIGNED, Status.IN_PROGRESS].includes(
          ticket.status,
        )
      )
        throw new BadRequestException(
          'Cancellation is allowed only from NEW, ASSIGNED or IN_PROGRESS',
        );
      resumeSla(ticket, now);
      const oldValue = ticket.status;
      ticket.status = Status.CANCELLED;
      ticket.pendingReason = null;
      ticket.closedAt = now;
      await this.activity(em, ticket, actor, 'CANCELLED', { oldValue, reason });
    });
  }
  async comment(id: string, dto: CommentDto, actor: User) {
    return this.db.transaction(async (em) => {
      const ticket = await this.locked(em, id, actor);
      this.active(ticket);
      if (actor.role === Role.STUDENT && dto.internal)
        throw new ForbiddenException('Students cannot write internal notes');
      if (actor.role !== Role.STUDENT) this.owner(ticket, actor);
      const now = new Date();
      const comment = await em.save(
        TicketComment,
        em.create(TicketComment, {
          ticketId: id,
          userId: actor.id,
          message: dto.message,
          internal: dto.internal,
        }),
      );
      if (actor.role !== Role.STUDENT && !dto.internal)
        ticket.firstResponseAt ??= now;
      if (
        actor.role === Role.STUDENT &&
        ticket.status === Status.PENDING_STUDENT
      ) {
        resumeSla(ticket, now);
        ticket.status = Status.IN_PROGRESS;
        ticket.pendingReason = null;
        await this.activity(em, ticket, actor, 'STATUS_CHANGED', {
          oldValue: Status.PENDING_STUDENT,
          newValue: Status.IN_PROGRESS,
          reason: 'Student replied',
        });
      }
      await em.save(ticket);
      await this.activity(
        em,
        ticket,
        actor,
        'COMMENT_ADDED',
        { commentId: comment.id },
        dto.internal,
      );
      return comment;
    });
  }
  async comments(id: string, q: PageQuery, actor: User) {
    await this.get(id, actor);
    const [items, total] = await this.db
      .getRepository(TicketComment)
      .findAndCount({
        where: {
          ticketId: id,
          ...(actor.role === Role.STUDENT ? { internal: false } : {}),
        },
        order: { createdAt: 'ASC', id: 'ASC' },
        skip: (q.page - 1) * q.limit,
        take: q.limit,
      });
    return { items, total, page: q.page, limit: q.limit };
  }
  async activities(id: string, q: PageQuery, actor: User) {
    await this.get(id, actor);
    const [items, total] = await this.db
      .getRepository(TicketActivity)
      .findAndCount({
        where: {
          ticketId: id,
          ...(actor.role === Role.STUDENT ? { internal: false } : {}),
        },
        order: { createdAt: 'ASC', id: 'ASC' },
        skip: (q.page - 1) * q.limit,
        take: q.limit,
      });
    return { items, total, page: q.page, limit: q.limit };
  }
}
