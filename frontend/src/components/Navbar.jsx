import { Link, useNavigate } from 'react-router-dom';
import { User, LogOut, Sun, Moon } from 'lucide-react';

const Navbar = ({ currentUser, setCurrentUser, theme, toggleTheme }) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    setCurrentUser(null);
    navigate('/');
  };

  return (
    <nav className="premium-navbar text-[var(--text-main)] p-4 sticky top-0 z-50 transition-colors duration-500">
      <div className="container mx-auto flex justify-between items-center">
        <Link to="/" className="text-2xl font-bold flex items-center gap-1 font-poppins tracking-tight">
          <span className="text-gradient">Servi</span>
          <span>Go</span>
        </Link>
        <div className="flex items-center gap-4">
          <button 
            onClick={toggleTheme}
            className="p-2.5 rounded-xl bg-[var(--glass-bg)] border border-[var(--glass-border)] text-[var(--text-secondary)] hover:text-[var(--text-main)] hover:bg-white/10 transition-all active:scale-95 shadow-soft"
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {theme === 'dark' ? <Sun size={20} className="text-amber-400" /> : <Moon size={20} className="text-blue-500" />}
          </button>
          {currentUser ? (
            <>
              <Link 
                to={currentUser.role === 'admin' ? '/admin-dashboard' : (currentUser.role === 'worker' ? '/worker-dashboard' : '/customer-dashboard')}
                className="hover:text-primary-start transition flex items-center gap-2 font-medium"
              >
                <div className="bg-[var(--glass-bg)] p-2 rounded-full text-neon-blue border border-[var(--glass-border)]">
                  <User size={18} />
                </div>
                <span className="hidden md:inline font-bold">{currentUser.name || 'User'}</span>
              </Link>
              <button 
                onClick={handleLogout}
                className="text-gray-500 hover:text-red-500 p-2 rounded-full transition flex items-center gap-1"
                title="Logout"
              >
                <LogOut size={18} />
              </button>
            </>
          ) : (
            <Link to="/login" className="bg-gradient-primary hover:opacity-90 px-5 py-2 rounded-xl font-medium transition text-white shadow-soft">
              Login
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
