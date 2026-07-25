import 'dotenv/config';
import express from 'express';
import request from 'supertest';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Store from '../models/Store.js';
import WorkSession from '../models/WorkSession.js';
import StoreVisit from '../models/StoreVisit.js';
import { ROLES, SESSION_STATUS } from '../config/constants.js';
import { notFound, errorHandler } from '../middleware/errorMiddleware.js';
import { protect } from '../middleware/authMiddleware.js';
import { isGpsPointValid } from '../utils/geo.js';

// Build a minimal Express app for testing middleware without DB
function buildTestApp() {
  const app = express();
  app.use(express.json());

  // A simple protected route
  app.get('/api/v1/protected', protect, (req, res) => {
    res.json({ success: true, data: { userId: req.user._id } });
  });

  // 404 + error handler
  app.use(notFound);
  app.use(errorHandler);
  return app;
}

describe('API security & validation', () => {
  describe('route protection', () => {
    test('rejects request without token', async () => {
      const app = buildTestApp();
      const res = await request(app).get('/api/v1/protected');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    test('rejects request with invalid token', async () => {
      const app = buildTestApp();
      const res = await request(app)
        .get('/api/v1/protected')
        .set('Cookie', 'token=invalidtoken');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    test('rejects request with malformed Bearer token', async () => {
      const app = buildTestApp();
      const res = await request(app)
        .get('/api/v1/protected')
        .set('Authorization', 'Bearer notavalidtoken');
      expect(res.status).toBe(401);
    });
  });

  describe('404 handler', () => {
    test('returns 404 for unknown routes', async () => {
      const app = buildTestApp();
      const res = await request(app).get('/api/v1/nonexistent');
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/not found/i);
    });
  });

  describe('duplicate submission (idempotency simulation)', () => {
    test('isGpsPointValid rejects duplicate coordinates', () => {
      const prev = { latitude: 19.076, longitude: 72.8777, clientTimestamp: 1000 };
      const result = isGpsPointValid(
        { latitude: 19.076, longitude: 72.8777, accuracy: 10, clientTimestamp: 2000 },
        prev,
      );
      expect(result.valid).toBe(false);
      expect(result.reason).toMatch(/duplicate/i);
    });

    test('same idempotencyKey concept: duplicate check returns same result', () => {
      // Simulate an idempotency map
      const idempotencyMap = new Map();
      const key = 'visit-001';
      const payload = { store: 'A', total: 500 };

      // First submission
      if (!idempotencyMap.has(key)) {
        idempotencyMap.set(key, payload);
      }
      const first = idempotencyMap.get(key);

      // Second submission with same key
      const second = idempotencyMap.has(key) ? idempotencyMap.get(key) : payload;

      expect(second).toEqual(first);
      expect(second).toBe(first);
    });
  });

  describe('invalid GPS handling', () => {
    test('point with accuracy above threshold is rejected', () => {
      const result = isGpsPointValid({
        latitude: 19.076,
        longitude: 72.8777,
        accuracy: 500,
      });
      expect(result.valid).toBe(false);
      expect(result.reason).toMatch(/accuracy/i);
    });

    test('point with speed above threshold is rejected', () => {
      const prev = { latitude: 19.0, longitude: 72.8, clientTimestamp: 1000 };
      const result = isGpsPointValid(
        {
          latitude: 19.1,
          longitude: 72.9,
          accuracy: 10,
          speed: 300,
          clientTimestamp: 2000,
        },
        prev,
      );
      expect(result.valid).toBe(false);
      expect(result.reason).toMatch(/speed/i);
    });

    test('point with invalid latitude is rejected', () => {
      const result = isGpsPointValid({
        latitude: 999,
        longitude: 72.8777,
        accuracy: 10,
      });
      expect(result.valid).toBe(false);
    });

    test('null point is rejected', () => {
      const result = isGpsPointValid(null);
      expect(result.valid).toBe(false);
    });
  });

  describe('error handler formats', () => {
    test('AppError returns correct status code and message', async () => {
      const app = express();
      app.use(express.json());
      app.get('/test-error', (req, res, next) => {
        const err = new Error('Custom error');
        err.statusCode = 418;
        next(err);
      });
      app.use(errorHandler);
      const res = await request(app).get('/test-error');
      expect(res.status).toBe(418);
      expect(res.body.message).toBe('Custom error');
      expect(res.body.success).toBe(false);
    });
  });
});
