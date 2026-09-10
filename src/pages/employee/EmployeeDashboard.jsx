import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, MapPin, Plus, Wifi, WifiOff, RefreshCw, LogIn, LogOut, Navigation } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { sessionService, visitService, locationService } from '../../api/services.js';
import {
  LoadingSpinner, EmptyState, ErrorState, Badge, Button, Card,
} from '../../components/ui/index.jsx';
import { useToast } from '../../components/ui/Toast.jsx';
import { formatDateTime, formatTime, formatDuration, formatDistance, formatDate, entityId } from '../../utils/format.js';
import { getQueuedLocationCount, queueLocationPoint, getQueuedLocationPoints, clearQueuedLocationPoints, getPendingVisits, removePendingVisit, getPendingVisitCount } from '../../lib/offlineDb.js';
import { extractList } from '../../utils/apiData.js';

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
  const pendingPointsRef = useRef([]);
  const flushTimerRef = useRef(null);
  const handleSyncRef = useRef(null);

  const today = new Date().toISOString().split('T')[0];

  const refreshQueueCount = useCallback(async () => {
    const [locCount, visitCount] = await Promise.all([
      getQueuedLocationCount(),
      getPendingVisitCount(),
    ]);
    setQueuedCount(locCount + visitCount);
  }, []);

  const flushLocationPoints = useCallback(async (session, points) => {
    const sessionId = entityId(session);
    if (!sessionId || !points?.length) return;
    try {
      await locationService.upload({
        sessionId,
        points: points.map((p) => ({
          latitude: p.latitude,
          longitude: p.longitude,
          accuracy: p.accuracy,
          speed: p.speed,
          heading: p.heading,
          clientTimestamp: p.clientTimestamp || p.timestamp || new Date().toISOString(),
        })),
      });
      refreshQueueCount();
    } catch (err) {
      // Offline / network — queue for later
      for (const p of points) {
        await queueLocationPoint({ ...p, sessionId });
      }
      refreshQueueCount();
    }
  }, [refreshQueueCount]);

  // Load data
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [sessRes, visRes] = await Promise.all([
        sessionService.getMySessions({ date: today }),
        visitService.getMyVisits({ date: today }),
      ]);
      const sessions = extractList(sessRes, 'sessions');
      setTodaySessions(sessions);
      const active = sessions.find((s) => s.status === 'active') || null;
      setActiveSession(active);
      setTodayVisits(extractList(visRes, 'visits'));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [today]);

  useEffect(() => {
    loadData();
    refreshQueueCount();
  }, [loadData, refreshQueueCount]);

  useEffect(() => {
    const onOnline = () => {
      refreshQueueCount();
      handleSyncRef.current?.();
    };
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [refreshQueueCount]);

  // Timer for active session
  useEffect(() => {
    if (activeSession && (activeSession.checkInAt || activeSession.checkInTime)) {
      const start = new Date(activeSession.checkInAt || activeSession.checkInTime).getTime();
      const update = () => {
        setElapsed(Math.floor((Date.now() - start) / 1000));
      };
      update();
      timerRef.current = setInterval(update, 1000);
      return () => clearInterval(timerRef.current);
    }
  }, [activeSession]);

  // GPS tracking + upload to server
  useEffect(() => {
    if (!activeSession) {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      if (flushTimerRef.current) {
        clearInterval(flushTimerRef.current);
        flushTimerRef.current = null;
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
          speed: pos.coords.speed,
          heading: pos.coords.heading,
          clientTimestamp: new Date().toISOString(),
          timestamp: new Date().toISOString(),
        };
        setCurrentPosition(point);
        pendingPointsRef.current.push(point);

        if (lastPointRef.current) {
          const d = haversineDistance(
            lastPointRef.current.latitude,
            lastPointRef.current.longitude,
            point.latitude,
            point.longitude
          );
          if (d > 2) {
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

    // Flush buffered GPS points every 15s
    flushTimerRef.current = setInterval(() => {
      const batch = pendingPointsRef.current.splice(0, pendingPointsRef.current.length);
      if (batch.length > 0) flushLocationPoints(activeSession, batch);
    }, 15000);

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      if (flushTimerRef.current) {
        clearInterval(flushTimerRef.current);
        flushTimerRef.current = null;
      }
      // Flush remaining points on unmount / session end
      const batch = pendingPointsRef.current.splice(0, pendingPointsRef.current.length);
      if (batch.length > 0) flushLocationPoints(activeSession, batch);
    };
  }, [activeSession, flushLocationPoints]);

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
          const checkInPoint = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            clientTimestamp: new Date().toISOString(),
          };
          lastPointRef.current = checkInPoint;
          pendingPointsRef.current = [checkInPoint];
          await flushLocationPoints(session, [checkInPoint]);
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
          // Flush any buffered GPS points before checkout
          const batch = pendingPointsRef.current.splice(0, pendingPointsRef.current.length);
          batch.push({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            clientTimestamp: new Date().toISOString(),
          });
          await flushLocationPoints(activeSession, batch);

          await sessionService.checkOut(entityId(activeSession), {
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
      const queued = await getQueuedLocationPoints();
      if (queued.length > 0) {
        const bySession = queued.reduce((acc, p) => {
          const key = p.sessionId || 'unknown';
          if (!acc[key]) acc[key] = [];
          acc[key].push(p);
          return acc;
        }, {});
        for (const [sessionId, points] of Object.entries(bySession)) {
          if (sessionId === 'unknown') continue;
          await locationService.upload({ sessionId, points });
        }
        await clearQueuedLocationPoints();
      }

      const pendingVisits = await getPendingVisits();
      for (const visit of pendingVisits) {
        try {
          await visitService.create(visit);
          await removePendingVisit(visit.idempotencyKey);
        } catch (visitErr) {
          const msg = visitErr.response?.data?.message || '';
          if (msg.includes('idempotent') || visitErr.response?.status === 409) {
            await removePendingVisit(visit.idempotencyKey);
            continue;
          }
          if (!navigator.onLine || visitErr.code === 'ERR_NETWORK' || !visitErr.response) {
            throw visitErr;
          }
          // Keep bad payloads queued for retry after fix
        }
      }

      const [locCount, visitCount] = await Promise.all([
        getQueuedLocationCount(),
        getPendingVisitCount(),
      ]);
      setQueuedCount(locCount + visitCount);
      setSyncStatus('synced');
      toastSuccess('All data synced');
      loadData();
    } catch (err) {
      setSyncStatus('error');
      toastError('Sync failed');
    }
  };

  handleSyncRef.current = handleSync;

  if (loading) return <LoadingSpinner className="py-20" />;
  if (error) return <ErrorState message={error} onRetry={loadData} />;

  const gpsInfo = {
    idle: { label: 'GPS Off', iconClass: 'text-slate-400', icon: MapPin },
    acquiring: { label: 'Getting GPS...', iconClass: 'text-amber-500', icon: RefreshCw },
    success: { label: 'GPS Active', iconClass: 'text-emerald-500', icon: MapPin },
    denied: { label: 'GPS Denied', iconClass: 'text-red-500', icon: MapPin },
    unavailable: { label: 'GPS Unavailable', iconClass: 'text-slate-400', icon: MapPin },
    error: { label: 'GPS Error', iconClass: 'text-red-500', icon: MapPin },
  };
  const gps = gpsInfo[gpsStatus] || gpsInfo.idle;
  const firstName = (user?.fullName || user?.name || '').split(' ')[0] || 'there';
  const checkInLabel = todaySessions.some((s) => s.status === 'completed' || s.status === 'COMPLETED')
    ? 'Start New Session'
    : 'Check In';

  return (
    <div className="w-full min-w-0 space-y-4">
      {/* Mobile / tablet greeting */}
      <div className="lg:hidden">
        <p className="text-xs text-slate-500">{formatDate(new Date(), 'EEEE, MMM d, yyyy')}</p>
        <h1 className="text-xl font-bold text-slate-900 mt-0.5">Hello, {firstName}</h1>
      </div>

      {/* Attendance strip — stacks on phone, splits on tablet+ */}
      <section className="w-full bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-stretch">
          <div className="flex-1 min-w-0 p-4 sm:p-5 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Attendance</p>
                <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                  {activeSession ? (
                    <Badge color="green">Checked In</Badge>
                  ) : (
                    <Badge color="gray">Not Checked In</Badge>
                  )}
                  <span className="text-xs text-slate-400 hidden sm:inline">
                    {formatDate(new Date(), 'EEEE, MMM d, yyyy')}
                  </span>
                </div>
              </div>
              <gps.icon
                className={`w-7 h-7 shrink-0 ${gps.iconClass} ${gpsStatus === 'acquiring' ? 'animate-spin' : ''}`}
              />
            </div>

            {activeSession && (
              <div className="flex flex-wrap items-end gap-4 sm:gap-6">
                <div>
                  <p className="text-xs text-slate-500 mb-0.5">Session time</p>
                  <p className="text-2xl sm:text-3xl font-bold text-primary-800 tabular-nums leading-none">
                    {formatDuration(elapsed)}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Since {formatTime(activeSession.checkInAt || activeSession.checkInTime)}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 text-sm text-slate-600 pb-0.5">
                  <Navigation className="w-4 h-4 text-slate-400 shrink-0" />
                  {formatDistance(distance)} traveled
                </div>
              </div>
            )}

            <div className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 border border-slate-100 px-3 py-2.5">
              <div className="flex items-center gap-2 min-w-0">
                <gps.icon
                  className={`w-4 h-4 shrink-0 ${gps.iconClass} ${gpsStatus === 'acquiring' ? 'animate-spin' : ''}`}
                />
                <span className="text-sm font-medium text-slate-700 truncate">{gps.label}</span>
              </div>
              {currentPosition && (
                <span className="text-xs text-slate-400 shrink-0">
                  ±{Math.round(currentPosition.accuracy || 0)}m
                </span>
              )}
            </div>
          </div>

          <div className="w-full md:w-56 lg:w-64 xl:w-72 shrink-0 p-4 sm:p-5 md:border-l border-t md:border-t-0 border-slate-100 flex flex-col justify-center gap-3 bg-slate-50/60">
            {activeSession ? (
              <button
                type="button"
                onClick={handleCheckOut}
                disabled={submittingRef.current}
                className="w-full py-3.5 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                <LogOut className="w-5 h-5" />
                Check Out
              </button>
            ) : (
              <button
                type="button"
                onClick={handleCheckIn}
                disabled={submittingRef.current || gpsStatus === 'denied' || gpsStatus === 'unavailable'}
                className="w-full py-3.5 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                <LogIn className="w-5 h-5" />
                {checkInLabel}
              </button>
            )}

            <button
              type="button"
              onClick={() => navigate('/app/visits/new')}
              className="w-full py-3 bg-primary-700 text-white font-medium rounded-xl hover:bg-primary-800 transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Add Visit
            </button>

            {activeSession && (
              <button
                type="button"
                onClick={() => navigate('/app/map')}
                className="w-full py-2.5 bg-white text-primary-700 border border-primary-200 font-medium rounded-xl hover:bg-primary-50 transition-colors flex items-center justify-center gap-2"
              >
                <MapPin className="w-4 h-4" />
                Live Map
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Sync bar */}
      <div className="w-full flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex items-center gap-2.5 min-w-0">
          {syncStatus === 'synced' || queuedCount === 0 ? (
            <Wifi className="w-5 h-5 text-emerald-500 shrink-0" />
          ) : syncStatus === 'syncing' ? (
            <RefreshCw className="w-5 h-5 text-amber-500 animate-spin shrink-0" />
          ) : syncStatus === 'error' ? (
            <WifiOff className="w-5 h-5 text-red-500 shrink-0" />
          ) : (
            <Wifi className="w-5 h-5 text-slate-400 shrink-0" />
          )}
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-800 truncate">
              {queuedCount > 0 ? `${queuedCount} items queued` : 'All data synced'}
            </p>
            <p className="text-xs text-slate-500">
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

      {/* Today's activity — 1 col phone, 2 col from md up */}
      <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card title="Today's Sessions" className="min-h-[160px] min-w-0">
          {todaySessions.length === 0 ? (
            <div className="py-8">
              <EmptyState title="No sessions today" />
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {todaySessions.map((s) => (
                <div key={s._id || s.id} className="px-4 sm:px-5 py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {formatTime(s.checkInAt || s.checkInTime)}
                      {' – '}
                      {(s.checkOutAt || s.checkOutTime) ? formatTime(s.checkOutAt || s.checkOutTime) : 'Active'}
                    </p>
                    <p className="text-xs text-slate-500">
                      {formatDuration(s.totalDurationMs ? Math.floor(s.totalDurationMs / 1000) : (s.duration || 0))}
                    </p>
                  </div>
                  <Badge color={s.status === 'active' ? 'green' : 'gray'}>{s.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card title="Today's Visits" className="min-h-[160px] min-w-0">
          {todayVisits.length === 0 ? (
            <div className="py-8">
              <EmptyState title="No visits today" />
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {todayVisits.map((v) => (
                <button
                  type="button"
                  key={v._id || v.id}
                  onClick={() => navigate(`/app/visits/${v._id || v.id}`)}
                  className="w-full text-left px-4 sm:px-5 py-3 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {v.store?.name || v.storeName || '—'}
                    </p>
                    <p className="text-xs text-slate-500">
                      {formatDateTime(v.visitDate || v.visitTime)}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-primary-700 shrink-0">
                    {v.totalQuantity || v.itemCount || v.items?.length || 0} items
                  </span>
                </button>
              ))}
            </div>
          )}
        </Card>
      </div>
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
