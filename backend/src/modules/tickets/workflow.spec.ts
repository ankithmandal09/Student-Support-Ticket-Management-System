import { assertTransition, resumeSla, slaView } from './workflow.js';
import { Ticket } from '../../entities/ticket.entity.js';
import { SlaState, Status } from '../../common/enums.js';
const start = new Date('2026-09-24T00:00:00Z');
const minutes = (n: number) => new Date(start.getTime() + n * 60000);
function ticket(overrides: Partial<Ticket> = {}): Ticket {
  return Object.assign(new Ticket(), {
    status: Status.IN_PROGRESS,
    responseMinutes: 100,
    resolutionMinutes: 200,
    responseDueAt: minutes(100),
    resolutionDueAt: minutes(200),
    firstResponseAt: null,
    resolvedAt: null,
    pausedAt: null,
    pausedMilliseconds: 0,
    ...overrides,
  });
}
describe('ticket workflow and SLA', () => {
  it('permits work transitions and rejects bypassing resolution', () => {
    expect(() =>
      assertTransition(Status.ASSIGNED, Status.IN_PROGRESS),
    ).not.toThrow();
    expect(() =>
      assertTransition(Status.IN_PROGRESS, Status.PENDING_STUDENT),
    ).not.toThrow();
    for (const state of [
      Status.NEW,
      Status.IN_PROGRESS,
      Status.CANCELLED,
      Status.CLOSED,
    ])
      expect(() => assertTransition(state, Status.CLOSED)).toThrow();
    expect(() =>
      assertTransition(Status.IN_PROGRESS, Status.IN_PROGRESS),
    ).toThrow();
  });
  it('marks 80% at risk and the deadline breached', () => {
    expect(slaView(ticket(), minutes(79)).response).toBe(SlaState.ON_TRACK);
    expect(slaView(ticket(), minutes(80)).response).toBe(SlaState.AT_RISK);
    expect(slaView(ticket(), minutes(100)).response).toBe(SlaState.BREACHED);
  });
  it('retains on-time and late response outcomes', () => {
    expect(
      slaView(ticket({ firstResponseAt: minutes(100) }), minutes(500)).response,
    ).toBe(SlaState.MET);
    expect(
      slaView(ticket({ firstResponseAt: minutes(101) }), minutes(500)).response,
    ).toBe(SlaState.BREACHED);
  });
  it('pauses only resolution and extends its deadline once on resume', () => {
    const t = ticket({ status: Status.PENDING_STUDENT, pausedAt: minutes(50) });
    expect(slaView(t, minutes(300))).toMatchObject({
      response: SlaState.BREACHED,
      resolution: SlaState.PAUSED,
      effectiveResolutionDueAt: minutes(450),
    });
    resumeSla(t, minutes(300));
    expect(t.resolutionDueAt).toEqual(minutes(450));
    expect(t.pausedMilliseconds).toBe(250 * 60000);
    expect(t.pausedAt).toBeNull();
    resumeSla(t, minutes(301));
    expect(t.resolutionDueAt).toEqual(minutes(450));
  });
  it('does not erase a breach by entering pending student', () => {
    expect(
      slaView(ticket({ pausedAt: minutes(201) }), minutes(500)).resolution,
    ).toBe(SlaState.BREACHED);
  });
  it('freezes resolution outcomes and excludes cancelled tickets', () => {
    expect(
      slaView(
        ticket({ status: Status.RESOLVED, resolvedAt: minutes(190) }),
        minutes(500),
      ).resolution,
    ).toBe(SlaState.MET);
    expect(
      slaView(ticket({ status: Status.CANCELLED }), minutes(500)).resolution,
    ).toBe(SlaState.NOT_APPLICABLE);
  });
});
