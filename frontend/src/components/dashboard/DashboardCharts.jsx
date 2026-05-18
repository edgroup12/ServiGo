import React, { useState, useEffect } from 'react';
import api from '../../services/api';

const DashboardCharts = ({ currentUser }) => {
  const [trends, setTrends] = useState([0, 0, 0, 0, 0, 0, 0]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;
    
    const fetchAnalytics = async () => {
      try {
        const res = await api.get(`/analytics/${currentUser._id}`);
        setTrends(res.data.trends || [0, 0, 0, 0, 0, 0, 0]);
        setCategories(res.data.categoryDistribution || []);
      } catch (error) {
        console.error('Error fetching analytics:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchAnalytics();
  }, [currentUser]);

  // Generate dynamic line chart SVG path
  const maxTrend = Math.max(...trends, 1); // Avoid division by zero
  const points = trends.map((val, i) => {
    const x = (i / 6) * 600;
    const y = 200 - (val / maxTrend) * 150; // Scale to fit between y=50 and y=200
    return `${x},${y}`;
  });
  
  const pathD = `M${points[0]} ` + points.slice(1).map(p => `L${p}`).join(' ');
  const areaD = `${pathD} L600,200 L0,200 Z`;

  // Generate dynamic pie chart properties
  const colors = [
    { stroke: '#6366f1', bg: 'bg-[#6366f1]' },
    { stroke: '#a855f7', bg: 'bg-[#a855f7]' },
    { stroke: '#06b6d4', bg: 'bg-[#06b6d4]' },
    { stroke: '#10b981', bg: 'bg-[#10b981]' }
  ];
  
  const circumference = 251; // 2 * Math.PI * 40

  let currentOffset = 0;
  const pieCircles = categories.slice(0, 4).map((cat, i) => {
    const strokeDasharray = `${(cat.percentage / 100) * circumference} ${circumference}`;
    const strokeDashoffset = -currentOffset;
    currentOffset += (cat.percentage / 100) * circumference;
    
    return (
      <circle 
        key={cat.name}
        cx="50" cy="50" r="40" 
        fill="transparent" 
        stroke={colors[i % colors.length].stroke} 
        strokeWidth="12" 
        strokeDasharray={strokeDasharray} 
        strokeDashoffset={strokeDashoffset} 
        className="transition-all duration-1000"
      />
    );
  });

  // Calculate day labels (Last 7 days)
  const dayLabels = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dayLabels.push(d.toLocaleDateString('en-US', { weekday: 'short' }));
  }

  const topCategory = categories.length > 0 
    ? categories.reduce((prev, current) => (prev.percentage > current.percentage) ? prev : current)
    : { name: 'None', percentage: 0 };

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
              <span className="w-3 h-3 rounded-full bg-[#6366f1] shadow-glow-blue"></span>
              <span className="text-[10px] font-bold text-white/80 uppercase tracking-widest">Bookings</span>
            </div>
          </div>
        </div>

        <div className="h-64 w-full relative flex items-end justify-between px-2">
          {/* SVG Line Chart */}
          <svg className="absolute inset-0 w-full h-full p-4 overflow-visible" preserveAspectRatio="none">
            <defs>
              <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366f1" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path 
              d={loading ? "M0,200 L600,200 Z" : areaD} 
              fill="url(#chartGradient)"
              className="transition-all duration-1000"
            />
            <path 
              d={loading ? "M0,200 L600,200" : pathD} 
              fill="none" 
              stroke="#6366f1" 
              strokeWidth="4" 
              strokeLinecap="round" 
              strokeLinejoin="round"
              className="transition-all duration-1000"
            />
          </svg>
          
          {dayLabels.map((day, i) => (
            <div key={`${day}-${i}`} className="relative z-10 text-[10px] font-black text-white/40 uppercase tracking-widest pb-2">
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
              {categories.length > 0 ? pieCircles : (
                <circle cx="50" cy="50" r="40" fill="transparent" stroke="#333" strokeWidth="12" />
              )}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-black text-white font-poppins tracking-tighter">{topCategory.percentage}%</span>
              <span className="text-[10px] font-black text-white/40 uppercase tracking-widest text-center px-2 truncate w-full">{topCategory.name}</span>
            </div>
          </div>

          <div className="space-y-4 max-h-48 overflow-y-auto custom-scrollbar pr-2">
            {categories.length > 0 ? categories.slice(0, 4).map((item, i) => (
              <div key={item.name} className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${colors[i % colors.length].bg} shadow-lg`}></div>
                <div>
                  <p className="text-xs font-bold text-white tracking-wide truncate max-w-[80px]">{item.name}</p>
                  <p className="text-[10px] font-bold text-white/60">{item.percentage}%</p>
                </div>
              </div>
            )) : (
              <p className="text-white/40 text-xs font-bold uppercase">No data yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardCharts;
