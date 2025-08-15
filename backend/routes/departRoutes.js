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

console.log('🏢 載入部門路由...');

// GET /api/departments - 獲取所有部門
router.get('/', getAllDepartments);

// GET /api/departments/:department_id - 獲取單一部門
router.get('/:department_id', getDepartmentById);

// POST /api/departments - 新增部門
router.post('/', createDepartment);

// PUT /api/departments/:department_id - 更新部門
router.put('/:department_id', updateDepartment);

// DELETE /api/departments/:department_id - 刪除部門
router.delete('/:department_id', deleteDepartment);

// GET /api/departments/:department_id/positions - 獲取部門下的所有職位
router.get('/:department_id/positions', async (req, res) => {
  try {
    const { department_id } = req.params;
    console.log(`📥 請求：獲取部門 ${department_id} 的職位`);
    
    // 檢查部門是否存在
    const departmentCheck = await query(
      'SELECT department_name FROM departments WHERE department_id = $1',
      [department_id]
    );
    
    if (departmentCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: `找不到部門 ID ${department_id}`
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
    
    console.log(`✅ 成功獲取部門 ${department_id} 的 ${result.rows.length} 個職位`);
    
    res.json({
      success: true,
      message: `成功獲取部門「${departmentCheck.rows[0].department_name}」的職位資料`,
      data: result.rows,
      count: result.rows.length,
      department: {
        department_id: parseInt(department_id),
        department_name: departmentCheck.rows[0].department_name
      }
    });
  } catch (error) {
    console.error('❌ 獲取部門職位錯誤:', error);
    res.status(500).json({
      success: false,
      message: '獲取部門職位資料失敗',
      error: process.env.NODE_ENV === 'development' ? error.message : '內部伺服器錯誤'
    });
  }
});

// GET /api/departments/stats/overview - 獲取部門統計信息
router.get('/stats/overview', async (req, res) => {
  try {
    console.log('📥 請求：獲取部門統計信息');
    
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
    
    // 獲取各部門的職位分布
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
    
    console.log('✅ 成功獲取部門統計信息');
    
    res.json({
      success: true,
      message: '成功獲取部門統計信息',
      data: {
        overview: result.rows[0],
        departmentDistribution: departmentDistribution.rows
      }
    });
  } catch (error) {
    console.error('❌ 獲取部門統計錯誤:', error);
    res.status(500).json({
      success: false,
      message: '獲取部門統計信息失敗',
      error: process.env.NODE_ENV === 'development' ? error.message : '內部伺服器錯誤'
    });
  }
});

module.exports = router;