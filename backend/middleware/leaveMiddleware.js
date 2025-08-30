// middleware/leaveMiddleware.js - Leave Management Middleware
const { validateLeaveRequest, checkStaffExists } = require('../utils/leaveUtilities');

console.log('Loading leave management middleware...');

/**
 * Validate leave request data
 */
const validateLeaveRequestData = async (req, res, next) => {
  try {
    const requestData = req.body;
    
    // Basic data validation
    const validation = validateLeaveRequest(requestData);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Data validation failed',
        errors: validation.errors
      });
    }
    
    // Check if staff exists
    if (requestData.staff_id) {
      const staffCheck = await checkStaffExists(requestData.staff_id);
      if (!staffCheck.exists) {
        return res.status(400).json({
          success: false,
          message: `Staff ID ${requestData.staff_id} does not exist`
        });
      }
      // Add staff info to request
      req.staffInfo = staffCheck.staff;
    }
    
    next();
  } catch (error) {
    console.error('Leave data validation error:', error);
    res.status(500).json({
      success: false,
      message: 'Error occurred during data validation',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * Validate approval permissions
 */
const validateApprovalPermission = async (req, res, next) => {
  try {
    const { request_id } = req.params;
    const { approved_by, rejected_by } = req.body;
    const approverId = approved_by || rejected_by;
    
    if (!approverId) {
      return res.status(400).json({
        success: false,
        message: 'Approver ID is required'
      });
    }
    
    // Check if approver exists
    const approverCheck = await checkStaffExists(approverId);
    if (!approverCheck.exists) {
      return res.status(400).json({
        success: false,
        message: `Approver ID ${approverId} does not exist`
      });
    }
    
    // Add approver info to request
    req.approverInfo = approverCheck.staff;
    
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
 * Leave operation logging
 */
const logLeaveOperation = (operation) => {
  return (req, res, next) => {
    const timestamp = new Date().toISOString();
    const { staff_id, request_id } = req.params;
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
    
    console.log(`[${timestamp}] ${operation} - Staff: ${staff_id || 'all'} - Request: ${request_id || 'none'} - IP: ${clientIP}`);
    
    // Log response status
    const originalSend = res.send;
    res.send = function(data) {
      const statusCode = res.statusCode;
      console.log(`[${timestamp}] ${operation} completed - Status: ${statusCode}`);
      
      if (statusCode >= 400) {
        try {
          const parsedData = JSON.parse(data);
          console.log(`[${timestamp}] ${operation} error details:`, parsedData.message || 'Unknown error');
        } catch (parseError) {
          // Ignore parse errors
        }
      }
      
      originalSend.call(this, data);
    };
    
    next();
  };
};

/**
 * Unified error handling
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
 * Content-Type validation
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
  validateLeaveRequestData,
  validateApprovalPermission,
  logLeaveOperation,
  handleLeaveErrors,
  validateContentType
};

console.log('Leave management middleware loaded successfully!');