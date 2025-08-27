// routes/leaveRoutes.js - 簡化的請假管理路由
const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');

// 導入控制器
const { 
  getAllLeaveRequests,
  getMyLeaveRequests,
  submitLeaveRequest,
  approveLeaveRequest,
  rejectLeaveRequest,
  getAllLeaveQuotas,
  getMyLeaveQuota
} = require('../controllers/leaveController');

console.log('載入簡化請假管理路由...');

// ===== 速率限制 =====
const requestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分鐘
  max: 20,
  message: {
    success: false,
    message: '請求過於頻繁，請稍後再試'
  }
});

// ===== 驗證中間件 =====
const validateStaffId = (req, res, next) => {
  const { staff_id } = req.params;
  const staffIdInt = parseInt(staff_id);
  
  if (isNaN(staffIdInt) || staffIdInt <= 0) {
    return res.status(400).json({
      success: false,
      message: '無效的員工ID'
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
      message: '無效的申請ID'
    });
  }
  
  req.requestId = requestIdInt;
  next();
};

// ===== 路由定義 =====

// 測試端點
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: '請假管理系統運行正常',
    timestamp: new Date().toISOString(),
    available_endpoints: [
      'GET /quotas - HR查看所有配額',
      'GET /quotas/:staff_id - 查看員工配額',
      'GET /requests - HR查看所有申請',
      'GET /requests/staff/:staff_id - 員工查看自己的申請記錄',
      'POST /requests - 員工提交請假申請',
      'PUT /requests/:request_id/approve - HR批准申請',
      'PUT /requests/:request_id/reject - HR拒絕申請'
    ]
  });
});

// HR功能：查看所有配額
router.get('/quotas', getAllLeaveQuotas);

// 查看員工配額
router.get('/quotas/:staff_id', 
  validateStaffId,
  getMyLeaveQuota
);

// HR功能：查看所有請假申請
router.get('/requests', 
  getAllLeaveRequests
);

// 員工功能：查看自己的請假記錄
router.get('/requests/staff/:staff_id', 
  validateStaffId,
  getMyLeaveRequests
);

// 員工功能：提交請假申請
router.post('/requests',
  requestLimiter,
  submitLeaveRequest
);

// HR功能：批准請假申請
router.put('/requests/:request_id/approve',
  validateRequestId,
  approveLeaveRequest
);

// HR功能：拒絕請假申請
router.put('/requests/:request_id/reject',
  validateRequestId,
  rejectLeaveRequest
);

// ===== 錯誤處理 =====
router.use((err, req, res, next) => {
  console.error('請假路由錯誤:', err);
  
  if (err.code === '23505') {
    return res.status(400).json({
      success: false,
      message: '重複的申請'
    });
  }
  
  res.status(500).json({
    success: false,
    message: '服務器內部錯誤',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404處理
router.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `路由不存在: ${req.method} ${req.originalUrl}`
  });
});

module.exports = router;