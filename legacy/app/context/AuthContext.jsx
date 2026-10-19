import { createContext, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useGetLoggedUser, useLogin as useLoginMutation, useLogout as useLogoutMutation } from '../../hooks/useAuth';

const AuthContext = createContext(undefined);

export function AuthProvider({ children }) {
  const [user, setUser]               = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false); // ← key fix
  const [loginError,  setLoginError]  = useState(''); 
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isSuccess, isError } = useGetLoggedUser();

  // runs AFTER /me succeeds — set user first, then mark ready
  useEffect(() => {
    if (isSuccess) {
      setUser(data?.user || data?.data?.user || null);
      setIsAuthReady(true); // ← only now allow ProtectedRoute to decide
    }
  }, [isSuccess, data]);

  // runs AFTER /me fails — clear user, then mark ready
  useEffect(() => {
    if (isError) {
      setUser(null);
      setIsAuthReady(true); // ← session gone, allow redirect
    }
  }, [isError]);

  // ── Login ─────────────────────────────────────────────────────────────────
  const { mutate: loginMutate, isPending: isLoggingIn } = useLoginMutation({
    onSuccess: (data) => {
      // The API client returns response.data directly: { success, user }.
      // Keep the nested fallback for callers/environments that wrap responses.
      const loggedInUser = data?.user || data?.data?.user;
      if (!loggedInUser) {
        setLoginError('Login succeeded, but the server did not return user details. Please try again.');
        return;
      }

      setUser(loggedInUser || null);
      queryClient.setQueryData(['authMe'], { success: true, user: loggedInUser });
      navigate(loggedInUser?.userType === 'admin' ? '/admindashboard' : '/salesdashboard', { replace: true });
    },
    onError: (err) => {
      // ── Extract the most useful message from the error ──────────────────
      const msg =
        err?.response?.data?.message ||   // backend JSON { message: '...' }
        err?.response?.data?.error   ||   // backend JSON { error: '...' }
        err?.message                 ||   // network error
        'Login failed. Please try again.';
      setLoginError(msg);
    },
  });

  const login = (email, password) => {
    setLoginError('');
    loginMutate({ email, password });
  };

  // ── Logout ────────────────────────────────────────────────────────────────
  const { mutate: logoutMutate } = useLogoutMutation({
    onSettled: async () => {
      setUser(null);
      await queryClient.resetQueries({ queryKey: ['authMe'] });
      navigate('/login', { replace: true });
    },
  });

  const logout = () => logoutMutate();

  return (
    <AuthContext.Provider value={{
      user,
      login,
      logout,
      isLoggingIn,
      loginError,
      isAuthReady,          // ← expose this, NOT isCheckingAuth
      isAuthenticated: !!user,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
