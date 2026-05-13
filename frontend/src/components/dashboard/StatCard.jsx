import React from 'react';
import { TrendingUp } from 'lucide-react';

const StatCard = ({ icon: Icon, label, value, trend, colorClass, onClick }) => {
  return (
    <div
      onClick={onClick}
      className={`glass-card p-6 border-gradient-premium group relative overflow-hidden transition-all duration-300 ${onClick ? 'cursor-pointer hover:-translate-y-2 hover:scale-[1.02] active:scale-95' : ''}`}
    >
      {/* Background Glow */}
      <div className={`absolute -bottom-10 -right-10 w-32 h-32 blur-3xl opacity-20 group-hover:opacity-40 transition-opacity duration-500 rounded-full ${colorClass}`}></div>
      
      <div className="flex justify-between items-start mb-4 relative z-10">
        <div className={`p-3 rounded-2xl bg-white/5 border border-white/10 text-white shadow-xl group-hover:shadow-glow-blue transition-all duration-300`}>
          <Icon size={24} className={colorClass.replace('bg-', 'text-')} />
        </div>
        {trend && (
          <div className="flex items-center gap-1 text-neon-green bg-neon-green/10 px-2 py-1 rounded-lg text-xs font-bold border border-neon-green/20">
            <TrendingUp size={12} />
            {trend}
          </div>
        )}
      </div>
      
      <div className="relative z-10">
        <p className="text-white/80 text-xs font-bold uppercase tracking-widest mb-1">{label}</p>
        <h3 className="text-3xl font-black text-white font-poppins tracking-tight">{value}</h3>
      </div>
      
      <div className="mt-4 h-1 w-full bg-white/5 rounded-full overflow-hidden relative z-10">
        <div 
          className={`h-full rounded-full transition-all duration-1000 ${colorClass}`}
          style={{ width: onClick ? '100%' : '70%' }}
        ></div>
      </div>
      
      {onClick && (
        <div className="absolute bottom-2 right-4 text-[8px] font-black text-white/20 uppercase tracking-[0.2em] group-hover:text-neon-blue transition-colors">
          Click to View
        </div>
      )}
    </div>
  );
};

export default StatCard;
