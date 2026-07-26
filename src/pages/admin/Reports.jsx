import React, { useState, useEffect, useCallback } from 'react';
import { FileText, Download, Search, ArrowUp, ArrowDown } from 'lucide-react';
import { reportService } from '../../api/services.js';
import {
  LoadingCard, EmptyState, ErrorState, Button, Pagination,
} from '../../components/ui/index.jsx';
import { useToast } from '../../components/ui/Toast.jsx';
import { formatMoney, formatDate } from '../../utils/format.js';
import { extractList } from '../../utils/apiData.js';

const TABS = [
  { key: 'employee', label: 'By Employee', endpoint: 'getByEmployee' },
  { key: 'store', label: 'By Store', endpoint: 'getByStore' },
  { key: 'product', label: 'By Product', endpoint: 'getByProduct' },
  { key: 'date', label: 'Date-wise', endpoint: 'getByDate' },
];

const COLUMNS = {
  employee: [
    { key: 'employeeName', label: 'Employee', sortable: true },
    { key: 'employeeId', label: 'Emp ID' },
    { key: 'totalVisits', label: 'Visits', sortable: true },
    { key: 'totalSessions', label: 'Sessions', sortable: true },
    {
      key: 'totalDistanceKm',
      label: 'Distance (km)',
      sortable: true,
      format: (v) => Number(v || 0).toFixed(2),
    },
    {
      key: 'totalVisitValue',
      label: 'Revenue',
      sortable: true,
      format: (v) => formatMoney(v || 0),
    },
  ],
  store: [
    { key: 'storeName', label: 'Store', sortable: true },
    { key: 'city', label: 'City' },
    { key: 'totalVisits', label: 'Visits', sortable: true },
    { key: 'totalQuantity', label: 'Items' },
    {
      key: 'totalValue',
      label: 'Revenue',
      sortable: true,
      format: (v) => formatMoney(v || 0),
    },
    {
      key: 'totalCollected',
      label: 'Collected',
      sortable: true,
      format: (v) => formatMoney(v || 0),
    },
  ],
  product: [
    { key: 'productName', label: 'Product', sortable: true },
    { key: 'sku', label: 'SKU' },
    { key: 'totalQuantity', label: 'Qty Sold', sortable: true },
    { key: 'visitCount', label: 'Visits' },
    {
      key: 'totalRevenue',
      label: 'Revenue',
      sortable: true,
      format: (v) => formatMoney(v || 0),
    },
  ],
  date: [
    { key: 'date', label: 'Date', sortable: true, format: (v) => formatDate(v) },
    { key: 'totalVisits', label: 'Visits', sortable: true },
    { key: 'totalSessions', label: 'Sessions', sortable: true },
    { key: 'totalQuantity', label: 'Items' },
    {
      key: 'totalDistanceKm',
      label: 'Distance (km)',
      sortable: true,
      format: (v) => Number(v || 0).toFixed(2),
    },
    {
      key: 'totalValue',
      label: 'Revenue',
      sortable: true,
      format: (v) => formatMoney(v || 0),
    },
  ],
};

export default function Reports() {
  const [activeTab, setActiveTab] = useState('employee');
  const [data, setData] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sort, setSort] = useState({ key: null, dir: 'asc' });
  const { toastError } = useToast();

  const loadReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const tab = TABS.find((t) => t.key === activeTab);
      const params = {};
      if (dateRange.start) params.startDate = dateRange.start;
      if (dateRange.end) params.endDate = dateRange.end;
      const res = await reportService[tab.endpoint](params);
      let rows = extractList(res, 'rows').map((row) => {
        if (activeTab === 'product') {
          return { ...row, productName: row.productName || row._id };
        }
        if (activeTab === 'date') {
          return { ...row, date: row.date || row._id };
        }
        return row;
      });

      if (search.trim()) {
        const q = search.trim().toLowerCase();
        rows = rows.filter((row) =>
          Object.values(row).some((v) => String(v ?? '').toLowerCase().includes(q)),
        );
      }

      setData(rows);

      const moneyKey = activeTab === 'employee'
        ? 'totalVisitValue'
        : activeTab === 'product'
          ? 'totalRevenue'
          : 'totalValue';
      const summaryData = {
        rows: rows.length,
        totalVisits: rows.reduce((s, r) => s + (Number(r.totalVisits) || 0), 0),
        totalQuantity: rows.reduce((s, r) => s + (Number(r.totalQuantity) || 0), 0),
        totalDistanceKm: rows.reduce((s, r) => s + (Number(r.totalDistanceKm) || 0), 0),
        totalValue: rows.reduce((s, r) => s + (Number(r[moneyKey]) || 0), 0),
      };
      setSummary(summaryData);
      setTotalPages(1);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load report');
    } finally {
      setLoading(false);
    }
  }, [activeTab, page, search, dateRange]);

  useEffect(() => {
    const timer = setTimeout(() => loadReport(), 300);
    return () => clearTimeout(timer);
  }, [loadReport]);

  const handleSort = (key) => {
    setSort((s) => ({
      key,
      dir: s.key === key && s.dir === 'asc' ? 'desc' : 'asc',
    }));
  };

  const sortedData = React.useMemo(() => {
    if (!sort.key) return data;
    const sorted = [...data].sort((a, b) => {
      const aVal = a[sort.key];
      const bVal = b[sort.key];
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sort.dir === 'asc' ? aVal - bVal : bVal - aVal;
      }
      return sort.dir === 'asc'
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });
    return sorted;
  }, [data, sort]);

  const handleExport = async (format) => {
    try {
      const tab = TABS.find((t) => t.key === activeTab);
      const params = { startDate: dateRange.start, endDate: dateRange.end };
      let res;
      if (format === 'pdf') res = await reportService.exportPDF(tab.key, params);
      else if (format === 'excel') res = await reportService.exportExcel(tab.key, params);
      else res = await reportService.exportCSV(tab.key, params);

      const blob = new Blob([res.data], {
        type: res.headers['content-type'] || 'application/octet-stream',
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report-${tab.key}-${format === 'pdf' ? 'export.pdf' : format === 'excel' ? 'export.xlsx' : 'export.csv'}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      toastError('Failed to export report');
    }
  };

  const columns = COLUMNS[activeTab];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <p className="text-sm text-gray-500">Generate and export reports</p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => { setActiveTab(tab.key); setPage(1); setSort({ key: null, dir: 'asc' }); }}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeTab === tab.key
                ? 'bg-primary-700 text-white'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <input type="date" value={dateRange.start} onChange={(e) => setDateRange((d) => ({ ...d, start: e.target.value }))} className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
          <input type="date" value={dateRange.end} onChange={(e) => setDateRange((d) => ({ ...d, end: e.target.value }))} className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">Export:</span>
          <Button size="sm" variant="outline" onClick={() => handleExport('pdf')}>
            <Download className="w-4 h-4" />
            PDF
          </Button>
          <Button size="sm" variant="outline" onClick={() => handleExport('excel')}>
            <Download className="w-4 h-4" />
            Excel
          </Button>
          <Button size="sm" variant="outline" onClick={() => handleExport('csv')}>
            <Download className="w-4 h-4" />
            CSV
          </Button>
        </div>
      </div>

      {summary && !loading && !error && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500">Rows</p>
            <p className="text-xl font-bold text-gray-900">{summary.rows}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500">Visits</p>
            <p className="text-xl font-bold text-gray-900">{summary.totalVisits}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500">Distance (km)</p>
            <p className="text-xl font-bold text-gray-900">{Number(summary.totalDistanceKm || 0).toFixed(2)}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500">Revenue</p>
            <p className="text-xl font-bold text-gray-900">{formatMoney(summary.totalValue || 0)}</p>
          </div>
        </div>
      )}

      {/* Summary */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.entries(summary).slice(0, 4).map(([key, value]) => (
            <div key={key} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <p className="text-sm text-gray-500 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</p>
              <p className="text-xl font-bold text-gray-900 mt-1">
                {typeof value === 'number' && key.toLowerCase().includes('amount')
                  ? formatMoney(value)
                  : typeof value === 'number'
                    ? value.toLocaleString()
                    : value}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      {loading ? (
        <LoadingCard rows={8} />
      ) : error ? (
        <ErrorState message={error} onRetry={loadReport} />
      ) : sortedData.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <EmptyState icon={FileText} title="No data found" message="Try adjusting your filters." />
        </div>
      ) : (
        <>
          <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    {columns.map((col) => (
                      <th
                        key={col.key}
                        onClick={() => col.sortable && handleSort(col.key)}
                        className={`px-6 py-3 text-left font-medium text-gray-600 ${col.sortable ? 'cursor-pointer hover:bg-gray-100' : ''}`}
                      >
                        <div className="flex items-center gap-1">
                          {col.label}
                          {col.sortable && sort.key === col.key && (
                            sort.dir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                          )}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {sortedData.map((row, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      {columns.map((col) => (
                        <td key={col.key} className="px-6 py-3 text-gray-700">
                          {col.format ? col.format(row[col.key]) : (row[col.key] ?? '—')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {sortedData.map((row, i) => (
              <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                {columns.map((col) => (
                  <div key={col.key} className="flex justify-between py-1">
                    <span className="text-xs text-gray-500">{col.label}</span>
                    <span className="text-sm font-medium text-gray-900">
                      {col.format ? col.format(row[col.key]) : (row[col.key] ?? '—')}
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>

          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
