const express = require('express');
const router = express.Router();

console.log('🛣️  Loading user account routes...');

const {
  getAllUsers,
  searchUsersByName,
  searchUsersById,
  createUser,
  changePassword,
  updateUserRole,
  toggleUserLock,
  updateUser
} = require('../controllers/userController');

const logRequest = (req, res, next) => {
  console.log(`🌐 ${req.method} ${req.originalUrl} - ${new Date().toLocaleTimeString()}`);
  if (req.body && Object.keys(req.body).length > 0) {
    // Don't log sensitive information like passwords
    const safeBody = { ...req.body };
    if (safeBody.password) safeBody.password = '***';
    if (safeBody.old_password) safeBody.old_password = '***';
    if (safeBody.new_password) safeBody.new_password = '***';
    console.log('📦 Request body:', safeBody);
  }
  next();
};

// Apply logging middleware to all routes
router.use(logRequest);

// Test route - place at the beginning
router.get('/test/ping', (req, res) => {
  res.json({
    success: true,
    message: 'User account routes are working properly',
    timestamp: new Date().toISOString()
  });
});

// Create new user route - place before search routes
router.post('/', createUser);

// Search routes - place before specific paths
router.get('/search', searchUsersByName);

// Change password route
router.put('/change-password', changePassword);

// Update user role route
router.put('/:user_id/role', updateUserRole);

// Toggle user lock status route
router.put('/:user_id/toggle-lock', toggleUserLock);

// Update user data route - supports frontend edit functionality
router.put('/:user_id', updateUser);

// Get specific user by ID - place before generic routes
router.get('/:user_id', searchUsersById);

// Get all users - place at the end
router.get('/', getAllUsers);

module.exports = router;