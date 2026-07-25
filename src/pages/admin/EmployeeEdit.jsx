import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { ArrowLeft, Save } from 'lucide-react';
import { employeeService } from '../../api/services.js';
import { Button, Input, Select, LoadingSpinner, ErrorState } from '../../components/ui/index.jsx';
import { useToast } from '../../components/ui/Toast.jsx';

export default function EmployeeEdit() {
  const { id } = useParams();
  const isEdit = !!id;
  const navigate = useNavigate();
  const { toastSuccess, toastError } = useToast();
  const [loading, setLoading] = useState(isEdit);
  const [pageError, setPageError] = useState(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm({
    defaultValues: {
      name: '',
      email: '',
      employeeId: '',
      phone: '',
      address: '',
      city: '',
      state: '',
      postalCode: '',
      password: '',
      role: 'employee',
      isActive: true,
    },
  });

  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      try {
        const res = await employeeService.getById(id);
        const emp = res.data.data || res.data;
        reset({
          name: emp.name || '',
          email: emp.email || '',
          employeeId: emp.employeeId || '',
          phone: emp.phone || '',
          address: emp.address || '',
          city: emp.city || '',
          state: emp.state || '',
          postalCode: emp.postalCode || '',
          password: '',
          role: emp.role || 'employee',
          isActive: emp.isActive ?? true,
        });
      } catch (err) {
        setPageError(err.response?.data?.message || 'Failed to load employee');
      } finally {
        setLoading(false);
      }
    })();
  }, [id, isEdit, reset]);

  const onSubmit = async (data) => {
    try {
      const payload = { ...data };
      if (!payload.password) delete payload.password;
      if (isEdit) {
        await employeeService.update(id, payload);
        toastSuccess('Employee updated successfully');
      } else {
        await employeeService.create(payload);
        toastSuccess('Employee created successfully');
      }
      navigate('/admin/employees');
    } catch (err) {
      toastError(err.response?.data?.message || 'Failed to save employee');
    }
  };

  if (loading) return <LoadingSpinner className="py-20" />;
  if (pageError) return <ErrorState message={pageError} />;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/admin/employees" className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEdit ? 'Edit Employee' : 'New Employee'}
          </h1>
          <p className="text-sm text-gray-500">
            {isEdit ? 'Update employee information' : 'Create a new field employee account'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Full Name"
            error={errors.name?.message}
            {...register('name', { required: 'Name is required' })}
          />
          <Input
            label="Email"
            type="email"
            error={errors.email?.message}
            {...register('email', {
              required: 'Email is required',
              pattern: { value: /^\S+@\S+\.\S+$/, message: 'Invalid email' },
            })}
          />
          <Input
            label="Employee ID"
            error={errors.employeeId?.message}
            {...register('employeeId', { required: 'Employee ID is required' })}
          />
          <Input
            label="Phone"
            error={errors.phone?.message}
            {...register('phone')}
          />
          <Input
            label="Address"
            error={errors.address?.message}
            {...register('address')}
          />
          <Input
            label="City"
            error={errors.city?.message}
            {...register('city')}
          />
          <Input
            label="State"
            error={errors.state?.message}
            {...register('state')}
          />
          <Input
            label="Postal Code"
            error={errors.postalCode?.message}
            {...register('postalCode')}
          />
          <Select label="Role" error={errors.role?.message} {...register('role')}>
            <option value="employee">Employee</option>
            <option value="admin">Admin</option>
          </Select>
          <Select label="Status" {...register('isActive')}>
            <option value={true}>Active</option>
            <option value={false}>Inactive</option>
          </Select>
          {!isEdit && (
            <Input
              label="Password"
              type="password"
              error={errors.password?.message}
              {...register('password', isEdit ? {} : { required: 'Password is required', minLength: { value: 6, message: 'Min 6 characters' } })}
            />
          )}
          {isEdit && (
            <Input
              label="New Password (optional)"
              type="password"
              error={errors.password?.message}
              {...register('password', { minLength: { value: 6, message: 'Min 6 characters' } })}
            />
          )}
        </div>

        <div className="flex justify-end gap-3">
          <Link to="/admin/employees">
            <Button variant="secondary">Cancel</Button>
          </Link>
          <Button type="submit" loading={isSubmitting}>
            <Save className="w-4 h-4" />
            {isEdit ? 'Update' : 'Create'}
          </Button>
        </div>
      </form>
    </div>
  );
}
