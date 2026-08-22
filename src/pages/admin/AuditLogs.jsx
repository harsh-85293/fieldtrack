import React, { useState, useEffect, useCallback } from 'react';
import { Search, FileText } from 'lucide-react';
import { auditService } from '../../api/services.js';
import {
  LoadingCard, EmptyState, ErrorState, Badge, Pagination,
} from '../../components/ui/index.jsx';
import { formatDateTime } from '../../utils/format.js';

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { page, search, action: actionFilter };
      const res = await auditService.getAll(params);
      const data = res.data.data || res.data;
      setLogs(data.logs || data.items || data || []);
      setTotalPages(data.totalPages || data.pages || 1);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  }, [page, search, actionFilter]);

  useEffect(() => {
    const timer = setTimeout(() => loadLogs(), 300);
    return () => clearTimeout(timer);
  }, [loadLogs]);

  const actionColors = {
    CREATE: 'green',
    UPDATE: 'blue',
    DELETE: 'red',
    LOGIN: 'amber',
    LOGOUT: 'gray',
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
        <p className="text-sm text-gray-500">Track all system activities</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search logs..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <select
          value={actionFilter}
          onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
        >
          <option value="">All Actions</option>
          <option value="CREATE">Create</option>
          <option value="UPDATE">Update</option>
          <option value="DELETE">Delete</option>
          <option value="LOGIN">Login</option>
          <option value="LOGOUT">Logout</option>
        </select>
      </div>

      {loading ? (
        <LoadingCard rows={8} />
      ) : error ? (
        <ErrorState message={error} onRetry={loadLogs} />
      ) : logs.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <EmptyState icon={FileText} title="No audit logs found" message="Try adjusting your filters." />
        </div>
      ) : (
        <>
          <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="px-6 py-3 text-left font-medium text-gray-600">Timestamp</th>
                    <th className="px-6 py-3 text-left font-medium text-gray-600">User</th>
                    <th className="px-6 py-3 text-left font-medium text-gray-600">Action</th>
                    <th className="px-6 py-3 text-left font-medium text-gray-600">Entity</th>
                    <th className="px-6 py-3 text-left font-medium text-gray-600">Description</th>
                    <th className="px-6 py-3 text-left font-medium text-gray-600">IP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-6 py-3 text-gray-600">{formatDateTime(log.timestamp || log.createdAt)}</td>
                      <td className="px-6 py-3 text-gray-700">{log.userName || log.user || '—'}</td>
                      <td className="px-6 py-3">
                        <Badge color={actionColors[log.action] || 'gray'}>{log.action}</Badge>
                      </td>
                      <td className="px-6 py-3 text-gray-600">{log.entity || log.entityType || '—'}</td>
                      <td className="px-6 py-3 text-gray-600">{log.description || '—'}</td>
                      <td className="px-6 py-3 text-gray-500">{log.ipAddress || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="md:hidden space-y-3">
            {logs.map((log) => (
              <div key={log.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <div className="flex items-start justify-between mb-2">
                  <Badge color={actionColors[log.action] || 'gray'}>{log.action}</Badge>
                  <span className="text-xs text-gray-500">{formatDateTime(log.timestamp || log.createdAt)}</span>
                </div>
                <p className="text-sm font-medium text-gray-900">{log.userName || log.user || '—'}</p>
                <p className="text-xs text-gray-500 mt-1">{log.description || '—'}</p>
                <div className="flex justify-between mt-2 text-xs text-gray-400">
                  <span>{log.entity || log.entityType || '—'}</span>
                  <span>{log.ipAddress || '—'}</span>
                </div>
              </div>
            ))}
          </div>

          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
