// routes/leaveRoutes.js - Fixed Leave Management Routes
const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');

// Import controller functions
const { 
  getAllStaffLeaveQuotas,
  getStaffLeaveQuota,
  updateStaffLeaveQuota,
  getAllLeaveRequests,
  getPendingLeaveRequests,
  submitLeaveRequest,
  cancelLeaveRequest
} = require('../controllers/leaveController');

console.log('Loading Fixed Leave Management Routes...');

// ===== MIDDLEWARE =====

// Rate limiting for leave requests
const leaveRequestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Maximum 10 requests per 15 minutes
  message: {
    success: false,
    message: 'Too many leave requests. Please try again later.',
    retry_after: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiting for sensitive operations (updates/cancellations)
const sensitiveOperationLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 20, // Maximum 20 operations per 5 minutes
  message: {
    success: false,
    message: 'Too many operations. Please slow down.',
    retry_after: '5 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Validation middleware for staff_id parameter (now expects integers)
const validateStaffId = (req, res, next) => {
  const { staff_id } = req.params;
  
  if (!staff_id) {
    return res.status(400).json({
      success: false,
      message: 'Staff ID is required'
    });
  }
  
  // Validate staff_id as integer
  const staffIdInt = parseInt(staff_id);
  if (isNaN(staffIdInt) || staffIdInt <= 0) {
    return res.status(400).json({
      success: false,
      message: 'Invalid staff ID format. Must be a positive integer.'
    });
  }
  
  // Add parsed integer to request
  req.staffId = staffIdInt;
  
  next();
};

// Validation middleware for request_id parameter
const validateRequestId = (req, res, next) => {
  const { request_id } = req.params;
  
  if (!request_id) {
    return res.status(400).json({
      success: false,
      message: 'Request ID is required'
    });
  }
  
  // Validate request_id as integer
  const requestIdInt = parseInt(request_id);
  if (isNaN(requestIdInt) || requestIdInt <= 0) {
    return res.status(400).json({
      success: false,
      message: 'Invalid request ID format. Must be a positive integer.'
    });
  }
  
  // Add parsed integer to request
  req.requestId = requestIdInt;
  
  next();
};

// Validation middleware for pagination parameters
const validatePagination = (req, res, next) => {
  const { limit, offset } = req.query;
  
  if (limit && (isNaN(limit) || parseInt(limit) <= 0 || parseInt(limit) > 1000)) {
    return res.status(400).json({
      success: false,
      message: 'Limit must be a positive number between 1 and 1000'
    });
  }
  
  if (offset && (isNaN(offset) || parseInt(offset) < 0)) {
    return res.status(400).json({
      success: false,
      message: 'Offset must be a non-negative number'
    });
  }
  
  next();
};

// Validation middleware for date parameters
const validateDateParams = (req, res, next) => {
  const { start_date, end_date, leave_year, year } = req.query;
  
  // Validate date format
  if (start_date && !/^\d{4}-\d{2}-\d{2}$/.test(start_date)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid start_date format. Use YYYY-MM-DD format.'
    });
  }
  
  if (end_date && !/^\d{4}-\d{2}-\d{2}$/.test(end_date)) {
    return res.status(400).json({
      success: false,
      message: 'Invalid end_date format. Use YYYY-MM-DD format.'
    });
  }
  
  // Validate year parameter
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
  
  // Validate date range if both provided
  if (start_date && end_date) {
    const start = new Date(start_date);
    const end = new Date(end_date);
    
    if (start > end) {
      return res.status(400).json({
        success: false,
        message: 'Start date cannot be later than end date'
      });
    }
  }
  
  next();
};

// Validation middleware for leave type and status
const validateLeaveParams = (req, res, next) => {
  const { leave_type, status } = req.query;
  
  if (leave_type) {
    const validLeaveTypes = ['sick_leave', 'annual_leave', 'casual_leave', 'maternity_leave', 'paternity_leave'];
    
    if (!validLeaveTypes.includes(leave_type)) {
      return res.status(400).json({
        success: false,
        message: `Invalid leave type. Valid types: ${validLeaveTypes.join(', ')}`
      });
    }
  }
  
  if (status) {
    const validStatuses = ['Pending', 'Approved', 'Rejected', 'Cancelled'];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status. Valid statuses: ${validStatuses.join(', ')}`
      });
    }
  }
  
  next();
};

// Content-Type validation middleware
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

// Logging middleware for leave operations
const logLeaveOperation = (operation) => {
  return (req, res, next) => {
    const timestamp = new Date().toISOString();
    const { staff_id, request_id } = req.params;
    const queryParams = Object.keys(req.query).length > 0 ? JSON.stringify(req.query) : 'none';
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
    
    console.log(`[${timestamp}] ${operation} - Staff: ${staff_id || 'all'} - Request: ${request_id || 'none'} - IP: ${clientIP} - Query: ${queryParams}`);
    
    // Log response status after request completion
    const originalSend = res.send;
    res.send = function(data) {
      console.log(`[${timestamp}] ${operation} completed - Status: ${res.statusCode}`);
      
      // Log additional details for errors
      if (res.statusCode >= 400) {
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

// ===== API ROUTES =====

// Test endpoint
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Leave management routes are working properly',
    timestamp: new Date().toISOString(),
    version: '2.0.0',
    available_endpoints: {
      quotas: {
        'GET /quotas': 'Get all staff leave quotas with filtering and pagination',
        'GET /quotas/:staff_id': 'Get specific staff leave quota',
        'PUT /quotas/:staff_id': 'Update staff leave quota'
      },
      requests: {
        'GET /requests': 'Get all leave requests with filtering and pagination',
        'POST /requests': 'Submit new leave request',
        'GET /requests/pending': 'Get pending leave requests with priority',
        'PUT /requests/:request_id/cancel': 'Cancel leave request'
      }
    },
    data_types: {
      staff_id: 'integer',
      request_id: 'integer',
      dates: 'YYYY-MM-DD format',
      leave_types: ['sick_leave', 'annual_leave', 'casual_leave', 'maternity_leave', 'paternity_leave'],
      statuses: ['Pending', 'Approved', 'Rejected', 'Cancelled']
    }
  });
});

// ===== LEAVE QUOTA MANAGEMENT =====

// GET /api/holidays/quotas - Get all staff leave quotas
router.get('/quotas', 
  validatePagination,
  validateDateParams,
  validateLeaveParams,
  logLeaveOperation('GET_ALL_QUOTAS'),
  getAllStaffLeaveQuotas
);

// GET /api/holidays/quotas/:staff_id - Get specific staff leave quota
router.get('/quotas/:staff_id', 
  validateStaffId,
  validateDateParams,
  logLeaveOperation('GET_STAFF_QUOTA'),
  getStaffLeaveQuota
);

// PUT /api/holidays/quotas/:staff_id - Update staff leave quota
router.put('/quotas/:staff_id', 
  validateContentType,
  validateStaffId,
  sensitiveOperationLimiter,
  logLeaveOperation('UPDATE_QUOTA'),
  updateStaffLeaveQuota
);

// ===== LEAVE REQUEST MANAGEMENT =====

// GET /api/holidays/requests - Get all leave requests
router.get('/requests', 
  validatePagination,
  validateDateParams,
  validateLeaveParams,
  logLeaveOperation('GET_ALL_REQUESTS'),
  getAllLeaveRequests
);

// POST /api/holidays/requests - Submit new leave request
router.post('/requests',
  validateContentType,
  leaveRequestLimiter,
  logLeaveOperation('SUBMIT_REQUEST'),
  submitLeaveRequest
);

// GET /api/holidays/requests/pending - Get pending leave requests
router.get('/requests/pending', 
  validatePagination,
  logLeaveOperation('GET_PENDING_REQUESTS'),
  getPendingLeaveRequests
);

// PUT /api/holidays/requests/:request_id/cancel - Cancel leave request
router.put('/requests/:request_id/cancel',
  validateContentType,
  validateRequestId,
  sensitiveOperationLimiter,
  logLeaveOperation('CANCEL_REQUEST'),
  cancelLeaveRequest
);

// ===== ERROR HANDLING MIDDLEWARE =====

// Route-specific error handler
router.use((err, req, res, next) => {
  console.error('Leave routes error:', err);
  
  // Handle specific error types
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      details: err.message
    });
  }
  
  if (err.code === '23505') { // PostgreSQL unique constraint violation
    return res.status(409).json({
      success: false,
      message: 'Duplicate record detected',
      error_code: 'DUPLICATE_ENTRY'
    });
  }
  
  if (err.code === '23503') { // PostgreSQL foreign key constraint violation
    return res.status(400).json({
      success: false,
      message: 'Referenced record not found',
      error_code: 'FOREIGN_KEY_VIOLATION'
    });
  }
  
  if (err.code === '23514') { // PostgreSQL check constraint violation
    return res.status(400).json({
      success: false,
      message: 'Data violates business rules',
      error_code: 'CHECK_CONSTRAINT_VIOLATION'
    });
  }
  
  if (err.code === '22007') { // PostgreSQL invalid date format
    return res.status(400).json({
      success: false,
      message: 'Invalid date format',
      error_code: 'INVALID_DATE_FORMAT'
    });
  }
  
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({
      success: false,
      message: 'Invalid JSON in request body',
      error_code: 'INVALID_JSON'
    });
  }
  
  if (err.type === 'entity.too.large') {
    return res.status(413).json({
      success: false,
      message: 'Request body too large',
      error_code: 'PAYLOAD_TOO_LARGE'
    });
  }
  
  // Default error response
  res.status(500).json({
    success: false,
    message: 'Internal server error in leave management',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined,
    timestamp: new Date().toISOString()
  });
});

// 404 handler for unknown leave routes
router.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Leave management route not found: ${req.method} ${req.originalUrl}`,
    available_routes: [
      'GET /api/holidays/test',
      'GET /api/holidays/quotas',
      'GET /api/holidays/quotas/:staff_id',
      'PUT /api/holidays/quotas/:staff_id',
      'GET /api/holidays/requests',
      'POST /api/holidays/requests',
      'GET /api/holidays/requests/pending',
      'PUT /api/holidays/requests/:request_id/cancel'
    ],
    timestamp: new Date().toISOString()
  });
});

module.exports = router;

console.log('Fixed Leave Management Routes loaded successfully!');