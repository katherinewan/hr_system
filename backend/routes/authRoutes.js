// routes/authRoutes.js - Simplified login
const express = require('express');
const router = express.Router();
const { generateToken, verifyToken } = require('../middleware/auth');
const User = require('../models/User');

console.log('Loading simplified auth routes...');

// POST /api/auth/login - Simple login
router.post('/login', async (req, res) => {
  try {
    const { staff_id, password } = req.body;
    console.log('LOGIN: Attempt for staff ID:', staff_id);

    // Basic validation
    if (!staff_id || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please enter staff ID and password'
      });
    }

    // Find user by staff ID
    const user = await User.findByStaffId(staff_id);
    if (!user) {
      console.log('LOGIN: User not found for staff ID:', staff_id);
      return res.status(401).json({
        success: false,
        message: 'Invalid staff ID or password'
      });
    }

    console.log('LOGIN: User found:', user.name);

    // Check if account is locked
    if (user.account_locked) {
      console.log('LOGIN: Account locked for staff ID:', staff_id);
      return res.status(423).json({
        success: false,
        message: 'Account is locked, please contact HR'
      });
    }

    // Validate password
    const isValidPassword = await User.validatePassword(password, user.password);
    if (!isValidPassword) {
      console.log('LOGIN: Invalid password for staff ID:', staff_id);
      
      // Increment failed attempts
      await User.incrementFailedAttempts(staff_id);
      
      return res.status(401).json({
        success: false,
        message: 'Invalid staff ID or password'
      });
    }

    // Reset failed attempts and update last login
    await User.resetFailedAttempts(staff_id);
    await User.updateLastLogin(staff_id);

    // Generate simplified token
    const token = generateToken(user);

    console.log('LOGIN: Success for:', user.name);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          staff_id: user.staff_id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      }
    });

  } catch (error) {
    console.error('LOGIN: Error:', error);
    res.status(500).json({
      success: false,
      message: 'Login system error'
    });
  }
});

// GET /api/auth/verify - Simple token verification
router.get('/verify', async (req, res) => {
  try {
    const authHeader = req.header('Authorization');
    
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token'
      });
    }

    // Verify user still exists
    const user = await User.findById(decoded.user_id);
    if (!user || user.account_locked) {
      return res.status(401).json({
        success: false,
        message: 'User account not valid'
      });
    }

    console.log('VERIFY: Token valid for:', user.name);

    res.json({
      success: true,
      message: 'Token is valid',
      data: {
        user: {
          staffId: user.staff_id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      }
    });

  } catch (error) {
    console.error('VERIFY: Error:', error);
    res.status(401).json({
      success: false,
      message: 'Token verification failed'
    });
  }
});

// POST /api/auth/logout - Simple logout
router.post('/logout', (req, res) => {
  console.log('LOGOUT: User logout');
  res.json({
    success: true,
    message: 'Logout successful'
  });
});

module.exports = router;