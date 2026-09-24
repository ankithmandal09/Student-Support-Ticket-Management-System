import { BadRequestException } from '@nestjs/common';
import { SlaState, Status } from '../../common/enums.js';
import { Ticket } from '../../entities/ticket.entity.js';

const transitions: Partial<Record<Status, Status[]>> = {
  [Status.ASSIGNED]: [Status.IN_PROGRESS],
  [Status.REOPENED]: [Status.IN_PROGRESS],
  [Status.IN_PROGRESS]: [Status.PENDING_STUDENT, Status.PENDING_INTERNAL],
  [Status.PENDING_STUDENT]: [Status.IN_PROGRESS, Status.PENDING_INTERNAL],
  [Status.PENDING_INTERNAL]: [Status.IN_PROGRESS, Status.PENDING_STUDENT],
};
export function assertTransition(from: Status, to: Status) {
  if (!transitions[from]?.includes(to))
    throw new BadRequestException(`Cannot transition from ${from} to ${to}`);
}
export function resumeSla(ticket: Ticket, now: Date) {
  if (ticket.pausedAt) {
    const elapsed = Math.max(0, now.getTime() - ticket.pausedAt.getTime());
    ticket.resolutionDueAt = new Date(
      ticket.resolutionDueAt.getTime() + elapsed,
    );
    ticket.pausedMilliseconds += elapsed;
    ticket.pausedAt = null;
  }
}
function clockState(
  due: Date,
  budget: number,
  now: Date,
  completed: Date | null,
): SlaState {
  if (completed)
    return completed.getTime() > due.getTime()
      ? SlaState.BREACHED
      : SlaState.MET;
  const remaining = due.getTime() - now.getTime();
  return remaining <= 0
    ? SlaState.BREACHED
    : remaining <= budget * 60000 * 0.2
      ? SlaState.AT_RISK
      : SlaState.ON_TRACK;
}
export function slaView(ticket: Ticket, now = new Date()) {
  const effectiveResolutionDueAt = new Date(
    ticket.resolutionDueAt.getTime() +
      (ticket.pausedAt
        ? Math.max(0, now.getTime() - ticket.pausedAt.getTime())
        : 0),
  );
  if (ticket.status === Status.CANCELLED)
    return {
      response: SlaState.NOT_APPLICABLE,
      resolution: SlaState.NOT_APPLICABLE,
      effectiveResolutionDueAt,
    };
  const response = clockState(
    ticket.responseDueAt,
    ticket.responseMinutes,
    now,
    ticket.firstResponseAt,
  );
  const resolutionAtPause =
    ticket.pausedAt &&
    clockState(
      ticket.resolutionDueAt,
      ticket.resolutionMinutes,
      ticket.pausedAt,
      null,
    );
  // Pausing never erases an existing breach.
  const resolution = resolutionAtPause
    ? resolutionAtPause === SlaState.BREACHED
      ? SlaState.BREACHED
      : SlaState.PAUSED
    : clockState(
        effectiveResolutionDueAt,
        ticket.resolutionMinutes,
        now,
        ticket.resolvedAt,
      );
  return { response, resolution, effectiveResolutionDueAt };
}
