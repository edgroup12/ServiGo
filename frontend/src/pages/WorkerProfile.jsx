import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Star, MapPin, CheckCircle, Shield, ChevronLeft, ArrowRight, Info } from 'lucide-react';
import api from '../services/api';
import { ErrorState, LoadingState } from '../components/AsyncState';

const WorkerProfile = () => {
  const { workerId } = useParams();
  const navigate = useNavigate();
  const [worker, setWorker] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    const fetchWorker = async () => {
      try {
        setLoading(true);
        setError('');
        const res = await api.get(`/workers/${workerId}`);
        setWorker(res.data);
      } catch (requestError) {
        setWorker(null);
        setError(requestError.response?.data?.message || 'This professional could not be loaded. Check your connection and try again.');
      } finally {
        setLoading(false);
      }
    };
    fetchWorker();
  }, [workerId, retryKey]);

  if (loading) return <LoadingState message="Loading professional profile..." />;
  if (error || !worker) {
    return (
      <div className="min-h-screen px-4 py-24">
        <div className="mx-auto max-w-3xl">
          <ErrorState message={error || 'Professional not found.'} onRetry={() => setRetryKey(key => key + 1)} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-32 bg-premium-radial">
      {/* Cover Header */}
      <div className="h-64 bg-gradient-to-br from-primary-start/20 to-primary-end/20 relative rounded-b-[40px] shadow-soft">
        <Link to={`/services/${worker.category?._id || 'all'}`} className="absolute top-6 left-4 bg-white/10 backdrop-blur-md p-2 rounded-full text-white hover:bg-white/20 transition z-20 border border-white/10">
          <ChevronLeft size={24} />
        </Link>
      </div>

      <div className="container mx-auto px-4 -mt-24 relative z-10 max-w-4xl">
        <div className="glass-premium rounded-3xl shadow-glow-blue/10 p-6 md:p-8 mb-8 border border-white/10">
          <div className="flex flex-col items-center text-center -mt-20 mb-6">
            <div className="relative">
              <img
                src={worker.photoUrl || "https://ui-avatars.com/api/?name=" + worker.name + "&background=7F5AF0&color=fff"}
                alt={worker.name}
                className="w-32 h-32 rounded-full border-4 border-white shadow-md object-cover"
              />
              {worker.isAvailable && (
                <div className="absolute bottom-1 right-2 bg-accent w-6 h-6 rounded-full border-4 border-white shadow-sm"></div>
              )}
            </div>

            <h1 className="text-3xl font-black text-white flex items-center justify-center gap-2 mt-4 font-poppins tracking-tighter">
              {worker.name}
              <CheckCircle size={22} className="text-neon-blue shadow-glow-blue" />
            </h1>
            <p className="text-white/60 font-black uppercase tracking-widest text-xs mt-1">{worker.category?.name || 'Professional'}</p>

            <div className="flex flex-wrap justify-center gap-4 mt-5 text-sm">
              <div className="flex items-center text-amber-500 bg-amber-500/10 px-3 py-1.5 rounded-xl font-bold border border-amber-500/10">
                <Star size={18} fill="currentColor" className="mr-1.5" />
                {worker.rating} <span className="text-white/40 font-normal ml-1">({worker.reviewCount})</span>
              </div>
              <div className="flex items-center bg-white/5 text-gray-400 px-3 py-1.5 rounded-xl font-bold border border-white/10">
                <MapPin size={16} className="mr-1.5 text-primary-start" />
                {Number.isFinite(worker.distance) ? `${worker.distance} km away` : 'Location available on booking'}
              </div>
              <div className="flex items-center bg-neon-green/10 text-neon-green px-3 py-1.5 rounded-xl font-bold border border-neon-green/20">
                <Shield size={16} className="mr-1.5" />
                Verified
              </div>
            </div>
          </div>

          <div className="border-t border-[var(--glass-border)] pt-8 mb-8">
            <h3 className="text-xl font-black text-white mb-4 font-poppins flex items-center gap-2 uppercase tracking-tight">
              <Info size={20} className="text-neon-blue" /> About
            </h3>
            <p className="text-white/70 leading-relaxed font-medium">{worker.bio || `Hi, I'm ${worker.name}. I provide top-quality ${worker.category?.name || 'services'} with over 5 years of experience.`}</p>
          </div>

          <div className="border-t border-white/5 pt-8">
            <h3 className="text-xl font-black text-white mb-4 font-poppins uppercase tracking-tight">Expertise</h3>
            <div className="flex flex-wrap gap-3">
              {worker.skills?.map((skill, index) => (
                <span key={index} className="bg-primary-start/10 backdrop-blur-sm text-primary-start px-4 py-2 rounded-xl font-bold text-xs uppercase tracking-wide border border-primary-start/10">
                  {skill}
                </span>
              ))}
              {(!worker.skills || worker.skills.length === 0) && (
                <span className="bg-gray-50 text-gray-500 px-4 py-2 rounded-xl font-medium">General Service</span>
              )}
            </div>
          </div>
        </div>

        <div className="glass-premium rounded-3xl border border-white/10 p-6 shadow-glow-blue/10 md:p-8">
          <h3 className="font-poppins text-xl font-black uppercase tracking-tight text-white">Ready to book?</h3>
          <p className="mt-3 text-sm font-medium leading-relaxed text-white/60">
            Choose your preferred date, time, address, and payment method securely on the next step.
          </p>
        </div>
      </div>

      {/* Sticky Bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-black/40 backdrop-blur-2xl border-t border-white/10 p-4 shadow-[0_-10px_40px_-10px_rgba(0,0,0,0.5)] z-50">
        <div className="container mx-auto flex max-w-4xl items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Hourly rate</p>
            <div className="font-poppins text-xl font-black tracking-tighter text-white sm:text-2xl">৳{worker.pricePerHour || 0}<span className="text-sm font-normal text-white/40">/hr</span></div>
          </div>
          <button
            onClick={() => navigate(`/book/${worker._id}`)}
            disabled={!worker.isAvailable}
            className="flex shrink-0 items-center gap-2 rounded-2xl bg-gradient-primary px-5 py-3 font-bold text-white shadow-soft-lg transition-transform hover:scale-105 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100 sm:px-8 sm:py-4"
          >
            {worker.isAvailable ? 'Book Now' : 'Unavailable'} <ArrowRight size={20} />
          </button>
        </div>
      </div>

      <div className="h-20"></div>
    </div>
  );
};

export default WorkerProfile;
