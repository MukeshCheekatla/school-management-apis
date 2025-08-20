const express = require('express');
const { body, query, validationResult } = require('express-validator');
const pool = require('../db');

const router = express.Router();

// Helper: degrees to radians
function toRad(value) {
  return (value * Math.PI) / 180;
}

// Haversine formula (returns distance in kilometers)
function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * POST /addSchool
 * Body: { name, address, latitude, longitude }
 */
router.post(
  '/addSchool',
  body('name').trim().isLength({ min: 1 }).withMessage('Name is required'),
  body('address').trim().isLength({ min: 1 }).withMessage('Address is required'),
  body('latitude').notEmpty().withMessage('Latitude is required')
    .isFloat({ min: -90, max: 90 }).withMessage('Latitude must be a number between -90 and 90')
    .toFloat(),
  body('longitude').notEmpty().withMessage('Longitude is required')
    .isFloat({ min: -180, max: 180 }).withMessage('Longitude must be a number between -180 and 180')
    .toFloat(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
    }

    const { name, address, latitude, longitude } = req.body;

    try {
      const [result] = await pool.execute(
        'INSERT INTO schools (name, address, latitude, longitude) VALUES (?, ?, ?, ?)',
        [name, address, latitude, longitude]
      );

      return res.status(201).json({
        success: true,
        message: 'School added successfully',
        data: {
          id: result.insertId,
          name,
          address,
          latitude,
          longitude
        }
      });
    } catch (err) {
      console.error('DB ERROR (addSchool):', err);
      return res.status(500).json({ success: false, error: 'Database error' });
    }
  }
);

/**
 * GET /listSchools?lat=<>&lng=<>
 * Returns all schools sorted by distance from (lat,lng)
 */
router.get(
  '/listSchools',
  query('lat').notEmpty().withMessage('lat is required').isFloat({ min: -90, max: 90 }).withMessage('lat must be a number between -90 and 90').toFloat(),
  query('lng').notEmpty().withMessage('lng is required').isFloat({ min: -180, max: 180 }).withMessage('lng must be a number between -180 and 180').toFloat(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
    }

    const userLat = Number(req.query.lat);
    const userLng = Number(req.query.lng);

    try {
      const [rows] = await pool.query('SELECT id, name, address, latitude, longitude FROM schools');

      // Compute distance for each row
      const withDistance = rows.map((s) => {
        const lat = Number(s.latitude);
        const lng = Number(s.longitude);
        const distance_km = Number(haversine(userLat, userLng, lat, lng).toFixed(3));
        return {
          id: s.id,
          name: s.name,
          address: s.address,
          latitude: lat,
          longitude: lng,
          distance_km
        };
      });

      // Sort ascending by distance
      withDistance.sort((a, b) => a.distance_km - b.distance_km);

      return res.json({
        success: true,
        user_location: { lat: userLat, lng: userLng },
        total: withDistance.length,
        schools: withDistance
      });
    } catch (err) {
      console.error('DB ERROR (listSchools):', err);
      return res.status(500).json({ success: false, error: 'Database error' });
    }
  }
);

module.exports = router;
