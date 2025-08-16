// routes/staffRoutes.js - 修正版員工路由
const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');

console.log('🛣️  載入員工路由...');

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
    
    const query = `
      SELECT staff_id, name, nickname, gender, age, hire_date,
             email, address, phone_number, emer_phone, emer_name, position_id
      FROM staff 
      WHERE name ILIKE $1 OR nickname ILIKE $1
      ORDER BY staff_id ASC
    `;
    
    const searchPattern = `%${name.trim()}%`;
    const result = await pool.query(query, [searchPattern]);
    
    const formattedStaff = result.rows.map(formatStaffData);
    
    console.log(`✅ 搜尋到 ${result.rows.length} 名員工`);
    
    res.json({
      success: true,
      data: formattedStaff,
      count: result.rows.length,
      message: `搜尋 "${name}" 的結果`
    });
    
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
    
    const query = `
      SELECT staff_id, name, nickname, gender, age, hire_date, 
             email, address, phone_number, emer_phone, emer_name, position_id
      FROM staff 
      ORDER BY staff_id ASC
    `;
    
    const result = await pool.query(query);
    
    // 格式化資料並添加調試資訊
    const formattedStaff = result.rows.map(staff => {
      console.log(`處理員工 ${staff.staff_id}: 性別=${staff.gender} (類型: ${typeof staff.gender})`);
      return formatStaffData(staff);
    });
    
    console.log(`✅ 成功獲取 ${result.rows.length} 名員工資料`);
    
    res.json({
      success: true,
      data: formattedStaff,
      count: result.rows.length,
      message: '員工資料獲取成功'
    });
    
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
    console.log(`🔍 獲取員工 ID: ${staffId} (類型: ${typeof staffId})`);
    
    // 驗證 ID 格式
    if (!/^\d+$/.test(staffId)) {
      console.log(`❌ 無效的員工 ID 格式: ${staffId}`);
      return res.status(400).json({
        success: false,
        message: '無效的員工 ID 格式'
      });
    }
    
    const query = `
      SELECT staff_id, name, nickname, gender, age, hire_date,
             email, address, phone_number, emer_phone, emer_name, position_id
      FROM staff 
      WHERE staff_id = $1
    `;
    
    console.log(`🔍 執行查詢: ${query} 參數: [${staffId}]`);
    const result = await pool.query(query, [parseInt(staffId)]);
    
    if (result.rows.length === 0) {
      console.log(`❌ 找不到員工 ID: ${staffId}`);
      return res.status(404).json({
        success: false,
        message: `找不到員工 ID: ${staffId}`
      });
    }
    
    const staff = result.rows[0];
    console.log(`✅ 找到員工: ${staff.name}, 性別: ${staff.gender}`);
    
    const formattedStaff = formatStaffData(staff);
    
    res.json({
      success: true,
      data: formattedStaff,
      message: '員工資料獲取成功'
    });
    
  } catch (error) {
    console.error('❌ 獲取員工資料錯誤:', error);
    console.error('錯誤詳情:', {
      message: error.message,
      stack: error.stack,
      code: error.code
    });
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
    const {
      name,
      nickname,
      gender,
      age,
      hire_date,
      email,
      address,
      phone_number,
      emer_phone,
      emer_name,
      position_id
    } = req.body;
    
    console.log('➕ 新增員工:', name);
    
    // 基本驗證
    if (!name || !email || !phone_number || !age || !hire_date) {
      return res.status(400).json({
        success: false,
        message: '請填寫所有必填欄位 (姓名、電子郵件、電話、年齡、入職日期)'
      });
    }
    
    // 驗證電子郵件格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: '電子郵件格式無效'
      });
    }
    
    // 驗證年齡
    if (age < 1 || age > 120) {
      return res.status(400).json({
        success: false,
        message: '年齡必須在 1-120 之間'
      });
    }
    
    // 檢查電子郵件是否重複
    const emailCheck = await pool.query('SELECT staff_id FROM staff WHERE email = $1', [email]);
    if (emailCheck.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: '該電子郵件已被使用'
      });
    }
    
    const query = `
      INSERT INTO staff (name, nickname, gender, age, hire_date, email, address, phone_number, emer_phone, emer_name, position_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING staff_id, name, nickname, gender, age, hire_date, email, address, phone_number, emer_phone, emer_name, position_id
    `;
    
    const values = [
      name,
      nickname || null,
      gender || 'male',
      parseInt(age),
      hire_date,
      email,
      address || null,
      phone_number,
      emer_phone || null,
      emer_name || null,
      position_id || null
    ];
    
    const result = await pool.query(query, values);
    const newStaff = formatStaffData(result.rows[0]);
    
    console.log(`✅ 成功新增員工: ${newStaff.name} (ID: ${newStaff.staff_id})`);
    
    res.status(201).json({
      success: true,
      data: newStaff,
      message: '員工新增成功'
    });
    
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
    const {
      name,
      nickname,
      gender,
      age,
      hire_date,
      email,
      address,
      phone_number,
      emer_phone,
      emer_name,
      position_id
    } = req.body;
    
    console.log(`✏️ 更新員工 ID: ${staffId}`);
    
    // 驗證 ID 格式
    if (!/^\d+$/.test(staffId)) {
      return res.status(400).json({
        success: false,
        message: '無效的員工 ID 格式'
      });
    }
    
    // 基本驗證
    if (!name || !email || !phone_number || !age || !hire_date) {
      return res.status(400).json({
        success: false,
        message: '請填寫所有必填欄位'
      });
    }
    
    // 驗證電子郵件格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: '電子郵件格式無效'
      });
    }
    
    // 驗證年齡
    if (age < 1 || age > 120) {
      return res.status(400).json({
        success: false,
        message: '年齡必須在 1-120 之間'
      });
    }
    
    // 檢查員工是否存在
    const existingStaff = await pool.query('SELECT staff_id FROM staff WHERE staff_id = $1', [staffId]);
    if (existingStaff.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `找不到員工 ID: ${staffId}`
      });
    }
    
    // 檢查電子郵件是否被其他員工使用
    const emailCheck = await pool.query(
      'SELECT staff_id FROM staff WHERE email = $1 AND staff_id != $2', 
      [email, staffId]
    );
    if (emailCheck.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: '該電子郵件已被其他員工使用'
      });
    }
    
    const query = `
      UPDATE staff 
      SET name = $1, nickname = $2, gender = $3, age = $4, hire_date = $5, 
          email = $6, address = $7, phone_number = $8, emer_phone = $9, emer_name = $10, position_id = $11
      WHERE staff_id = $12
      RETURNING staff_id, name, nickname, gender, age, hire_date, email, address, phone_number, emer_phone, emer_name, position_id
    `;
    
    const values = [
      name,
      nickname || null,
      gender || 'male',
      parseInt(age),
      hire_date,
      email,
      address || null,
      phone_number,
      emer_phone || null,
      emer_name || null,
      position_id || null,
      staffId
    ];
    
    const result = await pool.query(query, values);
    const updatedStaff = formatStaffData(result.rows[0]);
    
    console.log(`✅ 成功更新員工: ${updatedStaff.name}`);
    
    res.json({
      success: true,
      data: updatedStaff,
      message: '員工資料更新成功'
    });
    
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
    
    // 檢查員工是否存在
    const existingStaff = await pool.query(
      'SELECT staff_id, name FROM staff WHERE staff_id = $1', 
      [staffId]
    );
    
    if (existingStaff.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `找不到員工 ID: ${staffId}`
      });
    }
    
    const staffName = existingStaff.rows[0].name;
    
    // 刪除員工
    await pool.query('DELETE FROM staff WHERE staff_id = $1', [staffId]);
    
    console.log(`✅ 成功刪除員工: ${staffName} (ID: ${staffId})`);
    
    res.json({
      success: true,
      message: `員工 ${staffName} 已被刪除`,
      deletedStaffId: staffId
    });
    
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