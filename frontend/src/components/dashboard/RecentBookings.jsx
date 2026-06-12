import { format } from 'date-fns';
import { Eye, MoreHorizontal, Clock, CheckCircle2, XCircle, MessageSquare, MapPin } from 'lucide-react';
import { useToast } from '../Toast';
const StatusBadge = ({ status }) => {
  const configs = {
    pending: { color: 'text-amber-400', bg: 'bg-amber-400/10', border: 'border-amber-400/20', icon: Clock, shadow: 'shadow-[0_0_15px_rgba(251,191,36,0.2)]' },
    completed: { color: 'text-neon-green', bg: 'bg-neon-green/10', border: 'border-neon-green/20', icon: CheckCircle2, shadow: 'shadow-[0_0_15px_rgba(34,197,94,0.2)]' },
    cancelled: { color: 'text-red-400', bg: 'bg-red-400/10', border: 'border-red-400/20', icon: XCircle, shadow: 'shadow-[0_0_15px_rgba(248,113,113,0.2)]' },
    confirmed: { color: 'text-neon-blue', bg: 'bg-neon-blue/10', border: 'border-neon-blue/20', icon: CheckCircle2, shadow: 'shadow-[0_0_15px_rgba(99,102,241,0.2)]' },
  };

  const config = configs[status] || configs.pending;
  const Icon = config.icon;

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border ${config.bg} ${config.color} ${config.border} ${config.shadow} text-[10px] font-black uppercase tracking-widest`}>
      <Icon size={12} className="animate-pulse" />
      {status}
    </div>
  );
};

const RecentBookings = ({ bookings, onOpenChat, onTrackWorker }) => {
  const { toast } = useToast();
  return (
    <div id="recent-bookings" className="glass-card overflow-hidden border-gradient-premium">
      <div className="p-8 border-b border-white/5 flex items-center justify-between">
        <div>
          <h3 className="text-xl font-black text-white font-poppins tracking-tight">Recent Bookings</h3>
          <p className="text-white/60 text-xs font-bold uppercase tracking-wider mt-1">Transaction overview</p>
        </div>
        <button
          className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-xs font-bold text-white/60 hover:text-white hover:bg-white/10 transition-all hover:scale-105 active:scale-95"
        >
          View All
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-white/[0.02]">
              <th className="px-8 py-5 text-[10px] font-black text-white/40 uppercase tracking-widest">Service Provider</th>
              <th className="px-8 py-5 text-[10px] font-black text-white/40 uppercase tracking-widest">Date & Time</th>
              <th className="px-8 py-5 text-[10px] font-black text-white/40 uppercase tracking-widest">Status</th>
              <th className="px-8 py-5 text-[10px] font-black text-white/40 uppercase tracking-widest">Price</th>
              <th className="px-8 py-5 text-[10px] font-black text-white/40 uppercase tracking-widest text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {bookings.length > 0 ? bookings.map((booking, idx) => (
              <tr
                key={booking._id}
                className="hover:bg-white/[0.03] transition-colors group"
              >
                <td className="px-8 py-6">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-neon-blue to-neon-purple p-[1px]">
                      <div className="w-full h-full rounded-xl bg-navy-deeper flex items-center justify-center overflow-hidden">
                        <img
                          src={booking.worker?.photoUrl || `https://ui-avatars.com/api/?name=${booking.worker?.name || 'W'}&background=0f172a&color=6366f1`}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white tracking-wide">{booking.worker?.name || 'Professional'}</p>
                      <p className="text-[10px] font-bold text-neon-blue uppercase tracking-widest mt-0.5">{booking.worker?.category?.name || 'Service'}</p>
                    </div>
                  </div>
                </td>
                <td className="px-8 py-6">
                  <p className="text-white/80 text-sm font-bold">{format(new Date(booking.date), 'MMM dd, yyyy')}</p>
                  <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mt-0.5">{format(new Date(booking.date), 'hh:mm a')}</p>
                </td>
                <td className="px-8 py-6">
                  <StatusBadge status={booking.status} />
                </td>
                <td className="px-8 py-6">
                  <p className="text-sm font-black text-white tracking-tighter">৳{booking.estimatedPrice}</p>
                </td>
                <td className="px-8 py-6 text-right">
                  <div className="flex items-center justify-end gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => onOpenChat?.(booking)}
                      className="p-2 bg-gradient-primary rounded-lg text-white hover:scale-105 transition-all shadow-glow-blue/20"
                      title="Chat with Provider"
                    >
                      <MessageSquare size={16} />
                    </button>
                    {booking.status === 'confirmed' && (
                      <button
                        onClick={() => onTrackWorker?.(booking)}
                        className="p-2 bg-neon-blue rounded-lg text-white hover:scale-105 transition-all shadow-glow-blue/30"
                        title="Track Live Location"
                      >
                        <MapPin size={16} />
                      </button>
                    )}
                    <button onClick={() => toast('View Details coming soon', 'info')} className="p-2 bg-white/5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-all">
                      <Eye size={16} />
                    </button>
                    <button onClick={() => toast('More Options coming soon', 'info')} className="p-2 bg-white/5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-all">
                      <MoreHorizontal size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan="5" className="px-8 py-20 text-center text-gray-500 font-bold uppercase tracking-widest text-xs">
                  No recent bookings found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RecentBookings;
