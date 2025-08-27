// controllers/leaveController.js - Fixed Leave Management Controller
const { query } = require('../config/database');
const {
  validateLeaveDates,
  calculateTotalDays,
  formatLeaveRequest,
  formatLeaveQuota,
  checkLeaveConflict,
  validateLeaveRequestData,
  generateLeaveSummary
} = require('../utils/leaveUtilities');

console.log('Loading Fixed Leave Management Controller...');

// ===== HELPER FUNCTIONS =====

/**
 * Build dynamic query with filters - Fixed for integer staff_id
 * @param {string} baseQuery - Base SQL query
 * @param {object} filters - Filter object
 * @param {array} baseParams - Base parameters
 * @returns {object} Query object with text and params
 */
const buildFilteredQuery = (baseQuery, filters, baseParams = []) => {
  let queryText = baseQuery;
  const queryParams = [...baseParams];
  let paramCount = baseParams.length;

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      paramCount++;
      switch (key) {
        case 'staff_id':
          // Fixed: Use exact match for integer staff_id
          queryText += ` AND l.staff_id = $${paramCount}`;
          queryParams.push(parseInt(value));
          break;
        case 'staff_name':
          queryText += ` AND s.name ILIKE $${paramCount}`;
          queryParams.push(`%${value}%`);
          break;
        case 'department_id':
          queryText += ` AND d.department_id = $${paramCount}`;
          queryParams.push(parseInt(value));
          break;
        case 'status':
          queryText += ` AND lr.status = $${paramCount}`;
          queryParams.push(value);
          break;
        case 'leave_type':
          queryText += ` AND lr.leave_type = $${paramCount}`;
          queryParams.push(value);
          break;
        case 'start_date':
          queryText += ` AND lr.start_date >= $${paramCount}`;
          queryParams.push(value);
          break;
        case 'end_date':
          queryText += ` AND lr.end_date <= $${paramCount}`;
          queryParams.push(value);
          break;
      }
    }
  });

  return { queryText, queryParams, paramCount };
};

/**
 * Build filtered query for leave requests - Fixed for integer staff_id
 * @param {string} baseQuery - Base SQL query
 * @param {object} filters - Filter object
 * @param {array} baseParams - Base parameters
 * @returns {object} Query object with text and params
 */
const buildLeaveRequestQuery = (baseQuery, filters, baseParams = []) => {
  let queryText = baseQuery;
  const queryParams = [...baseParams];
  let paramCount = baseParams.length;

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      paramCount++;
      switch (key) {
        case 'staff_id':
          // Fixed: Use exact match for integer staff_id in leave_requests table
          queryText += ` AND lr.staff_id = $${paramCount}`;
          queryParams.push(parseInt(value));
          break;
        case 'staff_name':
          queryText += ` AND s.name ILIKE $${paramCount}`;
          queryParams.push(`%${value}%`);
          break;
        case 'department_id':
          queryText += ` AND d.department_id = $${paramCount}`;
          queryParams.push(parseInt(value));
          break;
        case 'status':
          queryText += ` AND lr.status = $${paramCount}`;
          queryParams.push(value);
          break;
        case 'leave_type':
          queryText += ` AND lr.leave_type = $${paramCount}`;
          queryParams.push(value);
          break;
        case 'start_date':
          queryText += ` AND lr.start_date >= $${paramCount}`;
          queryParams.push(value);
          break;
        case 'end_date':
          queryText += ` AND lr.end_date <= $${paramCount}`;
          queryParams.push(value);
          break;
      }
    }
  });

  return { queryText, queryParams, paramCount };
};

/**
 * Get total count for pagination
 * @param {string} baseCountQuery - Base count query
 * @param {object} filters - Filter object
 * @param {array} baseParams - Base parameters
 * @returns {number} Total count
 */
const getTotalCount = async (baseCountQuery, filters, baseParams = []) => {
  const { queryText, queryParams } = buildFilteredQuery(baseCountQuery, filters, baseParams);
  const result = await query(queryText, queryParams);
  return parseInt(result.rows[0].total_count);
};

/**
 * Get total count for leave requests
 * @param {string} baseCountQuery - Base count query
 * @param {object} filters - Filter object
 * @param {array} baseParams - Base parameters
 * @returns {number} Total count
 */
const getLeaveRequestTotalCount = async (baseCountQuery, filters, baseParams = []) => {
  const { queryText, queryParams } = buildLeaveRequestQuery(baseCountQuery, filters, baseParams);
  const result = await query(queryText, queryParams);
  return parseInt(result.rows[0].total_count);
};

// ===== LEAVE QUOTA MANAGEMENT FUNCTIONS =====

/**
 * Get all staff leave quotas with advanced filtering and pagination
 */
const getAllStaffLeaveQuotas = async (req, res) => {
  try {
    console.log('Request: Get all staff leave quotas with filters');
    
    const { 
      leave_year = new Date().getFullYear(), 
      department_id, 
      staff_id,
      staff_name,
      limit = 50, 
      offset = 0,
      sort_by = 'staff_name',
      sort_order = 'ASC'
    } = req.query;

    // Validate sort parameters
    const validSortFields = ['staff_name', 'department_name', 'leave_year', 'al_remaining', 'sl_remaining'];
    const validSortOrders = ['ASC', 'DESC'];
    
    const sortField = validSortFields.includes(sort_by) ? sort_by : 'staff_name';
    const sortOrder = validSortOrders.includes(sort_order?.toUpperCase()) ? sort_order.toUpperCase() : 'ASC';

    const baseQuery = `
      SELECT 
        l.staff_id,
        s.name as staff_name,
        s.email as staff_email,
        d.department_name,
        p.title as position_title,
        l.leave_year,
        -- Sick leave
        COALESCE(l.sl_quota, 0) as sl_quota,
        COALESCE(l.sl_used, 0) as sl_used,
        COALESCE(l.sl_quota, 0) - COALESCE(l.sl_used, 0) as sl_remaining,
        -- Annual leave
        COALESCE(l.al_quota, 0) as al_quota,
        COALESCE(l.al_used, 0) as al_used,
        COALESCE(l.al_quota, 0) - COALESCE(l.al_used, 0) as al_remaining,
        -- Casual leave
        COALESCE(l.cl_quota, 0) as cl_quota,
        COALESCE(l.cl_used, 0) as cl_used,
        COALESCE(l.cl_quota, 0) - COALESCE(l.cl_used, 0) as cl_remaining,
        -- Maternity leave
        COALESCE(l.ml_quota, 0) as ml_quota,
        COALESCE(l.ml_used, 0) as ml_used,
        COALESCE(l.ml_quota, 0) - COALESCE(l.ml_used, 0) as ml_remaining,
        -- Paternity leave
        COALESCE(l.pl_quota, 0) as pl_quota,
        COALESCE(l.pl_used, 0) as pl_used,
        COALESCE(l.pl_quota, 0) - COALESCE(l.pl_used, 0) as pl_remaining,
        -- Total calculations
        (COALESCE(l.sl_quota, 0) + COALESCE(l.al_quota, 0) + COALESCE(l.cl_quota, 0) + COALESCE(l.ml_quota, 0) + COALESCE(l.pl_quota, 0)) as total_quota,
        (COALESCE(l.sl_used, 0) + COALESCE(l.al_used, 0) + COALESCE(l.cl_used, 0) + COALESCE(l.ml_used, 0) + COALESCE(l.pl_used, 0)) as total_used,
        l.last_quota_update,
        l.created_at,
        l.updated_at
      FROM leave l
      LEFT JOIN staff s ON l.staff_id = s.staff_id
      LEFT JOIN position p ON s.position_id = p.position_id
      LEFT JOIN department d ON p.department_id = d.department_id
      WHERE l.leave_year = $1
    `;

    const filters = { staff_id, staff_name, department_id };
    const { queryText, queryParams, paramCount } = buildFilteredQuery(baseQuery, filters, [leave_year]);

    // Add sorting and pagination
    const finalQuery = `
      ${queryText} 
      ORDER BY ${sortField === 'staff_name' ? 's.name' : sortField} ${sortOrder}
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;
    queryParams.push(parseInt(limit), parseInt(offset));

    const result = await query(finalQuery, queryParams);

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total_count
      FROM leave l
      LEFT JOIN staff s ON l.staff_id = s.staff_id
      LEFT JOIN position p ON s.position_id = p.position_id
      LEFT JOIN department d ON p.department_id = d.department_id
      WHERE l.leave_year = $1
    `;

    const totalCount = await getTotalCount(countQuery, filters, [leave_year]);

    // Format data
    const formattedData = result.rows.map(row => formatLeaveQuota(row));

    console.log(`Successfully retrieved leave quotas for ${result.rows.length} staff members (total ${totalCount})`);

    res.json({
      success: true,
      message: `Successfully retrieved leave quotas for ${result.rows.length} staff members`,
      data: formattedData,
      count: result.rows.length,
      pagination: {
        total: totalCount,
        limit: parseInt(limit),
        offset: parseInt(offset),
        has_more: parseInt(offset) + parseInt(limit) < totalCount,
        total_pages: Math.ceil(totalCount / parseInt(limit)),
        current_page: Math.floor(parseInt(offset) / parseInt(limit)) + 1
      },
      filters: {
        leave_year: parseInt(leave_year),
        staff_id: staff_id ? parseInt(staff_id) : null,
        staff_name: staff_name || null,
        department_id: department_id ? parseInt(department_id) : null,
        sort_by: sortField,
        sort_order: sortOrder
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

/**
 * Get specific staff leave quota with detailed information
 */
const getStaffLeaveQuota = async (req, res) => {
  try {
    const { staff_id } = req.params;
    const { leave_year = new Date().getFullYear() } = req.query;
    
    console.log(`Request: Get leave quota for staff ${staff_id}, year ${leave_year}`);
    
    // Validate staff_id
    const staffIdInt = parseInt(staff_id);
    if (isNaN(staffIdInt)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid staff ID format. Must be a number.'
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
        COALESCE(l.sl_quota, 0) as sl_quota,
        COALESCE(l.sl_used, 0) as sl_used,
        COALESCE(l.sl_quota, 0) - COALESCE(l.sl_used, 0) as sl_remaining,
        -- Annual leave
        COALESCE(l.al_quota, 0) as al_quota,
        COALESCE(l.al_used, 0) as al_used,
        COALESCE(l.al_quota, 0) - COALESCE(l.al_used, 0) as al_remaining,
        -- Casual leave
        COALESCE(l.cl_quota, 0) as cl_quota,
        COALESCE(l.cl_used, 0) as cl_used,
        COALESCE(l.cl_quota, 0) - COALESCE(l.cl_used, 0) as cl_remaining,
        -- Maternity leave
        COALESCE(l.ml_quota, 0) as ml_quota,
        COALESCE(l.ml_used, 0) as ml_used,
        COALESCE(l.ml_quota, 0) - COALESCE(l.ml_used, 0) as ml_remaining,
        -- Paternity leave
        COALESCE(l.pl_quota, 0) as pl_quota,
        COALESCE(l.pl_used, 0) as pl_used,
        COALESCE(l.pl_quota, 0) - COALESCE(l.pl_used, 0) as pl_remaining,
        -- Total calculations
        (COALESCE(l.sl_quota, 0) + COALESCE(l.al_quota, 0) + COALESCE(l.cl_quota, 0) + COALESCE(l.ml_quota, 0) + COALESCE(l.pl_quota, 0)) as total_quota,
        (COALESCE(l.sl_used, 0) + COALESCE(l.al_used, 0) + COALESCE(l.cl_used, 0) + COALESCE(l.ml_used, 0) + COALESCE(l.pl_used, 0)) as total_used,
        l.last_quota_update,
        l.created_at,
        l.updated_at
      FROM leave l
      LEFT JOIN staff s ON l.staff_id = s.staff_id
      LEFT JOIN position p ON s.position_id = p.position_id
      LEFT JOIN department d ON p.department_id = d.department_id
      WHERE l.staff_id = $1 AND l.leave_year = $2
    `, [staffIdInt, leave_year]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Leave record not found for staff ${staff_id} in year ${leave_year}`
      });
    }

    // Format data and add additional statistics
    const formattedData = formatLeaveQuota(result.rows[0]);
    
    // Get leave request history for this year
    const historyResult = await query(`
      SELECT 
        COUNT(*) as total_requests,
        COUNT(CASE WHEN status = 'Approved' THEN 1 END) as approved_requests,
        COUNT(CASE WHEN status = 'Pending' THEN 1 END) as pending_requests,
        COUNT(CASE WHEN status = 'Rejected' THEN 1 END) as rejected_requests,
        COUNT(CASE WHEN status = 'Cancelled' THEN 1 END) as cancelled_requests
      FROM leave_requests 
      WHERE staff_id = $1 AND EXTRACT(YEAR FROM start_date) = $2
    `, [staffIdInt, leave_year]);

    formattedData.request_statistics = historyResult.rows[0];
    
    console.log(`Successfully retrieved leave quota for staff ${staff_id}`);
    
    res.json({
      success: true,
      message: 'Successfully retrieved staff leave quota',
      data: formattedData,
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

/**
 * Update staff leave quota with validation
 */
const updateStaffLeaveQuota = async (req, res) => {
  try {
    const { staff_id } = req.params;
    const { leave_year = new Date().getFullYear() } = req.query;
    const updateData = req.body;
    
    console.log(`Request: Update leave quota for staff ${staff_id}, year ${leave_year}`);
    
    // Validate staff_id
    const staffIdInt = parseInt(staff_id);
    if (isNaN(staffIdInt)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid staff ID format. Must be a number.'
      });
    }
    
    // Validate input data
    const allowedFields = ['sl_quota', 'al_quota', 'cl_quota', 'ml_quota', 'pl_quota'];
    const validFields = Object.keys(updateData).filter(field => allowedFields.includes(field));
    
    if (validFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid fields provided for update',
        allowed_fields: allowedFields
      });
    }

    // Validate quota values
    for (const field of validFields) {
      const value = updateData[field];
      if (typeof value !== 'number' || value < 0 || value > 365) {
        return res.status(400).json({
          success: false,
          message: `Invalid value for ${field}. Must be a number between 0 and 365`,
          received_value: value
        });
      }
    }
    
    // Check if quota exists
    const existingQuota = await query(
      'SELECT * FROM leave WHERE staff_id = $1 AND leave_year = $2',
      [staffIdInt, leave_year]
    );
    
    if (existingQuota.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Leave quota for staff ${staff_id} in year ${leave_year} not found`
      });
    }
    
    // Build update query
    const updateFields = [];
    const updateValues = [];
    let paramCount = 0;
    
    validFields.forEach(field => {
      paramCount++;
      updateFields.push(`${field} = $${paramCount}`);
      updateValues.push(updateData[field]);
    });
    
    // Add timestamps
    paramCount++;
    updateFields.push(`updated_at = $${paramCount}`);
    updateValues.push(new Date());
    
    paramCount++;
    updateFields.push(`last_quota_update = $${paramCount}`);
    updateValues.push(new Date());
    
    // Add WHERE conditions
    paramCount++;
    updateValues.push(staffIdInt);
    paramCount++;
    updateValues.push(leave_year);
    
    const updateQuery = `
      UPDATE leave 
      SET ${updateFields.join(', ')}
      WHERE staff_id = $${paramCount - 1} AND leave_year = $${paramCount}
      RETURNING *
    `;
    
    const result = await query(updateQuery, updateValues);
    const formattedData = formatLeaveQuota(result.rows[0]);
    
    console.log(`Successfully updated leave quota for staff ${staff_id}`);
    
    res.json({
      success: true,
      message: 'Leave quota updated successfully',
      data: formattedData,
      updated_fields: validFields
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

/**
 * Get all leave requests with advanced filtering
 */
const getAllLeaveRequests = async (req, res) => {
  try {
    console.log('Request: Get all leave requests with filters');
    
    const { 
      status, 
      staff_id, 
      leave_type, 
      start_date, 
      end_date, 
      limit = 50, 
      offset = 0,
      sort_by = 'applied_on',
      sort_order = 'DESC'
    } = req.query;

    // Validate sort parameters
    const validSortFields = ['applied_on', 'start_date', 'staff_name', 'status', 'total_days'];
    const validSortOrders = ['ASC', 'DESC'];
    
    const sortField = validSortFields.includes(sort_by) ? sort_by : 'applied_on';
    const sortOrder = validSortOrders.includes(sort_order?.toUpperCase()) ? sort_order.toUpperCase() : 'DESC';

    const baseQuery = `
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
        lr.updated_at,
        -- Calculate days until start
        CASE 
          WHEN lr.start_date >= CURRENT_DATE THEN lr.start_date - CURRENT_DATE
          ELSE 0 
        END as days_until_start,
        -- Calculate days since application
        CURRENT_DATE - lr.applied_on::date as days_since_applied
      FROM leave_requests lr
      LEFT JOIN staff s ON lr.staff_id = s.staff_id
      LEFT JOIN staff approver ON lr.approved_by = approver.staff_id
      LEFT JOIN position p ON s.position_id = p.position_id
      LEFT JOIN department d ON p.department_id = d.department_id
      WHERE 1=1
    `;

    const filters = { status, staff_id, leave_type, start_date, end_date };
    const { queryText, queryParams, paramCount } = buildLeaveRequestQuery(baseQuery, filters);

    // Add sorting and pagination
    const sortColumn = sortField === 'staff_name' ? 's.name' : `lr.${sortField}`;
    const finalQuery = `
      ${queryText} 
      ORDER BY ${sortColumn} ${sortOrder}, lr.request_id DESC
      LIMIT ${paramCount + 1} OFFSET ${paramCount + 2}
    `;
    queryParams.push(parseInt(limit), parseInt(offset));

    const result = await query(finalQuery, queryParams);

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total_count
      FROM leave_requests lr
      LEFT JOIN staff s ON lr.staff_id = s.staff_id
      LEFT JOIN position p ON s.position_id = p.position_id
      LEFT JOIN department d ON p.department_id = d.department_id
      WHERE 1=1
    `;

    const totalCount = await getLeaveRequestTotalCount(countQuery, filters);

    // Format data and generate summary
    const formattedData = result.rows.map(row => formatLeaveRequest(row));
    const summary = generateLeaveSummary(result.rows);

    console.log(`Successfully retrieved ${result.rows.length} leave requests (total ${totalCount})`);

    res.json({
      success: true,
      message: `Successfully retrieved ${result.rows.length} leave requests`,
      data: formattedData,
      summary,
      pagination: {
        total: totalCount,
        limit: parseInt(limit),
        offset: parseInt(offset),
        has_more: parseInt(offset) + parseInt(limit) < totalCount,
        total_pages: Math.ceil(totalCount / parseInt(limit)),
        current_page: Math.floor(parseInt(offset) / parseInt(limit)) + 1
      },
      filters: {
        status: status || null,
        staff_id: staff_id ? parseInt(staff_id) : null,
        leave_type: leave_type || null,
        start_date: start_date || null,
        end_date: end_date || null,
        sort_by: sortField,
        sort_order: sortOrder
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

/**
 * Get pending leave requests with priority information
 */
const getPendingLeaveRequests = async (req, res) => {
  try {
    console.log('Request: Get pending leave requests with priority');
    
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
        -- Calculate urgency indicators
        CURRENT_DATE - lr.applied_on::date as days_pending,
        CASE 
          WHEN lr.start_date >= CURRENT_DATE THEN lr.start_date - CURRENT_DATE
          ELSE 0 
        END as days_until_start,
        -- Priority calculation
        CASE
          WHEN lr.start_date <= CURRENT_DATE + INTERVAL '1 day' THEN 'urgent'
          WHEN lr.start_date <= CURRENT_DATE + INTERVAL '3 days' OR 
               CURRENT_DATE - lr.applied_on::date >= 7 THEN 'high'
          WHEN CURRENT_DATE - lr.applied_on::date >= 3 THEN 'medium'
          ELSE 'normal'
        END as priority_level
      FROM leave_requests lr
      LEFT JOIN staff s ON lr.staff_id = s.staff_id
      LEFT JOIN position p ON s.position_id = p.position_id
      LEFT JOIN department d ON p.department_id = d.department_id
      WHERE lr.status = 'Pending'
      ORDER BY 
        CASE 
          WHEN lr.start_date <= CURRENT_DATE + INTERVAL '1 day' THEN 1
          WHEN lr.start_date <= CURRENT_DATE + INTERVAL '3 days' THEN 2
          WHEN CURRENT_DATE - lr.applied_on::date >= 7 THEN 3
          WHEN CURRENT_DATE - lr.applied_on::date >= 3 THEN 4
          ELSE 5
        END,
        lr.applied_on ASC
    `);
    
    // Format data with priority information
    const formattedData = result.rows.map(row => ({
      ...formatLeaveRequest(row),
      priority: {
        level: row.priority_level,
        days_pending: parseInt(row.days_pending),
        days_until_start: parseInt(row.days_until_start),
        urgent: row.priority_level === 'urgent'
      }
    }));

    // Group by priority
    const priorityGroups = {
      urgent: formattedData.filter(req => req.priority.level === 'urgent'),
      high: formattedData.filter(req => req.priority.level === 'high'),
      medium: formattedData.filter(req => req.priority.level === 'medium'),
      normal: formattedData.filter(req => req.priority.level === 'normal')
    };
    
    console.log(`Successfully retrieved ${result.rows.length} pending leave requests`);
    
    res.json({
      success: true,
      message: `Successfully retrieved ${result.rows.length} pending leave requests`,
      data: formattedData,
      count: result.rows.length,
      priority_breakdown: {
        urgent: priorityGroups.urgent.length,
        high: priorityGroups.high.length,
        medium: priorityGroups.medium.length,
        normal: priorityGroups.normal.length
      },
      grouped_by_priority: priorityGroups
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

/**
 * Submit new leave request with comprehensive validation
 */
const submitLeaveRequest = async (req, res) => {
  try {
    console.log('Request: Submit new leave request');
    console.log('Request body:', req.body);
    
    const requestData = req.body;
    
    // Basic validation
    const errors = [];
    
    if (!requestData.staff_id) {
      errors.push('Staff ID is required');
    } else {
      const staffIdInt = parseInt(requestData.staff_id);
      if (isNaN(staffIdInt)) {
        errors.push('Staff ID must be a valid number');
      } else {
        requestData.staff_id = staffIdInt;
      }
    }
    
    if (!requestData.leave_type) {
      errors.push('Leave type is required');
    } else {
      const validLeaveTypes = ['sick_leave', 'annual_leave', 'casual_leave', 'maternity_leave', 'paternity_leave'];
      if (!validLeaveTypes.includes(requestData.leave_type)) {
        errors.push(`Invalid leave type. Valid types: ${validLeaveTypes.join(', ')}`);
      }
    }
    
    if (!requestData.start_date) {
      errors.push('Start date is required');
    }
    
    if (!requestData.end_date) {
      errors.push('End date is required');
    }
    
    if (!requestData.reason || !requestData.reason.trim()) {
      errors.push('Leave reason is required');
    } else if (requestData.reason.trim().length < 10) {
      errors.push('Leave reason must be at least 10 characters');
    }

    // Date validation
    if (requestData.start_date && requestData.end_date) {
      const startDate = new Date(requestData.start_date);
      const endDate = new Date(requestData.end_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (isNaN(startDate.getTime())) {
        errors.push('Invalid start date format');
      }
      
      if (isNaN(endDate.getTime())) {
        errors.push('Invalid end date format');
      }
      
      if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
        if (startDate > endDate) {
          errors.push('Start date cannot be later than end date');
        }
        
        if (startDate < today) {
          errors.push('Start date cannot be in the past');
        }
        
        // Check if date is too far in the future (more than 2 years)
        const twoYearsLater = new Date();
        twoYearsLater.setFullYear(twoYearsLater.getFullYear() + 2);
        
        if (endDate > twoYearsLater) {
          errors.push('End date cannot be more than two years in the future');
        }
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors
      });
    }

    // Check if staff exists
    const staffCheck = await query(
      'SELECT staff_id, name FROM staff WHERE staff_id = $1',
      [requestData.staff_id]
    );
    
    if (staffCheck.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: `Staff ID ${requestData.staff_id} does not exist`
      });
    }

    // Calculate total days
    const totalDays = calculateTotalDays(requestData.start_date, requestData.end_date);
    
    // Check for conflicts
    const conflictCheck = await checkLeaveConflict(
      requestData.staff_id,
      requestData.start_date,
      requestData.end_date
    );

    if (conflictCheck.hasConflict) {
      return res.status(409).json({
        success: false,
        message: 'Leave request conflicts with existing requests',
        conflicting_requests: conflictCheck.conflictingRequests
      });
    }

    // Insert new request
    const insertQuery = `
      INSERT INTO leave_requests (
        staff_id, leave_type, start_date, end_date, total_days,
        reason, emergency_contact, medical_certificate, status, applied_on
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'Pending', CURRENT_TIMESTAMP)
      RETURNING *
    `;

    const result = await query(insertQuery, [
      requestData.staff_id,
      requestData.leave_type,
      requestData.start_date,
      requestData.end_date,
      totalDays,
      requestData.reason.trim(),
      requestData.emergency_contact || null,
      requestData.medical_certificate || false
    ]);

    const formattedData = formatLeaveRequest(result.rows[0]);

    console.log(`Successfully submitted leave request for staff ${requestData.staff_id}`);

    res.status(201).json({
      success: true,
      message: 'Leave request submitted successfully',
      data: formattedData,
      request_id: result.rows[0].request_id
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

/**
 * Cancel leave request
 */
const cancelLeaveRequest = async (req, res) => {
  try {
    const { request_id } = req.params;
    const { staff_id, reason } = req.body;
    
    console.log(`Request: Cancel leave request ${request_id} by staff ${staff_id}`);
    
    // Validate request_id
    const requestIdInt = parseInt(request_id);
    if (isNaN(requestIdInt)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request ID format'
      });
    }
    
    // Validate staff_id
    const staffIdInt = parseInt(staff_id);
    if (isNaN(staffIdInt)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid staff ID format'
      });
    }
    
    // Check if request exists and belongs to the staff
    const requestCheck = await query(
      'SELECT * FROM leave_requests WHERE request_id = $1 AND staff_id = $2',
      [requestIdInt, staffIdInt]
    );
    
    if (requestCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Leave request not found or does not belong to this staff member'
      });
    }
    
    const leaveRequest = requestCheck.rows[0];
    
    // Check if request can be cancelled (only pending requests)
    if (leaveRequest.status !== 'Pending') {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel request with status: ${leaveRequest.status}. Only pending requests can be cancelled.`
      });
    }
    
    // Check if leave has already started
    const today = new Date();
    const startDate = new Date(leaveRequest.start_date);
    
    if (startDate <= today) {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel leave request as the leave period has already started'
      });
    }
    
    // Update request status to cancelled
    const updateQuery = `
      UPDATE leave_requests 
      SET status = 'Cancelled', 
          rejection_reason = $1,
          updated_at = CURRENT_TIMESTAMP
      WHERE request_id = $2
      RETURNING *
    `;
    
    const result = await query(updateQuery, [
      reason || 'Cancelled by staff member',
      requestIdInt
    ]);
    
    const formattedData = formatLeaveRequest(result.rows[0]);
    
    console.log(`Successfully cancelled leave request ${request_id}`);
    
    res.json({
      success: true,
      message: 'Leave request cancelled successfully',
      data: formattedData
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

// ===== EXPORT FUNCTIONS =====
module.exports = {
  getAllStaffLeaveQuotas,
  getStaffLeaveQuota,
  updateStaffLeaveQuota,
  getAllLeaveRequests,
  getPendingLeaveRequests,
  submitLeaveRequest,
  cancelLeaveRequest
};

console.log('Fixed Leave Management Controller loaded successfully!');