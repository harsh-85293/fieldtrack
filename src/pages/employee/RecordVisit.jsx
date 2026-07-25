import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { ArrowLeft, Plus, Trash2, MapPin, Save } from 'lucide-react';
import { storeService, productService, visitService } from '../../api/services.js';
import {
  Button, Input, Select, LoadingSpinner, ErrorState, Badge,
} from '../../components/ui/index.jsx';
import { useToast } from '../../components/ui/Toast.jsx';
import { fromMinor, toMinor, formatMoney } from '../../utils/format.js';
import { queuePendingVisit } from '../../lib/offlineDb.js';

export default function RecordVisit() {
  const navigate = useNavigate();
  const { toastSuccess, toastError, toastInfo } = useToast();
  const [stores, setStores] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [gpsStatus, setGpsStatus] = useState('idle');
  const [gpsPosition, setGpsPosition] = useState(null);
  const [lineItems, setLineItems] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues: { storeId: '', notes: '' },
  });

  const loadOptions = useCallback(async () => {
    try {
      const [storeRes, prodRes] = await Promise.all([
        storeService.getAll({ limit: 1000 }),
        productService.getAll({ limit: 1000 }),
      ]);
      const storeData = storeRes.data.data || storeRes.data;
      setStores(storeData.stores || storeData.items || storeData || []);
      const prodData = prodRes.data.data || prodRes.data;
      setProducts(prodData.products || prodData.items || prodData || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOptions();
  }, [loadOptions]);

  // Get GPS on mount
  useEffect(() => {
    if (!navigator.geolocation) {
      setGpsStatus('unavailable');
      return;
    }
    setGpsStatus('acquiring');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsStatus('success');
        setGpsPosition({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
      },
      (err) => {
        setGpsStatus(err.code === err.PERMISSION_DENIED ? 'denied' : 'error');
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  }, []);

  const addLineItem = () => {
    setLineItems((items) => [
      ...items,
      { id: crypto.randomUUID(), productId: '', quantity: 1, unitPrice: 0, productName: '' },
    ]);
  };

  const removeLineItem = (id) => {
    setLineItems((items) => items.filter((item) => item.id !== id));
  };

  const updateLineItem = (id, field, value) => {
    setLineItems((items) =>
      items.map((item) => {
        if (item.id === id) {
          const updated = { ...item, [field]: value };
          if (field === 'productId') {
            const product = products.find((p) => p.id === value);
            if (product) {
              updated.productName = product.name;
              updated.unitPrice = product.price || 0;
            }
          }
          return updated;
        }
        return item;
      })
    );
  };

  const totalAmount = lineItems.reduce((sum, item) => {
    const qty = parseFloat(item.quantity) || 0;
    const price = parseFloat(item.unitPrice) || 0;
    return sum + toMinor(qty * fromMinor(price));
  }, 0);

  const onSubmit = async (data) => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);

    if (lineItems.length === 0) {
      toastError('Please add at least one product');
      submittingRef.current = false;
      setSubmitting(false);
      return;
    }

    const idempotencyKey = crypto.randomUUID();

    const payload = {
      idempotencyKey,
      storeId: data.storeId,
      notes: data.notes,
      items: lineItems.map((item) => ({
        productId: item.productId,
        quantity: parseFloat(item.quantity) || 0,
        unitPrice: parseFloat(item.unitPrice) || 0,
      })),
      latitude: gpsPosition?.latitude || null,
      longitude: gpsPosition?.longitude || null,
      accuracy: gpsPosition?.accuracy || null,
    };

    try {
      await visitService.create(payload);
      toastSuccess('Visit recorded successfully');
      navigate('/app/visits');
    } catch (err) {
      // Offline fallback - queue for later sync
      if (!navigator.onLine || err.code === 'ERR_NETWORK') {
        try {
          await queuePendingVisit({ ...payload, createdAt: new Date().toISOString() });
          toastInfo('Visit saved offline. Will sync when online.');
          navigate('/app/visits');
        } catch (queueErr) {
          toastError('Failed to save visit offline');
        }
      } else {
        toastError(err.response?.data?.message || 'Failed to record visit');
      }
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  if (loading) return <LoadingSpinner className="py-20" />;
  if (error) return <ErrorState message={error} onRetry={loadOptions} />;

  const gpsInfo = {
    idle: { label: 'GPS Off', color: 'gray' },
    acquiring: { label: 'Getting GPS...', color: 'amber' },
    success: { label: 'GPS Ready', color: 'green' },
    denied: { label: 'GPS Denied', color: 'red' },
    unavailable: { label: 'GPS Unavailable', color: 'gray' },
    error: { label: 'GPS Error', color: 'red' },
  };
  const gps = gpsInfo[gpsStatus] || gpsInfo.idle;

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/app')} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold text-gray-900">Record Visit</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* GPS status */}
        <div className="flex items-center justify-between bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-2">
            <MapPin className={`w-5 h-5 text-${gps.color === 'green' ? 'emerald' : gps.color === 'amber' ? 'amber' : gps.color === 'red' ? 'red' : 'gray'}-500 ${gpsStatus === 'acquiring' ? 'animate-spin' : ''}`} />
            <div>
              <p className="text-sm font-medium text-gray-700">{gps.label}</p>
              {gpsPosition && (
                <p className="text-xs text-gray-500">
                  {gpsPosition.latitude.toFixed(6)}, {gpsPosition.longitude.toFixed(6)}
                </p>
              )}
            </div>
          </div>
          {gpsPosition && <Badge color="green">±{Math.round(gpsPosition.accuracy)}m</Badge>}
        </div>

        {/* Store selection */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <Select
            label="Store"
            error={errors.storeId?.message}
            {...register('storeId', { required: 'Please select a store' })}
          >
            <option value="">Select a store...</option>
            {stores.map((store) => (
              <option key={store.id} value={store.id}>{store.name}</option>
            ))}
          </Select>
        </div>

        {/* Line items */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">Products</h3>
            <Button size="sm" type="button" onClick={addLineItem}>
              <Plus className="w-4 h-4" />
              Add Item
            </Button>
          </div>

          {lineItems.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">No items added yet. Tap "Add Item" to begin.</p>
          ) : (
            <div className="space-y-3">
              {lineItems.map((item) => (
                <div key={item.id} className="border border-gray-200 rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-500">Item {lineItems.indexOf(item) + 1}</span>
                    <button
                      type="button"
                      onClick={() => removeLineItem(item.id)}
                      className="text-red-500 hover:bg-red-50 p-1 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <select
                    value={item.productId}
                    onChange={(e) => updateLineItem(item.id, 'productId', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                  >
                    <option value="">Select product...</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-gray-500">Quantity</label>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={item.quantity}
                        onChange={(e) => updateLineItem(item.id, 'quantity', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">Unit Price (₹)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={fromMinor(item.unitPrice).toFixed(2)}
                        onChange={(e) => updateLineItem(item.id, 'unitPrice', toMinor(parseFloat(e.target.value) || 0))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                  </div>
                  <div className="text-right text-sm font-medium text-gray-700">
                    Subtotal: {formatMoney(toMinor((parseFloat(item.quantity) || 0) * fromMinor(item.unitPrice)))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {lineItems.length > 0 && (
            <div className="border-t border-gray-100 pt-3 flex justify-between items-center">
              <span className="text-sm font-semibold text-gray-900">Total</span>
              <span className="text-lg font-bold text-primary-700">{formatMoney(totalAmount)}</span>
            </div>
          )}
        </div>

        {/* Notes */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
          <textarea
            rows={3}
            {...register('notes')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="Add any notes about this visit..."
          />
        </div>

        {/* Submit */}
        <Button type="submit" className="w-full" size="lg" loading={submitting}>
          <Save className="w-5 h-5" />
          Submit Visit
        </Button>
      </form>
    </div>
  );
}
