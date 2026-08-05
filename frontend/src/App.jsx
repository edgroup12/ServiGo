import { lazy, Suspense, useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Link, useNavigate } from 'react-router-dom';
import { LogIn, Mail, Lock, Home as HomeIcon } from 'lucide-react';
import Navbar from './components/Navbar';
import ToastProvider from './components/Toast';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';

// Lazy-loaded pages — each becomes its own JS chunk
const Home = lazy(() => import('./pages/Home'));
const WorkerList = lazy(() => import('./pages/WorkerList'));
const WorkerProfile = lazy(() => import('./pages/WorkerProfile'));
const Booking = lazy(() => import('./pages/Booking'));
const CustomerDashboard = lazy(() => import('./pages/CustomerDashboard'));
const WorkerDashboard = lazy(() => import('./pages/WorkerDashboard'));
const WorkerProfileSettings = lazy(() => import('./pages/WorkerProfileSettings'));
const CustomerProfileSettings = lazy(() => import('./pages/CustomerProfileSettings'));
const Register = lazy(() => import('./pages/Register'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const PaymentStatus = lazy(() => import('./components/PaymentStatus'));

// Fallback shown while lazy chunks are downloading
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-[var(--bg-color)]">
    <div className="flex flex-col items-center gap-4">
      <div className="w-12 h-12 border-4 border-neon-blue/20 border-t-neon-blue rounded-full animate-spin" />
      <p className="text-white/30 text-[10px] font-black uppercase tracking-widest">Loading...</p>
    </div>
  </div>
);

const Login = ({ setCurrentUser }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Invalid credentials');
      }
      const data = await res.json();
      const userData = { ...data.user, token: data.token };
      const requestedPath = location.state?.from?.pathname;
      setCurrentUser(userData);
      if (requestedPath) navigate(requestedPath, { replace: true });
      else if (userData.role === 'admin') navigate('/admin-dashboard', { replace: true });
      else navigate(userData.role === 'customer' ? '/customer-dashboard' : '/worker-dashboard', { replace: true });
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-color)] flex items-center justify-center px-4 relative overflow-hidden selection:bg-neon-blue/30 transition-colors duration-500">
      {/* Background Blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-neon-blue/20 rounded-full blur-[120px] animate-blob"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-neon-purple/20 rounded-full blur-[120px] animate-blob animation-delay-2000"></div>

      <div className="glass-premium p-8 md:p-10 shadow-glow-blue/20 w-full max-w-md relative z-10 border border-[var(--glass-border)] rounded-[2.5rem]">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-neon-blue to-neon-purple rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg rotate-3 hover:rotate-0 transition-transform duration-300">
            <LogIn className="text-[var(--text-main)]" size={32} />
          </div>
          <h2 className="text-3xl font-black text-[var(--text-main)] mb-2 font-poppins tracking-tighter">Welcome Back</h2>
          <p className="text-[var(--text-main)]/50 font-bold uppercase tracking-widest text-[10px]">Login to your <span className="text-gradient">ServiGo</span> account</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl mb-6 text-sm font-bold flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></span>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="relative group">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-main)]/30 group-focus-within:text-neon-blue transition-colors" size={20} />
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="block w-full pl-12 pr-4 py-4 bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-2xl focus:ring-2 focus:ring-neon-blue/20 focus:border-neon-blue outline-none transition-all text-[var(--text-main)] font-bold placeholder-[var(--text-muted)]"
              required
            />
          </div>

          <div className="relative group">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-main)]/30 group-focus-within:text-neon-purple transition-colors" size={20} />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="block w-full pl-12 pr-4 py-4 bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-2xl focus:ring-2 focus:ring-neon-purple/20 focus:border-neon-purple outline-none transition-all text-[var(--text-main)] font-bold placeholder-[var(--text-muted)]"
              required
            />
          </div>
          <div className="text-right">
            <Link to="/forgot-password" className="text-xs font-bold text-neon-blue hover:underline">Forgot password?</Link>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-primary text-[var(--text-main)] font-black py-4 rounded-2xl shadow-glow-blue hover:opacity-90 transition-all active:scale-[0.98] uppercase tracking-widest text-sm mt-4 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-[var(--text-muted)] text-[10px] font-black uppercase tracking-widest">
            Don't have an account? <Link to="/register" className="text-neon-blue hover:underline ml-1">Join ServiGo</Link>
          </p>
        </div>

      </div>
    </div>
  );
};

const NotFound = () => (
  <section className="flex min-h-[70vh] items-center justify-center px-4 py-16 text-center">
    <div className="w-full max-w-lg rounded-[2rem] border border-[var(--glass-border)] bg-[var(--glass-bg)] p-8 shadow-2xl sm:p-10">
      <p className="text-sm font-black uppercase tracking-[0.3em] text-neon-blue">404</p>
      <h1 className="mt-3 text-3xl font-black text-[var(--text-main)] sm:text-4xl">Page not found</h1>
      <p className="mt-4 text-sm font-medium leading-relaxed text-[var(--text-muted)]">
        The page may have moved or the address may be incorrect.
      </p>
      <Link
        to="/"
        className="mx-auto mt-7 flex min-h-12 w-fit items-center justify-center gap-2 rounded-2xl bg-gradient-primary px-6 py-3 text-sm font-black uppercase tracking-wider text-white"
      >
        <HomeIcon size={18} aria-hidden="true" />
        Back home
      </Link>
    </div>
  </section>
);

const AppContent = () => {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('servigo_user');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem('theme') || 'dark';
    } catch {
      return 'dark';
    }
  });
  const location = useLocation();

  // Persist preferences when storage is available (private modes can deny access).
  useEffect(() => {
    try {
      if (currentUser) {
        localStorage.setItem('servigo_user', JSON.stringify(currentUser));
      } else {
        localStorage.removeItem('servigo_user');
      }
    } catch {
      // The in-memory session remains usable for this tab.
    }
  }, [currentUser]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem('theme', theme);
    } catch {
      // Theme still applies for this tab.
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const isDashboard = location.pathname.includes('dashboard');

  return (
    <div className={`min-h-screen selection:bg-neon-blue/30 overflow-x-hidden transition-colors duration-500 ${theme === 'dark' ? 'bg-premium-radial' : ''}`} style={theme === 'light' ? { background: 'var(--bg-radial)', backgroundColor: 'var(--bg-color)' } : {}}>
      {/* Background Glow Blobs */}
      <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full blur-[120px] animate-blob pointer-events-none z-0" style={{ background: theme === 'dark' ? 'rgba(59,130,246,0.2)' : 'rgba(37,99,235,0.06)' }}></div>
      <div className="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full blur-[120px] animate-blob animation-delay-2000 pointer-events-none z-0" style={{ background: theme === 'dark' ? 'rgba(139,92,246,0.2)' : 'rgba(124,58,237,0.05)' }}></div>
      <div className="fixed top-[40%] left-[30%] w-[30%] h-[30%] rounded-full blur-[100px] animate-blob animation-delay-4000 pointer-events-none z-0" style={{ background: theme === 'dark' ? 'rgba(236,72,153,0.1)' : 'rgba(8,145,178,0.04)' }}></div>

      <div className="relative z-10 flex flex-col min-h-screen">
        {!isDashboard && <Navbar currentUser={currentUser} setCurrentUser={setCurrentUser} theme={theme} toggleTheme={toggleTheme} />}
        <main className="flex-grow">
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login setCurrentUser={setCurrentUser} />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/services/:categoryId" element={<WorkerList />} />
              <Route path="/worker/:workerId" element={<WorkerProfile />} />
              <Route path="/book/:workerId" element={(
                <ProtectedRoute currentUser={currentUser} allowedRoles={['customer']}>
                  <Booking />
                </ProtectedRoute>
              )} />
              <Route path="/customer-dashboard" element={(
                <ProtectedRoute currentUser={currentUser} allowedRoles={['customer']}>
                  <CustomerDashboard currentUser={currentUser} setCurrentUser={setCurrentUser} theme={theme} toggleTheme={toggleTheme} />
                </ProtectedRoute>
              )} />
              <Route path="/customer-dashboard/profile" element={(
                <ProtectedRoute currentUser={currentUser} allowedRoles={['customer']}>
                  <CustomerProfileSettings currentUser={currentUser} setCurrentUser={setCurrentUser} theme={theme} toggleTheme={toggleTheme} />
                </ProtectedRoute>
              )} />
              <Route path="/customer-dashboard/*" element={(
                <ProtectedRoute currentUser={currentUser} allowedRoles={['customer']}>
                  <CustomerDashboard currentUser={currentUser} setCurrentUser={setCurrentUser} theme={theme} toggleTheme={toggleTheme} />
                </ProtectedRoute>
              )} />
              <Route path="/worker-dashboard" element={(
                <ProtectedRoute currentUser={currentUser} allowedRoles={['worker']}>
                  <WorkerDashboard currentUser={currentUser} setCurrentUser={setCurrentUser} theme={theme} toggleTheme={toggleTheme} />
                </ProtectedRoute>
              )} />
              <Route path="/worker-dashboard/profile" element={(
                <ProtectedRoute currentUser={currentUser} allowedRoles={['worker']}>
                  <WorkerProfileSettings currentUser={currentUser} setCurrentUser={setCurrentUser} theme={theme} toggleTheme={toggleTheme} />
                </ProtectedRoute>
              )} />
              <Route path="/worker-dashboard/*" element={(
                <ProtectedRoute currentUser={currentUser} allowedRoles={['worker']}>
                  <WorkerDashboard currentUser={currentUser} setCurrentUser={setCurrentUser} theme={theme} toggleTheme={toggleTheme} />
                </ProtectedRoute>
              )} />
              <Route path="/admin-dashboard" element={(
                <ProtectedRoute currentUser={currentUser} allowedRoles={['admin']}>
                  <AdminDashboard currentUser={currentUser} setCurrentUser={setCurrentUser} theme={theme} toggleTheme={toggleTheme} />
                </ProtectedRoute>
              )} />
              <Route path="/payment/:status" element={(
                <ProtectedRoute currentUser={currentUser} allowedRoles={['customer']}>
                  <PaymentStatus />
                </ProtectedRoute>
              )} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </main>
      </div>
    </div>
  );
};

const App = () => {
  return (
    <ErrorBoundary>
      <Router>
        <ToastProvider>
          <AppContent />
        </ToastProvider>
      </Router>
    </ErrorBoundary>
  );
};

export default App;
