import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../../layouts/DashboardLayout';
import { getDashboard, listTickets, runSLASweep, listUsers } from '../../lib/api';
import { StatusBadge, PriorityBadge, SLABadge } from '../../components/Badge';
import { Ticket, AlertTriangle, Clock, CheckCircle, Users, TrendingUp, Activity, Zap, BarChart3, Timer } from 'lucide-react';

interface DashboardData {
  total: number;
  byStatus: Record<string, number>;
  breached: number;
  atRisk: number;
  averageResolutionMinutes: number | null;
  workload: { assignedTo: string | null; count: number }[];
  // backwards compatibility
  counts?: Record<string, number>;
  slaBreaches?: number;
  slaAtRisk?: number;
}

interface TicketItem {
  id: string;
  ticketNumber: string;
  subject: string;
  status: string;
  priority: string;
  category: string;
  createdAt: string;
  sla: { resolution: string };
}

interface UserItem {
  id: string;
  name: string;
  email: string;
  role: string;
}

const CARD = 'rounded-2xl p-5 mb-5 bg-white/[0.035] border border-white/[0.08]';
const TH   = 'py-2 px-3 text-left text-[0.72rem] font-bold uppercase tracking-[0.06em] text-[#5f5f7a] whitespace-nowrap border-b border-white/[0.08]';
const TD   = 'py-3 px-3 border-b border-white/[0.04]';
const BTN_GHOST = 'inline-flex items-center gap-1.5 px-[18px] py-[9px] rounded-xl text-[0.88rem] font-semibold text-[#9898b8] cursor-pointer whitespace-nowrap bg-white/[0.035] border border-white/[0.08] hover:border-white/[0.14] hover:text-[#f0f0fa] hover:bg-white/[0.06] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed';
const BTN_WARNING = 'inline-flex items-center gap-1.5 px-[18px] py-[9px] rounded-xl text-[0.88rem] font-semibold text-white border-0 cursor-pointer whitespace-nowrap transition-all duration-200 bg-amber-600 hover:bg-amber-500 hover:-translate-y-px disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_4px_12px_rgba(245,158,11,0.25)]';

function formatMinutes(min: number | null | undefined): string {
  if (min == null) return 'N/A';
  if (min < 60) return `${Math.round(min)}m`;
  if (min < 1440) return `${(min / 60).toFixed(1)}h`;
  return `${(min / 1440).toFixed(1)}d`;
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number | string; color: string }) {
  return (
    <div
      className="stat-accent rounded-2xl p-5 flex items-center gap-3.5 overflow-hidden bg-white/[0.035] border border-white/[0.08] hover:-translate-y-0.5 hover:border-white/[0.14] transition-all duration-200"
      style={{ '--stat-color': color } as React.CSSProperties}
    >
      <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 bg-black/[0.15]" style={{ color }}>
        {icon}
      </div>
      <div>
        <div className="text-[1.6rem] font-extrabold text-[#f0f0fa] leading-none">{value}</div>
        <div className="text-[0.78rem] text-[#5f5f7a] uppercase tracking-[0.04em] mt-0.5">{label}</div>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [sweepLoading, setSweepLoading] = useState(false);
  const [sweepResult, setSweepResult] = useState<number | null>(null);

  const fetch = useCallback(async () => {
    try {
      const [d, t, u] = await Promise.all([
        getDashboard(),
        listTickets({ limit: 10 }),
        listUsers({ limit: 100 }).catch(() => ({ items: [] }))
      ]);
      setDashboard(d);
      setTickets(t.items);
      setUsers(u.items || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const handleSLASweep = async () => {
    setSweepLoading(true);
    try {
      const result = await runSLASweep();
      setSweepResult(result.escalated);
      fetch();
    } catch (e) { console.error(e); }
    finally { setSweepLoading(false); }
  };

  // Align with actual API response: total, byStatus, breached, atRisk, averageResolutionMinutes, workload
  const byStatus = dashboard?.byStatus || dashboard?.counts || {};
  const total = dashboard?.total ?? dashboard?.counts?.total ?? 0;
  const countNew = byStatus.NEW ?? byStatus.new ?? 0;
  const countInProgress = byStatus.IN_PROGRESS ?? byStatus.inProgress ?? 0;
  const countPending = (byStatus.PENDING_STUDENT ?? byStatus.pendingStudent ?? 0) + (byStatus.PENDING_INTERNAL ?? byStatus.pendingInternal ?? 0);
  const countResolved = byStatus.RESOLVED ?? byStatus.resolved ?? 0;
  const countClosed = byStatus.CLOSED ?? byStatus.closed ?? 0;
  const countCancelled = byStatus.CANCELLED ?? byStatus.cancelled ?? 0;
  const breached = dashboard?.breached ?? dashboard?.slaBreaches ?? 0;
  const atRisk = dashboard?.atRisk ?? dashboard?.slaAtRisk ?? 0;
  const avgResolution = dashboard?.averageResolutionMinutes;

  const getUserName = (id: string | null) => {
    if (!id) return 'Unassigned';
    const found = users.find(u => u.id === id);
    return found ? found.name : `${id.slice(0, 8)}…`;
  };

  return (
    <DashboardLayout>
      <div className="flex items-start justify-between mb-7 gap-4 flex-wrap">
        <div>
          <h1 className="text-[1.6rem] font-extrabold text-[#f0f0fa]">Admin Dashboard</h1>
          <p className="text-[#9898b8] text-[0.88rem] mt-0.5">Full system overview and management</p>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <button id="btn-sla-sweep" className={BTN_WARNING} onClick={handleSLASweep} disabled={sweepLoading}>
            {sweepLoading ? <span className="w-[18px] h-[18px] rounded-full border-[3px] border-white/20 border-t-white anim-spin" /> : <><Zap size={16} /> Run SLA Sweep</>}
          </button>
          <button className={BTN_GHOST} onClick={fetch}><Activity size={16} /> Refresh</button>
        </div>
      </div>

      {sweepResult !== null && (
        <div className="flex items-center justify-between px-4 py-3 rounded-xl mb-5 text-[0.88rem] text-blue-300 bg-blue-500/[0.12] border border-blue-500/30">
          <span>SLA sweep complete: {sweepResult} escalation event(s) recorded.</span>
          <button className="bg-transparent border-none cursor-pointer text-inherit hover:opacity-75" onClick={() => setSweepResult(null)}>✕</button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center p-20">
          <div className="w-10 h-10 rounded-full anim-spin border-[3px] border-white/10 border-t-indigo-500" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-4">
            <StatCard icon={<Ticket size={20} />} label="Total" value={total} color="#667eea" />
            <StatCard icon={<Clock size={20} />} label="New" value={countNew} color="#3b82f6" />
            <StatCard icon={<TrendingUp size={20} />} label="In Progress" value={countInProgress} color="#f59e0b" />
            <StatCard icon={<Users size={20} />} label="Pending" value={countPending} color="#8b5cf6" />
            <StatCard icon={<AlertTriangle size={20} />} label="SLA Breached" value={breached} color="#ef4444" />
            <StatCard icon={<CheckCircle size={20} />} label="Resolved" value={countResolved} color="#10b981" />
          </div>

          {/* Secondary stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <StatCard icon={<BarChart3 size={20} />} label="SLA At Risk" value={atRisk} color="#f97316" />
            <StatCard icon={<Timer size={20} />} label="Avg Resolution" value={formatMinutes(avgResolution)} color="#06b6d4" />
            <StatCard icon={<CheckCircle size={20} />} label="Closed" value={countClosed} color="#6b7280" />
            <StatCard icon={<AlertTriangle size={20} />} label="Cancelled" value={countCancelled} color="#6b7280" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
            {/* Workload */}
            <div className={CARD}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="flex items-center gap-2 text-[0.95rem] font-bold text-[#f0f0fa]"><Users size={18} /> Staff Workload</h2>
              </div>
              {(!dashboard?.workload || dashboard.workload.length === 0) ? (
                <div className="text-[#5f5f7a] text-[0.85rem] text-center py-6">No workload data available.</div>
              ) : (
                <div className="flex flex-col gap-3">
                  {dashboard.workload.map((w, i) => {
                    const max = Math.max(...dashboard.workload.map(x => x.count)) || 1;
                    const pct = Math.min((w.count / max) * 100, 100);
                    return (
                      <div key={i} className="flex items-center gap-3">
                        <div className="w-[140px] truncate text-[0.82rem] font-medium text-[#c4b5fd]">
                          {getUserName(w.assignedTo)}
                        </div>
                        <div className="flex-1 h-2 rounded-full bg-white/[0.06] overflow-hidden">
                          <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300" style={{ width: `${pct}%` }} />
                        </div>
                        <div className="w-8 text-right font-mono text-[0.82rem] font-bold text-[#f0f0fa]">{w.count}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Quick links */}
            <div className={CARD}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[0.95rem] font-bold text-[#f0f0fa]">Quick Actions</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  id="btn-admin-tickets"
                  className="flex flex-col items-center justify-center gap-2.5 p-4 rounded-xl bg-white/[0.035] border border-white/[0.08] hover:border-indigo-500/50 hover:bg-white/[0.06] hover:-translate-y-0.5 transition-all text-[#f0f0fa] cursor-pointer text-[0.88rem] font-semibold"
                  onClick={() => navigate('/admin/tickets')}
                >
                  <Ticket size={22} className="text-indigo-400" /> View Tickets
                </button>
                <button
                  id="btn-admin-users"
                  className="flex flex-col items-center justify-center gap-2.5 p-4 rounded-xl bg-white/[0.035] border border-white/[0.08] hover:border-indigo-500/50 hover:bg-white/[0.06] hover:-translate-y-0.5 transition-all text-[#f0f0fa] cursor-pointer text-[0.88rem] font-semibold"
                  onClick={() => navigate('/admin/users')}
                >
                  <Users size={22} className="text-purple-400" /> Manage Users
                </button>
                <button
                  id="btn-admin-sla"
                  className="flex flex-col items-center justify-center gap-2.5 p-4 rounded-xl bg-white/[0.035] border border-white/[0.08] hover:border-indigo-500/50 hover:bg-white/[0.06] hover:-translate-y-0.5 transition-all text-[#f0f0fa] cursor-pointer text-[0.88rem] font-semibold"
                  onClick={() => navigate('/admin/sla')}
                >
                  <BarChart3 size={22} className="text-emerald-400" /> SLA Policies
                </button>
              </div>
            </div>
          </div>

          {/* Recent tickets */}
          <div className={CARD}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="flex items-center gap-2 text-[0.95rem] font-bold text-[#f0f0fa]"><Ticket size={18} /> Recent Tickets</h2>
              <button id="btn-admin-all-tickets" className={BTN_GHOST} onClick={() => navigate('/admin/tickets')}>View All</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left tbl">
                <thead>
                  <tr>
                    <th className={TH}>Ticket #</th>
                    <th className={TH}>Subject</th>
                    <th className={TH}>Category</th>
                    <th className={TH}>Status</th>
                    <th className={TH}>Priority</th>
                    <th className={TH}>SLA</th>
                    <th className={TH}>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.length === 0 ? (
                    <tr>
                      <td colSpan={7} className={`${TD} text-center text-[#5f5f7a] py-8`}>No tickets found</td>
                    </tr>
                  ) : (
                    tickets.map((t) => (
                      <tr
                        key={t.id}
                        className="cursor-pointer transition-colors duration-150 hover:bg-white/[0.04]"
                        onClick={() => navigate(`/admin/tickets/${t.id}`)}
                        id={`admin-tkt-${t.id}`}
                      >
                        <td className={`${TD} font-mono text-[0.78rem] text-[#818cf8] font-semibold whitespace-nowrap`}>
                          {t.ticketNumber.slice(0, 16)}…
                        </td>
                        <td className={`${TD} font-semibold text-[#f0f0fa] max-w-[260px] truncate text-[0.88rem]`}>
                          {t.subject}
                        </td>
                        <td className={TD}>
                          <span className="inline-flex px-2.5 py-[3px] rounded-md text-[0.72rem] font-semibold text-[#a5b4fc] bg-indigo-500/[0.12]">
                            {t.category.replace(/_/g, ' ')}
                          </span>
                        </td>
                        <td className={TD}><StatusBadge status={t.status} /></td>
                        <td className={TD}><PriorityBadge priority={t.priority} /></td>
                        <td className={TD}><SLABadge state={t.sla?.resolution ?? 'NOT_APPLICABLE'} /></td>
                        <td className={`${TD} text-[#5f5f7a] text-[0.82rem] whitespace-nowrap`}>
                          {new Date(t.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </DashboardLayout>
  );
}
