// controllers/leaveController.js
const { query } = require('../config/database');
const { 
  calculateTotalDays, 
  formatLeaveRequest, 
  checkLeaveConflict, 
  checkStaffExists
} = require('../utils/leaveUtilities');

const LEAVE_TYPE_MAPPING = {
  // Frontend format -> Database format
  'casual_leave': 'Casual Leave',
  'sick_leave': 'Sick Leave',
  'annual_leave': 'Annual Leave',
  'maternity_leave': 'Maternity Leave',
  'paternity_leave': 'Paternity Leave',
  // Also handle database format -> display format
  'Casual Leave': 'Casual Leave',
  'Sick Leave': 'Sick Leave',
  'Annual Leave': 'Annual Leave',
  'Maternity Leave': 'Maternity Leave',
  'Paternity Leave': 'Paternity Leave'
};

/**
 * HR view all leave requests
 */
const getAllLeaveRequests = async (req, res) => {
  try {
    const { status, leave_type, start_date, end_date, limit = 50, offset = 0 } = req.query;
    
    let whereConditions = [];
    let queryParams = [];
    let paramCount = 0;
    
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
    
    const result = await query(mainQuery, queryParams);
    
    const countQuery = `
      SELECT COUNT(*) as total
      FROM leave_requests lr
      LEFT JOIN staff s ON lr.staff_id = s.staff_id
      ${whereClause}
    `;
    
    const countResult = await query(countQuery, queryParams.slice(0, -2));
    const total = parseInt(countResult.rows[0].total);
    
    const formattedData = result.rows.map(row => ({
      ...row,
      leave_type_display: LEAVE_TYPE_MAPPING[row.leave_type] || row.leave_type,
      medical_certificate: Boolean(row.medical_certificate)
    }));
    
    const stats = {
      total: formattedData.length,
      pending: formattedData.filter(r => r.status === 'Pending').length,
      approved: formattedData.filter(r => r.status === 'Approved').length,
      rejected: formattedData.filter(r => r.status === 'Rejected').length
    };
    
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
    
    res.json({
      success: true,
      message: `Successfully retrieved ${formattedData.length} leave records`,
      data: formattedData,
      count: formattedData.length
    });
    
  } catch (error) {
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
    
    if (!staff_id || !leave_type || !start_date || !end_date || !reason?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Please fill in all required fields'
      });
    }
    
    const staffCheck = await query('SELECT staff_id, name FROM staff WHERE staff_id = $1', [parseInt(staff_id)]);
    if (staffCheck.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Staff does not exist'
      });
    }
    
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
    
    const totalDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
    const dbLeaveType = LEAVE_TYPE_MAPPING[leave_type] || leave_type;
    
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
    
    res.status(201).json({
      success: true,
      message: 'Leave request submitted successfully',
      data: newRequest
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to submit leave request',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * HR approve leave request - 修正假期類型匹配問題
 */
const approveLeaveRequest = async (req, res) => {
  try {
    const { request_id } = req.params;
    const { approved_by, comments } = req.body;
    
    console.log('Approving request:', { request_id, approved_by, comments });
    
    if (!approved_by) {
      return res.status(400).json({
        success: false,
        message: 'Approver ID is required'
      });
    }
    
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
    console.log('Found leave request:', leaveRequest);
    
    if (leaveRequest.status !== 'Pending') {
      return res.status(400).json({
        success: false,
        message: `Can only approve pending requests. Current status: ${leaveRequest.status}`
      });
    }
    
    // Start transaction for atomic operations
    await query('BEGIN');
    console.log('Transaction started');
    
    try {
      // Update request status
      const result = await query(`
        UPDATE leave_requests 
        SET status = 'Approved', 
            approved_by = $1, 
            approved_on = CURRENT_TIMESTAMP
        WHERE request_id = $2
        RETURNING *
      `, [parseInt(approved_by), parseInt(request_id)]);
      
      console.log('Leave request updated:', result.rows[0]);
      
      // 修正假期類型匹配邏輯
      const leaveType = leaveRequest.leave_type;
      const totalDays = leaveRequest.total_days;
      const staffId = leaveRequest.staff_id;
      
      console.log('Updating leave balance:', { leaveType, totalDays, staffId });
      
      let updateQuery = '';
      let leaveColumn = '';
      
      // 處理兩種格式的假期類型
      switch (leaveType.toLowerCase()) {
        case 'annual leave':
        case 'annual_leave':
          updateQuery = 'UPDATE leave SET al_used = COALESCE(al_used, 0) + $1 WHERE staff_id = $2';
          leaveColumn = 'annual leave';
          break;
        case 'sick leave':
        case 'sick_leave':
          updateQuery = 'UPDATE leave SET sl_used = COALESCE(sl_used, 0) + $1 WHERE staff_id = $2';
          leaveColumn = 'sick leave';
          break;
        case 'casual leave':
        case 'casual_leave':
          updateQuery = 'UPDATE leave SET cl_used = COALESCE(cl_used, 0) + $1 WHERE staff_id = $2';
          leaveColumn = 'casual leave';
          break;
        case 'maternity leave':
        case 'maternity_leave':
          updateQuery = 'UPDATE leave SET ml_used = COALESCE(ml_used, 0) + $1 WHERE staff_id = $2';
          leaveColumn = 'maternity leave';
          break;
        case 'paternity leave':
        case 'paternity_leave':
          updateQuery = 'UPDATE leave SET pl_used = COALESCE(pl_used, 0) + $1 WHERE staff_id = $2';
          leaveColumn = 'paternity leave';
          break;
        default:
          console.log('Unknown leave type, skipping balance update:', leaveType);
          break;
      }
      
      if (updateQuery) {
        console.log(`Updating ${leaveColumn} balance: +${totalDays} days for staff ${staffId}`);
        
        // 先檢查員工是否有假期記錄
        const leaveCheck = await query('SELECT * FROM leave WHERE staff_id = $1', [staffId]);
        console.log('Leave record check:', leaveCheck.rows);
        
        if (leaveCheck.rows.length === 0) {
          throw new Error(`Staff ${staffId} does not have a leave balance record. Please create one first.`);
        }
        
        const balanceResult = await query(updateQuery, [totalDays, staffId]);
        console.log('Balance update result:', {
          rowCount: balanceResult.rowCount,
          command: balanceResult.command
        });
        
        // 驗證更新是否成功
        if (balanceResult.rowCount === 0) {
          throw new Error(`Failed to update leave balance for staff ${staffId}. No matching record found.`);
        }
        
        // 驗證更新後的餘額
        const updatedBalance = await query('SELECT * FROM leave WHERE staff_id = $1', [staffId]);
        console.log('Updated balance:', updatedBalance.rows[0]);
        
      } else {
        console.log('No balance update needed for leave type:', leaveType);
      }
      
      // Commit transaction
      await query('COMMIT');
      console.log('Transaction committed successfully');
      
      const updatedRequest = result.rows[0];
      updatedRequest.staff_name = leaveRequest.staff_name;
      updatedRequest.leave_type_display = LEAVE_TYPE_MAPPING[updatedRequest.leave_type] || updatedRequest.leave_type;
      
      res.json({
        success: true,
        message: updateQuery ? 
          `Leave request approved and ${leaveColumn} balance updated (+${totalDays} days)` : 
          'Leave request approved (no balance update)',
        data: updatedRequest
      });
      
    } catch (transactionError) {
      // Rollback transaction on error
      await query('ROLLBACK');
      console.error('Transaction rolled back due to error:', transactionError);
      throw transactionError;
    }
    
  } catch (error) {
    console.error('Error in approveLeaveRequest:', error);
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
    
    if (!rejected_by || !reason?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Rejector ID and rejection reason are required'
      });
    }
    
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
    
    res.json({
      success: true,
      message: 'Leave request rejected',
      data: updatedRequest
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to reject leave request',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * Staff cancel leave request - 也需要處理配額還原
 */
const cancelLeaveRequest = async (req, res) => {
  try {
    const { request_id } = req.params;
    const { staff_id, reason } = req.body;
    
    if (!staff_id) {
      return res.status(400).json({
        success: false,
        message: 'Staff ID is required'
      });
    }
    
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
    
    if (leaveRequest.status !== 'Pending' && leaveRequest.status !== 'Approved') {
      return res.status(400).json({
        success: false,
        message: `Can only cancel pending or approved requests. Current status: ${leaveRequest.status}`
      });
    }
    
    // Start transaction for atomic operations
    await query('BEGIN');
    
    try {
      // Update request status
      const result = await query(`
        UPDATE leave_requests 
        SET status = 'Cancelled',
            rejection_reason = $1
        WHERE request_id = $2
        RETURNING *
      `, [reason || 'Staff initiated cancellation', parseInt(request_id)]);
      
      // If the request was previously approved, we need to restore the leave balance
      if (leaveRequest.status === 'Approved') {
        const leaveType = leaveRequest.leave_type;
        const totalDays = leaveRequest.total_days;
        const staffIdValue = leaveRequest.staff_id;
        
        let updateQuery = '';
        
        switch (leaveType) {
          case 'Annual Leave':
            updateQuery = 'UPDATE leave SET al_used = GREATEST(0, al_used - $1) WHERE staff_id = $2';
            break;
          case 'Sick Leave':
            updateQuery = 'UPDATE leave SET sl_used = GREATEST(0, sl_used - $1) WHERE staff_id = $2';
            break;
          case 'Casual Leave':
            updateQuery = 'UPDATE leave SET cl_used = GREATEST(0, cl_used - $1) WHERE staff_id = $2';
            break;
          case 'Maternity Leave':
            updateQuery = 'UPDATE leave SET ml_used = GREATEST(0, ml_used - $1) WHERE staff_id = $2';
            break;
          case 'Paternity Leave':
            updateQuery = 'UPDATE leave SET pl_used = GREATEST(0, pl_used - $1) WHERE staff_id = $2';
            break;
          default:
            // Unknown leave type, skip balance update
            break;
        }
        
        if (updateQuery) {
          await query(updateQuery, [totalDays, staffIdValue]);
        }
      }
      
      // Commit transaction
      await query('COMMIT');
      
      const updatedRequest = result.rows[0];
      updatedRequest.staff_name = leaveRequest.staff_name;
      updatedRequest.leave_type_display = LEAVE_TYPE_MAPPING[updatedRequest.leave_type] || updatedRequest.leave_type;
      
      res.json({
        success: true,
        message: leaveRequest.status === 'Approved' 
          ? 'Leave request cancelled and balance restored' 
          : 'Leave request cancelled',
        data: updatedRequest
      });
      
    } catch (transactionError) {
      // Rollback transaction on error
      await query('ROLLBACK');
      throw transactionError;
    }
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to cancel leave request',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * Get all leave quotas
 */ 
const getAllLeaveQuotas = async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        l.staff_id,
        s.name as staff_name,
        l.al_quota, l.al_used, (COALESCE(l.al_quota, 0) - COALESCE(l.al_used, 0)) as al_remaining,
        l.sl_quota, l.sl_used, (COALESCE(l.sl_quota, 0) - COALESCE(l.sl_used, 0)) as sl_remaining,
        l.cl_quota, l.cl_used, (COALESCE(l.cl_quota, 0) - COALESCE(l.cl_used, 0)) as cl_remaining,
        l.ml_quota, l.ml_used, (COALESCE(l.ml_quota, 0) - COALESCE(l.ml_used, 0)) as ml_remaining,
        l.pl_quota, l.pl_used, (COALESCE(l.pl_quota, 0) - COALESCE(l.pl_used, 0)) as pl_remaining
      FROM leave l
      LEFT JOIN staff s ON l.staff_id = s.staff_id
      ORDER BY l.staff_id ASC
    `); 
    
    res.json({
      success: true,
      message: `Successfully retrieved ${result.rows.length} leave quotas`,
      data: result.rows
    });
  } catch (error) {
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
      return res.status(404).json({
        success: false,
        message: 'Leave quota record not found for this staff member'
      });
    }
    
    res.json({
      success: true,
      message: 'Successfully retrieved leave quota',
      data: result.rows[0]
    });
    
  } catch (error) {
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