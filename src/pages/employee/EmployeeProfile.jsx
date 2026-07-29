import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Save, Lock, Mail, BadgeCheck, Phone } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { employeeService } from '../../api/services.js';
import {
  Button, Input, LoadingSpinner,
} from '../../components/ui/index.jsx';
import { useToast } from '../../components/ui/Toast.jsx';
import { entityId } from '../../utils/format.js';

export default function EmployeeProfile() {
  const { user, loadUser } = useAuth();
  const { toastSuccess, toastError } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm();

  const displayName = user?.fullName || user?.name || '';
  const userId = entityId(user);

  useEffect(() => {
    if (user) {
      reset({
        phone: user.phone || '',
        address: user.address || '',
        city: user.city || '',
        state: user.state || '',
        postalCode: user.postalCode || '',
      });
      setLoading(false);
    }
  }, [user, reset]);

  const onSubmit = async (data) => {
    setSaving(true);
    try {
      await employeeService.update(userId, {
        phone: data.phone,
        address: data.address,
        city: data.city,
        state: data.state,
        postalCode: data.postalCode,
      });
      toastSuccess('Profile updated successfully');
      loadUser();
    } catch (err) {
      toastError(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingSpinner className="py-20" />;

  return (
    <div className="w-full min-w-0 max-w-4xl">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Profile header */}
        <div className="bg-primary-900 px-5 py-6 sm:px-8 sm:py-7">
          <div className="flex flex-col sm:flex-row sm:items-center gap-5">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-primary-700 text-white flex items-center justify-center text-2xl sm:text-3xl font-bold shrink-0 ring-2 ring-primary-500/40">
              {displayName.charAt(0)?.toUpperCase() || 'E'}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-white truncate">
                  {displayName || 'Employee'}
                </h1>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/15 text-white">
                  Employee
                </span>
              </div>
              <div className="mt-2 flex flex-col sm:flex-row sm:flex-wrap gap-x-5 gap-y-1.5 text-sm text-primary-100">
                <span className="inline-flex items-center gap-1.5 min-w-0">
                  <BadgeCheck className="w-4 h-4 shrink-0 text-primary-300" />
                  <span className="truncate">{user?.employeeId || 'No employee ID'}</span>
                </span>
                <span className="inline-flex items-center gap-1.5 min-w-0">
                  <Mail className="w-4 h-4 shrink-0 text-primary-300" />
                  <span className="truncate">{user?.email || '—'}</span>
                </span>
                {user?.phone && (
                  <span className="inline-flex items-center gap-1.5 min-w-0">
                    <Phone className="w-4 h-4 shrink-0 text-primary-300" />
                    <span className="truncate">{user.phone}</span>
                  </span>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate('/app/change-password')}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-sm font-medium border border-white/15 transition-colors shrink-0 self-start sm:self-center"
            >
              <Lock className="w-4 h-4" />
              Change Password
            </button>
          </div>
        </div>

        {/* Editable details */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-5 sm:p-8">
          <div className="mb-5">
            <h2 className="text-base font-semibold text-slate-900">Contact & address</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              Name and email are managed by your admin. Update your contact details below.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5">
              <p className="text-xs font-medium text-slate-500">Full name</p>
              <p className="text-sm font-medium text-slate-800 mt-0.5 truncate">{displayName || '—'}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5">
              <p className="text-xs font-medium text-slate-500">Email</p>
              <p className="text-sm font-medium text-slate-800 mt-0.5 truncate">{user?.email || '—'}</p>
            </div>

            <Input
              label="Phone"
              type="tel"
              error={errors.phone?.message}
              {...register('phone')}
            />
            <Input label="Postal code" {...register('postalCode')} />

            <div className="sm:col-span-2">
              <Input label="Address" {...register('address')} />
            </div>

            <Input label="City" {...register('city')} />
            <Input label="State" {...register('state')} />
          </div>

          <div className="mt-6 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-slate-100 pt-5">
            <p className="text-xs text-slate-400 text-center sm:text-left">
              Changes apply to your field profile immediately.
            </p>
            <Button type="submit" className="w-full sm:w-auto sm:min-w-[160px]" loading={saving}>
              <Save className="w-4 h-4" />
              Save Changes
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
