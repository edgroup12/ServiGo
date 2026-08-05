import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Search, Star, Droplet, Zap, ThermometerSnowflake, Paintbrush, Hammer, Sparkles, ArrowRight } from 'lucide-react';
import api from '../services/api';
import { EmptyState, ErrorState, LoadingState } from '../components/AsyncState';

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
  const [loading, setLoading] = useState({ categories: true, workers: true });
  const [errors, setErrors] = useState({ categories: '', workers: '' });
  const [retryKey, setRetryKey] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    const fetchCategories = async () => {
      try {
        const response = await api.get('/categories');
        if (!cancelled) {
          setCategories(Array.isArray(response.data) ? response.data : []);
        }
      } catch (error) {
        if (!cancelled) {
          setCategories([]);
          setErrors(current => ({
            ...current,
            categories: error.response?.data?.message || 'Service categories could not be loaded.'
          }));
        }
      } finally {
        if (!cancelled) {
          setLoading(current => ({ ...current, categories: false }));
        }
      }
    };

    const fetchWorkers = async () => {
      try {
        const response = await api.get('/workers', { params: { limit: 4 } });
        const workers = response.data?.workers ?? response.data;
        if (!cancelled) {
          setFeaturedWorkers(Array.isArray(workers) ? workers : []);
        }
      } catch (error) {
        if (!cancelled) {
          setFeaturedWorkers([]);
          setErrors(current => ({
            ...current,
            workers: error.response?.data?.message || 'Top professionals could not be loaded.'
          }));
        }
      } finally {
        if (!cancelled) {
          setLoading(current => ({ ...current, workers: false }));
        }
      }
    };

    setLoading({ categories: true, workers: true });
    setErrors({ categories: '', workers: '' });
    void Promise.all([fetchCategories(), fetchWorkers()]);

    return () => {
      cancelled = true;
    };
  }, [retryKey]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/services/all?search=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <div className="pb-16 min-h-screen">
      {/* Hero Section */}
      <div className="relative overflow-hidden px-4 pb-16 pt-10 text-center sm:pb-20 sm:pt-12">
        {/* Soft Background Elements */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-neon-blue/5 rounded-full blur-3xl -z-10"></div>

        <h1 className="mb-5 bg-gradient-to-r from-[var(--text-main)] to-[var(--neon-purple)] bg-clip-text font-poppins text-4xl font-black leading-[1.1] tracking-tighter text-transparent sm:mb-6 sm:text-5xl md:text-6xl">
          How can we help you <br className="md:hidden" /> today?
        </h1>
        <p className="mx-auto mb-8 max-w-xl text-base font-medium text-[var(--text-secondary)] sm:mb-10 sm:text-lg">
          Book trusted professionals for your home instantly.
        </p>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="glass-premium mx-auto flex max-w-2xl items-center rounded-2xl border border-white/20 p-2 shadow-glow-blue/10">
          <Search size={20} className="ml-3 shrink-0 text-primary-start" aria-hidden="true" />
          <label htmlFor="home-service-search" className="sr-only">Search for a service</label>
          <input
            id="home-service-search"
            type="search"
            placeholder="Search for a service..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="min-w-0 flex-grow bg-transparent px-3 py-2 font-bold text-white outline-none placeholder-white/30 sm:px-4"
          />
          <button type="submit" className="min-h-11 shrink-0 rounded-xl bg-gradient-primary px-4 py-3 text-sm font-black text-white shadow-md transition hover:opacity-90 sm:px-6">
            Search
          </button>
        </form>
      </div>

      {/* Categories */}
      <div className="container mx-auto -mt-6 px-4">
        {loading.categories ? (
          <LoadingState message="Loading services..." compact />
        ) : errors.categories ? (
          <ErrorState message={errors.categories} onRetry={() => setRetryKey(key => key + 1)} compact />
        ) : categories.length === 0 ? (
          <EmptyState title="No services available" message="Service categories will appear here when they are added." compact />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-6">
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
        )}
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

        {loading.workers ? (
          <LoadingState message="Loading top professionals..." compact />
        ) : errors.workers ? (
          <ErrorState message={errors.workers} onRetry={() => setRetryKey(key => key + 1)} compact />
        ) : featuredWorkers.length === 0 ? (
          <EmptyState title="No professionals available" message="Verified professionals will appear here when they join." compact />
        ) : (
          <div className="-mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-8 sm:gap-6 md:mx-0 md:grid md:grid-cols-2 md:px-0 lg:grid-cols-4 hide-scrollbar">
            {featuredWorkers.map(worker => (
              <Link to={`/worker/${worker._id}`} key={worker._id} className="glass-premium block min-w-[min(82vw,280px)] snap-center overflow-hidden rounded-3xl border border-white/10 shadow-glow-blue/5 transition-all hover:shadow-glow-blue/20 md:min-w-0">
                <div className="p-6">
                  <div className="flex justify-between items-start mb-6">
                    <div className="relative">
                      <img
                        src={worker.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(worker.name || 'Professional')}&background=7F5AF0&color=fff`}
                        alt={worker.name || 'Service professional'}
                        className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-md group-hover:scale-105 transition-transform"
                      />
                      <div className="absolute -bottom-1 -right-1 bg-accent w-5 h-5 rounded-full border-4 border-white"></div>
                    </div>
                    <div className="bg-neon-blue/10 backdrop-blur-sm text-neon-blue px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border border-neon-blue/10">
                      TOP RATED
                    </div>
                  </div>

                  <div>
                    <h3 className="font-black text-[var(--text-main)] text-xl font-poppins tracking-tight">{worker.name || 'Service Professional'}</h3>
                    <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mt-1">{worker.category?.name || 'Service Professional'}</p>

                    <div className="flex items-center justify-between mt-6 pt-6 border-t border-[var(--glass-border)]">
                      <div className="flex items-center text-amber-500 bg-amber-500/10 backdrop-blur-sm px-2.5 py-1 rounded-lg border border-amber-500/10">
                        <Star size={14} fill="currentColor" />
                        <span className="font-bold ml-1.5 text-[var(--text-main)] text-xs">{Number.isFinite(Number(worker.rating)) ? Number(worker.rating).toFixed(1) : 'New'}</span>
                        <span className="text-[var(--text-muted)] text-[9px] font-black uppercase tracking-widest ml-1">({Number.isFinite(Number(worker.reviewCount)) ? Number(worker.reviewCount) : 0})</span>
                      </div>
                      <div className="text-[var(--text-main)] font-black tracking-tight">
                        {Number.isFinite(Number(worker.pricePerHour)) ? `৳${Number(worker.pricePerHour).toLocaleString()}` : 'Ask for price'}{Number.isFinite(Number(worker.pricePerHour)) && <span className="text-[var(--text-muted)] text-[10px] font-normal uppercase tracking-widest ml-0.5">/hr</span>}
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
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
