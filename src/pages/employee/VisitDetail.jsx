import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Store, Clock, MapPin, Package } from 'lucide-react';
import { visitService } from '../../api/services.js';
import {
  LoadingSpinner, ErrorState, Badge, Card, EmptyState,
} from '../../components/ui/index.jsx';
import { formatDateTime, formatMoney } from '../../utils/format.js';

export default function VisitDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [visit, setVisit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

  if (loading) return <LoadingSpinner className="py-20" />;
  if (error) return <ErrorState message={error} onRetry={() => navigate('/app/visits')} />;
  if (!visit) return <ErrorState message="Visit not found" />;

  const items = visit.items || visit.lineItems || [];

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/app/visits')} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold text-gray-900">Visit Detail</h1>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-1 gap-3">
        <Card>
          <div className="p-4 flex items-center gap-3">
            <Store className="w-8 h-8 text-primary-700" />
            <div>
              <p className="text-xs text-gray-500">Store</p>
              <p className="text-sm font-semibold text-gray-900">{visit.storeName || '—'}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="p-4 flex items-center gap-3">
            <Clock className="w-8 h-8 text-amber-600" />
            <div>
              <p className="text-xs text-gray-500">Visit Time</p>
              <p className="text-sm font-semibold text-gray-900">{formatDateTime(visit.visitTime)}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="p-4 flex items-center gap-3">
            <MapPin className="w-8 h-8 text-red-600" />
            <div>
              <p className="text-xs text-gray-500">Location</p>
              <Badge color={visit.outsideRadius ? 'red' : 'green'} className="mt-1">
                {visit.outsideRadius ? 'Outside Radius' : 'On-site'}
              </Badge>
            </div>
          </div>
        </Card>
      </div>

      {/* Items */}
      <Card title="Items">
        {items.length === 0 ? (
          <EmptyState icon={Package} title="No items in this visit" />
        ) : (
          <div className="divide-y divide-gray-50">
            {items.map((item, i) => (
              <div key={i} className="px-6 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{item.productName || item.name || '—'}</p>
                  <p className="text-xs text-gray-500">
                    {item.quantity} × {formatMoney(item.unitPrice || item.price || 0)}
                  </p>
                </div>
                <p className="text-sm font-semibold text-gray-900">
                  {formatMoney(item.totalPrice || item.total || 0)}
                </p>
              </div>
            ))}
            <div className="px-6 py-4 flex items-center justify-between bg-gray-50">
              <p className="font-semibold text-gray-900">Grand Total</p>
              <p className="text-lg font-bold text-primary-700">{formatMoney(visit.totalAmount || 0)}</p>
            </div>
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
    </div>
  );
}
