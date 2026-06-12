import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  Users,
  CheckCircle2,
  Briefcase,
  Plus,
  ArrowUpRight
} from 'lucide-react';
import api from '../services/api';
import { useToast } from '../components/Toast';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import StatCard from '../components/dashboard/StatCard';
import DashboardCharts from '../components/dashboard/DashboardCharts';
import RecentBookings from '../components/dashboard/RecentBookings';
import ChatBox from '../components/ChatBox';
import LiveTrackingMap from '../components/dashboard/LiveTrackingMap';
import { X } from 'lucide-react';

const CustomerDashboard = ({ currentUser, setCurrentUser }) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeChat, setActiveChat] = useState(null);
  const [trackingBooking, setTrackingBooking] = useState(null);

  useEffect(() => {
    if (!currentUser || currentUser.role !== 'customer') {
      navigate('/login');
      return;
    }

    const fetchBookings = async () => {
      try {
        const res = await api.get(`/bookings/user/${currentUser._id}`);
        setBookings(res.data);
      } catch (error) {
        console.error('Error fetching bookings', error);
      } finally {
        setLoading(false);
      }
    };
    fetchBookings();
  }, [currentUser, navigate]);

  if (!currentUser) return null;

  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const stats = [
    {
      icon: Calendar,
      label: 'Total Bookings',
      value: bookings.length,
      trend: '+12%',
      colorClass: 'bg-neon-blue',
      onClick: () => scrollToSection('recent-bookings')
    },
    {
      icon: CheckCircle2,
      label: 'Completed Jobs',
      value: bookings.filter(b => b.status === 'completed').length,
      trend: '+5%',
      colorClass: 'bg-neon-green',
      onClick: () => scrollToSection('recent-bookings')
    },
    {
      icon: Briefcase,
      label: 'Active Services',
      value: bookings.filter(b => b.status === 'confirmed').length,
      trend: '+2',
      colorClass: 'bg-neon-teal',
      onClick: () => scrollToSection('recent-bookings')
    },
    {
      icon: ArrowUpRight,
      label: 'Total Spent',
      value: `৳${bookings.reduce((sum, b) => sum + (b.estimatedPrice || 0), 0)}`,
      trend: '+18%',
      colorClass: 'bg-neon-purple',
      onClick: () => toast('Total spent calculated based on all completed bookings.', 'info')
    },
  ];

  return (
    <DashboardLayout user={currentUser} setCurrentUser={setCurrentUser}>
      {/* Hero Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
        <div>
          <h1 className="text-4xl font-black text-white font-poppins tracking-tighter mb-2">
            Welcome back, <span className="text-gradient">{currentUser.name.split(' ')[0]}</span> 👋
          </h1>
          <p className="text-white/60 font-bold text-sm tracking-wide uppercase">
            Here's what's happening with your services today
          </p>
        </div>

        <div className="flex gap-4">
          <button onClick={() => navigate('/services/all')} className="flex items-center gap-2 px-6 py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-sm font-bold transition-all hover:scale-105 active:scale-95 text-white/90">
            <Plus size={18} className="text-neon-blue" />
            New Booking
          </button>
          <button onClick={() => navigate('/services/all')} className="flex items-center gap-2 px-6 py-4 bg-gradient-primary shadow-glow-blue hover:opacity-90 rounded-2xl text-sm font-bold transition-all hover:scale-105 active:scale-95 text-white">
            <Plus size={18} />
            Explore Services
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      {/* Charts Section */}
      <DashboardCharts currentUser={currentUser} />

      {/* Recent Activity Table */}
      {loading ? (
        <div className="glass-card p-20 flex justify-center items-center border-gradient-premium">
          <div className="w-12 h-12 border-4 border-neon-blue/20 border-t-neon-blue rounded-full animate-spin"></div>
        </div>
      ) : (
        <RecentBookings
          bookings={bookings}
          onOpenChat={setActiveChat}
          onTrackWorker={setTrackingBooking}
        />
      )}

      {/* Live Tracking Modal */}
      {trackingBooking && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 md:p-10">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" onClick={() => setTrackingBooking(null)}></div>
          <div className="relative w-full max-w-4xl glass-card border-gradient-premium overflow-hidden animate-in fade-in zoom-in duration-300">
            <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-neon-blue/20 flex items-center justify-center text-neon-blue shadow-glow-blue/20">
                  <Plus className="rotate-45" size={20} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-white font-poppins tracking-tight">Live Worker Tracking</h3>
                  <p className="text-[10px] font-black text-neon-blue uppercase tracking-widest">Job #{trackingBooking._id.slice(-6)}</p>
                </div>
              </div>
              <button
                onClick={() => setTrackingBooking(null)}
                className="p-2 hover:bg-white/10 rounded-full text-white/60 hover:text-white transition-all"
              >
                <X size={24} />
              </button>
            </div>
            <div className="p-6">
              <LiveTrackingMap bookingId={trackingBooking._id} />
              <div className="mt-6 flex justify-between items-center px-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-neon-blue/20 to-neon-purple/20 border border-white/10 flex items-center justify-center text-neon-blue text-xl font-black">
                    {trackingBooking.worker?.name?.charAt(0) || 'W'}
                  </div>
                  <div>
                    <p className="text-white font-black">{trackingBooking.worker?.name}</p>
                    <p className="text-[10px] text-white/40 uppercase font-black">On the way to your location</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setActiveChat(trackingBooking);
                    setTrackingBooking(null);
                  }}
                  className="bg-gradient-primary px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-white shadow-glow-blue/20 hover:scale-105 transition-all"
                >
                  Chat with Worker
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeChat && (
        <ChatBox
          booking={activeChat}
          currentUser={currentUser}
          onClose={() => setActiveChat(null)}
        />
      )}
    </DashboardLayout>
  );
};

export default CustomerDashboard;
