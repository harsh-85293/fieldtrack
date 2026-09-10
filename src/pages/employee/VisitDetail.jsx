import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Store, Clock, MapPin, Package } from 'lucide-react';
import { visitService } from '../../api/services.js';
import {
  LoadingSpinner, ErrorState, Badge, Card, EmptyState,
} from '../../components/ui/index.jsx';
import ExactLocation from '../../components/maps/ExactLocation.jsx';
import LocationPinMap from '../../components/maps/LocationPinMap.jsx';
import { formatDateTime, formatRupees } from '../../utils/format.js';
import { toLatLng } from '../../utils/geo.js';

export default function VisitDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [visit, setVisit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!id || id === 'undefined') {
      setError('Invalid visit');
      setLoading(false);
      return;
    }
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
  const storeName = visit.store?.name || visit.storeName || '—';
  const storeAddress = [visit.store?.address, visit.store?.city].filter(Boolean).join(', ');
  const outside = visit.isOutsideRadius ?? visit.outsideRadius;
  const grandTotal = visit.totalValue ?? visit.totalAmount ?? items.reduce(
    (sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.unitPrice ?? item.price) || 0),
    0,
  );
  const loc = visit.location;
  const storeLoc = visit.store?.location;
  const hasMap = toLatLng(loc) || toLatLng(storeLoc);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/app/visits')} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold text-gray-900">Visit Detail</h1>
      </div>

      <div className="grid grid-cols-1 gap-3">
        <Card>
          <div className="p-4 flex items-center gap-3">
            <Store className="w-8 h-8 text-primary-700" />
            <div>
              <p className="text-xs text-gray-500">Store</p>
              <p className="text-sm font-semibold text-gray-900">{storeName}</p>
              {storeAddress && <p className="text-xs text-gray-500 mt-0.5">{storeAddress}</p>}
            </div>
          </div>
        </Card>
        <Card>
          <div className="p-4 flex items-center gap-3">
            <Clock className="w-8 h-8 text-amber-600" />
            <div>
              <p className="text-xs text-gray-500">Visit Time</p>
              <p className="text-sm font-semibold text-gray-900">
                {formatDateTime(visit.visitDate || visit.visitTime)}
              </p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="p-4 flex items-center gap-3">
            <MapPin className="w-8 h-8 text-red-600" />
            <div>
              <p className="text-xs text-gray-500">Radius check</p>
              <Badge color={outside ? 'red' : 'green'} className="mt-1">
                {outside ? 'Outside Radius' : 'On-site'}
              </Badge>
              {visit.distanceFromStoreMeters != null && (
                <p className="text-xs text-gray-500 mt-1">
                  {Math.round(visit.distanceFromStoreMeters)}m from store
                </p>
              )}
            </div>
          </div>
        </Card>
      </div>

      <Card title="Visit Location Map">
        {!hasMap ? (
          <EmptyState
            icon={MapPin}
            title="No location data"
            message="GPS coordinates were not recorded for this visit."
          />
        ) : (
          <div>
            <LocationPinMap
              visitLocation={loc}
              storeLocation={storeLoc}
              storeName={storeName}
              height={300}
            />
            <div className="space-y-4 p-4 border-t border-gray-100 bg-gray-50/80">
              <ExactLocation point={loc} label="Your GPS at visit" compact />
              <ExactLocation point={storeLoc} label="Store location" compact />
            </div>
          </div>
        )}
      </Card>

      <Card title="Items">
        {items.length === 0 ? (
          <EmptyState icon={Package} title="No items in this visit" />
        ) : (
          <div className="divide-y divide-gray-50">
            {items.map((item, i) => {
              const unit = Number(item.unitPrice ?? item.price) || 0;
              const qty = Number(item.quantity) || 0;
              const lineTotal = item.totalPrice ?? item.total ?? (qty * unit);
              return (
                <div key={i} className="px-6 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{item.productName || item.name || '—'}</p>
                    <p className="text-xs text-gray-500">
                      {qty} × {formatRupees(unit)}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-gray-900">{formatRupees(lineTotal)}</p>
                </div>
              );
            })}
            <div className="px-6 py-4 flex items-center justify-between bg-gray-50">
              <p className="font-semibold text-gray-900">Grand Total</p>
              <p className="text-lg font-bold text-primary-700">{formatRupees(grandTotal)}</p>
            </div>
          </div>
        )}
      </Card>

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
