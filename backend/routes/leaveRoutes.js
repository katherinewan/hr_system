// routes/leaveRoutes.js - Updated Leave Management Routes
const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');

// Import controllers
const { 
  getAllLeaveRequests,
  getPendingRequests,
  getMyLeaveRequests,
  submitLeaveRequest,
  approveLeaveRequest,
  rejectLeaveRequest,
  cancelLeaveRequest,
  getAllLeaveQuotas,
  getMyLeaveQuota
} = require('../controllers/leaveController');

console.log('Loading leave management routes...');

// ===== Rate Limiting =====
const requestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: {
    success: false,
    message: 'Too many requests, please try again later'
  }
});

// ===== Validation Middleware =====
const validateStaffId = (req, res, next) => {
  const { staff_id } = req.params;
  const staffIdInt = parseInt(staff_id);
  
  if (isNaN(staffIdInt) || staffIdInt <= 0) {
    return res.status(400).json({
      success: false,
      message: 'Invalid staff ID'
    });
  }
  
  req.staffId = staffIdInt;
  next();
};

const validateRequestId = (req, res, next) => {
  const { request_id } = req.params;
  const requestIdInt = parseInt(request_id);
  
  if (isNaN(requestIdInt) || requestIdInt <= 0) {
    return res.status(400).json({
      success: false,
      message: 'Invalid request ID'
    });
  }
  
  req.requestId = requestIdInt;
  next();
};

// ===== Route Definitions =====

// Test endpoint
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Leave management system is running normally',
    timestamp: new Date().toISOString(),
    available_endpoints: [
      'GET /quotas - HR view all quotas',
      'GET /quotas/:staff_id - View staff quota',
      'GET /requests - HR view all requests',
      'GET /requests/pending - HR view pending requests',
      'GET /requests/staff/:staff_id - Staff view own leave records',
      'POST /requests - Staff submit leave request',
      'PUT /requests/:request_id/approve - HR approve request',
      'PUT /requests/:request_id/reject - HR reject request',
      'PUT /requests/:request_id/cancel - Staff cancel request'
    ]
  });
});

// HR function: View all quotas
router.get('/quotas', getAllLeaveQuotas);

// View staff quota
router.get('/quotas/:staff_id', 
  validateStaffId,
  getMyLeaveQuota
);

// HR function: View all leave requests
router.get('/requests', getAllLeaveRequests);

// HR function: View pending requests specifically
router.get('/requests/pending', getPendingRequests);

// Staff function: View own leave records
router.get('/requests/staff/:staff_id', 
  validateStaffId,
  getMyLeaveRequests
);

// Staff function: Submit leave request
router.post('/requests',
  requestLimiter,
  submitLeaveRequest
);

// HR function: Approve leave request
router.put('/requests/:request_id/approve',
  validateRequestId,
  approveLeaveRequest
);

// HR function: Reject leave request
router.put('/requests/:request_id/reject',
  validateRequestId,
  rejectLeaveRequest
);

// Staff function: Cancel leave request
router.put('/requests/:request_id/cancel',
  validateRequestId,
  cancelLeaveRequest
);

// ===== Error Handling =====
router.use((err, req, res, next) => {
  console.error('Leave route error:', err);
  
  if (err.code === '23505') {
    return res.status(400).json({
      success: false,
      message: 'Duplicate request'
    });
  }
  
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 handler
router.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
    available_routes: [
      'GET /test',
      'GET /quotas',
      'GET /quotas/:staff_id',
      'GET /requests',
      'GET /requests/pending',
      'GET /requests/staff/:staff_id',
      'POST /requests',
      'PUT /requests/:request_id/approve',
      'PUT /requests/:request_id/reject',
      'PUT /requests/:request_id/cancel'
    ]
  });
});

module.exports = router;