import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { formatCoords, mapsUrl, toLatLng } from '../../utils/geo.js';

function popupHtml(title, point, extra = '') {
  const coords = formatCoords(point);
  const link = mapsUrl(point);
  return `
    <div style="min-width:160px">
      <strong>${title}</strong>
      ${coords ? `<div style="font-family:ui-monospace,monospace;font-size:12px;margin-top:4px">${coords}</div>` : ''}
      ${extra ? `<div style="color:#6b7280;font-size:12px;margin-top:2px">${extra}</div>` : ''}
      ${link ? `<a href="${link}" target="_blank" rel="noopener noreferrer" style="font-size:12px;color:#1e40af">Open in Maps</a>` : ''}
    </div>
  `;
}

/**
 * Small Leaflet map for a visit pin (+ optional store pin).
 */
export default function LocationPinMap({
  visitLocation,
  storeLocation,
  storeName,
  height = 320,
  className = '',
}) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);

  const visitLl = toLatLng(visitLocation);
  const storeLl = toLatLng(storeLocation);

  useEffect(() => {
    if (!mapRef.current || (!visitLl && !storeLl)) return undefined;

    if (mapInstance.current) {
      mapInstance.current.remove();
      mapInstance.current = null;
    }

    const center = visitLl || storeLl;
    mapInstance.current = L.map(mapRef.current, { center, zoom: 16 });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(mapInstance.current);

    const bounds = [];

    if (storeLl) {
      L.marker(storeLl, {
        icon: L.divIcon({ className: 'marker-store', iconSize: [28, 28], iconAnchor: [14, 28] }),
      })
        .addTo(mapInstance.current)
        .bindPopup(popupHtml(storeName || 'Store', storeLocation));
      bounds.push(storeLl);
    }

    if (visitLl) {
      const accuracy = visitLocation?.accuracy != null
        ? `±${Math.round(Number(visitLocation.accuracy))} m`
        : '';
      L.marker(visitLl, {
        icon: L.divIcon({ className: 'marker-visit', iconSize: [28, 28], iconAnchor: [14, 28] }),
      })
        .addTo(mapInstance.current)
        .bindPopup(popupHtml('Visit location', visitLocation, accuracy));
      bounds.push(visitLl);

      if (visitLocation?.accuracy != null && Number(visitLocation.accuracy) > 0) {
        L.circle(visitLl, {
          radius: Number(visitLocation.accuracy),
          color: '#2563eb',
          fillColor: '#2563eb',
          fillOpacity: 0.08,
          weight: 1,
        }).addTo(mapInstance.current);
      }
    }

    if (bounds.length > 1) {
      mapInstance.current.fitBounds(L.latLngBounds(bounds), { padding: [50, 50], maxZoom: 17 });
    } else {
      mapInstance.current.setView(center, 16);
    }

    const t = setTimeout(() => mapInstance.current?.invalidateSize(), 50);

    return () => {
      clearTimeout(t);
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, [
    visitLl?.[0],
    visitLl?.[1],
    storeLl?.[0],
    storeLl?.[1],
    storeName,
  ]);

  if (!visitLl && !storeLl) return null;

  return (
    <div
      ref={mapRef}
      style={{ height: typeof height === 'number' ? `${height}px` : height, width: '100%' }}
      className={className}
    />
  );
}
