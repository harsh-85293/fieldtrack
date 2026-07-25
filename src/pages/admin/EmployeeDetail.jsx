import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Pencil, Mail, Phone, MapPin, Calendar, Clock, MapPinned } from 'lucide-react';
import { employeeService, sessionService, visitService } from '../../api/services.js';
import {
  LoadingSpinner, ErrorState, Badge, Card, EmptyState,
} from '../../components/ui/index.jsx';
import { formatDate, formatDateTime, formatDuration, formatMoney } from '../../utils/format.js';

export default function EmployeeDetail() {
  const { id } = useParams();
  const [employee, setEmployee] = useState(null);
  const [summary, setSummary] = useState(null);
  const [recentVisits, setRecentVisits] = useState([]);
  const [recentSessions, setRecentSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const [empRes, sumRes, visRes, sesRes] = await Promise.all([
          employeeService.getById(id),
          employeeService.getSummary(id, {}),
          visitService.getAll({ employeeId: id, page: 1, limit: 5 }),
          sessionService.getAll({ employeeId: id, page: 1, limit: 5 }),
        ]);
        setEmployee(empRes.data.data || empRes.data);
        setSummary(sumRes.data.data || sumRes.data);
        const visData = visRes.data.data || visRes.data;
        setRecentVisits(visData.visits || visData.items || visData || []);
        const sesData = sesRes.data.data || sesRes.data;
        setRecentSessions(sesData.sessions || sesData.items || sesData || []);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load employee');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) return <LoadingSpinner className="py-20" />;
  if (error) return <ErrorState message={error} />;
  if (!employee) return <ErrorState message="Employee not found" />;

  const summaryCards = [
    { label: 'Total Sessions', value: summary?.totalSessions ?? 0, icon: Clock, color: 'primary' },
    { label: 'Total Visits', value: summary?.totalVisits ?? 0, icon: MapPinned, color: 'green' },
    { label: 'Total Distance', value: `${((summary?.totalDistance ?? 0) / 1000).toFixed(2)} km`, icon: MapPin, color: 'amber' },
    { label: 'Total Revenue', value: formatMoney(summary?.totalRevenue ?? 0), icon: Calendar, color: 'green' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/admin/employees" className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{employee.name}</h1>
          <p className="text-sm text-gray-500">{employee.employeeId}</p>
        </div>
        <Link to={`/admin/employees/${id}/edit`}>
          <span className="inline-flex items-center gap-2 px-4 py-2 bg-primary-700 text-white text-sm font-medium rounded-lg hover:bg-primary-800 transition-colors">
            <Pencil className="w-4 h-4" />
            Edit
          </span>
        </Link>
      </div>

      {/* Info card */}
      <Card>
        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex items-center gap-3">
            <Mail className="w-5 h-5 text-gray-400" />
            <div>
              <p className="text-xs text-gray-500">Email</p>
              <p className="text-sm font-medium text-gray-900">{employee.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Phone className="w-5 h-5 text-gray-400" />
            <div>
              <p className="text-xs text-gray-500">Phone</p>
              <p className="text-sm font-medium text-gray-900">{employee.phone || '—'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <MapPin className="w-5 h-5 text-gray-400" />
            <div>
              <p className="text-xs text-gray-500">Address</p>
              <p className="text-sm font-medium text-gray-900">
                {[employee.address, employee.city, employee.state, employee.postalCode].filter(Boolean).join(', ') || '—'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-gray-400" />
            <div>
              <p className="text-xs text-gray-500">Joined</p>
              <p className="text-sm font-medium text-gray-900">{formatDate(employee.createdAt)}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge color={employee.isActive ? 'green' : 'gray'}>
              {employee.isActive ? 'Active' : 'Inactive'}
            </Badge>
            <Badge color={employee.role === 'admin' ? 'purple' : 'blue'}>{employee.role}</Badge>
          </div>
        </div>
      </Card>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((card, i) => (
          <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <card.icon className="w-6 h-6 text-primary-700 mb-2" />
            <p className="text-sm text-gray-500">{card.label}</p>
            <p className="text-xl font-bold text-gray-900 mt-1">{card.value}</p>
          </div>
        ))}
      </div>

      {/* Recent sessions */}
      <Card title="Recent Sessions">
        {recentSessions.length === 0 ? (
          <EmptyState title="No sessions found" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-6 py-3 text-left font-medium text-gray-600">Check In</th>
                  <th className="px-6 py-3 text-left font-medium text-gray-600">Check Out</th>
                  <th className="px-6 py-3 text-left font-medium text-gray-600">Duration</th>
                  <th className="px-6 py-3 text-left font-medium text-gray-600">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recentSessions.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3 text-gray-700">{formatDateTime(s.checkInTime)}</td>
                    <td className="px-6 py-3 text-gray-700">{formatDateTime(s.checkOutTime)}</td>
                    <td className="px-6 py-3 text-gray-700">{formatDuration(s.duration)}</td>
                    <td className="px-6 py-3">
                      <Badge color={s.status === 'active' ? 'green' : 'gray'}>{s.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Recent visits */}
      <Card title="Recent Visits">
        {recentVisits.length === 0 ? (
          <EmptyState title="No visits found" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-6 py-3 text-left font-medium text-gray-600">Store</th>
                  <th className="px-6 py-3 text-left font-medium text-gray-600">Date</th>
                  <th className="px-6 py-3 text-left font-medium text-gray-600">Items</th>
                  <th className="px-6 py-3 text-left font-medium text-gray-600">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recentVisits.map((v) => (
                  <tr key={v.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3 text-gray-700">{v.storeName || '—'}</td>
                    <td className="px-6 py-3 text-gray-700">{formatDateTime(v.visitTime)}</td>
                    <td className="px-6 py-3 text-gray-700">{v.itemCount || 0}</td>
                    <td className="px-6 py-3 text-gray-700">{formatMoney(v.totalAmount || 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
