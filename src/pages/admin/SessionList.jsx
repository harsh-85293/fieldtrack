import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Clock, Search } from 'lucide-react';
import { sessionService, employeeService } from '../../api/services.js';
import {
  LoadingCard, EmptyState, ErrorState, Badge, Pagination,
} from '../../components/ui/index.jsx';
import { formatDateTime, formatDuration, formatDistance, entityId, sessionCheckIn, sessionCheckOut, sessionDurationSeconds, sessionDistanceMeters } from '../../utils/format.js';
import { extractList, extractPagination } from '../../utils/apiData.js';

export default function SessionList() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ employeeId: '', status: '', startDate: '', endDate: '' });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const loadEmployees = useCallback(async () => {
    try {
      const res = await employeeService.getAll({ limit: 1000 });
      setEmployees(extractList(res, 'employees'));
    } catch { /* ignore */ }
  }, []);

  const loadSessions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { page, search, ...filters };
      const res = await sessionService.getAll(params);
      setSessions(extractList(res, 'sessions'));
      setTotalPages(extractPagination(res).pages);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load sessions');
    } finally {
      setLoading(false);
    }
  }, [page, search, filters]);

  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  useEffect(() => {
    const timer = setTimeout(() => loadSessions(), 300);
    return () => clearTimeout(timer);
  }, [loadSessions]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Sessions</h1>
        <p className="text-sm text-gray-500">View employee attendance sessions</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search sessions..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <select
            value={filters.employeeId}
            onChange={(e) => { setFilters(f => ({ ...f, employeeId: e.target.value })); setPage(1); }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
          >
            <option value="">All Employees</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>{emp.name}</option>
            ))}
          </select>
          <select
            value={filters.status}
            onChange={(e) => { setFilters(f => ({ ...f, status: e.target.value })); setPage(1); }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
          </select>
          <input
            type="date"
            value={filters.startDate}
            onChange={(e) => { setFilters(f => ({ ...f, startDate: e.target.value })); setPage(1); }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <input
            type="date"
            value={filters.endDate}
            onChange={(e) => { setFilters(f => ({ ...f, endDate: e.target.value })); setPage(1); }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </div>

      {loading ? (
        <LoadingCard rows={6} />
      ) : error ? (
        <ErrorState message={error} onRetry={loadSessions} />
      ) : sessions.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <EmptyState icon={Clock} title="No sessions found" message="Try adjusting your filters." />
        </div>
      ) : (
        <>
          <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="px-6 py-3 text-left font-medium text-gray-600">Employee</th>
                    <th className="px-6 py-3 text-left font-medium text-gray-600">Check In</th>
                    <th className="px-6 py-3 text-left font-medium text-gray-600">Check Out</th>
                    <th className="px-6 py-3 text-left font-medium text-gray-600">Duration</th>
                    <th className="px-6 py-3 text-left font-medium text-gray-600">Distance</th>
                    <th className="px-6 py-3 text-left font-medium text-gray-600">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {sessions.map((s) => {
                    const id = entityId(s);
                    const employee = s.employee || {};
                    return (
                    <tr key={id} className="hover:bg-gray-50 cursor-pointer" onClick={() => navigate(`/admin/sessions/${id}`)}>
                      <td className="px-6 py-3">
                        <span className="font-medium text-primary-700">
                          {employee.fullName || s.employeeName || '—'}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-gray-600">{formatDateTime(sessionCheckIn(s))}</td>
                      <td className="px-6 py-3 text-gray-600">{formatDateTime(sessionCheckOut(s))}</td>
                      <td className="px-6 py-3 text-gray-600">{formatDuration(sessionDurationSeconds(s))}</td>
                      <td className="px-6 py-3 text-gray-600">{formatDistance(sessionDistanceMeters(s))}</td>
                      <td className="px-6 py-3">
                        <Badge color={s.status === 'active' ? 'green' : 'gray'}>{s.status}</Badge>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="md:hidden space-y-3">
            {sessions.map((s) => {
              const id = entityId(s);
              if (!id) return null;
              const employee = s.employee || {};
              return (
              <Link key={id} to={`/admin/sessions/${id}`} className="block bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:border-primary-300">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{employee.fullName || s.employeeName || '—'}</p>
                    <p className="text-xs text-gray-500 mt-1">In: {formatDateTime(sessionCheckIn(s))}</p>
                    <p className="text-xs text-gray-500">Out: {formatDateTime(sessionCheckOut(s))}</p>
                  </div>
                  <Badge color={s.status === 'active' ? 'green' : 'gray'}>{s.status}</Badge>
                </div>
                <div className="mt-2 flex gap-4 text-xs text-gray-500">
                  <span>Duration: {formatDuration(sessionDurationSeconds(s))}</span>
                  <span>Distance: {formatDistance(sessionDistanceMeters(s))}</span>
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
