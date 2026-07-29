import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { ArrowLeft, Save } from 'lucide-react';
import { authService } from '../../api/services.js';
import { Button, Input, Card } from '../../components/ui/index.jsx';
import { useToast } from '../../components/ui/Toast.jsx';

export default function ChangePassword() {
  const { toastSuccess, toastError } = useToast();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm();

  const newPassword = watch('newPassword');

  const onSubmit = async (data) => {
    if (data.newPassword !== data.confirmPassword) {
      toastError('New passwords do not match');
      return;
    }
    setSaving(true);
    try {
      await authService.changePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      toastSuccess('Password changed successfully');
      reset();
      navigate('/app/profile');
    } catch (err) {
      toastError(err.response?.data?.message || 'Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full min-w-0 space-y-4 sm:space-y-5">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate('/app/profile')}
          className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg shrink-0"
          aria-label="Back to profile"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Change Password</h1>
      </div>

      <Card className="w-full max-w-xl">
        <form onSubmit={handleSubmit(onSubmit)} className="p-4 sm:p-6 space-y-4">
          <Input
            label="Current Password"
            type="password"
            error={errors.currentPassword?.message}
            {...register('currentPassword', { required: 'Current password is required' })}
          />
          <Input
            label="New Password"
            type="password"
            error={errors.newPassword?.message}
            {...register('newPassword', {
              required: 'New password is required',
              minLength: { value: 6, message: 'Password must be at least 6 characters' },
            })}
          />
          <Input
            label="Confirm New Password"
            type="password"
            error={errors.confirmPassword?.message}
            {...register('confirmPassword', {
              required: 'Please confirm your new password',
              validate: (v) => v === newPassword || 'Passwords do not match',
            })}
          />

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-2">
            <Button type="submit" className="w-full sm:w-auto sm:min-w-[180px]" loading={saving}>
              <Save className="w-4 h-4" />
              Change Password
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
