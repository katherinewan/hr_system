// controllers/positionController.js
const { query } = require('../config/database');

console.log('📋 載入職位控制器...');

// 輔助函數：驗證職位數據
const validatePositionData = (data, isUpdate = false) => {
  const errors = [];
  
  if (!isUpdate && (!data.position_id || data.position_id === '')) {
    errors.push('職位ID為必填項');
  }
  
  if (!data.title || !data.title.trim()) {
    errors.push('職位名稱為必填項');
  }
  
  if (!data.level || !data.level.trim()) {
    errors.push('職級為必填項');
  }
  
  if (!data.department_id || data.department_id === '') {
    errors.push('部門ID為必填項');
  }
  
  // 驗證職位名稱長度
  if (data.title && data.title.length > 100) {
    errors.push('職位名稱不能超過100個字符');
  }
  
  // 驗證職級長度
  if (data.level && data.level.length > 100) {
    errors.push('職級不能超過100個字符');
  }
  
  // 驗證職級是否有效（根據您資料庫中的實際數據）
  const validLevels = ['Junior', 'Mid', 'Senior', '初級', '中級', '高級', '主管', '經理', '總監'];
  if (data.level && !validLevels.includes(data.level)) {
    errors.push('無效的職級');
  }
  
  return errors;
};

// 獲取所有職位
const getAllPositions = async (req, res) => {
  try {
    console.log('📥 請求：獲取所有職位');
    
    const result = await query(`
      SELECT 
        p.position_id,
        p.title,
        p.level,
        p.department_id,
        d.department_name
      FROM position p
      LEFT JOIN department d ON p.department_id = d.department_id
      ORDER BY p.department_id, p.level, p.title
    `);
    
    console.log(`✅ 成功獲取 ${result.rows.length} 個職位`);
    
    res.json({
      success: true,
      message: `成功獲取 ${result.rows.length} 個職位資料`,
      data: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('❌ 獲取職位列表錯誤:', error);
    res.status(500).json({
      success: false,
      message: '獲取職位資料失敗',
      error: process.env.NODE_ENV === 'development' ? error.message : '內部伺服器錯誤'
    });
  }
};

// 根據ID獲取單一職位
const getPositionById = async (req, res) => {
  try {
    const { position_id } = req.params;
    console.log(`📥 請求：獲取職位 ID ${position_id}`);
    
    if (!position_id) {
      return res.status(400).json({
        success: false,
        message: '職位ID為必填參數'
      });
    }
    
    const result = await query(`
      SELECT 
        p.position_id,
        p.title,
        p.level,
        p.department_id,
        d.department_name
      FROM position p
      LEFT JOIN department d ON p.department_id = d.department_id
      WHERE p.position_id = $1
    `, [position_id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `找不到職位 ID ${position_id}`
      });
    }
    
    console.log(`✅ 成功獲取職位 ID ${position_id}`);
    
    res.json({
      success: true,
      message: '成功獲取職位資料',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('❌ 獲取職位錯誤:', error);
    res.status(500).json({
      success: false,
      message: '獲取職位資料失敗',
      error: process.env.NODE_ENV === 'development' ? error.message : '內部伺服器錯誤'
    });
  }
};

// 新增職位
const createPosition = async (req, res) => {
  try {
    const { position_id, title, level, department_id } = req.body;
    console.log(`📥 請求：新增職位 ${title}`);
    
    // 驗證數據
    const validationErrors = validatePositionData(req.body);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: '數據驗證失敗',
        errors: validationErrors
      });
    }
    
    // 檢查部門是否存在
    const departmentCheck = await query(
      'SELECT department_name FROM department WHERE department_id = $1',
      [department_id]
    );
    
    if (departmentCheck.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: `部門 ID ${department_id} 不存在`
      });
    }
    
    // 檢查職位ID是否已存在
    const existingPosition = await query(
      'SELECT position_id FROM position WHERE position_id = $1',
      [position_id]
    );
    
    if (existingPosition.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: `職位 ID ${position_id} 已存在`
      });
    }
    
    // 檢查同部門是否已有相同職位名稱
    const duplicateCheck = await query(
      'SELECT position_id FROM positions WHERE title = $1 AND department_id = $2',
      [title, department_id]
    );
    
    if (duplicateCheck.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: `該部門已存在職位「${title}」`
      });
    }
    
    // 創建職位
    const result = await query(`
      INSERT INTO position (position_id, title, level, department_id)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [position_id, title, level, department_id]);
    
    console.log(`✅ 成功新增職位 ID ${result.rows[0].position_id}`);
    
    // 獲取包含部門名稱的完整職位資料
    const positionWithDept = await query(`
      SELECT 
        p.position_id,
        p.title,
        p.level,
        p.department_id,
        d.department_name
      FROM position p
      LEFT JOIN department d ON p.department_id = d.department_id
      WHERE p.position_id = $1
    `, [position_id]);
    
    res.status(201).json({
      success: true,
      message: '職位新增成功',
      data: positionWithDept.rows[0] || result.rows[0]
    });
  } catch (error) {
    console.error('❌ 新增職位錯誤:', error);
    
    // 處理特定的PostgreSQL錯誤
    if (error.code === '23505') { // 唯一性約束違反
      return res.status(400).json({
        success: false,
        message: '職位ID已存在'
      });
    }
    
    if (error.code === '23503') { // 外鍵約束違反
      return res.status(400).json({
        success: false,
        message: '指定的部門不存在'
      });
    }
    
    res.status(500).json({
      success: false,
      message: '新增職位失敗',
      error: process.env.NODE_ENV === 'development' ? error.message : '內部伺服器錯誤'
    });
  }
};

// 更新職位
const updatePosition = async (req, res) => {
  try {
    const { position_id } = req.params;
    const { title, level, department_id } = req.body;
    console.log(`📥 請求：更新職位 ID ${position_id}`);
    
    // 驗證數據（更新時不需要驗證position_id）
    const validationErrors = validatePositionData(req.body, true);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: '數據驗證失敗',
        errors: validationErrors
      });
    }
    
    // 檢查職位是否存在
    const existingPosition = await query(
      'SELECT title FROM position WHERE position_id = $1',
      [position_id]
    );
    
    if (existingPosition.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `找不到職位 ID ${position_id}`
      });
    }
    
    // 檢查部門是否存在
    const departmentCheck = await query(
      'SELECT department_name FROM department WHERE department_id = $1',
      [department_id]
    );
    
    if (departmentCheck.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: `部門 ID ${department_id} 不存在`
      });
    }
    
    // 檢查同部門是否已有相同職位名稱（排除自己）
    const duplicateCheck = await query(
      'SELECT position_id FROM position WHERE title = $1 AND department_id = $2 AND position_id != $3',
      [title, department_id, position_id]
    );
    
    if (duplicateCheck.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: `該部門已存在職位「${title}」`
      });
    }
    
    const result = await query(`
      UPDATE position 
      SET title = $1, level = $2, department_id = $3 
      WHERE position_id = $4
      RETURNING *
    `, [title, level, department_id, position_id]);
    
    console.log(`✅ 成功更新職位 ID ${result.rows[0].position_id}`);
    
    // 獲取包含部門名稱的完整職位資料
    const positionWithDept = await query(`
      SELECT 
        p.position_id,
        p.title,
        p.level,
        p.department_id,
        d.department_name
      FROM position p
      LEFT JOIN department d ON p.department_id = d.department_id
      WHERE p.position_id = $1
    `, [position_id]);
    
    res.json({
      success: true,
      message: '職位更新成功',
      data: positionWithDept.rows[0] || result.rows[0]
    });
  } catch (error) {
    console.error('❌ 更新職位錯誤:', error);
    
    // 處理特定的PostgreSQL錯誤
    if (error.code === '23505') {
      return res.status(400).json({
        success: false,
        message: '職位名稱已存在於該部門'
      });
    }
    
    if (error.code === '23503') {
      return res.status(400).json({
        success: false,
        message: '指定的部門不存在'
      });
    }
    
    res.status(500).json({
      success: false,
      message: '更新職位失敗',
      error: process.env.NODE_ENV === 'development' ? error.message : '內部伺服器錯誤'
    });
  }
};

// 刪除職位
const deletePosition = async (req, res) => {
  try {
    const { position_id } = req.params;
    console.log(`📥 請求：刪除職位 ID ${position_id}`);
    
    if (!position_id) {
      return res.status(400).json({
        success: false,
        message: '職位ID為必填參數'
      });
    }
    
    // 檢查職位是否存在
    const existingPosition = await query(
      'SELECT title FROM position WHERE position_id = $1',
      [position_id]
    );
    
    if (existingPosition.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `找不到職位 ID ${position_id}`
      });
    }
    
    // 檢查是否有員工使用此職位（如果有 staff 表的話）
    try {
      const staffCheck = await query(
        'SELECT COUNT(*) as count FROM staff WHERE position_id = $1',
        [position_id]
      );
      
      const staffCount = parseInt(staffCheck.rows[0].count);
      if (staffCount > 0) {
        return res.status(400).json({
          success: false,
          message: `無法刪除職位，仍有 ${staffCount} 名員工使用此職位`
        });
      }
    } catch (staffError) {
      // 如果 staff 表不存在，繼續執行刪除操作
      console.log('📝 staff 表可能不存在，跳過員工檢查');
    }
    
    // 刪除職位
    await query('DELETE FROM position WHERE position_id = $1', [position_id]);
    
    console.log(`✅ 成功刪除職位 ID ${position_id} (${existingPosition.rows[0].title})`);
    
    res.json({
      success: true,
      message: `職位「${existingPosition.rows[0].title}」(ID: ${position_id}) 已成功刪除`
    });
  } catch (error) {
    console.error('❌ 刪除職位錯誤:', error);
    
    // 處理外鍵約束錯誤
    if (error.code === '23503') {
      return res.status(400).json({
        success: false,
        message: '無法刪除職位，該職位正被其他記錄引用'
      });
    }
    
    res.status(500).json({
      success: false,
      message: '刪除職位失敗',
      error: process.env.NODE_ENV === 'development' ? error.message : '內部伺服器錯誤'
    });
  }
};

// 根據部門獲取職位
const getPositionsByDepartment = async (req, res) => {
  try {
    const { department_id } = req.params;
    console.log(`📥 請求：獲取部門 ${department_id} 的職位`);
    
    const result = await query(`
      SELECT 
        p.position_id,
        p.title,
        p.level,
        p.department_id,
        d.department_name
      FROM position p
      LEFT JOIN department d ON p.department_id = d.department_id
      WHERE p.department_id = $1
      ORDER BY p.level, p.title
    `, [department_id]);
    
    console.log(`✅ 成功獲取部門 ${department_id} 的 ${result.rows.length} 個職位`);
    
    res.json({
      success: true,
      message: `成功獲取部門職位資料`,
      data: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('❌ 獲取部門職位錯誤:', error);
    res.status(500).json({
      success: false,
      message: '獲取部門職位資料失敗',
      error: process.env.NODE_ENV === 'development' ? error.message : '內部伺服器錯誤'
    });
  }
};

module.exports = {
  getAllPositions,
  getPositionById,
  createPosition,
  updatePosition,
  deletePosition,
  getPositionsByDepartment
};