import { validationResult } from 'express-validator';

/**
 * Express-validator result handler.
 * If validation errors exist, responds with 422 and the array of errors.
 * Otherwise calls next().
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map((e) => ({
        field: e.path || e.param || e.location,
        message: e.msg,
      })),
    });
  }
  next();
}

/**
 * Custom application error with a status code.
 */
export class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Wraps an async route handler so that rejected promises are forwarded to Express error middleware.
 *
 * @param {Function} fn
 * @returns {Function}
 */
export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Builds a standard success response object.
 *
 * @param {*} data
 * @param {string} [message]
 * @returns {{success: boolean, message?: string, data: *}}
 */
export function successResponse(data, message) {
  const resp = { success: true, data };
  if (message) resp.message = message;
  return resp;
}
