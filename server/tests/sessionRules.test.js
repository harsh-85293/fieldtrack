import mongoose from 'mongoose';
import { isGpsPointValid, calculateRouteDistanceKm, toMinorUnits, fromMinorUnits } from '../utils/geo.js';
import { SESSION_STATUS, SYNC_STATUS, ROLES, STORE_VISIT_RADIUS_METERS, LOCATION_MAX_ACCURACY_METERS, LOCATION_MAX_SPEED_KMH } from '../config/constants.js';

describe('session business rules', () => {
  describe('session status constants', () => {
    test('has ACTIVE and COMPLETED states', () => {
      expect(SESSION_STATUS.ACTIVE).toBe('active');
      expect(SESSION_STATUS.COMPLETED).toBe('completed');
    });

    test('only two valid states', () => {
      const values = Object.values(SESSION_STATUS);
      expect(values).toHaveLength(2);
    });
  });

  describe('sync status constants', () => {
    test('has PENDING, SYNCED, REJECTED states', () => {
      expect(SYNC_STATUS.PENDING).toBe('pending');
      expect(SYNC_STATUS.SYNCED).toBe('synced');
      expect(SYNC_STATUS.REJECTED).toBe('rejected');
    });
  });

  describe('role constants', () => {
    test('has ADMIN and EMPLOYEE roles', () => {
      expect(ROLES.ADMIN).toBe('admin');
      expect(ROLES.EMPLOYEE).toBe('employee');
    });
  });

  describe('business rule defaults', () => {
    test('store visit radius is a reasonable value', () => {
      expect(STORE_VISIT_RADIUS_METERS).toBeGreaterThan(0);
      expect(STORE_VISIT_RADIUS_METERS).toBeLessThanOrEqual(1000);
    });

    test('max accuracy is a reasonable value', () => {
      expect(LOCATION_MAX_ACCURACY_METERS).toBeGreaterThan(0);
      expect(LOCATION_MAX_ACCURACY_METERS).toBeLessThanOrEqual(500);
    });

    test('max speed is a reasonable value', () => {
      expect(LOCATION_MAX_SPEED_KMH).toBeGreaterThan(0);
      expect(LOCATION_MAX_SPEED_KMH).toBeLessThanOrEqual(300);
    });
  });

  describe('GPS validation in session context', () => {
    test('first point of a session with good accuracy is valid', () => {
      const result = isGpsPointValid({
        latitude: 19.076,
        longitude: 72.8777,
        accuracy: 15,
        speed: 0,
      });
      expect(result.valid).toBe(true);
    });

    test('point with accuracy exceeding threshold is rejected (not stored as synced)', () => {
      const result = isGpsPointValid({
        latitude: 19.076,
        longitude: 72.8777,
        accuracy: LOCATION_MAX_ACCURACY_METERS + 50,
        speed: 10,
      });
      expect(result.valid).toBe(false);
    });

    test('teleportation (impossible speed) is detected', () => {
      const prev = {
        latitude: 19.076,
        longitude: 72.8777,
        clientTimestamp: 1000000,
      };
      const result = isGpsPointValid(
        {
          latitude: 28.6139, // Delhi, ~1000km away
          longitude: 77.209,
          accuracy: 10,
          speed: 0,
          clientTimestamp: 1000060, // 1 minute later
        },
        prev,
      );
      expect(result.valid).toBe(false);
      expect(result.reason).toMatch(/speed/i);
    });
  });

  describe('visit totals calculation', () => {
    test('total value = sum of (unitPrice * quantity) for all items', () => {
      const items = [
        { quantity: 2, unitPrice: 50 }, // 100 rupees
        { quantity: 3, unitPrice: 30 }, // 90 rupees
        { quantity: 1, unitPrice: 100 }, // 100 rupees
      ];

      let totalValueMinor = 0;
      let totalQuantity = 0;

      for (const item of items) {
        const priceMinor = toMinorUnits(item.unitPrice);
        totalValueMinor += priceMinor * item.quantity;
        totalQuantity += item.quantity;
      }

      expect(totalQuantity).toBe(6);
      expect(fromMinorUnits(totalValueMinor)).toBe(290); // 100 + 90 + 100
    });

    test('empty items list gives zero totals', () => {
      const items = [];
      let totalValueMinor = 0;
      let totalQuantity = 0;

      for (const item of items) {
        const priceMinor = toMinorUnits(item.unitPrice);
        totalValueMinor += priceMinor * item.quantity;
        totalQuantity += item.quantity;
      }

      expect(totalQuantity).toBe(0);
      expect(fromMinorUnits(totalValueMinor)).toBe(0);
    });

    test('collected amount can differ from total value', () => {
      const items = [
        { quantity: 5, unitPrice: 100, collectedAmount: 300 }, // total 500, collected 300
      ];

      let totalValueMinor = 0;
      let totalCollectedMinor = 0;

      for (const item of items) {
        const priceMinor = toMinorUnits(item.unitPrice);
        totalValueMinor += priceMinor * item.quantity;
        totalCollectedMinor += toMinorUnits(item.collectedAmount);
      }

      expect(fromMinorUnits(totalValueMinor)).toBe(500);
      expect(fromMinorUnits(totalCollectedMinor)).toBe(300);
    });
  });

  describe('route distance for session', () => {
    test('session with a circular route returns positive distance', () => {
      const points = [
        { latitude: 19.076, longitude: 72.8777 },
        { latitude: 19.08, longitude: 72.88 },
        { latitude: 19.085, longitude: 72.885 },
        { latitude: 19.076, longitude: 72.8777 }, // back to start
      ];
      const dist = calculateRouteDistanceKm(points);
      expect(dist).toBeGreaterThan(0);
      expect(dist).toBeLessThan(10);
    });

    test('session with no movement returns 0 distance', () => {
      const points = [
        { latitude: 19.076, longitude: 72.8777 },
        { latitude: 19.076, longitude: 72.8777 },
        { latitude: 19.076, longitude: 72.8777 },
      ];
      const dist = calculateRouteDistanceKm(points);
      expect(dist).toBe(0);
    });
  });
});
