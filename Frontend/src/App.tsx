import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';

// Student pages
import StudentDashboard from './pages/student/StudentDashboard';
import StudentTicketsPage from './pages/student/StudentTicketsPage';
import NewTicketPage from './pages/student/NewTicketPage';
import TicketDetailPage from './pages/student/TicketDetailPage';

// Staff pages
import StaffDashboard from './pages/staff/StaffDashboard';
import StaffTicketsPage from './pages/staff/StaffTicketsPage';
import StaffTicketDetail from './pages/staff/StaffTicketDetail';

// Admin pages
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminTicketsPage from './pages/admin/AdminTicketsPage';
import AdminUsersPage from './pages/admin/AdminUsersPage';
import AdminSLAPage from './pages/admin/AdminSLAPage';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/" element={<LoginPage />} />

          {/* Student routes */}
          <Route element={<ProtectedRoute allowedRoles={['STUDENT']} />}>
            <Route path="/student" element={<StudentDashboard />} />
            <Route path="/student/tickets" element={<StudentTicketsPage />} />
            <Route path="/student/tickets/:id" element={<TicketDetailPage />} />
            <Route path="/student/new-ticket" element={<NewTicketPage />} />
          </Route>

          {/* Staff routes */}
          <Route element={<ProtectedRoute allowedRoles={['STAFF']} />}>
            <Route path="/staff" element={<StaffDashboard />} />
            <Route path="/staff/tickets" element={<StaffTicketsPage />} />
            <Route path="/staff/assigned" element={<StaffTicketsPage assignedOnly />} />
            <Route path="/staff/tickets/:id" element={<StaffTicketDetail />} />
          </Route>

          {/* Admin routes */}
          <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/tickets" element={<AdminTicketsPage />} />
            <Route path="/admin/tickets/:id" element={<StaffTicketDetail />} />
            <Route path="/admin/users" element={<AdminUsersPage />} />
            <Route path="/admin/sla" element={<AdminSLAPage />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
