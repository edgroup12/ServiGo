import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MapPin, Search, Star, Droplet, Zap, ThermometerSnowflake, Paintbrush, Hammer, Sparkles, ArrowRight } from 'lucide-react';
import api from '../services/api';

const iconMap = {
  Droplet: <Droplet size={28} />,
  Zap: <Zap size={28} />,
  ThermometerSnowflake: <ThermometerSnowflake size={28} />,
  Paintbrush: <Paintbrush size={28} />,
  Hammer: <Hammer size={28} />,
  Sparkles: <Sparkles size={28} />
};

const Home = () => {
  const [categories, setCategories] = useState([]);
  const [featuredWorkers, setFeaturedWorkers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const catRes = await api.get('/categories');
        setCategories(catRes.data);

        const workRes = await api.get('/workers');
        const workersData = workRes.data.workers || workRes.data;
        // Get top rated workers
        const sorted = workersData.sort((a, b) => b.rating - a.rating).slice(0, 4);
        setFeaturedWorkers(sorted);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };
    fetchData();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/services/all?search=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <div className="pb-16 min-h-screen">
      {/* Hero Section */}
      <div className="pt-12 pb-20 px-4 text-center relative overflow-hidden">
        {/* Soft Background Elements */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-neon-blue/5 rounded-full blur-3xl -z-10"></div>

        <h1 className="text-5xl md:text-6xl font-black mb-6 bg-gradient-to-r from-[var(--text-main)] to-[var(--neon-purple)] bg-clip-text text-transparent font-poppins tracking-tighter leading-[1.1]">
          How can we help you <br className="md:hidden" /> today?
        </h1>
        <p className="text-[var(--text-secondary)] mb-10 max-w-xl mx-auto text-lg font-medium">
          Book trusted professionals for your home instantly.
        </p>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="max-w-2xl mx-auto glass-premium rounded-2xl p-2 flex items-center shadow-glow-blue/10 border border-white/20">
          <div className="flex items-center text-white/40 pl-4 pr-3 border-r border-white/10">
            <MapPin size={22} className="text-primary-start" />
            <select className="bg-transparent border-none outline-none ml-2 text-sm text-white font-black uppercase tracking-widest cursor-pointer max-h-60">
              <optgroup label="ঢাকা বিভাগ">
                <option>Dhaka</option>
                <option>Gazipur</option>
                <option>Narayanganj</option>
                <option>Tangail</option>
                <option>Kishoreganj</option>
                <option>Manikganj</option>
                <option>Munshiganj</option>
                <option>Narsingdi</option>
                <option>Faridpur</option>
                <option>Gopalganj</option>
                <option>Madaripur</option>
                <option>Rajbari</option>
                <option>Shariatpur</option>
              </optgroup>
              <optgroup label="চট্টগ্রাম বিভাগ">
                <option>Chattogram</option>
                <option>Comilla</option>
                <option>Cox's Bazar</option>
                <option>Feni</option>
                <option>Brahmanbaria</option>
                <option>Noakhali</option>
                <option>Lakshmipur</option>
                <option>Chandpur</option>
                <option>Rangamati</option>
                <option>Khagrachhari</option>
                <option>Bandarban</option>
              </optgroup>
              <optgroup label="রাজশাহী বিভাগ">
                <option>Rajshahi</option>
                <option>Bogra</option>
                <option>Pabna</option>
                <option>Sirajganj</option>
                <option>Natore</option>
                <option>Nawabganj</option>
                <option>Naogaon</option>
                <option>Joypurhat</option>
              </optgroup>
              <optgroup label="খুলনা বিভাগ">
                <option>Khulna</option>
                <option>Jessore</option>
                <option>Satkhira</option>
                <option>Kushtia</option>
                <option>Meherpur</option>
                <option>Chuadanga</option>
                <option>Jhenaidah</option>
                <option>Magura</option>
                <option>Narail</option>
                <option>Bagerhat</option>
              </optgroup>
              <optgroup label="বরিশাল বিভাগ">
                <option>Barishal</option>
                <option>Patuakhali</option>
                <option>Bhola</option>
                <option>Pirojpur</option>
                <option>Jhalokathi</option>
                <option>Barguna</option>
              </optgroup>
              <optgroup label="সিলেট বিভাগ">
                <option>Sylhet</option>
                <option>Moulvibazar</option>
                <option>Habiganj</option>
                <option>Sunamganj</option>
              </optgroup>
              <optgroup label="রংপুর বিভাগ">
                <option>Rangpur</option>
                <option>Dinajpur</option>
                <option>Kurigram</option>
                <option>Gaibandha</option>
                <option>Nilphamari</option>
                <option>Lalmonirhat</option>
                <option>Thakurgaon</option>
                <option>Panchagarh</option>
              </optgroup>
              <optgroup label="ময়মনসিংহ বিভাগ">
                <option>Mymensingh</option>
                <option>Jamalpur</option>
                <option>Netrokona</option>
                <option>Sherpur</option>
              </optgroup>
            </select>
          </div>
          <input
            type="text"
            placeholder="Search for a service..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-grow px-4 outline-none text-white placeholder-white/30 bg-transparent font-bold"
          />
          <button type="submit" className="bg-gradient-primary hover:opacity-90 text-white p-3.5 rounded-xl transition shadow-md">
            <Search size={20} />
          </button>
        </form>
      </div>

      {/* Categories */}
      <div className="container mx-auto px-4 -mt-6">
        <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
          {categories.map(cat => (
            <Link
              to={`/services/${cat._id}`}
              key={cat._id}
              className="flex flex-col items-center p-5 bg-[var(--glass-bg)] hover:bg-white/10 border border-[var(--glass-border)] hover:border-white/20 text-[var(--text-main)] backdrop-blur-lg rounded-2xl shadow-soft transition-all hover:-translate-y-1 group"
            >
              <div className="text-neon-blue mb-4 p-4 bg-neon-blue/5 rounded-2xl group-hover:bg-neon-blue/10 transition-colors">
                {iconMap[cat.icon] || <Sparkles size={28} />}
              </div>
              <span className="font-black text-[var(--text-main)] text-[10px] uppercase tracking-widest">{cat.name}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Featured Workers */}
      <div className="container mx-auto px-4 mt-16">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-black text-[var(--text-main)] font-poppins tracking-tight">Top Rated Workers</h2>
            <p className="text-[var(--text-muted)] text-[10px] font-black uppercase tracking-widest mt-1">Highly recommended professionals nearby</p>
          </div>
          <Link to="/services/all" className="text-neon-blue font-semibold hover:opacity-80 text-sm flex items-center gap-1 transition">
            See All <ArrowRight size={16} />
          </Link>
        </div>

        {/* Horizontal scroll for mobile, grid for desktop */}
        <div className="flex overflow-x-auto pb-8 -mx-4 px-4 md:mx-0 md:px-0 md:grid md:grid-cols-2 lg:grid-cols-4 gap-6 snap-x hide-scrollbar">
          {featuredWorkers.map(worker => (
            <Link to={`/worker/${worker._id}`} key={worker._id} className="min-w-[280px] glass-premium rounded-3xl shadow-glow-blue/5 hover:shadow-glow-blue/20 transition-all group overflow-hidden block snap-center border border-white/10">
              <div className="p-6">
                <div className="flex justify-between items-start mb-6">
                  <div className="relative">
                    <img
                      src={worker.photoUrl || "https://ui-avatars.com/api/?name=" + worker.name + "&background=7F5AF0&color=fff"}
                      alt={worker.name}
                      className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-md group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute -bottom-1 -right-1 bg-accent w-5 h-5 rounded-full border-4 border-white"></div>
                  </div>
                  <div className="bg-neon-blue/10 backdrop-blur-sm text-neon-blue px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border border-neon-blue/10">
                    TOP RATED
                  </div>
                </div>

                <div>
                  <h3 className="font-black text-[var(--text-main)] text-xl font-poppins tracking-tight">{worker.name}</h3>
                  <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mt-1">{worker.category?.name || 'Service Professional'}</p>

                  <div className="flex items-center justify-between mt-6 pt-6 border-t border-[var(--glass-border)]">
                    <div className="flex items-center text-amber-500 bg-amber-500/10 backdrop-blur-sm px-2.5 py-1 rounded-lg border border-amber-500/10">
                      <Star size={14} fill="currentColor" />
                      <span className="font-bold ml-1.5 text-[var(--text-main)] text-xs">{worker.rating}</span>
                      <span className="text-[var(--text-muted)] text-[9px] font-black uppercase tracking-widest ml-1">({worker.reviewCount})</span>
                    </div>
                    <div className="text-[var(--text-main)] font-black tracking-tight">
                      ৳{worker.pricePerHour}<span className="text-[var(--text-muted)] text-[10px] font-normal uppercase tracking-widest ml-0.5">/hr</span>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <style>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
};

export default Home;
