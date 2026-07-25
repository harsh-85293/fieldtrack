import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { fromZonedTime, toZonedTime } from 'date-fns-tz';

export const BUSINESS_TZ = 'Asia/Kolkata';

export function toZoned(date) {
  if (!date) return null;
  const d = typeof date === 'string' ? parseISO(date) : new Date(date);
  return toZonedTime(d, BUSINESS_TZ);
}

export function formatDateTime(date, fmt = 'MMM d, yyyy, h:mm a') {
  if (!date) return '—';
  try {
    const zoned = toZoned(date);
    return format(zoned, fmt);
  } catch {
    return '—';
  }
}

export function formatDate(date, fmt = 'MMM d, yyyy') {
  if (!date) return '—';
  try {
    const zoned = toZoned(date);
    return format(zoned, fmt);
  } catch {
    return '—';
  }
}

export function formatTime(date, fmt = 'h:mm a') {
  if (!date) return '—';
  try {
    const zoned = toZoned(date);
    return format(zoned, fmt);
  } catch {
    return '—';
  }
}

export function formatDuration(seconds) {
  if (!seconds || seconds < 0) return '0m';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function formatDistance(meters) {
  if (meters == null) return '—';
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(2)} km`;
}

export function fromMinor(amount) {
  if (amount == null) return 0;
  return amount / 100;
}

export function toMinor(amount) {
  if (amount == null) return 0;
  return Math.round(amount * 100);
}

export function formatMoney(minorAmount, currency = '₹') {
  const value = fromMinor(minorAmount);
  return `${currency}${value.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function relativeTime(date) {
  if (!date) return '—';
  try {
    const zoned = toZoned(date);
    return formatDistanceToNow(zoned, { addSuffix: true });
  } catch {
    return '—';
  }
}
