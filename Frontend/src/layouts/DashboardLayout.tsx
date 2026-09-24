import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Ticket, Users, Shield, Settings, LogOut,
  GraduationCap, Bell, ChevronRight, BarChart3,
} from 'lucide-react';

interface SidebarLink { to: string; icon: React.ReactNode; label: string; id: string; }
interface Props { children: React.ReactNode; }

/* reusable sidebar link class */
const LINK_BASE =
  'flex items-center gap-2.5 py-[9px] px-3 rounded-xl text-[0.88rem] font-medium no-underline truncate transition-all duration-200 text-[#9898b8] hover:text-[#f0f0fa] hover:bg-white/[0.06]';

const STUDENT_LINKS: SidebarLink[] = [
  { to: '/student',           icon: <LayoutDashboard size={18} />, label: 'Dashboard',  id: 'nav-student-dashboard' },
  { to: '/student/tickets',   icon: <Ticket size={18} />,          label: 'My Tickets', id: 'nav-student-tickets'   },
  { to: '/student/new-ticket',icon: <ChevronRight size={18} />,    label: 'New Ticket', id: 'nav-student-new'        },
];
const STAFF_LINKS: SidebarLink[] = [
  { to: '/staff',          icon: <LayoutDashboard size={18} />, label: 'Dashboard',  id: 'nav-staff-dashboard' },
  { to: '/staff/tickets',  icon: <Ticket size={18} />,          label: 'All Tickets',id: 'nav-staff-tickets'   },
  { to: '/staff/assigned', icon: <Users size={18} />,           label: 'My Assigned',id: 'nav-staff-assigned'  },
];
const ADMIN_LINKS: SidebarLink[] = [
  { to: '/admin',         icon: <LayoutDashboard size={18} />, label: 'Dashboard',   id: 'nav-admin-dashboard' },
  { to: '/admin/tickets', icon: <Ticket size={18} />,          label: 'All Tickets', id: 'nav-admin-tickets'   },
  { to: '/admin/users',   icon: <Users size={18} />,           label: 'Users',       id: 'nav-admin-users'     },
  { to: '/admin/sla',     icon: <BarChart3 size={18} />,       label: 'SLA Policies',id: 'nav-admin-sla'       },
];

const ROLE_COLORS = {
  STUDENT: { gradient: 'linear-gradient(135deg,#667eea,#764ba2)' },
  STAFF:   { gradient: 'linear-gradient(135deg,#11998e,#38ef7d)' },
  ADMIN:   { gradient: 'linear-gradient(135deg,#f093fb,#f5576c)' },
};

export function DashboardLayout({ children }: Props) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  if (!user) return null;

  const links = user.role === 'ADMIN' ? ADMIN_LINKS : user.role === 'STAFF' ? STAFF_LINKS : STUDENT_LINKS;
  const roleGradient = ROLE_COLORS[user.role].gradient;
  const handleLogout = () => { logout(); navigate('/'); };
  const RoleIcon = user.role === 'ADMIN' ? Shield : user.role === 'STAFF' ? Users : GraduationCap;

  return (
    <div className="flex min-h-screen bg-[#080812]">
      {/* ── Sidebar ── */}
      <aside
        className="w-sidebar min-h-screen flex flex-col fixed top-0 left-0 bottom-0 z-[100] blur-sidebar"
        style={{ background: 'rgba(8,8,20,0.98)', borderRight: '1px solid rgba(255,255,255,0.08)' }}
      >
        {/* Logo */}
        <div className="px-4 pt-5 pb-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div className="flex items-center gap-2.5 text-base font-extrabold grad-logo">
            <GraduationCap size={22} />
            <span>EduMerge</span>
          </div>
        </div>

        {/* User info */}
        <div className="flex items-center gap-3 p-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
          <div
            className="w-[38px] h-[38px] rounded-[10px] flex items-center justify-center text-base font-extrabold text-white flex-shrink-0"
            style={{ background: roleGradient }}
          >
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="text-[0.88rem] font-semibold text-[#f0f0fa] truncate">{user.name}</div>
            <div className="flex items-center gap-1 text-[0.72rem] text-[#5f5f7a] uppercase tracking-[0.04em]">
              <RoleIcon size={11} /> <span>{user.role}</span>
            </div>
          </div>
        </div>

        {/* Nav links */}
        <nav className="flex-1 px-2 py-3 flex flex-col gap-0.5 overflow-y-auto">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              id={link.id}
              end={link.to === '/student' || link.to === '/staff' || link.to === '/admin'}
              className={({ isActive }) =>
                isActive ? LINK_BASE + ' nav-active text-[#f0f0fa]' : LINK_BASE
              }
            >
              {link.icon}
              <span>{link.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-2 flex flex-col gap-0.5" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <button
            id="nav-notifications"
            className={LINK_BASE + ' w-full bg-transparent border-none cursor-pointer text-left'}
          >
            <Bell size={18} /> <span>Notifications</span>
          </button>
          {user.role === 'ADMIN' && (
            <NavLink to="/admin/settings" id="nav-settings" className={LINK_BASE}>
              <Settings size={18} /> <span>Settings</span>
            </NavLink>
          )}
          <button
            id="nav-logout"
            onClick={handleLogout}
            className={LINK_BASE + ' w-full bg-transparent border-none cursor-pointer text-left hover:!text-[#fca5a5] hover:!bg-red-500/[0.10]'}
          >
            <LogOut size={18} /> <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className="flex-1 min-h-screen bg-[#0f0f1e] ml-sidebar">
        <div className="p-8 max-w-[1400px] mx-auto">{children}</div>
      </main>
    </div>
  );
}
