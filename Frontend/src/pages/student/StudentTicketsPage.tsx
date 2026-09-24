import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../../layouts/DashboardLayout';
import { listTickets } from '../../lib/api';
import { StatusBadge, PriorityBadge, SLABadge } from '../../components/Badge';
import { Ticket, Plus, Search, Filter } from 'lucide-react';

interface TicketItem {
  id: string; ticketNumber: string; subject: string; category: string;
  status: string; priority: string; createdAt: string; sla: { resolution: string };
}

const STATUSES   = ['NEW','ASSIGNED','IN_PROGRESS','PENDING_STUDENT','PENDING_INTERNAL','RESOLVED','CLOSED','REOPENED','CANCELLED'];
const PRIORITIES = ['LOW','MEDIUM','HIGH','URGENT'];
const CATEGORIES = ['FEES','ATTENDANCE','ID_CARD','DOCUMENTS','CERTIFICATES','OTHER'];

const TH = 'py-2 px-3 text-left text-[0.72rem] font-bold uppercase tracking-[0.06em] text-[#5f5f7a] whitespace-nowrap border-b border-white/[0.08]';
const TD = 'py-3 px-3 border-b border-white/[0.04]';
const BTN_PRIMARY = 'inline-flex items-center gap-1.5 px-[18px] py-[9px] rounded-xl text-[0.88rem] font-semibold text-white border-0 cursor-pointer whitespace-nowrap transition-all duration-200 hover:brightness-110 hover:-translate-y-px';
const BTN_GHOST   = 'inline-flex items-center gap-1.5 px-[18px] py-[9px] rounded-xl text-[0.88rem] font-semibold text-[#9898b8] cursor-pointer whitespace-nowrap bg-white/[0.035] border border-white/[0.08] hover:border-white/[0.14] hover:text-[#f0f0fa] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed';
const SELECT = 'rounded-xl py-2 pl-3 bg-white/[0.035] border border-white/[0.08] text-[#f0f0fa] text-[0.82rem] outline-none cursor-pointer focus:border-indigo-500 transition-all duration-200 sel-sm';

export default function StudentTicketsPage() {
  const navigate = useNavigate();
  const [tickets, setTickets]           = useState<TicketItem[]>([]);
  const [total, setTotal]               = useState(0);
  const [loading, setLoading]           = useState(true);
  const [page, setPage]                 = useState(1);
  const [search, setSearch]             = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = { page, limit: 15 };
      if (search)         params.search   = search;
      if (statusFilter)   params.status   = statusFilter;
      if (priorityFilter) params.priority = priorityFilter;
      if (categoryFilter) params.category = categoryFilter;
      const data = await listTickets(params);
      setTickets(data.items); setTotal(data.total);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [page, search, statusFilter, priorityFilter, categoryFilter]);

  useEffect(() => { fetch(); }, [fetch]);
  const totalPages = Math.ceil(total / 15);

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="flex items-start justify-between mb-7 gap-4 flex-wrap">
        <div>
          <h1 className="text-[1.6rem] font-extrabold text-[#f0f0fa]">My Tickets</h1>
          <p className="text-[#9898b8] text-[0.88rem] mt-0.5">{total} total tickets</p>
        </div>
        <button id="btn-new-ticket-list" className={BTN_PRIMARY} onClick={() => navigate('/student/new-ticket')}
          style={{ background: 'linear-gradient(135deg,#6366f1,#764ba2)', boxShadow: '0 4px 12px rgba(99,102,241,0.3)' }}>
          <Plus size={16}/> New Ticket
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap mb-5">
        <div className="flex items-center gap-2.5 rounded-xl px-3.5 py-2 flex-1 min-w-[200px] text-[#5f5f7a] bg-white/[0.035] border border-white/[0.08] focus-within:border-indigo-500 focus-within:shadow-[0_0_0_3px_rgba(99,102,241,0.12)] transition-all duration-200">
          <Search size={16}/>
          <input id="ticket-search" placeholder="Search tickets…" value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="bg-transparent border-0 outline-none text-[#f0f0fa] text-[0.88rem] w-full placeholder:text-[#5f5f7a]" />
        </div>
        <div className="flex items-center gap-2 flex-wrap text-[#5f5f7a]">
          <Filter size={14}/>
          <select id="filter-status"    value={statusFilter}   onChange={(e) => { setStatusFilter(e.target.value);   setPage(1); }} className={SELECT}>
            <option value="">All Status</option>
            {STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g,' ')}</option>)}
          </select>
          <select id="filter-priority"  value={priorityFilter} onChange={(e) => { setPriorityFilter(e.target.value); setPage(1); }} className={SELECT}>
            <option value="">All Priority</option>
            {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <select id="filter-category"  value={categoryFilter} onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }} className={SELECT}>
            <option value="">All Category</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c.replace(/_/g,' ')}</option>)}
          </select>
        </div>
      </div>

      {/* Table card */}
      <div className="rounded-2xl p-5 bg-white/[0.035] border border-white/[0.08]">
        {loading ? (
          <div className="flex flex-col gap-2.5 py-4">
            {[...Array(8)].map((_, i) => <div key={i} className="h-11 rounded-xl anim-shimmer"/>)}
          </div>
        ) : tickets.length === 0 ? (
          <div className="flex flex-col items-center gap-3.5 py-[60px] text-[#5f5f7a] text-center">
            <Ticket size={48}/><h3 className="text-[#9898b8]">No tickets found</h3>
            <p className="text-[0.88rem]">Try adjusting your filters or create a new ticket.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full tbl">
              <thead><tr>{['Ticket #','Subject','Category','Status','Priority','SLA','Created'].map(h => <th key={h} className={TH}>{h}</th>)}</tr></thead>
              <tbody>
                {tickets.map((t) => (
                  <tr key={t.id} className="cursor-pointer hover:[&>td]:bg-white/[0.06] transition-all duration-200"
                    onClick={() => navigate(`/student/tickets/${t.id}`)} id={`ticket-${t.id}`}>
                    <td className={TD + ' font-mono text-[0.8rem] text-[#5f5f7a]'}>{t.ticketNumber.slice(0,16)}…</td>
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

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 py-4 mt-3 border-t border-white/[0.08]">
            <button id="prev-page" disabled={page === 1} onClick={() => setPage(p => p-1)} className={BTN_GHOST}>← Prev</button>
            <span className="text-[0.82rem] text-[#5f5f7a]">Page {page} of {totalPages}</span>
            <button id="next-page" disabled={page === totalPages} onClick={() => setPage(p => p+1)} className={BTN_GHOST}>Next →</button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
