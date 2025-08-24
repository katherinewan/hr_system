// controllers/staffController.js - Clean organized version
const { pool } = require('../config/database');

console.log('📋 Loading staff controller...');

// Get all staff
const getAllStaff = async (req, res) => {
  try {
    console.log('📥 Request: Get all staff');
    
    const result = await pool.query(`
      SELECT 
        staff_id,
        name,
        nickname,
        gender,
        birthday,
        age,
        hire_date,
        email,
        address,
        phone_number,
        emer_phone,
        emer_name,
        position_id
      FROM staff
      ORDER BY staff_id
    `);
    
    console.log(`✅ Successfully retrieved ${result.rows.length} staff members`);
    
    res.json({
      success: true,
      message: `Successfully retrieved ${result.rows.length} staff records`,
      data: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('❌ Error retrieving staff list:', error);
    res.status(500).json({
      success: false,
      message: 'Unable to retrieve staff data',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Get staff by ID
const getStaffById = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`📥 Request: Get staff ID ${id}`);
    
    // Validate ID format
    if (!/^\d+$/.test(id)) {
      return res.status(400).json({
        success: false,
        message: 'Staff ID must be numeric'
      });
    }
    
    const result = await pool.query(`
      SELECT 
        staff_id,
        name,
        nickname,
        gender,
        birthday,
        age,
        hire_date,
        email,
        address,
        phone_number,
        emer_phone,
        emer_name,
        position_id
      FROM staff 
      WHERE staff_id = $1
    `, [parseInt(id)]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Staff ID ${id} not found`
      });
    }
    
    console.log(`✅ Successfully retrieved staff ID ${id}`);
    
    res.json({
      success: true,
      message: 'Staff data retrieved successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('❌ Error retrieving staff:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve staff data',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Search staff by name
const searchStaffByName = async (req, res) => {
  try {
    const { name } = req.query;
    console.log(`🔍 Request: Search staff by name "${name}"`);
    
    if (!name || name.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Please provide a search name'
      });
    }
    
    const result = await pool.query(`
      SELECT 
        staff_id,
        name,
        nickname,
        gender,
        birthday,
        age,
        hire_date,
        email,
        address,
        phone_number,
        emer_phone,
        emer_name,
        position_id
      FROM staff 
      WHERE LOWER(name) LIKE LOWER($1) 
         OR LOWER(nickname) LIKE LOWER($1)
      ORDER BY staff_id
    `, [`%${name.trim()}%`]);
    
    console.log(`✅ Found ${result.rows.length} matching staff members`);
    
    res.json({
      success: true,
      message: `Found ${result.rows.length} staff members`,
      data: result.rows,
      count: result.rows.length,
      searchTerm: name.trim()
    });
  } catch (error) {
    console.error('❌ Error searching staff:', error);
    res.status(500).json({
      success: false,
      message: 'Staff search failed',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Create staff
const createStaff = async (req, res) => {
  try {
    const {
      staff_id,
      name,
      nickname,
      gender,
      birthday,
      age,
      hire_date,
      email,
      address,
      phone_number,
      emer_phone,
      emer_name,
      position_id
    } = req.body;

    console.log('📥 Request: Create staff', { name, email });

    // Validate required fields
    if (!name || !email || !phone_number || !birthday || !hire_date) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: name, email, phone number, birthday, hire date'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format'
      });
    }

    // Check for existing email
    const existingStaff = await pool.query('SELECT staff_id FROM staff WHERE email = $1', [email]);
    if (existingStaff.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'This email address is already in use'
      });
    }

    // Insert new staff
    const result = await pool.query(`
      INSERT INTO staff (
        staff_id, name, nickname, gender, birthday, age, hire_date, email, address, 
        phone_number, emer_phone, emer_name, position_id
      ) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `, [
      staff_id,
      name.trim(),
      nickname?.trim() || null,
      gender || 'male',
      birthday,
      parseInt(age) || null,
      hire_date,
      email.trim(),
      address?.trim() || null,
      phone_number.trim(),
      emer_phone?.trim() || null,
      emer_name?.trim() || null,
      position_id || null
    ]);

    console.log(`✅ Successfully created staff ID ${result.rows[0].staff_id}`);

    res.status(201).json({
      success: true,
      message: 'Staff created successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('❌ Error creating staff:', error);
    
    if (error.code === '23505') {
      return res.status(409).json({
        success: false,
        message: 'Staff ID or email already exists'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to create staff',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Update staff
const updateStaff = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      nickname,
      gender,
      birthday,
      age,
      hire_date,
      email,
      address,
      phone_number,
      emer_phone,
      emer_name,
      position_id
    } = req.body;

    console.log(`📥 Request: Update staff ID ${id}`);

    // Validate ID format
    if (!/^\d+$/.test(id)) {
      return res.status(400).json({
        success: false,
        message: 'Staff ID must be numeric'
      });
    }

    // Validate required fields
    if (!name || !email || !phone_number || !birthday || !hire_date) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: name, email, phone number, birthday, hire date'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format'
      });
    }

    // Check if staff exists
    const existingStaff = await pool.query('SELECT staff_id FROM staff WHERE staff_id = $1', [parseInt(id)]);
    if (existingStaff.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Staff ID ${id} not found`
      });
    }

    // Check for email conflicts
    const emailCheck = await pool.query(
      'SELECT staff_id FROM staff WHERE email = $1 AND staff_id != $2', 
      [email, parseInt(id)]
    );
    if (emailCheck.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'This email address is already used by another staff member'
      });
    }

    // Update staff
    const result = await pool.query(`
      UPDATE staff SET 
        name = $1,
        nickname = $2,
        gender = $3,
        birthday = $4,
        age = $5,    
        hire_date = $6, 
        email = $7,
        address = $8,
        phone_number = $9,
        emer_phone = $10,
        emer_name = $11,
        position_id = $12
      WHERE staff_id = $13
      RETURNING *
    `, [
      name.trim(),
      nickname?.trim() || null,
      gender || 'male',
      birthday,
      parseInt(age) || null,
      hire_date,
      email.trim(),
      address?.trim() || null,
      phone_number.trim(),
      emer_phone?.trim() || null,
      emer_name?.trim() || null,
      position_id || null,
      parseInt(id)
    ]);

    console.log(`✅ Successfully updated staff ID ${id}`);

    res.json({
      success: true,
      message: 'Staff updated successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('❌ Error updating staff:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update staff',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Delete staff
const deleteStaff = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`📥 Request: Delete staff ID ${id}`);

    // Validate ID format
    if (!/^\d+$/.test(id)) {
      return res.status(400).json({
        success: false,
        message: 'Staff ID must be numeric'
      });
    }

    // Check if staff exists
    const existingStaff = await pool.query('SELECT name FROM staff WHERE staff_id = $1', [parseInt(id)]);
    if (existingStaff.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Staff ID ${id} not found`
      });
    }

    const staffName = existingStaff.rows[0].name;

    // Delete staff
    await pool.query('DELETE FROM staff WHERE staff_id = $1', [parseInt(id)]);

    console.log(`✅ Successfully deleted staff ID ${id} (${staffName})`);

    res.json({
      success: true,
      message: `Staff ${staffName} (ID: ${id}) deleted successfully`
    });
  } catch (error) {
    console.error('❌ Error deleting staff:', error);
    
    if (error.code === '23503') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete staff - referenced by other records'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to delete staff',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Get authenticated staff profile
const getStaffProfile = async (req, res) => {
  try {
    const staffId = req.staff.staffId; // From auth middleware
    console.log(`📥 Request: Get staff profile ID ${staffId}`);

    const result = await pool.query(`
      SELECT 
        s.staff_id,
        s.name,
        s.nickname,
        s.gender,
        s.birthday,
        s.age,
        s.hire_date,
        s.email,
        s.address,
        s.phone_number,
        s.emer_phone,
        s.emer_name,
        s.position_id,
        p.title AS position_name,
        d.department_name,
        sal.basic_salary
      FROM staff s
      LEFT JOIN position p ON s.position_id = p.position_id
      LEFT JOIN department d ON p.department_id = d.department_id
      LEFT JOIN salary sal ON s.staff_id = sal.staff_id
      WHERE s.staff_id = $1
    `, [staffId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Staff profile not found'
      });
    }

    const staff = result.rows[0];
    
    const profileData = {
      staffId: staff.staff_id,
      personalInfo: {
        name: staff.name,
        nickname: staff.nickname,
        gender: staff.gender,
        birthday: staff.birthday,
        age: staff.age,
        email: staff.email,
        phoneNumber: staff.phone_number,
        address: staff.address
      },
      workInfo: {
        hireDate: staff.hire_date,
        positionId: staff.position_id,
        positionName: staff.position_name,
        department: staff.department_name,
        basicSalary: staff.basic_salary
      },
      emergencyContact: {
        name: staff.emer_name,
        phone: staff.emer_phone
      }
    };

    console.log(`✅ Successfully retrieved profile for: ${staff.name}`);

    res.json({
      success: true,
      message: 'Profile retrieved successfully',
      data: profileData
    });

  } catch (error) {
    console.error('❌ Error retrieving staff profile:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve profile',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

module.exports = {
  getAllStaff,
  getStaffById,
  searchStaffByName,
  createStaff,
  updateStaff,
  deleteStaff,
  getStaffProfile
};