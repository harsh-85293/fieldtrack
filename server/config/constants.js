// Business timezone (e.g. Asia/Kolkata)
export const BUSINESS_TZ = process.env.BUSINESS_TIMEZONE || 'Asia/Kolkata';

// Default currency code for money formatting
export const DEFAULT_CURRENCY = process.env.DEFAULT_CURRENCY || 'INR';

// Radius (meters) within which a store visit is considered "inside"
export const STORE_VISIT_RADIUS_METERS = parseInt(
  process.env.STORE_VISIT_RADIUS_METERS || '250',
  10,
);

// Maximum acceptable GPS accuracy in meters; points with worse accuracy are rejected
export const LOCATION_MAX_ACCURACY_METERS = parseInt(
  process.env.LOCATION_MAX_ACCURACY_METERS || '100',
  10,
);

// Maximum plausible speed in km/h; points exceeding this are rejected
export const LOCATION_MAX_SPEED_KMH = parseInt(
  process.env.LOCATION_MAX_SPEED_KMH || '160',
  10,
);

// User roles
export const ROLES = {
  ADMIN: 'admin',
  EMPLOYEE: 'employee',
};

// Work session lifecycle states
export const SESSION_STATUS = {
  ACTIVE: 'active',
  COMPLETED: 'completed',
};

// Sync status for location points and store visits
export const SYNC_STATUS = {
  PENDING: 'pending',
  SYNCED: 'synced',
  REJECTED: 'rejected',
};
