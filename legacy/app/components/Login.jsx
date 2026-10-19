import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock, Mail, LoaderCircle } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
  const { login, isLoggingIn, loginError, user, isAuthReady } = useAuth();
  useEffect(() => {
    if (!isAuthReady || !user) return;
    navigate(user.userType === 'admin' ? '/admindashboard' : '/salesdashboard', { replace: true });
  }, [isAuthReady, user, navigate]);

  const handleSubmit = (e) => {
    e.preventDefault();
    login(email, password);
  };
    

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 sm:px-6 lg:px-8">
      {/* <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div> */}

      <div className="w-full max-w-md">
        <div className="bg-card rounded-lg shadow-md p-6 sm:p-8 border border-border dark:shadow-[0_0_40px_rgba(192,192,192,0.15)] dark:border-primary/20">
          <div className="flex justify-center mb-6">
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-primary overflow-hidden rounded-full flex items-center justify-center dark:shadow-[0_0_20px_rgba(192,192,192,0.4)]">
              <img src="/mahavirlogo.png" className="object-contain text-primary-foreground" alt="Mahavir Logo" />
            </div>
          </div>

          <h1 className="text-center mb-2 text-foreground dark:text-primary text-xl sm:text-2xl">Mahavir Hospitality</h1>
          <p className="text-center text-muted-foreground mb-6 text-sm sm:text-base">Bill Quotation & Catalog System</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm text-foreground dark:text-accent-foreground mb-2">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground dark:text-primary/60" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoggingIn}
                  className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-foreground dark:focus:ring-primary dark:border-primary/20 dark:focus:border-primary/50 transition-all text-base"
                  placeholder="Enter your email"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm text-foreground dark:text-accent-foreground mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground dark:text-primary/60" />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoggingIn}
                  className="w-full pl-10 pr-4 py-2.5 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-ring text-foreground dark:focus:ring-primary dark:border-primary/20 dark:focus:border-primary/50 transition-all text-base"
                  placeholder="Enter your password"
                  required
                />
              </div>
            </div>

            {/* Error from AuthContext — shows backend message or network error */}
            {loginError && (
              <div className="bg-destructive/10 border border-destructive/50 text-destructive px-4 py-3 rounded text-xs sm:text-sm">
                {loginError}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoggingIn}
              aria-busy={isLoggingIn}
              className="w-full bg-primary text-primary-foreground py-2.5 sm:py-3 rounded-md hover:bg-primary/90 disabled:opacity-70 disabled:cursor-not-allowed transition-all dark:shadow-[0_0_20px_rgba(192,192,192,0.3)] dark:hover:shadow-[0_0_30px_rgba(192,192,192,0.5)] text-base font-medium"
            >
              {isLoggingIn ? (
                <span className="inline-flex items-center justify-center gap-2">
                  <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Logging in...
                </span>
              ) : 'Login'}
            </button>
          </form>

        </div>
      </div>
    </div>
  );
}
