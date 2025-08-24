// routes/staffRoutes.js - Clean organized version
const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');

// Import controller functions
const {
  getAllStaff,
  getStaffById,
  searchStaffByName,
  createStaff,
  updateStaff,
  deleteStaff,
  getStaffProfile
} = require('../controllers/staffController');

console.log('🛣️ Loading staff routes...');

// Request logging middleware
const logRequest = (req, res, next) => {
  console.log(`🌐 ${req.method} ${req.originalUrl} - ${new Date().toLocaleTimeString()}`);
  if (req.body && Object.keys(req.body).length > 0) {
    // Don't log sensitive information
    const safeBody = { ...req.body };
    if (safeBody.password) safeBody.password = '***';
    console.log('📦 Request body:', safeBody);
  }
  next();
};

// Apply logging to all routes
router.use(logRequest);

// ===== PUBLIC ROUTES =====

// Test route
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Staff routes are working',
    timestamp: new Date().toISOString(),
    endpoints: {
      'GET /api/staff': 'Get all staff',
      'GET /api/staff/search?name=xxx': 'Search staff by name',
      'GET /api/staff/profile': 'Get authenticated staff profile (requires token)',
      'GET /api/staff/:id': 'Get staff by ID',
      'POST /api/staff': 'Create new staff',
      'PUT /api/staff/:id': 'Update staff',
      'DELETE /api/staff/:id': 'Delete staff'
    }
  });
});

// Search staff by name - MUST come before /:id route
router.get('/search', searchStaffByName);

// Get all staff
router.get('/', getAllStaff);

// ===== AUTHENTICATED ROUTES =====

// Get authenticated staff profile (requires valid JWT token)
router.get('/profile', authMiddleware, getStaffProfile);

// ===== CRUD ROUTES =====

// Get single staff by ID
router.get('/:id', getStaffById);

// Create new staff
router.post('/', createStaff);

// Update staff
router.put('/:id', updateStaff);

// Delete staff
router.delete('/:id', deleteStaff);

// ===== ERROR HANDLING =====

// Handle 404 for staff routes
router.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Staff route not found',
    path: req.originalUrl,
    availableRoutes: [
      'GET /api/staff',
      'GET /api/staff/search?name=xxx',
      'GET /api/staff/profile (requires auth)',
      'GET /api/staff/:id',
      'POST /api/staff',
      'PUT /api/staff/:id',
      'DELETE /api/staff/:id'
    ]
  });
});

module.exports = router;