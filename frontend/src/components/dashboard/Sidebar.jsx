import { 
  LayoutDashboard, 
  Calendar, 
  Users, 
  Grid, 
  Settings, 
  LogOut,
  ChevronRight,
  Sparkles,
  X
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import api from '../../services/api';

const MenuItem = ({ icon: Icon, label, path, active, onClick }) => {
  const content = (
    <div
      onClick={onClick}
      className={`flex items-center justify-between px-4 py-3.5 rounded-2xl transition-all duration-300 group cursor-pointer hover:translate-x-1 ${
        active 
          ? 'bg-gradient-primary shadow-glow-blue text-white' 
          : 'text-white/60 hover:text-white hover:bg-[var(--glass-bg)]'
      }`}
    >
      <div className="flex items-center gap-3">
        <Icon size={20} className={active ? 'text-white' : 'group-hover:text-neon-blue transition-colors'} />
        <span className="font-semibold text-sm tracking-wide">{label}</span>
      </div>
      {active && <ChevronRight size={16} className="text-white/70" />}
    </div>
  );

  return path ? <Link to={path}>{content}</Link> : content;
};


const Sidebar = ({ user, setCurrentUser, theme, isOpen, setIsOpen }) => {
  const location = useLocation();
  const navigate = useNavigate();
  
  const dashboardPath = user?.role === 'admin' 
    ? '/admin-dashboard' 
    : user?.role === 'worker' 
      ? '/worker-dashboard' 
      : '/customer-dashboard';
      
  const profilePath = user?.role === 'worker' ? '/worker-dashboard/profile' : '/customer-dashboard/profile';

  const scrollToBookings = () => {
    setIsOpen(false);
    const element = document.getElementById('recent-bookings');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    } else {
      navigate(dashboardPath);
      setTimeout(() => {
        const el = document.getElementById('recent-bookings');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  };

  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: dashboardPath },
    { icon: Calendar, label: 'Bookings', onClick: scrollToBookings },
    { icon: Users, label: 'Workers', path: '/services/all' },
    { icon: Grid, label: 'Categories', path: '/' },
    { icon: Settings, label: 'Profile Settings', path: profilePath },
  ];

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      if (setCurrentUser) setCurrentUser(null);
      localStorage.removeItem('servigo_user');
      window.location.href = '/login';
    }
  };

  return (
    <aside className={`fixed left-0 top-0 h-screen w-72 glass-premium border-r border-[var(--glass-border)] z-[60] flex flex-col p-6 overflow-hidden transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      {/* Decorative Blob */}
      <div className="absolute -top-20 -left-20 w-40 h-40 bg-neon-blue/10 rounded-full blur-3xl"></div>
      
      <div className="flex items-center justify-between mb-12 px-2 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-neon-blue to-neon-purple rounded-xl flex items-center justify-center shadow-glow-blue rotate-3">
            <Sparkles className="text-white" size={22} />
          </div>
          <h1 className="text-2xl font-black tracking-tighter text-white font-poppins">
            Servi<span className="text-neon-blue">Go</span>
          </h1>
        </div>
        <button onClick={() => setIsOpen(false)} className="p-2.5 bg-white/5 border border-white/10 rounded-xl text-white/40 hover:text-white hover:bg-white/10 transition-all active:scale-90 shadow-soft">
          <X size={20} />
        </button>
      </div>

      <nav className="flex-grow space-y-2 relative z-10">
        {menuItems.map((item) => (
          <MenuItem 
            key={item.label} 
            {...item} 
            active={location.pathname === item.path}
            onClick={item.onClick ? item.onClick : () => setIsOpen(false)}
          />
        ))}
      </nav>

      <div className="mt-auto mb-6 relative z-10">
        <Link to={profilePath} onClick={() => setIsOpen(false)} className="flex items-center gap-4 p-4 glass-card border-[var(--glass-border)] hover:bg-[var(--glass-bg)] transition-all group rounded-2xl">
          <div className="relative">
            <img 
              src={user?.photoUrl || `https://ui-avatars.com/api/?name=${user?.name}&background=7F5AF0&color=fff`} 
              alt="Profile" 
              className="w-12 h-12 rounded-xl object-cover border border-[var(--glass-border)] shadow-glow-blue/20"
            />
            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-neon-green rounded-full border-2 border-[#020617]"></div>
          </div>
          <div className="flex-grow overflow-hidden">
            <p className="text-white font-bold text-sm truncate group-hover:text-neon-blue transition-colors">{user?.name}</p>
            <p className="text-[9px] font-black text-white/30 uppercase tracking-widest">{user?.role}</p>
          </div>
        </Link>
      </div>

      <div className="pt-6 border-t border-[var(--glass-border)] relative z-10">
        <button onClick={handleLogout} className="flex items-center gap-3 px-4 py-3.5 w-full text-white/60 hover:text-red-400 hover:bg-red-500/5 rounded-2xl transition-all duration-300 group">
          <LogOut size={20} />
          <span className="font-semibold text-sm tracking-wide">Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
