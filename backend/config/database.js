// config/database.js - Modified Supabase Database Configuration
const { Pool } = require('pg');
require('dotenv').config();

console.log('Setting up Supabase database connection...');

// Database connection configuration from environment variables
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 6543,
  user: process.env.DB_USER,
  database: process.env.DB_NAME || 'postgres',
  password: process.env.DB_PASSWORD,
  ssl: {
    rejectUnauthorized: false // Supabase requires SSL connection
  },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// Test database connection
const testConnection = async () => {
  try {
    console.log('Testing Supabase database connection...');
    const client = await pool.connect();
    
    const timeResult = await client.query('SELECT NOW() as current_time');
    console.log('Supabase database connection successful!');
    console.log(`Database time: ${timeResult.rows[0].current_time}`);
    
    client.release();
    return true;
  } catch (err) {
    console.error('Supabase database connection failed:', err.message);
    console.error('Please check if environment variables are correctly set');
    return false;
  }
};

// Helper function for executing queries
const query = async (text, params) => {
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return result;
  } catch (error) {
    console.error('Query execution failed:', error.message);
    throw error;
  } finally {
    client.release();
  }
};

// Connection pool error handling
pool.on('error', (err) => {
  console.error('Supabase database pool error:', err.message);
});

// Graceful pool shutdown
const closePool = async () => {
  try {
    await pool.end();
    console.log('Supabase database pool closed');
  } catch (error) {
    console.error('Error closing pool:', error.message);
  }
};

// Validate required environment variables
const validateEnvironment = () => {
  const requiredVars = ['DB_HOST', 'DB_USER', 'DB_PASSWORD'];
  const missing = requiredVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    console.error('Missing required environment variables:', missing.join(', '));
    console.error('Please set the following environment variables in Railway:');
    console.error('- DB_HOST: aws-1-ap-northeast-1.pooler.supabase.com');
    console.error('- DB_USER: postgres.mgvpyjqfllmipmlxcrub');
    console.error('- DB_PASSWORD: [your_supabase_password]');
    process.exit(1);
  }
};

// Validate environment variables on startup
validateEnvironment();

module.exports = {
  pool,
  query,
  testConnection,
  closePool
};