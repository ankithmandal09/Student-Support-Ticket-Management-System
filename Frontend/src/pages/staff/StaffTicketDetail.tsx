import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../../layouts/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import {
  getTicket, listComments, listActivities, addComment, listUsers,
  assignTicket, updatePriority, updateStatus, resolveTicket, closeTicket, reopenTicket, cancelTicket
} from '../../lib/api';
import { StatusBadge, PriorityBadge, SLABadge } from '../../components/Badge';
import {
  ArrowLeft, Send, MessageSquare, Activity, AlertCircle, CheckCircle,
  UserCheck, Zap, RotateCcw, XCircle, PauseCircle
} from 'lucide-react';

interface TicketDetail {
  id: string;
  ticketNumber: string;
  subject: string;
  description: string;
  category: string;
  status: string;
  priority: string;
  assignedTo: string | null;
  assignedTeam: string | null;
  pendingReason: string | null;
  resolutionNote: string | null;
  resolutionCategory: string | null;
  studentId: string;
  createdAt: string;
  updatedAt: string;
  sla: { response: string; resolution: string; effectiveResolutionDueAt: string };
}

interface Comment { id: string; userId: string; message: string; internal: boolean; createdAt: string; }
interface TicketActivity { id: string; actorId: string | null; action: string; metadata: Record<string, unknown>; createdAt: string; }
interface UserItem { id: string; name: string; email: string; role: string; }

const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
const STATUS_OPTIONS = ['IN_PROGRESS', 'PENDING_STUDENT', 'PENDING_INTERNAL'];

const CARD = 'rounded-2xl p-5 mb-5 bg-white/[0.035] border border-white/[0.08]';
const BTN_PRIMARY = 'inline-flex items-center gap-1.5 px-[18px] py-[9px] rounded-xl text-[0.88rem] font-semibold text-white border-0 cursor-pointer whitespace-nowrap transition-all duration-200 hover:brightness-110 hover:-translate-y-px disabled:opacity-50 disabled:cursor-not-allowed';
const BTN_GHOST = 'inline-flex items-center gap-1.5 px-[18px] py-[9px] rounded-xl text-[0.88rem] font-semibold text-[#9898b8] cursor-pointer whitespace-nowrap bg-white/[0.035] border border-white/[0.08] hover:border-white/[0.14] hover:text-[#f0f0fa] hover:bg-white/[0.06] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed';
const BTN_SUCCESS = 'inline-flex items-center gap-1.5 px-[18px] py-[9px] rounded-xl text-[0.88rem] font-semibold text-white border-0 cursor-pointer whitespace-nowrap transition-all duration-200 bg-emerald-600 hover:bg-emerald-500 hover:-translate-y-px disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_4px_12px_rgba(16,185,129,0.25)]';
const BTN_WARNING = 'inline-flex items-center gap-1.5 px-[18px] py-[9px] rounded-xl text-[0.88rem] font-semibold text-white border-0 cursor-pointer whitespace-nowrap transition-all duration-200 bg-amber-600 hover:bg-amber-500 hover:-translate-y-px disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_4px_12px_rgba(245,158,11,0.25)]';
const BTN_DANGER = 'inline-flex items-center gap-1.5 px-[18px] py-[9px] rounded-xl text-[0.88rem] font-semibold text-white border-0 cursor-pointer whitespace-nowrap transition-all duration-200 bg-red-600 hover:bg-red-500 hover:-translate-y-px disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_4px_12px_rgba(239,68,68,0.25)]';

const INPUT = 'w-full rounded-xl px-3.5 py-2.5 bg-[#13131f] border border-white/[0.08] text-[#f0f0fa] text-[0.9rem] outline-none transition-all duration-200 focus:border-indigo-500 focus:bg-[#1e1e30] focus:shadow-[0_0_0_3px_rgba(99,102,241,0.15)] placeholder:text-[#5f5f7a]';
const TEXTAREA = 'w-full rounded-xl px-3.5 py-2.5 bg-[#13131f] border border-white/[0.08] text-[#f0f0fa] resize-y outline-none text-[0.9rem] transition-all duration-200 focus:border-indigo-500 focus:shadow-[0_0_0_3px_rgba(99,102,241,0.12)] placeholder:text-[#5f5f7a]';
const SELECT = 'w-full rounded-xl py-2.5 pl-3.5 pr-8 bg-[#13131f] border border-white/[0.08] text-[#f0f0fa] text-[0.9rem] outline-none cursor-pointer focus:border-indigo-500 transition-all duration-200 sel';

function TimelineEntry({ activity }: { activity: TicketActivity }) {
  const meta = activity.metadata as Record<string, string>;
  return (
    <div className="tl-entry flex gap-3.5 relative pb-4">
      <div className="tl-dot w-3 h-3 rounded-full flex-shrink-0 mt-1 relative z-10 bg-indigo-500" style={{ border: '2px solid #0f0f1e' }} />
      <div className="flex-1">
        <div className="text-[0.85rem] font-semibold text-[#f0f0fa]">{activity.action.replace(/_/g, ' ')}</div>
        {meta?.from && meta?.to && (
          <div className="flex items-center gap-1.5 text-[0.8rem] mt-0.5">
            <span className="text-[#5f5f7a]">{meta.from.replace(/_/g, ' ')}</span>
            <span className="text-[#5f5f7a]">→</span>
            <span className="text-[#818cf8] font-semibold">{meta.to.replace(/_/g, ' ')}</span>
          </div>
        )}
        <div className="text-[0.75rem] text-[#5f5f7a] mt-0.5">{new Date(activity.createdAt).toLocaleString()}</div>
      </div>
    </div>
  );
}

export default function StaffTicketDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [activities, setActivities] = useState<TicketActivity[]>([]);
  const [staffUsers, setStaffUsers] = useState<UserItem[]>([]);
  const [activeTab, setActiveTab] = useState<'comments' | 'activity'>('comments');
  const [commentText, setCommentText] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [commentLoading, setCommentLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');

  // Action modals
  const [modal, setModal] = useState<'assign' | 'priority' | 'status' | 'resolve' | 'reopen' | 'cancel' | null>(null);
  const [assignTo, setAssignTo] = useState('');
  const [assignTeam, setAssignTeam] = useState('');
  const [newPriority, setNewPriority] = useState('');
  const [newStatus, setNewStatus] = useState('IN_PROGRESS');
  const [statusReason, setStatusReason] = useState('');
  const [resolveNote, setResolveNote] = useState('');
  const [resolveCategory, setResolveCategory] = useState('');
  const [modalReason, setModalReason] = useState('');

  const fetchAll = useCallback(async () => {
    if (!id) return;
    try {
      const [t, c, a] = await Promise.all([
        getTicket(id), listComments(id, { limit: 50 }), listActivities(id, { limit: 50 })
      ]);
      setTicket(t);
      setComments(c.items);
      setActivities(a.items);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [id]);

  const fetchStaff = useCallback(async () => {
    try {
      const data = await listUsers({ limit: 100 });
      setStaffUsers(data.items.filter((u: UserItem) => u.role === 'STAFF' || u.role === 'ADMIN'));
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => { fetchAll(); fetchStaff(); }, [fetchAll, fetchStaff]);

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !commentText.trim()) return;
    setCommentLoading(true);
    try {
      const c = await addComment(id, commentText.trim(), isInternal);
      setComments(prev => [...prev, c]);
      setCommentText('');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message || 'Failed to add comment');
    } finally { setCommentLoading(false); }
  };

  const handleAction = async () => {
    if (!id || !ticket) return;
    setActionLoading(true);
    setError('');
    try {
      let updated: TicketDetail | null = null;
      if (modal === 'assign') {
        updated = await assignTicket(id, assignTo, assignTeam);
      } else if (modal === 'priority') {
        updated = await updatePriority(id, newPriority);
      } else if (modal === 'status') {
        updated = await updateStatus(id, newStatus, statusReason);
      } else if (modal === 'resolve') {
        updated = await resolveTicket(id, resolveNote, resolveCategory);
      } else if (modal === 'reopen') {
        updated = await reopenTicket(id, modalReason);
      } else if (modal === 'cancel') {
        updated = await cancelTicket(id, modalReason);
      }
      if (updated) setTicket(updated);
      setModal(null);
      fetchAll();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message || 'Action failed');
    } finally { setActionLoading(false); }
  };

  const handleClose = async () => {
    if (!id) return;
    setActionLoading(true);
    try {
      const updated = await closeTicket(id);
      setTicket(updated);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message || 'Failed');
    } finally { setActionLoading(false); }
  };

  if (loading) return <DashboardLayout><div className="flex items-center justify-center p-20"><div className="w-10 h-10 rounded-full anim-spin border-[3px] border-white/10 border-t-indigo-500" /></div></DashboardLayout>;
  if (!ticket) return <DashboardLayout><div className="flex flex-col items-center gap-3.5 py-[60px] text-[#5f5f7a] text-center"><AlertCircle size={48} /><h3 className="text-[#9898b8]">Ticket not found</h3></div></DashboardLayout>;

  const isOwner = user?.role === 'STAFF' || user?.role === 'ADMIN';
  const canAssign = isOwner && !['RESOLVED', 'CLOSED', 'CANCELLED'].includes(ticket.status);
  const canProgress = isOwner && ['ASSIGNED', 'IN_PROGRESS', 'PENDING_STUDENT', 'PENDING_INTERNAL', 'REOPENED'].includes(ticket.status);
  const canResolve = isOwner && ticket.status === 'IN_PROGRESS';
  const canClose = ticket.status === 'RESOLVED';
  const canReopen = ['RESOLVED', 'CLOSED'].includes(ticket.status);
  const canCancel = user?.role === 'ADMIN' && !['RESOLVED', 'CLOSED', 'CANCELLED'].includes(ticket.status);

  return (
    <DashboardLayout>
      <div className="flex items-start justify-between mb-7 gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <button className={`${BTN_GHOST} !p-2.5`} onClick={() => navigate(-1)}><ArrowLeft size={18} /></button>
          <div>
            <h1 className="text-[1.6rem] font-extrabold text-[#f0f0fa]">{ticket.subject}</h1>
            <p className="text-[#5f5f7a] font-mono text-[0.78rem] mt-0.5">{ticket.ticketNumber}</p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          {canAssign && (
            <button
              id="btn-assign"
              className={BTN_PRIMARY}
              onClick={() => { setAssignTo(ticket.assignedTo ?? ''); setAssignTeam(ticket.assignedTeam ?? ''); setModal('assign'); }}
              style={{ background: 'linear-gradient(135deg,#6366f1,#764ba2)', boxShadow: '0 4px 12px rgba(99,102,241,0.3)' }}
            >
              <UserCheck size={15} /> Assign
            </button>
          )}
          {canProgress && (
            <button id="btn-status" className={BTN_WARNING} onClick={() => setModal('status')}>
              <Zap size={15} /> Status
            </button>
          )}
          {canResolve && (
            <button id="btn-resolve" className={BTN_SUCCESS} onClick={() => setModal('resolve')}>
              <CheckCircle size={15} /> Resolve
            </button>
          )}
          {canClose && (
            <button id="btn-close" className={BTN_SUCCESS} onClick={handleClose} disabled={actionLoading}>
              <CheckCircle size={15} /> Close
            </button>
          )}
          {canReopen && (
            <button id="btn-reopen" className={BTN_WARNING} onClick={() => setModal('reopen')}>
              <RotateCcw size={15} /> Reopen
            </button>
          )}
          {canCancel && (
            <button id="btn-cancel" className={BTN_DANGER} onClick={() => setModal('cancel')}>
              <XCircle size={15} /> Cancel
            </button>
          )}
          <button id="btn-priority" className={BTN_GHOST} onClick={() => { setNewPriority(ticket.priority); setModal('priority'); }}>
            Priority: {ticket.priority}
          </button>
        </div>
      </div>

      {error && <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl mb-4 text-[0.88rem] text-[#fca5a5] bg-red-500/[0.12] border border-red-500/30"><AlertCircle size={16} /> {error}</div>}

      <div className="grid gap-5 items-start" style={{ gridTemplateColumns: '1fr 280px' }}>
        <div className="flex flex-col">
          <div className={CARD}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="flex items-center gap-2 text-[0.95rem] font-bold text-[#f0f0fa]">Description</h2>
            </div>
            <div className="text-[#9898b8] text-[0.9rem] leading-[1.7] whitespace-pre-wrap break-words">{ticket.description}</div>
          </div>

          {ticket.resolutionNote && (
            <div className={`${CARD} border-emerald-500/30 bg-emerald-500/[0.04]`}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="flex items-center gap-2 text-[0.95rem] font-bold text-[#f0f0fa]"><CheckCircle size={16} className="text-emerald-400" /> Resolution</h2>
                {ticket.resolutionCategory && (
                  <span className="inline-flex px-2.5 py-[3px] rounded-md text-[0.72rem] font-semibold text-emerald-400 bg-emerald-500/[0.15]">
                    {ticket.resolutionCategory}
                  </span>
                )}
              </div>
              <div className="text-[#9898b8] text-[0.9rem] leading-[1.7] whitespace-pre-wrap">{ticket.resolutionNote}</div>
            </div>
          )}

          {ticket.pendingReason && ticket.status.startsWith('PENDING') && (
            <div className={`${CARD} border-amber-500/30 bg-amber-500/[0.04]`}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="flex items-center gap-2 text-[0.95rem] font-bold text-[#f0f0fa]"><PauseCircle size={16} className="text-amber-400" /> Pending Reason</h2>
              </div>
              <div className="text-[#9898b8] text-[0.9rem] leading-[1.7]">{ticket.pendingReason}</div>
            </div>
          )}

          <div className={CARD}>
            <div className="flex gap-1 mb-4 border-b border-white/[0.08]">
              <button
                id="tab-comments-staff"
                className={`flex items-center gap-2 px-4 py-2.5 text-[0.88rem] font-medium border-b-2 -mb-px transition-colors cursor-pointer ${
                  activeTab === 'comments'
                    ? 'border-indigo-500 text-indigo-400 font-semibold'
                    : 'border-transparent text-[#9898b8] hover:text-[#f0f0fa]'
                }`}
                onClick={() => setActiveTab('comments')}
              >
                <MessageSquare size={15} /> Comments ({comments.length})
              </button>
              <button
                id="tab-activity-staff"
                className={`flex items-center gap-2 px-4 py-2.5 text-[0.88rem] font-medium border-b-2 -mb-px transition-colors cursor-pointer ${
                  activeTab === 'activity'
                    ? 'border-indigo-500 text-indigo-400 font-semibold'
                    : 'border-transparent text-[#9898b8] hover:text-[#f0f0fa]'
                }`}
                onClick={() => setActiveTab('activity')}
              >
                <Activity size={15} /> Activity ({activities.length})
              </button>
            </div>

            {activeTab === 'comments' && (
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-3">
                  {comments.length === 0 ? (
                    <div className="text-[#5f5f7a] text-[0.85rem] text-center py-6">No comments yet.</div>
                  ) : (
                    comments.map((c) => {
                      const isOwn = c.userId === user?.id;
                      return (
                        <div
                          key={c.id}
                          className={`p-3.5 rounded-xl ${
                            c.internal
                              ? 'bg-amber-500/[0.08] border border-amber-500/30'
                              : isOwn
                              ? 'bg-indigo-500/[0.1] border border-indigo-500/20 ml-6'
                              : 'bg-white/[0.035] border border-white/[0.06] mr-6'
                          }`}
                        >
                          {c.internal && (
                            <div className="inline-flex items-center gap-1 text-[0.72rem] font-bold text-amber-400 uppercase tracking-wider mb-1.5">
                              🔒 Internal Note (hidden from student)
                            </div>
                          )}
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="text-[0.78rem] font-bold text-[#9898b8]">
                              {isOwn ? 'You' : 'Staff / Student'}
                            </span>
                            <span className="text-[0.72rem] text-[#5f5f7a]">
                              {new Date(c.createdAt).toLocaleString()}
                            </span>
                          </div>
                          <div className="text-[0.88rem] text-[#f0f0fa] leading-[1.55] whitespace-pre-wrap">{c.message}</div>
                        </div>
                      );
                    })
                  )}
                </div>

                {!['RESOLVED', 'CLOSED', 'CANCELLED'].includes(ticket.status) && (
                  <form className="flex flex-col gap-2.5 mt-2" onSubmit={handleComment} id="staff-comment-form">
                    <textarea
                      id="staff-comment-input"
                      className={TEXTAREA}
                      placeholder="Add a reply or internal note…"
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      rows={3}
                      required
                    />
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <label className="flex items-center gap-2 text-[0.82rem] text-[#9898b8] cursor-pointer select-none">
                        <input
                          type="checkbox"
                          id="internal-toggle"
                          className="rounded border-white/20 text-indigo-600 focus:ring-0 cursor-pointer"
                          checked={isInternal}
                          onChange={(e) => setIsInternal(e.target.checked)}
                        />
                        <span>🔒 Internal note (hidden from student)</span>
                      </label>
                      <button
                        id="submit-staff-comment"
                        type="submit"
                        className={BTN_PRIMARY}
                        disabled={commentLoading || !commentText.trim()}
                        style={{ background: 'linear-gradient(135deg,#6366f1,#764ba2)', boxShadow: '0 4px 12px rgba(99,102,241,0.3)' }}
                      >
                        {commentLoading ? <span className="w-[18px] h-[18px] rounded-full border-[3px] border-white/20 border-t-white anim-spin" /> : <><Send size={14} /> Send</>}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {activeTab === 'activity' && (
              <div className="flex flex-col py-1">
                {activities.length === 0 ? (
                  <div className="text-[#5f5f7a] text-[0.85rem] text-center py-6">No activity yet.</div>
                ) : (
                  activities.map((a) => <TimelineEntry key={a.id} activity={a} />)
                )}
              </div>
            )}
          </div>
        </div>

        <aside className="flex flex-col gap-4 sticky top-6">
          <div className={CARD}>
            <h3 className="text-[0.72rem] font-bold uppercase tracking-[0.06em] text-[#5f5f7a] mb-3">Details</h3>
            <div className="flex flex-col gap-2.5">
              {[
                ['Status', <StatusBadge key="status" status={ticket.status} />],
                ['Priority', <PriorityBadge key="pri" priority={ticket.priority} />],
                ['Category', <span key="cat" className="inline-flex px-2.5 py-[3px] rounded-md text-[0.72rem] font-semibold text-[#a5b4fc] bg-indigo-500/[0.12]">{ticket.category.replace(/_/g, ' ')}</span>],
                ['Assigned To', <span key="asg" className="text-[#9898b8] text-[0.82rem]">{ticket.assignedTo ? staffUsers.find(u => u.id === ticket.assignedTo)?.name ?? ticket.assignedTo.slice(0, 8) + '…' : 'Unassigned'}</span>],
                ['Team', <span key="tm" className="text-[#9898b8] text-[0.82rem]">{ticket.assignedTeam ?? '—'}</span>],
                ['Created', <span key="cr" className="text-[#5f5f7a] text-[0.82rem]">{new Date(ticket.createdAt).toLocaleString()}</span>],
              ].map(([label, value]) => (
                <div key={String(label)} className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-[0.78rem] text-[#5f5f7a] whitespace-nowrap">{label as string}</span>
                  {value as React.ReactNode}
                </div>
              ))}
            </div>
          </div>

          <div className={CARD}>
            <h3 className="text-[0.72rem] font-bold uppercase tracking-[0.06em] text-[#5f5f7a] mb-3">SLA Status</h3>
            <div className="flex flex-col gap-2.5">
              {[
                ['Response', <SLABadge key="resp" state={ticket.sla.response} />],
                ['Resolution', <SLABadge key="res" state={ticket.sla.resolution} />],
                ['Due By', <span key="due" className="text-[#5f5f7a] text-[0.82rem]">{new Date(ticket.sla.effectiveResolutionDueAt).toLocaleString()}</span>],
              ].map(([label, value]) => (
                <div key={String(label)} className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-[0.78rem] text-[#5f5f7a] whitespace-nowrap">{label as string}</span>
                  {value as React.ReactNode}
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>

      {/* Modals */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 blur-modal anim-fadein" onClick={() => setModal(null)}>
          <div
            className="w-full max-w-[480px] p-6 rounded-2xl bg-[#0f0f1e] border border-white/[0.12] shadow-2xl anim-slideup"
            onClick={(e) => e.stopPropagation()}
            id="staff-modal"
          >
            {modal === 'assign' && (
              <>
                <h3 className="text-[1.15rem] font-bold text-[#f0f0fa] mb-4">👤 Assign Ticket</h3>
                <div className="flex flex-col gap-3.5">
                  <div>
                    <label className="block text-[0.78rem] font-semibold text-[#9898b8] mb-1.5 uppercase tracking-wide">Assign To</label>
                    <select id="assign-to-select" className={SELECT} value={assignTo} onChange={(e) => setAssignTo(e.target.value)}>
                      <option value="">Select staff member</option>
                      {staffUsers.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[0.78rem] font-semibold text-[#9898b8] mb-1.5 uppercase tracking-wide">Team</label>
                    <input id="assign-team-input" className={INPUT} placeholder="e.g. Administration, Finance" value={assignTeam} onChange={(e) => setAssignTeam(e.target.value)} minLength={2} maxLength={100} />
                  </div>
                </div>
              </>
            )}

            {modal === 'priority' && (
              <>
                <h3 className="text-[1.15rem] font-bold text-[#f0f0fa] mb-4">⚡ Change Priority</h3>
                <div className="grid grid-cols-2 gap-2.5">
                  {PRIORITIES.map(p => (
                    <button
                      key={p}
                      id={`modal-priority-${p.toLowerCase()}`}
                      type="button"
                      className={`p-3 rounded-xl border text-center font-bold text-[0.88rem] transition-all cursor-pointer ${
                        newPriority === p
                          ? 'bg-indigo-500/20 border-indigo-500 text-[#f0f0fa] shadow-[0_0_12px_rgba(99,102,241,0.25)]'
                          : 'bg-white/[0.035] border-white/[0.08] text-[#9898b8] hover:border-white/20 hover:text-[#f0f0fa]'
                      }`}
                      onClick={() => setNewPriority(p)}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </>
            )}

            {modal === 'status' && (
              <>
                <h3 className="text-[1.15rem] font-bold text-[#f0f0fa] mb-4">⚡ Update Status</h3>
                <div className="flex flex-col gap-3.5">
                  <div>
                    <label className="block text-[0.78rem] font-semibold text-[#9898b8] mb-1.5 uppercase tracking-wide">New Status</label>
                    <select id="status-select" className={SELECT} value={newStatus} onChange={(e) => setNewStatus(e.target.value)}>
                      {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                    </select>
                  </div>
                  {(newStatus === 'PENDING_STUDENT' || newStatus === 'PENDING_INTERNAL') && (
                    <div>
                      <label className="block text-[0.78rem] font-semibold text-[#9898b8] mb-1.5 uppercase tracking-wide">Reason (required for pending states)</label>
                      <textarea id="status-reason" className={TEXTAREA} value={statusReason} onChange={(e) => setStatusReason(e.target.value)} rows={3} placeholder="Explain what's pending…" minLength={3} maxLength={2000} />
                    </div>
                  )}
                </div>
              </>
            )}

            {modal === 'resolve' && (
              <>
                <h3 className="text-[1.15rem] font-bold text-[#f0f0fa] mb-4">✅ Resolve Ticket</h3>
                <div className="flex flex-col gap-3.5">
                  <div>
                    <label className="block text-[0.78rem] font-semibold text-[#9898b8] mb-1.5 uppercase tracking-wide">Resolution Note *</label>
                    <textarea id="resolve-note" className={TEXTAREA} value={resolveNote} onChange={(e) => setResolveNote(e.target.value)} rows={4} placeholder="Describe how the issue was resolved…" minLength={3} maxLength={5000} required />
                  </div>
                  <div>
                    <label className="block text-[0.78rem] font-semibold text-[#9898b8] mb-1.5 uppercase tracking-wide">Resolution Category *</label>
                    <input id="resolve-category" className={INPUT} value={resolveCategory} onChange={(e) => setResolveCategory(e.target.value)} placeholder="e.g. Request fulfilled, Issue fixed" minLength={2} maxLength={100} required />
                  </div>
                </div>
              </>
            )}

            {(modal === 'reopen' || modal === 'cancel') && (
              <>
                <h3 className="text-[1.15rem] font-bold text-[#f0f0fa] mb-4">{modal === 'reopen' ? '🔄 Reopen Ticket' : '❌ Cancel Ticket'}</h3>
                <div className="flex flex-col gap-3.5">
                  <div>
                    <label className="block text-[0.78rem] font-semibold text-[#9898b8] mb-1.5 uppercase tracking-wide">Reason *</label>
                    <textarea id="modal-reason-input" className={TEXTAREA} value={modalReason} onChange={(e) => setModalReason(e.target.value)} rows={3} minLength={3} maxLength={2000} required />
                  </div>
                </div>
              </>
            )}

            <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-white/[0.08]">
              <button className={BTN_GHOST} onClick={() => setModal(null)}>Cancel</button>
              <button
                id="modal-confirm-btn"
                className={modal === 'cancel' ? BTN_DANGER : BTN_PRIMARY}
                style={modal === 'cancel' ? {} : { background: 'linear-gradient(135deg,#6366f1,#764ba2)', boxShadow: '0 4px 12px rgba(99,102,241,0.3)' }}
                onClick={handleAction}
                disabled={actionLoading}
              >
                {actionLoading ? <span className="w-[18px] h-[18px] rounded-full border-[3px] border-white/20 border-t-white anim-spin" /> : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
