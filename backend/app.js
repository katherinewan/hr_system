// app.js - Optimized Main Application Server
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
require('dotenv').config();

// Import database configuration
const { pool, testConnection } = require('./config/database');

// Create Express application
const app = express();
const PORT = process.env.PORT || 3001;

console.log('===== HR Management System Starting =====');
console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`Port: ${PORT}`);

// ===== SECURITY MIDDLEWARE =====

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// CORS configuration
app.use(cors({
  origin: [
    'http://localhost:3000',  // React development server
    'http://localhost:3001',  // Backup port
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001',
    process.env.FRONTEND_URL // Production frontend URL
  ].filter(Boolean), // Remove undefined values
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// ===== PERFORMANCE MIDDLEWARE =====

// Compression for better performance
app.use(compression());

// Body parsing middleware with limits
app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ 
  extended: true, 
  limit: '10mb'
}));

// ===== LOGGING MIDDLEWARE =====

// Request logging with more details
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  const userAgent = req.get('User-Agent') || 'Unknown';
  const ip = req.ip || req.connection.remoteAddress || 'Unknown';
  
  console.log(`[${timestamp}] ${req.method} ${req.path} - IP: ${ip} - UA: ${userAgent.substring(0, 50)}`);
  
  // Log response time
  const startTime = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    console.log(`[${timestamp}] ${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`);
  });
  
  next();
});

// ===== HEALTH CHECK AND MONITORING =====

// Home route with system information
app.get('/', (req, res) => {
  res.json({
    message: 'HR Management System API Server',
    version: '2.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    endpoints: {
      auth: '/api/auth/*',
      staff: '/api/staff/*',
      users: '/api/users/*',
      holidays: '/api/holidays/*',
      health: '/health',
      dbTest: '/api/db-test'
    },
    documentation: {
      swagger: '/api/docs',
      postman: '/api/postman'
    }
  });
});

// Comprehensive health check
app.get('/health', async (req, res) => {
  try {
    const startTime = Date.now();
    const dbStatus = await testConnection();
    const dbResponseTime = Date.now() - startTime;
    
    const memoryUsage = process.memoryUsage();
    const uptime = process.uptime();
    
    const healthData = {
      status: 'OK',
      timestamp: new Date().toISOString(),
      uptime: `${Math.floor(uptime / 60)} minutes`,
      database: {
        status: dbStatus ? 'connected' : 'disconnected',
        response_time: `${dbResponseTime}ms`
      },
      memory: {
        used: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
        total: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
        external: `${Math.round(memoryUsage.external / 1024 / 1024)}MB`
      },
      server: {
        port: PORT,
        node_version: process.version,
        platform: process.platform
      }
    };
    
    res.json(healthData);
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      timestamp: new Date().toISOString(),
      error: error.message,
      database: 'error'
    });
  }
});

// Enhanced database test with comprehensive table checks
app.get('/api/db-test', async (req, res) => {
  try {
    console.log('Testing database connection and tables...');
    const result = await pool.query('SELECT NOW() as server_time, version() as pg_version');
    
    // Test core tables
    const coreTableChecks = [
      { name: 'user_accounts', query: 'SELECT COUNT(*) as count FROM user_accounts' },
      { name: 'staff', query: 'SELECT COUNT(*) as count FROM staff' },
      { name: 'department', query: 'SELECT COUNT(*) as count FROM department' },
      { name: 'position', query: 'SELECT COUNT(*) as count FROM position' }
    ];
    
    // Test leave management tables
    const leaveTableChecks = [
      { name: 'leave', query: 'SELECT COUNT(*) as count FROM leave' },
      { name: 'leave_requests', query: 'SELECT COUNT(*) as count FROM leave_requests' },
      { name: 'leave_request_history', query: 'SELECT COUNT(*) as count FROM leave_request_history' }
    ];
    
    const coreTableResults = {};
    const leaveTableResults = {};
    
    // Check core tables
    for (const table of coreTableChecks) {
      try {
        const tableResult = await pool.query(table.query);
        coreTableResults[table.name] = parseInt(tableResult.rows[0].count);
      } catch (error) {
        coreTableResults[table.name] = `Error: ${error.message}`;
      }
    }
    
    // Check leave tables
    for (const table of leaveTableChecks) {
      try {
        const tableResult = await pool.query(table.query);
        leaveTableResults[table.name] = parseInt(tableResult.rows[0].count);
      } catch (error) {
        leaveTableResults[table.name] = `Error: ${error.message}`;
      }
    }
    
    // Database connection pool status
    const poolStatus = {
      total_connections: pool.totalCount,
      idle_connections: pool.idleCount,
      waiting_requests: pool.waitingCount
    };
    
    res.json({
      success: true,
      message: 'Database connection and table check completed',
      timestamp: new Date().toISOString(),
      data: {
        server_time: result.rows[0].server_time,
        postgresql_version: result.rows[0].pg_version,
        core_tables: coreTableResults,
        leave_tables: leaveTableResults,
        connection_pool: poolStatus
      }
    });
  } catch (error) {
    console.error('Database test error:', error);
    res.status(500).json({
      success: false,
      message: 'Database connection failed',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// ===== LOAD ROUTES WITH ERROR HANDLING =====

const loadRoute = (routePath, mountPath, routeName) => {
  try {
    const routeModule = require(routePath);
    app.use(mountPath, routeModule);
    console.log(`✓ ${routeName} loaded successfully at ${mountPath}`);
    return true;
  } catch (error) {
    console.error(`✗ ${routeName} loading failed:`, error.message);
    return false;
  }
};

// Load authentication routes (critical)
const authLoaded = loadRoute('./routes/authRoutes', '/api/auth', 'Authentication routes');

// Load staff management routes
const staffLoaded = loadRoute('./routes/staffRoutes', '/api/staff', 'Staff management routes');

// Load user account routes
const userLoaded = loadRoute('./routes/userRoutes', '/api/users', 'User account routes');

// Load leave management routes (main focus)
const leaveLoaded = loadRoute('./routes/leaveRoutes', '/api/holidays', 'Leave management routes');

// Load optional routes
const optionalRoutes = [
  { path: './routes/attendRoutes', mount: '/api/attendance', name: 'Attendance routes' },
  { path: './routes/positionRoutes', mount: '/api/positions', name: 'Position routes' },
  { path: './routes/departRoutes', mount: '/api/departments', name: 'Department routes' },
  { path: './routes/salaryRoutes', mount: '/api/salaries', name: 'Salary routes' }
];

let optionalLoadedCount = 0;
optionalRoutes.forEach(route => {
  if (loadRoute(route.path, route.mount, route.name)) {
    optionalLoadedCount++;
  }
});

console.log(`Route loading summary: Core routes loaded, ${optionalLoadedCount}/${optionalRoutes.length} optional routes loaded`);

// ===== API DOCUMENTATION ENDPOINTS =====

// API overview endpoint
app.get('/api', (req, res) => {
  res.json({
    success: true,
    message: 'HR Management System API',
    version: '2.0.0',
    loaded_routes: {
      authentication: authLoaded,
      staff_management: staffLoaded,
      user_accounts: userLoaded,
      leave_management: leaveLoaded
    },
    available_endpoints: {
      auth: authLoaded ? {
        'POST /api/auth/login': 'User authentication',
        'POST /api/auth/register': 'User registration',
        'GET /api/auth/me': 'Get current user info',
        'POST /api/auth/verify': 'Verify token'
      } : 'Not available',
      
      staff: staffLoaded ? {
        'GET /api/staff': 'Get all staff',
        'POST /api/staff': 'Create new staff',
        'GET /api/staff/:id': 'Get staff by ID',
        'PUT /api/staff/:id': 'Update staff',
        'DELETE /api/staff/:id': 'Delete staff'
      } : 'Not available',
      
      users: userLoaded ? {
        'GET /api/users': 'Get all users',
        'POST /api/users': 'Create new user',
        'GET /api/users/:id': 'Get user by ID',
        'PUT /api/users/:id': 'Update user',
        'DELETE /api/users/:id': 'Delete user'
      } : 'Not available',
      
      holidays: leaveLoaded ? {
        'GET /api/holidays/quotas': 'Get leave quotas',
        'GET /api/holidays/quotas/:staff_id': 'Get staff leave quota',
        'PUT /api/holidays/quotas/:staff_id': 'Update staff leave quota',
        'GET /api/holidays/requests': 'Get leave requests',
        'POST /api/holidays/requests': 'Submit leave request',
        'GET /api/holidays/requests/pending': 'Get pending requests'
      } : 'Not available'
    }
  });
});

// ===== ERROR HANDLING MIDDLEWARE =====

// 404 handler with comprehensive route listing
app.use('*', (req, res) => {
  const availableRoutes = [
    'GET /',
    'GET /health',
    'GET /api',
    'GET /api/db-test'
  ];
  
  if (authLoaded) {
    availableRoutes.push('POST /api/auth/login', 'GET /api/auth/me');
  }
  
  if (leaveLoaded) {
    availableRoutes.push(
      'GET /api/holidays/test',
      'GET /api/holidays/quotas',
      'POST /api/holidays/requests',
      'GET /api/holidays/requests/pending'
    );
  }
  
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString(),
    suggestion: 'Check the available routes below',
    available_routes: availableRoutes,
    documentation: 'GET /api'
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  
  // Handle different error types
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
    message: 'Internal server error',
    timestamp: new Date().toISOString(),
    error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
    request_id: req.headers['x-request-id'] || 'unknown'
  });
});

// ===== SERVER STARTUP =====

const startServer = async () => {
  // Test database connection before starting
  const dbConnected = await testConnection();
  
  if (!dbConnected) {
    console.warn('⚠️  Database connection failed, but server will start anyway');
  }
  
  app.listen(PORT, () => {
    console.log('=======================================');
    console.log(`✓ Server running on: http://localhost:${PORT}`);
    console.log(`✓ Database status: ${dbConnected ? 'Connected' : 'Disconnected'}`);
    console.log(`✓ Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`✓ Core routes loaded: ${authLoaded ? 'Auth' : ''}${staffLoaded ? ', Staff' : ''}${userLoaded ? ', Users' : ''}${leaveLoaded ? ', Holidays' : ''}`);
    console.log(`✓ Start time: ${new Date().toLocaleString()}`);
    console.log('=======================================');
    
    if (!leaveLoaded) {
      console.warn('⚠️  Leave management routes failed to load - check ./routes/leaveRoutes.js');
    }
  });
};

// ===== GRACEFUL SHUTDOWN =====

const gracefulShutdown = (signal) => {
  console.log(`\n${signal} received. Starting graceful shutdown...`);
  
  // Close database connections
  pool.end(() => {
    console.log('✓ Database connection pool closed');
    
    // Close server
    process.exit(0);
  });
  
  // Force shutdown after 10 seconds
  setTimeout(() => {
    console.error('✗ Graceful shutdown timed out, forcing exit');
    process.exit(1);
  }, 10000);
};

// Handle shutdown signals
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('UNHANDLED_REJECTION');
});

// Start the server
startServer();

module.exports = app;