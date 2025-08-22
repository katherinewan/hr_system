// app.js - Main application
const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Import database configuration
const { pool, testConnection } = require('./config/database');

// Create Express application
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: [
    'http://localhost:3000',  // React development server
    'http://localhost:3001',  // Backup port
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001',
    'https://hr-system-tau.vercel.app' // Replace with your actual Vercel URL
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Basic middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`${timestamp} - ${req.method} ${req.path}`);
  next();
});

// Home route
app.get('/', (req, res) => {
  res.json({
    message: 'HR Management System API Server',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
    endpoints: {
      auth: '/api/auth/*',
      staff: '/api/staff/*',
      users: '/api/users/*',
      holidays: '/api/holidays/*',  // New holiday management endpoint
      health: '/health',
      dbTest: '/api/db-test'
    }
  });
});

// Health check route (including database status)
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

// Database test route - Added holiday-related table checks
app.get('/api/db-test', async (req, res) => {
  try {
    console.log('Testing database connection...');
    const result = await pool.query('SELECT NOW() as server_time, version() as pg_version');
    
    // Test basic tables
    const userCountResult = await pool.query('SELECT COUNT(*) as user_count FROM user_accounts');
    const staffCountResult = await pool.query('SELECT COUNT(*) as staff_count FROM staff');
    
    // Test holiday-related tables
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
      console.warn('Holiday table check failed:', holidayError.message);
      holidayTables = { error: 'Holiday tables not created or no access permission' };
    }
    
    res.json({
      success: true,
      message: 'Database connection normal',
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
    console.error('Database test error:', error);
    res.status(500).json({
      success: false,
      message: 'Database connection failed',
      error: error.message
    });
  }
});

// ===== Load Routes =====

// Load authentication routes - Most important!
try {
  const authRoutes = require('./routes/authRoutes');
  app.use('/api/auth', authRoutes);
  console.log('Authentication routes loaded successfully');
} catch (error) {
  console.error('Authentication routes loading failed:', error.message);
}

// Load staff routes
try {
  const staffRoutes = require('./routes/staffRoutes');
  app.use('/api/staff', staffRoutes);
  console.log('Staff routes loaded successfully');
} catch (error) {
  console.warn('Staff routes loading failed:', error.message);
}

// Load user account routes
try {
  const userRoutes = require('./routes/userRoutes');
  app.use('/api/users', userRoutes);
  console.log('User routes loaded successfully');
} catch (error) {
  console.warn('User routes loading failed:', error.message);
}

// Load holiday management routes - Important addition!
try {
  // First try to load holidayRoutes.js
  let holidayRoutes;
  try {
    holidayRoutes = require('./routes/holidayRoutes');
    console.log('Holiday management routes loaded successfully (holidayRoutes.js)');
  } catch (holidayError) {
    // If holidayRoutes.js doesn't exist, try to load leaveRoutes.js
    try {
      holidayRoutes = require('./routes/leaveRoutes');
      console.log('Holiday management routes loaded successfully (leaveRoutes.js)');
    } catch (leaveError) {
      throw new Error('Neither holidayRoutes.js nor leaveRoutes.js found');
    }
  }
  
  app.use('/api/holidays', holidayRoutes);
  console.log('Holiday management routes mounted to /api/holidays');
  
} catch (error) {
  console.error('Holiday management routes loading failed:', error.message);
  console.error('Please ensure ./routes/holidayRoutes.js or ./routes/leaveRoutes.js file exists');
}

// Load other routes (optional)
const optionalRoutes = [
  { path: './routes/attendRoutes', mount: '/api/attendance', name: 'Attendance routes' },
  { path: './routes/positionRoutes', mount: '/api/positions', name: 'Position routes' },
  { path: './routes/departRoutes', mount: '/api/departments', name: 'Department routes' },
  { path: './routes/salaryRoutes', mount: '/api/salaries', name: 'Salary routes' },
  { path: './routes/leaveRoutes', mount: '/api/leave', name: 'Leave routes' }
];

optionalRoutes.forEach(route => {
  try {
    const routeModule = require(route.path);
    app.use(route.mount, routeModule);
    console.log(`${route.name} loaded successfully`);
  } catch (error) {
    console.warn(`${route.name} loading failed:`, error.message);
  }
});

// Test login endpoint
app.get('/api/auth/test', (req, res) => {
  res.json({
    success: true,
    message: 'Authentication route test successful',
    endpoints: {
      login: 'POST /api/auth/login',
      register: 'POST /api/auth/register',
      verify: 'POST /api/auth/verify',
      me: 'GET /api/auth/me'
    }
  });
});

// Holiday management test endpoint
app.get('/api/holidays/test', (req, res) => {
  res.json({
    success: true,
    message: 'Holiday management route test successful',
    version: '1.0.0',
    endpoints: {
      // Quota management
      quotas: {
        'GET /api/holidays/quotas': 'Get all staff leave quotas',
        'GET /api/holidays/quotas/:staff_id': 'Get specific staff quota',
        'POST /api/holidays/quotas': 'Initialize staff quota',
        'PUT /api/holidays/quotas/:staff_id': 'Update staff quota'
      },
      // Request management
      requests: {
        'GET /api/holidays/requests': 'Get all leave requests',
        'POST /api/holidays/requests': 'Submit leave request',
        'GET /api/holidays/requests/pending': 'Get pending requests',
        'PUT /api/holidays/requests/:id/approve': 'Approve request',
        'PUT /api/holidays/requests/:id/reject': 'Reject request',
        'PUT /api/holidays/requests/:id/cancel': 'Cancel request'
      },
      // Statistical reports
      statistics: {
        'GET /api/holidays/statistics/overview': 'Statistics overview',
        'GET /api/holidays/statistics/by-type': 'Statistics by type',
        'GET /api/holidays/statistics/by-department': 'Statistics by department',
        'GET /api/holidays/statistics/by-month': 'Statistics by month'
      },
      // Other functions
      other: {
        'GET /api/holidays/eligibility': 'Check leave eligibility',
        'GET /api/holidays/calendar/:year/:month': 'Holiday calendar',
        'GET /api/holidays/search/by-date-range': 'Date range search'
      }
    }
  });
});

// 404 handling - Updated available route list
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.originalUrl,
    method: req.method,
    availableRoutes: [
      'GET /',
      'GET /health',
      'GET /api/db-test',
      // Authentication routes
      'POST /api/auth/login',
      'POST /api/auth/register',
      'GET /api/auth/test',
      // Holiday management routes
      'GET /api/holidays/test',
      'GET /api/holidays/quotas',
      'POST /api/holidays/requests',
      'GET /api/holidays/requests/pending',
      'GET /api/holidays/statistics/overview'
    ]
  });
});

// Holiday management specific error handling middleware
app.use('/api/holidays', (err, req, res, next) => {
  console.error('Holiday management error:', err);
  
  // PostgreSQL error handling
  if (err.code) {
    switch (err.code) {
      case '23505': // Unique constraint violation
        return res.status(400).json({
          success: false,
          message: 'Duplicate data, please check input data',
          error_code: 'DUPLICATE_DATA'
        });
      case '23503': // Foreign key constraint violation
        return res.status(400).json({
          success: false,
          message: 'Related data does not exist, please check input data',
          error_code: 'FOREIGN_KEY_VIOLATION'
        });
      case '23514': // Check constraint violation
        return res.status(400).json({
          success: false,
          message: 'Data does not comply with business rules',
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
  
  res.status(500).json({
    success: false,
    message: 'Holiday management system error',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// General error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server - Updated startup message
const startServer = async () => {
  console.log('===== HR Management System Starting =====');
  
  // Test database connection
  const dbConnected = await testConnection();
  
  app.listen(PORT, () => {
    console.log(`Server running on: http://localhost:${PORT}`);
    console.log(`Database status: ${dbConnected ? 'Connected' : 'Disconnected'}`);
    console.log(`Start time: ${new Date().toLocaleString()}`);
    console.log('=======================================');
  });
};

// Start
startServer();

// Graceful shutdown handling
process.on('SIGINT', () => {
  console.log('\nShutting down server...');
  pool.end(() => {
    console.log('Database connection pool closed');
    process.exit(0);
  });
});

module.exports = app;