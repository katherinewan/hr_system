const { query } = require('../config/database');

console.log('💰 載入薪資控制器...');

const validateSalaryData = (data, isUpdate = false) => {
  const errors = [];
  
  if (!isUpdate && (!data.salary_id || data.salary_id === '')) {
    errors.push('薪資ID為必填項');
  }
  
  if (!data.staff_id || data.staff_id === '') {
    errors.push('員工ID為必填項');
  }
  
  if (!data.position_id || data.position_id === '') {
    errors.push('職位ID為必填項');
  }
  
  if (typeof data.basic_salary !== 'number' || data.basic_salary <= 0) {
    errors.push('基本薪資必須是正數');
  }
  
  // 驗證津貼欄位（可選，但如果提供必須是非負數）
  const allowanceFields = ['al_allowance', 'sl_allowance', 'ml_allowance', 'pl_allowance', 'cl_deduction'];
  allowanceFields.forEach(field => {
    if (data[field] !== undefined && (typeof data[field] !== 'number' || data[field] < 0)) {
      errors.push(`${field} 必須是非負數`);
    }
  });
  
  return errors;
};

// 獲取所有薪資
const getAllSalaries = async (req, res) => {
  try {
    console.log('📥 請求：獲取所有薪資');
    
    const result = await query(`
      SELECT 
        s.salary_id,
        s.staff_id,
        st.name AS staff_name,
        s.position_id,
        p.title AS position_title,
        s.basic_salary,
        s.al_allowance,
        s.sl_allowance,
        s.ml_allowance,
        s.pl_allowance,
        s.cl_deduction,
        (s.basic_salary + COALESCE(s.al_allowance, 0) + COALESCE(s.sl_allowance, 0) + 
         COALESCE(s.ml_allowance, 0) + COALESCE(s.pl_allowance, 0) - COALESCE(s.cl_deduction, 0)) AS total_salary
      FROM salary s
      JOIN staff st ON s.staff_id = st.staff_id
      JOIN position p ON s.position_id = p.position_id
      ORDER BY s.salary_id
    `);
    
    console.log(`✅ 成功獲取 ${result.rows.length} 條薪資記錄`);
    
    res.json({
      success: true,
      message: `成功獲取 ${result.rows.length} 條薪資資料`,
      data: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('❌ 獲取薪資列表錯誤:', error);
    res.status(500).json({
      success: false,
      message: '獲取薪資資料失敗',
      error: error.message
    });
  }
};

const getSalaryById = async (req, res) => {
  try {
    const { salary_id } = req.params;
    console.log(`📥 請求：獲取薪資 ID ${salary_id}`);
    
    // 驗證 ID 格式 - 支援 S1xxx 格式
    if (!/^S1\d{3}$/.test(salary_id)) {
      return res.status(400).json({
        success: false,
        message: '薪資 ID 格式不正確，應為 S1xxx 格式'
      });
    }
    
    const result = await query(`
      SELECT 
        s.salary_id,
        s.staff_id,
        st.name AS staff_name,
        s.position_id,
        p.title AS position_title,
        s.basic_salary,
        s.al_allowance,
        s.sl_allowance,
        s.ml_allowance,
        s.pl_allowance,
        s.cl_deduction,
        (s.basic_salary + COALESCE(s.al_allowance, 0) + COALESCE(s.sl_allowance, 0) + 
         COALESCE(s.ml_allowance, 0) + COALESCE(s.pl_allowance, 0) - COALESCE(s.cl_deduction, 0)) AS total_salary
      FROM salary s
      JOIN staff st ON s.staff_id = st.staff_id
      JOIN position p ON s.position_id = p.position_id
      WHERE s.salary_id = $1
    `, [salary_id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '未找到該薪資記錄'
      });
    }
    
    console.log(`✅ 成功獲取薪資 ID ${salary_id}`);
    
    res.json({
      success: true,
      message: '成功獲取薪資資料',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('❌ 獲取薪資錯誤:', error);
    res.status(500).json({
      success: false,
      message: '獲取薪資資料失敗',
      error: error.message
    });
  }
};

// 根據員工ID獲取薪資
const getSalariesByStaffId = async (req, res) => {
  try {
    const { staff_id } = req.params;
    console.log(`📥 請求：獲取員工 ID ${staff_id} 的薪資`);
    
    // 驗證 ID 格式
    if (!/^\d+$/.test(staff_id)) {
      return res.status(400).json({
        success: false,
        message: '員工 ID 必須是數字'
      });
    }
    
    const result = await query(`
      SELECT 
        s.salary_id,
        s.staff_id,
        st.name AS staff_name,
        s.position_id,
        p.title AS position_title,
        s.basic_salary,
        s.al_allowance,
        s.sl_allowance,
        s.ml_allowance,
        s.pl_allowance,
        s.cl_deduction,
        (s.basic_salary + COALESCE(s.al_allowance, 0) + COALESCE(s.sl_allowance, 0) + 
         COALESCE(s.ml_allowance, 0) + COALESCE(s.pl_allowance, 0) - COALESCE(s.cl_deduction, 0)) AS total_salary
      FROM salary s
      JOIN staff st ON s.staff_id = st.staff_id
      JOIN position p ON s.position_id = p.position_id
      WHERE s.staff_id = $1
    `, [staff_id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `未找到員工 ID ${staff_id} 的薪資記錄`
      });
    }
    
    console.log(`✅ 成功獲取員工 ID ${staff_id} 的薪資，共 ${result.rows.length} 筆`);
    
    res.json({
      success: true,
      message: '成功獲取員工薪資資料',
      data: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('❌ 獲取員工薪資錯誤:', error);
    res.status(500).json({
      success: false,
      message: '獲取員工薪資資料失敗',
      error: error.message
    });
  }
};

const createSalary = async (req, res) => {
  try {
    const salaryData = req.body;
    console.log('📥 請求：創建新薪資', salaryData);
    
    const errors = validateSalaryData(salaryData);
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: '薪資資料驗證失敗',
        errors
      });
    }
    
    // 檢查薪資ID是否已存在
    const existingResult = await query('SELECT salary_id FROM salary WHERE salary_id = $1', [salaryData.salary_id]);
    if (existingResult.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: '薪資ID已存在'
      });
    }
    
    const result = await query(`
      INSERT INTO salary (salary_id, staff_id, position_id, basic_salary, al_allowance, sl_allowance, ml_allowance, pl_allowance, cl_deduction)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [
      salaryData.salary_id,
      salaryData.staff_id,
      salaryData.position_id,
      salaryData.basic_salary,
      salaryData.al_allowance || 0,
      salaryData.sl_allowance || 0,
      salaryData.ml_allowance || 0,
      salaryData.pl_allowance || 0,
      salaryData.cl_deduction || 0
    ]);
    
    console.log(`✅ 成功創建薪資 ID ${result.rows[0].salary_id}`);
    
    res.status(201).json({
      success: true,
      message: '薪資創建成功',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('❌ 創建薪資錯誤:', error);
    res.status(500).json({
      success: false,
      message: '創建薪資失敗',
      error: error.message
    });
  }
};

const updateSalary = async (req, res) => {
  try {
    const { salary_id } = req.params;
    const salaryData = req.body;
    console.log(`📥 請求：更新薪資 ID ${salary_id}`, salaryData);
    
    // 驗證 ID 格式
    if (!/^S1\d{3}$/.test(salary_id)) {
      return res.status(400).json({
        success: false,
        message: '薪資 ID 格式不正確，應為 S1xxx 格式'
      });
    }
    
    const errors = validateSalaryData(salaryData, true);
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: '薪資資料驗證失敗',
        errors
      });
    }
    
    const result = await query(`
      UPDATE salary 
      SET staff_id = $1, position_id = $2, basic_salary = $3, al_allowance = $4, 
          sl_allowance = $5, ml_allowance = $6, pl_allowance = $7, cl_deduction = $8
      WHERE salary_id = $9
      RETURNING *
    `, [
      salaryData.staff_id,
      salaryData.position_id,
      salaryData.basic_salary,
      salaryData.al_allowance || 0,
      salaryData.sl_allowance || 0,
      salaryData.ml_allowance || 0,
      salaryData.pl_allowance || 0,
      salaryData.cl_deduction || 0,
      salary_id
    ]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '未找到該薪資記錄'
      });
    }
    
    console.log(`✅ 成功更新薪資 ID ${salary_id}`);
    
    res.json({
      success: true,
      message: '薪資更新成功',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('❌ 更新薪資錯誤:', error);
    res.status(500).json({
      success: false,
      message: '更新薪資失敗',
      error: error.message
    });
  }
};

const deleteSalary = async (req, res) => {
  try {
    const { salary_id } = req.params;
    console.log(`📥 請求：刪除薪資 ID ${salary_id}`);
    
    // 驗證 ID 格式
    if (!/^S1\d{3}$/.test(salary_id)) {
      return res.status(400).json({
        success: false,
        message: '薪資 ID 格式不正確，應為 S1xxx 格式'
      });
    }
    
    const result = await query('DELETE FROM salary WHERE salary_id = $1 RETURNING *', [salary_id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '未找到該薪資記錄'
      });
    }
    
    console.log(`✅ 成功刪除薪資 ID ${salary_id}`);
    
    res.json({
      success: true,
      message: '薪資刪除成功',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('❌ 刪除薪資錯誤:', error);
    res.status(500).json({
      success: false,
      message: '刪除薪資失敗',
      error: error.message
    });
  }
};

// 保留原有的 staffCheck 函數但重新命名以避免混淆
const staffCheck = getSalariesByStaffId;

module.exports = {
  getAllSalaries,
  getSalaryById,
  getSalariesByStaffId,
  createSalary,
  updateSalary,
  deleteSalary,
  staffCheck
};