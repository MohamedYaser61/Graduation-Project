import response from '../utils/response.js';
import { TokenExpiredError, JsonWebTokenError } from '../utils/jwt.js';

export default function errorMiddleware(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  console.error(err);

  if (err instanceof TokenExpiredError) {
    return response.error(res, 401, 'Token has expired');
  }

  if (err instanceof JsonWebTokenError) {
    return response.error(res, 401, 'Invalid token');
  }

  if (err?.name === 'ValidationError') {
    const details = Object.values(err.errors || {}).map((item) => item.message);
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      details,
    });
  }

  if (err?.name === 'CastError') {
    return response.error(res, 400, `Invalid ${err.path}`);
  }

  if (err?.code === 11000) {
    return response.error(res, 409, 'Duplicate value');
  }

  const statusCode = err?.statusCode || err?.status || 500;
  const message = statusCode >= 500 ? 'Internal server error' : (err?.message || 'Request failed');
  return response.error(res, statusCode, message);
}
