// controllers/leaveController.js - Complete Leave Management Controller
const { query } = require('../config/database');

console.log('Loading Leave Management Controller...');

// ===== LEAVE QUOTA MANAGEMENT FUNCTIONS =====

// 1. Get all staff leave quotas with enhanced search functionality
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
      LEFT JOIN position p ON s.position_id = p.position_id
      LEFT JOIN department d ON p.department_id = d.department_id
      WHERE l.leave_year = $1
    `;
    
    const queryParams = [leave_year];
    let paramCount = 1;
    
    // Add staff_id filter
    if (staff_id) {
      paramCount++;
      if (staff_id.includes(',')) {
        // Support multiple staff IDs (comma-separated)
        const staffIds = staff_id.split(',').map(id => id.trim()).filter(id => id);
        const placeholders = staffIds.map((_, index) => `$${paramCount + index}`).join(',');
        queryText += ` AND l.staff_id IN (${placeholders})`;
        queryParams.push(...staffIds);
        paramCount += staffIds.length - 1;
      } else {
        // Single staff ID or partial match
        queryText += ` AND l.staff_id::text ILIKE $${paramCount}`;
        queryParams.push(`%${staff_id}%`);
      }
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
    
    console.log('Query:', queryText);
    console.log('Params:', queryParams);
    
    const result = await query(queryText, queryParams);
    
    // Get total count with same filters for pagination
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
    
    // Apply same filters to count query
    if (staff_id) {
      countParamCount++;
      if (staff_id.includes(',')) {
        const staffIds = staff_id.split(',').map(id => id.trim()).filter(id => id);
        const placeholders = staffIds.map((_, index) => `$${countParamCount + index}`).join(',');
        countQuery += ` AND l.staff_id IN (${placeholders})`;
        countParams.push(...staffIds);
        countParamCount += staffIds.length - 1;
      } else {
        countQuery += ` AND l.staff_id::text ILIKE $${countParamCount}`;
        countParams.push(`%${staff_id}%`);
      }
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

// 2. Get specific staff leave quota (enhanced with better error handling)
const getStaffLeaveQuota = async (req, res) => {
  try {
    const { staff_id } = req.params;
    const { leave_year = new Date().getFullYear() } = req.query;
    
    console.log(`Request: Get leave quota for staff ${staff_id}`);
    
    // Validate staff_id format
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

// 3. Initialize staff leave quota
const initializeStaffLeaveQuota = async (req, res) => {
  try {
    const { 
      staff_id, 
      leave_year = new Date().getFullYear(),
      sl_quota = 14,
      al_quota = 14,
      cl_quota = 7,
      ml_quota = 98,
      pl_quota = 7,
      sick_leave_enabled = true,
      annual_leave_enabled = true,
      casual_leave_enabled = true,
      maternity_leave_enabled = false,
      paternity_leave_enabled = false
    } = req.body;
    
    console.log(`Request: Initialize leave quota for staff ${staff_id}`);
    
    if (!staff_id) {
      return res.status(400).json({
        success: false,
        message: 'Staff ID is required'
      });
    }
    
    // Check if staff exists
    const staffCheck = await query('SELECT staff_id FROM staff WHERE staff_id = $1', [staff_id]);
    if (staffCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Staff not found'
      });
    }
    
    // Check if quota already exists
    const existingQuota = await query(
      'SELECT staff_id FROM leave WHERE staff_id = $1 AND leave_year = $2',
      [staff_id, leave_year]
    );
    
    if (existingQuota.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: `Leave quota for staff ${staff_id} in year ${leave_year} already exists`
      });
    }
    
    const result = await query(`
      INSERT INTO leave (
        staff_id, leave_year, 
        sl_quota, sl_used, sick_leave_enabled,
        al_quota, al_used, annual_leave_enabled,
        cl_quota, cl_used, casual_leave_enabled,
        ml_quota, ml_used, maternity_leave_enabled,
        pl_quota, pl_used, paternity_leave_enabled,
        last_quota_update, created_at, updated_at
      ) VALUES (
        $1, $2, 
        $3, 0, $4,
        $5, 0, $6,
        $7, 0, $8,
        $9, 0, $10,
        $11, 0, $12,
        CURRENT_DATE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      ) RETURNING *
    `, [
      staff_id, leave_year,
      sl_quota, sick_leave_enabled,
      al_quota, annual_leave_enabled,
      cl_quota, casual_leave_enabled,
      ml_quota, maternity_leave_enabled,
      pl_quota, paternity_leave_enabled
    ]);
    
    console.log(`Successfully initialized leave quota for staff ${staff_id}`);
    
    res.status(201).json({
      success: true,
      message: 'Leave quota initialized successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error initializing staff leave quota:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to initialize staff leave quota',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// 4. Update staff leave quota
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
      'sl_quota', 'al_quota', 'cl_quota', 'ml_quota', 'pl_quota',
      'sick_leave_enabled', 'annual_leave_enabled', 'casual_leave_enabled',
      'maternity_leave_enabled', 'paternity_leave_enabled'
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
    
    // Add update timestamp and last quota update
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

// 5. Get all leave requests (keeping existing implementation)
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
    
    // Get total count with same filters
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

// ... (keeping all other existing functions unchanged)
// 6. Get pending leave requests
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

// 7. Submit leave request
const submitLeaveRequest = async (req, res) => {
  try {
    const { 
      staff_id, 
      leave_type, 
      start_date, 
      end_date, 
      reason, 
      emergency_contact,
      medical_certificate 
    } = req.body;
    
    console.log(`Request: Submit leave request for staff ${staff_id}`);
    
    // Validation
    if (!staff_id || !leave_type || !start_date || !end_date || !reason) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: staff_id, leave_type, start_date, end_date, reason'
      });
    }
    
    // Calculate total days
    const startDateObj = new Date(start_date);
    const endDateObj = new Date(end_date);
    const timeDifference = endDateObj.getTime() - startDateObj.getTime();
    const totalDays = Math.ceil(timeDifference / (1000 * 3600 * 24)) + 1;
    
    if (totalDays <= 0) {
      return res.status(400).json({
        success: false,
        message: 'End date must be after or equal to start date'
      });
    }
    
    // Check if staff exists
    const staffCheck = await query('SELECT staff_id FROM staff WHERE staff_id = $1', [staff_id]);
    if (staffCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Staff not found'
      });
    }
    
    // Insert leave request
    const result = await query(`
      INSERT INTO leave_requests (
        staff_id, leave_type, start_date, end_date, total_days, 
        reason, emergency_contact, medical_certificate, 
        status, applied_on, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, 
        'Pending', CURRENT_DATE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      ) RETURNING *
    `, [
      staff_id, leave_type, start_date, end_date, totalDays,
      reason, emergency_contact, medical_certificate
    ]);
    
    console.log(`Successfully submitted leave request for staff ${staff_id}`);
    
    res.status(201).json({
      success: true,
      message: 'Leave request submitted successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error submitting leave request:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit leave request',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// 8. Process leave request (approve/reject)
const processLeaveRequest = async (req, res) => {
  try {
    const { request_id } = req.params;
    const { action, approver_id, rejection_reason } = req.body;
    
    console.log(`Request: ${action} leave request ${request_id}`);
    
    if (!action || !['Approved', 'Rejected'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'Action must be either Approved or Rejected'
      });
    }
    
    if (!approver_id) {
      return res.status(400).json({
        success: false,
        message: 'Approver ID is required'
      });
    }
    
    if (action === 'Rejected' && !rejection_reason) {
      return res.status(400).json({
        success: false,
        message: 'Rejection reason is required when rejecting a request'
      });
    }
    
    // Use stored procedure if available, otherwise manual processing
    try {
      const result = await query(`
        SELECT * FROM process_leave_request($1, $2, $3, $4)
      `, [request_id, approver_id, action, rejection_reason || null]);
      
      const processResult = result.rows[0];
      
      if (processResult.success) {
        console.log(`Successfully ${action.toLowerCase()} leave request ${request_id}`);
        res.json({
          success: true,
          message: processResult.message,
          data: processResult
        });
      } else {
        res.status(400).json({
          success: false,
          message: processResult.message
        });
      }
    } catch (error) {
      // If stored procedure doesn't exist, use manual processing
      console.log('Stored procedure not found, using manual processing');
      
      // Get leave request details
      const requestResult = await query(`
        SELECT lr.*, s.name as staff_name 
        FROM leave_requests lr 
        LEFT JOIN staff s ON lr.staff_id = s.staff_id 
        WHERE lr.request_id = $1
      `, [request_id]);
      
      if (requestResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Leave request not found'
        });
      }
      
      const leaveRequest = requestResult.rows[0];
      
      if (leaveRequest.status !== 'Pending') {
        return res.status(400).json({
          success: false,
          message: `Leave request is already ${leaveRequest.status.toLowerCase()}`
        });
      }
      
      // Update leave request status
      const updateResult = await query(`
        UPDATE leave_requests 
        SET status = $1, approved_by = $2, approved_on = CURRENT_TIMESTAMP, 
            rejection_reason = $3, updated_at = CURRENT_TIMESTAMP
        WHERE request_id = $4
        RETURNING *
      `, [action, approver_id, rejection_reason, request_id]);
      
      // If approved, update leave quota
      if (action === 'Approved') {
        const leaveTypeMap = {
          'Sick Leave': 'sl_used',
          'Annual Leave': 'al_used',
          'Casual Leave': 'cl_used',
          'Maternity Leave': 'ml_used',
          'Paternity Leave': 'pl_used'
        };
        
        const usedField = leaveTypeMap[leaveRequest.leave_type];
        if (usedField) {
          await query(`
            UPDATE leave 
            SET ${usedField} = ${usedField} + $1, updated_at = CURRENT_TIMESTAMP
            WHERE staff_id = $2 AND leave_year = EXTRACT(YEAR FROM $3::date)
          `, [leaveRequest.total_days, leaveRequest.staff_id, leaveRequest.start_date]);
        }
      }
      
      console.log(`Successfully ${action.toLowerCase()} leave request ${request_id}`);
      
      res.json({
        success: true,
        message: `Leave request ${action.toLowerCase()} successfully`,
        data: updateResult.rows[0]
      });
    }
  } catch (error) {
    console.error(`Error processing leave request:`, error);
    res.status(500).json({
      success: false,
      message: 'Failed to process leave request',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// 9. Cancel leave request
const cancelLeaveRequest = async (req, res) => {
  try {
    const { request_id } = req.params;
    
    console.log(`Request: Cancel leave request ${request_id}`);
    
    // Get leave request details
    const requestResult = await query(`
      SELECT * FROM leave_requests WHERE request_id = $1
    `, [request_id]);
    
    if (requestResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Leave request not found'
      });
    }
    
    const leaveRequest = requestResult.rows[0];
    
    if (!['Pending', 'Approved'].includes(leaveRequest.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel a ${leaveRequest.status.toLowerCase()} leave request`
      });
    }
    
    // If approved leave is being cancelled, restore the quota
    if (leaveRequest.status === 'Approved') {
      const leaveTypeMap = {
        'Sick Leave': 'sl_used',
        'Annual Leave': 'al_used',
        'Casual Leave': 'cl_used',
        'Maternity Leave': 'ml_used',
        'Paternity Leave': 'pl_used'
      };
      
      const usedField = leaveTypeMap[leaveRequest.leave_type];
      if (usedField) {
        await query(`
          UPDATE leave 
          SET ${usedField} = GREATEST(0, ${usedField} - $1), updated_at = CURRENT_TIMESTAMP
          WHERE staff_id = $2 AND leave_year = EXTRACT(YEAR FROM $3::date)
        `, [leaveRequest.total_days, leaveRequest.staff_id, leaveRequest.start_date]);
      }
    }
    
    // Update request status to cancelled
    const result = await query(`
      UPDATE leave_requests 
      SET status = 'Cancelled', updated_at = CURRENT_TIMESTAMP
      WHERE request_id = $1
      RETURNING *
    `, [request_id]);
    
    console.log(`Successfully cancelled leave request ${request_id}`);
    
    res.json({
      success: true,
      message: 'Leave request cancelled successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error cancelling leave request:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel leave request',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// ===== STATISTICS AND UTILITY FUNCTIONS =====

// 10. Get leave request history
const getLeaveRequestHistory = async (req, res) => {
  try {
    const { request_id } = req.params;
    
    console.log(`Request: Get leave request history for ${request_id}`);
    
    // Get main request details
    const requestResult = await query(`
      SELECT 
        lr.*,
        s.name as staff_name,
        approver.name as approved_by_name,
        d.department_name
      FROM leave_requests lr
      LEFT JOIN staff s ON lr.staff_id = s.staff_id
      LEFT JOIN staff approver ON lr.approved_by = approver.staff_id
      LEFT JOIN position p ON s.position_id = p.position_id
      LEFT JOIN department d ON p.department_id = d.department_id
      WHERE lr.request_id = $1
    `, [request_id]);
    
    if (requestResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Leave request not found'
      });
    }
    
    // Get history/audit trail if available
    const historyResult = await query(`
      SELECT 
        action_type,
        action_by,
        action_date,
        comments,
        previous_status,
        new_status
      FROM leave_request_history 
      WHERE request_id = $1
      ORDER BY action_date ASC
    `, [request_id]).catch(() => ({ rows: [] })); // Ignore error if history table doesn't exist
    
    console.log(`Successfully retrieved history for leave request ${request_id}`);
    
    res.json({
      success: true,
      message: 'Leave request history retrieved successfully',
      data: {
        request_details: requestResult.rows[0],
        history: historyResult.rows
      }
    });
  } catch (error) {
    console.error('Error retrieving leave request history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve leave request history',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// 12. Check leave eligibility
const checkLeaveEligibility = async (req, res) => {
  try {
    const { staff_id, leave_type, start_date, end_date } = req.query;
    
    console.log(`Request: Check leave eligibility for staff ${staff_id}`);
    
    if (!staff_id || !leave_type || !start_date || !end_date) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters: staff_id, leave_type, start_date, end_date'
      });
    }
    
    // Calculate requested days
    const startDateObj = new Date(start_date);
    const endDateObj = new Date(end_date);
    const timeDifference = endDateObj.getTime() - startDateObj.getTime();
    const requestedDays = Math.ceil(timeDifference / (1000 * 3600 * 24)) + 1;
    
    if (requestedDays <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date range'
      });
    }
    
    // Get staff leave quota for current year
    const leaveYear = startDateObj.getFullYear();
    const quotaResult = await query(`
      SELECT * FROM leave WHERE staff_id = $1 AND leave_year = $2
    `, [staff_id, leaveYear]);
    
    if (quotaResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Leave quota not found for staff ${staff_id} in year ${leaveYear}`
      });
    }
    
    const quota = quotaResult.rows[0];
    
    // Check eligibility based on leave type
    const leaveTypeMap = {
      'Sick Leave': { enabled: 'sick_leave_enabled', quota: 'sl_quota', used: 'sl_used' },
      'Annual Leave': { enabled: 'annual_leave_enabled', quota: 'al_quota', used: 'al_used' },
      'Casual Leave': { enabled: 'casual_leave_enabled', quota: 'cl_quota', used: 'cl_used' },
      'Maternity Leave': { enabled: 'maternity_leave_enabled', quota: 'ml_quota', used: 'ml_used' },
      'Paternity Leave': { enabled: 'paternity_leave_enabled', quota: 'pl_quota', used: 'pl_used' }
    };
    
    const leaveConfig = leaveTypeMap[leave_type];
    if (!leaveConfig) {
      return res.status(400).json({
        success: false,
        message: 'Invalid leave type'
      });
    }
    
    const isEnabled = quota[leaveConfig.enabled];
    const totalQuota = quota[leaveConfig.quota];
    const usedQuota = quota[leaveConfig.used];
    const remainingQuota = totalQuota - usedQuota;
    
    const isEligible = isEnabled && (remainingQuota >= requestedDays);
    
    // Check for overlapping requests
    const overlapResult = await query(`
      SELECT COUNT(*) as overlap_count
      FROM leave_requests 
      WHERE staff_id = $1 
      AND status IN ('Pending', 'Approved')
      AND (
        (start_date <= $2 AND end_date >= $2) OR
        (start_date <= $3 AND end_date >= $3) OR
        (start_date >= $2 AND end_date <= $3)
      )
    `, [staff_id, start_date, end_date]);
    
    const hasOverlap = parseInt(overlapResult.rows[0].overlap_count) > 0;
    
    console.log(`Leave eligibility checked for staff ${staff_id}`);
    
    res.json({
      success: true,
      message: 'Leave eligibility checked successfully',
      data: {
        eligible: isEligible && !hasOverlap,
        leave_type_enabled: isEnabled,
        total_quota: totalQuota,
        used_quota: usedQuota,
        remaining_quota: remainingQuota,
        requested_days: requestedDays,
        sufficient_quota: remainingQuota >= requestedDays,
        has_overlap: hasOverlap,
        details: {
          staff_id,
          leave_type,
          start_date,
          end_date,
          leave_year: leaveYear
        }
      }
    });
  } catch (error) {
    console.error('Error checking leave eligibility:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check leave eligibility',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// 13. Get leave request detail
const getLeaveRequestDetail = async (req, res) => {
  try {
    const { request_id } = req.params;
    
    console.log(`Request: Get leave request detail for ${request_id}`);
    
    const result = await query(`
      SELECT 
        lr.request_id,
        lr.staff_id,
        s.name as staff_name,
        s.email as staff_email,
        s.phone as staff_phone,
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
        lr.updated_at,
        -- Calculate working days excluding weekends
        (
          SELECT COUNT(*)
          FROM generate_series(lr.start_date::date, lr.end_date::date, '1 day'::interval) as date_series
          WHERE EXTRACT(DOW FROM date_series) NOT IN (0, 6)
        ) as working_days
      FROM leave_requests lr
      LEFT JOIN staff s ON lr.staff_id = s.staff_id
      LEFT JOIN staff approver ON lr.approved_by = approver.staff_id
      LEFT JOIN position p ON s.position_id = p.position_id
      LEFT JOIN department d ON p.department_id = d.department_id
      WHERE lr.request_id = $1
    `, [request_id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Leave request not found'
      });
    }
    
    console.log(`Successfully retrieved leave request detail for ${request_id}`);
    
    res.json({
      success: true,
      message: 'Leave request detail retrieved successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error retrieving leave request detail:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve leave request detail',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// ===== EXPORT ALL FUNCTIONS =====
module.exports = {
  // Leave quota management
  getAllStaffLeaveQuotas,
  getStaffLeaveQuota,
  initializeStaffLeaveQuota,
  updateStaffLeaveQuota,
  
  // Leave request management
  getAllLeaveRequests,
  getPendingLeaveRequests,
  submitLeaveRequest,
  processLeaveRequest,
  cancelLeaveRequest,
  getLeaveRequestHistory,
  getLeaveRequestDetail,
  
  // Leave statistics and utilities
  checkLeaveEligibility
};

console.log('Complete Leave Management Controller loaded successfully!');