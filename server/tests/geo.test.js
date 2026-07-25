import {
  haversineKm,
  distanceMeters,
  isGpsPointValid,
  calculateRouteDistanceKm,
} from '../utils/geo.js';

describe('geo utilities', () => {
  describe('haversineKm', () => {
    test('returns 0 for identical coordinates', () => {
      expect(haversineKm(19.076, 72.8777, 19.076, 72.8777)).toBe(0);
    });

    test('calculates distance between Mumbai and Pune (~120km)', () => {
      const mumbai = { lat: 19.076, lng: 72.8777 };
      const pune = { lat: 18.5204, lng: 73.8567 };
      const dist = haversineKm(mumbai.lat, mumbai.lng, pune.lat, pune.lng);
      expect(dist).toBeGreaterThan(100);
      expect(dist).toBeLessThan(150);
    });

    test('is symmetric', () => {
      const d1 = haversineKm(19.076, 72.8777, 18.5204, 73.8567);
      const d2 = haversineKm(18.5204, 73.8567, 19.076, 72.8777);
      expect(d1).toBeCloseTo(d2, 5);
    });
  });

  describe('distanceMeters', () => {
    test('converts km to meters', () => {
      const meters = distanceMeters(19.076, 72.8777, 19.077, 72.878);
      expect(meters).toBeGreaterThan(50);
      expect(meters).toBeLessThan(500);
    });
  });

  describe('isGpsPointValid', () => {
    test('rejects poor accuracy', () => {
      const result = isGpsPointValid({
        latitude: 19.076,
        longitude: 72.8777,
        accuracy: 200, // exceeds default max of 100
      });
      expect(result.valid).toBe(false);
      expect(result.reason).toMatch(/accuracy/i);
    });

    test('rejects unrealistic speed', () => {
      const prev = {
        latitude: 19.076,
        longitude: 72.8777,
        clientTimestamp: 1000000,
      };
      const result = isGpsPointValid(
        {
          latitude: 19.5,
          longitude: 73.0,
          accuracy: 10,
          speed: 200, // exceeds default max of 160
          clientTimestamp: 1000001,
        },
        prev,
      );
      expect(result.valid).toBe(false);
      expect(result.reason).toMatch(/speed/i);
    });

    test('rejects duplicate points', () => {
      const prev = {
        latitude: 19.076,
        longitude: 72.8777,
        clientTimestamp: 1000000,
      };
      const result = isGpsPointValid(
        {
          latitude: 19.076,
          longitude: 72.8777,
          accuracy: 10,
          speed: 0,
          clientTimestamp: 1000001,
        },
        prev,
      );
      expect(result.valid).toBe(false);
      expect(result.reason).toMatch(/duplicate/i);
    });

    test('rejects invalid coordinates (out of range latitude)', () => {
      const result = isGpsPointValid({
        latitude: 95,
        longitude: 72.8777,
        accuracy: 10,
      });
      expect(result.valid).toBe(false);
      expect(result.reason).toMatch(/latitude/i);
    });

    test('rejects invalid coordinates (out of range longitude)', () => {
      const result = isGpsPointValid({
        latitude: 19.076,
        longitude: 200,
        accuracy: 10,
      });
      expect(result.valid).toBe(false);
      expect(result.reason).toMatch(/longitude/i);
    });

    test('rejects NaN coordinates', () => {
      const result = isGpsPointValid({
        latitude: NaN,
        longitude: 72.8777,
        accuracy: 10,
      });
      expect(result.valid).toBe(false);
      expect(result.reason).toMatch(/invalid/i);
    });

    test('accepts a valid point', () => {
      const result = isGpsPointValid({
        latitude: 19.076,
        longitude: 72.8777,
        accuracy: 15,
        speed: 30,
      });
      expect(result.valid).toBe(true);
    });

    test('accepts a valid point with a valid previous point', () => {
      const prev = {
        latitude: 19.076,
        longitude: 72.8777,
        clientTimestamp: 1000000,
      };
      const result = isGpsPointValid(
        {
          latitude: 19.077,
          longitude: 72.878,
          accuracy: 15,
          speed: 20,
          clientTimestamp: 1000060,
        },
        prev,
      );
      expect(result.valid).toBe(true);
    });
  });

  describe('calculateRouteDistanceKm', () => {
    test('returns 0 for empty array', () => {
      expect(calculateRouteDistanceKm([])).toBe(0);
    });

    test('returns 0 for single point', () => {
      expect(calculateRouteDistanceKm([{ latitude: 19.076, longitude: 72.8777 }])).toBe(0);
    });

    test('calculates total distance for multiple points', () => {
      const points = [
        { latitude: 19.076, longitude: 72.8777 },
        { latitude: 19.08, longitude: 72.88 },
        { latitude: 19.09, longitude: 72.89 },
      ];
      const dist = calculateRouteDistanceKm(points);
      expect(dist).toBeGreaterThan(0);
      expect(dist).toBeLessThan(5);
    });
  });
});
