import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { ArrowLeft, Lock, Save } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { authService } from '../../api/services.js';
import { Button, Input, Card } from '../../components/ui/index.jsx';
import { useToast } from '../../components/ui/Toast.jsx';

export default function ChangePassword() {
  const { user } = useAuth();
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
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/app/profile')} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold text-gray-900">Change Password</h1>
      </div>

      <Card>
        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
          <div className="flex items-center gap-3">
            <Lock className="w-5 h-5 text-gray-400" />
            <Input
              label="Current Password"
              type="password"
              error={errors.currentPassword?.message}
              {...register('currentPassword', { required: 'Current password is required' })}
            />
          </div>
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

          <Button type="submit" className="w-full" loading={saving}>
            <Save className="w-4 h-4" />
            Change Password
          </Button>
        </form>
      </Card>
    </div>
  );
}
