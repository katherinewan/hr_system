// middleware/auth.js - Updated authentication middleware (matching your database structure)
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');

// Verify JWT Token
const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return null;
  }
};

// Find user by user_id
const findUserById = async (userId) => {
  try {
    const query = `
      SELECT 
        ua.user_id,
        ua.staff_id,
        ua.role,
        ua.account_locked,
        ua.failed_login_attempts,
        ua.last_login,
        s.name,
        s.email
      FROM user_accounts ua
      INNER JOIN staff s ON ua.staff_id = s.staff_id
      WHERE ua.user_id = $1
    `;
    
    const result = await pool.query(query, [userId]);
    return result.rows.length > 0 ? result.rows[0] : null;
  } catch (error) {
    console.error('Error finding user:', error);
    return null;
  }
};

// Main authentication middleware
const authMiddleware = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied, valid token required'
      });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }

    // Use decoded.userId to get user information (based on your JWT structure)
    const user = await findUserById(decoded.userId);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User does not exist'
      });
    }

    // Check if account is locked
    if (user.account_locked) {
      return res.status(423).json({
        success: false,
        message: 'Account is locked'
      });
    }

    // Add user information to request object
    req.user = user;
    req.staff = {
      staffId: user.staff_id,
      role: user.role,
      userId: user.user_id
    };

    next();
  } catch (error) {
    console.error('Authentication middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

// Role checking middleware
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
    }

    // Support passing single role or array of roles
    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      });
    }

    next();
  };
};

// Admin permission check
const requireAdmin = requireRole(['Admin']);

// Manager or Admin permission check
const requireManagerOrAdmin = requireRole(['Admin', 'Manager']);

// HR permission check
const requireHR = requireRole(['HR']);

// Staff data ownership check (staff can only access their own data, HR can access everyone's)
const requireOwnership = (req, res, next) => {
  const requestedStaffId = req.params.staffId || req.body.staffId;
  
  if (req.user.role === 'HR' || req.user.role === 'Admin') {
    // HR and Admin can access any staff data
    return next();
  }

  if (requestedStaffId && parseInt(requestedStaffId) !== req.user.staff_id) {
    return res.status(403).json({
      success: false,
      message: 'Access denied, you can only access your own data'
    });
  }

  next();
};

module.exports = { 
  authMiddleware, 
  requireRole, 
  requireAdmin, 
  requireManagerOrAdmin,
  requireHR,
  requireOwnership,
  verifyToken,
  findUserById
};