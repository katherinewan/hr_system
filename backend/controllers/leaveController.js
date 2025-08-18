// controllers/leaveController.js - Simplified Leave Management Controller
const { query } = require('../config/database');

console.log('Loading Leave Management Controller...');

// ===== LEAVE QUOTA MANAGEMENT FUNCTIONS =====

// 1. Get all staff leave quotas with search functionality
const getAllStaffLeaveQuotas = async (req, res) => {
  try {
    console.log('Request: Get all staff leave quotas');
    
    const { 
      leave_year = new Date().getFullYear(), 
      department_id, 
      staff_id,
      staff_name,
      limit = 50, 
      offset = 0 
    } = req.query;
    
    let queryText = `
      SELECT 
        l.staff_id,
        s.name as staff_name,
        s.email as staff_email,
        d.department_name,
        p.title as position_title,
        l.leave_year,
        -- Sick leave
        l.sl_quota,
        l.sl_used,
        (l.sl_quota - l.sl_used) as sl_remaining,
        -- Annual leave
        l.al_quota,
        l.al_used,
        (l.al_quota - l.al_used) as al_remaining,
        -- Casual leave
        l.cl_quota,
        l.cl_used,
        (l.cl_quota - l.cl_used) as cl_remaining,
        -- Maternity leave
        l.ml_quota,
        l.ml_used,
        (l.ml_quota - l.ml_used) as ml_remaining,
        -- Paternity leave
        l.pl_quota,
        l.pl_used,
        (l.pl_quota - l.pl_used) as pl_remaining,
        l.last_quota_update,
        l.created_at,
        l.updated_at
      FROM leave l
      LEFT JOIN staff s ON l.staff_id = s.staff_id
      LEFT JOIN position p ON s.position_id = p.position_id
      LEFT JOIN department d ON p.department_id = d.department_id
      WHERE l.leave_year = $1
    `;
    
    const queryParams = [leave_year];
    let paramCount = 1;
    
    // Add staff_id filter
    if (staff_id) {
      paramCount++;
      queryText += ` AND l.staff_id::text ILIKE $${paramCount}`;
      queryParams.push(`%${staff_id}%`);
    }
    
    // Add staff_name filter
    if (staff_name) {
      paramCount++;
      queryText += ` AND s.name ILIKE $${paramCount}`;
      queryParams.push(`%${staff_name}%`);
    }
    
    // Add department filter
    if (department_id) {
      paramCount++;
      queryText += ` AND d.department_id = $${paramCount}`;
      queryParams.push(department_id);
    }
    
    queryText += ` ORDER BY s.name ASC`;
    
    // Add pagination
    paramCount++;
    queryText += ` LIMIT $${paramCount}`;
    queryParams.push(parseInt(limit));
    
    paramCount++;
    queryText += ` OFFSET $${paramCount}`;
    queryParams.push(parseInt(offset));
    
    const result = await query(queryText, queryParams);
    
    // Get total count for pagination
    let countQuery = `
      SELECT COUNT(*) as total_count
      FROM leave l
      LEFT JOIN staff s ON l.staff_id = s.staff_id
      LEFT JOIN position p ON s.position_id = p.position_id
      LEFT JOIN department d ON p.department_id = d.department_id
      WHERE l.leave_year = $1
    `;
    
    let countParams = [leave_year];
    let countParamCount = 1;
    
    if (staff_id) {
      countParamCount++;
      countQuery += ` AND l.staff_id::text ILIKE $${countParamCount}`;
      countParams.push(`%${staff_id}%`);
    }
    
    if (staff_name) {
      countParamCount++;
      countQuery += ` AND s.name ILIKE $${countParamCount}`;
      countParams.push(`%${staff_name}%`);
    }
    
    if (department_id) {
      countParamCount++;
      countQuery += ` AND d.department_id = $${countParamCount}`;
      countParams.push(department_id);
    }
    
    const countResult = await query(countQuery, countParams);
    const totalCount = parseInt(countResult.rows[0].total_count);
    
    console.log(`Successfully retrieved leave quotas for ${result.rows.length} staff members (total ${totalCount})`);
    
    res.json({
      success: true,
      message: `Successfully retrieved leave quotas for ${result.rows.length} staff members`,
      data: result.rows,
      count: result.rows.length,
      pagination: {
        total: totalCount,
        limit: parseInt(limit),
        offset: parseInt(offset),
        has_more: parseInt(offset) + parseInt(limit) < totalCount
      },
      filters: {
        leave_year: parseInt(leave_year),
        staff_id: staff_id || null,
        staff_name: staff_name || null,
        department_id: department_id || null
      }
    });
  } catch (error) {
    console.error('Error retrieving staff leave quotas:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve staff leave quotas',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// 2. Get specific staff leave quota
const getStaffLeaveQuota = async (req, res) => {
  try {
    const { staff_id } = req.params;
    const { leave_year = new Date().getFullYear() } = req.query;
    
    console.log(`Request: Get leave quota for staff ${staff_id}`);
    
    if (!staff_id || staff_id.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Staff ID is required and cannot be empty'
      });
    }
    
    const result = await query(`
      SELECT 
        l.staff_id,
        s.name as staff_name,
        s.email as staff_email,
        s.hire_date,
        d.department_name,
        p.title as position_title,
        l.leave_year,
        -- Sick leave
        l.sl_quota,
        l.sl_used,
        (l.sl_quota - l.sl_used) as sl_remaining,
        -- Annual leave
        l.al_quota,
        l.al_used,
        (l.al_quota - l.al_used) as al_remaining,
        -- Casual leave
        l.cl_quota,
        l.cl_used,
        (l.cl_quota - l.cl_used) as cl_remaining,
        -- Maternity leave
        l.ml_quota,
        l.ml_used,
        (l.ml_quota - l.ml_used) as ml_remaining,
        -- Paternity leave
        l.pl_quota,
        l.pl_used,
        (l.pl_quota - l.pl_used) as pl_remaining,
        l.last_quota_update,
        l.created_at,
        l.updated_at
      FROM leave l
      LEFT JOIN staff s ON l.staff_id = s.staff_id
      LEFT JOIN position p ON s.position_id = p.position_id
      LEFT JOIN department d ON p.department_id = d.department_id
      WHERE l.staff_id = $1 AND l.leave_year = $2
    `, [staff_id, leave_year]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Leave record not found for staff ${staff_id} in year ${leave_year}`
      });
    }
    
    console.log(`Successfully retrieved leave quota for staff ${staff_id}`);
    
    res.json({
      success: true,
      message: 'Successfully retrieved staff leave quota',
      data: result.rows[0],
      leave_year: parseInt(leave_year)
    });
  } catch (error) {
    console.error('Error retrieving staff leave quota:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve staff leave quota',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// 3. Update staff leave quota
const updateStaffLeaveQuota = async (req, res) => {
  try {
    const { staff_id } = req.params;
    const { leave_year = new Date().getFullYear() } = req.query;
    const updateData = req.body;
    
    console.log(`Request: Update leave quota for staff ${staff_id}`);
    
    // Check if quota exists
    const existingQuota = await query(
      'SELECT * FROM leave WHERE staff_id = $1 AND leave_year = $2',
      [staff_id, leave_year]
    );
    
    if (existingQuota.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Leave quota for staff ${staff_id} in year ${leave_year} not found`
      });
    }
    
    // Build update query dynamically
    const allowedFields = [
      'sl_quota', 'al_quota', 'cl_quota', 'ml_quota', 'pl_quota'
    ];
    
    const updateFields = [];
    const updateValues = [];
    let paramCount = 0;
    
    for (const field of allowedFields) {
      if (updateData[field] !== undefined) {
        paramCount++;
        updateFields.push(`${field} = $${paramCount}`);
        updateValues.push(updateData[field]);
      }
    }
    
    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid fields provided for update'
      });
    }
    
    // Add update timestamp
    paramCount++;
    updateFields.push(`updated_at = $${paramCount}`);
    updateValues.push(new Date());
    
    paramCount++;
    updateFields.push(`last_quota_update = $${paramCount}`);
    updateValues.push(new Date());
    
    // Add WHERE conditions
    paramCount++;
    updateValues.push(staff_id);
    paramCount++;
    updateValues.push(leave_year);
    
    const updateQuery = `
      UPDATE leave 
      SET ${updateFields.join(', ')}
      WHERE staff_id = $${paramCount - 1} AND leave_year = $${paramCount}
      RETURNING *
    `;
    
    const result = await query(updateQuery, updateValues);
    
    console.log(`Successfully updated leave quota for staff ${staff_id}`);
    
    res.json({
      success: true,
      message: 'Leave quota updated successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating staff leave quota:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update staff leave quota',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// ===== LEAVE REQUEST MANAGEMENT FUNCTIONS =====

// 4. Get all leave requests
const getAllLeaveRequests = async (req, res) => {
  try {
    console.log('Request: Get all leave requests');
    
    const { status, staff_id, leave_type, start_date, end_date, limit = 50, offset = 0 } = req.query;
    
    let queryText = `
      SELECT 
        lr.request_id,
        lr.staff_id,
        s.name as staff_name,
        s.email as staff_email,
        d.department_name,
        p.title as position_title,
        lr.leave_type,
        lr.start_date,
        lr.end_date,
        lr.total_days,
        lr.reason,
        lr.status,
        lr.applied_on,
        lr.approved_by,
        approver.name as approved_by_name,
        lr.approved_on,
        lr.rejection_reason,
        lr.emergency_contact,
        lr.medical_certificate,
        lr.created_at,
        lr.updated_at
      FROM leave_requests lr
      LEFT JOIN staff s ON lr.staff_id = s.staff_id
      LEFT JOIN staff approver ON lr.approved_by = approver.staff_id
      LEFT JOIN position p ON s.position_id = p.position_id
      LEFT JOIN department d ON p.department_id = d.department_id
      WHERE 1=1
    `;
    
    const queryParams = [];
    let paramCount = 0;
    
    // Add filter conditions
    if (status) {
      paramCount++;
      queryText += ` AND lr.status = $${paramCount}`;
      queryParams.push(status);
    }
    
    if (staff_id) {
      paramCount++;
      queryText += ` AND lr.staff_id::text ILIKE ${paramCount}`;
      queryParams.push(`%${staff_id}%`);
    }
    
    if (leave_type) {
      paramCount++;
      queryText += ` AND lr.leave_type = $${paramCount}`;
      queryParams.push(leave_type);
    }
    
    if (start_date) {
      paramCount++;
      queryText += ` AND lr.start_date >= $${paramCount}`;
      queryParams.push(start_date);
    }
    
    if (end_date) {
      paramCount++;
      queryText += ` AND lr.end_date <= $${paramCount}`;
      queryParams.push(end_date);
    }
    
    queryText += ` ORDER BY lr.applied_on DESC, lr.request_id DESC`;
    
    // Add pagination
    paramCount++;
    queryText += ` LIMIT $${paramCount}`;
    queryParams.push(parseInt(limit));
    
    paramCount++;
    queryText += ` OFFSET $${paramCount}`;
    queryParams.push(parseInt(offset));
    
    const result = await query(queryText, queryParams);
    
    // Get total count
    let countQuery = `
      SELECT COUNT(*) as total_count
      FROM leave_requests lr
      LEFT JOIN staff s ON lr.staff_id = s.staff_id
      LEFT JOIN position p ON s.position_id = p.position_id
      LEFT JOIN department d ON p.department_id = d.department_id
      WHERE 1=1
    `;
    
    let countParams = [];
    let countParamCount = 0;
    
    if (status) {
      countParamCount++;
      countQuery += ` AND lr.status = $${countParamCount}`;
      countParams.push(status);
    }
    
    if (staff_id) {
      countParamCount++;
      countQuery += ` AND lr.staff_id::text ILIKE ${countParamCount}`;
      countParams.push(`%${staff_id}%`);
    }
    
    if (leave_type) {
      countParamCount++;
      countQuery += ` AND lr.leave_type = $${countParamCount}`;
      countParams.push(leave_type);
    }
    
    if (start_date) {
      countParamCount++;
      countQuery += ` AND lr.start_date >= $${countParamCount}`;
      countParams.push(start_date);
    }
    
    if (end_date) {
      countParamCount++;
      countQuery += ` AND lr.end_date <= $${countParamCount}`;
      countParams.push(end_date);
    }
    
    const countResult = await query(countQuery, countParams);
    const totalCount = parseInt(countResult.rows[0].total_count);
    
    console.log(`Successfully retrieved ${result.rows.length} leave requests (total ${totalCount})`);
    
    res.json({
      success: true,
      message: `Successfully retrieved ${result.rows.length} leave requests`,
      data: result.rows,
      pagination: {
        total: totalCount,
        limit: parseInt(limit),
        offset: parseInt(offset),
        has_more: parseInt(offset) + parseInt(limit) < totalCount
      }
    });
  } catch (error) {
    console.error('Error retrieving leave requests:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve leave requests',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// 5. Get pending leave requests
const getPendingLeaveRequests = async (req, res) => {
  try {
    console.log('Request: Get pending leave requests');
    
    const result = await query(`
      SELECT 
        lr.request_id,
        lr.staff_id,
        s.name as staff_name,
        s.email as staff_email,
        d.department_name,
        p.title as position_title,
        lr.leave_type,
        lr.start_date,
        lr.end_date,
        lr.total_days,
        lr.reason,
        lr.applied_on,
        lr.emergency_contact,
        lr.medical_certificate,
        -- Calculate days since application
        (CURRENT_DATE - lr.applied_on::date) as days_pending
      FROM leave_requests lr
      LEFT JOIN staff s ON lr.staff_id = s.staff_id
      LEFT JOIN position p ON s.position_id = p.position_id
      LEFT JOIN department d ON p.department_id = d.department_id
      WHERE lr.status = 'Pending'
      ORDER BY lr.applied_on ASC, lr.request_id ASC
    `);
    
    console.log(`Successfully retrieved ${result.rows.length} pending leave requests`);
    
    res.json({
      success: true,
      message: `Successfully retrieved ${result.rows.length} pending leave requests`,
      data: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Error retrieving pending leave requests:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve pending leave requests',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// ===== EXPORT FUNCTIONS =====
module.exports = {
  getAllStaffLeaveQuotas,
  getStaffLeaveQuota,
  updateStaffLeaveQuota,
  getAllLeaveRequests,
  getPendingLeaveRequests
};

console.log('Simplified Leave Management Controller loaded successfully!');