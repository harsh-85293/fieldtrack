import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { User, Mail, Phone, MapPin, Save, Lock } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext.jsx';
import { employeeService } from '../../api/services.js';
import {
  Button, Input, Card, LoadingSpinner,
} from '../../components/ui/index.jsx';
import { useToast } from '../../components/ui/Toast.jsx';

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

  useEffect(() => {
    if (user) {
      reset({
        name: user.name || '',
        email: user.email || '',
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
      await employeeService.update(user.id, {
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
    <div className="space-y-4 max-w-2xl">
      <h1 className="text-xl font-bold text-gray-900">My Profile</h1>

      {/* Profile header */}
      <Card>
        <div className="p-5 flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-2xl font-bold">
            {user?.name?.charAt(0)?.toUpperCase()}
          </div>
          <div>
            <p className="text-lg font-semibold text-gray-900">{user?.name}</p>
            <p className="text-sm text-gray-500">{user?.employeeId || '—'}</p>
          </div>
        </div>
      </Card>

      {/* Edit form */}
      <Card title="Edit Information">
        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
          <div className="flex items-center gap-3">
            <User className="w-5 h-5 text-gray-400" />
            <Input label="Full Name" disabled defaultValue={user?.name || ''} {...register('name')} />
          </div>
          <div className="flex items-center gap-3">
            <Mail className="w-5 h-5 text-gray-400" />
            <Input label="Email" disabled defaultValue={user?.email || ''} {...register('email')} />
          </div>
          <div className="flex items-center gap-3">
            <Phone className="w-5 h-5 text-gray-400" />
            <Input label="Phone" type="tel" error={errors.phone?.message} {...register('phone')} />
          </div>
          <div className="flex items-center gap-3">
            <MapPin className="w-5 h-5 text-gray-400" />
            <Input label="Address" {...register('address')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="City" {...register('city')} />
            <Input label="State" {...register('state')} />
          </div>
          <Input label="Postal Code" {...register('postalCode')} />

          <Button type="submit" className="w-full" loading={saving}>
            <Save className="w-4 h-4" />
            Save Changes
          </Button>
        </form>
      </Card>

      {/* Change password link */}
      <button
        onClick={() => navigate('/app/change-password')}
        className="w-full py-3 bg-white text-primary-700 border border-primary-200 font-medium rounded-xl hover:bg-primary-50 transition-colors flex items-center justify-center gap-2"
      >
        <Lock className="w-5 h-5" />
        Change Password
      </button>
    </div>
  );
}
