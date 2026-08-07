import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Wifi, WifiOff, Clock3, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import { useCustomerLocation } from '../../hooks/useLocationSocket';
import 'leaflet/dist/leaflet.css';

import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIconRetina from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIconRetina,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const workerIcon = L.divIcon({
  className: 'custom-worker-icon',
  html: '<div class="flex h-10 w-10 items-center justify-center rounded-full border-2 border-white bg-blue-500 text-white shadow-lg"><span class="text-lg">&#8226;</span></div>',
  iconSize: [40, 40],
  iconAnchor: [20, 40],
});

const MapRecenter = ({ position }) => {
  const map = useMap();
  useEffect(() => {
    if (position) map.setView(position, map.getZoom(), { animate: true });
  }, [map, position]);
  return null;
};

const connectionCopy = {
  connecting: 'Connecting to live tracking',
  connected: 'Live tracking connected',
  reconnecting: 'Reconnecting to live tracking',
  offline: 'Live tracking is offline',
};

const LiveTrackingMap = ({ bookingId }) => {
  const { connection, position, lastUpdated, error } = useCustomerLocation(bookingId);
  const workerPosition = position
    ? [position.latitude, position.longitude]
    : null;
  const mapCenter = workerPosition || [23.8103, 90.4125];
  const lastUpdatedLabel = lastUpdated
    ? format(new Date(lastUpdated), 'MMM d, yyyy h:mm a')
    : 'Waiting for the worker to share';
  const ConnectionIcon = connection === 'connected' ? Wifi : WifiOff;

  return (
    <div className="relative h-[400px] w-full overflow-hidden rounded-lg border border-white/10 shadow-2xl">
      <MapContainer center={mapCenter} zoom={15} scrollWheelZoom style={{ height: '100%', width: '100%', background: '#020617' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          className="map-tiles-dark"
        />
        {workerPosition && (
          <Marker position={workerPosition} icon={workerIcon}>
            <Popup>Worker location</Popup>
          </Marker>
        )}
        <MapRecenter position={workerPosition} />
      </MapContainer>

      <div className="pointer-events-none absolute inset-x-3 top-3 z-[1000] flex items-start justify-between gap-3">
        <div className="rounded-lg border border-white/10 bg-slate-950/85 px-3 py-2 text-white shadow-lg backdrop-blur">
          <div className="flex items-center gap-2 text-xs font-black">
            <ConnectionIcon size={14} className={connection === 'connected' ? 'text-neon-green' : 'text-amber-300'} />
            {connectionCopy[connection] || 'Live tracking status unavailable'}
          </div>
          <div className="mt-1 flex items-center gap-2 text-[11px] font-semibold text-white/60">
            <Clock3 size={12} />
            Last updated: {lastUpdatedLabel}
          </div>
        </div>
        <div className="rounded-lg border border-white/10 bg-slate-950/85 p-2 text-white shadow-lg backdrop-blur" title="Worker location">
          <MapPin size={18} className="text-neon-blue" />
        </div>
      </div>

      {!workerPosition && (
        <div className="pointer-events-none absolute inset-0 z-[900] flex items-center justify-center p-6">
          <div className="max-w-sm rounded-lg border border-white/10 bg-slate-950/90 px-5 py-4 text-center shadow-xl backdrop-blur">
            <p className="text-sm font-black text-white">Waiting for live location</p>
            <p className="mt-1 text-xs font-semibold text-white/60">The worker must start sharing from the confirmed booking.</p>
            {error && <p className="mt-2 text-xs font-semibold text-red-300" role="alert">{error}</p>}
          </div>
        </div>
      )}

      <style>{`
        .map-tiles-dark { filter: invert(100%) hue-rotate(180deg) brightness(95%) contrast(90%); }
        .leaflet-container { font-family: 'Inter', sans-serif; }
        .custom-worker-icon { transition: transform 900ms ease; }
        .leaflet-control-zoom { border: none !important; box-shadow: 0 4px 12px rgba(0,0,0,0.5) !important; }
        .leaflet-control-zoom-in, .leaflet-control-zoom-out { background-color: rgba(15, 23, 42, 0.9) !important; color: white !important; border: 1px solid rgba(255,255,255,0.1) !important; }
      `}</style>
    </div>
  );
};

export default LiveTrackingMap;
