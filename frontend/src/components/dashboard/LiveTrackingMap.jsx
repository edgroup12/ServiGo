import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import socket from '../../services/socket';

// Fix for default marker icons in Leaflet with React
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIconRetina from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIconRetina,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

// Custom Worker Icon
const workerIcon = L.divIcon({
  className: 'custom-worker-icon',
  html: `<div class="relative">
          <div class="w-10 h-10 bg-neon-blue rounded-full border-2 border-white shadow-glow-blue flex items-center justify-center text-white">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-truck"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-5l-4-4h-3v10Z"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></svg>
          </div>
          <div class="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white animate-pulse"></div>
        </div>`,
  iconSize: [40, 40],
  iconAnchor: [20, 40]
});

// Component to handle map centering when worker moves
const MapRecenter = ({ position }) => {
  const map = useMap();
  useEffect(() => {
    if (position) {
      map.setView(position, map.getZoom());
    }
  }, [position, map]);
  return null;
};

const LiveTrackingMap = ({ bookingId, initialPosition }) => {
  const [workerPos, setWorkerPos] = useState(initialPosition || [23.8103, 90.4125]); // Default to Dhaka
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    socket.emit('join_booking', bookingId);

    const handleLocationUpdate = (data) => {
      if (data.bookingId === bookingId) {
        setWorkerPos([data.lat, data.lng]);
        setIsConnected(true);
      }
    };
    socket.on('location_updated', handleLocationUpdate);

    return () => {
      socket.off('location_updated', handleLocationUpdate);
    };
  }, [bookingId]);

  return (
    <div className="w-full h-[400px] rounded-[2rem] overflow-hidden border border-white/10 relative shadow-2xl">
      {!isConnected && (
        <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-md flex flex-col items-center justify-center text-center p-8">
          <div className="w-16 h-16 border-4 border-neon-blue border-t-transparent rounded-full animate-spin mb-4"></div>
          <h4 className="text-white font-bold text-lg mb-2">Waiting for Worker's Location...</h4>
          <p className="text-white/60 text-sm">Once the worker starts moving, you will see their live location on this map.</p>
        </div>
      )}

      <MapContainer
        center={workerPos}
        zoom={15}
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%', background: '#020617' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          className="map-tiles-dark"
        />
        <Marker position={workerPos} icon={workerIcon}>
          <Popup>
            <div className="text-[#0f172a] font-bold">
              Worker is on the way!
            </div>
          </Popup>
        </Marker>
        <MapRecenter position={workerPos} />
      </MapContainer>

      <div className="absolute top-4 right-4 z-[1000] flex gap-2">
        <div className="glass-premium px-3 py-1.5 rounded-full flex items-center gap-2 border border-white/10 shadow-glow-blue/20">
          <div className="w-2 h-2 bg-neon-blue rounded-full animate-pulse shadow-glow-blue"></div>
          <span className="text-[9px] font-black text-white uppercase tracking-widest">Live Tracking</span>
        </div>
      </div>

      <style>{`
        .map-tiles-dark {
          filter: invert(100%) hue-rotate(180deg) brightness(95%) contrast(90%);
        }
        .leaflet-container {
          font-family: 'Inter', sans-serif;
        }
        .leaflet-control-zoom {
          border: none !important;
          box-shadow: 0 4px 12px rgba(0,0,0,0.5) !important;
        }
        .leaflet-control-zoom-in, .leaflet-control-zoom-out {
          background-color: rgba(15, 23, 42, 0.9) !important;
          color: white !important;
          border: 1px solid rgba(255,255,255,0.1) !important;
        }
      `}</style>
    </div>
  );
};

export default LiveTrackingMap;
