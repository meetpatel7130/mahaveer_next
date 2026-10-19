import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

export default function RoleProtectedRoute({ allowedRoles }) {
  const { user } = useAuth();

  if (!allowedRoles.includes(user?.userType)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
}