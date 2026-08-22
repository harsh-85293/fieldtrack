import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { ArrowLeft, Clock, MapPin, Navigation } from 'lucide-react';
import { sessionService } from '../../api/services.js';
import {
  LoadingSpinner, ErrorState, Badge, Card, EmptyState,
} from '../../components/ui/index.jsx';
import { formatDateTime, formatDuration, formatDistance } from '../../utils/format.js';

export default function SessionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const mapRef = useRef(null);
  const mapInstance = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const [sessRes, locRes] = await Promise.all([
          sessionService.getById(id),
          sessionService.getLocationPoints(id),
        ]);
        setSession(sessRes.data.data || sessRes.data);
        setLocations(locRes.data.data || locRes.data || []);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load session');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  useEffect(() => {
    if (loading || error || !session || locations.length === 0) return;
    if (!mapRef.current || mapInstance.current) return;

    mapInstance.current = L.map(mapRef.current, {
      center: [locations[0].latitude, locations[0].longitude],
      zoom: 14,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(mapInstance.current);

    const latlngs = locations.map((l) => [l.latitude, l.longitude]);

    if (latlngs.length > 1) {
      L.polyline(latlngs, { color: '#1e40af', weight: 3, opacity: 0.8 }).addTo(mapInstance.current);
    }

    // Check-in marker
    L.marker(latlngs[0], {
      icon: L.divIcon({ className: 'marker-checkin', iconSize: [28, 28], iconAnchor: [14, 28] }),
    }).addTo(mapInstance.current).bindPopup('Check In');

    // Check-out marker
    if (latlngs.length > 1) {
      L.marker(latlngs[latlngs.length - 1], {
        icon: L.divIcon({ className: 'marker-checkout', iconSize: [28, 28], iconAnchor: [14, 28] }),
      }).addTo(mapInstance.current).bindPopup('Check Out');
    }

    const bounds = L.latLngBounds(latlngs);
    mapInstance.current.fitBounds(bounds, { padding: [40, 40] });

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, [loading, error, session, locations]);

  if (loading) return <LoadingSpinner className="py-20" />;
  if (error) return <ErrorState message={error} onRetry={() => navigate('/app/attendance')} />;
  if (!session) return <ErrorState message="Session not found" />;

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/app/attendance')} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold text-gray-900">Session Detail</h1>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-1 gap-3">
        <Card>
          <div className="p-4 flex items-center gap-3">
            <Clock className="w-8 h-8 text-emerald-600" />
            <div>
              <p className="text-xs text-gray-500">Check In</p>
              <p className="text-sm font-semibold text-gray-900">{formatDateTime(session.checkInTime)}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="p-4 flex items-center gap-3">
            <Clock className="w-8 h-8 text-red-600" />
            <div>
              <p className="text-xs text-gray-500">Check Out</p>
              <p className="text-sm font-semibold text-gray-900">{formatDateTime(session.checkOutTime)}</p>
            </div>
          </div>
        </Card>
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <div className="p-3 text-center">
              <p className="text-xs text-gray-500">Duration</p>
              <p className="text-sm font-semibold text-gray-900">{formatDuration(session.duration)}</p>
            </div>
          </Card>
          <Card>
            <div className="p-3 text-center">
              <Navigation className="w-4 h-4 text-gray-400 mx-auto mb-1" />
              <p className="text-xs text-gray-500">Distance</p>
              <p className="text-sm font-semibold text-gray-900">{formatDistance(session.totalDistance)}</p>
            </div>
          </Card>
          <Card>
            <div className="p-3 text-center">
              <MapPin className="w-4 h-4 text-gray-400 mx-auto mb-1" />
              <p className="text-xs text-gray-500">Points</p>
              <p className="text-sm font-semibold text-gray-900">{locations.length}</p>
            </div>
          </Card>
        </div>
        <div className="flex justify-center">
          <Badge color={session.status === 'active' ? 'green' : 'gray'}>{session.status}</Badge>
        </div>
      </div>

      {/* Map */}
      <Card title="Route Map">
        {locations.length === 0 ? (
          <EmptyState icon={MapPin} title="No location data" message="No GPS points were recorded for this session." />
        ) : (
          <div ref={mapRef} style={{ height: '350px', width: '100%' }} className="rounded-b-xl" />
        )}
      </Card>
    </div>
  );
}
