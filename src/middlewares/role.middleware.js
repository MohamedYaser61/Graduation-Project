import response from '../utils/response.js';

export default function requireRole(allowedRole) {
  return (req, res, next) => {
    if (!req.user) {
      return response.error(res, 401, 'Unauthorized');
    }

    if (req.user.role !== allowedRole) {
      return response.error(res, 403, 'Forbidden');
    }

    return next();
  };
}
