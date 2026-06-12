import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../components/Toast';
import {
  User,
  Mail,
  Phone,
  Briefcase,
  DollarSign,
  FileText,
  Image as ImageIcon,
  Save,
  ArrowLeft,
  CheckCircle2
} from 'lucide-react';
import api from '../services/api';
import DashboardLayout from '../components/dashboard/DashboardLayout';

const WorkerProfileSettings = ({ currentUser, setCurrentUser }) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    bio: '',
    skills: '',
    pricePerHour: '',
    photoUrl: ''
  });

  useEffect(() => {
    if (!currentUser || currentUser.role !== 'worker') {
      navigate('/login');
      return;
    }

    // Load current data
    setFormData({
      name: currentUser.name || '',
      phone: currentUser.phone || '',
      bio: currentUser.bio || '',
      skills: currentUser.skills ? currentUser.skills.join(', ') : '',
      pricePerHour: currentUser.pricePerHour || '',
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
      const payload = {
        ...formData,
        skills: formData.skills.split(',').map(s => s.trim()).filter(s => s !== ''),
        pricePerHour: Number(formData.pricePerHour)
      };

      const res = await api.put(`/workers/${currentUser._id}`, payload);

      // Update local storage and state
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
          onClick={() => navigate('/worker-dashboard')}
          className="flex items-center gap-2 text-white/40 hover:text-white transition-colors mb-8 group font-bold uppercase tracking-widest text-[10px]"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          Back to Dashboard
        </button>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
          <div>
            <h1 className="text-4xl font-black text-white font-poppins tracking-tighter mb-2">
              Profile <span className="text-gradient">Settings</span>
            </h1>
            <p className="text-white/60 font-bold text-sm tracking-wide uppercase">
              Update your professional information and public profile
            </p>
          </div>

          {success && (
            <div className="flex items-center gap-3 bg-neon-green/10 border border-neon-green/20 text-neon-green px-6 py-4 rounded-2xl animate-in fade-in slide-in-from-top-4 duration-500">
              <CheckCircle2 size={20} />
              <span className="font-bold text-sm uppercase tracking-wider">Changes saved successfully!</span>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Left Column: Basic Info */}
          <div className="lg:col-span-2 space-y-8">
            <div className="glass-card border-gradient-premium p-8 md:p-10">
              <h2 className="text-xl font-black text-white font-poppins tracking-tight mb-8 flex items-center gap-3">
                <User size={20} className="text-neon-blue" />
                Personal Details
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
              </div>

              <div className="mt-8 space-y-2">
                <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Professional Bio</label>
                <div className="relative group">
                  <FileText className="absolute left-4 top-5 text-white/20 group-focus-within:text-neon-blue transition-colors" size={18} />
                  <textarea
                    name="bio"
                    value={formData.bio}
                    onChange={handleChange}
                    rows="4"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white font-bold outline-none focus:border-neon-blue focus:ring-4 focus:ring-neon-blue/10 transition-all resize-none"
                    placeholder="Tell clients about your experience and expertise..."
                  ></textarea>
                </div>
              </div>
            </div>

            <div className="glass-card border-gradient-premium p-8 md:p-10">
              <h2 className="text-xl font-black text-white font-poppins tracking-tight mb-8 flex items-center gap-3">
                <Briefcase size={20} className="text-neon-purple" />
                Service Details
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Price Per Hour (৳)</label>
                  <div className="relative group">
                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-neon-purple transition-colors" size={18} />
                    <input
                      type="number"
                      name="pricePerHour"
                      value={formData.pricePerHour}
                      onChange={handleChange}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white font-bold outline-none focus:border-neon-purple focus:ring-4 focus:ring-neon-purple/10 transition-all"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Skills (comma separated)</label>
                  <div className="relative group">
                    <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-neon-purple transition-colors" size={18} />
                    <input
                      type="text"
                      name="skills"
                      value={formData.skills}
                      onChange={handleChange}
                      placeholder="Wiring, Fan Repair, etc."
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white font-bold outline-none focus:border-neon-purple focus:ring-4 focus:ring-neon-purple/10 transition-all"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Profile Photo */}
          <div className="space-y-8">
            <div className="glass-card border-gradient-premium p-8">
              <h2 className="text-lg font-black text-white font-poppins tracking-tight mb-6">Profile Photo</h2>

              <div className="flex flex-col items-center gap-6">
                <div className="relative group">
                  <img
                    src={formData.photoUrl || `https://ui-avatars.com/api/?name=${formData.name}&background=7F5AF0&color=fff`}
                    alt="Profile"
                    className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-glow-purple transition-transform group-hover:scale-105"
                  />
                  <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                    <ImageIcon className="text-white" size={24} />
                  </div>
                </div>

                <div className="w-full space-y-2">
                  <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Photo URL</label>
                  <input
                    type="text"
                    name="photoUrl"
                    value={formData.photoUrl}
                    onChange={handleChange}
                    placeholder="https://example.com/photo.jpg"
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-xs text-white font-bold outline-none focus:border-neon-purple transition-all"
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

export default WorkerProfileSettings;
