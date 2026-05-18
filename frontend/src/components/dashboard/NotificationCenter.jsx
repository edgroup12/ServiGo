import React, { useState, useEffect } from 'react';
import { Bell, CheckCircle2, MessageSquare, AlertCircle, Clock, Trash2, ExternalLink } from 'lucide-react';
import api from '../../services/api';
import socket from '../../services/socket';

const NotificationCenter = ({ currentUser, onClose }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNotifications = async () => {
      if (!currentUser || !currentUser._id) return;
      try {
        const res = await api.get(`/notifications/${currentUser._id}`);
        setNotifications(res.data);
      } catch (error) {
        console.error('Error fetching notifications:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();

    // Socket listener for real-time notifications
    const handleNotification = (notification) => {
      setNotifications(prev => [notification, ...prev]);
    };
    socket.on('receive_notification', handleNotification);

    return () => {
      socket.off('receive_notification', handleNotification);
    };
  }, [currentUser?._id]);

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
    <div className="absolute right-0 mt-4 w-96 glass-premium border border-white/10 rounded-[2rem] shadow-2xl z-[100] overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top-right">
      <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-neon-blue/10 flex items-center justify-center text-neon-blue shadow-glow-blue/10">
            <Bell size={20} />
          </div>
          <h3 className="text-white font-black text-sm tracking-tight">Notifications</h3>
        </div>
        <div className="flex items-center gap-2">
          {notifications.some(n => !n.isRead) && (
            <button
              onClick={markAllAsRead}
              className="text-[9px] font-black uppercase tracking-widest text-neon-blue hover:text-white transition-colors"
            >
              Mark all read
            </button>
          )}
        </div>
      </div>

      <div className="max-h-[400px] overflow-y-auto custom-scrollbar bg-black/20">
        {loading ? (
          <div className="p-12 flex justify-center">
            <div className="w-8 h-8 border-2 border-neon-blue/20 border-t-neon-blue rounded-full animate-spin"></div>
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-12 text-center">
            <Bell size={32} className="text-white/10 mx-auto mb-4" />
            <p className="text-white/40 text-xs font-bold uppercase tracking-widest">No notifications yet</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {notifications.map((notification) => (
              <div
                key={notification._id || Math.random()}
                className={`p-5 hover:bg-white/[0.03] transition-colors relative group ${!notification.isRead ? 'bg-white/[0.01]' : ''}`}
                onClick={() => !notification.isRead && markAsRead(notification._id)}
              >
                {!notification.isRead && (
                  <div className="absolute left-1 top-1/2 -translate-y-1/2 w-1 h-8 bg-neon-blue rounded-full"></div>
                )}
                <div className="flex gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border border-white/5 ${!notification.isRead ? 'bg-white/5' : 'opacity-40'}`}>
                    {getIcon(notification.type)}
                  </div>
                  <div className="flex-grow min-w-0">
                    <div className="flex justify-between items-start mb-1">
                      <h4 className={`text-xs font-black tracking-tight truncate ${notification.isRead ? 'text-white/40' : 'text-white'}`}>
                        {notification.title}
                      </h4>
                      <span className="text-[8px] font-black text-white/20 uppercase tracking-widest whitespace-nowrap ml-2">
                        {new Date(notification.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className={`text-[11px] leading-relaxed line-clamp-2 ${notification.isRead ? 'text-white/20' : 'text-white/60 font-medium'}`}>
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

      <div className="p-4 border-t border-white/5 text-center bg-white/[0.01]">
        <button className="text-[9px] font-black uppercase tracking-widest text-white/30 hover:text-white transition-colors">
          View All Notifications
        </button>
      </div>
    </div>
  );
};

export default NotificationCenter;
