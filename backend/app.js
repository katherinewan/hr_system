// app.js - Complete Main Application Server
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

// Import database configuration
const { testConnection } = require('./config/database');

// Create Express application
const app = express();
const PORT = process.env.PORT || 3001;

console.log('HR Management System Starting...');
console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`Port: ${PORT}`);

// ===== MIDDLEWARE =====

// Security
app.use(helmet());

// CORS
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:3001',
    process.env.FRONTEND_URL
  ].filter(Boolean),
  credentials: true
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Simple request logging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// ===== ROUTES =====

// Health check
app.get('/health', async (req, res) => {
  try {
    const dbConnected = await testConnection();
    res.json({
      status: 'OK',
      database: dbConnected ? 'connected' : 'disconnected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'ERROR',
      error: error.message
    });
  }
});

// API info
app.get('/api', (req, res) => {
  res.json({
    message: 'HR Management System API',
    version: '2.0.0',
    endpoints: [
      '/api/auth/*',
      '/api/staff/*', 
      '/api/users/*',
      '/api/holidays/*',
      '/api/positions/*',
      '/api/departments/*',
      '/api/attendance/*',
      '/api/salaries/*'
    ]
  });
});

// Helper function to load routes safely
const loadRoute = (routePath, mountPath, routeName) => {
  try {
    const routeModule = require(routePath);
    app.use(mountPath, routeModule);
    console.log(`✓ ${routeName} loaded at ${mountPath}`);
    return true;
  } catch (error) {
    console.error(`✗ ${routeName} failed:`, error.message);
    
    // Create a basic fallback route
    app.use(mountPath, (req, res) => {
      res.status(503).json({
        success: false,
        message: `${routeName} temporarily unavailable`,
        error: 'Route module not found'
      });
    });
    return false;
  }
};

// Load all routes
const routeStatus = {
  auth: loadRoute('./routes/authRoutes', '/api/auth', 'Auth routes'),
  staff: loadRoute('./routes/staffRoutes', '/api/staff', 'Staff routes'),
  users: loadRoute('./routes/userRoutes', '/api/users', 'User routes'),
  holidays: loadRoute('./routes/leaveRoutes', '/api/holidays', 'Leave routes'),
  positions: loadRoute('./routes/positionRoutes', '/api/positions', 'Position routes'),
  departments: loadRoute('./routes/departRoutes', '/api/departments', 'Department routes'),
  attendance: loadRoute('./routes/attendRoutes', '/api/attendance', 'Attendance routes'),
  salaries: loadRoute('./routes/salaryRoutes', '/api/salaries', 'Salary routes')
};

// Create fallback routes for missing modules
const createFallbackRoute = (path, moduleName) => {
  app.use(path, (req, res) => {
    if (req.method === 'GET') {
      res.json({
        success: true,
        message: `${moduleName} endpoint (placeholder)`,
        data: [],
        note: 'This is a temporary placeholder. Module not yet implemented.'
      });
    } else {
      res.status(501).json({
        success: false,
        message: `${moduleName} write operations not yet implemented`,
        method: req.method
      });
    }
  });
};

// Add fallback routes for any failed modules
if (!routeStatus.positions) {
  createFallbackRoute('/api/positions', 'Position Management');
}

if (!routeStatus.departments) {
  createFallbackRoute('/api/departments', 'Department Management');
}

if (!routeStatus.attendance) {
  createFallbackRoute('/api/attendance', 'Attendance Management');
}

if (!routeStatus.salaries) {
  createFallbackRoute('/api/salaries', 'Salary Management');
}

// Update API info endpoint with actual status
app.get('/api/status', (req, res) => {
  res.json({
    message: 'HR Management System API Status',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    routes: {
      auth: routeStatus.auth ? 'active' : 'fallback',
      staff: routeStatus.staff ? 'active' : 'fallback',
      users: routeStatus.users ? 'active' : 'fallback',
      holidays: routeStatus.holidays ? 'active' : 'fallback',
      positions: routeStatus.positions ? 'active' : 'fallback',
      departments: routeStatus.departments ? 'active' : 'fallback',
      attendance: routeStatus.attendance ? 'active' : 'fallback',
      salaries: routeStatus.salaries ? 'active' : 'fallback'
    },
    active_endpoints: Object.keys(routeStatus).filter(key => routeStatus[key]).length,
    total_endpoints: Object.keys(routeStatus).length
  });
});

// ===== ERROR HANDLING =====

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl,
    method: req.method,
    suggestion: 'Check /api/status for available endpoints'
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err.message);
  
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
    timestamp: new Date().toISOString()
  });
});

// ===== SERVER STARTUP =====

const startServer = async () => {
  // Test database
  const dbConnected = await testConnection();
  console.log(`Database: ${dbConnected ? 'Connected' : 'Disconnected'}`);
  
  app.listen(PORT, () => {
    console.log('=======================================');
    console.log(`✓ Server running: http://localhost:${PORT}`);
    console.log(`✓ Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`✓ Active routes: ${Object.values(routeStatus).filter(Boolean).length}/${Object.keys(routeStatus).length}`);
    console.log(`✓ API Status: http://localhost:${PORT}/api/status`);
    console.log('=======================================');
    
    // Show warnings for missing routes
    const missingRoutes = Object.keys(routeStatus).filter(key => !routeStatus[key]);
    if (missingRoutes.length > 0) {
      console.log('\n⚠️  Missing route modules (using fallbacks):');
      missingRoutes.forEach(route => {
        console.log(`   - ${route}Routes.js`);
      });
      console.log('\n   Create these files to enable full functionality.\n');
    }
  });
};

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down gracefully...');
  process.exit(0);
});

// Unhandled promise rejection
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Uncaught exception
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Start server
startServer();

module.exports = app;