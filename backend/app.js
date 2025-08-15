// app.js - 主應用程式
const express = require('express');
const cors = require('cors');
require('dotenv').config();

// 匯入資料庫配置
const { pool, testConnection } = require('./config/database');

// 建立 Express 應用程式
const app = express();
const PORT = process.env.PORT || 3001;

// CORS 配置 - 支援前端開發
app.use(cors({
  origin: [
    'http://localhost:3000',  // React 開發伺服器
    'http://localhost:3001',  // 備用端口
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001',
    // 生產環境的前端域名
    // 'https://yourapp.com'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// 基本中間件
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 請求日志中間件
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`${timestamp} - ${req.method} ${req.path}`);
  next();
});

// 主頁路由
app.get('/', (req, res) => {
  res.json({
    message: '🎉 HR 管理系統 API 伺服器',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
    endpoints: {
      auth: '/api/auth/*',
      staff: '/api/staff/*',
      users: '/api/users/*',
      holidays: '/api/holidays/*',  // 🆕 新增假期管理端點
      health: '/health',
      dbTest: '/api/db-test'
    }
  });
});

// 健康檢查路由（包含資料庫狀態）
app.get('/health', async (req, res) => {
  try {
    const dbStatus = await testConnection();
    
    res.json({
      status: 'OK',
      database: dbStatus ? 'connected' : 'disconnected',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      memory: process.memoryUsage(),
      port: PORT
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      database: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 資料庫測試路由 - 🆕 增加假期相關表的檢查
app.get('/api/db-test', async (req, res) => {
  try {
    console.log('🔍 測試資料庫連線...');
    const result = await pool.query('SELECT NOW() as server_time, version() as pg_version');
    
    // 測試基本表
    const userCountResult = await pool.query('SELECT COUNT(*) as user_count FROM user_accounts');
    const staffCountResult = await pool.query('SELECT COUNT(*) as staff_count FROM staff');
    
    // 🆕 測試假期相關表
    let holidayTables = {};
    try {
      const leaveQuotaResult = await pool.query('SELECT COUNT(*) as quota_count FROM leave');
      const leaveRequestResult = await pool.query('SELECT COUNT(*) as request_count FROM leave_requests');
      const leaveHistoryResult = await pool.query('SELECT COUNT(*) as history_count FROM leave_request_history');
      
      holidayTables = {
        leave_quotas: leaveQuotaResult.rows[0].quota_count,
        leave_requests: leaveRequestResult.rows[0].request_count,
        leave_history: leaveHistoryResult.rows[0].history_count
      };
    } catch (holidayError) {
      console.warn('⚠️ 假期表檢查失敗:', holidayError.message);
      holidayTables = { error: '假期表尚未創建或無權限訪問' };
    }
    
    res.json({
      success: true,
      message: '資料庫連線正常',
      data: {
        server_time: result.rows[0].server_time,
        postgresql_version: result.rows[0].pg_version,
        tables: {
          user_accounts: userCountResult.rows[0].user_count,
          staff: staffCountResult.rows[0].staff_count,
          ...holidayTables
        }
      }
    });
  } catch (error) {
    console.error('❌ 資料庫測試錯誤:', error);
    res.status(500).json({
      success: false,
      message: '資料庫連線失敗',
      error: error.message
    });
  }
});

// ===== 載入路由 =====

// 載入認證路由 - 最重要！
try {
  const authRoutes = require('./routes/authRoutes');
  app.use('/api/auth', authRoutes);
  console.log('✅ 認證路由載入成功');
} catch (error) {
  console.error('❌ 認證路由載入失敗:', error.message);
}

// 載入員工路由
try {
  const staffRoutes = require('./routes/staffRoutes');
  app.use('/api/staff', staffRoutes);
  console.log('✅ 員工路由載入成功');
} catch (error) {
  console.warn('⚠️ 員工路由載入失敗:', error.message);
}

// 載入員工帳號路由
try {
  const userRoutes = require('./routes/userRoutes');
  app.use('/api/users', userRoutes);
  console.log('✅ 用戶路由載入成功');
} catch (error) {
  console.warn('⚠️ 用戶路由載入失敗:', error.message);
}

// 🆕 載入假期管理路由 - 重要新增！
try {
  // 先嘗試載入 holidayRoutes.js
  let holidayRoutes;
  try {
    holidayRoutes = require('./routes/holidayRoutes');
    console.log('✅ 假期管理路由載入成功 (holidayRoutes.js)');
  } catch (holidayError) {
    // 如果 holidayRoutes.js 不存在，嘗試載入 leaveRoutes.js
    try {
      holidayRoutes = require('./routes/leaveRoutes');
      console.log('✅ 假期管理路由載入成功 (leaveRoutes.js)');
    } catch (leaveError) {
      throw new Error('Neither holidayRoutes.js nor leaveRoutes.js found');
    }
  }
  
  app.use('/api/holidays', holidayRoutes);
  console.log('✅ 假期管理路由掛載到 /api/holidays');
  
} catch (error) {
  console.error('❌ 假期管理路由載入失敗:', error.message);
  console.error('請確保 ./routes/holidayRoutes.js 或 ./routes/leaveRoutes.js 文件存在');
}

// 載入其他路由（可選）
const optionalRoutes = [
  { path: './routes/attendRoutes', mount: '/api/attendance', name: '出勤路由' },
  { path: './routes/positionRoutes', mount: '/api/positions', name: '職位路由' },
  { path: './routes/departRoutes', mount: '/api/departments', name: '部門路由' },
  { path: './routes/salaryRoutes', mount: '/api/salaries', name: '薪資路由' },
  { path: './routes/leaveRoutes', mount: '/api/leave', name: '休假路由' }
];

optionalRoutes.forEach(route => {
  try {
    const routeModule = require(route.path);
    app.use(route.mount, routeModule);
    console.log(`✅ ${route.name}載入成功`);
  } catch (error) {
    console.warn(`⚠️ ${route.name}載入失敗:`, error.message);
  }
});

// 測試登入端點
app.get('/api/auth/test', (req, res) => {
  res.json({
    success: true,
    message: '認證路由測試成功',
    endpoints: {
      login: 'POST /api/auth/login',
      register: 'POST /api/auth/register',
      verify: 'POST /api/auth/verify',
      me: 'GET /api/auth/me'
    }
  });
});

// 🆕 假期管理測試端點
app.get('/api/holidays/test', (req, res) => {
  res.json({
    success: true,
    message: '假期管理路由測試成功',
    version: '1.0.0',
    endpoints: {
      // 配額管理
      quotas: {
        'GET /api/holidays/quotas': '獲取所有員工假期配額',
        'GET /api/holidays/quotas/:staff_id': '獲取指定員工配額',
        'POST /api/holidays/quotas': '初始化員工配額',
        'PUT /api/holidays/quotas/:staff_id': '更新員工配額'
      },
      // 申請管理
      requests: {
        'GET /api/holidays/requests': '獲取所有假期申請',
        'POST /api/holidays/requests': '提交假期申請',
        'GET /api/holidays/requests/pending': '獲取待審核申請',
        'PUT /api/holidays/requests/:id/approve': '批准申請',
        'PUT /api/holidays/requests/:id/reject': '拒絕申請',
        'PUT /api/holidays/requests/:id/cancel': '取消申請'
      },
      // 統計報告
      statistics: {
        'GET /api/holidays/statistics/overview': '統計概覽',
        'GET /api/holidays/statistics/by-type': '按類型統計',
        'GET /api/holidays/statistics/by-department': '按部門統計',
        'GET /api/holidays/statistics/by-month': '按月份統計'
      },
      // 其他功能
      other: {
        'GET /api/holidays/eligibility': '檢查假期資格',
        'GET /api/holidays/calendar/:year/:month': '假期日曆',
        'GET /api/holidays/search/by-date-range': '日期範圍搜索'
      }
    }
  });
});

// 404 處理 - 🆕 更新可用路由列表
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: '找不到該路由',
    path: req.originalUrl,
    method: req.method,
    availableRoutes: [
      'GET /',
      'GET /health',
      'GET /api/db-test',
      // 認證路由
      'POST /api/auth/login',
      'POST /api/auth/register',
      'GET /api/auth/test',
      // 🆕 假期管理路由
      'GET /api/holidays/test',
      'GET /api/holidays/quotas',
      'POST /api/holidays/requests',
      'GET /api/holidays/requests/pending',
      'GET /api/holidays/statistics/overview'
    ]
  });
});

// 🆕 假期管理專用錯誤處理中間件
app.use('/api/holidays', (err, req, res, next) => {
  console.error('❌ 假期管理錯誤:', err);
  
  // PostgreSQL 錯誤處理
  if (err.code) {
    switch (err.code) {
      case '23505': // 唯一性約束違反
        return res.status(400).json({
          success: false,
          message: '數據重複，請檢查輸入資料',
          error_code: 'DUPLICATE_DATA'
        });
      case '23503': // 外鍵約束違反
        return res.status(400).json({
          success: false,
          message: '相關數據不存在，請檢查輸入資料',
          error_code: 'FOREIGN_KEY_VIOLATION'
        });
      case '23514': // 檢查約束違反
        return res.status(400).json({
          success: false,
          message: '數據不符合業務規則',
          error_code: 'CHECK_CONSTRAINT_VIOLATION'
        });
      default:
        return res.status(500).json({
          success: false,
          message: '數據庫操作失敗',
          error_code: 'DATABASE_ERROR'
        });
    }
  }
  
  res.status(500).json({
    success: false,
    message: '假期管理系統錯誤',
    error: process.env.NODE_ENV === 'development' ? err.message : '內部伺服器錯誤'
  });
});

// 一般錯誤處理中間件
app.use((err, req, res, next) => {
  console.error('❌ 伺服器錯誤:', err);
  res.status(500).json({
    success: false,
    message: '伺服器內部錯誤',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 啟動伺服器 - 🆕 更新啟動訊息
const startServer = async () => {
  console.log('🚀 ===== HR 管理系統啟動 =====');
  
  // 測試資料庫連線
  const dbConnected = await testConnection();
  
  app.listen(PORT, () => {
    console.log(`📡 伺服器運行在: http://localhost:${PORT}`);
    console.log(`🗄️  資料庫狀態: ${dbConnected ? '✅ 已連線' : '❌ 未連線'}`);
    console.log(`🕐 啟動時間: ${new Date().toLocaleString()}`);
    console.log('📋 主要 API 路由:');
    console.log('   🔐 認證模組:');
    console.log('      POST   /api/auth/login          - 用戶登入');
    console.log('      POST   /api/auth/register       - 用戶註冊');
    console.log('      GET    /api/auth/me             - 獲取當前用戶');
    console.log('      POST   /api/auth/verify         - 驗證token');
    console.log('      GET    /api/auth/test           - 測試認證路由');
    console.log('   🏖️  假期管理模組:');
    console.log('      GET    /api/holidays/quotas     - 獲取假期配額');
    console.log('      POST   /api/holidays/requests   - 提交假期申請');
    console.log('      GET    /api/holidays/requests/pending - 待審核申請');
    console.log('      GET    /api/holidays/statistics/overview - 統計概覽');
    console.log('      GET    /api/holidays/test       - 測試假期路由');
    console.log('   🔧 系統功能:');
    console.log('      GET    /health                  - 健康檢查');
    console.log('      GET    /api/db-test             - 資料庫測試');
    console.log('=======================================');
  });
};

// 啟動
startServer();

// 優雅關閉處理
process.on('SIGINT', () => {
  console.log('\n🔄 正在關閉伺服器...');
  pool.end(() => {
    console.log('✅ 資料庫連線池已關閉');
    process.exit(0);
  });
});

module.exports = app;