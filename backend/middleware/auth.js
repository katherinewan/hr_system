// middleware/auth.js - Simplified but secure
const jwt = require('jsonwebtoken');

// Hard-coded secret for simplicity (in production, use env variable)
const JWT_SECRET = 'your-actual-secret-key';

console.log('Loading auth middleware...');

// Simplified authentication middleware
const authMiddleware = async (req, res, next) => {
  try {
    console.log('AUTH: Middleware called');
    
    const authHeader = req.header('Authorization');
    console.log('AUTH: Authorization header present:', !!authHeader);
    
    if (!authHeader) {
      console.log('AUTH: No authorization header');
      return res.status(401).json({
        success: false,
        message: 'Access denied, no token provided'
      });
    }

    const token = authHeader.replace('Bearer ', '');
    console.log('AUTH: Token extracted:', !!token);

    if (!token) {
      console.log('AUTH: No token after Bearer extraction');
      return res.status(401).json({
        success: false,
        message: 'Access denied, invalid token format'
      });
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      console.log('AUTH: Token verified successfully');
      console.log('AUTH: Decoded payload:', decoded);
      
      // Add user info to request
      req.staff = {
        staffId: decoded.staff_id,
        userId: decoded.user_id,
        role: decoded.role
      };
      
      console.log('AUTH: Success - Staff ID:', decoded.staff_id);
      next();
      
    } catch (jwtError) {
      console.log('AUTH: JWT verification failed:', jwtError.message);
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token'
      });
    }

  } catch (error) {
    console.error('AUTH: Middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Authentication error'
    });
  }
};

// Generate token function
const generateToken = (user) => {
  console.log('AUTH: Generating token for user:', user.staff_id);
  
  const payload = {
    user_id: user.user_id,
    staff_id: user.staff_id,
    role: user.role
  };
  
  const options = {
    expiresIn: '24h'
  };
  
  return jwt.sign(payload, JWT_SECRET, options);
};

// Verify token function
const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    console.log('AUTH: Token verification error:', error.message);
    return null;
  }
};

module.exports = { 
  authMiddleware,
  generateToken,
  verifyToken
};