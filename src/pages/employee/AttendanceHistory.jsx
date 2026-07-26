import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Clock } from 'lucide-react';
import { sessionService } from '../../api/services.js';
import {
  LoadingCard, EmptyState, ErrorState, Badge, Pagination,
} from '../../components/ui/index.jsx';
import {
  formatDateTime,
  formatDuration,
  formatDistance,
  entityId,
  sessionCheckIn,
  sessionDurationSeconds,
  sessionDistanceMeters,
} from '../../utils/format.js';
import { extractList, extractPagination } from '../../utils/apiData.js';

export default function AttendanceHistory() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dateFilter, setDateFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const loadSessions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { page };
      if (dateFilter) params.date = dateFilter;
      const res = await sessionService.getMySessions(params);
      setSessions(extractList(res, 'sessions'));
      setTotalPages(extractPagination(res).pages);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load sessions');
    } finally {
      setLoading(false);
    }
  }, [page, dateFilter]);

  useEffect(() => {
    const timer = setTimeout(() => loadSessions(), 300);
    return () => clearTimeout(timer);
  }, [loadSessions]);

  return (
    <div className="p-4 space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Attendance History</h1>
        <p className="text-sm text-gray-500">Your past attendance sessions</p>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="date"
          value={dateFilter}
          onChange={(e) => { setDateFilter(e.target.value); setPage(1); }}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
        {dateFilter && (
          <button
            onClick={() => { setDateFilter(''); setPage(1); }}
            className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700"
          >
            Clear
          </button>
        )}
      </div>

      {loading ? (
        <LoadingCard rows={5} />
      ) : error ? (
        <ErrorState message={error} onRetry={loadSessions} />
      ) : sessions.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <EmptyState icon={Clock} title="No sessions found" message="Your attendance history will appear here." />
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {sessions.map((s) => {
              const id = entityId(s);
              if (!id) return null;
              return (
                <Link
                  key={id}
                  to={`/app/attendance/${id}`}
                  className="block bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:border-primary-300 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {formatDateTime(sessionCheckIn(s))}
                      </p>
                      <div className="mt-1 flex gap-3 text-xs text-gray-500">
                        <span>Duration: {formatDuration(sessionDurationSeconds(s))}</span>
                        <span>Distance: {formatDistance(sessionDistanceMeters(s))}</span>
                      </div>
                    </div>
                    <Badge color={s.status === 'active' ? 'green' : 'gray'}>{s.status}</Badge>
                  </div>
                </Link>
              );
            })}
          </div>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
