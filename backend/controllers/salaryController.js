const { query } = require('../config/database');

console.log('💰 載入薪資控制器...');

const validateSalaryData = (data, isUpdate = false, skipSalaryId = false) => {
  const errors = [];
  
  if (!skipSalaryId && !isUpdate && (!data.salary_id || data.salary_id === '')) {
    errors.push('薪資ID為必填項');
  }
  
  if (!data.staff_id || data.staff_id === '') {
    errors.push('員工ID為必填項');
  }
  
  // 移除 position_id 驗證
  
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
  
  // 驗證出糧卡欄位
  if (data.card_number && typeof data.card_number !== 'string') {
    errors.push('卡號碼必須是字符串格式');
  }
  
  if (data.card_name && typeof data.card_name !== 'string') {
    errors.push('卡名稱必須是字符串格式');
  }
  
  if (data.bank_name && !['hsbc', 'hang_seng_bank', 'bank_of_china', 'standard_chartered', 'citibank', 'dbs_bank', 'icbc', 'boc_hong_kong', 'china_construction_bank', 'agricultural_bank_of_china', 'other'].includes(data.bank_name)) {
    errors.push('銀行名稱必須是有效的選項');
  }
  
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
        p.title AS position_title,
        s.basic_salary,
        s.al_allowance,
        s.sl_allowance,
        s.ml_allowance,
        s.pl_allowance,
        s.cl_deduction,
        s.card_number,
        s.card_name,
        s.bank_name,
        (s.basic_salary + COALESCE(s.al_allowance, 0) + COALESCE(s.sl_allowance, 0) + 
         COALESCE(s.ml_allowance, 0) + COALESCE(s.pl_allowance, 0) - COALESCE(s.cl_deduction, 0)) AS total_salary
      FROM salary s
      JOIN staff st ON s.staff_id = st.staff_id
      LEFT JOIN position p ON st.position_id = p.position_id
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
        p.title AS position_title,
        s.basic_salary,
        s.al_allowance,
        s.sl_allowance,
        s.ml_allowance,
        s.pl_allowance,
        s.cl_deduction,
        s.card_number,
        s.card_name,
        s.bank_name,
        (s.basic_salary + COALESCE(s.al_allowance, 0) + COALESCE(s.sl_allowance, 0) + 
         COALESCE(s.ml_allowance, 0) + COALESCE(s.pl_allowance, 0) - COALESCE(s.cl_deduction, 0)) AS total_salary
      FROM salary s
      JOIN staff st ON s.staff_id = st.staff_id
      LEFT JOIN position p ON st.position_id = p.position_id
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
        p.title AS position_title,
        s.basic_salary,
        s.al_allowance,
        s.sl_allowance,
        s.ml_allowance,
        s.pl_allowance,
        s.cl_deduction,
        s.card_number,
        s.card_name,
        s.bank_name,
        (s.basic_salary + COALESCE(s.al_allowance, 0) + COALESCE(s.sl_allowance, 0) + 
         COALESCE(s.ml_allowance, 0) + COALESCE(s.pl_allowance, 0) - COALESCE(s.cl_deduction, 0)) AS total_salary
      FROM salary s
      JOIN staff st ON s.staff_id = st.staff_id
      LEFT JOIN position p ON st.position_id = p.position_id
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
    
    // Remove salary_id from validation since it's auto-generated
    const errors = validateSalaryData(salaryData, false, true); // true = skip salary_id check
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: '薪資資料驗證失敗',
        errors
      });
    }
    
    // Check if staff already has a salary record
    const existingStaffResult = await query('SELECT salary_id FROM salary WHERE staff_id = $1', [salaryData.staff_id]);
    if (existingStaffResult.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: '該員工已有薪資記錄'
      });
    }
    
    // Generate new salary_id (S + MAX + 1)
    const maxResult = await query(`
      SELECT salary_id FROM salary 
      WHERE salary_id ~ '^S1[0-9]+$' 
      ORDER BY CAST(SUBSTRING(salary_id FROM 3) AS INTEGER) DESC 
      LIMIT 1
    `);
    
    let newSalaryId;
    if (maxResult.rows.length === 0) {
      newSalaryId = 'S1001'; // First salary record
    } else {
      const maxId = maxResult.rows[0].salary_id;
      const numPart = parseInt(maxId.substring(2)) + 1;
      newSalaryId = `S1${numPart.toString().padStart(3, '0')}`;
    }
    
    const result = await query(`
      INSERT INTO salary (salary_id, staff_id, basic_salary, al_allowance, sl_allowance, ml_allowance, pl_allowance, cl_deduction, card_number, card_name, bank_name)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `, [
      newSalaryId,
      salaryData.staff_id,
      salaryData.basic_salary,
      salaryData.al_allowance || 0,
      salaryData.sl_allowance || 0,
      salaryData.ml_allowance || 0,
      salaryData.pl_allowance || 0,
      salaryData.cl_deduction || 0,
      salaryData.card_number || null,
      salaryData.card_name || null,
      salaryData.bank_name || null
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
      SET staff_id = $1, basic_salary = $2, al_allowance = $3, 
          sl_allowance = $4, ml_allowance = $5, pl_allowance = $6, cl_deduction = $7,
          card_number = $8, card_name = $9, bank_name = $10
      WHERE salary_id = $11
      RETURNING *
    `, [
      salaryData.staff_id,
      salaryData.basic_salary,
      salaryData.al_allowance || 0,
      salaryData.sl_allowance || 0,
      salaryData.ml_allowance || 0,
      salaryData.pl_allowance || 0,
      salaryData.cl_deduction || 0,
      salaryData.card_number || null,
      salaryData.card_name || null,
      salaryData.bank_name || null,
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