// routes/auth.js - Authentication routes using your existing User model (configured for staff_id login)
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { pool } = require('../config/database');

console.log('🔐 Loading authentication routes...');

// POST /api/auth/login - Staff login (using staff_id)
router.post('/login', async (req, res) => {
  try {
    const { staff_id, password } = req.body;
    console.log(`🔐 Login attempt: Staff ID ${staff_id}`);

    // Validate input
    if (!staff_id || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please enter staff ID and password'
      });
    }

    // Use User model to find user
    const user = await User.findByStaffId(staff_id);
    if (!user) {
      console.log(`❌ User account not found: Staff ID ${staff_id}`);
      return res.status(401).json({
        success: false,
        message: 'Incorrect staff ID or password'
      });
    }

    // Check if account is locked
    if (user.account_locked) {
      console.log(`🔒 Account locked: Staff ID ${staff_id}`);
      return res.status(423).json({
        success: false,
        message: 'Account is locked, please contact HR for assistance'
      });
    }

    // Check failed login attempts
    if (user.failed_login_attempts >= 5) {
      console.log(`⚠️ Too many failed login attempts: Staff ID ${staff_id}`);
      return res.status(423).json({
        success: false,
        message: 'Too many failed login attempts, please contact HR to reset account'
      });
    }

    // Use User model to validate password
    const isValidPassword = await User.validatePassword(password, user.password);

    if (!isValidPassword) {
      console.log(`❌ Incorrect password: Staff ID ${staff_id}`);
      
      // Use User model to increment failed login attempts
      await User.incrementFailedAttempts(staff_id);

      return res.status(401).json({
        success: false,
        message: 'Incorrect staff ID or password'
      });
    }

    // Use User model to reset failed login attempts and update last login time
    await User.resetFailedAttempts(staff_id);
    await User.updateLastLogin(staff_id);

    // Use User model to generate JWT token
    const token = User.generateToken(user);

    console.log(`✅ Login successful: ${user.name} (Staff ID: ${staff_id})`);

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
    console.error('❌ Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal error occurred during login process'
    });
  }
});

// POST /api/auth/change-password - Change password
router.post('/change-password', async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied, no token provided'
      });
    }

    const decoded = User.verifyToken(token);
    if (!decoded) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }

    const { currentPassword, newPassword } = req.body;

    console.log(`🔑 Change password request: User ID ${decoded.user_id}`);

    // Validate input
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide current password and new password'
      });
    }

    // Validate new password strength
    const passwordValidation = User.validatePasswordStrength(newPassword);
    if (!passwordValidation.valid) {
      return res.status(400).json({
        success: false,
        message: passwordValidation.message
      });
    }

    // Get user information
    const user = await User.findById(decoded.user_id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Validate current password
    const isValidPassword = await User.validatePassword(currentPassword, user.password);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Use User model to change password
    await User.changePassword(user.staff_id, newPassword);

    console.log(`✅ Password change successful: User ID ${decoded.user_id}`);

    res.json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('❌ Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal error occurred during password change process'
    });
  }
});

// POST /api/auth/logout - Logout
router.post('/logout', (req, res) => {
  console.log('👋 User logout');
  res.json({
    success: true,
    message: 'Logout successful, please remove token from client storage'
  });
});

// GET /api/auth/verify - Verify token validity
router.get('/verify', async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const decoded = User.verifyToken(token);
    if (!decoded) {
      return res.status(401).json({
        success: false,
        message: 'Token is invalid or expired'
      });
    }

    // Use User model to verify user still exists and is valid
    const user = await User.findById(decoded.user_id);
    if (!user || user.account_locked) {
      return res.status(401).json({
        success: false,
        message: 'Token is invalid or account is locked'
      });
    }

    console.log(`✅ Token verification successful: ${user.name}`);

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
    console.error('❌ Token verification error:', error);
    res.status(401).json({
      success: false,
      message: 'Token is invalid or expired'
    });
  }
});

// POST /api/auth/create-account - Create new user account (admin function)
router.post('/create-account', async (req, res) => {
  try {
    const { staff_id, password, role = 'staff' } = req.body;
    
    console.log(`👤 Creating new user account: Staff ID ${staff_id}`);

    // Basic validation
    if (!staff_id || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide staff ID and password'
      });
    }

    // Validate password strength
    const passwordValidation = User.validatePasswordStrength(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({
        success: false,
        message: passwordValidation.message
      });
    }

    // Use User model to create account
    const newUser = await User.create({ staff_id, password, role });

    console.log(`✅ Successfully created user account: Staff ID ${staff_id}`);

    res.status(201).json({
      success: true,
      message: 'User account created successfully',
      data: {
        user_id: newUser.user_id,
        staff_id: newUser.staff_id,
        role: newUser.role
      }
    });

  } catch (error) {
    console.error('❌ Create user account error:', error);
    
    if (error.message === 'Staff ID does not exist') {
      return res.status(400).json({
        success: false,
        message: 'Staff ID does not exist'
      });
    }
    
    if (error.message === 'User account already exists') {
      return res.status(409).json({
        success: false,
        message: 'User account already exists'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal error occurred while creating user account'
    });
  }
});

module.exports = router;