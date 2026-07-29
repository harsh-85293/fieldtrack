import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { ArrowLeft, Save, Lock } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { authService } from '../../api/services.js';
import { Button, Input, Card } from '../../components/ui/index.jsx';
import { useToast } from '../../components/ui/Toast.jsx';

export default function ChangePassword() {
  const { user } = useAuth();
  const { toastSuccess, toastError } = useToast();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);

  const isGoogleUser = user?.provider === 'google' || Boolean(user?.providerId);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm();

  const newPassword = watch('newPassword');

  const onSubmit = async (data) => {
    if (isGoogleUser) {
      toastError('Google sign-in accounts manage passwords in Google Account');
      return;
    }
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

  if (user && isGoogleUser) {
    return (
      <div className="w-full min-w-0 space-y-4 sm:space-y-5 max-w-xl">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/app/profile')}
            className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg shrink-0"
            aria-label="Back to profile"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 lg:hidden">Change Password</h1>
        </div>

        <Card className="w-full">
          <div className="p-5 sm:p-6 space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <p className="text-base font-semibold text-slate-900">Signed in with Google</p>
                <p className="text-sm text-slate-500 mt-1 leading-relaxed">
                  This account does not have a FieldTrack password. Manage your password in your{' '}
                  <a
                    href="https://myaccount.google.com/security"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary-700 font-medium hover:underline"
                  >
                    Google Account
                  </a>
                  , then continue using Sign in with Google.
                </p>
              </div>
            </div>
            <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => navigate('/app/profile')}>
              Back to profile
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 space-y-4 sm:space-y-5">
      <div className="flex items-center gap-3 lg:hidden">
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
            autoComplete="current-password"
            error={errors.currentPassword?.message}
            {...register('currentPassword', { required: 'Current password is required' })}
          />
          <Input
            label="New Password"
            type="password"
            autoComplete="new-password"
            error={errors.newPassword?.message}
            {...register('newPassword', {
              required: 'New password is required',
              minLength: { value: 6, message: 'Password must be at least 6 characters' },
            })}
          />
          <Input
            label="Confirm New Password"
            type="password"
            autoComplete="new-password"
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
