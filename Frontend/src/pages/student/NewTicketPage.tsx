import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../../layouts/DashboardLayout';
import { createTicket } from '../../lib/api';
import { ArrowLeft, Send, AlertCircle } from 'lucide-react';

const CATEGORIES = [
  { value: 'FEES',         label: '💳 Fees & Payments' },
  { value: 'ATTENDANCE',   label: '📅 Attendance'       },
  { value: 'ID_CARD',      label: '🪪 ID Card'          },
  { value: 'DOCUMENTS',    label: '📄 Documents'        },
  { value: 'CERTIFICATES', label: '🎓 Certificates'     },
  { value: 'OTHER',        label: '❓ Other'            },
];

const PRIORITIES = [
  { value: 'LOW',    label: 'Low',    desc: 'Non-urgent, can wait a few days',         border: 'hover:border-emerald-500 data-[sel=true]:border-emerald-500' },
  { value: 'MEDIUM', label: 'Medium', desc: 'Needs attention soon',                    border: 'hover:border-blue-500 data-[sel=true]:border-blue-500'      },
  { value: 'HIGH',   label: 'High',   desc: 'Important, needs quick resolution',       border: 'hover:border-amber-500 data-[sel=true]:border-amber-500'    },
  { value: 'URGENT', label: 'Urgent', desc: 'Critical, requires immediate action',     border: 'hover:border-red-500 data-[sel=true]:border-red-500'        },
];

const INPUT = 'w-full rounded-xl px-3.5 py-2.5 bg-[#13131f] border border-white/[0.08] text-[#f0f0fa] text-[0.9rem] outline-none transition-all duration-200 focus:border-indigo-500 focus:bg-[#1e1e30] focus:shadow-[0_0_0_3px_rgba(99,102,241,0.15)] placeholder:text-[#5f5f7a]';
const BTN_PRIMARY = 'inline-flex items-center gap-1.5 px-[18px] py-[9px] rounded-xl text-[0.88rem] font-semibold text-white border-0 cursor-pointer whitespace-nowrap transition-all duration-200 hover:brightness-110 hover:-translate-y-px disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none';
const BTN_GHOST   = 'inline-flex items-center gap-1.5 px-[18px] py-[9px] rounded-xl text-[0.88rem] font-semibold text-[#9898b8] cursor-pointer whitespace-nowrap bg-white/[0.035] border border-white/[0.08] hover:border-white/[0.14] hover:text-[#f0f0fa] transition-all duration-200';

export default function NewTicketPage() {
  const navigate = useNavigate();
  const [category, setCategory]       = useState('');
  const [subject, setSubject]         = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority]       = useState('MEDIUM');
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true); setError('');
    try {
      const ticket = await createTicket({ category, subject, description, priority });
      navigate(`/student/tickets/${ticket.id}`);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string | string[] } } };
      const msg = e.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(', ') : msg || 'Failed to create ticket.');
    } finally { setLoading(false); }
  };

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="flex items-start justify-between mb-7 gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <button id="btn-back-tickets" className={BTN_GHOST + ' !p-2'} onClick={() => navigate('/student/tickets')}>
            <ArrowLeft size={18}/>
          </button>
          <div>
            <h1 className="text-[1.6rem] font-extrabold text-[#f0f0fa]">New Support Ticket</h1>
            <p className="text-[#9898b8] text-[0.88rem] mt-0.5">Describe your issue and we'll get back to you</p>
          </div>
        </div>
      </div>

      {/* Form card */}
      <div className="rounded-[22px] p-7 max-w-[760px] flex flex-col gap-6 bg-white/[0.035] border border-white/[0.08]">
        {error && (
          <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl mb-0 text-[0.88rem] text-[#fca5a5] bg-red-500/[0.12] border border-red-500/30">
            <AlertCircle size={16}/> {error}
          </div>
        )}

        <form id="new-ticket-form" onSubmit={handleSubmit} className="flex flex-col gap-6">
          {/* Category */}
          <div className="flex flex-col gap-3">
            <h3 className="text-[0.82rem] font-semibold text-[#9898b8] uppercase tracking-[0.06em]">Category</h3>
            <div className="grid grid-cols-3 gap-2">
              {CATEGORIES.map((cat) => (
                <button key={cat.value} type="button" id={`cat-${cat.value.toLowerCase()}`}
                  onClick={() => setCategory(cat.value)}
                  className={`rounded-xl py-3 px-2 cursor-pointer text-[0.82rem] font-medium text-center transition-all duration-200 border ${
                    category === cat.value
                      ? 'border-indigo-500 text-indigo-400 bg-indigo-500/[0.10]'
                      : 'border-white/[0.08] text-[#9898b8] bg-white/[0.04] hover:border-white/[0.14] hover:text-[#f0f0fa] hover:bg-white/[0.06]'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Subject */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="ticket-subject" className="text-[0.82rem] font-semibold text-[#9898b8] uppercase tracking-[0.06em] flex items-center justify-between">
              Subject *
              <span className="text-[#5f5f7a] text-[0.78rem] font-normal">{subject.length}/200</span>
            </label>
            <input id="ticket-subject" type="text" placeholder="Brief description of your issue"
              value={subject} onChange={(e) => setSubject(e.target.value)}
              required minLength={3} maxLength={200} className={INPUT} />
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="ticket-description" className="text-[0.82rem] font-semibold text-[#9898b8] uppercase tracking-[0.06em] flex items-center justify-between">
              Description *
              <span className="text-[#5f5f7a] text-[0.78rem] font-normal">{description.length}/10000</span>
            </label>
            <textarea id="ticket-description"
              placeholder="Provide a detailed description of your issue. Include any relevant information that might help us resolve it faster."
              value={description} onChange={(e) => setDescription(e.target.value)}
              required minLength={10} maxLength={10000} rows={6}
              className={INPUT + ' resize-y leading-relaxed'} />
          </div>

          {/* Priority */}
          <div className="flex flex-col gap-3">
            <h3 className="text-[0.82rem] font-semibold text-[#9898b8] uppercase tracking-[0.06em]">Priority</h3>
            <div className="grid grid-cols-2 gap-2">
              {PRIORITIES.map((p) => (
                <button key={p.value} type="button" id={`priority-${p.value.toLowerCase()}`}
                  onClick={() => setPriority(p.value)}
                  className={`rounded-xl p-3 cursor-pointer text-[0.82rem] text-left flex flex-col gap-0.5 transition-all duration-200 border ${
                    priority === p.value
                      ? `bg-indigo-500/[0.10] ${p.border.split(' ')[1] ?? 'border-indigo-500'} text-[#f0f0fa]`
                      : 'border-white/[0.08] text-[#9898b8] bg-white/[0.04] hover:border-white/[0.14] hover:text-[#f0f0fa]'
                  }`}
                >
                  <strong className="text-[0.88rem] text-[#f0f0fa]">{p.label}</strong>
                  <span>{p.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button type="button" className={BTN_GHOST} onClick={() => navigate('/student/tickets')}>Cancel</button>
            <button id="submit-ticket" type="submit" disabled={loading || !category || !subject || !description} className={BTN_PRIMARY}
              style={{ background: 'linear-gradient(135deg,#6366f1,#764ba2)', boxShadow: '0 4px 12px rgba(99,102,241,0.3)' }}>
              {loading
                ? <span className="w-[18px] h-[18px] rounded-full border-[3px] border-white/20 border-t-white anim-spin"/>
                : <><Send size={16}/> Submit Ticket</>}
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
