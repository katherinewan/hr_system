// routes/authRoutes.js - 認證路由（限制角色登入）
const express = require('express');
const rateLimit = require('express-rate-limit');
const User = require('../models/User');
const { authMiddleware } = require('../middleware/auth');
const { pool } = require('../config/database');

const router = express.Router();

// 登入速率限制
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 分鐘
  max: 5, // 最多 5 次嘗試
  message: {
    success: false,
    message: '登入嘗試過於頻繁，請稍後再試'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// 允許的角色列表
const ALLOWED_ROLES = ['Admin', 'HR'];

// 用戶登入
router.post('/login', loginLimiter, async (req, res) => {
  try {
    console.log('🔐 收到登入請求');
    const { staff_id, password } = req.body;

    // 驗證輸入
    if (!staff_id || !password) {
      console.log('❌ 缺少必填項目');
      return res.status(400).json({
        success: false,
        message: 'Staff ID 和密碼為必填項'
      });
    }

    console.log(`🔍 查找用戶: ${staff_id}`);
    
    // 查找用戶
    const user = await User.findByStaffId(staff_id);
    if (!user) {
      console.log('❌ 用戶不存在');
      return res.status(401).json({
        success: false,
        message: 'Staff ID 或密碼錯誤'
      });
    }

    console.log(`✅ 找到用戶: ${user.name}, 角色: ${user.role}`);

    // 🚨 檢查用戶角色權限
    if (!ALLOWED_ROLES.includes(user.role)) {
      console.log(`❌ 角色權限不足: ${user.role}`);
      return res.status(403).json({
        success: false,
        message: '權限不足，只有管理員和HR人員可以登入系統',
        roleRequired: ALLOWED_ROLES,
        currentRole: user.role
      });
    }

    // 檢查帳戶是否被鎖定
    if (user.account_locked) {
      console.log('🔒 帳戶被鎖定');
      return res.status(423).json({
        success: false,
        message: '帳戶已被鎖定，請聯繫管理員',
        accountLocked: true
      });
    }

    console.log('🔐 驗證密碼中...');
    
    // 驗證密碼
    const isValidPassword = await User.validatePassword(password, user.password);
    if (!isValidPassword) {
      console.log('❌ 密碼錯誤');
      // 增加失敗嘗試次數
      await User.incrementFailedAttempts(staff_id);
      return res.status(401).json({
        success: false,
        message: 'Staff ID 或密碼錯誤'
      });
    }

    console.log('✅ 密碼驗證成功');

    // 登入成功 - 重置失敗嘗試次數並更新最後登入時間
    await User.resetFailedAttempts(staff_id);
    await User.updateLastLogin(staff_id);

    // 生成 token
    const token = User.generateToken(user);

    console.log(`🎉 登入成功，角色: ${user.role}，生成 token`);

    // 獲取更詳細的用戶資訊
    const userWithDetails = await pool.query(`
      SELECT 
        ua.user_id,
        ua.staff_id,
        s.name,
        ua.role,
        ua.last_login,
        s.email,
        s.position_id,
        p.title as position_title
      FROM user_accounts ua
      LEFT JOIN staff s ON ua.staff_id = s.staff_id
      LEFT JOIN position p ON s.position_id = p.position_id
      WHERE ua.staff_id = $1
    `, [staff_id]);

    const userInfo = userWithDetails.rows[0] || user;

    // 返回用戶信息（不包含密碼）
    const responseUser = {
      user_id: userInfo.user_id,
      staff_id: userInfo.staff_id,
      name: userInfo.name,
      email: userInfo.email,
      role: userInfo.role,
      position_title: userInfo.position_title || null,
      last_login: userInfo.last_login
    };

    res.json({
      success: true,
      message: '登入成功',
      data: {
        user: responseUser,
        token: token
      }
    });

  } catch (error) {
    console.error('❌ 登入錯誤:', error);
    res.status(500).json({
      success: false,
      message: '伺服器錯誤，請稍後再試'
    });
  }
});

// 用戶註冊（只能創建 Admin 和 HR 角色）
router.post('/register', async (req, res) => {
  try {
    console.log('📝 收到註冊請求');
    const { staff_id, password, role } = req.body;

    // 驗證輸入
    if (!staff_id || !password) {
      return res.status(400).json({
        success: false,
        message: 'Staff ID 和密碼為必填項'
      });
    }

    // 🚨 檢查角色是否允許
    if (role && !ALLOWED_ROLES.includes(role)) {
      return res.status(400).json({
        success: false,
        message: `角色必須是以下之一: ${ALLOWED_ROLES.join(', ')}`,
        allowedRoles: ALLOWED_ROLES
      });
    }

    // 密碼強度檢查
    const passwordValidation = User.validatePasswordStrength(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({
        success: false,
        message: passwordValidation.message
      });
    }

    // 檢查用戶帳戶是否已存在
    const existingUser = await User.userAccountExists(staff_id);
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: '此 Staff ID 已有用戶帳戶'
      });
    }

    // 創建新用戶（默認為 HR 角色）
    const newUser = await User.create({
      staff_id,
      password,
      role: role || 'HR'
    });

    console.log(`✅ 註冊成功，角色: ${newUser.role}`);

    res.status(201).json({
      success: true,
      message: '註冊成功',
      data: {
        user: {
          user_id: newUser.user_id,
          staff_id: newUser.staff_id,
          role: newUser.role,
          last_login: newUser.last_login
        }
      }
    });

  } catch (error) {
    console.error('❌ 註冊錯誤:', error);
    
    // 處理特定錯誤
    if (error.message.includes('Staff ID does not exist')) {
      return res.status(400).json({
        success: false,
        message: 'Staff ID 不存在於員工表中'
      });
    }

    if (error.message.includes('User account already exists')) {
      return res.status(409).json({
        success: false,
        message: '此 Staff ID 已有用戶帳戶'
      });
    }

    res.status(500).json({
      success: false,
      message: '伺服器錯誤，請稍後再試'
    });
  }
});

// 獲取當前用戶信息
router.get('/me', authMiddleware, async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        user: req.user
      }
    });
  } catch (error) {
    console.error('❌ 獲取用戶信息錯誤:', error);
    res.status(500).json({
      success: false,
      message: '伺服器錯誤'
    });
  }
});

// 驗證 token
router.post('/verify', authMiddleware, (req, res) => {
  res.json({
    success: true,
    message: 'Token 有效',
    data: {
      user: req.user
    }
  });
});

// 驗證當前用戶狀態的端點
router.get('/verify-token', authMiddleware, async (req, res) => {
  try {
    // 獲取用戶詳細資訊
    const userDetails = await pool.query(`
      SELECT 
        ua.user_id,
        ua.staff_id,
        s.name,
        ua.role,
        ua.last_login,
        s.email,
        p.title as position_title,
        d.department_name
      FROM user_accounts ua
      LEFT JOIN staff s ON ua.staff_id = s.staff_id
      LEFT JOIN position p ON s.position_id = p.position_id
      LEFT JOIN departments d ON s.department_id = d.department_id
      WHERE ua.user_id = $1
    `, [req.user.user_id]);

    res.json({
      success: true,
      message: 'Token 有效',
      data: {
        user: userDetails.rows[0] || req.user
      }
    });
  } catch (error) {
    console.error('❌ 驗證token錯誤:', error);
    res.status(500).json({
      success: false,
      message: '伺服器錯誤'
    });
  }
});

// 修改密碼
router.post('/change-password', authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: '當前密碼和新密碼為必填項'
      });
    }

    // 驗證新密碼強度
    const passwordValidation = User.validatePasswordStrength(newPassword);
    if (!passwordValidation.valid) {
      return res.status(400).json({
        success: false,
        message: passwordValidation.message
      });
    }

    // 獲取當前用戶的密碼
    const user = await User.findByStaffId(req.user.staff_id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用戶不存在'
      });
    }

    // 驗證當前密碼
    const isValidPassword = await User.validatePassword(currentPassword, user.password);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: '當前密碼錯誤'
      });
    }

    // 更新密碼
    await User.changePassword(req.user.staff_id, newPassword);

    res.json({
      success: true,
      message: '密碼修改成功'
    });

  } catch (error) {
    console.error('❌ 修改密碼錯誤:', error);
    res.status(500).json({
      success: false,
      message: '伺服器錯誤'
    });
  }
});

// 解鎖用戶帳戶（僅管理員功能）
router.post('/unlock-account', authMiddleware, async (req, res) => {
  try {
    const { staff_id } = req.body;

    // 檢查是否為管理員
    if (req.user.role !== 'Admin') {
      return res.status(403).json({
        success: false,
        message: '權限不足，僅管理員可執行此操作'
      });
    }

    if (!staff_id) {
      return res.status(400).json({
        success: false,
        message: 'Staff ID 為必填項'
      });
    }

    await User.unlockAccount(staff_id);

    res.json({
      success: true,
      message: '帳戶解鎖成功'
    });

  } catch (error) {
    console.error('❌ 解鎖帳戶錯誤:', error);
    res.status(500).json({
      success: false,
      message: '伺服器錯誤'
    });
  }
});

// 獲取允許的角色列表
router.get('/allowed-roles', (req, res) => {
  res.json({
    success: true,
    data: {
      allowedRoles: ALLOWED_ROLES,
      message: '只有以下角色可以登入系統'
    }
  });
});

module.exports = router;