import { useState, useEffect } from 'react';
import { Search, Bell, ChevronDown, User, MoreVertical } from 'lucide-react';
import NotificationCenter from './NotificationCenter';
import api from '../../services/api';
import socket from '../../services/socket';

const Navbar = ({ user, toggleSidebar }) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const fetchUnreadCount = async () => {
      if (!user || !user._id) return;
      try {
        const res = await api.get(`/notifications/${user._id}`);
        setUnreadCount(res.data.filter(n => !n.isRead).length);
      } catch (error) {
        console.error('Error fetching unread count:', error);
      }
    };

    fetchUnreadCount();

    // Listen for real-time notifications
    const handleNewNotification = () => {
      setUnreadCount(prev => prev + 1);
    };
    socket.on('receive_notification', handleNewNotification);

    return () => {
      socket.off('receive_notification', handleNewNotification);
    };
  }, [user]);

  return (
    <nav className="h-20 flex items-center justify-between px-3 sm:px-6 lg:px-8 border-b border-[var(--glass-border)] bg-[var(--navbar-bg)] backdrop-blur-md sticky top-0 z-40 transition-all duration-500">
      <div className="flex min-w-0 items-center gap-3 sm:gap-6 flex-1">
        <button
          onClick={toggleSidebar}
          className="p-3 bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-2xl text-[var(--text-main)] hover:bg-neon-blue/10 hover:border-neon-blue/30 transition-all active:scale-90 shadow-glow-blue/5"
          aria-label="Open navigation menu"
        >
          <MoreVertical size={20} />
        </button>
        <div className="relative w-full max-w-md group hidden md:block">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-neon-blue transition-colors" size={18} />
          <input
            type="text"
            placeholder="Search services, workers, or bookings..."
            className="w-full bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-2xl pl-12 pr-4 py-3 text-sm text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-neon-blue/20 focus:border-neon-blue/50 transition-all"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-4 lg:gap-6">
        <div className="relative">
          <button
            onClick={() => setShowNotifications(current => !current)}
            className="relative p-3 bg-[var(--glass-bg)] border border-[var(--glass-border)] rounded-2xl text-[var(--text-main)] hover:text-neon-blue hover:bg-neon-blue/5 hover:border-neon-blue/30 transition-all active:scale-90 shadow-soft"
            aria-label="Open notifications"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-r from-neon-blue to-neon-purple rounded-full text-[10px] font-black text-white flex items-center justify-center shadow-glow-blue animate-in zoom-in duration-300">
                {unreadCount}
              </span>
            )}
          </button>
          {showNotifications && (
            <NotificationCenter
              currentUser={user}
              onClose={() => setShowNotifications(false)}
            />
          )}
        </div>

        <div className="hidden sm:block h-8 w-px bg-white/10 mx-1 lg:mx-2"></div>

        <div
          className="flex items-center gap-3 pl-2 pr-1 py-1 rounded-2xl hover:bg-[var(--glass-bg)] cursor-pointer transition-all group hover:scale-[1.02]"
        >
          <div className="text-right hidden sm:block">
            <p className="text-sm font-bold text-white tracking-wide">{user?.name || 'Rahul'}</p>
            <p className="text-[10px] font-bold text-neon-blue uppercase tracking-widest">{user?.role || 'User'}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-neon-blue/20 to-neon-purple/20 border border-[var(--glass-border)] flex items-center justify-center text-neon-blue group-hover:shadow-glow-blue transition-all">
            {user?.name ? user.name.charAt(0) : <User size={20} />}
          </div>
          <ChevronDown size={16} className="hidden sm:block text-white/60 group-hover:text-white transition-colors" />
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
