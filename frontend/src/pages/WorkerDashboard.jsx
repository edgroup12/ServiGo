import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  Check,
  X,
  MapPin,
  DollarSign,
  Briefcase,
  Clock,
  ArrowUpRight,
  TrendingUp,
  User,
  MessageSquare
} from 'lucide-react';
import api from '../services/api';
import { format } from 'date-fns';
import { useToast } from '../components/Toast';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import StatCard from '../components/dashboard/StatCard';
import ChatBox from '../components/ChatBox';
import LocationBroadcaster from '../components/dashboard/LocationBroadcaster';

const WorkerDashboard = ({ currentUser, setCurrentUser }) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeChat, setActiveChat] = useState(null);
  const [isAvailable, setIsAvailable] = useState(currentUser?.isAvailable ?? true);

  const toggleAvailability = async () => {
    const newState = !isAvailable;
    setIsAvailable(newState);
    if (setCurrentUser) setCurrentUser(prev => ({ ...prev, isAvailable: newState }));

    try {
      await api.patch(`/users/${currentUser._id}/availability`, { isAvailable: newState });
    } catch (error) {
      console.error('Failed to update availability:', error);
      // Revert on error
      setIsAvailable(!newState);
      if (setCurrentUser) setCurrentUser(prev => ({ ...prev, isAvailable: !newState }));
    }
  };

  useEffect(() => {
    if (!currentUser || currentUser.role !== 'worker') {
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

  const updateBookingStatus = async (bookingId, status) => {
    try {
      const res = await api.patch(`/bookings/${bookingId}/status`, { status });
      setBookings(bookings.map(b => b._id === bookingId ? { ...b, status: res.data.status } : b));
      toast(`Job ${status} successfully!`, 'success');
    } catch (error) {
      console.error('Error updating status:', error);
      toast('Failed to update status. Please check your connection and try again.', 'error');
    }
  };

  const pendingRequests = bookings.filter(b => b.status === 'pending');
  const activeJobs = bookings.filter(b => b.status === 'confirmed');
  const pastJobs = bookings.filter(b => b.status === 'completed' || b.status === 'declined');

  // Calculate earnings
  const earnings = bookings.filter(b => b.status === 'completed').reduce((acc, curr) => acc + curr.estimatedPrice, 0);

  if (!currentUser) return null;

  if (loading) {
    return (
      <DashboardLayout user={currentUser} setCurrentUser={setCurrentUser}>
        <div className="min-h-[60vh] flex flex-col items-center justify-center">
          <div className="w-16 h-16 border-4 border-neon-blue/20 border-t-neon-blue rounded-full animate-spin mb-4"></div>
          <p className="text-white/40 font-black uppercase tracking-widest text-xs">Loading your portal...</p>
        </div>
      </DashboardLayout>
    );
  }

  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const stats = [
    {
      icon: Briefcase,
      label: 'Active Jobs',
      value: activeJobs.length,
      trend: '+3',
      colorClass: 'bg-neon-blue',
      onClick: () => scrollToSection('active-jobs')
    },
    {
      icon: Calendar,
      label: 'New Requests',
      value: pendingRequests.length,
      trend: '+5',
      colorClass: 'bg-neon-teal',
      onClick: () => scrollToSection('incoming-requests')
    },
    {
      icon: Check,
      label: 'Completed',
      value: bookings.filter(b => b.status === 'completed').length,
      trend: '+12%',
      colorClass: 'bg-neon-green',
      onClick: () => scrollToSection('recent-history')
    },
    {
      icon: DollarSign,
      label: 'Total Earnings',
      value: `৳${earnings.toLocaleString()}`,
      trend: '+24%',
      colorClass: 'bg-neon-purple',
      onClick: () => scrollToSection('recent-history')
    },
  ];

  return (
    <DashboardLayout user={currentUser} setCurrentUser={setCurrentUser}>
      {/* Hero Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
        <div>
          <h1 className="text-4xl font-black text-white font-poppins tracking-tighter mb-2">
            Worker <span className="text-gradient">Portal</span>
          </h1>
          <p className="text-white/60 font-bold text-sm tracking-wide uppercase">
            Manage your service requests and track your performance
          </p>
        </div>

        <div className="flex flex-wrap gap-4">
          <button
            onClick={() => navigate('/worker-dashboard/profile')}
            className="flex items-center gap-2 px-6 py-4 rounded-2xl text-sm font-bold transition-all hover:scale-105 active:scale-95 bg-white/5 border border-white/10 text-white hover:bg-white/10"
          >
            <User size={18} className="text-neon-purple" />
            Profile Settings
          </button>
          <button
            onClick={toggleAvailability}
            className={`flex items-center gap-2 px-6 py-4 rounded-2xl text-sm font-bold transition-all hover:scale-105 active:scale-95 text-white ${isAvailable ? 'bg-gradient-primary shadow-glow-blue hover:opacity-90' : 'bg-white/10 border border-white/20 text-white/50'}`}
          >
            <span className={`w-2 h-2 rounded-full ${isAvailable ? 'bg-white animate-pulse' : 'bg-white/20'}`}></span>
            {isAvailable ? 'Available for Hire' : 'Currently Unavailable'}
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-12">
          {/* New Requests */}
          <section id="incoming-requests">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-black text-white font-poppins tracking-tight flex items-center gap-3">
                <span className="w-2 h-2 rounded-full bg-neon-teal shadow-glow-teal animate-pulse"></span>
                Incoming Requests
              </h2>
              <span className="px-3 py-1 bg-neon-teal/10 text-neon-teal text-[10px] font-black rounded-lg uppercase tracking-widest border border-neon-teal/20">
                {pendingRequests.length} New
              </span>
            </div>

            {pendingRequests.length === 0 ? (
              <div className="glass-card p-12 text-center border-gradient-premium">
                <Clock size={48} className="text-white/20 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-bold text-white/50 font-poppins">No new requests</h3>
                <p className="text-xs font-bold text-white/20 uppercase tracking-widest mt-2">You're all caught up!</p>
              </div>
            ) : (
              <div className="space-y-6">
                {pendingRequests.map(req => (
                  <div key={req._id} className="glass-card border-gradient-premium overflow-hidden group">
                    <div className="p-8 flex flex-col md:flex-row justify-between gap-8">
                      <div className="flex items-center gap-5">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-neon-teal/20 to-neon-blue/20 border border-white/10 flex items-center justify-center text-neon-teal text-2xl font-black shadow-glow-teal">
                          {req.customer?.name?.charAt(0) || 'C'}
                        </div>
                        <div>
                          <h3 className="text-xl font-black text-white font-poppins tracking-tight">{req.customer?.name}</h3>
                          <div className="flex flex-wrap gap-4 mt-2">
                            <div className="flex items-center gap-2 text-white/60 text-xs font-bold">
                              <Calendar size={14} className="text-neon-blue" />
                              {format(new Date(req.date), 'MMM dd, yyyy')}
                            </div>
                            <div className="flex items-center gap-2 text-white/60 text-xs font-bold">
                              <Clock size={14} className="text-neon-purple" />
                              {format(new Date(req.date), 'hh:mm a')}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-black text-white font-poppins">৳{req.estimatedPrice}</p>
                        <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mt-1 bg-white/5 px-2 py-1 rounded-lg border border-white/5 inline-block mb-2 block">{req.paymentMethod}</p>
                        <button
                          onClick={() => setActiveChat(req)}
                          className="mt-2 p-2 bg-gradient-primary rounded-lg text-white hover:scale-105 transition-all shadow-glow-blue/20 w-full flex justify-center items-center gap-2"
                        >
                          <MessageSquare size={14} /> <span className="text-[10px] font-bold uppercase tracking-widest">Chat</span>
                        </button>
                      </div>
                    </div>

                    <div className="bg-white/5 px-8 py-4 text-xs font-bold text-white/60 border-t border-white/5 flex items-start gap-3">
                      <span className="text-white uppercase tracking-widest text-[10px]">Issue:</span>
                      <span className="leading-relaxed opacity-80">{req.description}</span>
                    </div>

                    <div className="flex border-t border-white/5">
                      <button
                        onClick={() => updateBookingStatus(req._id, 'declined')}
                        className="flex-1 py-5 text-white/40 font-black text-[10px] uppercase tracking-widest hover:bg-red-500/10 hover:text-red-400 transition-all flex justify-center items-center gap-2"
                      >
                        <X size={16} /> Decline
                      </button>
                      <div className="w-px bg-white/5"></div>
                      <button
                        onClick={() => updateBookingStatus(req._id, 'confirmed')}
                        className="flex-1 py-5 text-neon-blue font-black text-[10px] uppercase tracking-widest hover:bg-neon-blue/10 transition-all flex justify-center items-center gap-2"
                      >
                        <Check size={16} /> Accept Job
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Active Jobs */}
          <section id="active-jobs">
            <h2 className="text-xl font-black text-white font-poppins tracking-tight mb-8 flex items-center gap-3">
              <span className="w-2 h-2 rounded-full bg-neon-blue shadow-glow-blue animate-pulse"></span>
              Current Jobs
            </h2>
            {activeJobs.length === 0 ? (
              <div className="glass-card p-12 text-center border-gradient-premium">
                <p className="text-xs font-bold text-white/20 uppercase tracking-widest">No active jobs at the moment</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {activeJobs.map(job => (
                  <div key={job._id} className="glass-card border-gradient-premium p-8 relative overflow-hidden group">
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <span className="bg-neon-blue/10 text-neon-blue text-[9px] font-black px-2 py-1 rounded-lg uppercase tracking-widest mb-3 inline-block border border-neon-blue/20">Confirmed</span>
                        <h3 className="text-lg font-black text-white font-poppins tracking-tight">{job.customer?.name}</h3>
                      </div>
                      <p className="text-xl font-black text-white font-poppins">৳{job.estimatedPrice}</p>
                      <button
                        onClick={() => setActiveChat(job)}
                        className="mt-3 p-2 bg-gradient-primary rounded-lg text-white hover:scale-105 transition-all shadow-glow-blue/20 flex justify-center items-center gap-2"
                      >
                        <MessageSquare size={14} /> <span className="text-[10px] font-bold uppercase tracking-widest">Chat</span>
                      </button>
                    </div>

                    <div className="space-y-3 mb-8">
                      <div className="flex items-center gap-3 text-white/60 text-xs font-bold bg-white/5 p-3 rounded-xl border border-white/5">
                        <MapPin size={14} className="text-neon-blue" />
                        {job.address}
                      </div>
                      <div className="flex items-center gap-3 text-white/60 text-xs font-bold bg-white/5 p-3 rounded-xl border border-white/5">
                        <Clock size={14} className="text-neon-purple" />
                        Started {format(new Date(job.date), 'hh:mm a')}
                      </div>
                    </div>

                    <button
                      onClick={() => updateBookingStatus(job._id, 'completed')}
                      className="w-full bg-gradient-primary hover:opacity-90 text-white text-[10px] font-black uppercase tracking-[0.2em] py-4 rounded-2xl shadow-glow-blue transition-all hover:scale-[1.02] active:scale-95"
                    >
                      Mark as Completed
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Right Sidebar - History */}
        <div className="space-y-8">
          <div id="recent-history" className="glass-card border-gradient-premium p-8 sticky top-32">
            <h2 className="text-xl font-black text-white font-poppins tracking-tight mb-8">Recent History</h2>

            {pastJobs.length === 0 ? (
              <div className="text-center py-12 text-white/20 font-bold uppercase tracking-widest text-[10px]">No activity recorded</div>
            ) : (
              <div className="space-y-6">
                {pastJobs.map(job => (
                  <div key={job._id} className="pb-6 border-b border-white/5 last:border-0 last:pb-0 group">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-sm font-bold text-white group-hover:text-neon-blue transition-colors">{job.customer?.name}</span>
                      <span className="text-sm font-black text-white tracking-tighter">৳{job.estimatedPrice}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">{format(new Date(job.date), 'MMM dd, yyyy')}</span>
                      {job.status === 'completed' ? (
                        <span className="text-neon-green text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md bg-neon-green/10 border border-neon-green/20">Completed</span>
                      ) : (
                        <span className="text-red-400 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md bg-red-400/10 border border-red-400/20">Declined</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => toast('Full History feature is coming soon!', 'info')}
              className="w-full mt-8 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-[10px] font-black text-white/40 hover:text-white uppercase tracking-widest transition-all"
            >
              View Full History
            </button>
          </div>

          {/* Quick Support Card */}
          <div className="glass-card p-8 border-gradient-premium relative overflow-hidden bg-gradient-to-br from-neon-blue/20 to-neon-purple/20">
            <h3 className="text-lg font-black text-white font-poppins tracking-tight mb-2">Need Help?</h3>
            <p className="text-xs font-bold text-white/40 opacity-80 mb-6 uppercase tracking-wider">Our support team is available 24/7</p>
            <button
              onClick={() => window.location.href = 'mailto:support@servigo.com'}
              className="px-6 py-3 bg-white text-[#0f172a] rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all"
            >
              Contact Support
            </button>
          </div>
        </div>
      </div>

      {activeChat && (
        <ChatBox
          booking={activeChat}
          currentUser={currentUser}
          onClose={() => setActiveChat(null)}
        />
      )}

      <LocationBroadcaster activeBookings={bookings} />
    </DashboardLayout>
  );
};

export default WorkerDashboard;
