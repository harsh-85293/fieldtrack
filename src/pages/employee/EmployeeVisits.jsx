import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { MapPinned, Search } from 'lucide-react';
import { visitService } from '../../api/services.js';
import {
  LoadingCard, EmptyState, ErrorState, Badge, Pagination,
} from '../../components/ui/index.jsx';
import { formatDateTime, formatMoney } from '../../utils/format.js';

export default function EmployeeVisits() {
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dateFilter, setDateFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const loadVisits = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { page, date: dateFilter };
      const res = await visitService.getMyVisits(params);
      const data = res.data.data || res.data;
      setVisits(data.visits || data.items || data || []);
      setTotalPages(data.totalPages || data.pages || 1);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load visits');
    } finally {
      setLoading(false);
    }
  }, [page, dateFilter]);

  useEffect(() => {
    const timer = setTimeout(() => loadVisits(), 300);
    return () => clearTimeout(timer);
  }, [loadVisits]);

  return (
    <div className="p-4 space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">My Visits</h1>
        <p className="text-sm text-gray-500">View your store visits</p>
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
        <ErrorState message={error} onRetry={loadVisits} />
      ) : visits.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <EmptyState icon={MapPinned} title="No visits found" message="Record your first store visit." />
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {visits.map((v) => (
              <Link
                key={v.id}
                to={`/app/visits/${v.id}`}
                className="block bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:border-primary-300 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{v.storeName || '—'}</p>
                    <p className="text-xs text-gray-500 mt-1">{formatDateTime(v.visitTime)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-primary-700">{formatMoney(v.totalAmount || 0)}</p>
                    <p className="text-xs text-gray-500">{v.itemCount || 0} items</p>
                  </div>
                </div>
                {v.outsideRadius && (
                  <Badge color="red" className="mt-2">Outside Radius</Badge>
                )}
              </Link>
            ))}
          </div>
          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
