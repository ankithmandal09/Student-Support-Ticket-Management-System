import React, { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '../../layouts/DashboardLayout';
import { listSLAPolicies, updateSLAPolicy, runSLASweep } from '../../lib/api';
import { BarChart3, Clock, Zap, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';

interface SLAPolicy {
  priority: string;
  responseMinutes: number;
  resolutionMinutes: number;
}

const PRIORITY_COLORS: Record<string, { badge: string; text: string; bg: string; border: string }> = {
  URGENT: { badge: '#ef4444', text: '#fca5a5', bg: 'rgba(239, 68, 68, 0.12)', border: 'rgba(239, 68, 68, 0.3)' },
  HIGH:   { badge: '#f59e0b', text: '#fcd34d', bg: 'rgba(245, 158, 11, 0.12)', border: 'rgba(245, 158, 11, 0.3)' },
  MEDIUM: { badge: '#3b82f6', text: '#93c5fd', bg: 'rgba(59, 130, 246, 0.12)', border: 'rgba(59, 130, 246, 0.3)' },
  LOW:    { badge: '#10b981', text: '#6ee7b7', bg: 'rgba(16, 185, 129, 0.12)', border: 'rgba(16, 185, 129, 0.3)' },
};

function minutesToLabel(min: number): string {
  if (min < 60) return `${min}m`;
  if (min < 1440) {
    const hours = (min / 60);
    return hours % 1 === 0 ? `${hours}h` : `${hours.toFixed(1)}h`;
  }
  const days = (min / 1440);
  return days % 1 === 0 ? `${days}d` : `${days.toFixed(1)}d`;
}

const PRESETS = [
  { label: '30m', minutes: 30 },
  { label: '1h',  minutes: 60 },
  { label: '2h',  minutes: 120 },
  { label: '4h',  minutes: 240 },
  { label: '8h',  minutes: 480 },
  { label: '1d',  minutes: 1440 },
  { label: '2d',  minutes: 2880 },
  { label: '5d',  minutes: 7200 },
];

const CARD = 'rounded-2xl p-5 mb-5 bg-white/[0.035] border border-white/[0.08]';
const BTN_PRIMARY = 'inline-flex items-center gap-1.5 px-[18px] py-[9px] rounded-xl text-[0.88rem] font-semibold text-white border-0 cursor-pointer whitespace-nowrap transition-all duration-200 hover:brightness-110 hover:-translate-y-px disabled:opacity-50 disabled:cursor-not-allowed';
const BTN_GHOST = 'inline-flex items-center gap-1.5 px-[18px] py-[9px] rounded-xl text-[0.88rem] font-semibold text-[#9898b8] cursor-pointer whitespace-nowrap bg-white/[0.035] border border-white/[0.08] hover:border-white/[0.14] hover:text-[#f0f0fa] hover:bg-white/[0.06] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed';
const BTN_WARNING = 'inline-flex items-center gap-1.5 px-[18px] py-[9px] rounded-xl text-[0.88rem] font-semibold text-white border-0 cursor-pointer whitespace-nowrap transition-all duration-200 bg-amber-600 hover:bg-amber-500 hover:-translate-y-px disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_4px_12px_rgba(245,158,11,0.25)]';
const INPUT = 'w-full rounded-xl px-3.5 py-2.5 bg-[#13131f] border border-white/[0.08] text-[#f0f0fa] text-[0.9rem] outline-none transition-all duration-200 focus:border-indigo-500 focus:bg-[#1e1e30] focus:shadow-[0_0_0_3px_rgba(99,102,241,0.15)] placeholder:text-[#5f5f7a]';

export default function AdminSLAPage() {
  const [policies, setPolicies] = useState<SLAPolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [editModal, setEditModal] = useState<SLAPolicy | null>(null);
  const [responseMin, setResponseMin] = useState(0);
  const [resolutionMin, setResolutionMin] = useState(0);
  const [saving, setSaving] = useState(false);
  const [sweepLoading, setSweepLoading] = useState(false);
  const [sweepResult, setSweepResult] = useState<number | null>(null);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const fetch = useCallback(async () => {
    try {
      const data = await listSLAPolicies();
      setPolicies(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const handleSweep = async () => {
    setSweepLoading(true);
    try {
      const res = await runSLASweep();
      setSweepResult(res.escalated);
      fetch();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message || 'Failed to run SLA sweep');
    } finally {
      setSweepLoading(false);
    }
  };

  const openEdit = (policy: SLAPolicy) => {
    setEditModal(policy);
    setResponseMin(policy.responseMinutes);
    setResolutionMin(policy.resolutionMinutes);
    setError('');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editModal) return;
    if (resolutionMin < responseMin) {
      setError(`Resolution SLA (${resolutionMin}m) must be at least the response SLA (${responseMin}m)`);
      return;
    }
    setSaving(true);
    setError('');
    try {
      const updated = await updateSLAPolicy(editModal.priority, responseMin, resolutionMin);
      setPolicies(prev => prev.map(p => p.priority === editModal.priority ? updated : p));
      setSuccess(`SLA policy for ${editModal.priority} updated to ${minutesToLabel(responseMin)} response / ${minutesToLabel(resolutionMin)} resolution.`);
      setEditModal(null);
      setTimeout(() => setSuccess(''), 4000);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string | string[] } } };
      const msg = e.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(', ') : msg || 'Failed to update policy');
    } finally { setSaving(false); }
  };

  return (
    <DashboardLayout>
      <div className="flex items-start justify-between mb-7 gap-4 flex-wrap">
        <div>
          <h1 className="text-[1.6rem] font-extrabold text-[#f0f0fa]">SLA Policies</h1>
          <p className="text-[#9898b8] text-[0.88rem] mt-0.5">
            Configure calendar-minute response and resolution deadlines per priority tier
          </p>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            id="btn-sla-sweep-page"
            className={BTN_WARNING}
            onClick={handleSweep}
            disabled={sweepLoading}
          >
            {sweepLoading ? (
              <span className="w-[18px] h-[18px] rounded-full border-[3px] border-white/20 border-t-white anim-spin" />
            ) : (
              <><Zap size={16} /> Run Escalation Sweep</>
            )}
          </button>
          <button className={BTN_GHOST} onClick={fetch}>
            <RefreshCw size={16} /> Refresh
          </button>
        </div>
      </div>

      {sweepResult !== null && (
        <div className="flex items-center justify-between px-4 py-3 rounded-xl mb-5 text-[0.88rem] text-blue-300 bg-blue-500/[0.12] border border-blue-500/30">
          <span>Escalation sweep completed: {sweepResult} ticket(s) updated.</span>
          <button
            className="bg-transparent border-none cursor-pointer text-inherit hover:opacity-75"
            onClick={() => setSweepResult(null)}
          >
            ✕
          </button>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl mb-5 text-[0.88rem] text-emerald-300 bg-emerald-500/[0.12] border border-emerald-500/30">
          <CheckCircle size={16} /> {success}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
        {loading ? (
          [...Array(4)].map((_, i) => (
            <div key={i} className="h-64 rounded-2xl anim-shimmer" />
          ))
        ) : (
          policies.map((p) => {
            const colors = PRIORITY_COLORS[p.priority] || PRIORITY_COLORS.LOW;
            const pct = Math.min(Math.round((p.responseMinutes / p.resolutionMinutes) * 100), 100);
            return (
              <div
                key={p.priority}
                className={`${CARD} flex flex-col justify-between hover:-translate-y-1 transition-all duration-200`}
                style={{ borderColor: colors.border }}
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div
                      className="px-3 py-1 rounded-full text-[0.75rem] font-extrabold uppercase tracking-wider text-white"
                      style={{ background: colors.badge }}
                    >
                      {p.priority}
                    </div>
                    <button
                      id={`edit-sla-${p.priority.toLowerCase()}`}
                      className={`${BTN_GHOST} !px-3 !py-1 text-[0.8rem]`}
                      onClick={() => openEdit(p)}
                    >
                      Edit
                    </button>
                  </div>

                  <div className="flex flex-col gap-4 my-2">
                    <div className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-indigo-500/[0.15] text-indigo-400 flex-shrink-0 mt-0.5">
                        <Zap size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[0.72rem] font-bold text-[#5f5f7a] uppercase tracking-wide">Response Target</div>
                        <div className="text-[1.2rem] font-extrabold text-[#f0f0fa]">{minutesToLabel(p.responseMinutes)}</div>
                        <div className="text-[0.75rem] text-[#5f5f7a]">{p.responseMinutes.toLocaleString()} calendar mins</div>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-purple-500/[0.15] text-purple-400 flex-shrink-0 mt-0.5">
                        <Clock size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[0.72rem] font-bold text-[#5f5f7a] uppercase tracking-wide">Resolution Target</div>
                        <div className="text-[1.2rem] font-extrabold text-[#f0f0fa]">{minutesToLabel(p.resolutionMinutes)}</div>
                        <div className="text-[0.75rem] text-[#5f5f7a]">{p.resolutionMinutes.toLocaleString()} calendar mins</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-white/[0.06]">
                  <div className="flex items-center justify-between text-[0.72rem] text-[#5f5f7a] mb-1.5 font-medium">
                    <span>Response Ratio</span>
                    <span className="font-bold text-[#f0f0fa]">{pct}%</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-white/[0.08] overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{ width: `${pct}%`, background: colors.badge }}
                    />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Edit Modal */}
      {editModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 blur-modal anim-fadein" onClick={() => setEditModal(null)}>
          <div
            className="w-full max-w-[480px] p-6 rounded-2xl bg-[#0f0f1e] border border-white/[0.12] shadow-2xl anim-slideup"
            onClick={(e) => e.stopPropagation()}
            id="sla-edit-modal"
          >
            <h3 className="flex items-center gap-2 text-[1.15rem] font-bold text-[#f0f0fa] mb-4">
              <BarChart3 size={18} className="text-indigo-400" /> Edit {editModal.priority} SLA Policy
            </h3>

            {error && (
              <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl mb-4 text-[0.82rem] text-[#fca5a5] bg-red-500/[0.12] border border-red-500/30">
                <AlertCircle size={15} className="flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSave} id="sla-form" className="flex flex-col gap-4">
              {/* Response Target */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[0.78rem] font-semibold text-[#9898b8] uppercase tracking-wide" htmlFor="response-minutes">
                    Response Target (minutes) *
                  </label>
                  <span className="text-indigo-400 font-bold text-[0.85rem]">{minutesToLabel(responseMin)}</span>
                </div>
                <input
                  id="response-minutes"
                  type="number"
                  className={INPUT}
                  value={responseMin}
                  onChange={(e) => setResponseMin(Number(e.target.value))}
                  min={1}
                  max={43200}
                  required
                />
                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                  <span className="text-[0.72rem] text-[#5f5f7a] mr-1">Presets:</span>
                  {PRESETS.slice(0, 5).map(p => (
                    <button
                      key={`resp-${p.label}`}
                      type="button"
                      className="px-2 py-0.5 rounded text-[0.72rem] font-semibold bg-white/[0.05] text-[#9898b8] hover:bg-white/[0.1] hover:text-[#f0f0fa] cursor-pointer"
                      onClick={() => setResponseMin(p.minutes)}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Resolution Target */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[0.78rem] font-semibold text-[#9898b8] uppercase tracking-wide" htmlFor="resolution-minutes">
                    Resolution Target (minutes) *
                  </label>
                  <span className="text-purple-400 font-bold text-[0.85rem]">{minutesToLabel(resolutionMin)}</span>
                </div>
                <input
                  id="resolution-minutes"
                  type="number"
                  className={INPUT}
                  value={resolutionMin}
                  onChange={(e) => setResolutionMin(Number(e.target.value))}
                  min={1}
                  max={43200}
                  required
                />
                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                  <span className="text-[0.72rem] text-[#5f5f7a] mr-1">Presets:</span>
                  {PRESETS.slice(2).map(p => (
                    <button
                      key={`res-${p.label}`}
                      type="button"
                      className="px-2 py-0.5 rounded text-[0.72rem] font-semibold bg-white/[0.05] text-[#9898b8] hover:bg-white/[0.1] hover:text-[#f0f0fa] cursor-pointer"
                      onClick={() => setResolutionMin(p.minutes)}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                <p className="text-[0.75rem] text-[#5f5f7a] mt-2">
                  Must be ≥ Response minutes ({responseMin}m). Existing active tickets retain their creation-time SLA snapshots.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 mt-4 pt-3 border-t border-white/[0.08]">
                <button type="button" className={BTN_GHOST} onClick={() => setEditModal(null)}>Cancel</button>
                <button
                  id="save-sla-btn"
                  type="submit"
                  className={BTN_PRIMARY}
                  disabled={saving}
                  style={{ background: 'linear-gradient(135deg,#6366f1,#764ba2)', boxShadow: '0 4px 12px rgba(99,102,241,0.3)' }}
                >
                  {saving ? (
                    <span className="w-[18px] h-[18px] rounded-full border-[3px] border-white/20 border-t-white anim-spin" />
                  ) : (
                    'Save Policy'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
