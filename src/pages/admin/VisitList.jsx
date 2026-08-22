import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { MapPinned, Search } from 'lucide-react';
import { visitService, employeeService, storeService } from '../../api/services.js';
import {
  LoadingCard, EmptyState, ErrorState, Badge, Pagination,
} from '../../components/ui/index.jsx';
import { formatDateTime, formatMoney } from '../../utils/format.js';

export default function VisitList() {
  const [visits, setVisits] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ employeeId: '', storeId: '', startDate: '', endDate: '', outsideRadius: '' });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const loadOptions = useCallback(async () => {
    try {
      const [empRes, storeRes] = await Promise.all([
        employeeService.getAll({ limit: 1000 }),
        storeService.getAll({ limit: 1000 }),
      ]);
      const empData = empRes.data.data || empRes.data;
      setEmployees(empData.employees || empData.items || empData || []);
      const storeData = storeRes.data.data || storeRes.data;
      setStores(storeData.stores || storeData.items || storeData || []);
    } catch { /* ignore */ }
  }, []);

  const loadVisits = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { page, search, ...filters };
      const res = await visitService.getAll(params);
      const data = res.data.data || res.data;
      setVisits(data.visits || data.items || data || []);
      setTotalPages(data.totalPages || data.pages || 1);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load visits');
    } finally {
      setLoading(false);
    }
  }, [page, search, filters]);

  useEffect(() => {
    loadOptions();
  }, [loadOptions]);

  useEffect(() => {
    const timer = setTimeout(() => loadVisits(), 300);
    return () => clearTimeout(timer);
  }, [loadVisits]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Store Visits</h1>
        <p className="text-sm text-gray-500">View all store visits</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search visits..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <select
            value={filters.employeeId}
            onChange={(e) => { setFilters(f => ({ ...f, employeeId: e.target.value })); setPage(1); }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
          >
            <option value="">All Employees</option>
            {employees.map((emp) => <option key={emp.id} value={emp.id}>{emp.name}</option>)}
          </select>
          <select
            value={filters.storeId}
            onChange={(e) => { setFilters(f => ({ ...f, storeId: e.target.value })); setPage(1); }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
          >
            <option value="">All Stores</option>
            {stores.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <input type="date" value={filters.startDate} onChange={(e) => { setFilters(f => ({ ...f, startDate: e.target.value })); setPage(1); }} className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
          <input type="date" value={filters.endDate} onChange={(e) => { setFilters(f => ({ ...f, endDate: e.target.value })); setPage(1); }} className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
          <select
            value={filters.outsideRadius}
            onChange={(e) => { setFilters(f => ({ ...f, outsideRadius: e.target.value })); setPage(1); }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
          >
            <option value="">All Locations</option>
            <option value="true">Outside Radius Only</option>
          </select>
        </div>
      </div>

      {loading ? (
        <LoadingCard rows={6} />
      ) : error ? (
        <ErrorState message={error} onRetry={loadVisits} />
      ) : visits.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <EmptyState icon={MapPinned} title="No visits found" message="Try adjusting your filters." />
        </div>
      ) : (
        <>
          <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="px-6 py-3 text-left font-medium text-gray-600">Employee</th>
                    <th className="px-6 py-3 text-left font-medium text-gray-600">Store</th>
                    <th className="px-6 py-3 text-left font-medium text-gray-600">Date</th>
                    <th className="px-6 py-3 text-left font-medium text-gray-600">Items</th>
                    <th className="px-6 py-3 text-left font-medium text-gray-600">Total</th>
                    <th className="px-6 py-3 text-left font-medium text-gray-600">Location</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {visits.map((v) => (
                    <tr key={v.id} className="hover:bg-gray-50">
                      <td className="px-6 py-3 text-gray-700">{v.employeeName || '—'}</td>
                      <td className="px-6 py-3 text-gray-700">{v.storeName || '—'}</td>
                      <td className="px-6 py-3 text-gray-600">{formatDateTime(v.visitTime)}</td>
                      <td className="px-6 py-3 text-gray-600">{v.itemCount || 0}</td>
                      <td className="px-6 py-3 text-gray-600">{formatMoney(v.totalAmount || 0)}</td>
                      <td className="px-6 py-3">
                        {v.outsideRadius ? (
                          <Badge color="red">Outside</Badge>
                        ) : (
                          <Badge color="green">On-site</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="md:hidden space-y-3">
            {visits.map((v) => (
              <Link key={v.id} to={`/admin/visits/${v.id}`} className="block bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:border-primary-300">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{v.storeName || '—'}</p>
                    <p className="text-xs text-gray-500">{v.employeeName || '—'}</p>
                    <p className="text-xs text-gray-500 mt-1">{formatDateTime(v.visitTime)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-primary-700">{formatMoney(v.totalAmount || 0)}</p>
                    {v.outsideRadius ? (
                      <Badge color="red" className="mt-1">Outside</Badge>
                    ) : (
                      <Badge color="green" className="mt-1">On-site</Badge>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>

          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
