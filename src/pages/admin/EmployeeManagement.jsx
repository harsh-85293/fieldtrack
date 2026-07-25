import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Search, Eye, Pencil, Power, KeyRound, Clock, Check, X, Ban, RotateCcw } from 'lucide-react';
import { employeeService, authService } from '../../api/services.js';
import {
  LoadingCard, EmptyState, ErrorState, Badge, Button, Pagination,
} from '../../components/ui/index.jsx';
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx';
import { useToast } from '../../components/ui/Toast.jsx';
import { formatDate } from '../../utils/format.js';

export default function EmployeeManagement() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [confirmReset, setConfirmReset] = useState(null);
  const [confirmToggle, setConfirmToggle] = useState(null);
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [pendingLoading, setPendingLoading] = useState(true);
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejecting, setRejecting] = useState(false);
  const { toastSuccess, toastError } = useToast();
  const navigate = useNavigate();

  const loadEmployees = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { page, search, status: statusFilter };
      const res = await employeeService.getAll(params);
      const data = res.data.data || res.data;
      setEmployees(data.employees || data.items || data || []);
      setTotalPages(data.totalPages || data.pages || 1);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load employees');
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  const loadPendingApprovals = useCallback(async () => {
    setPendingLoading(true);
    try {
      const res = await employeeService.getPending();
      setPendingApprovals(res.data.data || []);
    } catch {
      setPendingApprovals([]);
    } finally {
      setPendingLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPendingApprovals();
  }, [loadPendingApprovals]);

  const handleApprove = async (id) => {
    try {
      await employeeService.approve(id);
      toastSuccess('Employee approved successfully');
      loadPendingApprovals();
      loadEmployees();
    } catch (err) {
      toastError(err.response?.data?.message || 'Failed to approve employee');
    }
  };

  const handleReject = async () => {
    if (!rejectModal || !rejectReason.trim()) return;
    setRejecting(true);
    try {
      await employeeService.reject(rejectModal.id, rejectReason.trim());
      toastSuccess('Registration rejected');
      setRejectModal(null);
      setRejectReason('');
      loadPendingApprovals();
    } catch (err) {
      toastError(err.response?.data?.message || 'Failed to reject registration');
    } finally {
      setRejecting(false);
    }
  };

  const handleSuspend = async (id) => {
    try {
      await employeeService.suspend(id);
      toastSuccess('Employee suspended');
      loadEmployees();
    } catch (err) {
      toastError(err.response?.data?.message || 'Failed to suspend employee');
    }
  };

  const handleReactivate = async (id) => {
    try {
      await employeeService.reactivate(id);
      toastSuccess('Employee reactivated');
      loadEmployees();
    } catch (err) {
      toastError(err.response?.data?.message || 'Failed to reactivate employee');
    }
  };

  const handleToggleStatus = async () => {
    if (!confirmToggle) return;
    try {
      await employeeService.toggleStatus(confirmToggle.id);
      toastSuccess(`Employee ${confirmToggle.active ? 'deactivated' : 'activated'} successfully`);
      setConfirmToggle(null);
      loadEmployees();
    } catch (err) {
      toastError(err.response?.data?.message || 'Failed to toggle status');
    }
  };

  const handleResetPassword = async () => {
    if (!confirmReset) return;
    try {
      await authService.resetPassword(confirmReset.id);
      toastSuccess('Password reset successfully');
      setConfirmReset(null);
    } catch (err) {
      toastError(err.response?.data?.message || 'Failed to reset password');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Employees</h1>
          <p className="text-sm text-gray-500">Manage field employees</p>
        </div>
        <Link to="/admin/employees/new">
          <Button>
            <Plus className="w-4 h-4" />
            Add Employee
          </Button>
        </Link>
      </div>

      {/* Pending Approvals */}
      {pendingApprovals.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-amber-200 overflow-hidden">
          <div className="flex items-center gap-2 px-6 py-4 border-b border-amber-100 bg-amber-50">
            <Clock className="w-5 h-5 text-amber-600" />
            <h2 className="text-sm font-semibold text-amber-900">Pending Approvals</h2>
            <span className="ml-auto text-xs font-medium text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
              {pendingApprovals.length}
            </span>
          </div>
          <div className="divide-y divide-gray-50">
            {pendingApprovals.map((emp) => (
              <div key={emp.id} className="flex flex-col sm:flex-row sm:items-center gap-4 px-6 py-4">
                <div className="flex items-center gap-3 flex-1">
                  {emp.profilePicture ? (
                    <img src={emp.profilePicture} alt={emp.fullName} className="w-10 h-10 rounded-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-sm font-semibold">
                      {emp.fullName?.charAt(0)?.toUpperCase()}
                    </div>
                  )}
                  <div>
                    <p className="font-medium text-gray-900">{emp.fullName}</p>
                    <p className="text-xs text-gray-500">{emp.email}</p>
                    <div className="flex gap-3 mt-0.5 text-xs text-gray-400">
                      <span>Emp ID: {emp.employeeId || 'Not set'}</span>
                      <span>Phone: {emp.phone || 'Not set'}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleApprove(emp.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-green-700 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
                  >
                    <Check className="w-4 h-4" /> Approve
                  </button>
                  <button
                    onClick={() => setRejectModal(emp)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-700 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                  >
                    <X className="w-4 h-4" /> Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, email, or employee ID..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <LoadingCard rows={6} />
      ) : error ? (
        <ErrorState message={error} onRetry={loadEmployees} />
      ) : employees.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <EmptyState title="No employees found" message="Add your first employee to get started." />
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="px-6 py-3 text-left font-medium text-gray-600">Employee</th>
                    <th className="px-6 py-3 text-left font-medium text-gray-600">Emp ID</th>
                    <th className="px-6 py-3 text-left font-medium text-gray-600">Phone</th>
                    <th className="px-6 py-3 text-left font-medium text-gray-600">Joined</th>
                    <th className="px-6 py-3 text-left font-medium text-gray-600">Status</th>
                    <th className="px-6 py-3 text-right font-medium text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {employees.map((emp) => (
                    <tr key={emp.id} className="hover:bg-gray-50">
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-semibold">
                            {emp.name?.charAt(0)?.toUpperCase()}
                          </div>
                          <span className="font-medium text-gray-900">{emp.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-3 text-gray-600">{emp.employeeId || '—'}</td>
                      <td className="px-6 py-3 text-gray-600">{emp.phone || '—'}</td>
                      <td className="px-6 py-3 text-gray-600">{formatDate(emp.createdAt)}</td>
                      <td className="px-6 py-3">
                        <Badge color={emp.isActive ? 'green' : 'gray'}>
                          {emp.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td className="px-6 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <Link to={`/admin/employees/${emp.id}`} className="p-1.5 text-gray-500 hover:text-primary-700 hover:bg-primary-50 rounded-lg" title="View">
                            <Eye className="w-4 h-4" />
                          </Link>
                          <Link to={`/admin/employees/${emp.id}/edit`} className="p-1.5 text-gray-500 hover:text-primary-700 hover:bg-primary-50 rounded-lg" title="Edit">
                            <Pencil className="w-4 h-4" />
                          </Link>
                          {emp.status === 'suspended' ? (
                            <button
                              onClick={() => handleReactivate(emp.id)}
                              className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg"
                              title="Reactivate"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleSuspend(emp.id)}
                              className="p-1.5 text-gray-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg"
                              title="Suspend"
                            >
                              <Ban className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => setConfirmReset(emp)}
                            className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg"
                            title="Reset Password"
                          >
                            <KeyRound className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {employees.map((emp) => (
              <div key={emp.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-sm font-semibold">
                      {emp.name?.charAt(0)?.toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{emp.name}</p>
                      <p className="text-xs text-gray-500">{emp.employeeId || '—'}</p>
                    </div>
                  </div>
                  <Badge color={emp.isActive ? 'green' : 'gray'}>
                    {emp.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <Link to={`/admin/employees/${emp.id}`} className="flex-1 text-center py-1.5 text-sm bg-gray-100 rounded-lg text-gray-700">
                    View
                  </Link>
                  <Link to={`/admin/employees/${emp.id}/edit`} className="flex-1 text-center py-1.5 text-sm bg-gray-100 rounded-lg text-gray-700">
                    Edit
                  </Link>
                  <button
                    onClick={() => setConfirmToggle(emp)}
                    className="flex-1 py-1.5 text-sm bg-amber-50 text-amber-700 rounded-lg"
                  >
                    Toggle
                  </button>
                  <button
                    onClick={() => setConfirmReset(emp)}
                    className="flex-1 py-1.5 text-sm bg-red-50 text-red-700 rounded-lg"
                  >
                    Reset
                  </button>
                </div>
              </div>
            ))}
          </div>

          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}

      <ConfirmDialog
        open={!!confirmToggle}
        title="Toggle Employee Status"
        message={`Are you sure you want to ${confirmToggle?.isActive ? 'deactivate' : 'activate'} ${confirmToggle?.name}?`}
        confirmText={confirmToggle?.isActive ? 'Deactivate' : 'Activate'}
        danger={confirmToggle?.isActive}
        onConfirm={handleToggleStatus}
        onCancel={() => setConfirmToggle(null)}
      />

      <ConfirmDialog
        open={!!confirmReset}
        title="Reset Password"
        message={`Reset password for ${confirmReset?.name}? A new temporary password will be generated.`}
        confirmText="Reset Password"
        danger
        onConfirm={handleResetPassword}
        onCancel={() => setConfirmReset(null)}
      />

      {/* Reject modal */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-gray-900">Reject Registration</h3>
            <p className="mt-1 text-sm text-gray-500">
              Reject {rejectModal.fullName}? The employee will be notified of the reason.
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Enter rejection reason…"
              rows={3}
              className="mt-4 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
            />
            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => { setRejectModal(null); setRejectReason(''); }}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={rejecting || !rejectReason.trim()}
                className="px-4 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {rejecting ? 'Rejecting…' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
