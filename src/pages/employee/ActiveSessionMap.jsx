import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ArrowLeft, MapPin, Navigation } from 'lucide-react';
import { sessionService } from '../../api/services.js';
import { LoadingSpinner, ErrorState, Badge } from '../../components/ui/index.jsx';
import { formatTime, formatDuration, formatDistance } from '../../utils/format.js';

export default function ActiveSessionMap() {
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPos, setCurrentPos] = useState(null);
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const polylineRef = useRef(null);
  const currentMarkerRef = useRef(null);
  const watchIdRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const sessRes = await sessionService.getMySessions({ status: 'active' });
        const sessData = sessRes.data.data || sessRes.data;
        const sessions = sessData.sessions || sessData.items || sessData || [];
        const active = sessions[0] || null;
        if (!active) {
          setError('No active session found');
          setLoading(false);
          return;
        }
        setSession(active);
        const locRes = await sessionService.getLocationPoints(active.id);
        setLocations(locRes.data.data || locRes.data || []);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load session');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Initialize map
  useEffect(() => {
    if (loading || error || !mapRef.current) return;
    if (mapInstance.current) return;

    const defaultCenter = locations.length > 0
      ? [locations[0].latitude, locations[0].longitude]
      : currentPos
        ? [currentPos.latitude, currentPos.longitude]
        : [20.5937, 78.9629]; // India center

    mapInstance.current = L.map(mapRef.current, {
      center: defaultCenter,
      zoom: 15,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(mapInstance.current);

    // Draw existing route
    if (locations.length > 1) {
      const latlngs = locations.map((l) => [l.latitude, l.longitude]);
      polylineRef.current = L.polyline(latlngs, { color: '#1e40af', weight: 3, opacity: 0.8 }).addTo(mapInstance.current);

      // Check-in marker
      L.marker(latlngs[0], {
        icon: L.divIcon({ className: 'marker-checkin', iconSize: [28, 28], iconAnchor: [14, 28] }),
      }).addTo(mapInstance.current).bindPopup('Check In');

      // Latest marker
      L.marker(latlngs[latlngs.length - 1], {
        icon: L.divIcon({ className: 'marker-current', iconSize: [20, 20], iconAnchor: [10, 10] }),
      }).addTo(mapInstance.current);

      const bounds = L.latLngBounds(latlngs);
      mapInstance.current.fitBounds(bounds, { padding: [40, 40] });
    }

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, [loading, error, locations]);

  // Watch current position
  useEffect(() => {
    if (!mapInstance.current) return;
    if (!navigator.geolocation) return;

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const point = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        };
        setCurrentPos(point);

        // Update current marker
        if (currentMarkerRef.current) {
          mapInstance.current.removeLayer(currentMarkerRef.current);
        }
        currentMarkerRef.current = L.marker([point.latitude, point.longitude], {
          icon: L.divIcon({ className: 'marker-current', iconSize: [20, 20], iconAnchor: [10, 10] }),
        }).addTo(mapInstance.current);

        // Extend polyline
        if (polylineRef.current) {
          polylineRef.current.addLatLng([point.latitude, point.longitude]);
        } else {
          polylineRef.current = L.polyline([[point.latitude, point.longitude]], {
            color: '#1e40af',
            weight: 3,
            opacity: 0.8,
          }).addTo(mapInstance.current);
        }

        mapInstance.current.setView([point.latitude, point.longitude], 16);
      },
      (err) => {
        // silent error
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [mapInstance.current]);

  if (loading) return <LoadingSpinner className="py-20" />;
  if (error) return <ErrorState message={error} onRetry={() => navigate('/app')} />;

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-primary-800 text-white">
        <button onClick={() => navigate('/app')} className="p-1.5 hover:bg-primary-700 rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <p className="font-semibold">Live Map</p>
          <p className="text-xs text-primary-300">
            {session ? `Since ${formatTime(session.checkInTime)}` : ''}
          </p>
        </div>
        <Badge color="green">Active</Badge>
      </div>

      {/* Info bar */}
      <div className="flex items-center justify-around px-4 py-2 bg-white border-b border-gray-200 text-sm">
        <div className="flex items-center gap-1">
          <Navigation className="w-4 h-4 text-gray-400" />
          <span className="text-gray-600">{formatDistance(session?.totalDistance || 0)}</span>
        </div>
        <div className="flex items-center gap-1">
          <MapPin className="w-4 h-4 text-gray-400" />
          <span className="text-gray-600">{locations.length} points</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-gray-600">{formatDuration(session?.duration || 0)}</span>
        </div>
      </div>

      {/* Map */}
      <div ref={mapRef} className="flex-1" style={{ minHeight: '400px' }} />
    </div>
  );
}
