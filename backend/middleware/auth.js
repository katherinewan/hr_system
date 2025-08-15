// middleware/auth.js - 認證中間件
const User = require('../models/User');

const authMiddleware = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: '無訪問權限，需要有效的 token'
      });
    }

    const decoded = User.verifyToken(token);
    if (!decoded) {
      return res.status(401).json({
        success: false,
        message: '無效的 token'
      });
    }

    // 使用 decoded.user_id 獲取用戶信息
    const user = await User.findById(decoded.user_id);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: '用戶不存在'
      });
    }

    // 檢查帳戶是否被鎖定
    if (user.account_locked) {
      return res.status(423).json({
        success: false,
        message: '帳戶已被鎖定'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('❌ 認證中間件錯誤:', error);
    res.status(500).json({
      success: false,
      message: '伺服器錯誤'
    });
  }
};

// 角色檢查中間件
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: '未認證'
      });
    }

    // 支援傳入單個角色或角色陣列
    const allowedRoles = Array.isArray(roles) ? roles : [roles];
    
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: '權限不足'
      });
    }

    next();
  };
};

// 管理員權限檢查
const requireAdmin = requireRole(['Admin']);

// 管理員或經理權限檢查
const requireManagerOrAdmin = requireRole(['Admin', 'Manager']);

module.exports = { 
  authMiddleware, 
  requireRole, 
  requireAdmin, 
  requireManagerOrAdmin 
};