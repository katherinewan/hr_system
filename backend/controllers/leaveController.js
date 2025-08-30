// controllers/leaveController.js - Leave Management Controller (Complete Fixed Version)
const { query } = require('../config/database');
const { 
  calculateTotalDays, 
  formatLeaveRequest, 
  checkLeaveConflict, 
  checkStaffExists
} = require('../utils/leaveUtilities');

console.log('Loading leave management controller...');

// Leave type mappings - matching your database
const LEAVE_TYPE_MAPPING = {
  'casual_leave': 'Casual Leave',
  'sick_leave': 'Sick Leave',
  'annual_leave': 'Annual Leave',
  'maternity_leave': 'Maternity Leave',
  'paternity_leave': 'Paternity Leave'
};

// ===== Main Functions =====

/**
 * HR view all leave requests
 */
const getAllLeaveRequests = async (req, res) => {
  try {
    console.log('Getting all leave requests...');
    const { status, leave_type, start_date, end_date, limit = 50, offset = 0 } = req.query;
    
    let whereConditions = [];
    let queryParams = [];
    let paramCount = 0;
    
    // Build filter conditions
    if (status) {
      paramCount++;
      whereConditions.push(`lr.status = $${paramCount}`);
      queryParams.push(status);
    }
    
    if (leave_type) {
      paramCount++;
      whereConditions.push(`lr.leave_type = $${paramCount}`);
      queryParams.push(leave_type);
    }
    
    if (start_date) {
      paramCount++;
      whereConditions.push(`lr.start_date >= $${paramCount}`);
      queryParams.push(start_date);
    }
    
    if (end_date) {
      paramCount++;
      whereConditions.push(`lr.end_date <= $${paramCount}`);
      queryParams.push(end_date);
    }
    
    const whereClause = whereConditions.length > 0 ? 
      'WHERE ' + whereConditions.join(' AND ') : '';
    
    // Simplified query to avoid JOIN issues
    const mainQuery = `
      SELECT 
        lr.request_id,
        lr.staff_id,
        s.name as staff_name,
        lr.leave_type,
        lr.start_date,
        lr.end_date,
        lr.total_days,
        lr.reason,
        lr.status,
        lr.applied_on,
        lr.approved_by,
        lr.approved_on,
        lr.rejection_reason,
        lr.medical_certificate
      FROM leave_requests lr
      LEFT JOIN staff s ON lr.staff_id = s.staff_id
      ${whereClause}
      ORDER BY 
        CASE lr.status 
          WHEN 'Pending' THEN 1 
          WHEN 'Approved' THEN 2 
          WHEN 'Rejected' THEN 3 
          ELSE 4 
        END,
        lr.applied_on DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;
    
    queryParams.push(parseInt(limit), parseInt(offset));
    
    console.log('Executing query:', mainQuery);
    console.log('With params:', queryParams);
    
    const result = await query(mainQuery, queryParams);
    
    // Get total count - simplified
    const countQuery = `
      SELECT COUNT(*) as total
      FROM leave_requests lr
      LEFT JOIN staff s ON lr.staff_id = s.staff_id
      ${whereClause}
    `;
    
    const countResult = await query(countQuery, queryParams.slice(0, -2));
    const total = parseInt(countResult.rows[0].total);
    
    // Format the data
    const formattedData = result.rows.map(row => ({
      ...row,
      leave_type_display: LEAVE_TYPE_MAPPING[row.leave_type] || row.leave_type,
      medical_certificate: Boolean(row.medical_certificate)
    }));
    
    // Statistics
    const stats = {
      total: formattedData.length,
      pending: formattedData.filter(r => r.status === 'Pending').length,
      approved: formattedData.filter(r => r.status === 'Approved').length,
      rejected: formattedData.filter(r => r.status === 'Rejected').length
    };
    
    console.log(`Successfully retrieved ${formattedData.length} leave requests`);
    
    res.json({
      success: true,
      message: `Successfully retrieved ${formattedData.length} leave requests`,
      data: formattedData,
      statistics: stats,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        has_more: parseInt(offset) + parseInt(limit) < total
      }
    });
    
  } catch (error) {
    console.error('Failed to get leave requests:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get leave requests',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * Get pending leave requests only
 */
const getPendingRequests = async (req, res) => {
  try {
    console.log('Getting pending leave requests...');
    
    const result = await query(`
      SELECT 
        lr.request_id,
        lr.staff_id,
        s.name as staff_name,
        lr.leave_type,
        lr.start_date,
        lr.end_date,
        lr.total_days,
        lr.reason,
        lr.status,
        lr.applied_on
      FROM leave_requests lr
      LEFT JOIN staff s ON lr.staff_id = s.staff_id
      WHERE lr.status = 'Pending'
      ORDER BY lr.applied_on DESC
    `);
    
    const formattedData = result.rows.map(row => ({
      ...row,
      leave_type_display: LEAVE_TYPE_MAPPING[row.leave_type] || row.leave_type
    }));
    
    res.json({
      success: true,
      message: `Found ${formattedData.length} pending requests`,
      data: formattedData,
      count: formattedData.length
    });
    
  } catch (error) {
    console.error('Failed to get pending requests:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get pending requests',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * Staff view own leave records
 */
const getMyLeaveRequests = async (req, res) => {
  try {
    const { staff_id } = req.params;
    const { status, limit = 20, offset = 0 } = req.query;
    
    console.log(`Getting leave requests for staff ${staff_id}`);
    
    let whereConditions = ['lr.staff_id = $1'];
    let queryParams = [parseInt(staff_id)];
    let paramCount = 1;
    
    if (status) {
      paramCount++;
      whereConditions.push(`lr.status = $${paramCount}`);
      queryParams.push(status);
    }
    
    const whereClause = 'WHERE ' + whereConditions.join(' AND ');
    
    const result = await query(`
      SELECT 
        lr.request_id,
        lr.staff_id,
        s.name as staff_name,
        lr.leave_type,
        lr.start_date,
        lr.end_date,
        lr.total_days,
        lr.reason,
        lr.status,
        lr.applied_on,
        lr.approved_by,
        lr.approved_on,
        lr.rejection_reason,
        lr.medical_certificate
      FROM leave_requests lr
      LEFT JOIN staff s ON lr.staff_id = s.staff_id
      ${whereClause}
      ORDER BY lr.applied_on DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `, [...queryParams, parseInt(limit), parseInt(offset)]);
    
    if (result.rows.length === 0) {
      return res.json({
        success: true,
        message: 'No leave records found',
        data: [],
        count: 0
      });
    }
    
    const formattedData = result.rows.map(row => ({
      ...row,
      leave_type_display: LEAVE_TYPE_MAPPING[row.leave_type] || row.leave_type,
      medical_certificate: Boolean(row.medical_certificate)
    }));
    
    console.log(`Successfully retrieved ${formattedData.length} leave records for staff ${staff_id}`);
    
    res.json({
      success: true,
      message: `Successfully retrieved ${formattedData.length} leave records`,
      data: formattedData,
      count: formattedData.length
    });
    
  } catch (error) {
    console.error('Failed to get staff leave records:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get leave records',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * Staff submit leave request
 */
const submitLeaveRequest = async (req, res) => {
  try {
    const { staff_id, leave_type, start_date, end_date, reason, medical_certificate } = req.body;
    
    console.log('Submitting leave request:', { staff_id, leave_type, start_date, end_date });
    
    // Basic validation
    if (!staff_id || !leave_type || !start_date || !end_date || !reason?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Please fill in all required fields'
      });
    }
    
    // Validate staff exists
    const staffCheck = await query('SELECT staff_id, name FROM staff WHERE staff_id = $1', [parseInt(staff_id)]);
    if (staffCheck.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Staff does not exist'
      });
    }
    
    // Validate dates
    const startDate = new Date(start_date);
    const endDate = new Date(end_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (startDate < today) {
      return res.status(400).json({
        success: false,
        message: 'Start date cannot be in the past'
      });
    }
    
    if (startDate > endDate) {
      return res.status(400).json({
        success: false,
        message: 'Start date cannot be later than end date'
      });
    }
    
    // Calculate days (simple version)
    const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
    
    // Convert frontend leave type to database format
    const dbLeaveType = LEAVE_TYPE_MAPPING[leave_type] || leave_type;
    
    // Create request
    const result = await query(`
      INSERT INTO leave_requests (
        staff_id, leave_type, start_date, end_date, total_days,
        reason, medical_certificate, status, applied_on
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'Pending', CURRENT_TIMESTAMP)
      RETURNING request_id, staff_id, leave_type, start_date, end_date, 
                total_days, reason, medical_certificate, status, applied_on
    `, [
      parseInt(staff_id), dbLeaveType, start_date, end_date, 
      totalDays, reason.trim(), medical_certificate || false
    ]);
    
    const newRequest = result.rows[0];
    newRequest.staff_name = staffCheck.rows[0].name;
    newRequest.leave_type_display = dbLeaveType;
    
    console.log(`Staff ${staff_id} submitted a new leave request - ID: ${newRequest.request_id}`);
    
    res.status(201).json({
      success: true,
      message: 'Leave request submitted successfully',
      data: newRequest
    });
    
  } catch (error) {
    console.error('Failed to submit leave request:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit leave request',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * HR approve leave request
 */
const approveLeaveRequest = async (req, res) => {
  try {
    const { request_id } = req.params;
    const { approved_by, comments } = req.body;
    
    console.log(`Approving leave request ${request_id} by ${approved_by}`);
    
    if (!approved_by) {
      return res.status(400).json({
        success: false,
        message: 'Approver ID is required'
      });
    }
    
    // Check if request exists and is pending
    const requestCheck = await query(`
      SELECT lr.*, s.name as staff_name 
      FROM leave_requests lr
      LEFT JOIN staff s ON lr.staff_id = s.staff_id
      WHERE lr.request_id = $1
    `, [parseInt(request_id)]);
    
    if (requestCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Leave request not found'
      });
    }
    
    const leaveRequest = requestCheck.rows[0];
    
    if (leaveRequest.status !== 'Pending') {
      return res.status(400).json({
        success: false,
        message: `Can only approve pending requests. Current status: ${leaveRequest.status}`
      });
    }
    
    // Update request status
    const result = await query(`
      UPDATE leave_requests 
      SET status = 'Approved', 
          approved_by = $1, 
          approved_on = CURRENT_TIMESTAMP,
          rejection_reason = $2
      WHERE request_id = $3
      RETURNING *
    `, [parseInt(approved_by), comments, parseInt(request_id)]);
    
    const updatedRequest = result.rows[0];
    updatedRequest.staff_name = leaveRequest.staff_name;
    updatedRequest.leave_type_display = LEAVE_TYPE_MAPPING[updatedRequest.leave_type] || updatedRequest.leave_type;
    
    console.log(`Leave request ${request_id} approved successfully`);
    
    res.json({
      success: true,
      message: 'Leave request approved',
      data: updatedRequest
    });
    
  } catch (error) {
    console.error('Failed to approve leave request:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to approve leave request',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * HR reject leave request
 */
const rejectLeaveRequest = async (req, res) => {
  try {
    const { request_id } = req.params;
    const { rejected_by, reason } = req.body;
    
    console.log(`Rejecting leave request ${request_id} by ${rejected_by}`);
    
    if (!rejected_by || !reason?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Rejector ID and rejection reason are required'
      });
    }
    
    // Check if request exists and is pending
    const requestCheck = await query(`
      SELECT lr.*, s.name as staff_name 
      FROM leave_requests lr
      LEFT JOIN staff s ON lr.staff_id = s.staff_id
      WHERE lr.request_id = $1
    `, [parseInt(request_id)]);
    
    if (requestCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Leave request not found'
      });
    }
    
    const leaveRequest = requestCheck.rows[0];
    
    if (leaveRequest.status !== 'Pending') {
      return res.status(400).json({
        success: false,
        message: `Can only reject pending requests. Current status: ${leaveRequest.status}`
      });
    }
    
    // Update request status
    const result = await query(`
      UPDATE leave_requests 
      SET status = 'Rejected', 
          approved_by = $1, 
          approved_on = CURRENT_TIMESTAMP,
          rejection_reason = $2
      WHERE request_id = $3
      RETURNING *
    `, [parseInt(rejected_by), reason.trim(), parseInt(request_id)]);
    
    const updatedRequest = result.rows[0];
    updatedRequest.staff_name = leaveRequest.staff_name;
    updatedRequest.leave_type_display = LEAVE_TYPE_MAPPING[updatedRequest.leave_type] || updatedRequest.leave_type;
    
    console.log(`Leave request ${request_id} rejected successfully`);
    
    res.json({
      success: true,
      message: 'Leave request rejected',
      data: updatedRequest
    });
    
  } catch (error) {
    console.error('Failed to reject leave request:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to reject leave request',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * Staff cancel leave request
 */
const cancelLeaveRequest = async (req, res) => {
  try {
    const { request_id } = req.params;
    const { staff_id, reason } = req.body;
    
    console.log(`Staff ${staff_id} cancelling leave request ${request_id}`);
    
    if (!staff_id) {
      return res.status(400).json({
        success: false,
        message: 'Staff ID is required'
      });
    }
    
    // Check if request exists and belongs to the staff
    const requestCheck = await query(`
      SELECT lr.*, s.name as staff_name 
      FROM leave_requests lr
      LEFT JOIN staff s ON lr.staff_id = s.staff_id
      WHERE lr.request_id = $1 AND lr.staff_id = $2
    `, [parseInt(request_id), parseInt(staff_id)]);
    
    if (requestCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Leave request not found or does not belong to this staff member'
      });
    }
    
    const leaveRequest = requestCheck.rows[0];
    
    if (leaveRequest.status !== 'Pending') {
      return res.status(400).json({
        success: false,
        message: `Can only cancel pending requests. Current status: ${leaveRequest.status}`
      });
    }
    
    // Update request status
    const result = await query(`
      UPDATE leave_requests 
      SET status = 'Cancelled',
          rejection_reason = $1
      WHERE request_id = $2
      RETURNING *
    `, [reason || 'Staff initiated cancellation', parseInt(request_id)]);
    
    const updatedRequest = result.rows[0];
    updatedRequest.staff_name = leaveRequest.staff_name;
    updatedRequest.leave_type_display = LEAVE_TYPE_MAPPING[updatedRequest.leave_type] || updatedRequest.leave_type;
    
    console.log(`Staff ${staff_id} cancelled leave request ${request_id} successfully`);
    
    res.json({
      success: true,
      message: 'Leave request cancelled',
      data: updatedRequest
    });
    
  } catch (error) {
    console.error('Failed to cancel leave request:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel leave request',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * Get all leave quotas - HR function
 */ 
const getAllLeaveQuotas = async (req, res) => {
  try {
    console.log('Getting all leave quotas...');
    
    const result = await query(`
      SELECT 
        l.*,
        s.name as staff_name
      FROM leave l
      LEFT JOIN staff s ON l.staff_id = s.staff_id
      ORDER BY l.staff_id ASC
    `); 
    
    console.log(`Retrieved ${result.rows.length} leave quotas`);
    
    res.json({
      success: true,
      message: `Successfully retrieved ${result.rows.length} leave quotas`,
      data: result.rows
    });
  } catch (error) {
    console.error('Failed to get all leave quotas:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get quotas',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * Get staff leave quota
 */
const getMyLeaveQuota = async (req, res) => {
  try {
    const { staff_id } = req.params;
    console.log(`Getting leave quota for staff ${staff_id}`);
    
    const result = await query(`
      SELECT 
        al_quota, al_used, (COALESCE(al_quota, 0) - COALESCE(al_used, 0)) as al_remaining,
        sl_quota, sl_used, (COALESCE(sl_quota, 0) - COALESCE(sl_used, 0)) as sl_remaining,
        cl_quota, cl_used, (COALESCE(cl_quota, 0) - COALESCE(cl_used, 0)) as cl_remaining,
        ml_quota, ml_used, (COALESCE(ml_quota, 0) - COALESCE(ml_used, 0)) as ml_remaining,
        pl_quota, pl_used, (COALESCE(pl_quota, 0) - COALESCE(pl_used, 0)) as pl_remaining
      FROM leave
      WHERE staff_id = $1
    `, [parseInt(staff_id)]); 
    
    if (result.rows.length === 0) {
      console.log(`No quota record found for staff ${staff_id}`);
      return res.status(404).json({
        success: false,
        message: 'Leave quota record not found for this staff member'
      });
    }
    
    console.log(`Successfully retrieved leave quota for staff ${staff_id}`);
    
    res.json({
      success: true,
      message: 'Successfully retrieved leave quota',
      data: result.rows[0]
    });
    
  } catch (error) {
    console.error('Failed to get leave quota:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get quota',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

module.exports = {
  getAllLeaveRequests,
  getPendingRequests,
  getMyLeaveRequests,
  submitLeaveRequest,
  approveLeaveRequest,
  rejectLeaveRequest,
  cancelLeaveRequest,
  getAllLeaveQuotas,
  getMyLeaveQuota
};

console.log('Leave management controller loaded successfully!');