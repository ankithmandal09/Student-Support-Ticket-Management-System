import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL;

export const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('user');
      window.location.href = '/';
    }
    return Promise.reject(err);
  }
);

// ─── Auth ────────────────────────────────────────────────────────────────────
export const authLogin = (email: string, password: string) =>
  api.post('/api/auth/login', { email, password }).then((r) => r.data);

export const authRegister = (email: string, password: string, name: string) =>
  api.post('/api/auth/register', { email, password, name }).then((r) => r.data);

export const authMe = () => api.get('/api/auth/me').then((r) => r.data);

// ─── Tickets ──────────────────────────────────────────────────────────────────
export const createTicket = (data: {
  category: string;
  subject: string;
  description: string;
  priority?: string;
}) => api.post('/api/tickets', data).then((r) => r.data);

export const listTickets = (params?: Record<string, unknown>) =>
  api.get('/api/tickets', { params }).then((r) => r.data);

export const getTicket = (id: string) =>
  api.get(`/api/tickets/${id}`).then((r) => r.data);

export const assignTicket = (id: string, assignedTo: string, assignedTeam: string) =>
  api.patch(`/api/tickets/${id}/assignment`, { assignedTo, assignedTeam }).then((r) => r.data);

export const updatePriority = (id: string, priority: string) =>
  api.patch(`/api/tickets/${id}/priority`, { priority }).then((r) => r.data);

export const updateStatus = (id: string, status: string, reason?: string) =>
  api.patch(`/api/tickets/${id}/status`, { status, reason }).then((r) => r.data);

export const resolveTicket = (id: string, resolutionNote: string, resolutionCategory: string) =>
  api.patch(`/api/tickets/${id}/resolve`, { resolutionNote, resolutionCategory }).then((r) => r.data);

export const closeTicket = (id: string) =>
  api.patch(`/api/tickets/${id}/close`).then((r) => r.data);

export const reopenTicket = (id: string, reason: string) =>
  api.patch(`/api/tickets/${id}/reopen`, { reason }).then((r) => r.data);

export const cancelTicket = (id: string, reason: string) =>
  api.patch(`/api/tickets/${id}/cancel`, { reason }).then((r) => r.data);

// ─── Comments ────────────────────────────────────────────────────────────────
export const addComment = (ticketId: string, message: string, internal = false) =>
  api.post(`/api/tickets/${ticketId}/comments`, { message, internal }).then((r) => r.data);

export const listComments = (ticketId: string, params?: Record<string, unknown>) =>
  api.get(`/api/tickets/${ticketId}/comments`, { params }).then((r) => r.data);

// ─── Activities ──────────────────────────────────────────────────────────────
export const listActivities = (ticketId: string, params?: Record<string, unknown>) =>
  api.get(`/api/tickets/${ticketId}/activities`, { params }).then((r) => r.data);

// ─── Users ───────────────────────────────────────────────────────────────────
export const listUsers = (params?: Record<string, unknown>) =>
  api.get('/api/users', { params }).then((r) => r.data);

export const createUser = (data: {
  email: string;
  password: string;
  name: string;
  role: string;
  department?: string;
}) => api.post('/api/users', data).then((r) => r.data);

export const toggleUserActive = (id: string, isActive: boolean) =>
  api.patch(`/api/users/${id}/active`, { isActive }).then((r) => r.data);

// ─── SLA ─────────────────────────────────────────────────────────────────────
export const listSLAPolicies = () =>
  api.get('/api/sla/policies').then((r) => r.data);

export const updateSLAPolicy = (priority: string, responseMinutes: number, resolutionMinutes: number) =>
  api.patch(`/api/sla/policies/${priority}`, { responseMinutes, resolutionMinutes }).then((r) => r.data);

export const runSLASweep = () =>
  api.post('/api/sla/escalations/run').then((r) => r.data);

// ─── Dashboard ───────────────────────────────────────────────────────────────
export const getDashboard = () =>
  api.get('/api/dashboard').then((r) => r.data);
