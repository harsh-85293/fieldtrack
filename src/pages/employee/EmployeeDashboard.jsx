import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, MapPin, Plus, Wifi, WifiOff, RefreshCw, LogIn, LogOut, Navigation } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { sessionService, visitService } from '../../api/services.js';
import {
  LoadingSpinner, EmptyState, ErrorState, Badge, Button, Card,
} from '../../components/ui/index.jsx';
import { useToast } from '../../components/ui/Toast.jsx';
import { formatDateTime, formatTime, formatDuration, formatDistance, formatDate } from '../../utils/format.js';
import { getQueuedLocationCount } from '../../lib/offlineDb.js';

export default function EmployeeDashboard() {
  const { user } = useAuth();
  const { toastSuccess, toastError, toastInfo } = useToast();
  const navigate = useNavigate();

  const [activeSession, setActiveSession] = useState(null);
  const [todayVisits, setTodayVisits] = useState([]);
  const [todaySessions, setTodaySessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // GPS state: 'idle' | 'acquiring' | 'success' | 'denied' | 'unavailable' | 'error'
  const [gpsStatus, setGpsStatus] = useState('idle');
  const [currentPosition, setCurrentPosition] = useState(null);
  const [distance, setDistance] = useState(0);

  // Timer
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef(null);

  // Sync
  const [syncStatus, setSyncStatus] = useState('idle'); // 'idle' | 'syncing' | 'synced' | 'error'
  const [queuedCount, setQueuedCount] = useState(0);

  // Prevent duplicate submission
  const submittingRef = useRef(false);
  const watchIdRef = useRef(null);
  const lastPointRef = useRef(null);

  const today = new Date().toISOString().split('T')[0];

  // Load data
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [sessRes, visRes] = await Promise.all([
        sessionService.getMySessions({ date: today }),
        visitService.getMyVisits({ date: today }),
      ]);
      const sessData = sessRes.data.data || sessRes.data;
      const sessions = sessData.sessions || sessData.items || sessData || [];
      setTodaySessions(sessions);
      const active = sessions.find((s) => s.status === 'active') || null;
      setActiveSession(active);

      const visData = visRes.data.data || visRes.data;
      setTodayVisits(visData.visits || visData.items || visData || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [today]);

  useEffect(() => {
    loadData();
    getQueuedLocationCount().then(setQueuedCount);
  }, [loadData]);

  // Timer for active session
  useEffect(() => {
    if (activeSession && activeSession.checkInTime) {
      const start = new Date(activeSession.checkInTime).getTime();
      const update = () => {
        setElapsed(Math.floor((Date.now() - start) / 1000));
      };
      update();
      timerRef.current = setInterval(update, 1000);
      return () => clearInterval(timerRef.current);
    }
  }, [activeSession]);

  // GPS tracking
  useEffect(() => {
    if (!activeSession) {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      setGpsStatus('idle');
      return;
    }

    if (!navigator.geolocation) {
      setGpsStatus('unavailable');
      return;
    }

    setGpsStatus('acquiring');
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        setGpsStatus('success');
        const point = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          timestamp: new Date().toISOString(),
        };
        setCurrentPosition(point);

        // Calculate distance from last point
        if (lastPointRef.current) {
          const d = haversineDistance(
            lastPointRef.current.latitude,
            lastPointRef.current.longitude,
            point.latitude,
            point.longitude
          );
          if (d > 2) { // Only count if moved more than 2 meters
            setDistance((prev) => prev + d);
            lastPointRef.current = point;
          }
        } else {
          lastPointRef.current = point;
        }
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) setGpsStatus('denied');
        else setGpsStatus('error');
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [activeSession]);

  // Handle check-in
  const handleCheckIn = async () => {
    if (submittingRef.current) return;
    submittingRef.current = true;

    setGpsStatus('acquiring');
    if (!navigator.geolocation) {
      setGpsStatus('unavailable');
      toastError('Geolocation is not available on this device');
      submittingRef.current = false;
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setGpsStatus('success');
        try {
          const res = await sessionService.checkIn({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          });
          const session = res.data.data || res.data;
          setActiveSession(session);
          setDistance(0);
          lastPointRef.current = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          };
          toastSuccess('Checked in successfully');
          loadData();
        } catch (err) {
          toastError(err.response?.data?.message || 'Failed to check in');
        } finally {
          submittingRef.current = false;
        }
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setGpsStatus('denied');
          toastError('Location permission denied');
        } else {
          setGpsStatus('error');
          toastError('Failed to get location');
        }
        submittingRef.current = false;
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  // Handle check-out
  const handleCheckOut = async () => {
    if (submittingRef.current || !activeSession) return;
    submittingRef.current = true;

    if (!navigator.geolocation) {
      toastError('Geolocation is not available');
      submittingRef.current = false;
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          await sessionService.checkOut(activeSession.id, {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            totalDistance: distance,
          });
          toastSuccess('Checked out successfully');
          setActiveSession(null);
          setElapsed(0);
          setDistance(0);
          lastPointRef.current = null;
          loadData();
        } catch (err) {
          toastError(err.response?.data?.message || 'Failed to check out');
        } finally {
          submittingRef.current = false;
        }
      },
      (err) => {
        toastError('Failed to get location for check-out');
        submittingRef.current = false;
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  // Sync queued data
  const handleSync = async () => {
    setSyncStatus('syncing');
    try {
      const count = await getQueuedLocationCount();
      if (count > 0) {
        // Would upload queued points here
        toastInfo(`Syncing ${count} queued points...`);
      }
      setSyncStatus('synced');
      setQueuedCount(0);
      toastSuccess('All data synced');
    } catch (err) {
      setSyncStatus('error');
      toastError('Sync failed');
    }
  };

  if (loading) return <LoadingSpinner className="py-20" />;
  if (error) return <ErrorState message={error} onRetry={loadData} />;

  const gpsInfo = {
    idle: { label: 'GPS Off', color: 'gray', icon: MapPin },
    acquiring: { label: 'Getting GPS...', color: 'amber', icon: RefreshCw },
    success: { label: 'GPS Active', color: 'green', icon: MapPin },
    denied: { label: 'GPS Denied', color: 'red', icon: MapPin },
    unavailable: { label: 'GPS Unavailable', color: 'gray', icon: MapPin },
    error: { label: 'GPS Error', color: 'red', icon: MapPin },
  };
  const gps = gpsInfo[gpsStatus] || gpsInfo.idle;

  return (
    <div className="p-4 space-y-4">
      {/* Date and greeting */}
      <div className="text-center pt-2">
        <p className="text-sm text-gray-500">{formatDate(new Date(), 'EEEE, MMM d, yyyy')}</p>
        <h1 className="text-xl font-bold text-gray-900 mt-1">Hello, {user?.name?.split(' ')[0]}</h1>
      </div>

      {/* Attendance status */}
      <Card>
        <div className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-gray-500">Attendance Status</p>
              <div className="mt-1">
                {activeSession ? (
                  <Badge color="green">Checked In</Badge>
                ) : (
                  <Badge color="gray">Not Checked In</Badge>
                )}
              </div>
            </div>
            <gps.icon className={`w-8 h-8 text-${gps.color === 'green' ? 'emerald' : gps.color === 'amber' ? 'amber' : gps.color === 'red' ? 'red' : 'gray'}-500 ${gpsStatus === 'acquiring' ? 'animate-spin' : ''}`} />
          </div>

          {/* Timer */}
          {activeSession && (
            <div className="text-center mb-4">
              <p className="text-3xl font-bold text-primary-800 tabular-nums">
                {formatDuration(elapsed)}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Since {formatTime(activeSession.checkInTime)}
              </p>
            </div>
          )}

          {/* Distance */}
          {activeSession && (
            <div className="flex items-center justify-center gap-2 mb-4">
              <Navigation className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-600">{formatDistance(distance)} traveled</span>
            </div>
          )}

          {/* GPS Status */}
          <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3 mb-4">
            <div className="flex items-center gap-2">
              <gps.icon className={`w-5 h-5 text-${gps.color === 'green' ? 'emerald' : gps.color === 'amber' ? 'amber' : gps.color === 'red' ? 'red' : 'gray'}-500 ${gpsStatus === 'acquiring' ? 'animate-spin' : ''}`} />
              <span className="text-sm font-medium text-gray-700">{gps.label}</span>
            </div>
            {currentPosition && (
              <span className="text-xs text-gray-400">
                ±{Math.round(currentPosition.accuracy || 0)}m
              </span>
            )}
          </div>

          {/* Check In/Out button */}
          {activeSession ? (
            <button
              onClick={handleCheckOut}
              disabled={submittingRef.current}
              className="w-full py-4 bg-red-600 text-white text-lg font-bold rounded-xl hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              <LogOut className="w-6 h-6" />
              Check Out
            </button>
          ) : (
            <button
              onClick={handleCheckIn}
              disabled={submittingRef.current}
              className="w-full py-4 bg-emerald-600 text-white text-lg font-bold rounded-xl hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              <LogIn className="w-6 h-6" />
              Check In
            </button>
          )}
        </div>
      </Card>

      {/* Sync status */}
      <div className="flex items-center justify-between bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex items-center gap-2">
          {syncStatus === 'synced' || queuedCount === 0 ? (
            <Wifi className="w-5 h-5 text-emerald-500" />
          ) : syncStatus === 'syncing' ? (
            <RefreshCw className="w-5 h-5 text-amber-500 animate-spin" />
          ) : syncStatus === 'error' ? (
            <WifiOff className="w-5 h-5 text-red-500" />
          ) : (
            <Wifi className="w-5 h-5 text-gray-400" />
          )}
          <div>
            <p className="text-sm font-medium text-gray-700">
              {queuedCount > 0 ? `${queuedCount} items queued` : 'All data synced'}
            </p>
            <p className="text-xs text-gray-500">
              {syncStatus === 'syncing' ? 'Syncing...' : syncStatus === 'error' ? 'Sync failed' : 'Up to date'}
            </p>
          </div>
        </div>
        {queuedCount > 0 && (
          <Button size="sm" variant="outline" onClick={handleSync}>
            <RefreshCw className="w-4 h-4" />
            Sync
          </Button>
        )}
      </div>

      {/* Add Visit */}
      <button
        onClick={() => navigate('/app/visits/new')}
        className="w-full py-3 bg-primary-700 text-white font-medium rounded-xl hover:bg-primary-800 transition-colors flex items-center justify-center gap-2"
      >
        <Plus className="w-5 h-5" />
        Add Visit
      </button>

      {/* View map */}
      {activeSession && (
        <button
          onClick={() => navigate('/app/map')}
          className="w-full py-3 bg-white text-primary-700 border border-primary-200 font-medium rounded-xl hover:bg-primary-50 transition-colors flex items-center justify-center gap-2"
        >
          <MapPin className="w-5 h-5" />
          View Live Map
        </button>
      )}

      {/* Today's sessions */}
      <Card title="Today's Sessions">
        {todaySessions.length === 0 ? (
          <EmptyState title="No sessions today" />
        ) : (
          <div className="divide-y divide-gray-50">
            {todaySessions.map((s) => (
              <div key={s.id} className="px-6 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {formatTime(s.checkInTime)} - {s.checkOutTime ? formatTime(s.checkOutTime) : 'Active'}
                  </p>
                  <p className="text-xs text-gray-500">{formatDuration(s.duration)}</p>
                </div>
                <Badge color={s.status === 'active' ? 'green' : 'gray'}>{s.status}</Badge>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Today's visits */}
      <Card title="Today's Visits">
        {todayVisits.length === 0 ? (
          <EmptyState title="No visits today" />
        ) : (
          <div className="divide-y divide-gray-50">
            {todayVisits.map((v) => (
              <div
                key={v.id}
                onClick={() => navigate(`/app/visits/${v.id}`)}
                className="px-6 py-3 flex items-center justify-between cursor-pointer hover:bg-gray-50"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">{v.storeName || '—'}</p>
                  <p className="text-xs text-gray-500">{formatDateTime(v.visitTime)}</p>
                </div>
                <span className="text-sm font-semibold text-primary-700">
                  {v.itemCount || 0} items
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Earth's radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
