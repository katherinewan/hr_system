// controllers/positionController.js
const { query } = require('../config/database');

console.log('📋 Loading position controller...');

// Helper function: Validate position data
const validatePositionData = (data, isUpdate = false) => {
  const errors = [];
  
  if (!isUpdate && (!data.position_id || data.position_id === '')) {
    errors.push('Position ID is required');
  }
  
  if (!data.title || !data.title.trim()) {
    errors.push('Position title is required');
  }
  
  if (!data.level || !data.level.trim()) {
    errors.push('Position level is required');
  }
  
  if (!data.department_id || data.department_id === '') {
    errors.push('Department ID is required');
  }
  
  // Validate position title length
  if (data.title && data.title.length > 100) {
    errors.push('Position title cannot exceed 100 characters');
  }
  
  // Validate position level length
  if (data.level && data.level.length > 100) {
    errors.push('Position level cannot exceed 100 characters');
  }
  
  // Validate if level is valid (based on actual data in your database)
  const validLevels = ['Junior', 'Mid', 'Senior', '初級', '中級', '高級', '主管', '經理', '總監'];
  if (data.level && !validLevels.includes(data.level)) {
    errors.push('Invalid position level');
  }
  
  return errors;
};

// Get all positions
const getAllPositions = async (req, res) => {
  try {
    console.log('📥 Request: Get all positions');
    
    const result = await query(`
      SELECT 
        p.position_id,
        p.title,
        p.level,
        p.department_id,
        d.department_name
      FROM position p
      LEFT JOIN department d ON p.department_id = d.department_id
      ORDER BY p.department_id, p.level, p.title
    `);
    
    console.log(`✅ Successfully retrieved ${result.rows.length} positions`);
    
    res.json({
      success: true,
      message: `Successfully retrieved ${result.rows.length} position records`,
      data: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('❌ Error retrieving position list:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve position data',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Get position by ID
const getPositionById = async (req, res) => {
  try {
    const { position_id } = req.params;
    console.log(`📥 Request: Get position ID ${position_id}`);
    
    if (!position_id) {
      return res.status(400).json({
        success: false,
        message: 'Position ID is a required parameter'
      });
    }
    
    const result = await query(`
      SELECT 
        p.position_id,
        p.title,
        p.level,
        p.department_id,
        d.department_name
      FROM position p
      LEFT JOIN department d ON p.department_id = d.department_id
      WHERE p.position_id = $1
    `, [position_id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Position ID ${position_id} not found`
      });
    }
    
    console.log(`✅ Successfully retrieved position ID ${position_id}`);
    
    res.json({
      success: true,
      message: 'Successfully retrieved position data',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('❌ Error retrieving position:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve position data',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Create position
const createPosition = async (req, res) => {
  try {
    const { position_id, title, level, department_id } = req.body;
    console.log(`📥 Request: Create position ${title}`);
    
    // Validate data
    const validationErrors = validatePositionData(req.body);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Data validation failed',
        errors: validationErrors
      });
    }
    
    // Check if department exists
    const departmentCheck = await query(
      'SELECT department_name FROM department WHERE department_id = $1',
      [department_id]
    );
    
    if (departmentCheck.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: `Department ID ${department_id} does not exist`
      });
    }
    
    // Check if position ID already exists
    const existingPosition = await query(
      'SELECT position_id FROM position WHERE position_id = $1',
      [position_id]
    );
    
    if (existingPosition.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Position ID ${position_id} already exists`
      });
    }
    
    // Check if same position title already exists in the department
    const duplicateCheck = await query(
      'SELECT position_id FROM position WHERE title = $1 AND department_id = $2',
      [title, department_id]
    );
    
    if (duplicateCheck.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Position "${title}" already exists in this department`
      });
    }
    
    // Create position
    const result = await query(`
      INSERT INTO position (position_id, title, level, department_id)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `, [position_id, title, level, department_id]);
    
    console.log(`✅ Successfully created position ID ${result.rows[0].position_id}`);
    
    // Get complete position data including department name
    const positionWithDept = await query(`
      SELECT 
        p.position_id,
        p.title,
        p.level,
        p.department_id,
        d.department_name
      FROM position p
      LEFT JOIN department d ON p.department_id = d.department_id
      WHERE p.position_id = $1
    `, [position_id]);
    
    res.status(201).json({
      success: true,
      message: 'Position created successfully',
      data: positionWithDept.rows[0] || result.rows[0]
    });
  } catch (error) {
    console.error('❌ Error creating position:', error);
    
    // Handle specific PostgreSQL errors
    if (error.code === '23505') { // Unique constraint violation
      return res.status(400).json({
        success: false,
        message: 'Position ID already exists'
      });
    }
    
    if (error.code === '23503') { // Foreign key constraint violation
      return res.status(400).json({
        success: false,
        message: 'Specified department does not exist'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to create position',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Update position
const updatePosition = async (req, res) => {
  try {
    const { position_id } = req.params;
    const { title, level, department_id } = req.body;
    console.log(`📥 Request: Update position ID ${position_id}`);
    
    // Validate data (no need to validate position_id for updates)
    const validationErrors = validatePositionData(req.body, true);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Data validation failed',
        errors: validationErrors
      });
    }
    
    // Check if position exists
    const existingPosition = await query(
      'SELECT title FROM position WHERE position_id = $1',
      [position_id]
    );
    
    if (existingPosition.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Position ID ${position_id} not found`
      });
    }
    
    // Check if department exists
    const departmentCheck = await query(
      'SELECT department_name FROM department WHERE department_id = $1',
      [department_id]
    );
    
    if (departmentCheck.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: `Department ID ${department_id} does not exist`
      });
    }
    
    // Check if same position title already exists in the department (excluding self)
    const duplicateCheck = await query(
      'SELECT position_id FROM position WHERE title = $1 AND department_id = $2 AND position_id != $3',
      [title, department_id, position_id]
    );
    
    if (duplicateCheck.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Position "${title}" already exists in this department`
      });
    }
    
    const result = await query(`
      UPDATE position 
      SET title = $1, level = $2, department_id = $3 
      WHERE position_id = $4
      RETURNING *
    `, [title, level, department_id, position_id]);
    
    console.log(`✅ Successfully updated position ID ${result.rows[0].position_id}`);
    
    // Get complete position data including department name
    const positionWithDept = await query(`
      SELECT 
        p.position_id,
        p.title,
        p.level,
        p.department_id,
        d.department_name
      FROM position p
      LEFT JOIN department d ON p.department_id = d.department_id
      WHERE p.position_id = $1
    `, [position_id]);
    
    res.json({
      success: true,
      message: 'Position updated successfully',
      data: positionWithDept.rows[0] || result.rows[0]
    });
  } catch (error) {
    console.error('❌ Error updating position:', error);
    
    // Handle specific PostgreSQL errors
    if (error.code === '23505') {
      return res.status(400).json({
        success: false,
        message: 'Position title already exists in this department'
      });
    }
    
    if (error.code === '23503') {
      return res.status(400).json({
        success: false,
        message: 'Specified department does not exist'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to update position',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Delete position
const deletePosition = async (req, res) => {
  try {
    const { position_id } = req.params;
    console.log(`📥 Request: Delete position ID ${position_id}`);
    
    if (!position_id) {
      return res.status(400).json({
        success: false,
        message: 'Position ID is a required parameter'
      });
    }
    
    // Check if position exists
    const existingPosition = await query(
      'SELECT title FROM position WHERE position_id = $1',
      [position_id]
    );
    
    if (existingPosition.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Position ID ${position_id} not found`
      });
    }
    
    // Check if there are employees using this position (if staff table exists)
    try {
      const staffCheck = await query(
        'SELECT COUNT(*) as count FROM staff WHERE position_id = $1',
        [position_id]
      );
      
      const staffCount = parseInt(staffCheck.rows[0].count);
      if (staffCount > 0) {
        return res.status(400).json({
          success: false,
          message: `Cannot delete position, ${staffCount} employees are still using this position`
        });
      }
    } catch (staffError) {
      // If staff table doesn't exist, continue with deletion
      console.log('📝 Staff table may not exist, skipping employee check');
    }
    
    // Delete position
    await query('DELETE FROM position WHERE position_id = $1', [position_id]);
    
    console.log(`✅ Successfully deleted position ID ${position_id} (${existingPosition.rows[0].title})`);
    
    res.json({
      success: true,
      message: `Position "${existingPosition.rows[0].title}" (ID: ${position_id}) has been successfully deleted`
    });
  } catch (error) {
    console.error('❌ Error deleting position:', error);
    
    // Handle foreign key constraint errors
    if (error.code === '23503') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete position, it is referenced by other records'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to delete position',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Get positions by department
const getPositionsByDepartment = async (req, res) => {
  try {
    const { department_id } = req.params;
    console.log(`📥 Request: Get positions for department ${department_id}`);
    
    const result = await query(`
      SELECT 
        p.position_id,
        p.title,
        p.level,
        p.department_id,
        d.department_name
      FROM position p
      LEFT JOIN department d ON p.department_id = d.department_id
      WHERE p.department_id = $1
      ORDER BY p.level, p.title
    `, [department_id]);
    
    console.log(`✅ Successfully retrieved ${result.rows.length} positions for department ${department_id}`);
    
    res.json({
      success: true,
      message: `Successfully retrieved department position data`,
      data: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('❌ Error retrieving department positions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve department position data',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

module.exports = {
  getAllPositions,
  getPositionById,
  createPosition,
  updatePosition,
  deletePosition,
  getPositionsByDepartment
};