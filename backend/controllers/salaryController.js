const { query } = require('../config/database');

console.log('💰 Loading salary controller...');

const validateSalaryData = (data, isUpdate = false) => {
  const errors = [];

  if (!data.staff_id || data.staff_id === '') {
    errors.push('Staff ID is required');
  }

  if (typeof data.basic_salary !== 'number' || data.basic_salary <= 0) {
    errors.push('Basic salary must be a positive number');
  }

  if (data.allowance !== undefined && (typeof data.allowance !== 'number' || data.allowance < 0)) {
    errors.push('Allowance must be a non-negative number');
  }

  if (data.deduction !== undefined && (typeof data.deduction !== 'number' || data.deduction < 0)) {
    errors.push('Deduction must be a non-negative number');
  }

  return errors;
};

// Get all salaries
const getAllSalaries = async (req, res) => {
  try {
    console.log('📥 Request: Get all salaries');

    const result = await query(`
      SELECT 
        s.structure_id,
        s.staff_id,
        st.name AS staff_name,
        p.title AS position_title,
        s.basic_salary,
        s.allowance,
        s.deduction,
        s.bank_name,
        s.bank_account,
        (s.basic_salary + COALESCE(s.allowance, 0) - COALESCE(s.deduction, 0)) AS total_salary
      FROM salary s
      JOIN staff st ON s.staff_id = st.staff_id
      LEFT JOIN position p ON st.position_id = p.position_id
      ORDER BY s.structure_id
    `);

    res.json({
      success: true,
      message: `Successfully retrieved ${result.rows.length} salary records`,
      data: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('❌ Error retrieving salary list:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get salary by structure_id
const getSalaryById = async (req, res) => {
  try {
    const { salary_id } = req.params; // Keep parameter name for route compatibility
    console.log(`📥 Request: Get salary structure_id ${salary_id}`);

    const result = await query(`
      SELECT 
        s.structure_id,
        s.staff_id,
        st.name AS staff_name,
        p.title AS position_title,
        s.basic_salary,
        s.allowance,
        s.deduction,
        s.bank_name,
        s.bank_account,
        (s.basic_salary + COALESCE(s.allowance, 0) - COALESCE(s.deduction, 0)) AS total_salary
      FROM salary s
      JOIN staff st ON s.staff_id = st.staff_id
      LEFT JOIN position p ON st.position_id = p.position_id
      WHERE s.structure_id = $1
    `, [salary_id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Salary record not found' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('❌ Error retrieving salary:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get salaries by staff ID
const getSalariesByStaffId = async (req, res) => {
  try {
    const { staff_id } = req.params;
    console.log(`📥 Request: Get salaries for staff ID ${staff_id}`);

    const result = await query(`
      SELECT 
        s.structure_id,
        s.staff_id,
        st.name AS staff_name,
        p.title AS position_title,
        s.basic_salary,
        s.allowance,
        s.deduction,
        s.bank_name,
        s.bank_account,
        (s.basic_salary + COALESCE(s.allowance, 0) - COALESCE(s.deduction, 0)) AS total_salary
      FROM salary s
      JOIN staff st ON s.staff_id = st.staff_id
      LEFT JOIN position p ON st.position_id = p.position_id
      WHERE s.staff_id = $1
      ORDER BY s.structure_id
    `, [staff_id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: `No salary records found for staff ID ${staff_id}` });
    }

    res.json({ success: true, data: result.rows, count: result.rows.length });
  } catch (error) {
    console.error('❌ Error retrieving staff salary:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create salary
const createSalary = async (req, res) => {
  try {
    const salaryData = req.body;
    console.log('📥 Request: Create new salary', salaryData);

    const errors = validateSalaryData(salaryData, false);
    if (errors.length > 0) {
      return res.status(400).json({ success: false, message: errors.join(', '), errors });
    }

    // Check if staff exists
    const staffCheck = await query('SELECT staff_id FROM staff WHERE staff_id = $1', [salaryData.staff_id]);
    if (staffCheck.rows.length === 0) {
      return res.status(400).json({ success: false, message: 'Staff member not found' });
    }

    // Check if staff already has a salary record
    const existingStaffResult = await query('SELECT structure_id FROM salary WHERE staff_id = $1', [salaryData.staff_id]);
    if (existingStaffResult.rows.length > 0) {
      return res.status(400).json({ success: false, message: 'This staff member already has a salary record' });
    }

    const result = await query(`
      INSERT INTO salary (staff_id, basic_salary, allowance, deduction, bank_name, bank_account)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING structure_id, staff_id, basic_salary, allowance, deduction, bank_name, bank_account
    `, [
      salaryData.staff_id,
      salaryData.basic_salary,
      salaryData.allowance || 0,
      salaryData.deduction || 0,
      salaryData.bank_name || null,
      salaryData.bank_account || null
    ]);

    console.log('✅ Salary created successfully:', result.rows[0]);
    res.status(201).json({ 
      success: true, 
      message: 'Salary created successfully',
      data: result.rows[0] 
    });
  } catch (error) {
    console.error('❌ Error creating salary:', error);
    if (error.code === '23505') { // Unique constraint violation
      res.status(400).json({ success: false, message: 'This staff member already has a salary record' });
    } else if (error.code === '23503') { // Foreign key constraint violation
      res.status(400).json({ success: false, message: 'Invalid staff ID provided' });
    } else {
      res.status(500).json({ success: false, message: error.message });
    }
  }
};

// Update salary
const updateSalary = async (req, res) => {
  try {
    const { salary_id } = req.params; // This is actually structure_id
    const salaryData = req.body;
    console.log(`📥 Request: Update salary structure_id ${salary_id}`, salaryData);

    const errors = validateSalaryData(salaryData, true);
    if (errors.length > 0) {
      return res.status(400).json({ success: false, message: errors.join(', '), errors });
    }

    // Check if record exists
    const existingRecord = await query('SELECT structure_id FROM salary WHERE structure_id = $1', [salary_id]);
    if (existingRecord.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Salary record not found' });
    }

    const result = await query(`
      UPDATE salary
      SET staff_id = $1, basic_salary = $2, allowance = $3, deduction = $4,
          bank_name = $5, bank_account = $6
      WHERE structure_id = $7
      RETURNING structure_id, staff_id, basic_salary, allowance, deduction, bank_name, bank_account
    `, [
      salaryData.staff_id,
      salaryData.basic_salary,
      salaryData.allowance || 0,
      salaryData.deduction || 0,
      salaryData.bank_name || null,
      salaryData.bank_account || null,
      salary_id
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Salary record not found' });
    }

    console.log('✅ Salary updated successfully:', result.rows[0]);
    res.json({ 
      success: true, 
      message: 'Salary updated successfully',
      data: result.rows[0] 
    });
  } catch (error) {
    console.error('❌ Error updating salary:', error);
    if (error.code === '23503') { // Foreign key constraint violation
      res.status(400).json({ success: false, message: 'Invalid staff ID provided' });
    } else {
      res.status(500).json({ success: false, message: error.message });
    }
  }
};

// Delete salary
const deleteSalary = async (req, res) => {
  try {
    const { salary_id } = req.params; // This is actually structure_id
    console.log(`📥 Request: Delete salary structure_id ${salary_id}`);

    const result = await query('DELETE FROM salary WHERE structure_id = $1 RETURNING *', [salary_id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Salary record not found' });
    }

    console.log('✅ Salary deleted successfully');
    res.json({ 
      success: true, 
      message: 'Salary deleted successfully', 
      data: result.rows[0] 
    });
  } catch (error) {
    console.error('❌ Error deleting salary:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getAllSalaries,
  getSalaryById,
  getSalariesByStaffId,
  createSalary,
  updateSalary,
  deleteSalary
};
