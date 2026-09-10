import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { formatCoords, mapsUrl, toLatLng } from '../../utils/geo.js';

function popupHtml(title, point) {
  const coords = formatCoords(point);
  const link = mapsUrl(point);
  const accuracy = point?.accuracy != null && Number.isFinite(Number(point.accuracy))
    ? `<div style="color:#6b7280;margin-top:2px">±${Math.round(Number(point.accuracy))} m</div>`
    : '';
  return `
    <div style="min-width:160px">
      <strong>${title}</strong>
      ${coords ? `<div style="font-family:ui-monospace,monospace;font-size:12px;margin-top:4px">${coords}</div>` : ''}
      ${accuracy}
      ${link ? `<a href="${link}" target="_blank" rel="noopener noreferrer" style="font-size:12px;color:#1e40af">Open in Maps</a>` : ''}
    </div>
  `;
}

/**
 * Leaflet route map with check-in / check-out markers and exact-coord popups.
 */
export default function RouteMap({
  points = [],
  checkIn,
  checkOut,
  height = 450,
  className = '',
}) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);

  const track = points.map((p) => toLatLng(p)).filter(Boolean);
  const checkInLl = toLatLng(checkIn);
  const checkOutLl = toLatLng(checkOut);

  let mapPoints = track;
  if (mapPoints.length === 0) {
    mapPoints = [];
    if (checkInLl) mapPoints.push(checkInLl);
    if (
      checkOutLl
      && (!checkInLl || checkInLl[0] !== checkOutLl[0] || checkInLl[1] !== checkOutLl[1])
    ) {
      mapPoints.push(checkOutLl);
    }
  }

  useEffect(() => {
    if (!mapRef.current || mapPoints.length === 0) return undefined;

    if (mapInstance.current) {
      mapInstance.current.remove();
      mapInstance.current = null;
    }

    mapInstance.current = L.map(mapRef.current, {
      center: mapPoints[0],
      zoom: 15,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(mapInstance.current);

    if (mapPoints.length > 1) {
      L.polyline(mapPoints, { color: '#1e40af', weight: 3, opacity: 0.8 }).addTo(mapInstance.current);
    }

    const startPoint = checkIn || points[0] || { lat: mapPoints[0][0], lng: mapPoints[0][1] };
    L.marker(mapPoints[0], {
      icon: L.divIcon({ className: 'marker-checkin', iconSize: [28, 28], iconAnchor: [14, 28] }),
    })
      .addTo(mapInstance.current)
      .bindPopup(popupHtml('Check In', startPoint));

    if (mapPoints.length > 1) {
      const endPoint = checkOut
        || points[points.length - 1]
        || { lat: mapPoints[mapPoints.length - 1][0], lng: mapPoints[mapPoints.length - 1][1] };
      L.marker(mapPoints[mapPoints.length - 1], {
        icon: L.divIcon({ className: 'marker-checkout', iconSize: [28, 28], iconAnchor: [14, 28] }),
      })
        .addTo(mapInstance.current)
        .bindPopup(popupHtml('Check Out', endPoint));
    }

    if (mapPoints.length === 1) {
      mapInstance.current.setView(mapPoints[0], 16);
    } else {
      mapInstance.current.fitBounds(L.latLngBounds(mapPoints), { padding: [40, 40] });
    }

    const t = setTimeout(() => mapInstance.current?.invalidateSize(), 50);

    return () => {
      clearTimeout(t);
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, [JSON.stringify(mapPoints), checkInLl?.[0], checkInLl?.[1], checkOutLl?.[0], checkOutLl?.[1]]);

  if (mapPoints.length === 0) return null;

  return (
    <div
      ref={mapRef}
      style={{ height: typeof height === 'number' ? `${height}px` : height, width: '100%' }}
      className={className}
    />
  );
}
