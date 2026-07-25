import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { ArrowLeft, Store, User, Clock, MapPin, Save } from 'lucide-react';
import { visitService } from '../../api/services.js';
import {
  LoadingSpinner, ErrorState, Badge, Card, Button, Input, EmptyState,
} from '../../components/ui/index.jsx';
import { useToast } from '../../components/ui/Toast.jsx';
import { formatDateTime, formatMoney, fromMinor } from '../../utils/format.js';

export default function VisitDetail() {
  const { id } = useParams();
  const [visit, setVisit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCorrection, setShowCorrection] = useState(false);
  const { toastSuccess, toastError } = useToast();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm();

  useEffect(() => {
    (async () => {
      try {
        const res = await visitService.getById(id);
        setVisit(res.data.data || res.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load visit');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const onCorrection = async (data) => {
    try {
      await visitService.correct(id, data);
      toastSuccess('Correction submitted successfully');
      setShowCorrection(false);
      reset();
      const res = await visitService.getById(id);
      setVisit(res.data.data || res.data);
    } catch (err) {
      toastError(err.response?.data?.message || 'Failed to submit correction');
    }
  };

  if (loading) return <LoadingSpinner className="py-20" />;
  if (error) return <ErrorState message={error} />;
  if (!visit) return <ErrorState message="Visit not found" />;

  const items = visit.items || visit.lineItems || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/admin/visits" className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Visit Detail</h1>
          <p className="text-sm text-gray-500">{visit.id}</p>
        </div>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <div className="p-5">
            <Store className="w-6 h-6 text-primary-700 mb-2" />
            <p className="text-sm text-gray-500">Store</p>
            <p className="text-lg font-semibold text-gray-900">{visit.storeName || '—'}</p>
          </div>
        </Card>
        <Card>
          <div className="p-5">
            <User className="w-6 h-6 text-emerald-600 mb-2" />
            <p className="text-sm text-gray-500">Employee</p>
            <p className="text-lg font-semibold text-gray-900">{visit.employeeName || '—'}</p>
          </div>
        </Card>
        <Card>
          <div className="p-5">
            <Clock className="w-6 h-6 text-amber-600 mb-2" />
            <p className="text-sm text-gray-500">Visit Time</p>
            <p className="text-lg font-semibold text-gray-900">{formatDateTime(visit.visitTime)}</p>
          </div>
        </Card>
        <Card>
          <div className="p-5">
            <MapPin className="w-6 h-6 text-red-600 mb-2" />
            <p className="text-sm text-gray-500">Location</p>
            <Badge color={visit.outsideRadius ? 'red' : 'green'} className="mt-1">
              {visit.outsideRadius ? 'Outside Radius' : 'On-site'}
            </Badge>
          </div>
        </Card>
      </div>

      {/* Items table */}
      <Card title="Visit Items">
        {items.length === 0 ? (
          <EmptyState title="No items in this visit" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-6 py-3 text-left font-medium text-gray-600">Product</th>
                  <th className="px-6 py-3 text-left font-medium text-gray-600">Qty</th>
                  <th className="px-6 py-3 text-left font-medium text-gray-600">Unit Price</th>
                  <th className="px-6 py-3 text-left font-medium text-gray-600">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {items.map((item, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-6 py-3 font-medium text-gray-900">{item.productName || item.name || '—'}</td>
                    <td className="px-6 py-3 text-gray-600">{item.quantity}</td>
                    <td className="px-6 py-3 text-gray-600">{formatMoney(item.unitPrice || item.price || 0)}</td>
                    <td className="px-6 py-3 text-gray-600">{formatMoney(item.totalPrice || item.total || 0)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-200 bg-gray-50">
                  <td colSpan={3} className="px-6 py-3 text-right font-semibold text-gray-900">Grand Total</td>
                  <td className="px-6 py-3 font-bold text-primary-700">{formatMoney(visit.totalAmount || 0)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Card>

      {/* Notes */}
      {visit.notes && (
        <Card title="Notes">
          <div className="p-6">
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{visit.notes}</p>
          </div>
        </Card>
      )}

      {/* Correction form */}
      <Card title="Correction">
        {!showCorrection ? (
          <div className="p-6">
            <Button onClick={() => setShowCorrection(true)}>Submit Correction</Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onCorrection)} className="p-6 space-y-4">
            <Input
              label="Corrected Total Amount (₹)"
              type="number"
              step="0.01"
              defaultValue={fromMinor(visit.totalAmount || 0).toFixed(2)}
              error={errors.correctedTotal?.message}
              {...register('correctedTotal', { required: 'Amount is required' })}
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reason for Correction</label>
              <textarea
                rows={3}
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${errors.reason ? 'border-red-500' : 'border-gray-300'}`}
                {...register('reason', { required: 'Reason is required' })}
                placeholder="Explain why this correction is needed..."
              />
              {errors.reason && <p className="mt-1 text-xs text-red-600">{errors.reason.message}</p>}
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setShowCorrection(false)}>Cancel</Button>
              <Button type="submit" loading={isSubmitting}>
                <Save className="w-4 h-4" />
                Submit Correction
              </Button>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
}
