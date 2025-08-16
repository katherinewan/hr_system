// config/database.js - 簡化版 Supabase 資料庫配置
const { Pool } = require('pg');
require('dotenv').config();

console.log('🔧 正在設定 Supabase 資料庫連線...');

// Supabase 連線池配置
const pool = new Pool({
  host: process.env.DB_HOST || 'aws-1-ap-northeast-1.pooler.supabase.com',
  port: process.env.DB_PORT || 6543,
  user: process.env.DB_USER || 'postgres.mgvpyjqfllmipmlxcrub',
  database: process.env.DB_NAME || 'postgres',
  password: process.env.DB_PASSWORD || 'Kath@199816',
  ssl: {
    rejectUnauthorized: false // Supabase 需要 SSL 連接
  },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// 測試資料庫連線
const testConnection = async () => {
  try {
    console.log('🔍 測試 Supabase 資料庫連線...');
    const client = await pool.connect();
    
    const timeResult = await client.query('SELECT NOW() as current_time');
    console.log('✅ Supabase 資料庫連線成功!');
    console.log(`📅 資料庫時間: ${timeResult.rows[0].current_time}`);
    
    client.release();
    return true;
  } catch (err) {
    console.error('❌ Supabase 資料庫連線失敗:', err.message);
    return false;
  }
};

// 執行查詢的輔助函數
const query = async (text, params) => {
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return result;
  } catch (error) {
    console.error('❌ 查詢執行失敗:', error);
    throw error;
  } finally {
    client.release();
  }
};

// 連線池錯誤處理
pool.on('error', (err) => {
  console.error('❌ Supabase 資料庫連線池錯誤:', err);
});

// 優雅關閉連線池
const closePool = async () => {
  try {
    await pool.end();
    console.log('✅ Supabase 資料庫連線池已關閉');
  } catch (error) {
    console.error('❌ 關閉連線池錯誤:', error);
  }
};

module.exports = {
  pool,
  query,
  testConnection,
  closePool
};