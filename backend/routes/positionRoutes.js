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

console.log('📋 載入職位路由...');

// GET /api/positions - 獲取所有職位
router.get('/', getAllPositions);

// POST /api/positions - 新增職位
router.post('/', createPosition);

// GET /api/positions/department/:department_id - 根據部門獲取職位（需要在動態路由之前）
router.get('/department/:department_id', getPositionsByDepartment);

// GET /api/positions/stats/overview - 獲取職位統計信息
router.get('/stats/overview', async (req, res) => {
  try {
    console.log('📥 請求：獲取職位統計信息');
    
    const result = await query(`
      SELECT 
        COUNT(DISTINCT p.position_id) as total_positions,
        COUNT(DISTINCT p.department_id) as departments_with_positions,
        COUNT(DISTINCT p.level) as unique_levels
      FROM positions p
    `);
    
    // 獲取職級分布
    const levelDistribution = await query(`
      SELECT 
        level,
        COUNT(*) as position_count
      FROM positions
      GROUP BY level
      ORDER BY position_count DESC
    `);
    
    // 獲取部門職位分布
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
    
    console.log('✅ 成功獲取職位統計信息');
    
    res.json({
      success: true,
      message: '成功獲取職位統計信息',
      data: {
        overview: result.rows[0],
        levelDistribution: levelDistribution.rows,
        departmentDistribution: departmentDistribution.rows
      }
    });
  } catch (error) {
    console.error('❌ 獲取職位統計錯誤:', error);
    res.status(500).json({
      success: false,
      message: '獲取職位統計信息失敗',
      error: process.env.NODE_ENV === 'development' ? error.message : '內部伺服器錯誤'
    });
  }
});

// GET /api/positions/:position_id - 獲取單一職位
router.get('/:position_id', getPositionById);

// PUT /api/positions/:position_id - 更新職位
router.put('/:position_id', updatePosition);

// DELETE /api/positions/:position_id - 刪除職位
router.delete('/:position_id', deletePosition);

module.exports = router;