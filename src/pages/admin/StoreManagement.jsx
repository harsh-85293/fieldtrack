import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Pencil, Trash2, Store as StoreIcon } from 'lucide-react';
import { storeService } from '../../api/services.js';
import {
  LoadingCard, EmptyState, ErrorState, Badge, Button, Input, Pagination,
} from '../../components/ui/index.jsx';
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx';
import { useToast } from '../../components/ui/Toast.jsx';
import { useForm } from 'react-hook-form';
import { extractList, extractPagination } from '../../utils/apiData.js';
import { entityId } from '../../utils/format.js';

export default function StoreManagement() {
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editStore, setEditStore] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const { toastSuccess, toastError } = useToast();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm();

  const loadStores = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await storeService.getAll({ page, search });
      setStores(extractList(res, 'stores'));
      setTotalPages(extractPagination(res).pages);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load stores');
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    const timer = setTimeout(() => loadStores(), 300);
    return () => clearTimeout(timer);
  }, [loadStores]);

  const openCreate = () => {
    setEditStore(null);
    reset({
      name: '', code: '', address: '', city: '', state: '', postalCode: '',
      latitude: '', longitude: '', phone: '', contactPerson: '',
    });
    setModalOpen(true);
  };

  const openEdit = (store) => {
    setEditStore(store);
    reset({
      name: store.name || '',
      address: store.address || '',
      city: store.city || '',
      state: store.state || '',
      postalCode: store.postalCode || '',
      latitude: store.location?.lat ?? store.latitude ?? '',
      longitude: store.location?.lng ?? store.longitude ?? '',
      phone: store.phone || '',
      contactPerson: store.ownerName || store.contactPerson || '',
      code: store.code || '',
    });
    setModalOpen(true);
  };

  const onSubmit = async (data) => {
    try {
      const payload = {
        name: data.name,
        code: data.code || data.name?.slice(0, 6).toUpperCase().replace(/\s/g, '') || `STR${Date.now().toString().slice(-4)}`,
        address: data.address,
        city: data.city,
        state: data.state,
        postalCode: data.postalCode,
        phone: data.phone,
        ownerName: data.contactPerson,
        latitude: data.latitude ? parseFloat(data.latitude) : undefined,
        longitude: data.longitude ? parseFloat(data.longitude) : undefined,
      };
      if (editStore) {
        await storeService.update(entityId(editStore), payload);
        toastSuccess('Store updated successfully');
      } else {
        await storeService.create(payload);
        toastSuccess('Store created successfully');
      }
      setModalOpen(false);
      loadStores();
    } catch (err) {
      toastError(err.response?.data?.message || 'Failed to save store');
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await storeService.delete(entityId(confirmDelete));
      toastSuccess('Store deleted successfully');
      setConfirmDelete(null);
      loadStores();
    } catch (err) {
      toastError(err.response?.data?.message || 'Failed to delete store');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Stores</h1>
          <p className="text-sm text-gray-500">Manage store locations</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4" />
          Add Store
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search stores..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>

      {loading ? (
        <LoadingCard rows={5} />
      ) : error ? (
        <ErrorState message={error} onRetry={loadStores} />
      ) : stores.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <EmptyState icon={StoreIcon} title="No stores found" message="Add your first store to get started." />
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="px-6 py-3 text-left font-medium text-gray-600">Name</th>
                    <th className="px-6 py-3 text-left font-medium text-gray-600">Address</th>
                    <th className="px-6 py-3 text-left font-medium text-gray-600">Phone</th>
                    <th className="px-6 py-3 text-left font-medium text-gray-600">GPS</th>
                    <th className="px-6 py-3 text-right font-medium text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {stores.map((store) => (
                    <tr key={entityId(store)} className="hover:bg-gray-50">
                      <td className="px-6 py-3 font-medium text-gray-900">{store.name}</td>
                      <td className="px-6 py-3 text-gray-600">
                        {[store.address, store.city, store.state].filter(Boolean).join(', ') || '—'}
                      </td>
                      <td className="px-6 py-3 text-gray-600">{store.phone || '—'}</td>
                      <td className="px-6 py-3 text-gray-600">
                        {store.location?.lat != null
                          ? `${Number(store.location.lat).toFixed(4)}, ${Number(store.location.lng).toFixed(4)}`
                          : '—'}
                      </td>
                      <td className="px-6 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => openEdit(store)} className="p-1.5 text-gray-500 hover:text-primary-700 hover:bg-primary-50 rounded-lg">
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button onClick={() => setConfirmDelete(store)} className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {stores.map((store) => (
              <div key={entityId(store)} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{store.name}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {[store.address, store.city, store.state].filter(Boolean).join(', ') || '—'}
                    </p>
                    <Badge color={store.location?.lat != null ? 'green' : 'gray'} className="mt-2">
                      {store.location?.lat != null ? 'GPS set' : 'No GPS'}
                    </Badge>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(store)} className="p-1.5 text-gray-500 hover:text-primary-700 rounded-lg">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => setConfirmDelete(store)} className="p-1.5 text-gray-500 hover:text-red-600 rounded-lg">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
        </>
      )}

      {/* Modal form */}
      {modalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setModalOpen(false)} />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {editStore ? 'Edit Store' : 'Add Store'}
            </h2>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <Input label="Store Name" error={errors.name?.message} {...register('name', { required: 'Name is required' })} />
              <Input label="Store Code" error={errors.code?.message} {...register('code', { required: !editStore ? 'Code is required' : false })} />
              <Input label="Address" {...register('address')} />
              <div className="grid grid-cols-2 gap-4">
                <Input label="City" {...register('city')} />
                <Input label="State" {...register('state')} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input label="Postal Code" {...register('postalCode')} />
                <Input label="Phone" {...register('phone')} />
              </div>
              <Input label="Contact Person" {...register('contactPerson')} />
              <div className="grid grid-cols-2 gap-4">
                <Input label="Latitude" type="number" step="any" {...register('latitude')} />
                <Input label="Longitude" type="number" step="any" {...register('longitude')} />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="secondary" type="button" onClick={() => setModalOpen(false)}>Cancel</Button>
                <Button type="submit" loading={isSubmitting}>{editStore ? 'Update' : 'Create'}</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!confirmDelete}
        title="Delete Store"
        message={`Are you sure you want to delete "${confirmDelete?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        danger
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
