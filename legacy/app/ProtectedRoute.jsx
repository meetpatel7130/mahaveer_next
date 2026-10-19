import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

export default function ProtectedRoute() {
  const { user, isAuthReady } = useAuth(); // ← isAuthReady not isCheckingAuth

  // /me hasn't settled yet — show loader, never redirect
  if (!isAuthReady) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <p>Loading...</p>
      </div>
    );
  }

  // /me is done AND user is confirmed null — redirect
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}