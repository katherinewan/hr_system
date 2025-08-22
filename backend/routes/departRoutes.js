// routes/departRoutes.js
const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { 
  getAllDepartments, 
  getDepartmentById,
  createDepartment, 
  updateDepartment, 
  deleteDepartment 
} = require('../controllers/departController');

console.log('🏢 Loading department routes...');

// GET /api/departments - Get all departments
router.get('/', getAllDepartments);

// GET /api/departments/:department_id - Get single department
router.get('/:department_id', getDepartmentById);

// POST /api/departments - Create department
router.post('/', createDepartment);

// PUT /api/departments/:department_id - Update department
router.put('/:department_id', updateDepartment);

// DELETE /api/departments/:department_id - Delete department
router.delete('/:department_id', deleteDepartment);

// GET /api/departments/:department_id/positions - Get all positions under department
router.get('/:department_id/positions', async (req, res) => {
  try {
    const { department_id } = req.params;
    console.log(`📥 Request: Get positions for department ${department_id}`);
    
    // Check if department exists
    const departmentCheck = await query(
      'SELECT department_name FROM departments WHERE department_id = $1',
      [department_id]
    );
    
    if (departmentCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `Department ID ${department_id} not found`
      });
    }
    
    const result = await query(`
      SELECT 
        p.position_id,
        p.title,
        p.level,
        p.department_id,
        d.department_name
      FROM positions p
      LEFT JOIN departments d ON p.department_id = d.department_id
      WHERE p.department_id = $1
      ORDER BY p.level, p.title
    `, [department_id]);
    
    console.log(`✅ Successfully retrieved ${result.rows.length} positions for department ${department_id}`);
    
    res.json({
      success: true,
      message: `Successfully retrieved position data for department "${departmentCheck.rows[0].department_name}"`,
      data: result.rows,
      count: result.rows.length,
      department: {
        department_id: parseInt(department_id),
        department_name: departmentCheck.rows[0].department_name
      }
    });
  } catch (error) {
    console.error('❌ Error retrieving department positions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve department position data',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// GET /api/departments/stats/overview - Get department statistics
router.get('/stats/overview', async (req, res) => {
  try {
    console.log('📥 Request: Get department statistics');
    
    const result = await query(`
      SELECT 
        COUNT(DISTINCT d.department_id) as total_departments,
        COUNT(DISTINCT p.position_id) as total_positions,
        ROUND(AVG(dept_stats.position_count), 2) as avg_positions_per_dept
      FROM departments d
      LEFT JOIN positions p ON d.department_id = p.department_id
      LEFT JOIN (
        SELECT 
          d2.department_id,
          COUNT(DISTINCT p2.position_id) as position_count
        FROM departments d2
        LEFT JOIN positions p2 ON d2.department_id = p2.department_id
        GROUP BY d2.department_id
      ) dept_stats ON d.department_id = dept_stats.department_id
    `);
    
    // Get position distribution by department
    const departmentDistribution = await query(`
      SELECT 
        d.department_name,
        d.department_id,
        d.department_head,
        COUNT(p.position_id) as position_count
      FROM departments d
      LEFT JOIN positions p ON d.department_id = p.department_id
      GROUP BY d.department_id, d.department_name, d.department_head
      ORDER BY position_count DESC
    `);
    
    console.log('✅ Successfully retrieved department statistics');
    
    res.json({
      success: true,
      message: 'Successfully retrieved department statistics',
      data: {
        overview: result.rows[0],
        departmentDistribution: departmentDistribution.rows
      }
    });
  } catch (error) {
    console.error('❌ Error retrieving department statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve department statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

module.exports = router;