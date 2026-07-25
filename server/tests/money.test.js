import { toMinorUnits, fromMinorUnits, formatMoney } from '../utils/geo.js';

describe('money utilities', () => {
  describe('toMinorUnits', () => {
    test('converts rupees to paise', () => {
      expect(toMinorUnits(100)).toBe(10000);
    });

    test('handles decimals correctly', () => {
      expect(toMinorUnits(99.99)).toBe(9999);
    });

    test('handles zero', () => {
      expect(toMinorUnits(0)).toBe(0);
    });

    test('handles null/undefined', () => {
      expect(toMinorUnits(null)).toBe(0);
      expect(toMinorUnits(undefined)).toBe(0);
    });

    test('rounds correctly', () => {
      expect(toMinorUnits(12.345)).toBe(1235);
      expect(toMinorUnits(12.344)).toBe(1234);
    });
  });

  describe('fromMinorUnits', () => {
    test('converts paise to rupees', () => {
      expect(fromMinorUnits(10000)).toBe(100);
    });

    test('handles decimals correctly', () => {
      expect(fromMinorUnits(9999)).toBe(99.99);
    });

    test('handles zero', () => {
      expect(fromMinorUnits(0)).toBe(0);
    });

    test('handles null/undefined', () => {
      expect(fromMinorUnits(null)).toBe(0);
      expect(fromMinorUnits(undefined)).toBe(0);
    });
  });

  describe('formatMoney', () => {
    test('formats minor units as currency string', () => {
      const formatted = formatMoney(10000);
      expect(formatted).toMatch(/100/);
      expect(formatted).toMatch(/[₹]/);
    });

    test('formats with default currency', () => {
      const formatted = formatMoney(12345);
      expect(formatted).toMatch(/123/);
    });

    test('handles zero', () => {
      const formatted = formatMoney(0);
      expect(formatted).toMatch(/0/);
    });

    test('formats large amounts with thousands separator', () => {
      const formatted = formatMoney(10000000); // ₹1,00,000.00 in Indian notation
      expect(formatted).toMatch(/[₹]/);
      expect(formatted).toMatch(/00,000/);
    });
  });

  describe('round-trip conversion', () => {
    test('toMinorUnits and fromMinorUnits are inverses', () => {
      const original = 42.5;
      const minor = toMinorUnits(original);
      const back = fromMinorUnits(minor);
      expect(back).toBe(original);
    });
  });
});
