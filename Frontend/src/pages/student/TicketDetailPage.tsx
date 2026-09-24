import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../../layouts/DashboardLayout';
import { useAuth } from '../../context/AuthContext';
import { getTicket, listComments, listActivities, addComment, closeTicket, reopenTicket, cancelTicket } from '../../lib/api';
import { StatusBadge, PriorityBadge, SLABadge } from '../../components/Badge';
import { ArrowLeft, Send, Clock, RotateCcw, XCircle, CheckCircle, MessageSquare, Activity, AlertCircle } from 'lucide-react';

interface TicketDetail {
  id: string; ticketNumber: string; subject: string; description: string; category: string;
  status: string; priority: string; createdAt: string; updatedAt: string;
  resolutionNote: string|null; resolutionCategory: string|null; pendingReason: string|null;
  responseDueAt: string; resolutionDueAt: string;
  sla: { response: string; resolution: string; effectiveResolutionDueAt: string };
}
interface Comment { id: string; userId: string; message: string; internal: boolean; createdAt: string; }
interface TicketActivity { id: string; actorId: string|null; action: string; metadata: Record<string,unknown>; createdAt: string; }

const CARD = 'rounded-2xl p-5 mb-5 bg-white/[0.035] border border-white/[0.08]';
const BTN_PRIMARY = 'inline-flex items-center gap-1.5 px-[18px] py-[9px] rounded-xl text-[0.88rem] font-semibold text-white border-0 cursor-pointer whitespace-nowrap transition-all duration-200 hover:brightness-110 hover:-translate-y-px disabled:opacity-50 disabled:cursor-not-allowed';
const BTN_GHOST   = 'inline-flex items-center gap-1.5 px-[18px] py-[9px] rounded-xl text-[0.88rem] font-semibold text-[#9898b8] cursor-pointer whitespace-nowrap bg-white/[0.035] border border-white/[0.08] hover:border-white/[0.14] hover:text-[#f0f0fa] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed';
const BTN_SUCCESS = 'inline-flex items-center gap-1.5 px-[18px] py-[9px] rounded-xl text-[0.88rem] font-semibold text-emerald-400 cursor-pointer whitespace-nowrap bg-emerald-500/15 border border-emerald-500/35 hover:bg-emerald-500/25 transition-all duration-200 disabled:opacity-50';
const BTN_WARNING = 'inline-flex items-center gap-1.5 px-[18px] py-[9px] rounded-xl text-[0.88rem] font-semibold text-amber-400 cursor-pointer whitespace-nowrap bg-amber-500/15 border border-amber-500/35 hover:bg-amber-500/25 transition-all duration-200 disabled:opacity-50';
const BTN_DANGER  = 'inline-flex items-center gap-1.5 px-[18px] py-[9px] rounded-xl text-[0.88rem] font-semibold text-red-400 cursor-pointer whitespace-nowrap bg-red-500/15 border border-red-500/35 hover:bg-red-500/25 transition-all duration-200 disabled:opacity-50';
const TEXTAREA_INPUT = 'w-full rounded-xl px-3.5 py-2.5 bg-[#13131f] border border-white/[0.08] text-[#f0f0fa] resize-y outline-none text-[0.9rem] transition-all duration-200 focus:border-indigo-500 focus:shadow-[0_0_0_3px_rgba(99,102,241,0.12)] placeholder:text-[#5f5f7a]';

function TimelineEntry({ activity }: { activity: TicketActivity }) {
  const meta = activity.metadata as Record<string,string>;
  return (
    <div className="tl-entry flex gap-3.5 relative pb-4">
      <div className="tl-dot w-3 h-3 rounded-full flex-shrink-0 mt-1 relative z-10 bg-indigo-500" style={{ border: '2px solid #0f0f1e' }} />
      <div className="flex-1">
        <div className="text-[0.85rem] font-semibold text-[#f0f0fa]">{activity.action.replace(/_/g,' ')}</div>
        {meta?.from && meta?.to && (
          <div className="flex items-center gap-1.5 text-[0.8rem] mt-0.5">
            <span className="text-[#5f5f7a]">{meta.from.replace(/_/g,' ')}</span>
            <span>→</span>
            <span className="text-[#818cf8] font-semibold">{meta.to.replace(/_/g,' ')}</span>
          </div>
        )}
        <div className="text-[0.75rem] text-[#5f5f7a] mt-0.5">{new Date(activity.createdAt).toLocaleString()}</div>
      </div>
    </div>
  );
}

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [ticket, setTicket]           = useState<TicketDetail|null>(null);
  const [comments, setComments]       = useState<Comment[]>([]);
  const [activities, setActivities]   = useState<TicketActivity[]>([]);
  const [activeTab, setActiveTab]     = useState<'comments'|'activity'>('comments');
  const [commentText, setCommentText] = useState('');
  const [loading, setLoading]         = useState(true);
  const [commentLoading, setCommentLoading] = useState(false);
  const [actionLoading, setActionLoading]   = useState(false);
  const [error, setError]             = useState('');
  const [modalType, setModalType]     = useState<'reopen'|'cancel'|null>(null);
  const [modalReason, setModalReason] = useState('');

  const fetchAll = useCallback(async () => {
    if (!id) return;
    try {
      const [t, c, a] = await Promise.all([getTicket(id), listComments(id,{limit:50}), listActivities(id,{limit:50})]);
      setTicket(t); setComments(c.items); setActivities(a.items);
    } catch(e) { console.error(e); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault(); if (!id || !commentText.trim()) return;
    setCommentLoading(true);
    try { const c = await addComment(id, commentText.trim()); setComments(prev => [...prev, c]); setCommentText(''); }
    catch(err: unknown) { const e = err as {response?:{data?:{message?:string}}}; setError(e.response?.data?.message || 'Failed to add comment'); }
    finally { setCommentLoading(false); }
  };

  const handleClose = async () => {
    if (!id) return; setActionLoading(true);
    try { const updated = await closeTicket(id); setTicket(updated); }
    catch(err: unknown) { const e = err as {response?:{data?:{message?:string}}}; setError(e.response?.data?.message || 'Failed'); }
    finally { setActionLoading(false); }
  };

  const handleModalAction = async () => {
    if (!id || !modalReason.trim()) return; setActionLoading(true);
    try {
      const updated = modalType === 'reopen' ? await reopenTicket(id, modalReason) : await cancelTicket(id, modalReason);
      setTicket(updated); setModalType(null); setModalReason(''); fetchAll();
    } catch(err: unknown) { const e = err as {response?:{data?:{message?:string}}}; setError(e.response?.data?.message || 'Action failed'); }
    finally { setActionLoading(false); }
  };

  if (loading) return <DashboardLayout><div className="flex items-center justify-center p-20"><div className="w-10 h-10 rounded-full anim-spin border-[3px] border-white/10 border-t-indigo-500"/></div></DashboardLayout>;
  if (!ticket) return <DashboardLayout><div className="flex flex-col items-center gap-3.5 py-[60px] text-[#5f5f7a] text-center"><AlertCircle size={48}/><h3 className="text-[#9898b8]">Ticket not found</h3></div></DashboardLayout>;

  const isStudent = user?.role === 'STUDENT';
  const canClose  = ticket.status === 'RESOLVED' && isStudent;
  const canReopen = (ticket.status === 'RESOLVED' || ticket.status === 'CLOSED') && isStudent;
  const canCancel = ['NEW','ASSIGNED','IN_PROGRESS'].includes(ticket.status) && isStudent;

  const TAB_BASE = 'flex items-center gap-1.5 px-4 py-2.5 bg-transparent border-0 border-b-2 text-[0.85rem] font-semibold cursor-pointer -mb-px transition-all duration-200';

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="flex items-start justify-between mb-7 gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <button className={BTN_GHOST + ' !p-2'} onClick={() => navigate(-1)}><ArrowLeft size={18}/></button>
          <div>
            <h1 className="text-[1.6rem] font-extrabold text-[#f0f0fa]">{ticket.subject}</h1>
            <p className="text-[#5f5f7a] font-mono text-[0.78rem] mt-0.5">{ticket.ticketNumber}</p>
          </div>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          {canClose  && <button id="btn-close-ticket"  className={BTN_SUCCESS} onClick={handleClose}                        disabled={actionLoading}><CheckCircle size={15}/> Close Ticket</button>}
          {canReopen && <button id="btn-reopen-ticket" className={BTN_WARNING} onClick={() => setModalType('reopen')}       disabled={actionLoading}><RotateCcw size={15}/> Reopen</button>}
          {canCancel && <button id="btn-cancel-ticket" className={BTN_DANGER}  onClick={() => setModalType('cancel')}       disabled={actionLoading}><XCircle size={15}/> Cancel</button>}
        </div>
      </div>

      {error && <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl mb-4 text-[0.88rem] text-[#fca5a5] bg-red-500/[0.12] border border-red-500/30"><AlertCircle size={16}/> {error}</div>}

      <div className="grid gap-5 items-start" style={{ gridTemplateColumns: '1fr 280px' }}>
        {/* Main */}
        <div className="flex flex-col">
          {/* Description */}
          <div className={CARD}>
            <div className="flex items-center justify-between mb-4"><h2 className="flex items-center gap-2 text-[0.95rem] font-bold text-[#f0f0fa]">Description</h2></div>
            <div className="text-[#9898b8] text-[0.9rem] leading-[1.7] whitespace-pre-wrap break-words">{ticket.description}</div>
          </div>

          {/* Resolution note */}
          {ticket.resolutionNote && (
            <div className={CARD + ' !border-emerald-500/25 !bg-emerald-500/[0.05]'}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="flex items-center gap-2 text-[0.95rem] font-bold text-[#f0f0fa]"><CheckCircle size={16}/> Resolution</h2>
                {ticket.resolutionCategory && <span className="inline-flex px-2.5 py-[3px] rounded-md text-[0.72rem] font-semibold text-[#a5b4fc] bg-indigo-500/[0.12]">{ticket.resolutionCategory}</span>}
              </div>
              <div className="text-[#9898b8] text-[0.9rem] leading-[1.7] whitespace-pre-wrap">{ticket.resolutionNote}</div>
            </div>
          )}

          {/* Pending */}
          {ticket.pendingReason && ticket.status.startsWith('PENDING') && (
            <div className={CARD + ' !border-amber-500/25 !bg-amber-500/[0.05]'}>
              <div className="flex items-center justify-between mb-4"><h2 className="flex items-center gap-2 text-[0.95rem] font-bold text-[#f0f0fa]"><Clock size={16}/> Pending — Action Required</h2></div>
              <div className="text-[#9898b8] text-[0.9rem] leading-[1.7]">{ticket.pendingReason}</div>
            </div>
          )}

          {/* Tabs */}
          <div className={CARD}>
            <div className="flex gap-1 mb-4 border-b border-white/[0.08]">
              <button id="tab-comments" onClick={() => setActiveTab('comments')}
                className={TAB_BASE + (activeTab==='comments' ? ' text-[#818cf8] border-b-[#818cf8]' : ' border-b-transparent text-[#5f5f7a] hover:text-[#f0f0fa]')}>
                <MessageSquare size={15}/> Comments ({comments.length})
              </button>
              <button id="tab-activity" onClick={() => setActiveTab('activity')}
                className={TAB_BASE + (activeTab==='activity' ? ' text-[#818cf8] border-b-[#818cf8]' : ' border-b-transparent text-[#5f5f7a] hover:text-[#f0f0fa]')}>
                <Activity size={15}/> Activity ({activities.length})
              </button>
            </div>

            {activeTab === 'comments' && (
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-3">
                  {comments.length === 0
                    ? <div className="text-[#5f5f7a] text-[0.85rem] text-center py-6">No comments yet. Be the first to reply.</div>
                    : comments.map((c) => (
                        <div key={c.id}
                          className={`rounded-2xl px-4 py-3 max-w-[80%] ${c.userId === user?.id ? 'ml-auto bg-indigo-500/[0.10] border border-indigo-500/25' : 'bg-[#13131f] border border-white/[0.08]'}`}>
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="text-[0.78rem] font-bold text-[#9898b8]">{c.userId === user?.id ? 'You' : 'Support Team'}</span>
                            <span className="text-[0.72rem] text-[#5f5f7a]">{new Date(c.createdAt).toLocaleString()}</span>
                          </div>
                          <div className="text-[0.88rem] text-[#f0f0fa] leading-[1.55] whitespace-pre-wrap">{c.message}</div>
                        </div>
                      ))
                  }
                </div>
                {!['RESOLVED','CLOSED','CANCELLED'].includes(ticket.status) && (
                  <form className="flex flex-col gap-2.5" onSubmit={handleComment} id="comment-form">
                    <textarea id="comment-input" placeholder="Add a comment or reply…" value={commentText}
                      onChange={(e) => setCommentText(e.target.value)} rows={3} required className={TEXTAREA_INPUT}/>
                    <button id="submit-comment" type="submit" disabled={commentLoading || !commentText.trim()} className={BTN_PRIMARY}
                      style={{ background: 'linear-gradient(135deg,#6366f1,#764ba2)' }}>
                      {commentLoading ? <span className="w-[18px] h-[18px] rounded-full border-[3px] border-white/20 border-t-white anim-spin"/> : <><Send size={14}/> Send</>}
                    </button>
                  </form>
                )}
              </div>
            )}

            {activeTab === 'activity' && (
              <div className="flex flex-col py-1">
                {activities.length === 0
                  ? <div className="text-[#5f5f7a] text-[0.85rem] text-center py-6">No activity yet.</div>
                  : activities.map((a) => <TimelineEntry key={a.id} activity={a}/>)
                }
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <aside className="flex flex-col gap-4 sticky top-6">
          <div className={CARD + ' !mb-0'}>
            <h3 className="text-[0.72rem] font-bold uppercase tracking-[0.06em] text-[#5f5f7a] mb-3">Details</h3>
            <div className="flex flex-col gap-2.5">
              {[
                ['Status',   <StatusBadge status={ticket.status}/>],
                ['Priority', <PriorityBadge priority={ticket.priority}/>],
                ['Category', <span className="inline-flex px-2.5 py-[3px] rounded-md text-[0.72rem] font-semibold text-[#a5b4fc] bg-indigo-500/[0.12]">{ticket.category.replace(/_/g,' ')}</span>],
                ['Created',  <span className="text-[#5f5f7a] text-[0.82rem]">{new Date(ticket.createdAt).toLocaleString()}</span>],
                ['Updated',  <span className="text-[#5f5f7a] text-[0.82rem]">{new Date(ticket.updatedAt).toLocaleString()}</span>],
              ].map(([label, value]) => (
                <div key={String(label)} className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-[0.78rem] text-[#5f5f7a] whitespace-nowrap">{label as string}</span>
                  {value as React.ReactNode}
                </div>
              ))}
            </div>
          </div>
          <div className={CARD + ' !mb-0'}>
            <h3 className="text-[0.72rem] font-bold uppercase tracking-[0.06em] text-[#5f5f7a] mb-3">SLA Status</h3>
            <div className="flex flex-col gap-2.5">
              {[
                ['Response',   <SLABadge state={ticket.sla.response}/>],
                ['Resolution', <SLABadge state={ticket.sla.resolution}/>],
                ['Due By',     <span className="text-[#5f5f7a] text-[0.82rem]">{new Date(ticket.sla.effectiveResolutionDueAt).toLocaleString()}</span>],
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

      {/* Modal */}
      {modalType && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-5 blur-modal anim-fadein" style={{ background: 'rgba(0,0,0,0.75)' }} onClick={() => setModalType(null)}>
          <div className="w-full max-w-[460px] max-h-[90vh] overflow-y-auto flex flex-col gap-[18px] rounded-[22px] p-7 anim-slideup"
            style={{ background: '#13131f', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 8px 48px rgba(0,0,0,0.6)' }}
            onClick={(e) => e.stopPropagation()} id="action-modal">
            <h3 className="text-[1.1rem] font-bold flex items-center gap-2.5 text-[#f0f0fa]">
              {modalType === 'reopen' ? '🔄 Reopen Ticket' : '❌ Cancel Ticket'}
            </h3>
            <p className="text-[#9898b8] text-[0.88rem]">
              {modalType === 'reopen' ? 'Please provide a reason for reopening this ticket.' : 'Please provide a reason for cancelling this ticket.'}
            </p>
            <textarea id="modal-reason" placeholder="Enter your reason…" value={modalReason}
              onChange={(e) => setModalReason(e.target.value)} rows={3} required minLength={3} className={TEXTAREA_INPUT}/>
            <div className="flex justify-end gap-2.5">
              <button className={BTN_GHOST} onClick={() => setModalType(null)}>Cancel</button>
              <button id="modal-confirm" onClick={handleModalAction} disabled={actionLoading || !modalReason.trim()}
                className={modalType === 'cancel' ? BTN_DANGER : BTN_WARNING}>
                {actionLoading ? <span className="w-[18px] h-[18px] rounded-full border-[3px] border-white/20 border-t-white anim-spin"/> : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
