const { query } = require('../config/database');

console.log('💰 Loading salary controller...');

const validateSalaryData = (data, isUpdate = false, skipSalaryId = false) => {
  const errors = [];
  
  if (!skipSalaryId && !isUpdate && (!data.salary_id || data.salary_id === '')) {
    errors.push('Salary ID is required');
  }
  
  if (!data.staff_id || data.staff_id === '') {
    errors.push('Staff ID is required');
  }
  
  // Remove position_id validation
  
  if (typeof data.basic_salary !== 'number' || data.basic_salary <= 0) {
    errors.push('Basic salary must be a positive number');
  }
  
  // Validate allowance fields (optional, but if provided must be non-negative)
  const allowanceFields = ['al_allowance', 'sl_allowance', 'ml_allowance', 'pl_allowance', 'cl_deduction'];
  allowanceFields.forEach(field => {
    if (data[field] !== undefined && (typeof data[field] !== 'number' || data[field] < 0)) {
      errors.push(`${field} must be a non-negative number`);
    }
  });
  
  // Validate payment card fields
  if (data.card_number && typeof data.card_number !== 'string') {
    errors.push('Card number must be a string format');
  }
  
  if (data.card_name && typeof data.card_name !== 'string') {
    errors.push('Card name must be a string format');
  }
  
  if (data.bank_name && !['hsbc', 'hang_seng_bank', 'bank_of_china', 'standard_chartered', 'citibank', 'dbs_bank', 'icbc', 'boc_hong_kong', 'china_construction_bank', 'agricultural_bank_of_china', 'other'].includes(data.bank_name)) {
    errors.push('Bank name must be a valid option');
  }
  
  return errors;
};

// Get all salaries
const getAllSalaries = async (req, res) => {
  try {
    console.log('📥 Request: Get all salaries');
    
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
    
    console.log(`✅ Successfully retrieved ${result.rows.length} salary records`);
    
    res.json({
      success: true,
      message: `Successfully retrieved ${result.rows.length} salary records`,
      data: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('❌ Error retrieving salary list:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve salary data',
      error: error.message
    });
  }
};

const getSalaryById = async (req, res) => {
  try {
    const { salary_id } = req.params;
    console.log(`📥 Request: Get salary ID ${salary_id}`);
    
    // Validate ID format - support S1xxx format
    if (!/^S1\d{3}$/.test(salary_id)) {
      return res.status(400).json({
        success: false,
        message: 'Salary ID format is incorrect, should be S1xxx format'
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
        message: 'Salary record not found'
      });
    }
    
    console.log(`✅ Successfully retrieved salary ID ${salary_id}`);
    
    res.json({
      success: true,
      message: 'Successfully retrieved salary data',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('❌ Error retrieving salary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve salary data',
      error: error.message
    });
  }
};

// Get salaries by staff ID
const getSalariesByStaffId = async (req, res) => {
  try {
    const { staff_id } = req.params;
    console.log(`📥 Request: Get salaries for staff ID ${staff_id}`);
    
    // Validate ID format
    if (!/^\d+$/.test(staff_id)) {
      return res.status(400).json({
        success: false,
        message: 'Staff ID must be numeric'
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
        message: `No salary records found for staff ID ${staff_id}`
      });
    }
    
    console.log(`✅ Successfully retrieved salary for staff ID ${staff_id}, total ${result.rows.length} records`);
    
    res.json({
      success: true,
      message: 'Successfully retrieved staff salary data',
      data: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('❌ Error retrieving staff salary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve staff salary data',
      error: error.message
    });
  }
};

const createSalary = async (req, res) => {
  try {
    const salaryData = req.body;
    console.log('📥 Request: Create new salary', salaryData);
    
    // Remove salary_id from validation since it's auto-generated
    const errors = validateSalaryData(salaryData, false, true); // true = skip salary_id check
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Salary data validation failed',
        errors
      });
    }
    
    // Check if staff already has a salary record
    const existingStaffResult = await query('SELECT salary_id FROM salary WHERE staff_id = $1', [salaryData.staff_id]);
    if (existingStaffResult.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'This staff member already has a salary record'
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
    
    console.log(`✅ Successfully created salary ID ${result.rows[0].salary_id}`);
    
    res.status(201).json({
      success: true,
      message: 'Salary created successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('❌ Error creating salary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create salary',
      error: error.message
    });
  }
};

const updateSalary = async (req, res) => {
  try {
    const { salary_id } = req.params;
    const salaryData = req.body;
    console.log(`📥 Request: Update salary ID ${salary_id}`, salaryData);
    
    // Validate ID format
    if (!/^S1\d{3}$/.test(salary_id)) {
      return res.status(400).json({
        success: false,
        message: 'Salary ID format is incorrect, should be S1xxx format'
      });
    }
    
    const errors = validateSalaryData(salaryData, true);
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Salary data validation failed',
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
        message: 'Salary record not found'
      });
    }
    
    console.log(`✅ Successfully updated salary ID ${salary_id}`);
    
    res.json({
      success: true,
      message: 'Salary updated successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('❌ Error updating salary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update salary',
      error: error.message
    });
  }
};

const deleteSalary = async (req, res) => {
  try {
    const { salary_id } = req.params;
    console.log(`📥 Request: Delete salary ID ${salary_id}`);
    
    // Validate ID format
    if (!/^S1\d{3}$/.test(salary_id)) {
      return res.status(400).json({
        success: false,
        message: 'Salary ID format is incorrect, should be S1xxx format'
      });
    }
    
    const result = await query('DELETE FROM salary WHERE salary_id = $1 RETURNING *', [salary_id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Salary record not found'
      });
    }
    
    console.log(`✅ Successfully deleted salary ID ${salary_id}`);
    
    res.json({
      success: true,
      message: 'Salary deleted successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('❌ Error deleting salary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete salary',
      error: error.message
    });
  }
};

// Keep original staffCheck function but rename to avoid confusion
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