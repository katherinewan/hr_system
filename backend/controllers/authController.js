// controllers/authController.js
const { query } = require('../config/database');
const { generateToken } = require('../middleware/auth');
const bcrypt = require('bcrypt');

const login = async (req, res) => {
  try {
    const { staff_id, password } = req.body;

    if (!staff_id || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please enter staff ID and password'
      });
    }

    // Find user by staff_id from your staff table
    const result = await query(`
      SELECT 
        s.staff_id,
        s.name,
        s.email,
        ua.user_id,
        ua.password,
        ua.role,
        ua.account_locked
      FROM staff s
      LEFT JOIN user_accounts ua ON s.staff_id = ua.staff_id
      WHERE s.staff_id = $1
    `, [parseInt(staff_id)]);

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid staff ID or password'
      });
    }

    const user = result.rows[0];

    // Check if user account exists
    if (!user.user_id) {
      return res.status(401).json({
        success: false,
        message: 'User account not found'
      });
    }

    // Check if account is locked
    if (user.account_locked) {
      return res.status(423).json({
        success: false,
        message: 'Account is locked, please contact HR'
      });
    }

    // Simple password validation (you can enhance this later)
    let isValidPassword = false;
    
    // Check if password is hashed or plain text
    if (user.password.startsWith('$2b$') || user.password.startsWith('$2a$')) {
      // Bcrypt hash
      isValidPassword = await bcrypt.compare(password, user.password);
    } else {
      // Plain text comparison (for development)
      isValidPassword = password === user.password;
    }

    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid staff ID or password'
      });
    }

    // Update last login
    await query(
      'UPDATE user_accounts SET last_login = CURRENT_TIMESTAMP WHERE staff_id = $1',
      [user.staff_id]
    );

    // Generate token
    const token = generateToken({
      user_id: user.user_id,
      staff_id: user.staff_id,
      role: user.role
    });

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          staff_id: user.staff_id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Login system error'
    });
  }
};

const getMe = async (req, res) => {
  try {
    const staff_id = req.staff.staffId;

    const result = await query(`
      SELECT 
        s.staff_id,
        s.name,
        s.email,
        ua.role
      FROM staff s
      LEFT JOIN user_accounts ua ON s.staff_id = ua.staff_id
      WHERE s.staff_id = $1
    `, [staff_id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      user: result.rows[0]
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Unable to get user data'
    });
  }
};

module.exports = { login, getMe };