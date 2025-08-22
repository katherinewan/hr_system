// routes/positionRoutes.js
const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const {
  getAllPositions,
  getPositionById,
  createPosition,
  updatePosition,
  deletePosition,
  getPositionsByDepartment
} = require('../controllers/positionController');

console.log('📋 Loading position routes...');

// GET /api/positions - Get all positions
router.get('/', getAllPositions);

// POST /api/positions - Create position
router.post('/', createPosition);

// GET /api/positions/department/:department_id - Get positions by department (needs to be before dynamic routes)
router.get('/department/:department_id', getPositionsByDepartment);

// GET /api/positions/stats/overview - Get position statistics
router.get('/stats/overview', async (req, res) => {
  try {
    console.log('📥 Request: Get position statistics');
    
    const result = await query(`
      SELECT 
        COUNT(DISTINCT p.position_id) as total_positions,
        COUNT(DISTINCT p.department_id) as departments_with_positions,
        COUNT(DISTINCT p.level) as unique_levels
      FROM positions p
    `);
    
    // Get level distribution
    const levelDistribution = await query(`
      SELECT 
        level,
        COUNT(*) as position_count
      FROM positions
      GROUP BY level
      ORDER BY position_count DESC
    `);
    
    // Get department position distribution
    const departmentDistribution = await query(`
      SELECT 
        d.department_name,
        d.department_id,
        COUNT(p.position_id) as position_count
      FROM departments d
      LEFT JOIN positions p ON d.department_id = p.department_id
      GROUP BY d.department_id, d.department_name
      ORDER BY position_count DESC
    `);
    
    console.log('✅ Successfully retrieved position statistics');
    
    res.json({
      success: true,
      message: 'Successfully retrieved position statistics',
      data: {
        overview: result.rows[0],
        levelDistribution: levelDistribution.rows,
        departmentDistribution: departmentDistribution.rows
      }
    });
  } catch (error) {
    console.error('❌ Error retrieving position statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve position statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// GET /api/positions/:position_id - Get single position
router.get('/:position_id', getPositionById);

// PUT /api/positions/:position_id - Update position
router.put('/:position_id', updatePosition);

// DELETE /api/positions/:position_id - Delete position
router.delete('/:position_id', deletePosition);

module.exports = router;