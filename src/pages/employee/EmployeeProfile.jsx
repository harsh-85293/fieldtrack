import React, { useState, useEffect, useId } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Save, Lock, Mail, BadgeCheck, Phone, MapPin } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { employeeService } from '../../api/services.js';
import {
  Button, Input, LoadingSpinner,
} from '../../components/ui/index.jsx';
import { useToast } from '../../components/ui/Toast.jsx';
import { entityId } from '../../utils/format.js';

function ReadOnlyField({ label, value }) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-slate-700 mb-1">
        {label}
      </label>
      <div
        id={id}
        className="w-full min-h-[42px] px-3 py-2.5 rounded-lg border border-slate-200 bg-slate-50 text-sm font-medium text-slate-700"
        aria-readonly="true"
      >
        {value || '—'}
      </div>
      <p className="mt-1 text-[11px] text-slate-400">Read-only</p>
    </div>
  );
}

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
  const roleLabel = user?.role
    ? String(user.role).charAt(0).toUpperCase() + String(user.role).slice(1).toLowerCase()
    : 'Employee';

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

  const inputClass =
    'h-[42px] rounded-lg border-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:border-primary-500';

  return (
    <div className="w-full min-w-0 max-w-[1200px] mx-auto">
      <div className="mb-4 sm:mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">My Profile</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            View your account details and update contact information.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/app/change-password')}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white text-primary-700 text-sm font-medium border border-primary-200 shadow-sm hover:bg-primary-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 transition-colors sm:hidden"
        >
          <Lock className="w-4 h-4" />
          Change Password
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(260px,340px)_minmax(0,1fr)] gap-4 sm:gap-5 items-start">
        {/* Left: profile summary */}
        <aside className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden lg:sticky lg:top-20">
          <div className="bg-primary-900 px-5 py-5 sm:px-6 sm:py-6">
            <div className="flex items-start gap-4">
              <div
                className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-primary-700 text-white flex items-center justify-center text-2xl font-bold shrink-0 ring-2 ring-white/20"
                aria-hidden="true"
              >
                {displayName.charAt(0)?.toUpperCase() || 'E'}
              </div>
              <div className="min-w-0 flex-1 pt-0.5">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-semibold text-white truncate">
                    {displayName || 'Employee'}
                  </h2>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-white/15 text-white">
                    {roleLabel}
                  </span>
                </div>
                <p className="text-sm text-primary-200 mt-1 truncate">
                  {user?.employeeId || 'No employee ID'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate('/app/change-password')}
              className="hidden sm:inline-flex mt-5 w-full items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 text-white text-sm font-medium border border-white/15 transition-colors"
            >
              <Lock className="w-4 h-4" />
              Change Password
            </button>
          </div>

          <div className="p-5 sm:p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 w-8 h-8 rounded-lg bg-primary-50 text-primary-700 flex items-center justify-center shrink-0">
                <BadgeCheck className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-500">Employee ID</p>
                <p className="text-sm font-semibold text-slate-900 truncate">
                  {user?.employeeId || '—'}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="mt-0.5 w-8 h-8 rounded-lg bg-primary-50 text-primary-700 flex items-center justify-center shrink-0">
                <Mail className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-500">Email</p>
                <p className="text-sm font-semibold text-slate-900 break-all">
                  {user?.email || '—'}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="mt-0.5 w-8 h-8 rounded-lg bg-primary-50 text-primary-700 flex items-center justify-center shrink-0">
                <Phone className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-500">Phone</p>
                <p className="text-sm font-semibold text-slate-900 truncate">
                  {user?.phone || 'Not set'}
                </p>
              </div>
            </div>

            {(user?.city || user?.state || user?.address) && (
              <div className="flex items-start gap-3 pt-1 border-t border-slate-100">
                <div className="mt-0.5 w-8 h-8 rounded-lg bg-primary-50 text-primary-700 flex items-center justify-center shrink-0">
                  <MapPin className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-500">Location</p>
                  <p className="text-sm font-semibold text-slate-900">
                    {[user?.city, user?.state].filter(Boolean).join(', ') || user?.address || '—'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* Right: editable form */}
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-w-0">
          <div className="px-5 py-4 sm:px-6 sm:py-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Contact & address</h2>
              <p className="text-sm text-slate-500 mt-0.5">
                Name and email are managed by your admin.
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/app/change-password')}
              className="hidden lg:inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium text-primary-700 hover:bg-primary-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 border border-transparent hover:border-primary-100 transition-colors shrink-0"
            >
              <Lock className="w-4 h-4" />
              Change Password
            </button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="p-5 sm:p-6 lg:p-7" noValidate>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-4">
              <ReadOnlyField label="Full name" value={displayName} />
              <ReadOnlyField label="Email" value={user?.email} />

              <Input
                label="Phone"
                type="tel"
                autoComplete="tel"
                error={errors.phone?.message}
                className={inputClass}
                {...register('phone')}
              />
              <Input
                label="Postal code"
                autoComplete="postal-code"
                className={inputClass}
                {...register('postalCode')}
              />

              <div className="md:col-span-2">
                <Input
                  label="Address"
                  autoComplete="street-address"
                  className={inputClass}
                  {...register('address')}
                />
              </div>

              <Input
                label="City"
                autoComplete="address-level2"
                className={inputClass}
                {...register('city')}
              />
              <Input
                label="State"
                autoComplete="address-level1"
                className={inputClass}
                {...register('state')}
              />
            </div>

            <div className="mt-6 pt-5 border-t border-slate-100 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">
              <p className="text-xs text-slate-400 text-center sm:text-left">
                Changes apply to your field profile immediately.
              </p>
              <Button
                type="submit"
                className="w-full sm:w-auto sm:min-w-[168px] focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary-500"
                loading={saving}
              >
                <Save className="w-4 h-4" />
                Save Changes
              </Button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
