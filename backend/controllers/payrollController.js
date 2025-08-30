const { query } = require('../config/database');

console.log('💰 Loading payroll controller...');

const validatePayrollData = (data, isUpdate = false) => {
  const errors = [];

  if (!data.staff_id || data.staff_id === '') {
    errors.push('Staff ID is required');
  }

  if (!data.period_start) {
    errors.push('Period start date is required');
  }

  if (!data.period_end) {
    errors.push('Period end date is required');
  }

  if (data.total_salary !== undefined && (typeof data.total_salary !== 'number' || data.total_salary < 0)) {
    errors.push('Total salary must be a non-negative number');
  }

  return errors;
};

// Get all payrolls
const getAllPayrolls = async (req, res) => {
  try {
    console.log('📥 Request: Get all payrolls');

    const result = await query(`
      SELECT 
        p.payroll_id,
        p.staff_id,
        st.name AS staff_name,
        pos.title AS position_title,
        p.period_start,
        p.period_end,
        p.total_salary,
        p.status,
        p.created_at,
        COUNT(pd.detail_id) as component_count
      FROM payroll p
      JOIN staff st ON p.staff_id = st.staff_id
      LEFT JOIN position pos ON st.position_id = pos.position_id
      LEFT JOIN payroll_detail pd ON p.payroll_id = pd.payroll_id
      GROUP BY p.payroll_id, st.name, pos.title
      ORDER BY p.created_at DESC
    `);

    res.json({
      success: true,
      message: `Successfully retrieved ${result.rows.length} payroll records`,
      data: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('❌ Error retrieving payroll list:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get payroll by ID with details
const getPayrollById = async (req, res) => {
  try {
    const { payroll_id } = req.params;
    console.log(`📥 Request: Get payroll ID ${payroll_id}`);

    // Get payroll main record
    const payrollResult = await query(`
      SELECT 
        p.payroll_id,
        p.staff_id,
        st.name AS staff_name,
        pos.title AS position_title,
        p.period_start,
        p.period_end,
        p.total_salary,
        p.status,
        p.created_at
      FROM payroll p
      JOIN staff st ON p.staff_id = st.staff_id
      LEFT JOIN position pos ON st.position_id = pos.position_id
      WHERE p.payroll_id = $1
    `, [payroll_id]);

    if (payrollResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Payroll record not found' });
    }

    // Get payroll details
    const detailsResult = await query(`
      SELECT 
        detail_id,
        component_name,
        amount,
        component_type
      FROM payroll_detail
      WHERE payroll_id = $1
      ORDER BY component_type DESC, component_name
    `, [payroll_id]);

    const payroll = payrollResult.rows[0];
    payroll.details = detailsResult.rows;

    res.json({ success: true, data: payroll });
  } catch (error) {
    console.error('❌ Error retrieving payroll:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get payrolls by staff ID
const getPayrollsByStaffId = async (req, res) => {
  try {
    const { staff_id } = req.params;
    console.log(`📥 Request: Get payrolls for staff ID ${staff_id}`);

    const result = await query(`
      SELECT 
        p.payroll_id,
        p.staff_id,
        st.name AS staff_name,
        pos.title AS position_title,
        p.period_start,
        p.period_end,
        p.total_salary,
        p.status,
        p.created_at
      FROM payroll p
      JOIN staff st ON p.staff_id = st.staff_id
      LEFT JOIN position pos ON st.position_id = pos.position_id
      WHERE p.staff_id = $1
      ORDER BY p.period_start DESC
    `, [staff_id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: `No payroll records found for staff ID ${staff_id}` });
    }

    res.json({ success: true, data: result.rows, count: result.rows.length });
  } catch (error) {
    console.error('❌ Error retrieving staff payrolls:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create payroll with details
const createPayroll = async (req, res) => {
  try {
    const { staff_id, period_start, period_end, status, details } = req.body;
    console.log('📥 Request: Create new payroll', req.body);

    const payrollData = { staff_id, period_start, period_end, status };
    const errors = validatePayrollData(payrollData, false);
    if (errors.length > 0) {
      return res.status(400).json({ success: false, message: errors.join(', '), errors });
    }

    // Check if staff exists
    const staffCheck = await query('SELECT staff_id FROM staff WHERE staff_id = $1', [staff_id]);
    if (staffCheck.rows.length === 0) {
      return res.status(400).json({ success: false, message: 'Staff member not found' });
    }

    // Start transaction
    await query('BEGIN');

    try {
      // Calculate total salary from details
      const totalSalary = details ? details.reduce((sum, detail) => {
        return sum + (detail.component_type === 'earning' ? detail.amount : -detail.amount);
      }, 0) : 0;

      // Create payroll record
      const payrollResult = await query(`
        INSERT INTO payroll (staff_id, period_start, period_end, total_salary, status)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING payroll_id, staff_id, period_start, period_end, total_salary, status, created_at
      `, [staff_id, period_start, period_end, totalSalary, status || 'draft']);

      const newPayroll = payrollResult.rows[0];

      // Insert payroll details if provided
      if (details && details.length > 0) {
        for (const detail of details) {
          await query(`
            INSERT INTO payroll_detail (payroll_id, component_name, amount, component_type)
            VALUES ($1, $2, $3, $4)
          `, [newPayroll.payroll_id, detail.component_name, detail.amount, detail.component_type]);
        }
      }

      await query('COMMIT');

      console.log('✅ Payroll created successfully:', newPayroll);
      res.status(201).json({ 
        success: true, 
        message: 'Payroll created successfully',
        data: newPayroll 
      });
    } catch (error) {
      await query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('❌ Error creating payroll:', error);
    if (error.code === '23503') {
      res.status(400).json({ success: false, message: 'Invalid staff ID provided' });
    } else {
      res.status(500).json({ success: false, message: error.message });
    }
  }
};

// Update payroll
const updatePayroll = async (req, res) => {
  try {
    const { payroll_id } = req.params;
    const { staff_id, period_start, period_end, status, details } = req.body;
    console.log(`📥 Request: Update payroll ID ${payroll_id}`, req.body);

    const payrollData = { staff_id, period_start, period_end, status };
    const errors = validatePayrollData(payrollData, true);
    if (errors.length > 0) {
      return res.status(400).json({ success: false, message: errors.join(', '), errors });
    }

    // Check if record exists
    const existingRecord = await query('SELECT payroll_id FROM payroll WHERE payroll_id = $1', [payroll_id]);
    if (existingRecord.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Payroll record not found' });
    }

    await query('BEGIN');

    try {
      // Calculate total salary from details
      const totalSalary = details ? details.reduce((sum, detail) => {
        return sum + (detail.component_type === 'earning' ? detail.amount : -detail.amount);
      }, 0) : 0;

      // Update payroll record
      const result = await query(`
        UPDATE payroll
        SET staff_id = $1, period_start = $2, period_end = $3, 
            total_salary = $4, status = $5
        WHERE payroll_id = $6
        RETURNING payroll_id, staff_id, period_start, period_end, total_salary, status, created_at
      `, [staff_id, period_start, period_end, totalSalary, status, payroll_id]);

      // Delete existing details and insert new ones
      if (details) {
        await query('DELETE FROM payroll_detail WHERE payroll_id = $1', [payroll_id]);
        
        for (const detail of details) {
          await query(`
            INSERT INTO payroll_detail (payroll_id, component_name, amount, component_type)
            VALUES ($1, $2, $3, $4)
          `, [payroll_id, detail.component_name, detail.amount, detail.component_type]);
        }
      }

      await query('COMMIT');

      console.log('✅ Payroll updated successfully:', result.rows[0]);
      res.json({ 
        success: true, 
        message: 'Payroll updated successfully',
        data: result.rows[0] 
      });
    } catch (error) {
      await query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('❌ Error updating payroll:', error);
    if (error.code === '23503') {
      res.status(400).json({ success: false, message: 'Invalid staff ID provided' });
    } else {
      res.status(500).json({ success: false, message: error.message });
    }
  }
};

// Delete payroll
const deletePayroll = async (req, res) => {
  try {
    const { payroll_id } = req.params;
    console.log(`📥 Request: Delete payroll ID ${payroll_id}`);

    await query('BEGIN');

    try {
      // Delete details first (due to foreign key constraint)
      await query('DELETE FROM payroll_detail WHERE payroll_id = $1', [payroll_id]);
      
      // Delete payroll record
      const result = await query('DELETE FROM payroll WHERE payroll_id = $1 RETURNING *', [payroll_id]);

      if (result.rows.length === 0) {
        await query('ROLLBACK');
        return res.status(404).json({ success: false, message: 'Payroll record not found' });
      }

      await query('COMMIT');

      console.log('✅ Payroll deleted successfully');
      res.json({ 
        success: true, 
        message: 'Payroll deleted successfully', 
        data: result.rows[0] 
      });
    } catch (error) {
      await query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('❌ Error deleting payroll:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update payroll status
const updatePayrollStatus = async (req, res) => {
  try {
    const { payroll_id } = req.params;
    const { status } = req.body;
    console.log(`📥 Request: Update payroll status ID ${payroll_id} to ${status}`);

    if (!['draft', 'confirmed', 'paid'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status. Must be draft, confirmed, or paid' });
    }

    const result = await query(`
      UPDATE payroll 
      SET status = $1 
      WHERE payroll_id = $2 
      RETURNING payroll_id, status
    `, [status, payroll_id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Payroll record not found' });
    }

    console.log('✅ Payroll status updated successfully');
    res.json({ 
      success: true, 
      message: 'Payroll status updated successfully',
      data: result.rows[0] 
    });
  } catch (error) {
    console.error('❌ Error updating payroll status:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getAllPayrolls,
  getPayrollById,
  getPayrollsByStaffId,
  createPayroll,
  updatePayroll,
  deletePayroll,
  updatePayrollStatus
};