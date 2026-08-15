import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useToast } from '../components/Toast';
import {
  Users,
  Briefcase,
  Calendar,
  DollarSign,
  Trash2,
  ShieldCheck,
  Search,
  Filter,
  BarChart3,
  X
} from 'lucide-react';
import api from '../services/api';
import DashboardLayout from '../components/dashboard/DashboardLayout';
import StatCard from '../components/dashboard/StatCard';
import { EmptyState, ErrorState, LoadingState } from '../components/AsyncState';

const AdminDashboard = ({ currentUser, setCurrentUser, theme, toggleTheme }) => {
  const { toast } = useToast();
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [categoryDistribution, setCategoryDistribution] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();

  const fetchAdminData = useCallback(async () => {
    try {
      const [statsRes, usersRes, analyticsRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/users'),
        api.get(`/analytics/${currentUser._id}`)
      ]);
      setError('');
      setStats(statsRes.data);
      setUsers(usersRes.data.users || usersRes.data);
      setChartData(analyticsRes.data?.trends || []);
      setCategoryDistribution(analyticsRes.data?.categoryDistribution || []);
    } catch (requestError) {
      console.error('Error fetching admin data:', requestError);
      setError('Admin data could not be loaded. Check the API connection and try again.');
    } finally {
      setLoading(false);
    }
  }, [currentUser._id]);

  useEffect(() => {
    const request = window.setTimeout(fetchAdminData, 0);
    return () => window.clearTimeout(request);
  }, [fetchAdminData]);

  const activeTab = searchParams.get('tab') === 'users' ? 'users' : 'overview';

  const handleTabChange = (tab) => {
    setSearchParams({ tab });
  };

  const handleNavbarSearch = (query) => {
    setSearchQuery(query);
    setSearchParams({ tab: 'users' });
  };

  const retryFetch = () => {
    setLoading(true);
    setError('');
    fetchAdminData();
  };

  const handleDeleteUser = async (id) => {
    if (window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      try {
        await api.delete(`/admin/users/${id}`);
        setUsers(users.filter(u => u._id !== id));
      } catch {
        toast('Failed to delete user', 'error');
      }
    }
  };

  const filteredUsers = users.filter(u => {
    const normalizedQuery = searchQuery.toLowerCase();
    const matchesSearch = u.name?.toLowerCase().includes(normalizedQuery) ||
      u.email?.toLowerCase().includes(normalizedQuery);
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  if (loading) {
    return (
      <DashboardLayout user={currentUser} setCurrentUser={setCurrentUser} theme={theme} toggleTheme={toggleTheme}>
        <LoadingState message="Loading admin portal..." />
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

  if (error) {
    return (
      <DashboardLayout user={currentUser} setCurrentUser={setCurrentUser} theme={theme} toggleTheme={toggleTheme}>
        <ErrorState message={error} onRetry={retryFetch} />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      user={currentUser}
      setCurrentUser={setCurrentUser}
      theme={theme}
      toggleTheme={toggleTheme}
      onSearch={handleNavbarSearch}
      searchPlaceholder="Search users by name or email..."
    >
      <div className="space-y-8 pb-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-white font-poppins tracking-tight">Admin Control Center</h1>
            <p className="text-white/40 text-xs font-black uppercase tracking-widest mt-1 flex items-center gap-2">
              <ShieldCheck size={14} className="text-neon-green" /> Platform Management System
            </p>
          </div>
          <div className="flex w-full gap-2 overflow-x-auto pb-1 md:w-auto">
            <button
              onClick={() => handleTabChange('overview')}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'overview' ? 'bg-neon-blue text-white shadow-glow-blue' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}
            >
              Overview
            </button>
            <button
              onClick={() => handleTabChange('users')}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'users' ? 'bg-neon-blue text-white shadow-glow-blue' : 'bg-white/5 text-white/40 hover:bg-white/10'}`}
            >
              User Management
            </button>
          </div>
        </div>

        {activeTab === 'overview' ? (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {statCards.map((stat, i) => (
                <StatCard key={i} {...stat} />
              ))}
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
              <div className="glass-premium p-5 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] border-white/5">
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

              <div className="glass-premium p-5 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] border-white/5 overflow-hidden">
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
              <div className="flex w-full items-center gap-3 md:w-auto md:gap-4">
                <div className="relative flex-1 md:flex-none">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={16} />
                  <input
                    type="text"
                    placeholder="Search name or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white outline-none focus:border-neon-blue/50 transition-all w-full md:w-64 font-bold"
                  />
                </div>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowFilters(current => !current)}
                    className={`p-2.5 rounded-xl border transition-all ${roleFilter !== 'all' ? 'border-neon-blue/50 bg-neon-blue/15 text-neon-blue' : 'border-white/10 bg-white/5 text-white/40 hover:text-white'}`}
                    aria-label="Filter users by role"
                    aria-expanded={showFilters}
                    title="Filter users by role"
                  >
                    <Filter size={18} />
                  </button>
                  {showFilters && (
                    <div className="absolute right-0 top-full z-20 mt-2 w-44 rounded-xl border border-white/10 bg-slate-950 p-2 shadow-xl">
                      {['all', 'customer', 'worker', 'admin'].map(role => (
                        <button
                          key={role}
                          type="button"
                          onClick={() => {
                            setRoleFilter(role);
                            setShowFilters(false);
                          }}
                          className={`block w-full rounded-lg px-3 py-2 text-left text-[10px] font-black uppercase tracking-widest transition-colors ${roleFilter === role ? 'bg-neon-blue/15 text-neon-blue' : 'text-white/60 hover:bg-white/10 hover:text-white'}`}
                        >
                          {role === 'all' ? 'All roles' : role}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* User Table */}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-left">
                <thead>
                  <tr className="border-b border-white/5 bg-white/[0.02]">
                    <th className="px-8 py-6 text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">User Profile</th>
                    <th className="px-8 py-6 text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Role</th>
                    <th className="px-8 py-6 text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">Status</th>
                    <th className="px-8 py-6 text-[10px] font-black text-white/30 uppercase tracking-[0.2em] text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredUsers.length === 0 ? (
                    <tr><td colSpan="4" className="p-8"><EmptyState title="No users found" message="No users match your current search." compact /></td></tr>
                  ) : filteredUsers.map((user) => (
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
                        <div className="flex items-center justify-end gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={() => setSelectedUser(user)}
                            className="p-2 bg-white/5 rounded-lg border border-white/10 text-white/40 hover:text-white transition-all"
                            aria-label={`Inspect access for ${user.name}`}
                            title="Inspect account access"
                          >
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

      {selectedUser && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="access-dialog-title">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h2 id="access-dialog-title" className="text-lg font-black text-white">Account Access</h2>
                <p className="mt-1 text-xs font-bold text-white/40">Read-only account information</p>
              </div>
              <button type="button" onClick={() => setSelectedUser(null)} className="rounded-lg p-2 text-white/50 hover:bg-white/10 hover:text-white" aria-label="Close account access dialog">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between gap-4 border-b border-white/5 pb-3"><span className="text-white/40">Name</span><span className="text-right font-bold text-white">{selectedUser.name}</span></div>
              <div className="flex justify-between gap-4 border-b border-white/5 pb-3"><span className="text-white/40">Email</span><span className="text-right font-bold text-white">{selectedUser.email}</span></div>
              <div className="flex justify-between gap-4 border-b border-white/5 pb-3"><span className="text-white/40">Role</span><span className="font-bold uppercase text-neon-blue">{selectedUser.role}</span></div>
              <div className="flex justify-between gap-4"><span className="text-white/40">Account status</span><span className="font-bold text-neon-green">Active</span></div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default AdminDashboard;
