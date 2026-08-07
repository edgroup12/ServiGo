import { MapPin, Radio, Square, Wifi, WifiOff } from 'lucide-react';
import { useState } from 'react';
import { useWorkerLocation } from '../../hooks/useLocationSocket';

const connectionLabels = {
    connected: 'Realtime connected',
    reconnecting: 'Realtime reconnecting',
    offline: 'Offline',
};

const LocationBroadcaster = ({ activeBookings = [] }) => {
    const [preferredBookingId, setPreferredBookingId] = useState('');
    const {
        sharing,
        connection,
        error,
        bookingId: sharingBookingId,
        eligibleBookings,
        startSharing,
        stopSharing,
    } = useWorkerLocation(activeBookings);

    if (eligibleBookings.length === 0 && !sharing) return null;

    const selectedBookingId = sharingBookingId
        || (eligibleBookings.some((booking) => booking._id === preferredBookingId)
            ? preferredBookingId
            : eligibleBookings[0]?._id)
        || '';
    const selectedBooking = eligibleBookings.find((booking) => booking._id === selectedBookingId);
    const isConnected = connection === 'connected';
    const ConnectionIcon = isConnected ? Wifi : WifiOff;

    return (
        <section className="mt-8 border-y border-white/10 bg-white/[0.03] px-4 py-6 sm:px-6" aria-labelledby="location-sharing-title">
            <div className="mx-auto flex max-w-5xl flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                <div className="min-w-0">
                    <div className="mb-2 flex items-center gap-3">
                        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${sharing ? 'border-neon-green/30 bg-neon-green/10 text-neon-green' : 'border-white/10 bg-white/5 text-neon-blue'}`}>
                            <MapPin size={18} />
                        </span>
                        <div>
                            <h2 id="location-sharing-title" className="text-base font-black text-white font-poppins">Live location sharing</h2>
                            <p className="text-xs font-bold text-white/50">{sharing ? 'Your location is visible to this customer.' : 'Choose a confirmed job before sharing.'}</p>
                        </div>
                    </div>
                    <div className={`flex items-center gap-2 text-xs font-bold ${isConnected ? 'text-neon-green' : 'text-amber-300'}`} role="status">
                        <ConnectionIcon size={14} />
                        {connectionLabels[connection] || connection}
                    </div>
                    {error && <p className="mt-2 max-w-xl text-sm font-semibold text-red-300" role="alert">{error}</p>}
                </div>

                <div className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto">
                    <label className="min-w-0 sm:min-w-72">
                        <span className="sr-only">Confirmed booking</span>
                        <select
                            value={selectedBookingId}
                            onChange={(event) => setPreferredBookingId(event.target.value)}
                            disabled={sharing}
                            className="h-12 w-full rounded-lg border border-white/10 bg-[#0f172a] px-3 text-sm font-bold text-white outline-none focus:border-neon-blue disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {eligibleBookings.map((booking) => (
                                <option key={booking._id} value={booking._id}>
                                    {booking.customer?.name || 'Customer'} - Job #{booking._id.slice(-6)}
                                </option>
                            ))}
                        </select>
                    </label>

                    {sharing ? (
                        <button
                            type="button"
                            onClick={stopSharing}
                            className="flex h-12 items-center justify-center gap-2 rounded-lg bg-red-500 px-5 text-sm font-black text-white transition-colors hover:bg-red-400"
                        >
                            <Square size={16} fill="currentColor" />
                            Stop sharing
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={() => startSharing(selectedBooking?._id)}
                            disabled={!selectedBooking || !isConnected}
                            className="flex h-12 items-center justify-center gap-2 rounded-lg bg-neon-blue px-5 text-sm font-black text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <Radio size={17} />
                            Start sharing
                        </button>
                    )}
                </div>
            </div>
        </section>
    );
};

export default LocationBroadcaster;
