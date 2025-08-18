// routes/holidayRoutes.js - Simplified Leave Management Routes
const express = require('express');
const router = express.Router();
const { 
  getAllStaffLeaveQuotas,
  getStaffLeaveQuota,
  getAllLeaveRequests,
  getPendingLeaveRequests,
  updateStaffLeaveQuota
} = require('../controllers/leaveController');

console.log('Loading Leave Management Routes...');

// ===== LEAVE QUOTA MANAGEMENT =====

// GET /api/holidays/quotas - Get all staff leave quotas
router.get('/quotas', getAllStaffLeaveQuotas);

// GET /api/holidays/quotas/:staff_id - Get specific staff leave quota
router.get('/quotas/:staff_id', getStaffLeaveQuota);

// PUT /api/holidays/quotas/:staff_id - Update staff leave quota
router.put('/quotas/:staff_id', updateStaffLeaveQuota);

// ===== LEAVE REQUEST MANAGEMENT =====

// GET /api/holidays/requests - Get all leave requests
router.get('/requests', getAllLeaveRequests);

// GET /api/holidays/requests/pending - Get pending leave requests
router.get('/requests/pending', getPendingLeaveRequests);

module.exports = router;