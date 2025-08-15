const express = require('express');
const router = express.Router();

console.log('🛣️  載入員工帳號路由...');

const {
  getAllUsers,
  searchUsersByName,
  searchUsersById,
  createUser,
  changePassword,
  updateUserRole,
  toggleUserLock,
  updateUser
} = require('../controllers/userController');

const logRequest = (req, res, next) => {
  console.log(`🌐 ${req.method} ${req.originalUrl} - ${new Date().toLocaleTimeString()}`);
  if (req.body && Object.keys(req.body).length > 0) {
    // 不要記錄密碼等敏感信息
    const safeBody = { ...req.body };
    if (safeBody.password) safeBody.password = '***';
    if (safeBody.old_password) safeBody.old_password = '***';
    if (safeBody.new_password) safeBody.new_password = '***';
    console.log('📦 Request body:', safeBody);
  }
  next();
};

// 應用記錄中間件到所有路由
router.use(logRequest);

// 測試路由 - 放在最前面
router.get('/test/ping', (req, res) => {
  res.json({
    success: true,
    message: '員工帳號路由運作正常',
    timestamp: new Date().toISOString()
  });
});

// 創建新用戶路由 - 放在搜尋路由之前
router.post('/', createUser);

// 搜尋路由 - 放在具體路徑之前
router.get('/search', searchUsersByName);

// 更改密碼路由
router.put('/change-password', changePassword);

// 更新用戶角色路由
router.put('/:user_id/role', updateUserRole);

// 切換用戶鎖定狀態路由
router.put('/:user_id/toggle-lock', toggleUserLock);

// 更新用戶資料路由 - 支持前端的編輯功能
router.put('/:user_id', updateUser);

// 根據ID獲取特定用戶 - 放在通用路由之前
router.get('/:user_id', searchUsersById);

// 獲取所有用戶 - 放在最後
router.get('/', getAllUsers);

module.exports = router;