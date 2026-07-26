import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Pencil, Mail, Phone, MapPin, Calendar, Clock, MapPinned } from 'lucide-react';
import { employeeService, sessionService, visitService } from '../../api/services.js';
import {
  LoadingSpinner, ErrorState, Badge, Card, EmptyState,
} from '../../components/ui/index.jsx';
import {
  formatDate,
  formatDateTime,
  formatDuration,
  formatMoney,
  formatRupees,
  entityId,
  sessionCheckIn,
  sessionCheckOut,
  sessionDurationSeconds,
} from '../../utils/format.js';
import { extractList } from '../../utils/apiData.js';

export default function EmployeeDetail() {
  const { id } = useParams();
  const [employee, setEmployee] = useState(null);
  const [summary, setSummary] = useState(null);
  const [recentVisits, setRecentVisits] = useState([]);
  const [recentSessions, setRecentSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!id || id === 'undefined') {
      setError('Invalid employee');
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const empRes = await employeeService.getById(id);
        setEmployee(empRes.data.data || empRes.data);

        const [sumRes, visRes, sesRes] = await Promise.allSettled([
          employeeService.getSummary(id, {}),
          visitService.getAll({ employeeId: id, page: 1, limit: 5 }),
          sessionService.getAll({ employeeId: id, page: 1, limit: 5 }),
        ]);

        if (sumRes.status === 'fulfilled') {
          setSummary(sumRes.value.data.data || sumRes.value.data);
        }
        if (visRes.status === 'fulfilled') {
          setRecentVisits(extractList(visRes.value, 'visits'));
        }
        if (sesRes.status === 'fulfilled') {
          setRecentSessions(extractList(sesRes.value, 'sessions'));
        }
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

  const name = employee.fullName || employee.name || '—';
  const profile = employee.profile || {};
  const address = [
    profile.address || employee.address,
    profile.city || employee.city,
    profile.state || employee.state,
    profile.postalCode || employee.postalCode,
  ].filter(Boolean).join(', ') || '—';

  const summaryCards = [
    { label: 'Total Sessions', value: summary?.totalSessions ?? 0, icon: Clock },
    { label: 'Total Visits', value: summary?.totalVisits ?? 0, icon: MapPinned },
    {
      label: 'Total Distance',
      value: `${((summary?.totalDistance ?? (summary?.totalDistanceKm || 0) * 1000) / 1000).toFixed(2)} km`,
      icon: MapPin,
    },
    {
      label: 'Total Revenue',
      value: formatMoney(summary?.totalRevenue ?? 0),
      icon: Calendar,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/admin/employees" className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{name}</h1>
          <p className="text-sm text-gray-500">{employee.employeeId || 'No employee ID'}</p>
        </div>
        <Link to={`/admin/employees/${id}/edit`}>
          <span className="inline-flex items-center gap-2 px-4 py-2 bg-primary-700 text-white text-sm font-medium rounded-lg hover:bg-primary-800 transition-colors">
            <Pencil className="w-4 h-4" />
            Edit
          </span>
        </Link>
      </div>

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
              <p className="text-sm font-medium text-gray-900">{address}</p>
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
            <Badge color={employee.status === 'suspended' ? 'red' : employee.isActive ? 'green' : 'gray'}>
              {employee.status === 'suspended' ? 'Suspended' : employee.isActive ? 'Active' : 'Inactive'}
            </Badge>
            <Badge color={employee.role === 'admin' ? 'purple' : 'blue'}>{employee.role}</Badge>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((card, i) => (
          <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <card.icon className="w-6 h-6 text-primary-700 mb-2" />
            <p className="text-sm text-gray-500">{card.label}</p>
            <p className="text-xl font-bold text-gray-900 mt-1">{card.value}</p>
          </div>
        ))}
      </div>

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
                  <tr key={entityId(s)} className="hover:bg-gray-50">
                    <td className="px-6 py-3 text-gray-700">{formatDateTime(sessionCheckIn(s))}</td>
                    <td className="px-6 py-3 text-gray-700">{formatDateTime(sessionCheckOut(s))}</td>
                    <td className="px-6 py-3 text-gray-700">{formatDuration(sessionDurationSeconds(s))}</td>
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
                {recentVisits.map((v) => {
                  const items = v.items || v.lineItems || [];
                  const total = v.totalValue ?? v.totalAmount ?? 0;
                  return (
                    <tr key={entityId(v)} className="hover:bg-gray-50">
                      <td className="px-6 py-3 text-gray-700">{v.store?.name || v.storeName || '—'}</td>
                      <td className="px-6 py-3 text-gray-700">{formatDateTime(v.visitDate || v.visitTime)}</td>
                      <td className="px-6 py-3 text-gray-700">{v.itemCount ?? items.length}</td>
                      <td className="px-6 py-3 text-gray-700">{formatRupees(total)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
