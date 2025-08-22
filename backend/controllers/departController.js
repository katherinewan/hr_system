// controllers/departController.js
const { query } = require('../config/database');

console.log('🏢 Loading department controller...');

// Helper function: Validate department data
const validateDepartmentData = (data, isUpdate = false) => {
  const errors = [];
  
  if (!isUpdate && (!data.department_id || data.department_id === '')) {
    errors.push('Department ID is required');
  }
  
  if (!data.department_name || !data.department_name.trim()) {
    errors.push('Department name is required');
  }
  
  if (!data.department_head || !data.department_head.trim()) {
    errors.push('Department head is required');
  }
  
  // Validate department name length
  if (data.department_name && data.department_name.length > 100) {
    errors.push('Department name cannot exceed 100 characters');
  }
  
  // Validate department head name length
  if (data.department_head && data.department_head.length > 100) {
    errors.push('Department head name cannot exceed 100 characters');
  }
  
  return errors;
};

// Get all departments
const getAllDepartments = async (req, res) => {
  try {
    console.log('📥 Request: Get all departments');
    
    const result = await query(`
      SELECT 
        d.department_id,
        d.department_name,
        d.department_head,
        COUNT(p.position_id) as position_count
      FROM department d
      LEFT JOIN position p ON d.department_id = p.department_id
      GROUP BY d.department_id, d.department_name, d.department_head
      ORDER BY d.department_id
    `);
    
    console.log(`✅ Successfully retrieved ${result.rows.length} departments`);
    
    res.json({
      success: true,
      message: `Successfully retrieved ${result.rows.length} department records`,
      data: result.rows,
      count: result.rows.length
    });
  } catch (error) {
    console.error('❌ Error retrieving department list:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve department data',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Get department by ID
const getDepartmentById = async (req, res) => {
  try {
    const { department_id } = req.params;
    console.log(`📥 Request: Get department ID ${department_id}`);
    
    if (!department_id) {
      return res.status(400).json({
        success: false,
        message: 'Department ID is a required parameter'
      });
    }
    
    const result = await query(`
      SELECT 
        d.department_id,
        d.department_name,
        d.department_head,
        COUNT(p.position_id) as position_count
      FROM department d
      LEFT JOIN position p ON d.department_id = p.department_id
      WHERE d.department_id = $1
      GROUP BY d.department_id, d.department_name, d.department_head
    `, [department_id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Department ID ${department_id} not found`
      });
    }
    
    console.log(`✅ Successfully retrieved department ID ${department_id}`);
    
    res.json({
      success: true,
      message: 'Successfully retrieved department data',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('❌ Error retrieving department:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve department data',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Create department
const createDepartment = async (req, res) => {
  try {
    const { department_id, department_name, department_head } = req.body;
    console.log(`📥 Request: Create department ${department_name}`);
    
    // Validate data
    const validationErrors = validateDepartmentData(req.body);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Data validation failed',
        errors: validationErrors
      });
    }
    
    // Check if department ID already exists
    const existingDeptById = await query(
      'SELECT department_id FROM department WHERE department_id = $1',
      [department_id]
    );
    
    if (existingDeptById.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Department ID ${department_id} already exists`
      });
    }
    
    // Check if department name already exists
    const existingDeptByName = await query(
      'SELECT department_id FROM department WHERE department_name = $1',
      [department_name]
    );
    
    if (existingDeptByName.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Department name "${department_name}" already exists`
      });
    }
    
    const result = await query(`
      INSERT INTO department (department_id, department_name, department_head)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [department_id, department_name, department_head]);
    
    console.log(`✅ Successfully created department ID ${result.rows[0].department_id}`);
    
    res.status(201).json({
      success: true,
      message: 'Department created successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('❌ Error creating department:', error);
    
    // Handle specific PostgreSQL errors
    if (error.code === '23505') { // Unique constraint violation
      return res.status(400).json({
        success: false,
        message: 'Department ID or department name already exists'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to create department',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Update department
const updateDepartment = async (req, res) => {
  try {
    const { department_id } = req.params;
    const { department_name, department_head } = req.body;
    console.log(`📥 Request: Update department ID ${department_id}`);
    
    // Validate data (no need to validate department_id for updates)
    const validationErrors = validateDepartmentData(req.body, true);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Data validation failed',
        errors: validationErrors
      });
    }
    
    // Check if department exists
    const existingDepartment = await query(
      'SELECT department_name FROM department WHERE department_id = $1',
      [department_id]
    );
    
    if (existingDepartment.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Department ID ${department_id} not found`
      });
    }
    
    // Check if department name is already used by another department
    const duplicateCheck = await query(
      'SELECT department_id FROM department WHERE department_name = $1 AND department_id != $2',
      [department_name, department_id]
    );
    
    if (duplicateCheck.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Department name "${department_name}" already exists in another department`
      });
    }
    
    const result = await query(`
      UPDATE department
      SET department_name = $1, department_head = $2
      WHERE department_id = $3
      RETURNING *
    `, [department_name, department_head, department_id]);
    
    console.log(`✅ Successfully updated department ID ${department_id}`);
    
    res.json({
      success: true,
      message: 'Department updated successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('❌ Error updating department:', error);
    
    // Handle specific PostgreSQL errors
    if (error.code === '23505') {
      return res.status(400).json({
        success: false,
        message: 'Department name already exists'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to update department',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// Delete department
const deleteDepartment = async (req, res) => {
  try {
    const { department_id } = req.params;
    console.log(`📥 Request: Delete department ID ${department_id}`);
    
    if (!department_id) {
      return res.status(400).json({
        success: false,
        message: 'Department ID is a required parameter'
      });
    }
    
    // Check if department exists
    const existingDepartment = await query(
      'SELECT department_name FROM department WHERE department_id = $1',
      [department_id]
    );
    
    if (existingDepartment.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Department ID ${department_id} not found`
      });
    }
    
    // Check if there are positions belonging to this department
    const positionCheck = await query(
      'SELECT COUNT(*) as count FROM position WHERE department_id = $1',
      [department_id]
    );
    
    const positionCount = parseInt(positionCheck.rows[0].count);
    if (positionCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete department, it still has ${positionCount} positions`
      });
    }
    
    const result = await query(`
      DELETE FROM department
      WHERE department_id = $1
      RETURNING *
    `, [department_id]);
    
    console.log(`✅ Successfully deleted department ID ${department_id} (${existingDepartment.rows[0].department_name})`);
    
    res.json({
      success: true,
      message: `Department "${existingDepartment.rows[0].department_name}" (ID: ${department_id}) has been successfully deleted`
    });
  } catch (error) {
    console.error('❌ Error deleting department:', error);
    
    // Handle foreign key constraint errors
    if (error.code === '23503') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete department, it is referenced by other records'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to delete department',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

module.exports = {
  getAllDepartments,
  getDepartmentById,
  createDepartment,
  updateDepartment,
  deleteDepartment
};