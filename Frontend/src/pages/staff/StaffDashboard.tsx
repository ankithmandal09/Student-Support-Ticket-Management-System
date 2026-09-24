import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../../layouts/DashboardLayout';
import { getDashboard, listTickets } from '../../lib/api';
import { StatusBadge, PriorityBadge, SLABadge } from '../../components/Badge';
import { Ticket, AlertTriangle, Clock, CheckCircle, Users, TrendingUp, Activity, Timer } from 'lucide-react';

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

const CARD = 'rounded-2xl p-5 mb-5 bg-white/[0.035] border border-white/[0.08]';
const TH   = 'py-2 px-3 text-left text-[0.72rem] font-bold uppercase tracking-[0.06em] text-[#5f5f7a] whitespace-nowrap border-b border-white/[0.08]';
const TD   = 'py-3 px-3 border-b border-white/[0.04]';
const BTN_GHOST = 'inline-flex items-center gap-1.5 px-[18px] py-[9px] rounded-xl text-[0.88rem] font-semibold text-[#9898b8] cursor-pointer whitespace-nowrap bg-white/[0.035] border border-white/[0.08] hover:border-white/[0.14] hover:text-[#f0f0fa] hover:bg-white/[0.06] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed';

function formatMinutes(min: number | null | undefined): string {
  if (min == null) return 'N/A';
  if (min < 60) return `${Math.round(min)}m`;
  if (min < 1440) return `${(min / 60).toFixed(1)}h`;
  return `${(min / 1440).toFixed(1)}d`;
}

function StatCard({ icon, label, value, color, subtext }: { icon: React.ReactNode; label: string; value: number | string; color: string; subtext?: string }) {
  return (
    <div
      className="stat-accent rounded-2xl p-5 flex items-center gap-3.5 overflow-hidden bg-white/[0.035] border border-white/[0.08] hover:-translate-y-0.5 hover:border-white/[0.14] transition-all duration-200"
      style={{ '--stat-color': color } as React.CSSProperties}
    >
      <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 bg-black/[0.15]" style={{ color }}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[1.6rem] font-extrabold text-[#f0f0fa] leading-none truncate">{value}</div>
        <div className="text-[0.78rem] text-[#5f5f7a] uppercase tracking-[0.04em] mt-0.5 truncate">{label}</div>
        {subtext && <div className="text-[0.7rem] text-[#818cf8] mt-0.5">{subtext}</div>}
      </div>
    </div>
  );
}

export default function StaffDashboard() {
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [recentTickets, setRecentTickets] = useState<TicketItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    try {
      const [d, t] = await Promise.all([getDashboard(), listTickets({ limit: 8 })]);
      setDashboard(d);
      setRecentTickets(t.items);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  // Extract aligned metrics from backend dashboard structure
  const byStatus = dashboard?.byStatus || dashboard?.counts || {};
  const total = dashboard?.total ?? dashboard?.counts?.total ?? 0;
  const countNew = byStatus.NEW ?? byStatus.new ?? 0;
  const countAssigned = byStatus.ASSIGNED ?? byStatus.assigned ?? 0;
  const countInProgress = byStatus.IN_PROGRESS ?? byStatus.inProgress ?? 0;
  const countPending = (byStatus.PENDING_STUDENT ?? byStatus.pendingStudent ?? 0) + (byStatus.PENDING_INTERNAL ?? byStatus.pendingInternal ?? 0);
  const countResolved = byStatus.RESOLVED ?? byStatus.resolved ?? 0;
  const breached = dashboard?.breached ?? dashboard?.slaBreaches ?? 0;
  const atRisk = dashboard?.atRisk ?? dashboard?.slaAtRisk ?? 0;
  const avgResolution = dashboard?.averageResolutionMinutes;

  return (
    <DashboardLayout>
      <div className="flex items-start justify-between mb-7 gap-4 flex-wrap">
        <div>
          <h1 className="text-[1.6rem] font-extrabold text-[#f0f0fa]">Staff Dashboard</h1>
          <p className="text-[#9898b8] text-[0.88rem] mt-0.5">Overview of support operations</p>
        </div>
        <button className={BTN_GHOST} onClick={() => fetch()}>
          <Activity size={16} /> Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center p-20">
          <div className="w-10 h-10 rounded-full anim-spin border-[3px] border-white/10 border-t-indigo-500" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-4">
            <StatCard icon={<Ticket size={20} />} label="Total Tickets" value={total} color="#667eea" />
            <StatCard icon={<Clock size={20} />} label="New" value={countNew} color="#3b82f6" />
            <StatCard icon={<TrendingUp size={20} />} label="In Progress" value={countInProgress} color="#f59e0b" />
            <StatCard icon={<Users size={20} />} label="Assigned" value={countAssigned} color="#8b5cf6" />
            <StatCard icon={<AlertTriangle size={20} />} label="SLA Breached" value={breached} color="#ef4444" />
            <StatCard icon={<CheckCircle size={20} />} label="Resolved" value={countResolved} color="#10b981" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <StatCard icon={<AlertTriangle size={20} />} label="SLA At Risk" value={atRisk} color="#f97316" />
            <StatCard icon={<Clock size={20} />} label="Pending" value={countPending} color="#a855f7" />
            <StatCard icon={<Timer size={20} />} label="Avg Resolution" value={formatMinutes(avgResolution)} color="#06b6d4" />
          </div>

          <div className="grid grid-cols-1 gap-5">
            {/* Recent tickets */}
            <div className={CARD}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="flex items-center gap-2 text-[0.95rem] font-bold text-[#f0f0fa]"><Ticket size={18} /> Recent Tickets</h2>
                <button id="btn-all-tickets-staff" className={BTN_GHOST} onClick={() => navigate('/staff/tickets')}>
                  View All
                </button>
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
                    </tr>
                  </thead>
                  <tbody>
                    {recentTickets.length === 0 ? (
                      <tr>
                        <td colSpan={6} className={`${TD} text-center text-[#5f5f7a] py-8`}>No tickets found</td>
                      </tr>
                    ) : (
                      recentTickets.map((t) => (
                        <tr
                          key={t.id}
                          className="cursor-pointer transition-colors duration-150 hover:bg-white/[0.04]"
                          onClick={() => navigate(`/staff/tickets/${t.id}`)}
                          id={`staff-ticket-${t.id}`}
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
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </DashboardLayout>
  );
}
