import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../components/Toast';
import {
  User,
  Mail,
  Phone,
  Save,
  ArrowLeft,
  CheckCircle2,
  MapPin
} from 'lucide-react';
import api from '../services/api';
import DashboardLayout from '../components/dashboard/DashboardLayout';

const CustomerProfileSettings = ({ currentUser, setCurrentUser }) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    photoUrl: ''
  });

  useEffect(() => {
    if (!currentUser || currentUser.role !== 'customer') {
      navigate('/login');
      return;
    }

    setFormData({
      name: currentUser.name || '',
      phone: currentUser.phone || '',
      address: currentUser.address || '',
      photoUrl: currentUser.photoUrl || ''
    });
  }, [currentUser, navigate]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);

    try {
      const res = await api.put(`/customers/${currentUser._id}`, formData);

      const updatedUser = { ...currentUser, ...res.data };
      setCurrentUser(updatedUser);
      localStorage.setItem('servigo_user', JSON.stringify(updatedUser));

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error('Error updating profile:', error);
      toast('Failed to update profile. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout user={currentUser} setCurrentUser={setCurrentUser}>
      <div className="max-w-4xl mx-auto pb-20">
        <button
          onClick={() => navigate('/customer-dashboard')}
          className="flex items-center gap-2 text-white/40 hover:text-white transition-colors mb-8 group font-bold uppercase tracking-widest text-[10px]"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          Back to Dashboard
        </button>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
          <div>
            <h1 className="text-4xl font-black text-white font-poppins tracking-tighter mb-2">
              My <span className="text-gradient">Profile</span>
            </h1>
            <p className="text-white/60 font-bold text-sm tracking-wide uppercase">
              Manage your personal information and contact details
            </p>
          </div>

          {success && (
            <div className="flex items-center gap-3 bg-neon-green/10 border border-neon-green/20 text-neon-green px-6 py-4 rounded-2xl animate-in fade-in slide-in-from-top-4 duration-500">
              <CheckCircle2 size={20} />
              <span className="font-bold text-sm uppercase tracking-wider">Profile updated!</span>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          <div className="lg:col-span-2 space-y-8">
            <div className="glass-card border-gradient-premium p-8 md:p-10">
              <h2 className="text-xl font-black text-white font-poppins tracking-tight mb-8 flex items-center gap-3">
                <User size={20} className="text-neon-blue" />
                Account Information
              </h2>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Full Name</label>
                  <div className="relative group">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-neon-blue transition-colors" size={18} />
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white font-bold outline-none focus:border-neon-blue focus:ring-4 focus:ring-neon-blue/10 transition-all"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Phone Number</label>
                  <div className="relative group">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-neon-blue transition-colors" size={18} />
                    <input
                      type="text"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white font-bold outline-none focus:border-neon-blue focus:ring-4 focus:ring-neon-blue/10 transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Default Service Address</label>
                  <div className="relative group">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-neon-blue transition-colors" size={18} />
                    <input
                      type="text"
                      name="address"
                      value={formData.address}
                      onChange={handleChange}
                      placeholder="Enter your street address"
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white font-bold outline-none focus:border-neon-blue focus:ring-4 focus:ring-neon-blue/10 transition-all"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-8">
            <div className="glass-card border-gradient-premium p-8">
              <h2 className="text-lg font-black text-white font-poppins tracking-tight mb-6">Profile Photo</h2>

              <div className="flex flex-col items-center gap-6">
                <div className="relative group">
                  <img
                    src={formData.photoUrl || `https://ui-avatars.com/api/?name=${formData.name}&background=7F5AF0&color=fff`}
                    alt="Profile"
                    className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-glow-blue transition-transform group-hover:scale-105"
                  />
                </div>

                <div className="w-full space-y-2">
                  <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Photo URL</label>
                  <input
                    type="text"
                    name="photoUrl"
                    value={formData.photoUrl}
                    onChange={handleChange}
                    placeholder="https://example.com/photo.jpg"
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-xs text-white font-bold outline-none focus:border-neon-blue transition-all"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-primary hover:opacity-90 text-white font-black py-5 rounded-2xl shadow-glow-blue transition-all hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-3 uppercase tracking-[0.2em] text-xs"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  <Save size={18} />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
};

export default CustomerProfileSettings;
