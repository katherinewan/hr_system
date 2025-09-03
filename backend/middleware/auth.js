// middleware/auth.js
const jwt = require('jsonwebtoken');

const JWT_SECRET = 'your-actual-secret-key';

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: 'Access denied, no token provided'
      });
    }

    const token = authHeader.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied, invalid token format'
      });
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      
      req.staff = {
        staffId: decoded.staff_id,
        userId: decoded.user_id,
        role: decoded.role
      };
      
      next();
      
    } catch (jwtError) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token'
      });
    }

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Authentication error'
    });
  }
};

const generateToken = (user) => {
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

const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
};

module.exports = { 
  authMiddleware,
  generateToken,
  verifyToken
};