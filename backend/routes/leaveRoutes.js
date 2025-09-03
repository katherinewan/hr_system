// routes/leaveRoutes.js
const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');

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

// Rate limiting
const requestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: {
    success: false,
    message: 'Too many requests, please try again later'
  }
});

// Validation middleware
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

// Routes
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Leave management system is running normally',
    timestamp: new Date().toISOString()
  });
});

router.get('/quotas', getAllLeaveQuotas);
router.get('/quotas/:staff_id', validateStaffId, getMyLeaveQuota);
router.get('/requests', getAllLeaveRequests);
router.get('/requests/pending', getPendingRequests);
router.get('/requests/staff/:staff_id', validateStaffId, getMyLeaveRequests);
router.post('/requests', requestLimiter, submitLeaveRequest);
router.put('/requests/:request_id/approve', validateRequestId, approveLeaveRequest);
router.put('/requests/:request_id/reject', validateRequestId, rejectLeaveRequest);
router.put('/requests/:request_id/cancel', validateRequestId, cancelLeaveRequest);

// Error handling
router.use((err, req, res, next) => {
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

router.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`
  });
});

module.exports = router;