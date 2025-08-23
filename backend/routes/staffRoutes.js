// routes/staffRoutes.js - Updated version (removed work-summary)
const express = require('express');
const router = express.Router();
const { 
  getAllStaff,
  getStaffById,
  searchStaffByName,
  createStaff,
  updateStaff,
  deleteStaff,
  getStaffProfile
} = require('../controllers/staffController');
const { authMiddleware } = require('../middleware/auth');

console.log('Loading staff routes...');
console.log('authMiddleware loaded:', typeof authMiddleware);

// Request logging middleware
const logRequest = (req, res, next) => {
  console.log(`${req.method} ${req.originalUrl} - ${new Date().toLocaleTimeString()}`);
  console.log('Request params:', req.params);
  console.log('Query params:', req.query);
  next();
};

// Apply logging middleware to all routes
router.use(logRequest);

// ============ Staff Profile Related Routes (requires authentication) ============

// GET /api/staff/profile - Get logged-in staff profile
router.get('/profile', (req, res, next) => {
  console.log('ROUTE HIT: /api/staff/profile');
  console.log('Auth header present:', !!req.header('Authorization'));
  next();
}, authMiddleware, getStaffProfile);

// ============ General Staff Management Routes (public or admin) ============

// GET /api/staff/search?name=search_keyword - Search staff
router.get('/search', async (req, res) => {
  try {
    const { name } = req.query;
    console.log(`Searching staff: ${name}`);
    
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a name to search'
      });
    }
    
    await searchStaffByName(req, res);
    
  } catch (error) {
    console.error('Error searching staff:', error);
    res.status(500).json({
      success: false,
      message: 'Staff search failed',
      error: error.message
    });
  }
});

// GET /api/staff - Get all staff
router.get('/', async (req, res) => {
  try {
    console.log('Getting all staff data...');
    
    await getAllStaff(req, res);
    
  } catch (error) {
    console.error('Error retrieving staff data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve staff data',
      error: error.message
    });
  }
});

// GET /api/staff/:id - Get single staff by ID
router.get('/:id', async (req, res) => {
  try {
    const staffId = req.params.id;
    console.log(`Getting staff ID: ${staffId}`);
    
    // Validate ID format
    if (!/^\d+$/.test(staffId)) {
      console.log(`Invalid staff ID format: ${staffId}`);
      return res.status(400).json({
        success: false,
        message: 'Invalid staff ID format'
      });
    }
    
    await getStaffById(req, res);
    
  } catch (error) {
    console.error('Error retrieving staff data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve staff data',
      error: error.message
    });
  }
});

// POST /api/staff - Create staff
router.post('/', async (req, res) => {
  try {
    const { name } = req.body;
    console.log('Creating staff:', name);
    
    await createStaff(req, res);
    
  } catch (error) {
    console.error('Error creating staff:', error);
    
    if (error.code === '23505') {
      return res.status(400).json({
        success: false,
        message: 'This email or phone number is already in use'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to create staff',
      error: error.message
    });
  }
});

// PUT /api/staff/:id - Update staff data
router.put('/:id', async (req, res) => {
  try {
    const staffId = req.params.id;
    console.log(`Updating staff ID: ${staffId}`);
    
    // Validate ID format
    if (!/^\d+$/.test(staffId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid staff ID format'
      });
    }
    
    await updateStaff(req, res);
    
  } catch (error) {
    console.error('Error updating staff:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update staff data',
      error: error.message
    });
  }
});

// DELETE /api/staff/:id - Delete staff
router.delete('/:id', async (req, res) => {
  try {
    const staffId = req.params.id;
    console.log(`Deleting staff ID: ${staffId}`);
    
    // Validate ID format
    if (!/^\d+$/.test(staffId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid staff ID format'
      });
    }
    
    await deleteStaff(req, res);
    
  } catch (error) {
    console.error('Error deleting staff:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete staff',
      error: error.message
    });
  }
});

module.exports = router;