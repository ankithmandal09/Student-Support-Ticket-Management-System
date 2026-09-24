import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, Shield, Users, Eye, EyeOff, LogIn, UserPlus, ArrowLeft, Building2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { authLogin, authRegister, authRegisterUser } from '../lib/api';

type RoleStep = 'select' | 'login' | 'register';

const ROLE_CONFIG = {
  STUDENT: {
    icon: GraduationCap,
    label: 'Student',
    gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    description: 'Submit and track your support requests',
    placeholder: 'student@college.edu',
  },
  STAFF: {
    icon: Users,
    label: 'Support Staff',
    gradient: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
    description: 'Manage and resolve student tickets',
    placeholder: 'staff@college.edu',
  },
  ADMIN: {
    icon: Shield,
    label: 'Administrator',
    gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    description: 'Full system access and configuration',
    placeholder: 'admin@college.edu',
  },
};

/* ── reusable class strings ── */
const INPUT =
  'w-full rounded-xl px-3.5 py-2.5 bg-[#13131f] border border-white/[0.08] text-[#f0f0fa] text-[0.9rem] outline-none transition-all duration-200 focus:border-indigo-500 focus:bg-[#1e1e30] focus:shadow-[0_0_0_3px_rgba(99,102,241,0.15)] placeholder:text-[#5f5f7a]';

export default function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [step, setStep] = useState<RoleStep>('select');
  const [selectedRole, setSelectedRole] = useState<'STUDENT' | 'STAFF' | 'ADMIN'>('STUDENT');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRoleSelect = (role: 'STUDENT' | 'STAFF' | 'ADMIN') => {
    setSelectedRole(role);
    setStep('login');
    setError('');
    setEmail('');
    setPassword('');
    setName('');
    setDepartment('');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await authLogin(email, password);
      login(res.accessToken, res.user);
      const r = res.user.role;
      navigate(r === 'ADMIN' ? '/admin' : r === 'STAFF' ? '/staff' : '/student');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message || 'Invalid credentials. Please check your email and password.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (selectedRole === 'STUDENT') {
        // Direct student registration endpoint
        const res = await authRegister(email, password, name);
        login(res.accessToken, res.user);
        navigate('/student');
      } else {
        // Staff or Admin registration via /api/auth/users
        await authRegisterUser({
          email,
          password,
          name,
          role: selectedRole,
          department: department.trim() || undefined,
        });

        // Automatically sign in the registered staff/admin
        const res = await authLogin(email, password);
        login(res.accessToken, res.user);
        navigate(selectedRole === 'ADMIN' ? '/admin' : '/staff');
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string | string[] } } };
      const msg = e.response?.data?.message;
      setError(Array.isArray(msg) ? msg.join(', ') : msg || 'Registration failed. Please check the inputs.');
    } finally {
      setLoading(false);
    }
  };

  const cfg = ROLE_CONFIG[selectedRole];
  const Icon = cfg.icon;

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#080812] relative overflow-hidden p-6">
      {/* Animated background orbs */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute w-[600px] h-[600px] rounded-full orb-1" />
        <div className="absolute w-[500px] h-[500px] rounded-full orb-2" />
        <div className="absolute w-[400px] h-[400px] rounded-full orb-3" />
      </div>

      <div className="relative z-10 w-full max-w-[480px] flex flex-col items-center gap-6">
        {/* Header */}
        <div className="text-center">
          <div
            className="w-[68px] h-[68px] rounded-[20px] flex items-center justify-center mx-auto mb-4 text-white"
            style={{ background: 'linear-gradient(135deg,#667eea,#764ba2)', boxShadow: '0 8px 32px rgba(102,126,234,0.4)' }}
          >
            <GraduationCap size={36} />
          </div>
          <h1 className="text-[1.9rem] font-extrabold grad-text">EduMerge Support</h1>
          <p className="text-[#9898b8] text-[0.9rem] mt-1">Student Support &amp; Ticket Management</p>
        </div>

        {/* Card */}
        <div
          className="w-full rounded-[22px] p-8 blur-card"
          style={{ background: 'rgba(15,15,30,0.85)', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 8px 48px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.03) inset' }}
        >
          {/* ── Role selection ── */}
          {step === 'select' && (
            <div>
              <h2 className="text-[1.35rem] font-bold text-center mb-1.5 text-[#f0f0fa]">Who are you?</h2>
              <p className="text-center text-[#9898b8] text-[0.9rem] mb-6">Choose your role to continue</p>
              <div className="flex flex-col gap-3">
                {(Object.entries(ROLE_CONFIG) as [keyof typeof ROLE_CONFIG, typeof ROLE_CONFIG['STUDENT']][]).map(([role, config]) => {
                  const RoleIcon = config.icon;
                  return (
                    <button
                      key={role}
                      id={`role-btn-${role.toLowerCase()}`}
                      className="role-card flex items-center gap-3.5 w-full p-5 rounded-2xl cursor-pointer text-left text-[#f0f0fa] transition-all duration-200 hover:-translate-y-0.5"
                      style={{ '--role-gradient': config.gradient, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' } as React.CSSProperties}
                      onClick={() => handleRoleSelect(role)}
                    >
                      <div
                        className="w-[52px] h-[52px] min-w-[52px] rounded-[14px] flex items-center justify-center text-white flex-shrink-0 relative z-10"
                        style={{ background: config.gradient, boxShadow: '0 4px 16px rgba(0,0,0,0.3)' }}
                      >
                        <RoleIcon size={28} />
                      </div>
                      <div className="flex-1 min-w-0 overflow-hidden relative z-10">
                        <div className="font-bold text-base truncate">{config.label}</div>
                        <div className="text-[#9898b8] text-[0.82rem] mt-0.5 truncate">{config.description}</div>
                      </div>
                      <span className="text-[#5f5f7a] text-xl flex-shrink-0 relative z-10">→</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Auth form ── */}
          {(step === 'login' || step === 'register') && (
            <div className="flex flex-col gap-5">
              {/* Back */}
              <button
                className="flex items-center gap-1.5 bg-transparent border-0 text-[#9898b8] hover:text-[#f0f0fa] cursor-pointer text-[0.85rem] p-0 transition-colors duration-200"
                onClick={() => { setStep('select'); setError(''); }}
              >
                <ArrowLeft size={16} /> Back to roles
              </button>

              {/* Role badge */}
              <div
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-white text-[0.85rem] font-semibold w-fit"
                style={{ background: cfg.gradient, boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}
              >
                <Icon size={18} /> <span>{cfg.label}</span>
              </div>

              {/* Login/Register tabs for all roles */}
              <div
                className="flex rounded-xl p-1 gap-1"
                style={{ background: '#13131f', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                {(['login', 'register'] as const).map((t) => (
                  <button
                    key={t}
                    id={`tab-${t}`}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-[10px] border-0 cursor-pointer text-[0.85rem] font-medium transition-all duration-200 ${
                      step === t
                        ? 'text-[#f0f0fa] bg-white/[0.08] shadow-md'
                        : 'bg-transparent text-[#9898b8] hover:text-[#f0f0fa]'
                    }`}
                    onClick={() => { setStep(t); setError(''); }}
                  >
                    {t === 'login' ? <><LogIn size={14} /> Sign In</> : <><UserPlus size={14} /> Register</>}
                  </button>
                ))}
              </div>

              {/* Error alert */}
              {error && (
                <div
                  className="rounded-xl p-3 text-[#fca5a5] text-[0.85rem]"
                  style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)' }}
                  role="alert"
                >
                  ⚠ {error}
                </div>
              )}

              {/* Login form */}
              {step === 'login' && (
                <form className="flex flex-col gap-4" onSubmit={handleLogin} id="login-form">
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="login-email" className="text-[0.82rem] font-semibold text-[#9898b8] uppercase tracking-[0.06em]">Email</label>
                    <input id="login-email" type="email" placeholder={cfg.placeholder} value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus className={INPUT} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="login-password" className="text-[0.82rem] font-semibold text-[#9898b8] uppercase tracking-[0.06em]">Password</label>
                    <div className="relative">
                      <input id="login-password" type={showPassword ? 'text' : 'password'} placeholder="••••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required className={INPUT + ' pr-[42px]'} />
                      <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 bg-transparent border-0 text-[#5f5f7a] hover:text-[#f0f0fa] cursor-pointer flex items-center transition-colors duration-200" onClick={() => setShowPassword(p => !p)}>
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                  <button id="login-submit" type="submit" disabled={loading}
                    className="flex items-center justify-center gap-2 py-3 rounded-xl border-0 text-white text-[0.95rem] font-semibold cursor-pointer w-full hover:brightness-110 hover:-translate-y-px transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
                    style={{ background: cfg.gradient, boxShadow: '0 4px 16px rgba(0,0,0,0.3)' }}
                  >
                    {loading ? <span className="w-[18px] h-[18px] rounded-full border-[3px] border-white/20 border-t-white anim-spin" /> : <><LogIn size={16} /> Sign In as {cfg.label}</>}
                  </button>
                </form>
              )}

              {/* Register form (available for STUDENT, STAFF, and ADMIN) */}
              {step === 'register' && (
                <form className="flex flex-col gap-4" onSubmit={handleRegister} id="register-form">
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="reg-name" className="text-[0.82rem] font-semibold text-[#9898b8] uppercase tracking-[0.06em]">Full Name *</label>
                    <input id="reg-name" type="text" placeholder="Your full name" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} maxLength={100} autoFocus className={INPUT} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="reg-email" className="text-[0.82rem] font-semibold text-[#9898b8] uppercase tracking-[0.06em]">Email *</label>
                    <input id="reg-email" type="email" placeholder={cfg.placeholder} value={email} onChange={(e) => setEmail(e.target.value)} required className={INPUT} />
                  </div>

                  {(selectedRole === 'STAFF' || selectedRole === 'ADMIN') && (
                    <div className="flex flex-col gap-1.5">
                      <label htmlFor="reg-department" className="flex items-center gap-1 text-[0.82rem] font-semibold text-[#9898b8] uppercase tracking-[0.06em]">
                        <Building2 size={13} /> Department <span className="text-[#5f5f7a] text-[0.75rem] font-normal lowercase">(optional)</span>
                      </label>
                      <input
                        id="reg-department"
                        type="text"
                        placeholder="e.g. IT Support, Student Affairs, Finance"
                        value={department}
                        onChange={(e) => setDepartment(e.target.value)}
                        maxLength={100}
                        className={INPUT}
                      />
                    </div>
                  )}

                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="reg-password" className="text-[0.82rem] font-semibold text-[#9898b8] uppercase tracking-[0.06em]">Password *</label>
                    <div className="relative">
                      <input id="reg-password" type={showPassword ? 'text' : 'password'} placeholder="Min 8 characters" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} maxLength={128} className={INPUT + ' pr-[42px]'} />
                      <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 bg-transparent border-0 text-[#5f5f7a] hover:text-[#f0f0fa] cursor-pointer flex items-center transition-colors duration-200" onClick={() => setShowPassword(p => !p)}>
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <button id="register-submit" type="submit" disabled={loading}
                    className="flex items-center justify-center gap-2 py-3 rounded-xl border-0 text-white text-[0.95rem] font-semibold cursor-pointer w-full hover:brightness-110 hover:-translate-y-px transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
                    style={{ background: cfg.gradient, boxShadow: '0 4px 16px rgba(0,0,0,0.3)' }}
                  >
                    {loading ? <span className="w-[18px] h-[18px] rounded-full border-[3px] border-white/20 border-t-white anim-spin" /> : <><UserPlus size={16} /> Register as {cfg.label}</>}
                  </button>
                </form>
              )}
            </div>
          )}
        </div>

        <p className="text-[#5f5f7a] text-[0.8rem] text-center">© 2026 EduMerge · Student Support System</p>
      </div>
    </div>
  );
}
