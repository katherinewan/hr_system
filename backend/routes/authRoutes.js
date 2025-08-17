// routes/auth.js - 使用你現有 User 模型的認證路由（配合 staff_id 登入）
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { pool } = require('../config/database');

console.log('🔐 載入認證路由...');

// POST /api/auth/login - 員工登入 (使用 staff_id)
router.post('/login', async (req, res) => {
  try {
    const { staff_id, password } = req.body;
    console.log(`🔐 登入嘗試: Staff ID ${staff_id}`);

    // 驗證輸入
    if (!staff_id || !password) {
      return res.status(400).json({
        success: false,
        message: '請輸入員工 ID 和密碼'
      });
    }

    // 使用 User 模型查找用戶
    const user = await User.findByStaffId(staff_id);
    if (!user) {
      console.log(`❌ 找不到用戶帳戶: Staff ID ${staff_id}`);
      return res.status(401).json({
        success: false,
        message: '員工 ID 或密碼錯誤'
      });
    }

    // 檢查帳戶是否被鎖定
    if (user.account_locked) {
      console.log(`🔒 帳戶被鎖定: Staff ID ${staff_id}`);
      return res.status(423).json({
        success: false,
        message: '帳戶已被鎖定，請聯絡 HR 尋求協助'
      });
    }

    // 檢查登入失敗次數
    if (user.failed_login_attempts >= 5) {
      console.log(`⚠️ 登入失敗次數過多: Staff ID ${staff_id}`);
      return res.status(423).json({
        success: false,
        message: '登入失敗次數過多，請聯絡 HR 重置帳戶'
      });
    }

    // 使用 User 模型驗證密碼
    const isValidPassword = await User.validatePassword(password, user.password);

    if (!isValidPassword) {
      console.log(`❌ 密碼錯誤: Staff ID ${staff_id}`);
      
      // 使用 User 模型增加失敗登入次數
      await User.incrementFailedAttempts(staff_id);

      return res.status(401).json({
        success: false,
        message: '員工 ID 或密碼錯誤'
      });
    }

    // 使用 User 模型重置失敗登入次數並更新最後登入時間
    await User.resetFailedAttempts(staff_id);
    await User.updateLastLogin(staff_id);

    // 使用 User 模型生成 JWT token
    const token = User.generateToken(user);

    console.log(`✅ 登入成功: ${user.name} (Staff ID: ${staff_id})`);

    res.json({
      success: true,
      message: '登入成功',
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
    console.error('❌ 登入錯誤:', error);
    res.status(500).json({
      success: false,
      message: '登入過程中發生內部錯誤'
    });
  }
});

// POST /api/auth/change-password - 更改密碼
router.post('/change-password', async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: '存取被拒絕，未提供 token'
      });
    }

    const decoded = User.verifyToken(token);
    if (!decoded) {
      return res.status(401).json({
        success: false,
        message: '無效的 token'
      });
    }

    const { currentPassword, newPassword } = req.body;

    console.log(`🔑 更改密碼請求: User ID ${decoded.user_id}`);

    // 驗證輸入
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: '請提供當前密碼和新密碼'
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

    // 獲取用戶信息
    const user = await User.findById(decoded.user_id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '找不到用戶'
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

    // 使用 User 模型更改密碼
    await User.changePassword(user.staff_id, newPassword);

    console.log(`✅ 密碼更改成功: User ID ${decoded.user_id}`);

    res.json({
      success: true,
      message: '密碼更改成功'
    });

  } catch (error) {
    console.error('❌ 更改密碼錯誤:', error);
    res.status(500).json({
      success: false,
      message: '更改密碼過程中發生內部錯誤'
    });
  }
});

// POST /api/auth/logout - 登出
router.post('/logout', (req, res) => {
  console.log('👋 用戶登出');
  res.json({
    success: true,
    message: '登出成功，請從客戶端儲存中移除 token'
  });
});

// GET /api/auth/verify - 驗證 token 有效性
router.get('/verify', async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: '未提供 token'
      });
    }

    const decoded = User.verifyToken(token);
    if (!decoded) {
      return res.status(401).json({
        success: false,
        message: 'Token 無效或已過期'
      });
    }

    // 使用 User 模型驗證用戶是否仍然存在且有效
    const user = await User.findById(decoded.user_id);
    if (!user || user.account_locked) {
      return res.status(401).json({
        success: false,
        message: 'Token 無效或帳戶已被鎖定'
      });
    }

    console.log(`✅ Token 驗證成功: ${user.name}`);

    res.json({
      success: true,
      message: 'Token 有效',
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
    console.error('❌ Token 驗證錯誤:', error);
    res.status(401).json({
      success: false,
      message: 'Token 無效或已過期'
    });
  }
});

// POST /api/auth/create-account - 創建新用戶帳戶 (管理員功能)
router.post('/create-account', async (req, res) => {
  try {
    const { staff_id, password, role = 'staff' } = req.body;
    
    console.log(`👤 創建新用戶帳戶: Staff ID ${staff_id}`);

    // 基本驗證
    if (!staff_id || !password) {
      return res.status(400).json({
        success: false,
        message: '請提供員工 ID 和密碼'
      });
    }

    // 驗證密碼強度
    const passwordValidation = User.validatePasswordStrength(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({
        success: false,
        message: passwordValidation.message
      });
    }

    // 使用 User 模型創建帳戶
    const newUser = await User.create({ staff_id, password, role });

    console.log(`✅ 成功創建用戶帳戶: Staff ID ${staff_id}`);

    res.status(201).json({
      success: true,
      message: '用戶帳戶創建成功',
      data: {
        user_id: newUser.user_id,
        staff_id: newUser.staff_id,
        role: newUser.role
      }
    });

  } catch (error) {
    console.error('❌ 創建用戶帳戶錯誤:', error);
    
    if (error.message === 'Staff ID does not exist') {
      return res.status(400).json({
        success: false,
        message: '員工 ID 不存在'
      });
    }
    
    if (error.message === 'User account already exists') {
      return res.status(409).json({
        success: false,
        message: '用戶帳戶已存在'
      });
    }

    res.status(500).json({
      success: false,
      message: '創建用戶帳戶時發生內部錯誤'
    });
  }
});

module.exports = router;