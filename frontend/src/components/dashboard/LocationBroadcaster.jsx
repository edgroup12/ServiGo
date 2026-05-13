import React, { useEffect } from 'react';
import { MapPin } from 'lucide-react';
import socket from '../../services/socket';

const LocationBroadcaster = ({ activeBookings }) => {
  useEffect(() => {
    if (!activeBookings || activeBookings.length === 0) return;

    const watchIds = activeBookings.map(booking => {
      // Only track if the booking is 'confirmed' or 'in-progress' (for demo, confirmed)
      if (booking.status !== 'confirmed') return null;

      const watchId = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          console.log(`Sending location for booking ${booking._id}: ${latitude}, ${longitude}`);
          socket.emit('update_location', {
            bookingId: booking._id,
            lat: latitude,
            lng: longitude,
            timestamp: new Date().toISOString()
          });
        },
        (error) => {
          console.error('Error watching position:', error);
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0
        }
      );
      return watchId;
    }).filter(id => id !== null);

    return () => {
      watchIds.forEach(id => navigator.geolocation.clearWatch(id));
    };
  }, [activeBookings]);

  if (!activeBookings || activeBookings.filter(b => b.status === 'confirmed').length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-24 right-8 z-40">
      <div className="glass-premium px-4 py-2 rounded-full flex items-center gap-2 border border-neon-blue/30 shadow-glow-blue/20">
        <div className="relative">
          <MapPin size={16} className="text-neon-blue" />
          <span className="absolute -top-1 -right-1 w-2 h-2 bg-neon-blue rounded-full animate-ping"></span>
        </div>
        <span className="text-[10px] font-bold text-white uppercase tracking-widest">Live Location Sharing Active</span>
      </div>
    </div>
  );
};

export default LocationBroadcaster;
