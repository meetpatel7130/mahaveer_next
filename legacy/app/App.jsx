import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Toaster } from 'sonner';

import { ThemeProvider }  from './context/ThemeContext';
import { AuthProvider }   from './context/AuthContext';

import ProtectedRoute     from './ProtectedRoute';
import RoleProtectedRoute from './RoleProtectedRoute';
import DataLayout         from './DataLayout';

import AdminDashboard       from './components/AdminDashboard';
import SalespersonDashboard from './components/SalespersonDashboard';
import Login                from './components/Login';
import NotFound             from './NotFound';
import Unauthorized         from './Unauthorized';

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <Toaster position="top-right" richColors expand={false} duration={3000} />

          <Routes>
            {/* ── Public Routes (no API calls here) ───────── */}
            <Route path="*"             element={<NotFound />} />
            <Route path="/"             element={<Login />} />
            <Route path="/login"        element={<Login />} />
            <Route path="/unauthorized" element={<Unauthorized />} />

            <Route element={<ProtectedRoute />}>
              <Route element={<DataLayout />}>

                {/* ADMIN */}
                <Route element={<RoleProtectedRoute allowedRoles={['admin']} />}>
                  <Route path="/admindashboard" element={<AdminDashboard />} />
                </Route>

                {/* SALES */}
                <Route element={<RoleProtectedRoute allowedRoles={['sales']} />}>
                  <Route path="/salesdashboard" element={<SalespersonDashboard />} />
                </Route>

              </Route>
            </Route>
          </Routes>

        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}