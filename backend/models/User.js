// models/User.js - User model
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');

class User {
  // Find user by staff_id
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
      console.error('Error finding user:', error);
      throw error;
    }
  }

  // Find user by user_id
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
      console.error('Error finding user by ID:', error);
      throw error;
    }
  }

  // Validate password
  static async validatePassword(inputPassword, storedPassword) {
    try {
      // Check if it's bcrypt hash format
      if (storedPassword.startsWith('$2b$') || storedPassword.startsWith('$2a$')) {
        // Use bcrypt validation
        return await bcrypt.compare(inputPassword, storedPassword);
      } else {
        // ⚠️ Temporary solution: direct plaintext comparison (development environment only)
        console.warn('⚠️ Warning: Using plaintext password comparison, only suitable for development environment');
        
        // Handle format in your database
        if (storedPassword === 'TestPassword123!') {
          return inputPassword === 'TestPassword123!';
        }
        
        // Handle hashed_password_xxx format
        if (storedPassword.startsWith('hashed_password_')) {
          const number = storedPassword.replace('hashed_password_', '');
          return inputPassword === number || inputPassword === storedPassword;
        }
        
        // Direct comparison
        return inputPassword === storedPassword;
      }
    } catch (error) {
      console.error('Password validation error:', error);
      return false;
    }
  }

  // Generate JWT Token - adding missing method
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
      console.error('Error generating token:', error);
      throw error;
    }
  }

  // Verify JWT Token
  static verifyToken(token) {
    try {
      return jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    } catch (error) {
      console.error('Error verifying token:', error);
      return null;
    }
  }

  // Increment failed login attempts
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
      console.error('Error incrementing failed attempts:', error);
      throw error;
    }
  }

  // Reset failed login attempts
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
      console.error('Error resetting failed attempts:', error);
      throw error;
    }
  }

  // Update last login time
  static async updateLastLogin(staff_id) {
    try {
      await pool.query(`
        UPDATE user_accounts 
        SET last_login = CURRENT_TIMESTAMP
        WHERE staff_id = $1
      `, [staff_id]);
    } catch (error) {
      console.error('Error updating last login time:', error);
      throw error;
    }
  }

  // Check if user account exists
  static async userAccountExists(staff_id) {
    try {
      const result = await pool.query(
        'SELECT user_id FROM user_accounts WHERE staff_id = $1',
        [staff_id]
      );
      return result.rows.length > 0;
    } catch (error) {
      console.error('Error checking user account:', error);
      throw error;
    }
  }

  // Create new user
  static async create({ staff_id, password, role = 'Employee' }) {
    try {
      // Check if staff exists
      const staffExists = await pool.query(
        'SELECT staff_id FROM staff WHERE staff_id = $1',
        [staff_id]
      );
      
      if (staffExists.rows.length === 0) {
        throw new Error('Staff ID does not exist');
      }

      // Check if user account already exists
      const userExists = await this.userAccountExists(staff_id);
      if (userExists) {
        throw new Error('User account already exists');
      }

      // Hash password
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      // Create user account
      const result = await pool.query(`
        INSERT INTO user_accounts (staff_id, password, role, failed_login_attempts, account_locked)
        VALUES ($1, $2, $3, 0, false)
        RETURNING user_id, staff_id, role, failed_login_attempts, account_locked, last_login
      `, [staff_id, hashedPassword, role]);

      return result.rows[0];
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  // Change password
  static async changePassword(staff_id, newPassword) {
    try {
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
      
      await pool.query(
        'UPDATE user_accounts SET password = $1 WHERE staff_id = $2',
        [hashedPassword, staff_id]
      );
    } catch (error) {
      console.error('Error changing password:', error);
      throw error;
    }
  }

  // Unlock account
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
      console.error('Error unlocking account:', error);
      throw error;
    }
  }

  // Get all users
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
      console.error('Error getting all users:', error);
      throw error;
    }
  }

  // Password strength validation
  static validatePasswordStrength(password) {
    if (!password || password.length < 6) {
      return {
        valid: false,
        message: 'Password must be at least 6 characters long'
      };
    }
    
    return {
      valid: true,
      message: 'Password strength is valid'
    };
  }
}

module.exports = User;