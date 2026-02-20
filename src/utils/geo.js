/**
 * Geo utility module - Location-based calculations for donor matching
 */

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param {Object} loc1 - {latitude, longitude}
 * @param {Object} loc2 - {latitude, longitude}
 * @returns {number} - Distance in kilometers
 */
export const calculateDistance = (loc1, loc2) => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRad(loc2.latitude - loc1.latitude);
  const dLon = toRad(loc2.longitude - loc1.longitude);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(loc1.latitude)) * Math.cos(toRad(loc2.latitude)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Convert degrees to radians
 * @param {number} degrees
 * @returns {number} - radians
 */
const toRad = (degrees) => {
  return degrees * (Math.PI / 180);
};

/**
 * Find donors within a certain radius from a location
 * @param {Array} donors - Array of donor documents
 * @param {Object} location - {latitude, longitude}
 * @param {number} radius - Radius in kilometers
 * @returns {Array} - Filtered donors within radius
 */
export const findNearby = (donors, location, radius = 50) => {
  if (!location || !location.latitude || !location.longitude) {
    return donors; // If no location specified, return all donors
  }

  return donors.filter((donor) => {
    if (!donor.location || !donor.location.latitude || !donor.location.longitude) {
      return false;
    }

    const distance = calculateDistance(location, donor.location);
    return distance <= radius;
  });
};

/**
 * Sort donors by proximity to a location
 * @param {Array} donors - Array of donor documents
 * @param {Object} location - {latitude, longitude}
 * @returns {Array} - Sorted donors by distance ascending
 */
export const sortByProximity = (donors, location) => {
  if (!location || !location.latitude || !location.longitude) {
    return donors;
  }

  const donorsWithDistance = donors.map((donor) => {
    let distance = Infinity;

    if (donor.location && donor.location.latitude && donor.location.longitude) {
      distance = calculateDistance(location, donor.location);
    }

    return { ...donor.toObject?.() || donor, distance };
  });

  return donorsWithDistance.sort((a, b) => a.distance - b.distance);
};

/**
 * Calculate compatibility score based on location
 * Closer donors get higher scores
 * @param {number} distance - Distance in kilometers
 * @param {number} maxDistance - Maximum acceptable distance
 * @returns {number} - Score between 0 and 100
 */
export const getLocationScore = (distance, maxDistance = 100) => {
  if (distance > maxDistance) return 0;
  return Math.max(0, 100 - (distance / maxDistance) * 100);
};
