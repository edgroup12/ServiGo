import { useState, useEffect } from 'react';
import { Bell, CheckCircle2, MessageSquare, AlertCircle, Clock, ExternalLink, X } from 'lucide-react';
import api from '../../services/api';

const NotificationCenter = ({ currentUser, onClose }) => {
  const [notifications, setNotifications] = useState([]);
  const [showAll, setShowAll] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchNotifications = async () => {
      if (!currentUser || !currentUser._id) return;
      try {
        const res = await api.get(`/notifications/${currentUser._id}`);
        setNotifications(res.data);
        setError('');
      } catch (requestError) {
        console.error('Error fetching notifications:', requestError);
        setError('Notifications could not be loaded.');
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();

  }, [currentUser]);

  const markAsRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!currentUser || !currentUser._id) return;
    try {
      await api.patch(`/notifications/user/${currentUser._id}/read-all`);
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'new_message': return <MessageSquare size={16} className="text-neon-blue" />;
      case 'booking_confirmed': return <CheckCircle2 size={16} className="text-neon-green" />;
      case 'new_booking': return <Clock size={16} className="text-neon-teal" />;
      default: return <AlertCircle size={16} className="text-neon-purple" />;
    }
  };

  return (
    <div className="fixed left-3 right-3 top-20 mt-2 overflow-hidden rounded-[1.5rem] border border-slate-600 bg-slate-950/95 shadow-[0_24px_80px_rgba(0,0,0,0.75)] backdrop-blur-xl sm:absolute sm:left-auto sm:right-0 sm:top-auto sm:mt-4 sm:w-96 sm:rounded-[2rem] z-[100] animate-in fade-in zoom-in-95 duration-200 origin-top-right">
      <div className="p-5 sm:p-6 border-b border-slate-700 flex items-center justify-between bg-slate-900">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-neon-blue/10 flex items-center justify-center text-neon-blue shadow-glow-blue/10">
            <Bell size={20} />
          </div>
          <h3 className="text-white font-black text-sm tracking-tight">Notifications</h3>
        </div>
        <div className="flex items-center gap-3">
          {notifications.some(n => !n.isRead) && (
            <button
              onClick={markAllAsRead}
              className="rounded-lg bg-neon-blue/15 px-2.5 py-1.5 text-[10px] font-black uppercase tracking-wider text-cyan-300 hover:bg-neon-blue/25 hover:text-white transition-colors"
            >
              Mark all read
            </button>
          )}
          <button onClick={onClose} className="rounded-lg bg-white/5 p-2 text-slate-300 hover:bg-white/10 hover:text-white" aria-label="Close notifications">
            <X size={16} />
          </button>
        </div>
      </div>

      <div className="max-h-[min(65vh,480px)] overflow-y-auto custom-scrollbar bg-slate-950">
        {loading ? (
          <div className="p-12 flex justify-center">
            <div className="w-8 h-8 border-2 border-neon-blue/20 border-t-neon-blue rounded-full animate-spin"></div>
          </div>
        ) : error ? (
          <div className="p-8 text-center" role="alert">
            <AlertCircle size={30} className="text-red-400 mx-auto mb-3" />
            <p className="text-red-300 text-xs font-bold">{error}</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-12 text-center">
            <Bell size={32} className="text-white/10 mx-auto mb-4" />
            <p className="text-white/40 text-xs font-bold uppercase tracking-widest">No notifications yet</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-700/80">
            {(showAll ? notifications : notifications.slice(0, 5)).map((notification, index) => (
              <div
                key={notification._id || `${notification.timestamp}-${index}`}
                className={`relative p-5 transition-colors group ${!notification.isRead ? 'cursor-pointer bg-cyan-950/70 hover:bg-cyan-900/60' : 'bg-slate-900/80 hover:bg-slate-800'}`}
                onClick={() => !notification.isRead && markAsRead(notification._id)}
              >
                {!notification.isRead && (
                  <div className="absolute inset-y-0 left-0 w-1.5 bg-cyan-400 shadow-[0_0_14px_rgba(34,211,238,0.8)]"></div>
                )}
                <div className="flex gap-4">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 border ${!notification.isRead ? 'border-cyan-400/40 bg-cyan-400/15' : 'border-slate-600 bg-slate-800'}`}>
                    {getIcon(notification.type)}
                  </div>
                  <div className="flex-grow min-w-0">
                    <div className="flex justify-between items-start mb-1">
                      <h4 className={`truncate text-sm font-black tracking-tight ${notification.isRead ? 'text-slate-300' : 'text-white'}`}>
                        {notification.title}
                      </h4>
                      <span className={`ml-2 whitespace-nowrap text-[9px] font-bold uppercase tracking-wider ${notification.isRead ? 'text-slate-500' : 'text-cyan-300'}`}>
                        {new Date(notification.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className={`mt-1 line-clamp-3 text-xs leading-relaxed ${notification.isRead ? 'text-slate-400' : 'font-semibold text-slate-100'}`}>
                      {notification.message}
                    </p>
                    {notification.link && (
                      <a
                        href={notification.link}
                        className="mt-3 inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-neon-blue hover:text-white transition-colors"
                      >
                        View Details <ExternalLink size={10} />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {notifications.length > 5 && (
        <div className="p-4 border-t border-slate-700 text-center bg-slate-900">
          <button
            type="button"
            onClick={() => setShowAll(current => !current)}
            className="text-[10px] font-black uppercase tracking-widest text-slate-300 hover:text-white transition-colors"
            aria-expanded={showAll}
          >
            {showAll ? 'Show Recent' : `View All Notifications (${notifications.length})`}
          </button>
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;
