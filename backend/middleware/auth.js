// middleware/auth.js - 更新版認證中間件（配合你的資料庫結構）
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');

// 驗證 JWT Token
const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return null;
  }
};

// 根據 user_id 查找用戶
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
    console.error('查找用戶錯誤:', error);
    return null;
  }
};

// 主要認證中間件
const authMiddleware = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: '無訪問權限，需要有效的 token'
      });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({
        success: false,
        message: '無效的 token'
      });
    }

    // 使用 decoded.userId 獲取用戶信息（根據你的 JWT 結構）
    const user = await findUserById(decoded.userId);
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

    // 將用戶信息添加到請求對象
    req.user = user;
    req.staff = {
      staffId: user.staff_id,
      role: user.role,
      userId: user.user_id
    };

    next();
  } catch (error) {
    console.error('認證中間件錯誤:', error);
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

// HR 權限檢查
const requireHR = requireRole(['HR']);

// 員工資料所有權檢查 (員工只能存取自己的資料，HR 可存取所有人的)
const requireOwnership = (req, res, next) => {
  const requestedStaffId = req.params.staffId || req.body.staffId;
  
  if (req.user.role === 'HR' || req.user.role === 'Admin') {
    // HR 和管理員可以存取任何員工資料
    return next();
  }

  if (requestedStaffId && parseInt(requestedStaffId) !== req.user.staff_id) {
    return res.status(403).json({
      success: false,
      message: '存取被拒絕，您只能存取自己的資料'
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