// models/User.js - 用戶模型
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');

class User {
  // 根據 staff_id 查找用戶
  static async findByStaffId(staff_id) {
    try {
      const result = await pool.query(`
        SELECT 
          ua.user_id,
          ua.staff_id,
          ua.password,
          ua.role,
          ua.last_login,
          ua.failed_login_attempts,
          ua.account_locked,
          s.name,
          s.email
        FROM user_accounts ua
        LEFT JOIN staff s ON ua.staff_id = s.staff_id
        WHERE ua.staff_id = $1
      `, [staff_id]);
      
      return result.rows[0] || null;
    } catch (error) {
      console.error('查找用戶錯誤:', error);
      throw error;
    }
  }

  // 根據 user_id 查找用戶
  static async findById(user_id) {
    try {
      const result = await pool.query(`
        SELECT 
          ua.user_id,
          ua.staff_id,
          ua.role,
          ua.last_login,
          ua.failed_login_attempts,
          ua.account_locked,
          s.name,
          s.email
        FROM user_accounts ua
        LEFT JOIN staff s ON ua.staff_id = s.staff_id
        WHERE ua.user_id = $1
      `, [user_id]);
      
      return result.rows[0] || null;
    } catch (error) {
      console.error('根據ID查找用戶錯誤:', error);
      throw error;
    }
  }

  // 驗證密碼
  static async validatePassword(inputPassword, storedPassword) {
    try {
      // 檢查是否為 bcrypt 哈希格式
      if (storedPassword.startsWith('$2b$') || storedPassword.startsWith('$2a$')) {
        // 使用 bcrypt 驗證
        return await bcrypt.compare(inputPassword, storedPassword);
      } else {
        // ⚠️ 臨時方案：直接比較明文（僅開發環境）
        console.warn('⚠️ 警告：使用明文密碼比較，僅適用於開發環境！');
        
        // 處理你資料庫中的格式
        if (storedPassword === 'TestPassword123!') {
          return inputPassword === 'TestPassword123!';
        }
        
        // 處理 hashed_password_xxx 格式
        if (storedPassword.startsWith('hashed_password_')) {
          const number = storedPassword.replace('hashed_password_', '');
          return inputPassword === number || inputPassword === storedPassword;
        }
        
        // 直接比較
        return inputPassword === storedPassword;
      }
    } catch (error) {
      console.error('密碼驗證錯誤:', error);
      return false;
    }
  }

  // 生成 JWT Token - 添加缺少的方法
  static generateToken(user) {
    try {
      const payload = {
        user_id: user.user_id,
        staff_id: user.staff_id,
        role: user.role
      };
      
      const secret = process.env.JWT_SECRET || 'your-secret-key';
      const options = {
        expiresIn: process.env.JWT_EXPIRES_IN || '24h'
      };
      
      return jwt.sign(payload, secret, options);
    } catch (error) {
      console.error('生成token錯誤:', error);
      throw error;
    }
  }

  // 驗證 JWT Token
  static verifyToken(token) {
    try {
      return jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    } catch (error) {
      console.error('驗證token錯誤:', error);
      return null;
    }
  }

  // 增加失敗嘗試次數
  static async incrementFailedAttempts(staff_id) {
    try {
      const result = await pool.query(`
        UPDATE user_accounts 
        SET 
          failed_login_attempts = failed_login_attempts + 1,
          account_locked = CASE 
            WHEN failed_login_attempts + 1 >= 5 THEN true 
            ELSE account_locked 
          END
        WHERE staff_id = $1
        RETURNING failed_login_attempts, account_locked
      `, [staff_id]);
      
      return result.rows[0];
    } catch (error) {
      console.error('增加失敗嘗試次數錯誤:', error);
      throw error;
    }
  }

  // 重置失敗嘗試次數
  static async resetFailedAttempts(staff_id) {
    try {
      await pool.query(`
        UPDATE user_accounts 
        SET 
          failed_login_attempts = 0,
          account_locked = false
        WHERE staff_id = $1
      `, [staff_id]);
    } catch (error) {
      console.error('重置失敗嘗試次數錯誤:', error);
      throw error;
    }
  }

  // 更新最後登入時間
  static async updateLastLogin(staff_id) {
    try {
      await pool.query(`
        UPDATE user_accounts 
        SET last_login = CURRENT_TIMESTAMP
        WHERE staff_id = $1
      `, [staff_id]);
    } catch (error) {
      console.error('更新最後登入時間錯誤:', error);
      throw error;
    }
  }

  // 檢查用戶帳戶是否存在
  static async userAccountExists(staff_id) {
    try {
      const result = await pool.query(
        'SELECT user_id FROM user_accounts WHERE staff_id = $1',
        [staff_id]
      );
      return result.rows.length > 0;
    } catch (error) {
      console.error('檢查用戶帳戶錯誤:', error);
      throw error;
    }
  }

  // 創建新用戶
  static async create({ staff_id, password, role = 'Employee' }) {
    try {
      // 檢查員工是否存在
      const staffExists = await pool.query(
        'SELECT staff_id FROM staff WHERE staff_id = $1',
        [staff_id]
      );
      
      if (staffExists.rows.length === 0) {
        throw new Error('Staff ID does not exist');
      }

      // 檢查用戶帳戶是否已存在
      const userExists = await this.userAccountExists(staff_id);
      if (userExists) {
        throw new Error('User account already exists');
      }

      // 加密密碼
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // 創建用戶帳戶
      const result = await pool.query(`
        INSERT INTO user_accounts (staff_id, password, role, failed_login_attempts, account_locked)
        VALUES ($1, $2, $3, 0, false)
        RETURNING user_id, staff_id, role, failed_login_attempts, account_locked, last_login
      `, [staff_id, hashedPassword, role]);

      return result.rows[0];
    } catch (error) {
      console.error('創建用戶錯誤:', error);
      throw error;
    }
  }

  // 修改密碼
  static async changePassword(staff_id, newPassword) {
    try {
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
      
      await pool.query(
        'UPDATE user_accounts SET password = $1 WHERE staff_id = $2',
        [hashedPassword, staff_id]
      );
    } catch (error) {
      console.error('修改密碼錯誤:', error);
      throw error;
    }
  }

  // 解鎖帳戶
  static async unlockAccount(staff_id) {
    try {
      await pool.query(`
        UPDATE user_accounts 
        SET 
          account_locked = false,
          failed_login_attempts = 0
        WHERE staff_id = $1
      `, [staff_id]);
    } catch (error) {
      console.error('解鎖帳戶錯誤:', error);
      throw error;
    }
  }

  // 獲取所有用戶
  static async getAllUsers() {
    try {
      const result = await pool.query(`
        SELECT 
          ua.user_id,
          ua.staff_id,
          ua.role,
          ua.last_login,
          ua.failed_login_attempts,
          ua.account_locked,
          s.name,
          s.email
        FROM user_accounts ua
        LEFT JOIN staff s ON ua.staff_id = s.staff_id
        ORDER BY ua.user_id
      `);
      
      return result.rows;
    } catch (error) {
      console.error('獲取所有用戶錯誤:', error);
      throw error;
    }
  }

  // 密碼強度驗證
  static validatePasswordStrength(password) {
    if (!password || password.length < 6) {
      return {
        valid: false,
        message: '密碼長度至少需要6個字符'
      };
    }
    
    return {
      valid: true,
      message: '密碼強度有效'
    };
  }
}

module.exports = User;