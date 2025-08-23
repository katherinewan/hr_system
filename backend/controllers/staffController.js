// controllers/staffController.js - Clean version
const { pool } = require('../config/database');

console.log('Loading staff controller...');

// Get all staff
const getAllStaff = async (req, res) => {
  try {
    console.log('Request: Get all staff');
    
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
    
    console.log(`Successfully retrieved ${result.rows.length} staff members`);
    
    res.json({
      success: true,
      message: `Successfully retrieved ${result.rows.length} staff records`,
      data: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('Error retrieving staff list:', error);
    res.status(500).json({
      success: false,
      message: 'Unable to retrieve staff data',
      error: error.message
    });
  }
};

// Get staff by ID
const getStaffById = async (req, res) => {
  try {
    const { staff_id } = req.params;
    console.log(`Request: Get staff ID ${staff_id}`);
    
    // Validate ID format
    if (!/^\d+$/.test(staff_id)) {
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
    `, [parseInt(staff_id.trim())]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Staff ID ${staff_id} not found`
      });
    }
    
    console.log(`Found staff ID ${staff_id} data`);
    
    res.json({
      success: true,
      message: `Successfully retrieved staff ${staff_id} data`,
      data: result.rows[0],
      staff_id: staff_id.trim()
    });
  } catch (error) {
    console.error('Error retrieving staff:', error);
    res.status(500).json({
      success: false,
      message: 'Unable to retrieve staff data',
      error: error.message
    });
  }
};

// Search staff by name
const searchStaffByName = async (req, res) => {
  try {
    const { name } = req.query;
    console.log(`Request: Search for staff names containing "${name}"`);
    
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
    
    console.log(`Found ${result.rows.length} matching staff members`);
    
    res.json({
      success: true,
      message: `Found ${result.rows.length} staff members`,
      data: result.rows,
      count: result.rows.length,
      searchTerm: name.trim()
    });
  } catch (error) {
    console.error('Error searching staff:', error);
    res.status(500).json({
      success: false,
      message: 'Staff search failed',
      error: error.message
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
      hire_date,
      email,
      address,
      phone_number,
      emer_phone,
      emer_name,
      position_id
    } = req.body;

    console.log('Request: Create staff', { name, email });

    // Validate required fields
    if (!name || !email || !phone_number || !birthday || !hire_date) {
      return res.status(400).json({
        success: false,
        message: 'Please fill in all required fields: name, email, phone number, birthday, hire date'
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
      staff_id, name, nickname, gender, birthday, hire_date, email, address, 
      phone_number, emer_phone, emer_name, position_id
    ) 
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    RETURNING *
  `, [
    staff_id.trim(),
    name.trim(),
    nickname?.trim() || null,
    gender || 'male',
    birthday,
    hire_date,
    email.trim(),
    address?.trim() || null,
    phone_number.trim(),
    emer_phone?.trim() || null,
    emer_name?.trim() || null,
    position_id?.trim() || null
  ]);

    console.log(`Successfully created staff ID ${result.rows[0].staff_id}`);

    res.status(201).json({
      success: true,
      message: 'Staff created successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating staff:', error);
    res.status(500).json({
      success: false,
      message: 'Unable to create staff',
      error: error.message
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
      hire_date,
      email,
      address,
      phone_number,
      emer_phone,
      emer_name,
      position_id
    } = req.body;

    console.log(`Request: Update staff ID ${id}`, { name, email });

    if (!/^\d+$/.test(id)) {
      return res.status(400).json({
        success: false,
        message: 'Staff ID must be numeric'
      });
    }

    if (!name || !email || !phone_number || !birthday || !hire_date) {
      return res.status(400).json({
        success: false,
        message: 'Please fill in all required fields: name, email, phone number, birthday, hire date'
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format'
      });
    }

    const existingStaff = await pool.query('SELECT staff_id FROM staff WHERE staff_id = $1', [parseInt(id)]);
    if (existingStaff.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Staff ID ${id} not found`
      });
    }

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

    const result = await pool.query(`
      UPDATE staff SET 
        name = $1,
        nickname = $2,
        gender = $3,
        birthday = $4,
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
      nickname ? String(nickname).trim() : null,
      gender || 'male',
      birthday,
      hire_date,
      email.trim(),
      address ? String(address).trim() : null,
      phone_number.trim(),
      emer_phone ? String(emer_phone).trim() : null,
      emer_name ? String(emer_name).trim() : null,
      position_id ? String(position_id).trim() : null,
      parseInt(id)
    ]);

    console.log(`Successfully updated staff ID ${id}`);

    res.json({
      success: true,
      message: 'Staff data updated successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating staff:', error);
    res.status(500).json({
      success: false,
      message: 'Unable to update staff data',
      error: error.message
    });
  }
};

// Delete staff
const deleteStaff = async (req, res) => {
  try {
    const { staff_id } = req.params;
    console.log(`Request: Delete staff ID ${staff_id}`);

    if (!/^\d+$/.test(staff_id)) {
      return res.status(400).json({
        success: false,
        message: 'Staff ID must be numeric'
      });
    }

    const existingStaff = await pool.query('SELECT name FROM staff WHERE staff_id = $1', [parseInt(staff_id)]);
    if (existingStaff.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Staff ID ${staff_id} not found`
      });
    }

    const staffName = existingStaff.rows[0].name;

    await pool.query('DELETE FROM staff WHERE staff_id = $1', [parseInt(staff_id)]);

    console.log(`Successfully deleted staff ID ${staff_id} (${staffName})`);

    res.json({
      success: true,
      message: `Staff ${staffName} (ID: ${staff_id}) has been successfully deleted`
    });
  } catch (error) {
    console.error('Error deleting staff:', error);
    res.status(500).json({
      success: false,
      message: 'Unable to delete staff',
      error: error.message
    });
  }
};

// Get logged-in staff profile
const getStaffProfile = async (req, res) => {
  try {
    const staffId = req.staff.staffId;
    console.log(`Request: Get staff profile ID ${staffId}`);

    const staffQuery = `
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
    `;

    const result = await pool.query(staffQuery, [staffId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Staff profile not found'
      });
    }

    const staffProfile = result.rows[0];

    const profileData = {
      staffId: staffProfile.staff_id,
      personalInfo: {
        name: staffProfile.name,
        nickname: staffProfile.nickname,
        gender: staffProfile.gender,
        birthday: staffProfile.birthday,
        age: staffProfile.age,
        email: staffProfile.email,
        phoneNumber: staffProfile.phone_number,
        address: staffProfile.address
      },
      workInfo: {
        hireDate: staffProfile.hire_date,
        positionId: staffProfile.position_id,
        positionName: staffProfile.position_name,
        department: staffProfile.department_name,
        basicSalary: staffProfile.basic_salary
      },
      emergencyContact: {
        name: staffProfile.emer_name,
        phone: staffProfile.emer_phone
      }
    };

    console.log(`Successfully retrieved staff data: ${staffProfile.name}`);

    res.json({
      success: true,
      message: 'Staff profile retrieved successfully',
      data: profileData
    });

  } catch (error) {
    console.error('Error retrieving staff profile:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error occurred while retrieving profile',
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
  deleteStaff,
  getStaffProfile
};