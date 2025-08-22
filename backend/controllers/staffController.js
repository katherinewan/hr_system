// controllers/staffController.js - Complete staff controller (using existing User model)
const { pool } = require('../config/database');
const { authMiddleware } = require('../middleware/auth');

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
    console.error('❌ Error retrieving staff list:', error);
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
    console.log(`📥 Request: Get staff ID ${staff_id}`);
    
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
    console.error('❌ Error retrieving staff:', error);
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
    console.log(`📥 Request: Search for staff names containing "${name}"`);
    
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

// Create staff
const createStaff = async (req, res) => {
  try {
    const {
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
    } = req.body;

    console.log('📥 Request: Create staff', { name, email });

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
      staff_id, name, nickname, gender, age, hire_date, email, address, 
      phone_number, emer_phone, emer_name, position_id
    ) 
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    RETURNING *
  `, [
    staff_id.trim(),
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
      message: 'Unable to create staff',
      error: error.message
    });
  }
};

// Update staff - Complete fixed version
const updateStaff = async (req, res) => {
  try {
    const { id } = req.params; // Get staff_id from URL
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
    } = req.body; // No longer attempt to get staff_id

    console.log(`📥 Request: Update staff ID ${id}`, { name, email });

    // Validate ID format
    if (!/^\d+$/.test(id)) {
      return res.status(400).json({
        success: false,
        message: 'Staff ID must be numeric'
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
    const existingStaff = await pool.query('SELECT staff_id FROM staff WHERE staff_id = $1', [parseInt(id)]);
    if (existingStaff.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Staff ID ${id} not found`
      });
    }

    // Check if email is used by other staff
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
      nickname ? String(nickname).trim() : null,
      gender || 'male',
      parseInt(age),
      hire_date,
      email.trim(),
      address ? String(address).trim() : null,
      phone_number.trim(),
      emer_phone ? String(emer_phone).trim() : null,
      emer_name ? String(emer_name).trim() : null,
      position_id ? String(position_id).trim() : null,
      parseInt(id) // Use id from URL parameters
    ]);

    console.log(`✅ Successfully updated staff ID ${id}`);

    res.json({
      success: true,
      message: 'Staff data updated successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('❌ Error updating staff:', error);
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
    console.log(`📥 Request: Delete staff ID ${staff_id}`);

    // Validate ID format
    if (!/^\d+$/.test(staff_id)) {
      return res.status(400).json({
        success: false,
        message: 'Staff ID must be numeric'
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
      message: 'Unable to delete staff',
      error: error.message
    });
  }
};

// ============ Staff Profile Related Functions (requires authentication) ============

// Get logged-in staff profile
const getStaffProfile = async (req, res) => {
  try {
    const staffId = req.staff.staffId; // From authMiddleware
    console.log(`📥 Request: Get staff profile ID ${staffId}`);

    // Get complete staff data and position information
    const staffQuery = `
      SELECT 
        s.staff_id,
        s.name,
        s.nickname,
        s.gender,
        s.age,
        s.hire_date,
        s.email,
        s.address,
        s.phone_number,
        s.emer_phone,
        s.emer_name,
        s.position_id,
        p.position_name,
        p.department,
        p.base_salary
      FROM staff s
      LEFT JOIN positions p ON s.position_id = p.position_id
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

    // Format response data
    const profileData = {
      staffId: staffProfile.staff_id,
      personalInfo: {
        name: staffProfile.name,
        nickname: staffProfile.nickname,
        gender: staffProfile.gender,
        age: staffProfile.age,
        email: staffProfile.email,
        phoneNumber: staffProfile.phone_number,
        address: staffProfile.address
      },
      workInfo: {
        hireDate: staffProfile.hire_date,
        positionId: staffProfile.position_id,
        positionName: staffProfile.position_name,
        department: staffProfile.department,
        baseSalary: staffProfile.base_salary
      },
      emergencyContact: {
        name: staffProfile.emer_name,
        phone: staffProfile.emer_phone
      }
    };

    console.log(`✅ Successfully retrieved staff data: ${staffProfile.name}`);

    res.json({
      success: true,
      message: 'Staff profile retrieved successfully',
      data: profileData
    });

  } catch (error) {
    console.error('❌ Error retrieving staff profile:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error occurred while retrieving profile'
    });
  }
};

// Update staff profile (limited editable fields)
const updateStaffProfile = async (req, res) => {
  try {
    const staffId = req.staff.staffId; // From authMiddleware
    const { 
      nickname, 
      phoneNumber, 
      address, 
      emergencyContactName, 
      emergencyContactPhone 
    } = req.body;

    console.log(`📥 Request: Update staff profile ID ${staffId}`);

    // Validate input
    if (!nickname && !phoneNumber && !address && !emergencyContactName && !emergencyContactPhone) {
      return res.status(400).json({
        success: false,
        message: 'At least one field is required for update'
      });
    }

    // Build dynamic update query
    const updateFields = [];
    const values = [];
    let paramCounter = 1;

    if (nickname !== undefined) {
      updateFields.push(`nickname = $${paramCounter++}`);
      values.push(nickname);
    }
    if (phoneNumber !== undefined) {
      updateFields.push(`phone_number = $${paramCounter++}`);
      values.push(phoneNumber);
    }
    if (address !== undefined) {
      updateFields.push(`address = $${paramCounter++}`);
      values.push(address);
    }
    if (emergencyContactName !== undefined) {
      updateFields.push(`emer_name = $${paramCounter++}`);
      values.push(emergencyContactName);
    }
    if (emergencyContactPhone !== undefined) {
      updateFields.push(`emer_phone = $${paramCounter++}`);
      values.push(emergencyContactPhone);
    }

    values.push(staffId); // Add staff_id for WHERE condition

    const updateQuery = `
      UPDATE staff 
      SET ${updateFields.join(', ')}
      WHERE staff_id = $${paramCounter}
      RETURNING staff_id, nickname, phone_number, address, emer_name, emer_phone
    `;

    const result = await pool.query(updateQuery, values);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Staff not found or no changes made'
      });
    }

    console.log(`✅ Successfully updated staff profile ID ${staffId}`);

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        staffId: result.rows[0].staff_id,
        updatedFields: {
          nickname: result.rows[0].nickname,
          phoneNumber: result.rows[0].phone_number,
          address: result.rows[0].address,
          emergencyContactName: result.rows[0].emer_name,
          emergencyContactPhone: result.rows[0].emer_phone
        }
      }
    });

  } catch (error) {
    console.error('❌ Error updating staff profile:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error occurred while updating profile'
    });
  }
};

// Get work summary
const getWorkSummary = async (req, res) => {
  try {
    const staffId = req.staff.staffId; // From authMiddleware
    console.log(`📥 Request: Get work summary ID ${staffId}`);

    // Get work summary statistics
    const summaryQuery = `
      SELECT 
        COUNT(*) as total_work_days,
        COALESCE(SUM(total_hours), 0) as total_hours_worked,
        COALESCE(AVG(total_hours), 0) as average_daily_hours
      FROM attendance 
      WHERE staff_id = $1 
      AND status = 'present'
      AND date >= DATE_TRUNC('month', CURRENT_DATE)
    `;

    const summaryResult = await pool.query(summaryQuery, [staffId]);
    
    // Get hire date to calculate years of service
    const hireQuery = `SELECT hire_date FROM staff WHERE staff_id = $1`;
    const hireResult = await pool.query(hireQuery, [staffId]);

    let yearsOfService = 0;
    if (hireResult.rows.length > 0) {
      const hireDate = new Date(hireResult.rows[0].hire_date);
      const currentDate = new Date();
      yearsOfService = Math.floor((currentDate - hireDate) / (365.25 * 24 * 60 * 60 * 1000));
    }

    const workSummary = {
      currentMonth: {
        totalWorkDays: parseInt(summaryResult.rows[0].total_work_days),
        totalHours: parseFloat(summaryResult.rows[0].total_hours_worked).toFixed(2),
        averageDailyHours: parseFloat(summaryResult.rows[0].average_daily_hours).toFixed(2)
      },
      tenure: {
        yearsOfService: yearsOfService
      }
    };

    console.log(`✅ Successfully retrieved work summary ID ${staffId}`);

    res.json({
      success: true,
      message: 'Work summary retrieved successfully',
      data: workSummary
    });

  } catch (error) {
    console.error('❌ Error retrieving work summary:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error occurred while retrieving work summary'
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
  getStaffProfile,
  updateStaffProfile,
  getWorkSummary
};