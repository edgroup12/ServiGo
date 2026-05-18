import React, { useState, useEffect } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { Star, MapPin, Filter, Search, ChevronLeft } from 'lucide-react';
import api from '../services/api';

const WorkerList = () => {
  const { categoryId } = useParams();
  const [searchParams] = useSearchParams();
  const searchFromUrl = searchParams.get('search') || '';
  
  const [workers, setWorkers] = useState([]);
  const [filteredWorkers, setFilteredWorkers] = useState([]);
  const [searchQuery, setSearchQuery] = useState(searchFromUrl);
  const [categoryName, setCategoryName] = useState('All Services');
  const [loading, setLoading] = useState(true);

  // New Filter States
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [minRating, setMinRating] = useState(0);
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const fetchWorkers = async () => {
      try {
        setLoading(true);
        let url = '/workers';
        if (categoryId && categoryId !== 'all') {
          url += `?category=${categoryId}`;
          const catRes = await api.get('/categories');
          const cat = catRes.data.find(c => c._id === categoryId);
          if (cat) setCategoryName(cat.name);
        }
        
        const res = await api.get(url);
        setWorkers(res.data.workers || res.data);
      } catch (error) {
        console.error('Error fetching workers', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchWorkers();
  }, [categoryId]);

  useEffect(() => {
    let filtered = [...workers];

    // 1. Search Query Filter
    if (searchQuery) {
      filtered = filtered.filter(w => 
        w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        w.category?.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // 2. Price Range Filter
    if (minPrice) {
      filtered = filtered.filter(w => w.pricePerHour >= Number(minPrice));
    }
    if (maxPrice) {
      filtered = filtered.filter(w => w.pricePerHour <= Number(maxPrice));
    }

    // 3. Rating Filter
    if (minRating > 0) {
      filtered = filtered.filter(w => w.rating >= minRating);
    }

    // 4. Availability Filter
    if (onlyAvailable) {
      filtered = filtered.filter(w => w.isAvailable);
    }

    setFilteredWorkers(filtered);
  }, [searchQuery, workers, minPrice, maxPrice, minRating, onlyAvailable]);

  return (
    <div className="min-h-screen pb-16 bg-premium-radial">
      {/* Header Area */}
      <div className="glass-premium pt-6 pb-8 px-4 shadow-sm border-b border-white/10">
        <div className="container mx-auto">
          <Link to="/" className="inline-flex items-center text-white/50 hover:text-white mb-6 transition font-black uppercase tracking-widest text-[10px]">
            <ChevronLeft size={18} className="mr-1" /> Back to Home
          </Link>
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <h1 className="text-3xl font-black text-white font-poppins tracking-tighter">{categoryName}</h1>
              <p className="text-white/60 mt-1.5 text-xs font-bold uppercase tracking-wide">Found {filteredWorkers.length} premium professionals nearby</p>
            </div>
            
            <div className="flex w-full md:w-auto gap-3">
              <div className="relative flex-grow md:w-64">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search size={16} className="text-white/40" />
                </div>
                <input 
                  type="text" 
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 outline-none text-white placeholder-white/30 font-bold focus:ring-2 focus:ring-neon-blue/20 transition-all" 
                  placeholder="Search by name..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <button 
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center justify-center gap-2 border px-4 py-2.5 rounded-xl transition shadow-sm font-bold text-xs uppercase tracking-widest ${showFilters ? 'bg-neon-blue border-neon-blue text-white shadow-glow-blue/20' : 'bg-white/5 border-white/10 text-white/80 hover:bg-white/10'}`}
              >
                <Filter size={18} />
                <span className="hidden sm:inline">Filters</span>
              </button>
            </div>
          </div>

          {/* Advanced Filter Panel */}
          {showFilters && (
            <div className="mt-8 pt-8 border-t border-white/10 grid grid-cols-1 md:grid-cols-3 gap-8 animate-in fade-in slide-in-from-top-4 duration-300">
              {/* Price Filter */}
              <div className="space-y-3">
                <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Price Range (৳)</label>
                <div className="flex items-center gap-3">
                  <input 
                    type="number" 
                    placeholder="Min" 
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-4 text-white text-xs font-bold outline-none focus:border-neon-blue transition-all"
                  />
                  <span className="text-white/20">-</span>
                  <input 
                    type="number" 
                    placeholder="Max" 
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-2 px-4 text-white text-xs font-bold outline-none focus:border-neon-blue transition-all"
                  />
                </div>
              </div>

              {/* Rating Filter */}
              <div className="space-y-3">
                <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Minimum Rating</label>
                <div className="flex gap-2">
                  {[0, 3, 4, 4.5].map(rating => (
                    <button
                      key={rating}
                      onClick={() => setMinRating(rating)}
                      className={`flex-1 py-2 rounded-xl text-[10px] font-black transition-all border ${minRating === rating ? 'bg-neon-purple border-neon-purple text-white shadow-glow-purple/20' : 'bg-white/5 border-white/10 text-white/40 hover:text-white'}`}
                    >
                      {rating === 0 ? 'ALL' : `${rating}+`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Availability Filter */}
              <div className="space-y-3">
                <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">Availability</label>
                <button
                  onClick={() => setOnlyAvailable(!onlyAvailable)}
                  className={`w-full py-2.5 rounded-xl text-[10px] font-black transition-all border flex items-center justify-center gap-2 ${onlyAvailable ? 'bg-neon-teal border-neon-teal text-white shadow-glow-teal/20' : 'bg-white/5 border-white/10 text-white/40 hover:text-white'}`}
                >
                  <div className={`w-2 h-2 rounded-full ${onlyAvailable ? 'bg-white animate-pulse' : 'bg-white/20'}`}></div>
                  {onlyAvailable ? 'ONLY AVAILABLE' : 'SHOW ALL'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="container mx-auto px-4 mt-8">
        {loading ? (
          <div className="flex justify-center py-32">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-start"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredWorkers.map(worker => (
              <Link to={`/worker/${worker._id}`} key={worker._id} className="glass-premium rounded-3xl shadow-glow-blue/5 hover:shadow-glow-blue/20 transition-all overflow-hidden flex flex-col h-full group border border-white/10">
                <div className="p-6 flex-grow">
                  <div className="flex justify-between items-start mb-5">
                    <div className="relative">
                      <img 
                        src={worker.photoUrl || "https://ui-avatars.com/api/?name=" + worker.name + "&background=7F5AF0&color=fff"} 
                        alt={worker.name} 
                        className="w-16 h-16 rounded-full object-cover border-2 border-white/20 group-hover:scale-105 transition-transform"
                      />
                      <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-[#020617] ${worker.isAvailable ? 'bg-neon-green shadow-glow-green' : 'bg-gray-600'}`}></div>
                    </div>
                    {worker.isAvailable ? (
                      <span className="bg-accent/10 backdrop-blur-sm text-accent text-[10px] uppercase font-bold px-3 py-1 rounded-full tracking-wider border border-accent/10">
                        Available
                      </span>
                    ) : (
                      <span className="bg-white/5 backdrop-blur-sm text-white/40 text-[9px] uppercase font-black px-3 py-1 rounded-full tracking-widest border border-white/10">
                        Busy
                      </span>
                    )}
                  </div>
                  
                  <h3 className="font-black text-white text-xl font-poppins tracking-tight">{worker.name}</h3>
                  <p className="text-xs font-bold text-white/60 uppercase tracking-widest mb-4">{worker.category?.name || 'Service Professional'}</p>
                  
                  <div className="flex items-center text-[10px] font-black text-white/40 uppercase tracking-widest mb-4 bg-white/5 inline-flex px-3 py-1.5 rounded-lg border border-white/5">
                    <MapPin size={14} className="mr-1.5 text-neon-blue" />
                    {worker.distance} km away
                  </div>
                  
                  <div className="flex flex-wrap gap-2 mt-2">
                    {worker.skills?.slice(0, 3).map((skill, i) => (
                      <span key={i} className="text-[10px] bg-primary-start/5 backdrop-blur-sm text-primary-start font-bold uppercase tracking-wide px-2.5 py-1 rounded-md border border-primary-start/10">
                        {skill}
                      </span>
                    ))}
                    {worker.skills?.length > 3 && (
                      <span className="text-[10px] bg-white/5 text-gray-400 font-black uppercase tracking-widest px-2.5 py-1 rounded-md border border-white/10">
                        +{worker.skills.length - 3}
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="border-t border-white/5 p-5 flex justify-between items-center bg-white/5 group-hover:bg-white/10 transition-colors">
                  <div className="flex items-center text-amber-400 bg-amber-400/10 px-2 py-1 rounded-lg border border-amber-400/20">
                    <Star size={16} fill="currentColor" />
                    <span className="font-bold ml-1.5 text-white text-sm">{worker.rating}</span>
                    <span className="text-white/40 text-xs ml-1">({worker.reviewCount})</span>
                  </div>
                  <div className="text-white font-black text-lg">
                    ৳{worker.pricePerHour}<span className="text-white/40 text-sm font-normal">/hr</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkerList;
