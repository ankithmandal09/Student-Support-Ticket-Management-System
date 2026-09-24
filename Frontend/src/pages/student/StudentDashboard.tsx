import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../../layouts/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import { listTickets } from '../../lib/api';
import { StatusBadge, PriorityBadge, SLABadge } from '../../components/Badge';
import { Ticket, Plus, Clock, CheckCircle, AlertTriangle, TrendingUp } from 'lucide-react';

interface TicketItem {
  id: string; ticketNumber: string; subject: string; category: string;
  status: string; priority: string; createdAt: string;
  sla: { response: string; resolution: string };
}

/* ── reusable class strings ── */
const CARD = 'rounded-2xl p-5 mb-5 bg-white/[0.035] border border-white/[0.08]';
const TH   = 'py-2 px-3 text-left text-[0.72rem] font-bold uppercase tracking-[0.06em] text-[#5f5f7a] whitespace-nowrap border-b border-white/[0.08]';
const TD   = 'py-3 px-3 border-b border-white/[0.04]';
const BTN_PRIMARY = 'inline-flex items-center gap-1.5 px-[18px] py-[9px] rounded-xl text-[0.88rem] font-semibold text-white border-0 cursor-pointer whitespace-nowrap transition-all duration-200 hover:brightness-110 hover:-translate-y-px';
const BTN_GHOST   = 'inline-flex items-center gap-1.5 px-[18px] py-[9px] rounded-xl text-[0.88rem] font-semibold text-[#9898b8] cursor-pointer whitespace-nowrap bg-white/[0.035] border border-white/[0.08] hover:border-white/[0.14] hover:text-[#f0f0fa] hover:bg-white/[0.06] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed';

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number|string; color: string }) {
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

export default function StudentDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTickets = useCallback(async () => {
    try { const data = await listTickets({ limit: 10 }); setTickets(data.items); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchTickets(); }, [fetchTickets]);

  const open     = tickets.filter(t => !['RESOLVED','CLOSED','CANCELLED'].includes(t.status)).length;
  const resolved = tickets.filter(t => t.status === 'RESOLVED' || t.status === 'CLOSED').length;
  const atRisk   = tickets.filter(t => t.sla?.resolution === 'AT_RISK' || t.sla?.resolution === 'BREACHED').length;

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="flex items-start justify-between mb-7 gap-4 flex-wrap">
        <div>
          <h1 className="text-[1.6rem] font-extrabold text-[#f0f0fa]">Welcome back, {user?.name?.split(' ')[0]}! 👋</h1>
          <p className="text-[#9898b8] text-[0.88rem] mt-0.5">Here's an overview of your support tickets</p>
        </div>
        <button id="btn-new-ticket" className={BTN_PRIMARY} onClick={() => navigate('/student/new-ticket')}
          style={{ background: 'linear-gradient(135deg,#6366f1,#764ba2)', boxShadow: '0 4px 12px rgba(99,102,241,0.3)' }}>
          <Plus size={16} /> New Ticket
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard icon={<Ticket size={20}/>}         label="Total Tickets" value={tickets.length} color="#667eea" />
        <StatCard icon={<Clock size={20}/>}          label="Open"          value={open}           color="#f59e0b" />
        <StatCard icon={<CheckCircle size={20}/>}    label="Resolved"      value={resolved}       color="#10b981" />
        <StatCard icon={<AlertTriangle size={20}/>}  label="SLA At Risk"   value={atRisk}         color="#ef4444" />
      </div>

      {/* Recent Tickets */}
      <div className={CARD}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="flex items-center gap-2 text-[0.95rem] font-bold text-[#f0f0fa]"><Ticket size={18}/> Recent Tickets</h2>
          <button id="btn-view-all-tickets" className={BTN_GHOST} onClick={() => navigate('/student/tickets')}>
            View All <TrendingUp size={14}/>
          </button>
        </div>

        {loading ? (
          <div className="flex flex-col gap-2.5 py-4">
            {[...Array(5)].map((_, i) => <div key={i} className="h-11 rounded-xl anim-shimmer" />)}
          </div>
        ) : tickets.length === 0 ? (
          <div className="flex flex-col items-center gap-3.5 py-[60px] px-5 text-[#5f5f7a] text-center">
            <Ticket size={48}/>
            <h3 className="text-[#9898b8]">No tickets yet</h3>
            <p className="text-[0.88rem]">Submit your first support request to get started.</p>
            <button id="btn-empty-new-ticket" className={BTN_PRIMARY} onClick={() => navigate('/student/new-ticket')}
              style={{ background: 'linear-gradient(135deg,#6366f1,#764ba2)' }}>
              <Plus size={16}/> Create Ticket
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full tbl">
              <thead>
                <tr>
                  {['Ticket #','Subject','Category','Status','Priority','SLA','Created'].map(h => <th key={h} className={TH}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {tickets.map((t) => (
                  <tr key={t.id} className="cursor-pointer hover:[&>td]:bg-white/[0.06] transition-all duration-200"
                    onClick={() => navigate(`/student/tickets/${t.id}`)} id={`ticket-row-${t.id}`}>
                    <td className={TD + ' font-mono text-[0.8rem] text-[#5f5f7a]'}>{t.ticketNumber.slice(0,12)}…</td>
                    <td className={TD + ' max-w-[280px] truncate text-[0.88rem] font-medium text-[#f0f0fa]'}>{t.subject}</td>
                    <td className={TD}><span className="inline-flex px-2.5 py-[3px] rounded-md text-[0.72rem] font-semibold text-[#a5b4fc] bg-indigo-500/[0.12]">{t.category.replace(/_/g,' ')}</span></td>
                    <td className={TD}><StatusBadge status={t.status}/></td>
                    <td className={TD}><PriorityBadge priority={t.priority}/></td>
                    <td className={TD}><SLABadge state={t.sla?.resolution ?? 'NOT_APPLICABLE'}/></td>
                    <td className={TD + ' text-[#5f5f7a] text-[0.82rem]'}>{new Date(t.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
