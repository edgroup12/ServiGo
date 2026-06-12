import { useState, useEffect } from 'react';
import { useToast } from '../components/Toast';
import {
  Users,
  Briefcase,
  Calendar,
  DollarSign,
  Trash2,
  ShieldCheck,
  TrendingUp,
  Search,
  Filter,
  UserCheck,
  UserX,
  BarChart3
} from 'lucide-react';
import api from '../services/api';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import StatCard from '../components/dashboard/StatCard';

const AdminDashboard = ({ currentUser, setCurrentUser, theme, toggleTheme }) => {
  const { toast } = useToast();
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [categoryDistribution, setCategoryDistribution] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    const fetchAdminData = async () => {
      try {
        const [statsRes, usersRes, bookingsRes, analyticsRes] = await Promise.all([
          api.get('/admin/stats'),
          api.get('/admin/users'),
          api.get('/admin/bookings'),
          api.get(`/analytics/${currentUser._id}`)
        ]);
        setStats(statsRes.data);
        setUsers(usersRes.data.users || usersRes.data);
        setBookings(bookingsRes.data.bookings || bookingsRes.data);
        if (analyticsRes.data) {
          setChartData(analyticsRes.data.trends || []);
          setCategoryDistribution(analyticsRes.data.categoryDistribution || []);
        }
      } catch (error) {
        console.error('Error fetching admin data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchAdminData();
  }, [currentUser?._id]);

  const handleDeleteUser = async (id) => {
    if (window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      try {
        await api.delete(`/admin/users/${id}`);
        setUsers(users.filter(u => u._id !== id));
      } catch (error) {
        toast('Failed to delete user', 'error');
      }
    }
  };

  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <DashboardLayout user={currentUser} setCurrentUser={setCurrentUser} theme={theme} toggleTheme={toggleTheme}>
        <div className="min-h-[60vh] flex flex-col items-center justify-center">
          <div className="w-16 h-16 border-4 border-neon-blue/20 border-t-neon-blue rounded-full animate-spin mb-4"></div>
          <p className="text-white/40 font-black uppercase tracking-widest text-xs">Loading Admin Portal...</p>
        </div>
      </DashboardLayout>
    );
  }

  const statCards = [
    { icon: Users, label: 'Total Users', value: stats?.totalUsers || 0, colorClass: 'bg-neon-blue', trend: '+12%' },
    { icon: Briefcase, label: 'Workers', value: stats?.totalWorkers || 0, colorClass: 'bg-neon-purple', trend: '+5' },
    { icon: Calendar, label: 'Bookings', value: stats?.totalBookings || 0, colorClass: 'bg-neon-teal', trend: '+18%' },
    { icon: DollarSign, label: 'Revenue', value: `৳${stats?.totalRevenue?.toLocaleString()}`, colorClass: 'bg-neon-green', trend: '+24%' },
  ];

  const displayChartData = chartData.length > 0
    ? chartData.map((val, i) => ({ name: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i] || `D${i + 1}`, val: Math.min(val, 100) }))
    : [];

  return (
    <DashboardLayout user={currentUser} setCurrentUser={setCurrentUser} theme={theme} toggleTheme={toggleTheme}>
      <div className="space-y-8 pb-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-white font-poppins tracking-tight">Admin Control Center</h1>
            <p className="text-white/40 text-xs font-black uppercase tracking-widest mt-1 flex items-center gap-2">
              <ShieldCheck size={14} className="text-neon-green" /> Platform Management System
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'overview' ? 'bg-neon-blue text-white shadow-glow-blue' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'users' ? 'bg-neon-blue text-white shadow-glow-blue' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}
            >
              User Management
            </button>
          </div>
        </div>

        {activeTab === 'overview' ? (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {statCards.map((stat, i) => (
                <StatCard key={i} {...stat} />
              ))}
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
              <div className="glass-premium p-8 rounded-[2.5rem] border-white/5">
                <div className="flex justify-between items-center mb-8">
                  <h3 className="text-lg font-black text-white uppercase tracking-tighter">Growth Analytics</h3>
                  <div className="bg-neon-blue/10 px-3 py-1 rounded-full border border-neon-blue/20">
                    <BarChart3 size={14} className="text-neon-blue" />
                  </div>
                </div>

                {/* Custom CSS Bar Chart */}
                <div className="h-[250px] flex items-end justify-between gap-2 px-2 mt-12">
                  {displayChartData.map((data, i) => (
                    <div key={i} className="flex-grow flex flex-col items-center group">
                      <div className="w-full relative">
                        <div
                          className="w-full bg-gradient-to-t from-neon-blue/20 to-neon-blue rounded-t-xl transition-all duration-700 group-hover:shadow-glow-blue group-hover:opacity-100 opacity-80"
                          style={{ height: `${data.val}%` }}
                        >
                          <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-neon-blue text-white text-[10px] font-black px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                            {data.val}%
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] font-black text-white/30 uppercase mt-4">{data.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="glass-premium p-8 rounded-[2.5rem] border-white/5 overflow-hidden">
                <h3 className="text-lg font-black text-white uppercase tracking-tighter mb-8">Category Distribution</h3>
                <div className="space-y-6">
                  {categoryDistribution.length > 0 ? (
                    categoryDistribution.map((item, i) => (
                      <div key={i} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                        <span className="text-white/60 text-xs font-bold uppercase tracking-widest">{item.name}</span>
                        <div className="flex items-center gap-3">
                          <div className="w-32 h-2 bg-white/10 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-neon-blue to-neon-purple rounded-full transition-all duration-700"
                              style={{ width: `${item.percentage}%` }}
                            ></div>
                          </div>
                          <span className="text-white font-black text-xs">{item.percentage}%</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-white/30 text-xs font-bold uppercase tracking-widest text-center py-8">No category data available yet</p>
                  )}
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="glass-premium rounded-[2.5rem] border-white/5 overflow-hidden">
            {/* User List Header */}
            <div className="p-8 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <h3 className="text-xl font-black text-white uppercase tracking-tighter">User Directory</h3>
                <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mt-1">Managing {users.length} registered members</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={16} />
                  <input
                    type="text"
                    placeholder="Search name or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white outline-none focus:border-neon-blue/50 transition-all w-64 font-bold"
                  />
                </div>
                <button className="p-2.5 bg-white/5 rounded-xl border border-white/10 text-white/40 hover:text-white transition-all">
                  <Filter size={18} />
                </button>
              </div>
            </div>

            {/* User Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-white/5 bg-white/[0.02]">
                    <th className="px-8 py-6 text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">User Profile</th>
                    <th className="px-8 py-6 text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Role</th>
                    <th className="px-8 py-6 text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Status</th>
                    <th className="px-8 py-6 text-[10px] font-black text-white/30 uppercase tracking-[0.2em] text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredUsers.map((user) => (
                    <tr key={user._id} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <img
                            src={user.photoUrl || `https://ui-avatars.com/api/?name=${user.name}&background=7F5AF0&color=fff`}
                            className="w-10 h-10 rounded-xl object-cover border border-white/10"
                            alt=""
                          />
                          <div>
                            <p className="text-white font-bold text-sm tracking-tight">{user.name}</p>
                            <p className="text-white/30 text-[11px] font-medium">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${user.role === 'admin' ? 'bg-neon-purple/10 text-neon-purple border-neon-purple/20' :
                          user.role === 'worker' ? 'bg-neon-blue/10 text-neon-blue border-neon-blue/20' :
                            'bg-neon-teal/10 text-neon-teal border-neon-teal/20'
                          }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-neon-green"></span>
                          <span className="text-white/60 text-[10px] font-black uppercase tracking-widest">Active</span>
                        </div>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button className="p-2 bg-white/5 rounded-lg border border-white/10 text-white/40 hover:text-white transition-all">
                            <ShieldCheck size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user._id)}
                            className="p-2 bg-red-500/5 rounded-lg border border-red-500/10 text-red-400 hover:bg-red-500/20 transition-all"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;
