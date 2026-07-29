import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Save, Lock } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { employeeService } from '../../api/services.js';
import {
  Button, Input, Card, LoadingSpinner,
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
        name: displayName,
        email: user.email || '',
        phone: user.phone || '',
        address: user.address || '',
        city: user.city || '',
        state: user.state || '',
        postalCode: user.postalCode || '',
      });
      setLoading(false);
    }
  }, [user, reset, displayName]);

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
    <div className="w-full min-w-0 space-y-4 sm:space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900">My Profile</h1>
        <button
          type="button"
          onClick={() => navigate('/app/change-password')}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white text-primary-700 border border-primary-200 font-medium rounded-xl hover:bg-primary-50 transition-colors text-sm"
        >
          <Lock className="w-4 h-4" />
          Change Password
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,280px)_minmax(0,1fr)] gap-4 sm:gap-5">
        {/* Identity card */}
        <Card className="h-fit">
          <div className="p-5 sm:p-6 flex xl:flex-col items-center xl:items-start gap-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-2xl sm:text-3xl font-bold shrink-0">
              {displayName.charAt(0)?.toUpperCase() || 'E'}
            </div>
            <div className="min-w-0 text-left">
              <p className="text-lg font-semibold text-slate-900 truncate">{displayName || 'Employee'}</p>
              <p className="text-sm text-slate-500 mt-0.5">{user?.employeeId || '—'}</p>
              <p className="text-sm text-slate-500 truncate mt-1">{user?.email}</p>
            </div>
          </div>
        </Card>

        {/* Edit form */}
        <Card title="Edit Information">
          <form onSubmit={handleSubmit(onSubmit)} className="p-4 sm:p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Full Name" disabled {...register('name')} />
              <Input label="Email" disabled {...register('email')} />
              <Input
                label="Phone"
                type="tel"
                error={errors.phone?.message}
                {...register('phone')}
              />
              <Input label="Postal Code" {...register('postalCode')} />
            </div>

            <Input label="Address" {...register('address')} />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="City" {...register('city')} />
              <Input label="State" {...register('state')} />
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-2">
              <Button type="submit" className="w-full sm:w-auto sm:min-w-[160px]" loading={saving}>
                <Save className="w-4 h-4" />
                Save Changes
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}
