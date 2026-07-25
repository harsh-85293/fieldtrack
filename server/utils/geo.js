import { LOCATION_MAX_ACCURACY_METERS, LOCATION_MAX_SPEED_KMH, DEFAULT_CURRENCY } from '../config/constants.js';

/**
 * Haversine great-circle distance between two lat/lng points in kilometres.
 *
 * @param {number} lat1
 * @param {number} lng1
 * @param {number} lat2
 * @param {number} lng2
 * @returns {number} distance in km
 */
export function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371; // Earth radius in km
  const toRad = (deg) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Distance in metres between two coordinates.
 *
 * @param {number} lat1
 * @param {number} lng1
 * @param {number} lat2
 * @param {number} lng2
 * @returns {number}
 */
export function distanceMeters(lat1, lng1, lat2, lng2) {
  return haversineKm(lat1, lng1, lat2, lng2) * 1000;
}

/**
 * Validates a GPS point against business rules.
 *
 * @param {{latitude:number, longitude:number, accuracy?:number, speed?:number}} point
 * @param {{latitude?:number, longitude?:number, clientTimestamp?:number}} [prev] previous point
 * @returns {{valid:boolean, reason?:string}}
 */
export function isGpsPointValid(point, prev) {
  if (!point) return { valid: false, reason: 'Missing point' };

  const { latitude, longitude, accuracy, speed } = point;

  // Coords must be finite numbers in valid ranges
  if (
    typeof latitude !== 'number' ||
    typeof longitude !== 'number' ||
    Number.isNaN(latitude) ||
    Number.isNaN(longitude)
  ) {
    return { valid: false, reason: 'Invalid coordinates' };
  }
  if (latitude < -90 || latitude > 90) {
    return { valid: false, reason: 'Latitude out of range' };
  }
  if (longitude < -180 || longitude > 180) {
    return { valid: false, reason: 'Longitude out of range' };
  }

  // Accuracy check
  if (typeof accuracy === 'number' && accuracy > LOCATION_MAX_ACCURACY_METERS) {
    return { valid: false, reason: `Accuracy exceeds ${LOCATION_MAX_ACCURACY_METERS}m` };
  }

  // Duplicate check against previous point
  if (prev) {
    if (
      typeof prev.latitude === 'number' &&
      typeof prev.longitude === 'number' &&
      prev.latitude === latitude &&
      prev.longitude === longitude
    ) {
      return { valid: false, reason: 'Duplicate point' };
    }

    // Speed check: distance / time vs max speed
    if (typeof speed === 'number' && speed > LOCATION_MAX_SPEED_KMH) {
      return { valid: false, reason: `Speed exceeds ${LOCATION_MAX_SPEED_KMH}km/h` };
    }

    // Also derive speed from distance/time if speed not provided
    if (
      (typeof speed !== 'number' || speed === 0) &&
      typeof prev.clientTimestamp === 'number' &&
      typeof point.clientTimestamp === 'number'
    ) {
      const dtSec = (point.clientTimestamp - prev.clientTimestamp) / 1000;
      if (dtSec > 0) {
        const distKm = haversineKm(prev.latitude, prev.longitude, latitude, longitude);
        const derivedSpeed = distKm / (dtSec / 3600);
        if (derivedSpeed > LOCATION_MAX_SPEED_KMH) {
          return { valid: false, reason: `Derived speed exceeds ${LOCATION_MAX_SPEED_KMH}km/h` };
        }
      }
    }
  }

  return { valid: true };
}

/**
 * Total route distance in km from an array of {latitude, longitude} points.
 *
 * @param {Array<{latitude:number, longitude:number}>} points
 * @returns {number}
 */
export function calculateRouteDistanceKm(points) {
  if (!Array.isArray(points) || points.length < 2) return 0;
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += haversineKm(
      points[i - 1].latitude,
      points[i - 1].longitude,
      points[i].latitude,
      points[i].longitude,
    );
  }
  return total;
}

/**
 * Convert a rupee amount to minor units (paise).
 * @param {number} rupees
 * @returns {number}
 */
export function toMinorUnits(rupees) {
  if (rupees == null) return 0;
  return Math.round(Number(rupees) * 100);
}

/**
 * Convert minor units (paise) back to rupees.
 * @param {number} paise
 * @returns {number}
 */
export function fromMinorUnits(paise) {
  if (paise == null) return 0;
  return Number(paise) / 100;
}

/**
 * Format minor units into a currency string (e.g. "₹1,234.50").
 * @param {number} minor
 * @param {string} [currency]
 * @returns {string}
 */
export function formatMoney(minor, currency = DEFAULT_CURRENCY) {
  const value = fromMinorUnits(minor);
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(value);
  } catch {
    return `₹${value.toFixed(2)}`;
  }
}

/**
 * Pagination helper: returns { page, limit, skip } from query string.
 * @param {object} query
 * @returns {{page:number, limit:number, skip:number}}
 */
export function getPagination(query = {}) {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 20, 1), 100);
  const skip = (page - 1) * limit;
  return { page, limit, skip };
}

/**
 * Build a paginated response object.
 * @param {Array} data
 * @param {number} total
 * @param {number} page
 * @param {number} limit
 * @returns {{results:Array, total:number, page:number, limit:number, pages:number}}
 */
export function paginateResult(data, total, page, limit) {
  return {
    results: data,
    total,
    page,
    limit,
    pages: Math.ceil(total / limit) || 1,
  };
}

/**
 * Generate a random alphanumeric password of given length.
 * @param {number} [length=12]
 * @returns {string}
 */
export function generateRandomPassword(length = 12) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let out = '';
  for (let i = 0; i < length; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

/**
 * Start of the given day (00:00:00.000 UTC) as a Date.
 * Accepts a Date or ISO string.
 * @param {Date|string} date
 * @returns {Date}
 */
export function startOfDayUTC(date = new Date()) {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

/**
 * End of the given day (23:59:59.999 UTC) as a Date.
 * @param {Date|string} date
 * @returns {Date}
 */
export function endOfDayUTC(date = new Date()) {
  const d = new Date(date);
  d.setUTCHours(23, 59, 59, 999);
  return d;
}
