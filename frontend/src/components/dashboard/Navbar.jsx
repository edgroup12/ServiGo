import React from 'react';
import { Search, Bell, ChevronDown, User } from 'lucide-react';

const Navbar = ({ user }) => {
  return (
    <nav className="h-20 premium-navbar px-8 flex items-center justify-between sticky top-0 z-40">
      <div className="flex-grow max-w-xl">
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/60 group-focus-within:text-neon-blue transition-colors" size={18} />
          <input 
            type="text" 
            placeholder="Search services, workers, or bookings..." 
            className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-neon-blue/20 focus:border-neon-blue/50 transition-all"
          />
        </div>
      </div>

      <div className="flex items-center gap-6">
        <button 
          className="relative p-2 text-white/60 hover:text-white transition-all hover:scale-110 active:scale-95"
        >
          <Bell size={22} />
          <span className="absolute top-2 right-2 w-2 h-2 bg-neon-blue rounded-full shadow-glow-blue"></span>
        </button>

        <div className="h-8 w-px bg-white/10 mx-2"></div>

        <div 
          className="flex items-center gap-3 pl-2 pr-1 py-1 rounded-2xl hover:bg-white/5 cursor-pointer transition-all group hover:scale-[1.02]"
        >
          <div className="text-right hidden sm:block">
            <p className="text-sm font-bold text-white tracking-wide">{user?.name || 'Rahul'}</p>
            <p className="text-[10px] font-bold text-neon-blue uppercase tracking-widest">Premium User</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-neon-blue/20 to-neon-purple/20 border border-white/10 flex items-center justify-center text-neon-blue group-hover:shadow-glow-blue transition-all">
            {user?.name ? user.name.charAt(0) : <User size={20} />}
          </div>
          <ChevronDown size={16} className="text-white/60 group-hover:text-white transition-colors" />
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
