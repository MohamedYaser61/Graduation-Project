import response from '../utils/response.js';
import { verifyToken, TokenExpiredError, JsonWebTokenError } from '../utils/jwt.js';

export default function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || typeof authHeader !== 'string') {
    return response.error(res, 401, 'Authorization header is required');
  }

  const [scheme, token] = authHeader.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return response.error(res, 401, 'Authorization header must be: Bearer <token>');
  }

  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    return next();
  } catch (err) {
    if (err instanceof TokenExpiredError) {
      return response.error(res, 401, 'Token has expired');
    }
    if (err instanceof JsonWebTokenError) {
      return response.error(res, 401, 'Invalid token');
    }
    return response.error(res, 401, 'Unauthorized');
  }
}
