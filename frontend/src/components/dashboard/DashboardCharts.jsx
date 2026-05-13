import React from 'react';

const DashboardCharts = () => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
      {/* Line Chart */}
      <div className="glass-card p-8 border-gradient-premium relative overflow-hidden group">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h3 className="text-xl font-black text-white font-poppins tracking-tight">Booking Trends</h3>
            <p className="text-white/60 text-xs font-bold uppercase tracking-wider mt-1">Last 7 days performance</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-neon-blue shadow-glow-blue"></span>
              <span className="text-[10px] font-bold text-white/80 uppercase tracking-widest">Bookings</span>
            </div>
          </div>
        </div>

        <div className="h-64 w-full relative flex items-end justify-between px-2">
          {/* Simple SVG Line Chart */}
          <svg className="absolute inset-0 w-full h-full p-4 overflow-visible" preserveAspectRatio="none">
            <defs>
              <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366f1" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path 
              d="M0,80 Q50,20 100,60 T200,40 T300,90 T400,30 T500,70 T600,50 L600,200 L0,200 Z" 
              fill="url(#chartGradient)"
              className="transition-all duration-1000"
            />
            <path 
              d="M0,80 Q50,20 100,60 T200,40 T300,90 T400,30 T500,70 T600,50" 
              fill="none" 
              stroke="#6366f1" 
              strokeWidth="4" 
              strokeLinecap="round" 
              className="transition-all duration-1000"
            />
          </svg>
          
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
            <div key={day} className="relative z-10 text-[10px] font-black text-white/40 uppercase tracking-widest pb-2">
              {day}
            </div>
          ))}
        </div>
      </div>

      {/* Pie Chart / Distribution */}
      <div className="glass-card p-8 border-gradient-premium relative overflow-hidden group">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h3 className="text-xl font-black text-white font-poppins tracking-tight">Category Distribution</h3>
            <p className="text-white/60 text-xs font-bold uppercase tracking-wider mt-1">Service popularity</p>
          </div>
        </div>

        <div className="flex items-center justify-center h-64 gap-12">
          <div className="relative w-48 h-48">
            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
              {/* Simple SVG Donut segments */}
              <circle cx="50" cy="50" r="40" fill="transparent" stroke="#6366f1" strokeWidth="12" strokeDasharray="180 251" strokeDashoffset="0" />
              <circle cx="50" cy="50" r="40" fill="transparent" stroke="#a855f7" strokeWidth="12" strokeDasharray="50 251" strokeDashoffset="-180" />
              <circle cx="50" cy="50" r="40" fill="transparent" stroke="#06b6d4" strokeWidth="12" strokeDasharray="21 251" strokeDashoffset="-230" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-black text-white font-poppins tracking-tighter">84%</span>
              <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Growth</span>
            </div>
          </div>

          <div className="space-y-4">
            {[
              { label: 'Cleaning', color: 'bg-neon-blue', value: '45%' },
              { label: 'Repair', color: 'bg-neon-purple', value: '30%' },
              { label: 'Painting', color: 'bg-neon-teal', value: '25%' },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${item.color} shadow-lg shadow-${item.color.replace('bg-', '')}/20`}></div>
                <div>
                  <p className="text-xs font-bold text-white tracking-wide">{item.label}</p>
                  <p className="text-[10px] font-bold text-white/60">{item.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardCharts;
