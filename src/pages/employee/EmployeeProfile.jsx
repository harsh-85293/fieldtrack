import React, { useState, useEffect, useId } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import {
  Save, Lock, Mail, BadgeCheck, Phone, Building2, Briefcase, CircleDot,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { employeeService } from '../../api/services.js';
import {
  Button, Input, LoadingSpinner,
} from '../../components/ui/index.jsx';
import { useToast } from '../../components/ui/Toast.jsx';

const INPUT_CLASS =
  'h-11 py-2.5 rounded-lg border-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500';

function ReadOnlyField({ label, value }) {
  const id = useId();
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="block text-sm font-medium text-slate-700 mb-1.5">
        {label}
      </label>
      <div
        id={id}
        className="relative w-full h-11 px-3 pr-9 flex items-center rounded-lg border border-slate-200 bg-slate-100 text-sm font-medium text-slate-600"
        aria-readonly="true"
      >
        <span className="truncate">{value || '—'}</span>
        <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
      </div>
    </div>
  );
}

function MetaRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3 py-2.5">
      <div className="mt-0.5 w-8 h-8 rounded-lg bg-primary-50 text-primary-700 flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</p>
        <p className="text-sm font-semibold text-slate-900 break-words mt-0.5">{value || '—'}</p>
      </div>
    </div>
  );
}

export default function EmployeeProfile() {
  const { user, loadUser } = useAuth();
  const { toastSuccess, toastError } = useToast();
  const navigate = useNavigate();
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm();

  const displayName = profileData?.fullName || profileData?.name || user?.fullName || user?.name || '';
  const profile = profileData?.profile || {};
  const roleLabel = (profileData?.role || user?.role || 'employee')
    .toString()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
  const isActive = profileData?.isActive !== false && user?.isActive !== false;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await employeeService.getMyProfile();
        const data = res.data?.data || res.data;
        if (cancelled) return;
        setProfileData(data);
        const p = data?.profile || {};
        reset({
          phone: data?.phone || '',
          address: p.address || data?.address || '',
          city: p.city || data?.city || '',
          state: p.state || data?.state || '',
          postalCode: p.postalCode || data?.postalCode || '',
        });
      } catch (err) {
        if (!cancelled) {
          toastError(err.response?.data?.message || 'Failed to load profile');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [reset]);

  const onSubmit = async (data) => {
    setSaving(true);
    try {
      const res = await employeeService.updateMyProfile({
        phone: data.phone,
        address: data.address,
        city: data.city,
        state: data.state,
        postalCode: data.postalCode,
      });
      const updated = res.data?.data || res.data;
      setProfileData(updated);
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
    <div className="w-full min-w-0 max-w-[1480px] mx-auto">
      {/* Mobile-only title (desktop uses layout header) */}
      <div className="lg:hidden mb-4">
        <h1 className="text-xl font-bold text-slate-900">My Profile</h1>
        <p className="text-sm text-slate-500 mt-0.5">Manage your profile information</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(280px,35%)_minmax(0,65%)] gap-5 items-stretch">
        {/* Left summary */}
        <aside className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full">
          <div className="bg-primary-900 px-5 py-5">
            <div className="flex items-center gap-3.5">
              <div
                className="w-14 h-14 rounded-2xl bg-primary-700 text-white flex items-center justify-center text-2xl font-bold shrink-0 ring-2 ring-white/20"
                aria-hidden="true"
              >
                {displayName.charAt(0)?.toUpperCase() || 'E'}
              </div>
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-white leading-tight truncate">
                  {displayName || 'Employee'}
                </h2>
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-white/15 text-white">
                    {roleLabel}
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-400/20 text-emerald-100">
                    {isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <p className="text-sm text-primary-200 mt-1.5 truncate">
                  {profileData?.employeeId || user?.employeeId || 'No employee ID'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex-1 px-5 py-2 divide-y divide-slate-100">
            <MetaRow icon={BadgeCheck} label="Employee ID" value={profileData?.employeeId || user?.employeeId} />
            <MetaRow icon={Mail} label="Email" value={profileData?.email || user?.email} />
            <MetaRow icon={Phone} label="Phone" value={profileData?.phone || user?.phone || 'Not set'} />
            <MetaRow icon={Briefcase} label="Designation" value={profile.designation} />
            <MetaRow icon={Building2} label="Department" value={profile.department} />
            <MetaRow icon={CircleDot} label="Status" value={isActive ? 'Active' : 'Inactive'} />
          </div>

          <div className="p-4 border-t border-slate-100 mt-auto">
            <button
              type="button"
              onClick={() => navigate('/app/change-password')}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary-50 text-primary-700 text-sm font-medium border border-primary-100 hover:bg-primary-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 transition-colors"
            >
              <Lock className="w-4 h-4" />
              Change Password
            </button>
          </div>
        </aside>

        {/* Right form */}
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-w-0 flex flex-col h-full">
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col h-full" noValidate>
            <div className="px-6 sm:px-7 py-4 border-b border-slate-100">
              <h2 className="text-base font-semibold text-slate-900">Contact information</h2>
              <p className="text-sm text-slate-500 mt-0.5">
                Name and email are managed by your admin.
              </p>
            </div>

            <div className="flex-1 px-6 sm:px-7 py-5 space-y-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">Account</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-4">
                  <ReadOnlyField label="Full name" value={displayName} />
                  <ReadOnlyField label="Email" value={profileData?.email || user?.email} />
                </div>
              </div>

              <div className="border-t border-slate-100 pt-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">Contact</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-4">
                  <Input
                    label="Phone"
                    type="tel"
                    autoComplete="tel"
                    error={errors.phone?.message}
                    className={INPUT_CLASS}
                    {...register('phone')}
                  />
                  <Input
                    label="Postal code"
                    autoComplete="postal-code"
                    className={INPUT_CLASS}
                    {...register('postalCode')}
                  />
                </div>
              </div>

              <div className="border-t border-slate-100 pt-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">Address</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-4">
                  <div className="md:col-span-2">
                    <Input
                      label="Address"
                      autoComplete="street-address"
                      className={INPUT_CLASS}
                      {...register('address')}
                    />
                  </div>
                  <Input
                    label="City"
                    autoComplete="address-level2"
                    className={INPUT_CLASS}
                    {...register('city')}
                  />
                  <Input
                    label="State"
                    autoComplete="address-level1"
                    className={INPUT_CLASS}
                    {...register('state')}
                  />
                </div>
              </div>
            </div>

            <div className="mt-auto px-6 sm:px-7 py-4 border-t border-slate-200 bg-slate-50/80 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">
              <p className="text-xs text-slate-500 text-center sm:text-left">
                Changes apply to your field profile immediately.
              </p>
              <Button
                type="submit"
                className="w-full sm:w-auto sm:min-w-[160px]"
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
