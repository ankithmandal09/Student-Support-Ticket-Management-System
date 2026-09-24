import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../../layouts/DashboardLayout';
import { listTickets } from '../../lib/api';
import { StatusBadge, PriorityBadge, SLABadge } from '../../components/Badge';
import { Ticket, Search, Filter } from 'lucide-react';

interface TicketItem {
  id: string;
  ticketNumber: string;
  subject: string;
  category: string;
  status: string;
  priority: string;
  assignedTo: string | null;
  createdAt: string;
  sla: { resolution: string };
}

const STATUSES = ['NEW', 'ASSIGNED', 'IN_PROGRESS', 'PENDING_STUDENT', 'PENDING_INTERNAL', 'RESOLVED', 'CLOSED', 'REOPENED', 'CANCELLED'];
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
const CATEGORIES = ['FEES', 'ATTENDANCE', 'ID_CARD', 'DOCUMENTS', 'CERTIFICATES', 'OTHER'];

const TH = 'py-2 px-3 text-left text-[0.72rem] font-bold uppercase tracking-[0.06em] text-[#5f5f7a] whitespace-nowrap border-b border-white/[0.08]';
const TD = 'py-3 px-3 border-b border-white/[0.04]';
const BTN_GHOST = 'inline-flex items-center gap-1.5 px-[18px] py-[9px] rounded-xl text-[0.88rem] font-semibold text-[#9898b8] cursor-pointer whitespace-nowrap bg-white/[0.035] border border-white/[0.08] hover:border-white/[0.14] hover:text-[#f0f0fa] hover:bg-white/[0.06] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed';
const SELECT = 'rounded-xl py-2 pl-3 bg-white/[0.035] border border-white/[0.08] text-[#f0f0fa] text-[0.82rem] outline-none cursor-pointer focus:border-indigo-500 transition-all duration-200 sel-sm';
const INPUT_SEARCH = 'w-full pl-9 pr-3.5 py-2 rounded-xl bg-white/[0.035] border border-white/[0.08] text-[#f0f0fa] text-[0.88rem] outline-none placeholder:text-[#5f5f7a] focus:border-indigo-500 transition-all duration-200';

export default function AdminTicketsPage() {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, unknown> = { page, limit: 20 };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      if (priorityFilter) params.priority = priorityFilter;
      if (categoryFilter) params.category = categoryFilter;
      const data = await listTickets(params);
      setTickets(data.items);
      setTotal(data.total);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [page, search, statusFilter, priorityFilter, categoryFilter]);

  useEffect(() => { fetch(); }, [fetch]);

  const totalPages = Math.ceil(total / 20);

  return (
    <DashboardLayout>
      <div className="flex items-start justify-between mb-7 gap-4 flex-wrap">
        <div>
          <h1 className="text-[1.6rem] font-extrabold text-[#f0f0fa]">All Tickets</h1>
          <p className="text-[#9898b8] text-[0.88rem] mt-0.5">{total} tickets total</p>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5f5f7a] pointer-events-none" />
          <input
            id="admin-ticket-search"
            className={INPUT_SEARCH}
            placeholder="Search tickets…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Filter size={14} className="text-[#5f5f7a]" />
          <select id="admin-filter-status" className={SELECT} value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
            <option value="">All Status</option>
            {STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
          </select>
          <select id="admin-filter-priority" className={SELECT} value={priorityFilter} onChange={(e) => { setPriorityFilter(e.target.value); setPage(1); }}>
            <option value="">All Priority</option>
            {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <select id="admin-filter-category" className={SELECT} value={categoryFilter} onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}>
            <option value="">All Category</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}
          </select>
        </div>
      </div>

      <div className="rounded-2xl p-5 mb-5 bg-white/[0.035] border border-white/[0.08]">
        {loading ? (
          <div className="flex flex-col gap-2.5 p-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-10 rounded-lg anim-shimmer" />
            ))}
          </div>
        ) : tickets.length === 0 ? (
          <div className="flex flex-col items-center gap-3.5 py-[60px] text-[#5f5f7a] text-center">
            <Ticket size={48} />
            <h3 className="text-[#9898b8]">No tickets found</h3>
          </div>
        ) : (
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
                  <th className={TH}>Assigned</th>
                  <th className={TH}>Created</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((t) => (
                  <tr
                    key={t.id}
                    className="cursor-pointer transition-colors duration-150 hover:bg-white/[0.04]"
                    onClick={() => navigate(`/admin/tickets/${t.id}`)}
                    id={`admin-ticket-${t.id}`}
                  >
                    <td className={`${TD} font-mono text-[0.78rem] text-[#818cf8] font-semibold whitespace-nowrap`}>
                      {t.ticketNumber.slice(0, 16)}…
                    </td>
                    <td className={`${TD} font-semibold text-[#f0f0fa] max-w-[240px] truncate text-[0.88rem]`}>
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
                    <td className={`${TD} text-[#9898b8] text-[0.82rem] whitespace-nowrap`}>
                      {t.assignedTo ? t.assignedTo.slice(0, 8) + '…' : '—'}
                    </td>
                    <td className={`${TD} text-[#5f5f7a] text-[0.82rem] whitespace-nowrap`}>
                      {new Date(t.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/[0.08]">
            <button id="admin-prev-page" disabled={page === 1} onClick={() => setPage(p => p - 1)} className={BTN_GHOST}>← Prev</button>
            <span className="text-[0.85rem] text-[#9898b8]">Page {page} of {totalPages}</span>
            <button id="admin-next-page" disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className={BTN_GHOST}>Next →</button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
