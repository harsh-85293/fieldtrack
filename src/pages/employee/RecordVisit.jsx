import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { ArrowLeft, Plus, Trash2, MapPin, Save } from 'lucide-react';
import { storeService, productService, visitService, sessionService } from '../../api/services.js';
import {
  Button, Select, LoadingSpinner, ErrorState, Badge,
} from '../../components/ui/index.jsx';
import { useToast } from '../../components/ui/Toast.jsx';
import { formatRupees, entityId } from '../../utils/format.js';
import { extractList } from '../../utils/apiData.js';
import { queuePendingVisit } from '../../lib/offlineDb.js';

export default function RecordVisit() {
  const navigate = useNavigate();
  const { toastSuccess, toastError, toastInfo } = useToast();
  const [stores, setStores] = useState([]);
  const [products, setProducts] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
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
    formState: { errors },
  } = useForm({
    defaultValues: { storeId: '', notes: '' },
  });

  const loadOptions = useCallback(async () => {
    try {
      const [storeRes, prodRes, sessionRes] = await Promise.all([
        storeService.getActive(),
        productService.getActive(),
        sessionService.getActiveSession(),
      ]);
      setStores(extractList(storeRes, 'stores'));
      setProducts(extractList(prodRes, 'products'));
      setActiveSession(sessionRes.data?.data ?? sessionRes.data ?? null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOptions();
  }, [loadOptions]);

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
      { enableHighAccuracy: true, timeout: 15000 },
    );
  }, []);

  const addLineItem = () => {
    setLineItems((items) => [
      ...items,
      {
        id: crypto.randomUUID(),
        productId: '',
        quantity: 1,
        unitPrice: 0,
        collectedAmount: 0,
        productName: '',
      },
    ]);
  };

  const removeLineItem = (id) => {
    setLineItems((items) => items.filter((item) => item.id !== id));
  };

  const updateLineItem = (id, field, value) => {
    setLineItems((items) =>
      items.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: value };
        if (field === 'productId') {
          const product = products.find((p) => String(entityId(p)) === String(value));
          if (product) {
            updated.productName = product.name;
            const price = Number(product.defaultPrice ?? product.price ?? 0);
            updated.unitPrice = price;
            const qty = parseFloat(updated.quantity) || 0;
            updated.collectedAmount = Number((price * qty).toFixed(2));
          }
        }
        if (field === 'quantity' || field === 'unitPrice') {
          const qty = parseFloat(field === 'quantity' ? value : updated.quantity) || 0;
          const price = parseFloat(field === 'unitPrice' ? value : updated.unitPrice) || 0;
          // Keep collected in sync unless user already edited it independently later
          updated.collectedAmount = Number((price * qty).toFixed(2));
        }
        return updated;
      }),
    );
  };

  const totalQuantity = lineItems.reduce((sum, item) => sum + (parseFloat(item.quantity) || 0), 0);
  const totalValue = lineItems.reduce((sum, item) => {
    const qty = parseFloat(item.quantity) || 0;
    const price = parseFloat(item.unitPrice) || 0;
    return sum + qty * price;
  }, 0);
  const totalCollected = lineItems.reduce(
    (sum, item) => sum + (parseFloat(item.collectedAmount) || 0),
    0,
  );

  const onSubmit = async (data) => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);

    try {
      if (!activeSession) {
        toastError('Check in first to record a store visit');
        return;
      }
      if (lineItems.length === 0) {
        toastError('Please add at least one product');
        return;
      }
      if (lineItems.some((item) => !item.productId)) {
        toastError('Select a product for every line item');
        return;
      }

      const sessionId = entityId(activeSession);
      const idempotencyKey = crypto.randomUUID();

      const payload = {
        idempotencyKey,
        sessionId,
        storeId: data.storeId,
        notes: data.notes,
        items: lineItems.map((item) => ({
          productId: item.productId,
          productName: item.productName,
          quantity: parseFloat(item.quantity) || 0,
          unitPrice: parseFloat(item.unitPrice) || 0,
          collectedAmount: parseFloat(item.collectedAmount) || 0,
        })),
        latitude: gpsPosition?.latitude ?? null,
        longitude: gpsPosition?.longitude ?? null,
        accuracy: gpsPosition?.accuracy ?? null,
      };

      try {
        await visitService.create(payload);
        toastSuccess('Visit recorded successfully');
        navigate('/app/visits');
      } catch (err) {
        if (!navigator.onLine || err.code === 'ERR_NETWORK') {
          await queuePendingVisit({ ...payload, createdAt: new Date().toISOString() });
          toastInfo('Visit saved offline. Will sync when online.');
          navigate('/app/visits');
        } else {
          toastError(err.response?.data?.message || 'Failed to record visit');
        }
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
        <button type="button" onClick={() => navigate('/app')} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold text-gray-900">Record Visit</h1>
      </div>

      {!activeSession && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
          You must check in before recording a store visit.
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="flex items-center justify-between bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-gray-500" />
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

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <Select
            label="Store"
            error={errors.storeId?.message}
            {...register('storeId', { required: 'Please select a store' })}
          >
            <option value="">Select a store...</option>
            {stores.map((store) => {
              const id = entityId(store);
              return (
                <option key={id} value={id}>{store.name}</option>
              );
            })}
          </Select>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">Products</h3>
            <Button size="sm" type="button" onClick={addLineItem}>
              <Plus className="w-4 h-4" />
              Add Item
            </Button>
          </div>

          {lineItems.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">No items added yet. Tap &quot;Add Item&quot; to begin.</p>
          ) : (
            <div className="space-y-3">
              {lineItems.map((item, index) => (
                <div key={item.id} className="border border-gray-200 rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-500">Item {index + 1}</span>
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
                      <option key={entityId(p)} value={entityId(p)}>{p.name}</option>
                    ))}
                  </select>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-xs text-gray-500">Quantity</label>
                      <input
                        type="number"
                        min="0"
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
                        value={item.unitPrice}
                        onChange={(e) => updateLineItem(item.id, 'unitPrice', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500">Collected (₹)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.collectedAmount}
                        onChange={(e) => updateLineItem(item.id, 'collectedAmount', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                  </div>
                  <div className="text-right text-sm font-medium text-gray-700">
                    Line total: {formatRupees((parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {lineItems.length > 0 && (
            <div className="border-t border-gray-100 pt-3 space-y-1">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Total quantity</span>
                <span>{totalQuantity}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>Product value</span>
                <span>{formatRupees(totalValue)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-semibold text-gray-900">Collected</span>
                <span className="text-lg font-bold text-primary-700">{formatRupees(totalCollected)}</span>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
          <textarea
            rows={3}
            {...register('notes')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            placeholder="Add any notes about this visit..."
          />
        </div>

        <Button type="submit" className="w-full" size="lg" loading={submitting} disabled={!activeSession}>
          <Save className="w-5 h-5" />
          Submit Visit
        </Button>
      </form>
    </div>
  );
}
