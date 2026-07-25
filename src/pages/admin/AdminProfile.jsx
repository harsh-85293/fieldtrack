import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { User, Mail, Save } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { authService } from '../../api/services.js';
import { Button, Input, Card, LoadingSpinner } from '../../components/ui/index.jsx';
import { useToast } from '../../components/ui/Toast.jsx';

export default function AdminProfile() {
  const { user, loadUser } = useAuth();
  const { toastSuccess, toastError } = useToast();
  const [loadingPw, setLoadingPw] = useState(false);

  const {
    register: registerPw,
    handleSubmit: handlePwSubmit,
    reset: resetPw,
    formState: { errors: pwErrors },
  } = useForm();

  const onPasswordChange = async (data) => {
    if (data.newPassword !== data.confirmPassword) {
      toastError('New passwords do not match');
      return;
    }
    setLoadingPw(true);
    try {
      await authService.changePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      toastSuccess('Password changed successfully');
      resetPw();
    } catch (err) {
      toastError(err.response?.data?.message || 'Failed to change password');
    } finally {
      setLoadingPw(false);
    }
  };

  if (!user) return <LoadingSpinner className="py-20" />;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
        <p className="text-sm text-gray-500">Manage your account</p>
      </div>

      {/* Profile info */}
      <Card title="Account Information">
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-2xl font-bold">
              {user.name?.charAt(0)?.toUpperCase()}
            </div>
            <div>
              <p className="text-lg font-semibold text-gray-900">{user.name}</p>
              <p className="text-sm text-gray-500">{user.role}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Email</p>
                <p className="text-sm font-medium text-gray-900">{user.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <User className="w-5 h-5 text-gray-400" />
              <div>
                <p className="text-xs text-gray-500">Employee ID</p>
                <p className="text-sm font-medium text-gray-900">{user.employeeId || '—'}</p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Change password */}
      <Card title="Change Password">
        <form onSubmit={handlePwSubmit(onPasswordChange)} className="p-6 space-y-4">
          <Input
            label="Current Password"
            type="password"
            error={pwErrors.currentPassword?.message}
            {...registerPw('currentPassword', { required: 'Current password is required' })}
          />
          <Input
            label="New Password"
            type="password"
            error={pwErrors.newPassword?.message}
            {...registerPw('newPassword', {
              required: 'New password is required',
              minLength: { value: 6, message: 'Min 6 characters' },
            })}
          />
          <Input
            label="Confirm New Password"
            type="password"
            error={pwErrors.confirmPassword?.message}
            {...registerPw('confirmPassword', { required: 'Please confirm your new password' })}
          />
          <div className="flex justify-end">
            <Button type="submit" loading={loadingPw}>
              <Save className="w-4 h-4" />
              Change Password
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
