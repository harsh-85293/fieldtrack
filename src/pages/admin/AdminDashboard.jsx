import React, { useState, useEffect, useCallback } from 'react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  Users, Store, Package, MapPinned, Clock, DollarSign, Activity, Navigation,
} from 'lucide-react';
import { dashboardService } from '../../api/services.js';
import {
  LoadingCard, EmptyState, ErrorState, Badge, Card,
} from '../../components/ui/index.jsx';
import { formatDateTime, formatRupees, relativeTime, entityId } from '../../utils/format.js';

const PIE_COLORS = ['#1e40af', '#059669', '#d97706', '#dc2626', '#7c3aed', '#0891b2', '#be185d', '#65a30d'];

export default function AdminDashboard() {
  const [summary, setSummary] = useState(null);
  const [attendanceChart, setAttendanceChart] = useState([]);
  const [visitsChart, setVisitsChart] = useState([]);
  const [topEmployees, setTopEmployees] = useState([]);
  const [productChart, setProductChart] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [liveActivity, setLiveActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (dateRange.start) params.startDate = dateRange.start;
      if (dateRange.end) params.endDate = dateRange.end;

      const [summaryRes, attRes, visRes, topRes, prodRes, actRes, liveRes] = await Promise.all([
        dashboardService.getSummary(params),
        dashboardService.getAttendanceChart(params),
        dashboardService.getVisitsChart(params),
        dashboardService.getTopEmployees(params),
        dashboardService.getProductChart(params),
        dashboardService.getRecentActivity(params),
        dashboardService.getLive(),
      ]);

      setSummary(summaryRes.data.data || summaryRes.data);
      setAttendanceChart(attRes.data.data || attRes.data || []);
      setVisitsChart(visRes.data.data || visRes.data || []);
      setTopEmployees(topRes.data.data || topRes.data || []);
      setProductChart(prodRes.data.data || prodRes.data || []);
      setRecentActivity(actRes.data.data || actRes.data || []);
      const live = liveRes.data.data || liveRes.data || [];
      setLiveActivity(Array.isArray(live) ? live : live.sessions || live.results || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const summaryCards = summary
    ? [
        { label: 'Total Employees', value: summary.totalEmployees ?? 0, icon: Users, color: 'primary' },
        { label: 'Active Today', value: summary.activeToday ?? 0, icon: Activity, color: 'green' },
        { label: 'Total Stores', value: summary.totalStores ?? 0, icon: Store, color: 'blue' },
        { label: 'Total Products', value: summary.totalProducts ?? 0, icon: Package, color: 'purple' },
        { label: 'Visits (range)', value: summary.todayVisits ?? summary.visits ?? 0, icon: MapPinned, color: 'amber' },
        { label: 'Active Sessions', value: summary.activeSessions ?? 0, icon: Clock, color: 'primary' },
        { label: 'Total Revenue', value: formatRupees(summary.totalRevenue ?? 0), icon: DollarSign, color: 'green' },
        { label: 'Distance (km)', value: Number(summary.totalDistanceKm ?? 0).toFixed(2), icon: Navigation, color: 'amber' },
      ]
    : [];

  const colorMap = {
    primary: 'bg-primary-50 text-primary-700',
    green: 'bg-emerald-50 text-emerald-700',
    blue: 'bg-primary-50 text-primary-700',
    purple: 'bg-purple-50 text-purple-700',
    amber: 'bg-amber-50 text-amber-700',
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
              <div className="skeleton-shimmer h-12 w-12 rounded-lg mb-3"></div>
              <div className="skeleton-shimmer h-4 w-24 rounded mb-2"></div>
              <div className="skeleton-shimmer h-8 w-16 rounded"></div>
            </div>
          ))}
        </div>
        <LoadingCard rows={6} />
      </div>
    );
  }

  if (error) {
    return <ErrorState message={error} onRetry={loadData} />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500">Overview of your field operations</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={dateRange.start}
            onChange={(e) => setDateRange((d) => ({ ...d, start: e.target.value }))}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <span className="text-gray-400">—</span>
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) => setDateRange((d) => ({ ...d, end: e.target.value }))}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          <button
            onClick={loadData}
            className="px-4 py-2 bg-primary-700 text-white text-sm font-medium rounded-lg hover:bg-primary-800 transition-colors"
          >
            Apply
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {summaryCards.map((card, i) => (
          <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-3 ${colorMap[card.color]}`}>
              <card.icon className="w-6 h-6" />
            </div>
            <p className="text-sm text-gray-500">{card.label}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{card.value}</p>
          </div>
        ))}
      </div>

      {/* Live field force */}
      <Card title="Live Field Activity">
        {liveActivity.length === 0 ? (
          <EmptyState title="No employees currently checked in" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-6 py-3 text-left font-medium text-gray-600">Employee</th>
                  <th className="px-6 py-3 text-left font-medium text-gray-600">Checked in</th>
                  <th className="px-6 py-3 text-left font-medium text-gray-600">Last GPS</th>
                  <th className="px-6 py-3 text-left font-medium text-gray-600">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {liveActivity.map((session) => {
                  const employee = session.employee || {};
                  const last = session.lastLocation || null;
                  return (
                    <tr key={entityId(session) || employee.email} className="hover:bg-gray-50">
                      <td className="px-6 py-3 font-medium text-gray-900">
                        {employee.fullName || employee.name || '—'}
                      </td>
                      <td className="px-6 py-3 text-gray-600">
                        {formatDateTime(session.checkInAt || session.checkInTime)}
                      </td>
                      <td className="px-6 py-3 text-gray-600">
                        {last?.latitude != null
                          ? `${Number(last.latitude).toFixed(5)}, ${Number(last.longitude).toFixed(5)}`
                          : last?.lat != null
                            ? `${Number(last.lat).toFixed(5)}, ${Number(last.lng).toFixed(5)}`
                            : '—'}
                      </td>
                      <td className="px-6 py-3">
                        <Badge color="green">Active</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Attendance chart */}
        <Card title="Attendance Trend">
          <div className="p-4 h-72">
            {attendanceChart.length === 0 ? (
              <EmptyState title="No attendance data" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={attendanceChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="checkIns" stroke="#059669" name="Check-ins" strokeWidth={2} />
                  <Line type="monotone" dataKey="checkOuts" stroke="#dc2626" name="Check-outs" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        {/* Visits chart */}
        <Card title="Store Visits">
          <div className="p-4 h-72">
            {visitsChart.length === 0 ? (
              <EmptyState title="No visits data" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={visitsChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="visits" fill="#1e40af" name="Visits" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        {/* Top employees */}
        <Card title="Top Employees">
          <div className="p-4 h-72">
            {topEmployees.length === 0 ? (
              <EmptyState title="No employee data" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topEmployees} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={100} />
                  <Tooltip />
                  <Bar dataKey="visits" fill="#059669" name="Visits" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        {/* Product distribution */}
        <Card title="Product Distribution">
          <div className="p-4 h-72">
            {productChart.length === 0 ? (
              <EmptyState title="No product data" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={productChart}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {productChart.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>
      </div>

      {/* Recent activity */}
      <Card title="Recent Activity">
        <div className="overflow-x-auto">
          {recentActivity.length === 0 ? (
            <EmptyState title="No recent activity" />
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-6 py-3 text-left font-medium text-gray-600">Type</th>
                  <th className="px-6 py-3 text-left font-medium text-gray-600">Description</th>
                  <th className="px-6 py-3 text-left font-medium text-gray-600">Employee</th>
                  <th className="px-6 py-3 text-left font-medium text-gray-600">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recentActivity.map((activity, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-6 py-3">
                      <Badge color={activity.type === 'check_in' ? 'green' : activity.type === 'check_out' ? 'red' : 'blue'}>
                        {activity.type?.replace(/_/g, ' ') || 'Activity'}
                      </Badge>
                    </td>
                    <td className="px-6 py-3 text-gray-700">{activity.description || '—'}</td>
                    <td className="px-6 py-3 text-gray-700">{activity.employeeName || '—'}</td>
                    <td className="px-6 py-3 text-gray-500">{relativeTime(activity.timestamp)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>
    </div>
  );
}
