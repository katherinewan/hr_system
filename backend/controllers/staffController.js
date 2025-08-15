// controllers/staffController.js - Staff Controller (Complete CRUD functionality)
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
    console.error('❌ Error getting staff list:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve staff data',
      error: error.message
    });
  }
};

// Get staff by ID
const getStaffById = async (req, res) => {
  try {
    const { staff_id } = req.params;
    console.log(`📥 Request: Get staff ID ${staff_id}`);
    
    // Validate ID format
    if (!/^\d+$/.test(staff_id)) {
      return res.status(400).json({
        success: false,
        message: 'Staff ID must be a number'
      });
    }
    
    const result = await pool.query(`
      SELECT 
        staff_id,
        name,
        nickname,
        gender,
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
    `, [parseInt(staff_id.trim())]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Staff ID ${staff_id} not found`
      });
    }
    
    console.log(`✅ Found staff ID ${staff_id} data`);
    
    res.json({
      success: true,
      message: `Successfully retrieved staff ${staff_id} data`,
      data: result.rows[0],
      staff_id: staff_id.trim()
    });
  } catch (error) {
    console.error('❌ Error getting staff:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve staff data',
      error: error.message
    });
  }
};

// Search staff by name
const searchStaffByName = async (req, res) => {
  try {
    const { name } = req.query;
    console.log(`📥 Request: Search staff name containing "${name}"`);
    
    if (!name || name.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Please provide search name'
      });
    }
    
    const result = await pool.query(`
      SELECT 
        staff_id,
        name,
        nickname,
        gender,
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
      error: error.message
    });
  }
};

// Create new staff
const createStaff = async (req, res) => {
  try {
    const {
      name,
      nickname,
      gender,
      age,
      hire_date,
      email,
      address,
      phone_number,
      emer_phone,
      emer_name,
      position_id
    } = req.body;

    console.log('📥 Request: Create new staff', { name, email });

    // Validate required fields
    if (!name || !email || !phone_number || !age || !hire_date) {
      return res.status(400).json({
        success: false,
        message: 'Please fill in all required fields: name, email, phone number, age, hire date'
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

    // Validate age
    if (age < 1 || age > 120) {
      return res.status(400).json({
        success: false,
        message: 'Age must be between 1-120'
      });
    }

    // Check if email already exists
    const existingStaff = await pool.query('SELECT staff_id FROM staff WHERE email = $1', [email]);
    if (existingStaff.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'This email address is already in use'
      });
    }

    // Insert new staff into database
    const result = await pool.query(`
      INSERT INTO staff (
        name, nickname, gender, age, hire_date, email, address, 
        phone_number, emer_phone, emer_name, position_id
      ) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `, [
      name.trim(),
      nickname?.trim() || null,
      gender || 'male',
      parseInt(age),
      hire_date,
      email.trim(),
      address?.trim() || null,
      phone_number.trim(),
      emer_phone?.trim() || null,
      emer_name?.trim() || null,
      position_id?.trim() || null
    ]);

    console.log(`✅ Successfully created staff ID ${result.rows[0].staff_id}`);

    res.status(201).json({
      success: true,
      message: 'Staff created successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('❌ Error creating staff:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create staff',
      error: error.message
    });
  }
};

// Update staff
const updateStaff = async (req, res) => {
  try {
    const { staff_id } = req.params;
    const {
      name,
      nickname,
      gender,
      age,
      hire_date,
      email,
      address,
      phone_number,
      emer_phone,
      emer_name,
      position_id
    } = req.body;

    console.log(`📥 Request: Update staff ID ${staff_id}`, { name, email });

    // Validate ID format
    if (!/^\d+$/.test(staff_id)) {
      return res.status(400).json({
        success: false,
        message: 'Staff ID must be a number'
      });
    }

    // Validate required fields
    if (!name || !email || !phone_number || !age || !hire_date) {
      return res.status(400).json({
        success: false,
        message: 'Please fill in all required fields: name, email, phone number, age, hire date'
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

    // Validate age
    if (age < 1 || age > 120) {
      return res.status(400).json({
        success: false,
        message: 'Age must be between 1-120'
      });
    }

    // Check if staff exists
    const existingStaff = await pool.query('SELECT staff_id FROM staff WHERE staff_id = $1', [parseInt(staff_id)]);
    if (existingStaff.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Staff ID ${staff_id} not found`
      });
    }

    // Check if email is used by another staff member
    const emailCheck = await pool.query(
      'SELECT staff_id FROM staff WHERE email = $1 AND staff_id != $2', 
      [email, parseInt(staff_id)]
    );
    if (emailCheck.rows.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'This email address is already used by another staff member'
      });
    }

    // Update staff data
    const result = await pool.query(`
      UPDATE staff SET 
        name = $1,
        nickname = $2,
        gender = $3,
        age = $4,
        hire_date = $5,
        email = $6,
        address = $7,
        phone_number = $8,
        emer_phone = $9,
        emer_name = $10,
        position_id = $11
      WHERE staff_id = $12
      RETURNING *
    `, [
      name.trim(),
      nickname?.trim() || null,
      gender || 'male',
      parseInt(age),
      hire_date,
      email.trim(),
      address?.trim() || null,
      phone_number.trim(),
      emer_phone?.trim() || null,
      emer_name?.trim() || null,
      position_id?.trim() || null,
      parseInt(staff_id)
    ]);

    console.log(`✅ Successfully updated staff ID ${staff_id}`);

    res.json({
      success: true,
      message: 'Staff data updated successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('❌ Error updating staff:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update staff data',
      error: error.message
    });
  }
};

// Delete staff
const deleteStaff = async (req, res) => {
  try {
    const { staff_id } = req.params;
    console.log(`📥 Request: Delete staff ID ${staff_id}`);

    // Validate ID format
    if (!/^\d+$/.test(staff_id)) {
      return res.status(400).json({
        success: false,
        message: 'Staff ID must be a number'
      });
    }

    // Check if staff exists
    const existingStaff = await pool.query('SELECT name FROM staff WHERE staff_id = $1', [parseInt(staff_id)]);
    if (existingStaff.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Staff ID ${staff_id} not found`
      });
    }

    const staffName = existingStaff.rows[0].name;

    // Delete staff
    await pool.query('DELETE FROM staff WHERE staff_id = $1', [parseInt(staff_id)]);

    console.log(`✅ Successfully deleted staff ID ${staff_id} (${staffName})`);

    res.json({
      success: true,
      message: `Staff ${staffName} (ID: ${staff_id}) has been successfully deleted`
    });
  } catch (error) {
    console.error('❌ Error deleting staff:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete staff',
      error: error.message
    });
  }
};

module.exports = {
  getAllStaff,
  getStaffById,
  searchStaffByName,
  createStaff,
  updateStaff,
  deleteStaff
};