// middleware/holidayMiddleware.js
const { query } = require('../config/database');
const { 
  validateLeaveDates, 
  checkLeaveConflict,
  LEAVE_TYPE_MAPPING,
  LEAVE_STATUS_MAPPING 
} = require('../utils/leaveUtilities');

console.log('🛡️  Loading Holiday Management Middleware...');

/**
 * Middleware to validate leave request data
 */
const validateLeaveRequestData = async (req, res, next) => {
  try {
    const { staff_id, leave_type, start_date, end_date, reason } = req.body;
    const errors = [];
    
    // Basic required field validation
    if (!staff_id) {
      errors.push('Staff ID is required');
    }
    
    if (!leave_type) {
      errors.push('Leave type is required');
    }
    
    if (!reason || !reason.trim()) {
      errors.push('Leave reason is required');
    }
    
    // Validate leave type
    const validLeaveTypes = Object.keys(LEAVE_TYPE_MAPPING).filter(key => 
      !isNaN(key) === false && key.includes('_')
    );
    
    if (leave_type && !validLeaveTypes.includes(leave_type)) {
      errors.push(`Invalid leave type. Valid types: ${validLeaveTypes.join(', ')}`);
    }
    
    // Validate dates
    const dateValidation = validateLeaveDates(start_date, end_date);
    if (!dateValidation.isValid) {
      errors.push(...dateValidation.errors);
    }
    
    // Check if staff exists
    if (staff_id) {
      const staffCheck = await query(
        'SELECT staff_id, name FROM staff WHERE staff_id = $1',
        [staff_id]
      );
      
      if (staffCheck.rows.length === 0) {
        errors.push(`Staff ID ${staff_id} does not exist`);
      } else {
        // Add staff info to request
        req.staffInfo = staffCheck.rows[0];
      }
    }
    
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Data validation failed',
        errors
      });
    }
    
    next();
  } catch (error) {
    console.error('Leave request data validation error:', error);
    res.status(500).json({
      success: false,
      message: 'Error occurred during data validation',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * Middleware to check leave conflicts
 */
const checkLeaveConflictMiddleware = async (req, res, next) => {
  try {
    const { staff_id, start_date, end_date } = req.body;
    const { request_id } = req.params; // For updates, exclude current request
    
    if (!staff_id || !start_date || !end_date) {
      return next(); // Let other validation middleware handle required fields
    }
    
    const conflictCheck = await checkLeaveConflict(
      staff_id, 
      start_date, 
      end_date, 
      request_id ? parseInt(request_id) : null
    );
    
    if (conflictCheck.hasConflict) {
      return res.status(400).json({
        success: false,
        message: 'This time period conflicts with other leave requests',
        conflicts: conflictCheck.conflictingRequests.map(conflict => ({
          request_id: conflict.request_id,
          leave_type: conflict.leave_type,
          start_date: conflict.start_date,
          end_date: conflict.end_date,
          status: conflict.status
        }))
      });
    }
    
    next();
  } catch (error) {
    console.error('Leave conflict check error:', error);
    res.status(500).json({
      success: false,
      message: 'Error occurred during leave conflict check',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * Middleware to validate approval permissions
 */
const validateApprovalPermission = async (req, res, next) => {
  try {
    const { approver_id } = req.body;
    const { request_id } = req.params;
    
    if (!approver_id) {
      return res.status(400).json({
        success: false,
        message: 'Approver ID is required'
      });
    }
    
    if (!request_id) {
      return res.status(400).json({
        success: false,
        message: 'Leave request ID is required'
      });
    }
    
    // Check if approver exists
    const approverCheck = await query(
      'SELECT staff_id, name FROM staff WHERE staff_id = $1',
      [approver_id]
    );
    
    if (approverCheck.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: `Approver ID ${approver_id} does not exist`
      });
    }
    
    // Check if leave request exists
    const requestCheck = await query(
      'SELECT request_id, staff_id, status FROM leave_requests WHERE request_id = $1',
      [request_id]
    );
    
    if (requestCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Leave request ID ${request_id} does not exist`
      });
    }
    
    const leaveRequest = requestCheck.rows[0];
    
    // Check request status
    if (leaveRequest.status !== 'Pending') {
      return res.status(400).json({
        success: false,
        message: `Only pending requests can be approved (current status: ${leaveRequest.status})`
      });
    }
    
    // Check if approver is trying to approve their own request
    if (leaveRequest.staff_id === parseInt(approver_id)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot approve your own leave request'
      });
    }
    
    // TODO: Add more complex permission checks here, such as:
    // - Department managers can only approve requests from their department
    // - HR can approve all requests
    // - Requests over certain days require higher-level approval
    
    req.approverInfo = approverCheck.rows[0];
    req.leaveRequestInfo = leaveRequest;
    
    next();
  } catch (error) {
    console.error('Approval permission validation error:', error);
    res.status(500).json({
      success: false,
      message: 'Error occurred during approval permission validation',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * Middleware to validate quota update permissions
 */
const validateQuotaUpdatePermission = async (req, res, next) => {
  try {
    const { staff_id } = req.params;
    const { leave_year = new Date().getFullYear() } = req.body;
    
    if (!staff_id) {
      return res.status(400).json({
        success: false,
        message: 'Staff ID is required'
      });
    }
    
    // Check if staff exists
    const staffCheck = await query(
      'SELECT staff_id, name FROM staff WHERE staff_id = $1',
      [staff_id]
    );
    
    if (staffCheck.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: `Staff ID ${staff_id} does not exist`
      });
    }
    
    // Check if leave record exists
    const quotaCheck = await query(
      'SELECT staff_id, leave_year FROM leave WHERE staff_id = $1 AND leave_year = $2',
      [staff_id, leave_year]
    );
    
    if (quotaCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Leave record for staff ${staff_id} in year ${leave_year} does not exist`
      });
    }
    
    // Validate quota data reasonableness
    const {
      sl_quota, al_quota, cl_quota, ml_quota, pl_quota
    } = req.body;
    
    const quotaErrors = [];
    
    if (sl_quota !== undefined && (sl_quota < 0 || sl_quota > 365)) {
      quotaErrors.push('Sick leave quota must be between 0-365 days');
    }
    
    if (al_quota !== undefined && (al_quota < 0 || al_quota > 365)) {
      quotaErrors.push('Annual leave quota must be between 0-365 days');
    }
    
    if (cl_quota !== undefined && (cl_quota < 0 || cl_quota > 365)) {
      quotaErrors.push('Casual leave quota must be between 0-365 days');
    }
    
    if (ml_quota !== undefined && (ml_quota < 0 || ml_quota > 365)) {
      quotaErrors.push('Maternity leave quota must be between 0-365 days');
    }
    
    if (pl_quota !== undefined && (pl_quota < 0 || pl_quota > 365)) {
      quotaErrors.push('Paternity leave quota must be between 0-365 days');
    }
    
    if (quotaErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Quota data validation failed',
        errors: quotaErrors
      });
    }
    
    req.staffInfo = staffCheck.rows[0];
    req.quotaInfo = quotaCheck.rows[0];
    
    next();
  } catch (error) {
    console.error('Quota update permission validation error:', error);
    res.status(500).json({
      success: false,
      message: 'Error occurred during quota update permission validation',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * Middleware to log leave operations
 */
const logLeaveOperation = (operation) => {
  return async (req, res, next) => {
    // Save original json method
    const originalJson = res.json;
    
    // Override json method to capture response
    res.json = function(data) {
      // Log operation
      const logData = {
        operation,
        timestamp: new Date().toISOString(),
        request_data: {
          params: req.params,
          body: req.body,
          query: req.query
        },
        response_success: data.success || false,
        user_agent: req.get('User-Agent'),
        ip_address: req.ip || req.connection.remoteAddress
      };
      
      // Only log details in development environment
      if (process.env.NODE_ENV === 'development') {
        console.log(`📋 Leave operation log [${operation}]:`, JSON.stringify(logData, null, 2));
      } else {
        console.log(`📋 Leave operation [${operation}]: ${data.success ? 'Success' : 'Failed'}`);
      }
      
      // TODO: Can save logs to database or log files here
      
      // Call original json method
      return originalJson.call(this, data);
    };
    
    next();
  };
};

/**
 * Middleware to handle leave-related errors
 */
const handleLeaveErrors = (err, req, res, next) => {
  console.error('Leave management error:', err);
  
  // PostgreSQL error handling
  if (err.code) {
    switch (err.code) {
      case '23505': // Unique constraint violation
        return res.status(400).json({
          success: false,
          message: 'Duplicate data, please check input',
          error_code: 'DUPLICATE_DATA'
        });
        
      case '23503': // Foreign key constraint violation
        return res.status(400).json({
          success: false,
          message: 'Related data does not exist, please check input',
          error_code: 'FOREIGN_KEY_VIOLATION'
        });
        
      case '23514': // Check constraint violation
        return res.status(400).json({
          success: false,
          message: 'Data does not meet business rules',
          error_code: 'CHECK_CONSTRAINT_VIOLATION'
        });
        
      default:
        return res.status(500).json({
          success: false,
          message: 'Database operation failed',
          error_code: 'DATABASE_ERROR'
        });
    }
  }
  
  // Other errors
  res.status(500).json({
    success: false,
    message: 'Leave management system error',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
};

/**
 * Middleware to validate date range query parameters
 */
const validateDateRangeQuery = (req, res, next) => {
  const { start_date, end_date } = req.query;
  
  if (start_date && end_date) {
    const start = new Date(start_date);
    const end = new Date(end_date);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format, please use YYYY-MM-DD format'
      });
    }
    
    if (start > end) {
      return res.status(400).json({
        success: false,
        message: 'Start date cannot be later than end date'
      });
    }
    
    // Check if date range is too large (more than 2 years)
    const twoYears = 2 * 365 * 24 * 60 * 60 * 1000;
    if (end - start > twoYears) {
      return res.status(400).json({
        success: false,
        message: 'Query date range cannot exceed 2 years'
      });
    }
  }
  
  next();
};

/**
 * Pagination parameter validation middleware
 */
const validatePaginationParams = (req, res, next) => {
  let { limit = 50, offset = 0 } = req.query;
  
  // Convert to numbers
  limit = parseInt(limit);
  offset = parseInt(offset);
  
  // Validate ranges
  if (isNaN(limit) || limit < 1 || limit > 1000) {
    return res.status(400).json({
      success: false,
      message: 'limit parameter must be a number between 1-1000'
    });
  }
  
  if (isNaN(offset) || offset < 0) {
    return res.status(400).json({
      success: false,
      message: 'offset parameter must be a non-negative number'
    });
  }
  
  // Put validated parameters back into query
  req.query.limit = limit;
  req.query.offset = offset;
  
  next();
};

/**
 * Middleware to check if leave request can be cancelled
 */
const validateCancellationPermission = async (req, res, next) => {
  try {
    const { request_id } = req.params;
    const { staff_id } = req.body;
    
    if (!staff_id) {
      return res.status(400).json({
        success: false,
        message: 'Staff ID is required'
      });
    }
    
    // Check if request exists
    const requestCheck = await query(
      'SELECT request_id, staff_id, status, start_date FROM leave_requests WHERE request_id = $1',
      [request_id]
    );
    
    if (requestCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Leave request ID ${request_id} does not exist`
      });
    }
    
    const leaveRequest = requestCheck.rows[0];
    
    // Check if it's the applicant themselves
    if (leaveRequest.staff_id !== parseInt(staff_id)) {
      return res.status(403).json({
        success: false,
        message: 'You can only cancel your own leave requests'
      });
    }
    
    // Check request status
    if (leaveRequest.status !== 'Pending') {
      return res.status(400).json({
        success: false,
        message: `Only pending requests can be cancelled (current status: ${leaveRequest.status})`
      });
    }
    
    // Check if leave has already started
    const today = new Date();
    const startDate = new Date(leaveRequest.start_date);
    
    if (startDate <= today) {
      return res.status(400).json({
        success: false,
        message: 'Leave has already started, cannot cancel request'
      });
    }
    
    req.leaveRequestInfo = leaveRequest;
    next();
    
  } catch (error) {
    console.error('Cancellation permission validation error:', error);
    res.status(500).json({
      success: false,
      message: 'Error occurred during cancellation permission validation',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * Leave statistics permission check middleware
 */
const validateStatisticsPermission = async (req, res, next) => {
  // TODO: Implement permission checks based on actual requirements
  // For example: only HR and Manager can view statistics
  
  // Currently allow all requests to pass, can add specific permission logic as needed
  next();
};

/**
 * Leave type validation middleware
 */
const validateLeaveType = (req, res, next) => {
  const { leave_type } = req.query;
  
  if (leave_type) {
    const validLeaveTypes = [
      'sick_leave', 'annual_leave', 'casual_leave', 
      'maternity_leave', 'paternity_leave'
    ];
    
    if (!validLeaveTypes.includes(leave_type)) {
      return res.status(400).json({
        success: false,
        message: `Invalid leave type. Valid types: ${validLeaveTypes.join(', ')}`
      });
    }
  }
  
  next();
};

/**
 * Leave status validation middleware
 */
const validateLeaveStatus = (req, res, next) => {
  const { status } = req.query;
  
  if (status) {
    const validStatuses = ['Pending', 'Approved', 'Rejected', 'Cancelled'];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid leave status. Valid statuses: ${validStatuses.join(', ')}`
      });
    }
  }
  
  next();
};

/**
 * Year parameter validation middleware
 */
const validateYearParameter = (req, res, next) => {
  const { leave_year, year } = req.query;
  const yearToCheck = leave_year || year;
  
  if (yearToCheck) {
    const yearNum = parseInt(yearToCheck);
    const currentYear = new Date().getFullYear();
    
    if (isNaN(yearNum) || yearNum < 2020 || yearNum > currentYear + 5) {
      return res.status(400).json({
        success: false,
        message: `Invalid year parameter. Valid range: 2020 - ${currentYear + 5}`
      });
    }
  }
  
  next();
};

/**
 * Staff ID validation middleware
 */
const validateStaffId = (req, res, next) => {
  const { staff_id } = req.params;
  
  if (staff_id) {
    const staffIdNum = parseInt(staff_id);
    
    if (isNaN(staffIdNum) || staffIdNum < 100001 || staffIdNum > 999999) {
      return res.status(400).json({
        success: false,
        message: 'Invalid staff ID format. Must be 6 digits between 100001-999999'
      });
    }
  }
  
  next();
};

/**
 * Request ID validation middleware
 */
const validateRequestId = (req, res, next) => {
  const { request_id } = req.params;
  
  if (request_id) {
    const requestIdNum = parseInt(request_id);
    
    if (isNaN(requestIdNum) || requestIdNum < 1) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request ID format. Must be a positive integer'
      });
    }
  }
  
  next();
};

/**
 * Batch operation validation middleware
 */
const validateBatchOperation = (req, res, next) => {
  const { request_ids, staff_ids } = req.body;
  
  // Validate request IDs for batch approval
  if (request_ids) {
    if (!Array.isArray(request_ids) || request_ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Request IDs must be a non-empty array'
      });
    }
    
    if (request_ids.length > 50) {
      return res.status(400).json({
        success: false,
        message: 'Cannot process more than 50 requests at once'
      });
    }
    
    // Check if all IDs are valid integers
    for (const id of request_ids) {
      if (!Number.isInteger(id) || id < 1) {
        return res.status(400).json({
          success: false,
          message: 'All request IDs must be positive integers'
        });
      }
    }
  }
  
  // Validate staff IDs for batch quota update
  if (staff_ids) {
    if (!Array.isArray(staff_ids) || staff_ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Staff IDs must be a non-empty array'
      });
    }
    
    if (staff_ids.length > 100) {
      return res.status(400).json({
        success: false,
        message: 'Cannot process more than 100 staff at once'
      });
    }
    
    // Check if all IDs are valid
    for (const id of staff_ids) {
      if (!Number.isInteger(id) || id < 100001 || id > 999999) {
        return res.status(400).json({
          success: false,
          message: 'All staff IDs must be 6-digit numbers between 100001-999999'
        });
      }
    }
  }
  
  next();
};

/**
 * Rate limiting middleware for sensitive operations
 */
const rateLimitSensitiveOperations = (maxRequests = 10, windowMs = 60000) => {
  const requests = new Map();
  
  return (req, res, next) => {
    const clientId = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    
    // Clean up old entries
    for (const [key, timestamps] of requests.entries()) {
      requests.set(key, timestamps.filter(time => now - time < windowMs));
      if (requests.get(key).length === 0) {
        requests.delete(key);
      }
    }
    
    // Check current client's requests
    const clientRequests = requests.get(clientId) || [];
    
    if (clientRequests.length >= maxRequests) {
      return res.status(429).json({
        success: false,
        message: 'Too many requests. Please try again later.',
        retry_after: Math.ceil(windowMs / 1000)
      });
    }
    
    // Add current request
    clientRequests.push(now);
    requests.set(clientId, clientRequests);
    
    next();
  };
};

/**
 * Content-Type validation middleware
 */
const validateContentType = (req, res, next) => {
  if (req.method === 'POST' || req.method === 'PUT') {
    const contentType = req.get('Content-Type');
    
    if (!contentType || !contentType.includes('application/json')) {
      return res.status(400).json({
        success: false,
        message: 'Content-Type must be application/json'
      });
    }
  }
  
  next();
};

module.exports = {
  // Data validation middleware
  validateLeaveRequestData,
  validateDateRangeQuery,
  validatePaginationParams,
  validateLeaveType,
  validateLeaveStatus,
  validateYearParameter,
  validateStaffId,
  validateRequestId,
  validateBatchOperation,
  validateContentType,
  
  // Business logic validation middleware
  checkLeaveConflictMiddleware,
  validateApprovalPermission,
  validateQuotaUpdatePermission,
  validateCancellationPermission,
  validateStatisticsPermission,
  
  // Utility middleware
  logLeaveOperation,
  handleLeaveErrors,
  rateLimitSensitiveOperations
};