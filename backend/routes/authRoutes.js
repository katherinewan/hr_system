// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { login, getMe } = require('../controllers/authController');

// POST /api/auth/login
router.post('/login', login);

// GET /api/auth/me
router.get('/me', authMiddleware, getMe);

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.json({
    success: true,
    message: 'Logout successful'
  });
});

module.exports = router;