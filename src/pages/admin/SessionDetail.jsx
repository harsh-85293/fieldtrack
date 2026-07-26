import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Clock, MapPin, User, Route as RouteIcon } from 'lucide-react';
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
  entityId,
  sessionCheckIn,
  sessionCheckOut,
  sessionDurationSeconds,
  sessionDistanceMeters,
} from '../../utils/format.js';
import { extractList } from '../../utils/apiData.js';
import { toLatLng } from '../../utils/geo.js';

export default function SessionDetail() {
  const { id } = useParams();
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
  if (error) return <ErrorState message={error} />;
  if (!session) return <ErrorState message="Session not found" />;

  const hasMap = locations.some((l) => toLatLng(l))
    || toLatLng(session.checkInLocation)
    || toLatLng(session.checkOutLocation);

  const lastPoint = locations.length > 0 ? locations[locations.length - 1] : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/admin/sessions" className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Session Detail</h1>
          <p className="text-sm text-gray-500">{entityId(session)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <div className="p-5">
            <User className="w-6 h-6 text-primary-700 mb-2" />
            <p className="text-sm text-gray-500">Employee</p>
            <p className="text-lg font-semibold text-gray-900">{session.employee?.fullName || session.employeeName || '—'}</p>
          </div>
        </Card>
        <Card>
          <div className="p-5">
            <Clock className="w-6 h-6 text-emerald-600 mb-2" />
            <p className="text-sm text-gray-500">Check In</p>
            <p className="text-lg font-semibold text-gray-900">{formatDateTime(sessionCheckIn(session))}</p>
          </div>
        </Card>
        <Card>
          <div className="p-5">
            <Clock className="w-6 h-6 text-red-600 mb-2" />
            <p className="text-sm text-gray-500">Check Out</p>
            <p className="text-lg font-semibold text-gray-900">{formatDateTime(sessionCheckOut(session))}</p>
          </div>
        </Card>
        <Card>
          <div className="p-5">
            <RouteIcon className="w-6 h-6 text-amber-600 mb-2" />
            <p className="text-sm text-gray-500">Distance</p>
            <p className="text-lg font-semibold text-gray-900">{formatDistance(sessionDistanceMeters(session))}</p>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card>
          <div className="p-5">
            <p className="text-sm text-gray-500">Duration</p>
            <p className="text-lg font-semibold text-gray-900">{formatDuration(sessionDurationSeconds(session))}</p>
          </div>
        </Card>
        <Card>
          <div className="p-5">
            <p className="text-sm text-gray-500">GPS Points</p>
            <p className="text-lg font-semibold text-gray-900">{locations.length}</p>
          </div>
        </Card>
        <Card>
          <div className="p-5">
            <p className="text-sm text-gray-500">Status</p>
            <Badge color={session.status === 'active' ? 'green' : 'gray'}>{session.status}</Badge>
          </div>
        </Card>
      </div>

      <Card title="Route Map & Exact Location">
        {!hasMap ? (
          <EmptyState
            icon={MapPin}
            title="No location data"
            message="No GPS points or check-in/out coordinates were recorded for this session."
          />
        ) : (
          <div>
            <RouteMap
              points={locations}
              checkIn={session.checkInLocation}
              checkOut={session.checkOutLocation}
              height={450}
              className="rounded-b-none"
            />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-5 border-t border-gray-100 bg-gray-50/80">
              <ExactLocation point={session.checkInLocation} label="Check-in location" compact />
              <ExactLocation
                point={session.checkOutLocation || (session.status === 'active' ? lastPoint : null)}
                label={session.checkOutLocation ? 'Check-out location' : 'Latest GPS point'}
                compact
              />
              {lastPoint && session.checkOutLocation && (
                <ExactLocation point={lastPoint} label="Last tracked point" compact />
              )}
            </div>
            <div className="px-5 pb-4 flex flex-wrap gap-4 text-xs text-gray-500">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" /> Check in
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-600" /> Check out
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-6 h-0.5 bg-primary-800" /> Route track
              </span>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
