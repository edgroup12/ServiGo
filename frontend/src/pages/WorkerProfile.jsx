import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Star, MapPin, CheckCircle, Shield, ChevronLeft, ArrowRight, Clock, Info } from 'lucide-react';
import api from '../services/api';

const WorkerProfile = () => {
  const { workerId } = useParams();
  const navigate = useNavigate();
  const [worker, setWorker] = useState(null);
  const [loading, setLoading] = useState(true);

  // Dummy scheduling state
  const [selectedDate, setSelectedDate] = useState(0);
  const [selectedTime, setSelectedTime] = useState(null);

  useEffect(() => {
    const fetchWorker = async () => {
      try {
        const res = await api.get(`/workers/${workerId}`);
        setWorker(res.data);
      } catch (error) {
        console.error('Error fetching worker', error);
      } finally {
        setLoading(false);
      }
    };
    fetchWorker();
  }, [workerId]);

  if (loading) return <div className="flex justify-center items-center min-h-screen"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-start"></div></div>;
  if (!worker) return <div className="text-center py-20 text-red-500">Worker not found.</div>;

  const generateDates = () => {
    const dates = [];
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    for (let i = 0; i < 5; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      dates.push({
        day: days[d.getDay()],
        date: d.getDate().toString(),
        fullDate: d.toISOString().split('T')[0]
      });
    }
    return dates;
  };

  const dates = generateDates();
  const currentMonthYear = new Date().toLocaleString('default', { month: 'long', year: 'numeric' });

  const times = ['09:00 AM', '10:00 AM', '11:30 AM', '01:00 PM', '03:00 PM', '05:00 PM'];

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
                {worker.distance} km away
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

        {/* Scheduling UI */}
        <div className="glass-premium rounded-3xl shadow-glow-blue/10 p-6 md:p-8 mb-8 border border-white/10">
          <h3 className="text-xl font-black text-white mb-6 font-poppins flex items-center gap-2 uppercase tracking-tight">
            <Clock size={20} className="text-neon-purple" /> Select Date & Time
          </h3>

          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <span className="font-bold text-white/80 uppercase tracking-widest text-xs">{currentMonthYear}</span>
            </div>
            {/* Horizontal Calendar */}
            <div className="flex gap-3 overflow-x-auto pb-4 hide-scrollbar">
              {dates.map((d, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedDate(i)}
                  className={`flex flex-col items-center justify-center min-w-[70px] h-[90px] rounded-2xl transition-all ${selectedDate === i ? 'bg-gradient-primary shadow-glow-blue text-white' : 'bg-white/5 text-gray-500 hover:bg-white/10 border border-white/10'}`}
                >
                  <span className={`text-xs font-bold mb-1 ${selectedDate === i ? 'text-white/80' : 'text-gray-500 uppercase tracking-widest text-[10px]'}`}>{d.day}</span>
                  <span className={`text-2xl font-black font-poppins ${selectedDate === i ? 'text-white' : 'text-white/90'}`}>{d.date}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="font-bold text-white/40 uppercase tracking-widest text-[10px] block mb-4">Available Slots</span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {times.map((t, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedTime(i)}
                  className={`py-3 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all ${selectedTime === i ? 'bg-neon-blue/20 text-white border-2 border-neon-blue shadow-glow-blue' : 'bg-white/5 border border-white/10 text-white/50 hover:border-white/30 hover:bg-white/10'}`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-black/40 backdrop-blur-2xl border-t border-white/10 p-4 shadow-[0_-10px_40px_-10px_rgba(0,0,0,0.5)] z-50">
        <div className="container mx-auto max-w-4xl flex justify-between items-center">
          <div>
            <p className="text-white/40 text-[10px] font-black uppercase tracking-widest">Total Price</p>
            <div className="text-2xl font-black text-white font-poppins tracking-tighter">৳{worker.pricePerHour}<span className="text-sm font-normal text-white/40">/hr</span></div>
          </div>
          <button
            onClick={() => navigate(`/book/${worker._id}`)}
            className="bg-gradient-primary hover:opacity-90 text-white font-bold py-4 px-8 rounded-2xl shadow-soft-lg transition-transform hover:scale-105 flex items-center gap-2"
          >
            Book Now <ArrowRight size={20} />
          </button>
        </div>
      </div>

      <div className="h-20"></div>
    </div>
  );
};

export default WorkerProfile;
