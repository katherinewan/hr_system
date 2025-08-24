const { pool } = require('../config/database');

// Check bcrypt import
let bcrypt;
try {
  bcrypt = require('bcrypt');
  console.log('✅ bcrypt imported successfully');
} catch (error) {
  console.error('❌ bcrypt import failed:', error.message);
  console.error('Please run: npm install bcrypt');
}

console.log('📋 Loading user account controller...');

const getAllUsers = async (req, res) => {
  try {
    console.log('🔥 Request: Get all users');
    
    // Fixed JOIN query, correctly connecting user_accounts with staff table
    const result = await pool.query(`
      SELECT 
        ua.user_id,
        ua.staff_id,
        s.name AS staff_name,
        ua.role,
        TO_CHAR(ua.last_login, 'YYYY-MM-DD HH24:MI:SS') AS last_login,
        TO_CHAR(ua.password_reset_expires, 'YYYY-MM-DD HH24:MI:SS') AS password_reset_expires,
        ua.failed_login_attempts,
        ua.account_locked,
        s.position_id AS staff_position,
        s.email AS staff_email
      FROM user_accounts ua
      LEFT JOIN staff s ON ua.staff_id = s.staff_id
      ORDER BY ua.user_id
    `);
    
    console.log(`✅ Successfully retrieved ${result.rows.length} users`);
    
    res.json({
      success: true,
      message: `Successfully retrieved ${result.rows.length} user records`,
      data: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('❌ Error getting user list:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve user data',
      error: error.message
    });
  }
};

const searchUsersByName = async (req, res) => {
  try {
    const { name } = req.query;
    console.log('🔍 Request: Search users by name:', name);

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Please provide search name parameter'
      });
    }

    // Fixed query, search by actual staff name instead of staff_id
    const result = await pool.query(`
      SELECT 
        ua.user_id,
        ua.staff_id,
        s.name AS staff_name,
        ua.role,
        TO_CHAR(ua.last_login, 'YYYY-MM-DD HH24:MI:SS') AS last_login,
        TO_CHAR(ua.password_reset_expires, 'YYYY-MM-DD HH24:MI:SS') AS password_reset_expires,
        ua.failed_login_attempts,
        ua.account_locked,
        s.position_id AS staff_position,
        s.email AS staff_email
      FROM user_accounts ua
      LEFT JOIN staff s ON ua.staff_id = s.staff_id
      WHERE s.name ILIKE $1 OR ua.staff_id::text ILIKE $1
      ORDER BY ua.user_id
    `, [`%${name}%`]);
    
    console.log(`✅ Found ${result.rows.length} matching users`);
    
    res.json({
      success: true,
      message: `Found ${result.rows.length} matching users`,
      data: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('❌ Error searching users:', error);
    res.status(500).json({
      success: false,
      message: 'User search failed',
      error: error.message
    });
  }
};

const searchUsersById = async (req, res) => {
  try {
    const { user_id } = req.params;
    console.log('🔍 Request: Get user by ID, ID:', user_id);

    if (!user_id) {
      return res.status(400).json({
        success: false,
        message: 'Please provide user ID'
      });
    }

    // Fixed query, includes staff information
    const result = await pool.query(`
      SELECT 
        ua.user_id,
        ua.staff_id,
        s.name AS staff_name,
        ua.role,
        TO_CHAR(ua.last_login, 'YYYY-MM-DD HH24:MI:SS') AS last_login,
        TO_CHAR(ua.password_reset_expires, 'YYYY-MM-DD HH24:MI:SS') AS password_reset_expires,
        ua.failed_login_attempts,
        ua.account_locked,
        s.position_id AS staff_position,
        s.email AS staff_email
      FROM user_accounts ua
      LEFT JOIN staff s ON ua.staff_id = s.staff_id
      WHERE ua.user_id = $1
    `, [user_id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    console.log(`✅ Successfully retrieved user data, ID: ${user_id}`);
    
    res.json({
      success: true,
      message: 'Successfully retrieved user data',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('❌ Error getting user by ID:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve user data',
      error: error.message
    });
  }
};

const createUser = async (req, res) => {
  try {
    const { staff_id, password, role = 'Employee' } = req.body;
    console.log('➕ Request: Create new user');
    console.log('📋 Request parameters:', { staff_id, role, password_length: password?.length });

    // 參數驗證
    if (!staff_id || !password) {
      console.log('❌ Parameter validation failed:', { staff_id: !!staff_id, password: !!password });
      return res.status(400).json({
        success: false,
        message: 'Please provide staff ID and password'
      });
    }

    // 確保 staff_id 是整數
    let staffIdInt;
    if (typeof staff_id === 'number') {
      staffIdInt = staff_id;
    } else {
      staffIdInt = parseInt(staff_id, 10);
    }
    
    if (isNaN(staffIdInt)) {
      console.log('❌ Invalid staff_id format:', staff_id);
      return res.status(400).json({
        success: false,
        message: 'Staff ID must be a valid number'
      });
    }

    console.log('✅ Staff ID converted to integer:', staffIdInt);

    // 密碼強度驗證
    if (password.length < 6) {
      console.log('❌ Password too short:', password.length);
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    // 檢查 bcrypt 是否可用
    if (!bcrypt) {
      console.error('❌ bcrypt not available');
      return res.status(500).json({
        success: false,
        message: 'Password encryption service unavailable. Please ensure bcrypt is installed.'
      });
    }

    // 檢查員工是否存在
    console.log('🔍 Checking if staff exists...');
    const staffExists = await pool.query(
      'SELECT staff_id, name FROM staff WHERE staff_id = $1',
      [staffIdInt]
    );
    
    if (staffExists.rows.length === 0) {
      console.log('❌ Staff does not exist:', staffIdInt);
      return res.status(400).json({
        success: false,
        message: `Staff ID ${staffIdInt} does not exist in the system`
      });
    }
    
    console.log('✅ Staff exists:', staffExists.rows[0]);

    // 檢查用戶帳號是否已存在
    console.log('🔍 Checking if user account already exists...');
    const existingUser = await pool.query(
      'SELECT user_id FROM user_accounts WHERE staff_id = $1',
      [staffIdInt] 
    );

    if (existingUser.rows.length > 0) {
      console.log('❌ User account already exists:', existingUser.rows[0]);
      return res.status(400).json({
        success: false,
        message: 'This staff member already has a user account'
      });
    }

    console.log('✅ Can create new user account');

    // 手動獲取下一個可用的 user_id
    console.log('🔍 Getting next available user_id...');
    const nextIdResult = await pool.query('SELECT COALESCE(MAX(user_id), 0) + 1 AS next_id FROM user_accounts');
    const nextUserId = nextIdResult.rows[0].next_id;
    console.log('✅ Next user_id will be:', nextUserId);

    // 哈希密碼
    console.log('🔐 Starting password hashing...');
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    console.log('✅ Password hashing completed');

    // 創建用戶帳號（手動指定 user_id）
    console.log('💾 Inserting user data into database...');
    const insertQuery = `
      INSERT INTO user_accounts (user_id, staff_id, password, role, failed_login_attempts, account_locked)
      VALUES ($1, $2, $3, $4, 0, false)
      RETURNING user_id, staff_id, role, failed_login_attempts, account_locked
    `;
    
    console.log('🔍 Executing SQL:', insertQuery);
    console.log('🔍 Parameters:', [nextUserId, staffIdInt, '[password encrypted]', role]);
    
    const result = await pool.query(insertQuery, [nextUserId, staffIdInt, hashedPassword, role]);

    console.log(`✅ Successfully created user account, User ID: ${result.rows[0].user_id}, Staff ID: ${staffIdInt}`);

    const newUser = result.rows[0];

    res.status(201).json({
      success: true,
      message: 'User account created successfully',
      data: {
        user_id: newUser.user_id,
        staff_id: newUser.staff_id,
        role: newUser.role,
        account_locked: false,
        failed_login_attempts: 0
      }
    });
  } catch (error) {
    console.error('❌ Create user error - Details:');
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    console.error('Error code:', error.code);
    console.error('Error details:', error.detail);
    console.error('Error stack:', error.stack);
    
    // 提供具體錯誤訊息
    let errorMessage = 'Failed to create user account';
    
    if (error.code === '23505') {
      errorMessage = 'This staff member already has a user account (uniqueness constraint violation)';
    } else if (error.code === '23503') {
      errorMessage = 'Staff ID does not exist (foreign key constraint violation)';
    } else if (error.code === '42P01') {
      errorMessage = 'user_accounts table does not exist';
    } else if (error.code === '42703') {
      errorMessage = 'Table field does not exist';
    } else if (error.code === '23502') {
      errorMessage = 'Required field is missing - trying manual user_id generation';
    } else if (error.message.includes('bcrypt')) {
      errorMessage = 'Password encryption failed - please ensure bcrypt is installed';
    }
    
    res.status(500).json({
      success: false,
      message: errorMessage,
      error: error.message,
      errorCode: error.code
    });
  }
};

const changePassword = async (req, res) => {
  try {
    const { user_id, old_password, new_password } = req.body;
    console.log('🔐 Request: Change password, User ID:', user_id);

    // Validate required parameters
    if (!user_id || !old_password || !new_password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide user ID, old password, and new password'
      });
    }

    // Validate new password strength
    if (new_password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters long'
      });
    }

    // Get current user data
    const userResult = await pool.query(
      'SELECT user_id, password FROM user_accounts WHERE user_id = $1',
      [user_id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const user = userResult.rows[0];

    // Verify old password
    const validPassword = await bcrypt.compare(old_password, user.password);
    if (!validPassword) {
      return res.status(400).json({
        success: false,
        message: 'Old password is incorrect'
      });
    }

    // Hash new password
    const saltRounds = 10;
    const hashedNewPassword = await bcrypt.hash(new_password, saltRounds);

    // Update password
    await pool.query(
      'UPDATE user_accounts SET password = $1 WHERE user_id = $2',
      [hashedNewPassword, user_id]
    );

    console.log(`✅ Successfully changed user password, ID: ${user_id}`);

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('❌ Error changing password:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to change password',
      error: error.message
    });
  }
};

const updateUserRole = async (req, res) => {
  try {
    const { user_id } = req.params;
    const { role } = req.body;
    console.log('📄 Request: Update user role, User ID:', user_id, 'New role:', role);

    // Validate required parameters
    if (!user_id || !role) {
      return res.status(400).json({
        success: false,
        message: 'Please provide user ID and role'
      });
    }

    // Validate role
    const validRoles = ['Admin', 'HR', 'Manager', 'Employee'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role type. Must be: Admin, HR, Manager, or Employee'
      });
    }

    // Check if user exists
    const userCheck = await pool.query(
      'SELECT user_id FROM user_accounts WHERE user_id = $1',
      [user_id]
    );

    if (userCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update user role
    await pool.query(
      'UPDATE user_accounts SET role = $1 WHERE user_id = $2',
      [role, user_id]
    );

    console.log(`✅ Successfully updated user role, ID: ${user_id}, New role: ${role}`);

    res.json({
      success: true,
      message: 'User role updated successfully'
    });
  } catch (error) {
    console.error('❌ Error updating user role:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user role',
      error: error.message
    });
  }
};

const toggleUserLock = async (req, res) => {
  try {
    const { user_id } = req.params;
    console.log('🔒 Request: Toggle user lock status, User ID:', user_id);

    // Check if user exists and get current status
    const userResult = await pool.query(
      'SELECT user_id, account_locked FROM user_accounts WHERE user_id = $1',
      [user_id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const user = userResult.rows[0];
    const newLockStatus = !user.account_locked;

    // Update lock status and reset failed attempts
    await pool.query(
      'UPDATE user_accounts SET account_locked = $1, failed_login_attempts = 0 WHERE user_id = $2',
      [newLockStatus, user_id]
    );

    console.log(`✅ Successfully toggled user lock status, ID: ${user_id}, New status: ${newLockStatus ? 'Locked' : 'Unlocked'}`);

    res.json({
      success: true,
      message: `User account ${newLockStatus ? 'locked' : 'unlocked'} successfully`,
      data: {
        user_id: user_id,
        account_locked: newLockStatus
      }
    });
  } catch (error) {
    console.error('❌ Error toggling user lock status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle user lock status',
      error: error.message
    });
  }
};

// Update user function - Support editing users in table
const updateUser = async (req, res) => {
  try {
    const { user_id } = req.params;
    const { role, account_locked } = req.body;
    console.log('📄 Request: Update user data, User ID:', user_id, 'Data:', { role, account_locked });

    // Validate required parameters
    if (!user_id) {
      return res.status(400).json({
        success: false,
        message: 'Please provide user ID'
      });
    }

    // Check if user exists
    const userCheck = await pool.query(
      'SELECT user_id FROM user_accounts WHERE user_id = $1',
      [user_id]
    );

    if (userCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Build update query
    const updates = [];
    const values = [];
    let valueIndex = 1;

    if (role !== undefined) {
      // Validate role
      const validRoles = ['Admin', 'HR', 'Manager', 'Employee'];
      if (!validRoles.includes(role)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid role type'
        });
      }
      updates.push(`role = $${valueIndex}`);
      values.push(role);
      valueIndex++;
    }

    if (account_locked !== undefined) {
      updates.push(`account_locked = $${valueIndex}`);
      values.push(account_locked);
      valueIndex++;
      
      // If unlocking account, also reset failed attempts
      if (!account_locked) {
        updates.push(`failed_login_attempts = $${valueIndex}`);
        values.push(0);
        valueIndex++;
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No data provided for update'
      });
    }

    // Execute update
    values.push(user_id); // Add user_id for WHERE condition
    const updateQuery = `
      UPDATE user_accounts 
      SET ${updates.join(', ')}
      WHERE user_id = $${valueIndex}
      RETURNING user_id, staff_id, role, account_locked, failed_login_attempts
    `;

    const result = await pool.query(updateQuery, values);

    console.log(`✅ Successfully updated user data, ID: ${user_id}`);

    res.json({
      success: true,
      message: 'User data updated successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('❌ Error updating user data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user data',
      error: error.message
    });
  }
};

// Add this function to your userController.js file

const deleteUser = async (req, res) => {
  try {
    const { user_id } = req.params;
    console.log('🗑️ Request: Delete user, User ID:', user_id);

    // Validate required parameters
    if (!user_id) {
      return res.status(400).json({
        success: false,
        message: 'Please provide user ID'
      });
    }

    // Check if user exists before deletion
    const userCheck = await pool.query(
      'SELECT user_id, staff_id FROM user_accounts WHERE user_id = $1',
      [user_id]
    );

    if (userCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const userToDelete = userCheck.rows[0];

    // Delete the user account
    const result = await pool.query(
      'DELETE FROM user_accounts WHERE user_id = $1 RETURNING user_id, staff_id',
      [user_id]
    );

    console.log(`✅ Successfully deleted user account, ID: ${user_id}, Staff ID: ${userToDelete.staff_id}`);

    res.json({
      success: true,
      message: 'User account deleted successfully',
      data: {
        deleted_user_id: result.rows[0].user_id,
        deleted_staff_id: result.rows[0].staff_id
      }
    });
  } catch (error) {
    console.error('❌ Error deleting user:', error);
    
    // Provide specific error messages
    let errorMessage = 'Failed to delete user account';
    
    if (error.code === '23503') {
      errorMessage = 'Cannot delete user account - it is referenced by other records';
    } else if (error.code === '42P01') {
      errorMessage = 'user_accounts table does not exist';
    }
    
    res.status(500).json({
      success: false,
      message: errorMessage,
      error: error.message,
      errorCode: error.code
    });
  }
};

// Update the module.exports to include deleteUser
module.exports = {
  getAllUsers,
  searchUsersByName,
  searchUsersById,
  createUser,
  changePassword,
  updateUserRole,
  toggleUserLock,
  updateUser,
  deleteUser  // Add this line
};