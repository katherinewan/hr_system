const express = require('express');
const router = express.Router();

console.log('🛣️  載入出勤路由...');

// 匯入出勤控制器
const {
  getAttendanceByStaffId,
  getAllAttendance,
  markAttendance,
  getAttendanceReport,
  updateAttendance,
  deleteAttendance,
  createAttendance,
  getMyAttendance  // 新添加的函數
} = require('../controllers/attendController');

// 匯入認證中間件 - 使用你現有的 authMiddleware
const { authMiddleware } = require('../middleware/auth');

// 記錄請求的中間件
const logRequest = (req, res, next) => {
  console.log(`🌐 ${req.method} ${req.originalUrl} - ${new Date().toLocaleTimeString()}`);
  next();
};

// 應用記錄中間件到所有路由
router.use(logRequest);

// 路由定義 - 注意順序很重要！

// GET /api/attendance/report - 獲取出勤報表
router.get('/report', getAttendanceReport);

// GET /api/attendance/my-records - 獲取當前員工的出勤記錄（需要認證）
router.get('/my-records', authMiddleware, getMyAttendance);

// GET /api/attendance - 獲取所有出勤記錄（支持篩選和分頁）
router.get('/', getAllAttendance);

// POST /api/attendance/clock - 員工打卡（上班/下班）
router.post('/clock', markAttendance);

// GET /api/attendance/staff/:staff_id - 根據員工 ID 獲取出勤記錄
router.get('/staff/:staff_id', getAttendanceByStaffId);

// PUT /api/attendance/:attendance_log - 更新出勤記錄
router.put('/:attendance_log', updateAttendance);

// DELETE /api/attendance/:attendance_log - 刪除出勤記錄
router.delete('/:attendance_log', deleteAttendance);

// POST /api/attendance - 創建新的出勤記錄
router.post('/', createAttendance);

module.exports = router;