import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider, useAuth } from './contexts/AuthContext.jsx';
import { ToastProvider } from './components/ui/Toast.jsx';

// Auth pages
import Login from './pages/auth/Login.jsx';
import Signup from './pages/auth/Signup.jsx';
import PendingApproval from './pages/auth/PendingApproval.jsx';
import Unauthorized from './pages/auth/Unauthorized.jsx';
import NotFound from './pages/auth/NotFound.jsx';

// Layouts
import AdminLayout from './components/layout/AdminLayout.jsx';
import EmployeeLayout from './components/layout/EmployeeLayout.jsx';

// Admin pages
import AdminDashboard from './pages/admin/AdminDashboard.jsx';
import EmployeeManagement from './pages/admin/EmployeeManagement.jsx';
import EmployeeEdit from './pages/admin/EmployeeEdit.jsx';
import EmployeeDetail from './pages/admin/EmployeeDetail.jsx';
import StoreManagement from './pages/admin/StoreManagement.jsx';
import ProductManagement from './pages/admin/ProductManagement.jsx';
import SessionList from './pages/admin/SessionList.jsx';
import SessionDetail from './pages/admin/SessionDetail.jsx';
import VisitList from './pages/admin/VisitList.jsx';
import VisitDetail from './pages/admin/VisitDetail.jsx';
import Reports from './pages/admin/Reports.jsx';
import AuditLogs from './pages/admin/AuditLogs.jsx';
import Settings from './pages/admin/Settings.jsx';
import AdminProfile from './pages/admin/AdminProfile.jsx';

// Employee pages
import EmployeeDashboard from './pages/employee/EmployeeDashboard.jsx';
import ActiveSessionMap from './pages/employee/ActiveSessionMap.jsx';
import RecordVisit from './pages/employee/RecordVisit.jsx';
import EmployeeVisits from './pages/employee/EmployeeVisits.jsx';
import EmployeeVisitDetail from './pages/employee/VisitDetail.jsx';
import AttendanceHistory from './pages/employee/AttendanceHistory.jsx';
import EmployeeSessionDetail from './pages/employee/SessionDetail.jsx';
import EmployeeProfile from './pages/employee/EmployeeProfile.jsx';
import ChangePassword from './pages/employee/ChangePassword.jsx';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-700"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/pending-approval" element={<PendingApproval />} />
      <Route path="/unauthorized" element={<Unauthorized />} />

      {/* Admin routes */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute roles={['admin']}>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="employees" element={<EmployeeManagement />} />
        <Route path="employees/new" element={<EmployeeEdit />} />
        <Route path="employees/:id" element={<EmployeeDetail />} />
        <Route path="employees/:id/edit" element={<EmployeeEdit />} />
        <Route path="stores" element={<StoreManagement />} />
        <Route path="products" element={<ProductManagement />} />
        <Route path="sessions" element={<SessionList />} />
        <Route path="sessions/:id" element={<SessionDetail />} />
        <Route path="visits" element={<VisitList />} />
        <Route path="visits/:id" element={<VisitDetail />} />
        <Route path="reports" element={<Reports />} />
        <Route path="audit-logs" element={<AuditLogs />} />
        <Route path="settings" element={<Settings />} />
        <Route path="profile" element={<AdminProfile />} />
      </Route>

      {/* Employee routes */}
      <Route
        path="/app"
        element={
          <ProtectedRoute roles={['employee']}>
            <EmployeeLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<EmployeeDashboard />} />
        <Route path="map" element={<ActiveSessionMap />} />
        <Route path="visits/new" element={<RecordVisit />} />
        <Route path="visits" element={<EmployeeVisits />} />
        <Route path="visits/:id" element={<EmployeeVisitDetail />} />
        <Route path="attendance" element={<AttendanceHistory />} />
        <Route path="attendance/:id" element={<EmployeeSessionDetail />} />
        <Route path="profile" element={<EmployeeProfile />} />
        <Route path="change-password" element={<ChangePassword />} />
      </Route>

      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID || 'not-configured'}>
      <BrowserRouter>
        <ToastProvider>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </ToastProvider>
      </BrowserRouter>
    </GoogleOAuthProvider>
  );
}
