// controllers/holidayController.js
const { query } = require('../config/database');

console.log('🏖️  Loading Holiday Management Controller...');

// Helper function: Validate holiday data
const validateHolidayData = (data) => {
  const errors = [];
  
  if (!data.staff_id || data.staff_id === '') {
    errors.push('Staff ID is required');
  }
  
  if (!data.leave_type || !data.leave_type.trim()) {
    errors.push('Leave type is required');
  }
  
  if (!data.start_date) {
    errors.push('Start date is required');
  }
  
  if (!data.end_date) {
    errors.push('End date is required');
  }
  
  if (!data.reason || !data.reason.trim()) {
    errors.push('Leave reason is required');
  }
  
  // Validate date logic
  if (data.start_date && data.end_date) {
    const startDate = new Date(data.start_date);
    const endDate = new Date(data.end_date);
    
    if (startDate > endDate) {
      errors.push('Start date cannot be later than end date');
    }
  }
  
  // Validate leave type
  const validLeaveTypes = ['sick_leave', 'annual_leave', 'casual_leave', 'maternity_leave', 'paternity_leave'];
  if (data.leave_type && !validLeaveTypes.includes(data.leave_type)) {
    errors.push('Invalid leave type');
  }
  
  return errors;
};

// 1. Get all staff leave quotas
const getAllStaffLeaveQuotas = async (req, res) => {
  try {
    console.log('📥 Request: Get all staff leave quotas');
    
    const { leave_year = new Date().getFullYear(), department_id } = req.query;
    
    let queryText = `
      SELECT 
        l.staff_id,
        s.name as staff_name,
        s.email as staff_email,
        d.department_name,
        p.title as position_title,
        l.leave_year,
        -- Sick leave
        l.sick_leave_enabled,
        l.sl_quota,
        l.sl_used,
        (l.sl_quota - l.sl_used) as sl_remaining,
        -- Annual leave
        l.annual_leave_enabled,
        l.al_quota,
        l.al_used,
        (l.al_quota - l.al_used) as al_remaining,
        -- Casual leave
        l.casual_leave_enabled,
        l.cl_quota,
        l.cl_used,
        (l.cl_quota - l.cl_used) as cl_remaining,
        -- Maternity leave
        l.maternity_leave_enabled,
        l.ml_quota,
        l.ml_used,
        (l.ml_quota - l.ml_used) as ml_remaining,
        -- Paternity leave
        l.paternity_leave_enabled,
        l.pl_quota,
        l.pl_used,
        (l.pl_quota - l.pl_used) as pl_remaining,
        l.last_quota_update,
        l.created_at,
        l.updated_at
      FROM leave l
      LEFT JOIN staff s ON l.staff_id = s.staff_id
      LEFT JOIN department d ON s.position_id = (SELECT position_id FROM position WHERE staff_id = s.staff_id LIMIT 1)
      LEFT JOIN position p ON s.position_id = p.position_id
      WHERE l.leave_year = $1
    `;
    
    const queryParams = [leave_year];
    let paramCount = 1;
    
    if (department_id) {
      paramCount++;
      queryText += ` AND d.department_id = $${paramCount}`;
      queryParams.push(department_id);
    }
    
    queryText += ` ORDER BY s.name ASC`;
    
    const result = await query(queryText, queryParams);
    
    console.log(`✅ Successfully retrieved leave quotas for ${result.rows.length} staff members`);
    
    res.json({
      success: true,
      message: `Successfully retrieved leave quotas for ${result.rows.length} staff members`,
      data: result.rows,
      count: result.rows.length,
      leave_year: parseInt(leave_year)
    });
  } catch (error) {
    console.error('❌ Error retrieving staff leave quotas:', error);
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
    
    console.log(`📥 Request: Get leave quota for staff ${staff_id}`);
    
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
        l.sick_leave_enabled,
        l.sl_quota,
        l.sl_used,
        (l.sl_quota - l.sl_used) as sl_remaining,
        -- Annual leave
        l.annual_leave_enabled,
        l.al_quota,
        l.al_used,
        (l.al_quota - l.al_used) as al_remaining,
        -- Casual leave
        l.casual_leave_enabled,
        l.cl_quota,
        l.cl_used,
        (l.cl_quota - l.cl_used) as cl_remaining,
        -- Maternity leave
        l.maternity_leave_enabled,
        l.ml_quota,
        l.ml_used,
        (l.ml_quota - l.ml_used) as ml_remaining,
        -- Paternity leave
        l.paternity_leave_enabled,
        l.pl_quota,
        l.pl_used,
        (l.pl_quota - l.pl_used) as pl_remaining,
        l.last_quota_update,
        l.created_at,
        l.updated_at
      FROM leave l
      LEFT JOIN staff s ON l.staff_id = s.staff_id
      LEFT JOIN department d ON s.position_id = (SELECT position_id FROM position WHERE staff_id = s.staff_id LIMIT 1)
      LEFT JOIN position p ON s.position_id = p.position_id
      WHERE l.staff_id = $1 AND l.leave_year = $2
    `, [staff_id, leave_year]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Leave record not found for staff ${staff_id} in year ${leave_year}`
      });
    }
    
    console.log(`✅ Successfully retrieved leave quota for staff ${staff_id}`);
    
    res.json({
      success: true,
      message: 'Successfully retrieved staff leave quota',
      data: result.rows[0],
      leave_year: parseInt(leave_year)
    });
  } catch (error) {
    console.error('❌ Error retrieving staff leave quota:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve staff leave quota',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// 3. Get all leave requests
const getAllLeaveRequests = async (req, res) => {
  try {
    console.log('📥 Request: Get all leave requests');
    
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
      LEFT JOIN department d ON s.position_id = (SELECT position_id FROM position WHERE staff_id = s.staff_id LIMIT 1)
      LEFT JOIN position p ON s.position_id = p.position_id
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
      queryText += ` AND lr.staff_id = $${paramCount}`;
      queryParams.push(staff_id);
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
      countQuery += ` AND lr.staff_id = $${countParamCount}`;
      countParams.push(staff_id);
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
    
    console.log(`✅ Successfully retrieved ${result.rows.length} leave requests (total ${totalCount})`);
    
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
    console.error('❌ Error retrieving leave requests:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve leave requests',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// 4. Get pending leave requests
const getPendingLeaveRequests = async (req, res) => {
  try {
    console.log('📥 Request: Get pending leave requests');
    
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
      LEFT JOIN department d ON s.position_id = (SELECT position_id FROM position WHERE staff_id = s.staff_id LIMIT 1)
      LEFT JOIN position p ON s.position_id = p.position_id
      WHERE lr.status = 'Pending'
      ORDER BY lr.applied_on ASC, lr.request_id ASC
    `);
    
    console.log(`✅ Successfully retrieved ${result.rows.length} pending leave requests`);
    
    res.json({
      success: true,
      message: `Successfully retrieved ${result.rows.length} pending leave requests`,
      data: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('❌ Error retrieving pending leave requests:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve pending leave requests',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// 5. Submit leave request
const submitLeaveRequest = async (req, res) => {
  try {
    const { 
      staff_id, 
      leave_type, 
      start_date, 
      end_date, 
      reason, 
      emergency_contact, 
      medical_certificate = false 
    } = req.body;
    
    console.log(`📥 Request: Submit leave request - Staff ${staff_id}`);
    
    // Validate data
    const validationErrors = validateHolidayData(req.body);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Data validation failed',
        errors: validationErrors
      });
    }
    
    // Check if staff exists
    const staffCheck = await query(
      'SELECT name, email FROM staff WHERE staff_id = $1',
      [staff_id]
    );
    
    if (staffCheck.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: `Staff ID ${staff_id} does not exist`
      });
    }
    
    // Use database function to submit leave request
    const result = await query(`
      SELECT * FROM submit_leave_request($1, $2, $3, $4, $5, $6, $7)
    `, [staff_id, leave_type, start_date, end_date, reason, emergency_contact, medical_certificate]);
    
    const submitResult = result.rows[0];
    
    if (!submitResult.success) {
      return res.status(400).json({
        success: false,
        message: submitResult.message
      });
    }
    
    console.log(`✅ Successfully submitted leave request ID ${submitResult.request_id}`);
    
    // Get complete request record
    const requestDetail = await query(`
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
        lr.emergency_contact,
        lr.medical_certificate
      FROM leave_requests lr
      LEFT JOIN staff s ON lr.staff_id = s.staff_id
      WHERE lr.request_id = $1
    `, [submitResult.request_id]);
    
    res.status(201).json({
      success: true,
      message: submitResult.message,
      data: requestDetail.rows[0] || submitResult
    });
  } catch (error) {
    console.error('❌ Error submitting leave request:', error);
    
    res.status(500).json({
      success: false,
      message: 'Failed to submit leave request',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// 6. Process leave request (approve/reject)
const processLeaveRequest = async (req, res) => {
  try {
    const { request_id } = req.params;
    const { action, approver_id, comments } = req.body; // action: 'Approved' or 'Rejected'
    
    console.log(`📥 Request: ${action} leave request ID ${request_id}`);
    
    if (!action || !['Approved', 'Rejected'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'Action must be Approved or Rejected'
      });
    }
    
    if (!approver_id) {
      return res.status(400).json({
        success: false,
        message: 'Approver ID is required'
      });
    }
    
    // Check if approver exists
    const approverCheck = await query(
      'SELECT name FROM staff WHERE staff_id = $1',
      [approver_id]
    );
    
    if (approverCheck.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: `Approver ID ${approver_id} does not exist`
      });
    }
    
    // Use database function to process leave request
    const result = await query(`
      SELECT * FROM process_leave_request($1, $2, $3, $4)
    `, [request_id, approver_id, action, comments || null]);
    
    const processResult = result.rows[0];
    
    if (!processResult.success) {
      return res.status(400).json({
        success: false,
        message: processResult.message
      });
    }
    
    console.log(`✅ Successfully ${action === 'Approved' ? 'approved' : 'rejected'} leave request ID ${request_id}`);
    
    // Get updated request record
    const requestDetail = await query(`
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
        approver.name as approved_by_name,
        lr.approved_on,
        lr.rejection_reason,
        lr.emergency_contact,
        lr.medical_certificate
      FROM leave_requests lr
      LEFT JOIN staff s ON lr.staff_id = s.staff_id
      LEFT JOIN staff approver ON lr.approved_by = approver.staff_id
      WHERE lr.request_id = $1
    `, [request_id]);
    
    res.json({
      success: true,
      message: processResult.message,
      data: requestDetail.rows[0]
    });
  } catch (error) {
    console.error('❌ Error processing leave request:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process leave request',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// 7. Cancel leave request (by staff member)
const cancelLeaveRequest = async (req, res) => {
  try {
    const { request_id } = req.params;
    const { staff_id, reason = 'Cancelled by staff' } = req.body;
    
    console.log(`📥 Request: Cancel leave request ID ${request_id}`);
    
    if (!staff_id) {
      return res.status(400).json({
        success: false,
        message: 'Staff ID is required'
      });
    }
    
    // Use database function to cancel leave request
    const result = await query(`
      SELECT * FROM cancel_leave_request($1, $2, $3)
    `, [request_id, staff_id, reason]);
    
    const cancelResult = result.rows[0];
    
    if (!cancelResult.success) {
      return res.status(400).json({
        success: false,
        message: cancelResult.message
      });
    }
    
    console.log(`✅ Successfully cancelled leave request ID ${request_id}`);
    
    res.json({
      success: true,
      message: cancelResult.message
    });
  } catch (error) {
    console.error('❌ Error cancelling leave request:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel leave request',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// 8. Get leave request history
const getLeaveRequestHistory = async (req, res) => {
  try {
    const { request_id } = req.params;
    
    console.log(`📥 Request: Get leave request ${request_id} history`);
    
    const result = await query(`
      SELECT 
        lrh.history_id,
        lrh.request_id,
        lrh.action,
        lrh.performed_by,
        performer.name as performed_by_name,
        lrh.action_date,
        lrh.old_status,
        lrh.new_status,
        lrh.comments
      FROM leave_request_history lrh
      LEFT JOIN staff performer ON lrh.performed_by = performer.staff_id
      WHERE lrh.request_id = $1
      ORDER BY lrh.action_date ASC
    `, [request_id]);
    
    console.log(`✅ Successfully retrieved ${result.rows.length} history records`);
    
    res.json({
      success: true,
      message: `Successfully retrieved leave request history`,
      data: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('❌ Error retrieving leave request history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve leave request history',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// 9. Get leave statistics
const getLeaveStatistics = async (req, res) => {
  try {
    const { leave_year = new Date().getFullYear(), department_id } = req.query;
    
    console.log('📥 Request: Get leave statistics');
    
    // Basic statistics
    let statsQuery = `
      SELECT 
        COUNT(DISTINCT lr.request_id) as total_requests,
        COUNT(DISTINCT CASE WHEN lr.status = 'Pending' THEN lr.request_id END) as pending_requests,
        COUNT(DISTINCT CASE WHEN lr.status = 'Approved' THEN lr.request_id END) as approved_requests,
        COUNT(DISTINCT CASE WHEN lr.status = 'Rejected' THEN lr.request_id END) as rejected_requests,
        COUNT(DISTINCT CASE WHEN lr.status = 'Cancelled' THEN lr.request_id END) as cancelled_requests,
        AVG(CASE WHEN lr.status = 'Approved' THEN lr.total_days END) as avg_approved_days,
        SUM(CASE WHEN lr.status = 'Approved' THEN lr.total_days ELSE 0 END) as total_approved_days
      FROM leave_requests lr
      LEFT JOIN staff s ON lr.staff_id = s.staff_id
      WHERE EXTRACT(YEAR FROM lr.start_date) = $1
    `;
    
    const statsParams = [leave_year];
    let paramCount = 1;
    
    if (department_id) {
      paramCount++;
      statsQuery += ` AND s.position_id IN (SELECT position_id FROM position WHERE department_id = $${paramCount})`;
      statsParams.push(department_id);
    }
    
    const statsResult = await query(statsQuery, statsParams);
    
    // Statistics by leave type
    let typeStatsQuery = `
      SELECT 
        lr.leave_type,
        COUNT(*) as request_count,
        COUNT(CASE WHEN lr.status = 'Approved' THEN 1 END) as approved_count,
        SUM(CASE WHEN lr.status = 'Approved' THEN lr.total_days ELSE 0 END) as total_approved_days
      FROM leave_requests lr
      LEFT JOIN staff s ON lr.staff_id = s.staff_id
      WHERE EXTRACT(YEAR FROM lr.start_date) = $1
    `;
    
    const typeStatsParams = [leave_year];
    let typeParamCount = 1;
    
    if (department_id) {
      typeParamCount++;
      typeStatsQuery += ` AND s.position_id IN (SELECT position_id FROM position WHERE department_id = $${typeParamCount})`;
      typeStatsParams.push(department_id);
    }
    
    typeStatsQuery += ` GROUP BY lr.leave_type ORDER BY request_count DESC`;
    
    const typeStatsResult = await query(typeStatsQuery, typeStatsParams);
    
    // Monthly statistics (current year)
    const monthlyStatsResult = await query(`
      SELECT 
        EXTRACT(MONTH FROM lr.start_date) as month,
        COUNT(*) as request_count,
        COUNT(CASE WHEN lr.status = 'Approved' THEN 1 END) as approved_count,
        SUM(CASE WHEN lr.status = 'Approved' THEN lr.total_days ELSE 0 END) as total_approved_days
      FROM leave_requests lr
      WHERE EXTRACT(YEAR FROM lr.start_date) = $1
      GROUP BY EXTRACT(MONTH FROM lr.start_date)
      ORDER BY month ASC
    `, [leave_year]);
    
    console.log('✅ Successfully retrieved leave statistics');
    
    res.json({
      success: true,
      message: 'Successfully retrieved leave statistics',
      data: {
        overview: statsResult.rows[0],
        by_type: typeStatsResult.rows,
        by_month: monthlyStatsResult.rows,
        leave_year: parseInt(leave_year)
      }
    });
  } catch (error) {
    console.error('❌ Error retrieving leave statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve leave statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// 10. Check leave eligibility
const checkLeaveEligibility = async (req, res) => {
  try {
    const { staff_id, leave_type, requested_days, leave_year = new Date().getFullYear() } = req.query;
    
    console.log(`📥 Request: Check ${leave_type} eligibility for staff ${staff_id}`);
    
    if (!staff_id || !leave_type || !requested_days) {
      return res.status(400).json({
        success: false,
        message: 'Staff ID, leave type, and requested days are required parameters'
      });
    }
    
    // Use database function to check leave eligibility
    const result = await query(`
      SELECT * FROM check_leave_eligibility($1, $2, $3, $4)
    `, [staff_id, leave_type, parseInt(requested_days), leave_year]);
    
    const eligibilityResult = result.rows[0];
    
    console.log(`✅ Successfully checked leave eligibility - ${eligibilityResult.eligible ? 'Eligible' : 'Not eligible'}`);
    
    res.json({
      success: true,
      message: 'Successfully checked leave eligibility',
      data: {
        staff_id: parseInt(staff_id),
        leave_type,
        requested_days: parseInt(requested_days),
        leave_year: parseInt(leave_year),
        eligible: eligibilityResult.eligible,
        available_quota: eligibilityResult.available_quota,
        message: eligibilityResult.message
      }
    });
  } catch (error) {
    console.error('❌ Error checking leave eligibility:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check leave eligibility',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// 11. Initialize staff leave quota (for new staff or new year)
const initializeStaffLeaveQuota = async (req, res) => {
  try {
    const { staff_id, leave_year = new Date().getFullYear() } = req.body;
    
    console.log(`📥 Request: Initialize leave quota for staff ${staff_id} in year ${leave_year}`);
    
    if (!staff_id) {
      return res.status(400).json({
        success: false,
        message: 'Staff ID is required'
      });
    }
    
    // Check if staff exists
    const staffCheck = await query(
      'SELECT name, hire_date FROM staff WHERE staff_id = $1',
      [staff_id]
    );
    
    if (staffCheck.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: `Staff ID ${staff_id} does not exist`
      });
    }
    
    // Check if record already exists for this year
    const existingRecord = await query(
      'SELECT staff_id FROM leave WHERE staff_id = $1 AND leave_year = $2',
      [staff_id, leave_year]
    );
    
    if (existingRecord.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Leave quota for staff ${staff_id} in year ${leave_year} already exists`
      });
    }
    
    // Create new leave quota record
    const result = await query(`
      INSERT INTO leave (
        staff_id, 
        leave_year,
        sick_leave_enabled,
        annual_leave_enabled,
        casual_leave_enabled,
        maternity_leave_enabled,
        paternity_leave_enabled,
        sl_quota,
        al_quota,
        cl_quota,
        ml_quota,
        pl_quota
      ) VALUES ($1, $2, true, false, true, false, false, 0, 0, 7, 0, 0)
      RETURNING *
    `, [staff_id, leave_year]);
    
    console.log(`✅ Successfully initialized leave quota for staff ${staff_id}`);
    
    res.status(201).json({
      success: true,
      message: 'Successfully initialized staff leave quota',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('❌ Error initializing staff leave quota:', error);
    
    if (error.code === '23505') { // Unique constraint violation
      return res.status(400).json({
        success: false,
        message: 'Leave quota for this staff in the specified year already exists'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to initialize staff leave quota',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// 12. Update staff leave quota
const updateStaffLeaveQuota = async (req, res) => {
  try {
    const { staff_id } = req.params;
    const { 
      leave_year = new Date().getFullYear(),
      sick_leave_enabled,
      annual_leave_enabled,
      casual_leave_enabled,
      maternity_leave_enabled,
      paternity_leave_enabled,
      sl_quota,
      al_quota,
      cl_quota,
      ml_quota,
      pl_quota
    } = req.body;
    
    console.log(`📥 Request: Update leave quota for staff ${staff_id}`);
    
    // Check if record exists
    const existingRecord = await query(
      'SELECT staff_id FROM leave WHERE staff_id = $1 AND leave_year = $2',
      [staff_id, leave_year]
    );
    
    if (existingRecord.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Leave record not found for staff ${staff_id} in year ${leave_year}`
      });
    }
    
    // Build update query
    let updateFields = [];
    let updateValues = [];
    let paramCount = 0;
    
    if (sick_leave_enabled !== undefined) {
      paramCount++;
      updateFields.push(`sick_leave_enabled = ${paramCount}`);
      updateValues.push(sick_leave_enabled);
    }
    
    if (annual_leave_enabled !== undefined) {
      paramCount++;
      updateFields.push(`annual_leave_enabled = ${paramCount}`);
      updateValues.push(annual_leave_enabled);
    }
    
    if (casual_leave_enabled !== undefined) {
      paramCount++;
      updateFields.push(`casual_leave_enabled = ${paramCount}`);
      updateValues.push(casual_leave_enabled);
    }
    
    if (maternity_leave_enabled !== undefined) {
      paramCount++;
      updateFields.push(`maternity_leave_enabled = ${paramCount}`);
      updateValues.push(maternity_leave_enabled);
    }
    
    if (paternity_leave_enabled !== undefined) {
      paramCount++;
      updateFields.push(`paternity_leave_enabled = ${paramCount}`);
      updateValues.push(paternity_leave_enabled);
    }
    
    if (sl_quota !== undefined) {
      paramCount++;
      updateFields.push(`sl_quota = ${paramCount}`);
      updateValues.push(parseInt(sl_quota));
    }
    
    if (al_quota !== undefined) {
      paramCount++;
      updateFields.push(`al_quota = ${paramCount}`);
      updateValues.push(parseInt(al_quota));
    }
    
    if (cl_quota !== undefined) {
      paramCount++;
      updateFields.push(`cl_quota = ${paramCount}`);
      updateValues.push(parseInt(cl_quota));
    }
    
    if (ml_quota !== undefined) {
      paramCount++;
      updateFields.push(`ml_quota = ${paramCount}`);
      updateValues.push(parseInt(ml_quota));
    }
    
    if (pl_quota !== undefined) {
      paramCount++;
      updateFields.push(`pl_quota = ${paramCount}`);
      updateValues.push(parseInt(pl_quota));
    }
    
    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields provided for update'
      });
    }
    
    // Add update timestamp
    paramCount++;
    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    
    paramCount++;
    updateFields.push(`last_quota_update = CURRENT_DATE`);
    
    // Add WHERE condition parameters
    paramCount++;
    updateValues.push(staff_id);
    
    paramCount++;
    updateValues.push(leave_year);
    
    const updateQuery = `
      UPDATE leave 
      SET ${updateFields.join(', ')}
      WHERE staff_id = ${paramCount - 1} AND leave_year = ${paramCount}
      RETURNING *
    `;
    
    const result = await query(updateQuery, updateValues);
    
    console.log(`✅ Successfully updated leave quota for staff ${staff_id}`);
    
    res.json({
      success: true,
      message: 'Successfully updated staff leave quota',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('❌ Error updating staff leave quota:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update staff leave quota',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// 13. Get specific leave request details
const getLeaveRequestDetail = async (req, res) => {
  try {
    const { request_id } = req.params;
    
    console.log(`📥 Request: Get leave request ${request_id} details`);
    
    const result = await query(`
      SELECT 
        lr.request_id,
        lr.staff_id,
        s.name as staff_name,
        s.email as staff_email,
        s.phone_number as staff_phone,
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
      LEFT JOIN department d ON s.position_id = (SELECT position_id FROM position WHERE staff_id = s.staff_id LIMIT 1)
      LEFT JOIN position p ON s.position_id = p.position_id
      WHERE lr.request_id = $1
    `, [request_id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Leave request ID ${request_id} not found`
      });
    }
    
    console.log(`✅ Successfully retrieved leave request ${request_id} details`);
    
    res.json({
      success: true,
      message: 'Successfully retrieved leave request details',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('❌ Error retrieving leave request details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve leave request details',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

module.exports = {
  getAllStaffLeaveQuotas,
  getStaffLeaveQuota,
  getAllLeaveRequests,
  getPendingLeaveRequests,
  submitLeaveRequest,
  processLeaveRequest,
  cancelLeaveRequest,
  getLeaveRequestHistory,
  getLeaveStatistics,
  checkLeaveEligibility,
  initializeStaffLeaveQuota,
  updateStaffLeaveQuota,
  getLeaveRequestDetail
};