import React, { useEffect, useState } from 'react';
import { ExternalLink, MapPin, Copy, Check } from 'lucide-react';
import {
  formatAccuracy,
  formatCoords,
  mapsUrl,
  reverseGeocode,
  toLatLng,
} from '../../utils/geo.js';

/**
 * Exact GPS readout: coordinates, reverse-geocoded address, accuracy, Maps link.
 */
export default function ExactLocation({
  point,
  label = 'Exact location',
  className = '',
  compact = false,
}) {
  const ll = toLatLng(point);
  const coords = formatCoords(point);
  const accuracy = formatAccuracy(point?.accuracy);
  const link = mapsUrl(point);
  const [address, setAddress] = useState(null);
  const [loadingAddress, setLoadingAddress] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!ll) {
      setAddress(null);
      return undefined;
    }
    let cancelled = false;
    setLoadingAddress(true);
    // Round to ~1m so live GPS updates don't spam Nominatim
    const rounded = { lat: Number(ll[0].toFixed(5)), lng: Number(ll[1].toFixed(5)) };
    reverseGeocode(rounded).then((addr) => {
      if (!cancelled) {
        setAddress(addr);
        setLoadingAddress(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [ll ? ll[0].toFixed(5) : null, ll ? ll[1].toFixed(5) : null]);

  if (!ll || !coords) {
    return (
      <div className={className}>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-sm text-gray-400 mt-0.5">Not recorded</p>
      </div>
    );
  }

  const copyCoords = async () => {
    try {
      await navigator.clipboard.writeText(coords);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  };

  return (
    <div className={className}>
      <div className="flex items-start gap-2">
        <MapPin className={`${compact ? 'w-4 h-4' : 'w-5 h-5'} text-primary-700 mt-0.5 shrink-0`} />
        <div className="min-w-0 flex-1">
          <p className="text-xs text-gray-500">{label}</p>
          <p className={`font-mono font-medium text-gray-900 ${compact ? 'text-xs' : 'text-sm'} mt-0.5 break-all`}>
            {coords}
          </p>
          {accuracy && (
            <p className="text-xs text-gray-500 mt-0.5">{accuracy}</p>
          )}
          {loadingAddress && (
            <p className="text-xs text-gray-400 mt-1">Looking up address…</p>
          )}
          {!loadingAddress && address && (
            <p className={`text-gray-600 mt-1 leading-snug ${compact ? 'text-xs' : 'text-sm'}`}>
              {address}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-3 mt-2">
            <button
              type="button"
              onClick={copyCoords}
              className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied' : 'Copy'}
            </button>
            {link && (
              <a
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-primary-700 hover:text-primary-900 font-medium"
              >
                Open in Maps
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
