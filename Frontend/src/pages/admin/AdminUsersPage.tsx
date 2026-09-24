import React, { useState, useEffect, useCallback } from 'react';
import { DashboardLayout } from '../../layouts/DashboardLayout';
import { listUsers, createUser, toggleUserActive } from '../../lib/api';
import { Users, Plus, UserCheck, UserX, Search, AlertCircle } from 'lucide-react';

interface UserItem {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string | null;
  isActive: boolean;
  createdAt: string;
}

const ROLES = ['STUDENT', 'STAFF', 'ADMIN'];

const TH = 'py-2 px-3 text-left text-[0.72rem] font-bold uppercase tracking-[0.06em] text-[#5f5f7a] whitespace-nowrap border-b border-white/[0.08]';
const TD = 'py-3 px-3 border-b border-white/[0.04]';
const BTN_PRIMARY = 'inline-flex items-center gap-1.5 px-[18px] py-[9px] rounded-xl text-[0.88rem] font-semibold text-white border-0 cursor-pointer whitespace-nowrap transition-all duration-200 hover:brightness-110 hover:-translate-y-px disabled:opacity-50 disabled:cursor-not-allowed';
const BTN_GHOST = 'inline-flex items-center gap-1.5 px-[18px] py-[9px] rounded-xl text-[0.88rem] font-semibold text-[#9898b8] cursor-pointer whitespace-nowrap bg-white/[0.035] border border-white/[0.08] hover:border-white/[0.14] hover:text-[#f0f0fa] hover:bg-white/[0.06] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed';
const INPUT = 'w-full rounded-xl px-3.5 py-2.5 bg-[#13131f] border border-white/[0.08] text-[#f0f0fa] text-[0.9rem] outline-none transition-all duration-200 focus:border-indigo-500 focus:bg-[#1e1e30] focus:shadow-[0_0_0_3px_rgba(99,102,241,0.15)] placeholder:text-[#5f5f7a]';
const SELECT = 'w-full rounded-xl py-2.5 pl-3.5 pr-8 bg-[#13131f] border border-white/[0.08] text-[#f0f0fa] text-[0.9rem] outline-none cursor-pointer focus:border-indigo-500 transition-all duration-200 sel';
const INPUT_SEARCH = 'w-full pl-9 pr-3.5 py-2 rounded-xl bg-white/[0.035] border border-white/[0.08] text-[#f0f0fa] text-[0.88rem] outline-none placeholder:text-[#5f5f7a] focus:border-indigo-500 transition-all duration-200';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Create form
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('STUDENT');
  const [newDept, setNewDept] = useState('');

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listUsers({ page, limit: 20 });
      setUsers(data.items);
      setTotal(data.total);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [page]);

  useEffect(() => { fetch(); }, [fetch]);

  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setError('');
    try {
      await createUser({ email: newEmail, password: newPassword, name: newName, role: newRole, department: newDept || undefined });
      setShowModal(false);
      setNewEmail(''); setNewPassword(''); setNewName(''); setNewRole('STUDENT'); setNewDept('');
      fetch();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string | string[] } } };
      const msg = e.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(', ') : msg || 'Failed to create user');
    } finally { setActionLoading(false); }
  };

  const handleToggleActive = async (user: UserItem) => {
    try {
      await toggleUserActive(user.id, !user.isActive);
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, isActive: !u.isActive } : u));
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      alert(e.response?.data?.message || 'Failed to toggle user status');
    }
  };

  const totalPages = Math.ceil(total / 20);

  const roleColor = (role: string) => role === 'ADMIN' ? '#f093fb' : role === 'STAFF' ? '#38ef7d' : '#667eea';

  return (
    <DashboardLayout>
      <div className="flex items-start justify-between mb-7 gap-4 flex-wrap">
        <div>
          <h1 className="text-[1.6rem] font-extrabold text-[#f0f0fa]">User Management</h1>
          <p className="text-[#9898b8] text-[0.88rem] mt-0.5">{total} users total</p>
        </div>
        <button
          id="btn-create-user"
          className={BTN_PRIMARY}
          onClick={() => setShowModal(true)}
          style={{ background: 'linear-gradient(135deg,#6366f1,#764ba2)', boxShadow: '0 4px 12px rgba(99,102,241,0.3)' }}
        >
          <Plus size={16} /> Create User
        </button>
      </div>

      <div className="flex items-center gap-3 mb-5 max-w-md">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5f5f7a] pointer-events-none" />
          <input
            id="user-search"
            className={INPUT_SEARCH}
            placeholder="Search users…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="rounded-2xl p-5 mb-5 bg-white/[0.035] border border-white/[0.08]">
        {loading ? (
          <div className="flex flex-col gap-2.5 p-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-10 rounded-lg anim-shimmer" />
            ))}
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="flex flex-col items-center gap-3.5 py-[60px] text-[#5f5f7a] text-center">
            <Users size={48} />
            <h3 className="text-[#9898b8]">No users found</h3>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left tbl">
              <thead>
                <tr>
                  <th className={TH}>Name</th>
                  <th className={TH}>Email</th>
                  <th className={TH}>Role</th>
                  <th className={TH}>Department</th>
                  <th className={TH}>Status</th>
                  <th className={TH}>Created</th>
                  <th className={TH}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u) => (
                  <tr key={u.id} id={`user-row-${u.id}`} className="transition-colors duration-150 hover:bg-white/[0.04]">
                    <td className={`${TD} font-semibold text-[#f0f0fa]`}>{u.name}</td>
                    <td className={`${TD} text-[#9898b8] text-[0.88rem]`}>{u.email}</td>
                    <td className={TD}>
                      <span
                        className="inline-flex px-2.5 py-[3px] rounded-md text-[0.72rem] font-bold uppercase tracking-wider border"
                        style={{ color: roleColor(u.role), borderColor: `${roleColor(u.role)}40`, background: `${roleColor(u.role)}15` }}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className={`${TD} text-[#9898b8] text-[0.85rem]`}>{u.department ?? '—'}</td>
                    <td className={TD}>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[0.72rem] font-bold uppercase ${
                        u.isActive
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
                      }`}>
                        {u.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className={`${TD} text-[#5f5f7a] text-[0.82rem] whitespace-nowrap`}>
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td className={TD}>
                      <button
                        id={`toggle-user-${u.id}`}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[0.78rem] font-semibold transition-colors cursor-pointer ${
                          u.isActive
                            ? 'bg-red-500/15 text-red-400 hover:bg-red-500/25 border border-red-500/30'
                            : 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/30'
                        }`}
                        onClick={() => handleToggleActive(u)}
                        title={u.isActive ? 'Deactivate' : 'Activate'}
                      >
                        {u.isActive ? <UserX size={14} /> : <UserCheck size={14} />}
                        {u.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/[0.08]">
            <button id="users-prev" disabled={page === 1} onClick={() => setPage(p => p - 1)} className={BTN_GHOST}>← Prev</button>
            <span className="text-[0.85rem] text-[#9898b8]">Page {page} of {totalPages}</span>
            <button id="users-next" disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className={BTN_GHOST}>Next →</button>
          </div>
        )}
      </div>

      {/* Create User Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 blur-modal anim-fadein" onClick={() => setShowModal(false)}>
          <div
            className="w-full max-w-[560px] p-6 rounded-2xl bg-[#0f0f1e] border border-white/[0.12] shadow-2xl anim-slideup"
            onClick={(e) => e.stopPropagation()}
            id="create-user-modal"
          >
            <h3 className="text-[1.15rem] font-bold text-[#f0f0fa] mb-4">👤 Create User</h3>
            {error && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl mb-4 text-[0.82rem] text-[#fca5a5] bg-red-500/[0.12] border border-red-500/30">
                <AlertCircle size={14} /> {error}
              </div>
            )}
            <form onSubmit={handleCreate} id="create-user-form" className="flex flex-col gap-3.5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[0.78rem] font-semibold text-[#9898b8] mb-1.5 uppercase tracking-wide" htmlFor="new-user-name">Full Name *</label>
                  <input id="new-user-name" className={INPUT} value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="John Doe" required minLength={2} maxLength={100} />
                </div>
                <div>
                  <label className="block text-[0.78rem] font-semibold text-[#9898b8] mb-1.5 uppercase tracking-wide" htmlFor="new-user-role">Role *</label>
                  <select id="new-user-role" className={SELECT} value={newRole} onChange={(e) => setNewRole(e.target.value)}>
                    {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[0.78rem] font-semibold text-[#9898b8] mb-1.5 uppercase tracking-wide" htmlFor="new-user-email">Email *</label>
                  <input id="new-user-email" className={INPUT} type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="user@college.edu" required />
                </div>
                <div>
                  <label className="block text-[0.78rem] font-semibold text-[#9898b8] mb-1.5 uppercase tracking-wide" htmlFor="new-user-dept">Department</label>
                  <input id="new-user-dept" className={INPUT} value={newDept} onChange={(e) => setNewDept(e.target.value)} placeholder="Administration" maxLength={100} />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[0.78rem] font-semibold text-[#9898b8] mb-1.5 uppercase tracking-wide" htmlFor="new-user-password">Password *</label>
                  <input id="new-user-password" className={INPUT} type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Min 10 characters" required minLength={10} maxLength={128} />
                </div>
              </div>
              <div className="flex items-center justify-end gap-3 mt-4 pt-3 border-t border-white/[0.08]">
                <button type="button" className={BTN_GHOST} onClick={() => setShowModal(false)}>Cancel</button>
                <button
                  id="create-user-submit"
                  type="submit"
                  className={BTN_PRIMARY}
                  disabled={actionLoading}
                  style={{ background: 'linear-gradient(135deg,#6366f1,#764ba2)', boxShadow: '0 4px 12px rgba(99,102,241,0.3)' }}
                >
                  {actionLoading ? <span className="w-[18px] h-[18px] rounded-full border-[3px] border-white/20 border-t-white anim-spin" /> : <><Plus size={14} /> Create</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
