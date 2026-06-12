import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Link, useNavigate } from 'react-router-dom';
import { LogIn, Mail, Lock } from 'lucide-react';
import Home from './pages/Home';
import WorkerList from './pages/WorkerList';
import WorkerProfile from './pages/WorkerProfile';
import Booking from './pages/Booking';
import CustomerDashboard from './pages/CustomerDashboard';
import WorkerDashboard from './pages/WorkerDashboard';
import WorkerProfileSettings from './pages/WorkerProfileSettings';
import CustomerProfileSettings from './pages/CustomerProfileSettings';
import Register from './pages/Register';
import AdminDashboard from './pages/AdminDashboard';
import Navbar from './components/Navbar';
import PaymentStatus from './components/PaymentStatus';
import ToastProvider from './components/Toast';

const Login = ({ setCurrentUser }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
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
      setCurrentUser(userData);
      if (userData.role === 'admin') navigate('/admin-dashboard');
      else navigate(userData.role === 'customer' ? '/customer-dashboard' : '/worker-dashboard');
    } catch (err) {
      console.error('[Login] Error:', err);
      setError(err.message || 'Login failed. Please check your credentials.');
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

          <button
            type="submit"
            className="w-full bg-gradient-primary text-[var(--text-main)] font-black py-4 rounded-2xl shadow-glow-blue hover:opacity-90 transition-all active:scale-[0.98] uppercase tracking-widest text-sm mt-4"
          >
            Sign In
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

const AppContent = () => {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('servigo_user');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
  const location = useLocation();

  // Persist user session
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('servigo_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('servigo_user');
    }
  }, [currentUser]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
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
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login setCurrentUser={setCurrentUser} />} />
            <Route path="/register" element={<Register />} />
            <Route path="/services/:categoryId" element={<WorkerList />} />
            <Route path="/worker/:workerId" element={<WorkerProfile />} />
            <Route path="/book/:workerId" element={<Booking currentUser={currentUser} />} />
            <Route path="/customer-dashboard" element={<CustomerDashboard currentUser={currentUser} setCurrentUser={setCurrentUser} theme={theme} toggleTheme={toggleTheme} />} />
            <Route path="/customer-dashboard/profile" element={<CustomerProfileSettings currentUser={currentUser} setCurrentUser={setCurrentUser} theme={theme} toggleTheme={toggleTheme} />} />
            <Route path="/customer-dashboard/*" element={<CustomerDashboard currentUser={currentUser} setCurrentUser={setCurrentUser} theme={theme} toggleTheme={toggleTheme} />} />
            <Route path="/worker-dashboard" element={<WorkerDashboard currentUser={currentUser} setCurrentUser={setCurrentUser} theme={theme} toggleTheme={toggleTheme} />} />
            <Route path="/worker-dashboard/profile" element={<WorkerProfileSettings currentUser={currentUser} setCurrentUser={setCurrentUser} theme={theme} toggleTheme={toggleTheme} />} />
            <Route path="/worker-dashboard/*" element={<WorkerDashboard currentUser={currentUser} setCurrentUser={setCurrentUser} theme={theme} toggleTheme={toggleTheme} />} />
            <Route path="/admin-dashboard" element={<AdminDashboard currentUser={currentUser} setCurrentUser={setCurrentUser} theme={theme} toggleTheme={toggleTheme} />} />
            <Route path="/payment/:status" element={<PaymentStatus />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

const App = () => {
  return (
    <Router>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </Router>
  );
};

export default App;
