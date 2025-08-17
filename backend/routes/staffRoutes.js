// routes/staffRoutes.js - 最終版本（整合 Profile 功能）
const express = require('express');
const router = express.Router();
const { 
  getAllStaff,
  getStaffById,
  searchStaffByName,
  createStaff,
  updateStaff,
  deleteStaff,
  getStaffProfile,
  updateStaffProfile,
  getWorkSummary
} = require('../controllers/staffController');
const { authMiddleware } = require('../middleware/auth');

console.log('🛣️ 載入員工路由...');

// 記錄請求的中間件
const logRequest = (req, res, next) => {
  console.log(`🌐 ${req.method} ${req.originalUrl} - ${new Date().toLocaleTimeString()}`);
  console.log('📋 請求參數:', req.params);
  console.log('🔍 查詢參數:', req.query);
  next();
};

// 應用記錄中間件到所有路由
router.use(logRequest);

// 輔助函數：格式化員工資料
const formatStaffData = (staff) => {
  return {
    ...staff,
    hire_date: staff.hire_date ? new Date(staff.hire_date).toISOString().split('T')[0] : null
  };
};

// ============ 員工個人資料相關路由 (需要認證) ============

// GET /api/staff/profile - 獲取登入員工的個人資料
router.get('/profile', authMiddleware, getStaffProfile);

// PUT /api/staff/profile - 更新員工個人資料 (限制可編輯欄位)
router.put('/profile', authMiddleware, updateStaffProfile);

// GET /api/staff/work-summary - 獲取工作統計摘要
router.get('/work-summary', authMiddleware, getWorkSummary);

// ============ 一般員工管理路由 (公開或管理員) ============

// GET /api/staff/search?name=搜尋關鍵字 - 搜尋員工
router.get('/search', async (req, res) => {
  try {
    const { name } = req.query;
    console.log(`🔍 搜尋員工：${name}`);
    
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: '請提供搜尋的姓名'
      });
    }
    
    await searchStaffByName(req, res);
    
  } catch (error) {
    console.error('❌ 搜尋員工錯誤:', error);
    res.status(500).json({
      success: false,
      message: '搜尋員工失敗',
      error: error.message
    });
  }
});

// GET /api/staff - 獲取所有員工
router.get('/', async (req, res) => {
  try {
    console.log('📋 獲取所有員工資料...');
    
    await getAllStaff(req, res);
    
  } catch (error) {
    console.error('❌ 獲取員工資料錯誤:', error);
    res.status(500).json({
      success: false,
      message: '獲取員工資料失敗',
      error: error.message
    });
  }
});

// GET /api/staff/:id - 根據 ID 獲取單個員工
router.get('/:id', async (req, res) => {
  try {
    const staffId = req.params.id;
    console.log(`🔍 獲取員工 ID: ${staffId}`);
    
    // 驗證 ID 格式
    if (!/^\d+$/.test(staffId)) {
      console.log(`❌ 無效的員工 ID 格式: ${staffId}`);
      return res.status(400).json({
        success: false,
        message: '無效的員工 ID 格式'
      });
    }
    
    await getStaffById(req, res);
    
  } catch (error) {
    console.error('❌ 獲取員工資料錯誤:', error);
    res.status(500).json({
      success: false,
      message: '獲取員工資料失敗',
      error: error.message
    });
  }
});

// POST /api/staff - 新增員工
router.post('/', async (req, res) => {
  try {
    const { name } = req.body;
    console.log('➕ 新增員工:', name);
    
    await createStaff(req, res);
    
  } catch (error) {
    console.error('❌ 新增員工錯誤:', error);
    
    if (error.code === '23505') {
      return res.status(400).json({
        success: false,
        message: '該電子郵件或電話號碼已被使用'
      });
    }
    
    res.status(500).json({
      success: false,
      message: '新增員工失敗',
      error: error.message
    });
  }
});

// PUT /api/staff/:id - 更新員工資料
router.put('/:id', async (req, res) => {
  try {
    const staffId = req.params.id;
    console.log(`✏️ 更新員工 ID: ${staffId}`);
    
    // 驗證 ID 格式
    if (!/^\d+$/.test(staffId)) {
      return res.status(400).json({
        success: false,
        message: '無效的員工 ID 格式'
      });
    }
    
    await updateStaff(req, res);
    
  } catch (error) {
    console.error('❌ 更新員工錯誤:', error);
    res.status(500).json({
      success: false,
      message: '更新員工資料失敗',
      error: error.message
    });
  }
});

// DELETE /api/staff/:id - 刪除員工
router.delete('/:id', async (req, res) => {
  try {
    const staffId = req.params.id;
    console.log(`🗑️ 刪除員工 ID: ${staffId}`);
    
    // 驗證 ID 格式
    if (!/^\d+$/.test(staffId)) {
      return res.status(400).json({
        success: false,
        message: '無效的員工 ID 格式'
      });
    }
    
    await deleteStaff(req, res);
    
  } catch (error) {
    console.error('❌ 刪除員工錯誤:', error);
    res.status(500).json({
      success: false,
      message: '刪除員工失敗',
      error: error.message
    });
  }
});

module.exports = router;