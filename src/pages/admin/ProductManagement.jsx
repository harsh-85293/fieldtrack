import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Pencil, Trash2, Package } from 'lucide-react';
import { productService } from '../../api/services.js';
import {
  LoadingCard, EmptyState, ErrorState, Badge, Button, Input, Select, Pagination,
} from '../../components/ui/index.jsx';
import ConfirmDialog from '../../components/ui/ConfirmDialog.jsx';
import { useToast } from '../../components/ui/Toast.jsx';
import { useForm } from 'react-hook-form';
import { fromMinor, toMinor, formatMoney } from '../../utils/format.js';

export default function ProductManagement() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const { toastSuccess, toastError } = useToast();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm();

  const priceDisplay = watch('priceDisplay');

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await productService.getAll({ page, search });
      const data = res.data.data || res.data;
      setProducts(data.products || data.items || data || []);
      setTotalPages(data.totalPages || data.pages || 1);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    const timer = setTimeout(() => loadProducts(), 300);
    return () => clearTimeout(timer);
  }, [loadProducts]);

  const openCreate = () => {
    setEditProduct(null);
    reset({ name: '', sku: '', description: '', priceDisplay: '', unit: 'piece', category: '', isActive: true });
    setModalOpen(true);
  };

  const openEdit = (product) => {
    setEditProduct(product);
    reset({
      name: product.name || '',
      sku: product.sku || '',
      description: product.description || '',
      priceDisplay: fromMinor(product.price || 0).toFixed(2),
      unit: product.unit || 'piece',
      category: product.category || '',
      isActive: product.isActive ?? true,
    });
    setModalOpen(true);
  };

  const onSubmit = async (data) => {
    try {
      const payload = {
        name: data.name,
        sku: data.sku,
        description: data.description,
        price: toMinor(parseFloat(data.priceDisplay) || 0),
        unit: data.unit,
        category: data.category,
        isActive: data.isActive,
      };
      if (editProduct) {
        await productService.update(editProduct.id, payload);
        toastSuccess('Product updated successfully');
      } else {
        await productService.create(payload);
        toastSuccess('Product created successfully');
      }
      setModalOpen(false);
      loadProducts();
    } catch (err) {
      toastError(err.response?.data?.message || 'Failed to save product');
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await productService.delete(confirmDelete.id);
      toastSuccess('Product deleted successfully');
      setConfirmDelete(null);
      loadProducts();
    } catch (err) {
      toastError(err.response?.data?.message || 'Failed to delete product');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Products</h1>
          <p className="text-sm text-gray-500">Manage product catalog</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4" />
          Add Product
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search products..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>

      {loading ? (
        <LoadingCard rows={5} />
      ) : error ? (
        <ErrorState message={error} onRetry={loadProducts} />
      ) : products.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <EmptyState icon={Package} title="No products found" message="Add your first product to get started." />
        </div>
      ) : (
        <>
          <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="px-6 py-3 text-left font-medium text-gray-600">Name</th>
                    <th className="px-6 py-3 text-left font-medium text-gray-600">SKU</th>
                    <th className="px-6 py-3 text-left font-medium text-gray-600">Category</th>
                    <th className="px-6 py-3 text-left font-medium text-gray-600">Unit</th>
                    <th className="px-6 py-3 text-left font-medium text-gray-600">Price</th>
                    <th className="px-6 py-3 text-left font-medium text-gray-600">Status</th>
                    <th className="px-6 py-3 text-right font-medium text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {products.map((product) => (
                    <tr key={product.id} className="hover:bg-gray-50">
                      <td className="px-6 py-3 font-medium text-gray-900">{product.name}</td>
                      <td className="px-6 py-3 text-gray-600">{product.sku || '—'}</td>
                      <td className="px-6 py-3 text-gray-600">{product.category || '—'}</td>
                      <td className="px-6 py-3 text-gray-600">{product.unit || '—'}</td>
                      <td className="px-6 py-3 text-gray-600">{formatMoney(product.price || 0)}</td>
                      <td className="px-6 py-3">
                        <Badge color={product.isActive ? 'green' : 'gray'}>
                          {product.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td className="px-6 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => openEdit(product)} className="p-1.5 text-gray-500 hover:text-primary-700 hover:bg-primary-50 rounded-lg">
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button onClick={() => setConfirmDelete(product)} className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg">
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

          <div className="md:hidden space-y-3">
            {products.map((product) => (
              <div key={product.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{product.name}</p>
                    <p className="text-xs text-gray-500">{product.sku || '—'}</p>
                    <p className="text-sm font-semibold text-primary-700 mt-1">{formatMoney(product.price || 0)}</p>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => openEdit(product)} className="p-1.5 text-gray-500 hover:text-primary-700 rounded-lg">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => setConfirmDelete(product)} className="p-1.5 text-gray-500 hover:text-red-600 rounded-lg">
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

      {modalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setModalOpen(false)} />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {editProduct ? 'Edit Product' : 'Add Product'}
            </h2>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <Input label="Product Name" error={errors.name?.message} {...register('name', { required: 'Name is required' })} />
              <Input label="SKU" {...register('sku')} />
              <Input label="Description" {...register('description')} />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Price (₹)"
                  type="number"
                  step="0.01"
                  error={errors.priceDisplay?.message}
                  {...register('priceDisplay', { required: 'Price is required', min: { value: 0, message: 'Must be positive' } })}
                />
                <Select label="Unit" {...register('unit')}>
                  <option value="piece">Piece</option>
                  <option value="kg">Kilogram</option>
                  <option value="litre">Litre</option>
                  <option value="box">Box</option>
                  <option value="dozen">Dozen</option>
                </Select>
              </div>
              <Input label="Category" {...register('category')} />
              <Select label="Status" {...register('isActive')}>
                <option value={true}>Active</option>
                <option value={false}>Inactive</option>
              </Select>
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
                <Button type="submit" loading={isSubmitting}>{editProduct ? 'Update' : 'Create'}</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!confirmDelete}
        title="Delete Product"
        message={`Are you sure you want to delete "${confirmDelete?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        danger
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
