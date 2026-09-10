import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, MapPin, Navigation } from 'lucide-react';
import { sessionService } from '../../api/services.js';
import {
  LoadingSpinner, ErrorState, Badge, Card, EmptyState,
} from '../../components/ui/index.jsx';
import ExactLocation from '../../components/maps/ExactLocation.jsx';
import RouteMap from '../../components/maps/RouteMap.jsx';
import {
  formatDateTime,
  formatDuration,
  formatDistance,
  sessionCheckIn,
  sessionCheckOut,
  sessionDurationSeconds,
  sessionDistanceMeters,
} from '../../utils/format.js';
import { extractList } from '../../utils/apiData.js';
import { toLatLng } from '../../utils/geo.js';

export default function SessionDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!id || id === 'undefined') {
      setError('Invalid session');
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const [sessRes, locRes] = await Promise.all([
          sessionService.getById(id),
          sessionService.getLocationPoints(id),
        ]);
        setSession(sessRes.data.data || sessRes.data);
        setLocations(extractList(locRes));
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load session');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) return <LoadingSpinner className="py-20" />;
  if (error) return <ErrorState message={error} onRetry={() => navigate('/app/attendance')} />;
  if (!session) return <ErrorState message="Session not found" />;

  const hasMap = locations.some((l) => toLatLng(l))
    || toLatLng(session.checkInLocation)
    || toLatLng(session.checkOutLocation);
  const lastPoint = locations.length > 0 ? locations[locations.length - 1] : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/app/attendance')} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold text-gray-900">Session Detail</h1>
      </div>

      <div className="grid grid-cols-1 gap-3">
        <Card>
          <div className="p-4 flex items-center gap-3">
            <Clock className="w-8 h-8 text-emerald-600" />
            <div>
              <p className="text-xs text-gray-500">Check In</p>
              <p className="text-sm font-semibold text-gray-900">{formatDateTime(sessionCheckIn(session))}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="p-4 flex items-center gap-3">
            <Clock className="w-8 h-8 text-red-600" />
            <div>
              <p className="text-xs text-gray-500">Check Out</p>
              <p className="text-sm font-semibold text-gray-900">{formatDateTime(sessionCheckOut(session))}</p>
            </div>
          </div>
        </Card>
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <div className="p-3 text-center">
              <p className="text-xs text-gray-500">Duration</p>
              <p className="text-sm font-semibold text-gray-900">{formatDuration(sessionDurationSeconds(session))}</p>
            </div>
          </Card>
          <Card>
            <div className="p-3 text-center">
              <Navigation className="w-4 h-4 text-gray-400 mx-auto mb-1" />
              <p className="text-xs text-gray-500">Distance</p>
              <p className="text-sm font-semibold text-gray-900">{formatDistance(sessionDistanceMeters(session))}</p>
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

      <Card title="Route Map & Exact Location">
        {!hasMap ? (
          <EmptyState
            icon={MapPin}
            title="No location data"
            message="No GPS points were recorded for this session. Check in again and keep the app open while GPS is active."
          />
        ) : (
          <div>
            <RouteMap
              points={locations}
              checkIn={session.checkInLocation}
              checkOut={session.checkOutLocation}
              height={350}
            />
            <div className="space-y-4 p-4 border-t border-gray-100 bg-gray-50/80">
              <ExactLocation point={session.checkInLocation} label="Check-in location" compact />
              <ExactLocation
                point={session.checkOutLocation || (session.status === 'active' ? lastPoint : null)}
                label={session.checkOutLocation ? 'Check-out location' : 'Latest GPS point'}
                compact
              />
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
