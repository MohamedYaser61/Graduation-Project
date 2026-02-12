/**
 * Response utility module.
 * Enforces a consistent API response shape for success and error responses.
 * Frontend-friendly and predictable; avoids ad-hoc res.json() in controllers.
 */

import e from 'express';

/**
 * Sends a success JSON response with a consistent shape.
 *
 * @param {import('express').Response} res - Express response object.
 * @param {number} statusCode - HTTP status (e.g. 200, 201).
 * @param {string} message - Human-readable message.
 * @param {object|array|null} [data] - Optional payload (omitted when undefined).
 * @returns {import('express').Response} The same res for optional chaining.
 */
export function successResponse(res, statusCode, message, data = undefined) {
  const body = { success: true, message };
  if (data !== undefined) {
    body.data = data;
  }
  return res.status(statusCode).json(body);
}

/**
 * Sends an error JSON response with a consistent shape.
 *
 * @param {import('express').Response} res - Express response object.
 * @param {number} statusCode - HTTP status (e.g. 400, 401, 404, 500).
 * @param {string} message - Human-readable error message.
 * @returns {import('express').Response} The same res for optional chaining.
 */
export function errorResponse(res, statusCode, message) {
  return res.status(statusCode).json({
    success: false,
    message,
  });
}


export default {
  success: successResponse,
  error: errorResponse,
};