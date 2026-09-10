import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MapPinned, Search } from 'lucide-react';
import { visitService, employeeService, storeService } from '../../api/services.js';
import {
  LoadingCard, EmptyState, ErrorState, Badge, Pagination,
} from '../../components/ui/index.jsx';
import { formatDateTime, formatRupees, entityId } from '../../utils/format.js';
import { extractList, extractPagination } from '../../utils/apiData.js';

export default function VisitList() {
  const navigate = useNavigate();
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
      setEmployees(extractList(empRes, 'employees'));
      setStores(extractList(storeRes, 'stores'));
    } catch { /* ignore */ }
  }, []);

  const loadVisits = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { page };
      if (search) params.search = search;
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== '' && value != null) params[key] = value;
      });
      const res = await visitService.getAll(params);
      setVisits(extractList(res, 'visits'));
      setTotalPages(extractPagination(res).pages);
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
            {employees.map((emp) => <option key={entityId(emp)} value={entityId(emp)}>{emp.fullName || emp.name}</option>)}
          </select>
          <select
            value={filters.storeId}
            onChange={(e) => { setFilters(f => ({ ...f, storeId: e.target.value })); setPage(1); }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
          >
            <option value="">All Stores</option>
            {stores.map((s) => <option key={entityId(s)} value={entityId(s)}>{s.name}</option>)}
          </select>
          <input type="date" value={filters.startDate} onChange={(e) => { setFilters(f => ({ ...f, startDate: e.target.value })); setPage(1); }} className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
          <input type="date" value={filters.endDate} onChange={(e) => { setFilters(f => ({ ...f, endDate: e.target.value })); setPage(1); }} className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
          <select
            value={filters.outsideRadius}
            onChange={(e) => { setFilters(f => ({ ...f, outsideRadius: e.target.value })); setPage(1); }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
          >
            <option value="">All Locations</option>
            <option value="false">On-site Only</option>
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
                  {visits.map((v) => {
                    const id = entityId(v);
                    const outside = v.isOutsideRadius ?? v.outsideRadius;
                    return (
                    <tr
                      key={id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => id && navigate(`/admin/visits/${id}`)}
                    >
                      <td className="px-6 py-3 text-gray-700">{v.employee?.fullName || v.employeeName || '—'}</td>
                      <td className="px-6 py-3 text-gray-700">{v.store?.name || v.storeName || '—'}</td>
                      <td className="px-6 py-3 text-gray-600">{formatDateTime(v.visitDate || v.visitTime)}</td>
                      <td className="px-6 py-3 text-gray-600">{v.totalQuantity || v.items?.length || v.itemCount || 0}</td>
                      <td className="px-6 py-3 text-gray-600">{formatRupees(v.totalValue ?? v.totalAmount ?? 0)}</td>
                      <td className="px-6 py-3">
                        {outside ? (
                          <Badge color="red">Outside</Badge>
                        ) : (
                          <Badge color="green">On-site</Badge>
                        )}
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="md:hidden space-y-3">
            {visits.map((v) => {
              const id = entityId(v);
              if (!id) return null;
              const outside = v.isOutsideRadius ?? v.outsideRadius;
              return (
              <Link key={id} to={`/admin/visits/${id}`} className="block bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:border-primary-300">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{v.store?.name || v.storeName || '—'}</p>
                    <p className="text-xs text-gray-500">{v.employee?.fullName || v.employeeName || '—'}</p>
                    <p className="text-xs text-gray-500 mt-1">{formatDateTime(v.visitDate || v.visitTime)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-primary-700">{formatRupees(v.totalValue ?? v.totalAmount ?? 0)}</p>
                    {outside ? (
                      <Badge color="red" className="mt-1">Outside</Badge>
                    ) : (
                      <Badge color="green" className="mt-1">On-site</Badge>
                    )}
                  </div>
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
