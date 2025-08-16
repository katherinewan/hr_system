// controllers/departController.js
const { query } = require('../config/database');

console.log('🏢 載入部門控制器...');

// 輔助函數：驗證部門數據
const validateDepartmentData = (data, isUpdate = false) => {
  const errors = [];
  
  if (!isUpdate && (!data.department_id || data.department_id === '')) {
    errors.push('部門ID為必填項');
  }
  
  if (!data.department_name || !data.department_name.trim()) {
    errors.push('部門名稱為必填項');
  }
  
  if (!data.department_head || !data.department_head.trim()) {
    errors.push('部門主管為必填項');
  }
  
  // 驗證部門名稱長度
  if (data.department_name && data.department_name.length > 100) {
    errors.push('部門名稱不能超過100個字符');
  }
  
  // 驗證部門主管名稱長度
  if (data.department_head && data.department_head.length > 100) {
    errors.push('部門主管名稱不能超過100個字符');
  }
  
  return errors;
};

// 獲取所有部門
const getAllDepartments = async (req, res) => {
  try {
    console.log('📥 請求：獲取所有部門');
    
    const result = await query(`
      SELECT 
        d.department_id,
        d.department_name,
        d.department_head,
        COUNT(p.position_id) as position_count
      FROM department d
      LEFT JOIN position p ON d.department_id = p.department_id
      GROUP BY d.department_id, d.department_name, d.department_head
      ORDER BY d.department_id
    `);
    
    console.log(`✅ 成功獲取 ${result.rows.length} 個部門`);
    
    res.json({
      success: true,
      message: `成功獲取 ${result.rows.length} 個部門資料`,
      data: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('❌ 獲取部門列表錯誤:', error);
    res.status(500).json({
      success: false,
      message: '獲取部門資料失敗',
      error: process.env.NODE_ENV === 'development' ? error.message : '內部伺服器錯誤'
    });
  }
};

// 根據ID獲取單一部門
const getDepartmentById = async (req, res) => {
  try {
    const { department_id } = req.params;
    console.log(`📥 請求：獲取部門 ID ${department_id}`);
    
    if (!department_id) {
      return res.status(400).json({
        success: false,
        message: '部門ID為必填參數'
      });
    }
    
    const result = await query(`
      SELECT 
        d.department_id,
        d.department_name,
        d.department_head,
        COUNT(p.position_id) as position_count
      FROM department d
      LEFT JOIN position p ON d.department_id = p.department_id
      WHERE d.department_id = $1
      GROUP BY d.department_id, d.department_name, d.department_head
    `, [department_id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `找不到部門 ID ${department_id}`
      });
    }
    
    console.log(`✅ 成功獲取部門 ID ${department_id}`);
    
    res.json({
      success: true,
      message: '成功獲取部門資料',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('❌ 獲取部門錯誤:', error);
    res.status(500).json({
      success: false,
      message: '獲取部門資料失敗',
      error: process.env.NODE_ENV === 'development' ? error.message : '內部伺服器錯誤'
    });
  }
};

// 新增部門
const createDepartment = async (req, res) => {
  try {
    const { department_id, department_name, department_head } = req.body;
    console.log(`📥 請求：新增部門 ${department_name}`);
    
    // 驗證數據
    const validationErrors = validateDepartmentData(req.body);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: '數據驗證失敗',
        errors: validationErrors
      });
    }
    
    // 檢查部門ID是否已存在
    const existingDeptById = await query(
      'SELECT department_id FROM department WHERE department_id = $1',
      [department_id]
    );
    
    if (existingDeptById.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: `部門 ID ${department_id} 已存在`
      });
    }
    
    // 檢查部門名稱是否已存在
    const existingDeptByName = await query(
      'SELECT department_id FROM department WHERE department_name = $1',
      [department_name]
    );
    
    if (existingDeptByName.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: `部門名稱「${department_name}」已存在`
      });
    }
    
    const result = await query(`
      INSERT INTO department (department_id, department_name, department_head)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [department_id, department_name, department_head]);
    
    console.log(`✅ 成功新增部門 ID ${result.rows[0].department_id}`);
    
    res.status(201).json({
      success: true,
      message: '部門新增成功',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('❌ 新增部門錯誤:', error);
    
    // 處理特定的PostgreSQL錯誤
    if (error.code === '23505') { // 唯一性約束違反
      return res.status(400).json({
        success: false,
        message: '部門ID或部門名稱已存在'
      });
    }
    
    res.status(500).json({
      success: false,
      message: '新增部門失敗',
      error: process.env.NODE_ENV === 'development' ? error.message : '內部伺服器錯誤'
    });
  }
};

// 更新部門
const updateDepartment = async (req, res) => {
  try {
    const { department_id } = req.params;
    const { department_name, department_head } = req.body;
    console.log(`📥 請求：更新部門 ID ${department_id}`);
    
    // 驗證數據（更新時不需要驗證department_id）
    const validationErrors = validateDepartmentData(req.body, true);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: '數據驗證失敗',
        errors: validationErrors
      });
    }
    
    // 檢查部門是否存在
    const existingDepartment = await query(
      'SELECT department_name FROM department WHERE department_id = $1',
      [department_id]
    );
    
    if (existingDepartment.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `找不到部門 ID ${department_id}`
      });
    }
    
    // 檢查部門名稱是否已被其他部門使用
    const duplicateCheck = await query(
      'SELECT department_id FROM department WHERE department_name = $1 AND department_id != $2',
      [department_name, department_id]
    );
    
    if (duplicateCheck.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: `部門名稱「${department_name}」已存在於其他部門`
      });
    }
    
    const result = await query(`
      UPDATE department
      SET department_name = $1, department_head = $2
      WHERE department_id = $3
      RETURNING *
    `, [department_name, department_head, department_id]);
    
    console.log(`✅ 成功更新部門 ID ${department_id}`);
    
    res.json({
      success: true,
      message: '部門更新成功',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('❌ 更新部門錯誤:', error);
    
    // 處理特定的PostgreSQL錯誤
    if (error.code === '23505') {
      return res.status(400).json({
        success: false,
        message: '部門名稱已存在'
      });
    }
    
    res.status(500).json({
      success: false,
      message: '更新部門失敗',
      error: process.env.NODE_ENV === 'development' ? error.message : '內部伺服器錯誤'
    });
  }
};

// 刪除部門
const deleteDepartment = async (req, res) => {
  try {
    const { department_id } = req.params;
    console.log(`📥 請求：刪除部門 ID ${department_id}`);
    
    if (!department_id) {
      return res.status(400).json({
        success: false,
        message: '部門ID為必填參數'
      });
    }
    
    // 檢查部門是否存在
    const existingDepartment = await query(
      'SELECT department_name FROM department WHERE department_id = $1',
      [department_id]
    );
    
    if (existingDepartment.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `找不到部門 ID ${department_id}`
      });
    }
    
    // 檢查是否有職位屬於此部門
    const positionCheck = await query(
      'SELECT COUNT(*) as count FROM position WHERE department_id = $1',
      [department_id]
    );
    
    const positionCount = parseInt(positionCheck.rows[0].count);
    if (positionCount > 0) {
      return res.status(400).json({
        success: false,
        message: `無法刪除部門，該部門仍有 ${positionCount} 個職位`
      });
    }
    
    const result = await query(`
      DELETE FROM department
      WHERE department_id = $1
      RETURNING *
    `, [department_id]);
    
    console.log(`✅ 成功刪除部門 ID ${department_id} (${existingDepartment.rows[0].department_name})`);
    
    res.json({
      success: true,
      message: `部門「${existingDepartment.rows[0].department_name}」(ID: ${department_id}) 已成功刪除`
    });
  } catch (error) {
    console.error('❌ 刪除部門錯誤:', error);
    
    // 處理外鍵約束錯誤
    if (error.code === '23503') {
      return res.status(400).json({
        success: false,
        message: '無法刪除部門，該部門正被其他記錄引用'
      });
    }
    
    res.status(500).json({
      success: false,
      message: '刪除部門失敗',
      error: process.env.NODE_ENV === 'development' ? error.message : '內部伺服器錯誤'
    });
  }
};

module.exports = {
  getAllDepartments,
  getDepartmentById,
  createDepartment,
  updateDepartment,
  deleteDepartment
};