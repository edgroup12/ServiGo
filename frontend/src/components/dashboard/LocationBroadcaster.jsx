import React, { useEffect, useRef } from 'react';
import { MapPin } from 'lucide-react';
import socket from '../../services/socket';

const LocationBroadcaster = ({ activeBookings }) => {
  const watchIdsRef = useRef([]);
  const prevBookingIdsRef = useRef('');

  useEffect(() => {
    const confirmedBookings = activeBookings ? activeBookings.filter(b => b.status === 'confirmed') : [];

    if (confirmedBookings.length === 0) {
      // Clear all existing watches when no active confirmed bookings
      watchIdsRef.current.forEach(id => navigator.geolocation.clearWatch(id));
      watchIdsRef.current = [];
      prevBookingIdsRef.current = '';
      return;
    }

    // Build a stable key from booking IDs to avoid unnecessary re-watches
    const bookingIdsKey = confirmedBookings.map(b => b._id).sort().join(',');
    if (bookingIdsKey === prevBookingIdsRef.current) return;

    // Clear old watches before creating new ones
    watchIdsRef.current.forEach(id => navigator.geolocation.clearWatch(id));
    watchIdsRef.current = [];
    prevBookingIdsRef.current = bookingIdsKey;

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        confirmedBookings.forEach(booking => {
          socket.emit('update_location', {
            bookingId: booking._id,
            lat: latitude,
            lng: longitude,
            timestamp: new Date().toISOString()
          });
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
    watchIdsRef.current.push(watchId);

    return () => {
      watchIdsRef.current.forEach(id => navigator.geolocation.clearWatch(id));
      watchIdsRef.current = [];
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
