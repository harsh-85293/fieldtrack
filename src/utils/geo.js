const addressCache = new Map();

export function toLatLng(point) {
  if (!point) return null;
  const lat = Number(point.latitude ?? point.lat);
  const lng = Number(point.longitude ?? point.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return [lat, lng];
}

export function formatCoords(point, digits = 6) {
  const ll = toLatLng(point);
  if (!ll) return null;
  return `${ll[0].toFixed(digits)}, ${ll[1].toFixed(digits)}`;
}

export function mapsUrl(point) {
  const ll = toLatLng(point);
  if (!ll) return null;
  return `https://www.google.com/maps?q=${ll[0]},${ll[1]}`;
}

export function formatAccuracy(meters) {
  if (meters == null || !Number.isFinite(Number(meters))) return null;
  const m = Number(meters);
  if (m < 1) return '<1 m accuracy';
  return `±${Math.round(m)} m accuracy`;
}

/**
 * Reverse-geocode via OpenStreetMap Nominatim (client-side, cached).
 * Best-effort — returns null on failure / rate limit.
 */
export async function reverseGeocode(point) {
  const ll = toLatLng(point);
  if (!ll) return null;

  const key = `${ll[0].toFixed(5)},${ll[1].toFixed(5)}`;
  if (addressCache.has(key)) return addressCache.get(key);

  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${ll[0]}&lon=${ll[1]}&zoom=18&addressdetails=1`;
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) {
      addressCache.set(key, null);
      return null;
    }
    const data = await res.json();
    const address = data?.display_name || null;
    addressCache.set(key, address);
    return address;
  } catch {
    addressCache.set(key, null);
    return null;
  }
}
