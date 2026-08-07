import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Calendar, MapPin, CreditCard, AlertCircle, ChevronLeft, CheckCircle2 } from 'lucide-react';
import api from '../services/api';
import { useToast } from '../components/Toast';
import { ErrorState, LoadingState } from '../components/AsyncState';

const Booking = () => {
  const { workerId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [worker, setWorker] = useState(null);
  const [loadingWorker, setLoadingWorker] = useState(true);
  const [workerError, setWorkerError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    date: '',
    time: '',
    address: '',
    description: ''
  });

  const fetchWorker = useCallback(async () => {
    try {
      const res = await api.get(`/workers/${workerId}`);
      setWorker(res.data);
      setWorkerError('');
    } catch (requestError) {
      console.error('Error fetching worker', requestError);
      setWorkerError('This professional could not be loaded. They may no longer be available.');
    } finally {
      setLoadingWorker(false);
    }
  }, [workerId]);

  useEffect(() => {
    const request = window.setTimeout(fetchWorker, 0);
    return () => window.clearTimeout(request);
  }, [fetchWorker]);

  const retryWorker = () => {
    setLoadingWorker(true);
    setWorkerError('');
    fetchWorker();
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const estimatedHours = 2; // Fixed for demo

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const bookingDate = new Date(`${formData.date}T${formData.time}`);
      if (Number.isNaN(bookingDate.getTime()) || bookingDate <= new Date()) {
        toast('Please select a valid future date and time.', 'error');
        return;
      }

      const bookingData = {
        worker: workerId,
        date: bookingDate,
        address: formData.address.trim(),
        description: formData.description.trim(),
        paymentMethod: 'Cash'
      };

      await api.post('/bookings', bookingData);
      toast('Booking request created successfully.', 'success');
      navigate('/customer-dashboard');
    } catch (error) {
      toast(error.response?.data?.message || 'Failed to create booking. Please try again.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingWorker) return <LoadingState message="Loading booking details..." />;
  if (workerError) return <div className="min-h-screen bg-premium-radial px-4 py-24"><div className="mx-auto max-w-3xl"><ErrorState message={workerError} onRetry={retryWorker} /></div></div>;
  if (!worker) return null;

  return (
    <div className="min-h-screen pb-16 bg-premium-radial">
      {/* Header */}
      <div className="glass-premium pt-6 pb-6 px-4 shadow-sm border-b border-white/10">
        <div className="container mx-auto max-w-5xl">
          <Link to={`/worker/${worker._id}`} className="inline-flex items-center text-gray-500 hover:text-primary-start mb-2 transition font-medium text-sm">
            <ChevronLeft size={18} className="mr-1" /> Back to Profile
          </Link>
          <h1 className="text-3xl font-black text-white font-poppins tracking-tighter">Secure Booking</h1>
        </div>
      </div>

      <div className="container mx-auto px-4 max-w-5xl mt-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="glass-premium rounded-3xl shadow-glow-blue/10 p-6 md:p-8 border border-white/10">

              <div className="mb-8">
                <h3 className="text-xl font-black text-white mb-5 font-poppins flex items-center gap-2 uppercase tracking-tight">
                  <CheckCircle2 size={22} className="text-neon-blue shadow-glow-blue" /> Job Details
                </h3>
                <label className="block text-xs font-black text-white/40 uppercase tracking-widest mb-2">Describe the problem</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  required
                  rows="3"
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-4 focus:ring-2 focus:ring-primary-start/20 focus:border-primary-start outline-none transition text-white placeholder-gray-500 resize-none"
                  placeholder="E.g., Kitchen sink pipe is leaking..."
                ></textarea>
              </div>

              <div className="mb-8">
                <h3 className="text-xl font-black text-white mb-5 font-poppins flex items-center gap-2 uppercase tracking-tight">
                  <MapPin size={22} className="text-neon-blue shadow-glow-blue" /> Location
                </h3>
                <label className="block text-xs font-black text-white/40 uppercase tracking-widest mb-2">Service Address</label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-4 focus:ring-2 focus:ring-primary-start/20 focus:border-primary-start outline-none transition text-white placeholder-gray-500"
                  placeholder="House, Road, Area, City"
                />
              </div>

              <div className="mb-8">
                <h3 className="text-xl font-black text-white mb-5 font-poppins flex items-center gap-2 uppercase tracking-tight">
                  <Calendar size={22} className="text-neon-blue shadow-glow-blue" /> Schedule
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-black text-white/40 uppercase tracking-widest mb-2">Date</label>
                    <input
                      type="date"
                      name="date"
                      value={formData.date}
                      onChange={handleChange}
                      required
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-4 focus:ring-2 focus:ring-primary-start/20 focus:border-primary-start outline-none transition text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-white/40 uppercase tracking-widest mb-2">Time</label>
                    <input
                      type="time"
                      name="time"
                      value={formData.time}
                      onChange={handleChange}
                      required
                      className="w-full bg-white/5 border border-white/10 rounded-xl p-4 focus:ring-2 focus:ring-primary-start/20 focus:border-primary-start outline-none transition text-white"
                    />
                  </div>
                </div>
              </div>

              <div className="mb-8">
                <h3 className="text-xl font-black text-white mb-5 font-poppins flex items-center gap-2 uppercase tracking-tight">
                  <CreditCard size={22} className="text-neon-blue shadow-glow-blue" /> Payment Method
                </h3>
                <div className="border-2 border-neon-blue/40 rounded-2xl p-4 bg-neon-blue/10">
                  <span className="block text-xs font-black uppercase tracking-widest text-white">Cash</span>
                  <span className="mt-1 block text-xs text-white/60">Online payments are temporarily unavailable.</span>
                </div>
              </div>

              <button type="submit" disabled={submitting} className="w-full bg-gradient-primary hover:opacity-90 text-white font-bold py-4 rounded-2xl shadow-soft-lg transition-transform hover:scale-[1.01] text-lg font-poppins disabled:cursor-not-allowed disabled:opacity-60">
                {submitting ? 'Creating Booking...' : 'Confirm Booking'}
              </button>
            </form>
          </div>

          {/* Summary Sidebar */}
          <div className="lg:col-span-1">
            <div className="glass-premium rounded-3xl shadow-glow-blue/10 p-6 sticky top-24 border border-white/10">
              <h3 className="text-xl font-black mb-6 font-poppins text-white uppercase tracking-tight">Service Summary</h3>

              <div className="flex items-center gap-4 mb-6 bg-white/5 p-4 rounded-2xl border border-white/5">
                <img
                  src={worker.photoUrl || "https://ui-avatars.com/api/?name=" + worker.name + "&background=7F5AF0&color=fff"}
                  alt={worker.name}
                  className="w-14 h-14 rounded-full object-cover shadow-sm border-2 border-white"
                />
                <div>
                  <h4 className="font-black text-white font-poppins tracking-tight">{worker.name}</h4>
                  <p className="text-xs font-bold text-white/60 uppercase tracking-widest">{worker.category?.name}</p>
                </div>
              </div>

              <div className="space-y-4 text-sm text-white/40 mb-6 border-b border-white/10 pb-6">
                <div className="flex justify-between font-bold">
                  <span className="text-white/60 uppercase tracking-widest text-[10px]">Hourly Rate</span>
                  <span className="text-white tracking-tight">৳{worker.pricePerHour}</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span className="text-white/60 uppercase tracking-widest text-[10px]">Estimated Hours</span>
                  <span className="text-white tracking-tight">{estimatedHours} hrs</span>
                </div>
                <div className="flex items-start gap-2 bg-neon-blue/10 text-neon-blue p-4 rounded-xl mt-4 border border-neon-blue/20">
                  <AlertCircle size={16} className="mt-0.5 shrink-0" />
                  <span className="text-xs font-bold uppercase tracking-wide opacity-80">Final price may vary based on actual work completed. You'll pay directly after service.</span>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-white/40 font-black uppercase tracking-widest text-[10px]">Estimated Total</span>
                <span className="text-2xl font-black text-white font-poppins tracking-tighter">৳{worker.pricePerHour * estimatedHours}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Booking;
