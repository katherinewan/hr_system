// routes/payrollRoutes.js - 薪資管理路由
const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');

// 🔧 工具函數
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount || 0);
};

const validateDateFormat = (dateString) => {
  const regex = /^\d{4}-\d{2}$/;
  return regex.test(dateString);
};

// ===== 測試路由 =====
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: '薪資管理路由測試成功',
    version: '1.0.0',
    endpoints: {
      'GET /api/payroll': '獲取薪資記錄',
      'GET /api/payroll/statistics': '獲取薪資統計',
      'POST /api/payroll/generate': '生成月薪資',
      'GET /api/payroll/:id': '獲取單筆薪資記錄',
      'PUT /api/payroll/:id': '更新薪資記錄',
      'DELETE /api/payroll/:id': '刪除薪資記錄',
      'GET /api/payroll/staff/:staff_id': '獲取員工薪資歷史',
      'GET /api/payroll/month/:month': '獲取指定月份薪資',
      'POST /api/payroll/bulk': '批量操作薪資'
    }
  });
});

// ===== 1. 獲取薪資記錄 =====
router.get('/', async (req, res) => {
  try {
    const {
      month,
      staff_id,
      department,
      status,
      page = 1,
      limit = 50,
      sort_by = 'created_at',
      sort_order = 'DESC'
    } = req.query;

    let query = `
      SELECT 
        p.payroll_id,
        p.staff_id,
        s.name as staff_name,
        s.department,
        s.position,
        p.month,
        p.basic_salary,
        p.allowances,
        p.overtime_pay,
        p.bonus,
        p.deductions,
        p.tax_deduction,
        p.insurance_deduction,
        p.total_salary,
        p.net_salary,
        p.status,
        p.payment_date,
        p.notes,
        p.created_at,
        p.updated_at
      FROM payroll p
      LEFT JOIN staff s ON p.staff_id = s.staff_id
      WHERE 1=1
    `;

    const queryParams = [];
    let paramCount = 0;

    // 動態添加篩選條件
    if (month) {
      paramCount++;
      query += ` AND p.month = $${paramCount}`;
      queryParams.push(month);
    }

    if (staff_id) {
      paramCount++;
      query += ` AND p.staff_id = $${paramCount}`;
      queryParams.push(staff_id);
    }

    if (department) {
      paramCount++;
      query += ` AND s.department ILIKE $${paramCount}`;
      queryParams.push(`%${department}%`);
    }

    if (status) {
      paramCount++;
      query += ` AND p.status = $${paramCount}`;
      queryParams.push(status);
    }

    // 排序
    const validSortFields = ['payroll_id', 'staff_name', 'month', 'total_salary', 'net_salary', 'status', 'created_at'];
    const sortField = validSortFields.includes(sort_by) ? sort_by : 'created_at';
    const sortDirection = sort_order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    
    if (sortField === 'staff_name') {
      query += ` ORDER BY s.name ${sortDirection}`;
    } else {
      query += ` ORDER BY p.${sortField} ${sortDirection}`;
    }

    // 分頁
    const offset = (page - 1) * limit;
    paramCount++;
    query += ` LIMIT $${paramCount}`;
    queryParams.push(limit);
    
    paramCount++;
    query += ` OFFSET $${paramCount}`;
    queryParams.push(offset);

    // 執行查詢
    const result = await pool.query(query, queryParams);

    // 獲取總數
    let countQuery = `
      SELECT COUNT(*) as total
      FROM payroll p
      LEFT JOIN staff s ON p.staff_id = s.staff_id
      WHERE 1=1
    `;
    
    const countParams = [];
    let countParamCount = 0;

    if (month) {
      countParamCount++;
      countQuery += ` AND p.month = $${countParamCount}`;
      countParams.push(month);
    }

    if (staff_id) {
      countParamCount++;
      countQuery += ` AND p.staff_id = $${countParamCount}`;
      countParams.push(staff_id);
    }

    if (department) {
      countParamCount++;
      countQuery += ` AND s.department ILIKE $${countParamCount}`;
      countParams.push(`%${department}%`);
    }

    if (status) {
      countParamCount++;
      countQuery += ` AND p.status = $${countParamCount}`;
      countParams.push(status);
    }

    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].total);

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        current_page: parseInt(page),
        total_pages: Math.ceil(total / limit),
        total_records: total,
        records_per_page: parseInt(limit)
      },
      filters: {
        month,
        staff_id,
        department,
        status
      }
    });

  } catch (error) {
    console.error('獲取薪資記錄錯誤:', error);
    res.status(500).json({
      success: false,
      message: '獲取薪資記錄失敗',
      error: error.message
    });
  }
});

// ===== 2. 薪資統計 =====
router.get('/statistics', async (req, res) => {
  try {
    const { month = new Date().toISOString().slice(0, 7) } = req.query;

    if (!validateDateFormat(month)) {
      return res.status(400).json({
        success: false,
        message: '月份格式錯誤，請使用 YYYY-MM 格式'
      });
    }

    // 基本統計
    const basicStatsQuery = `
      SELECT 
        COUNT(*) as total_employees,
        COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid_employees,
        COUNT(CASE WHEN status = 'processing' THEN 1 END) as processing_employees,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_employees,
        COALESCE(SUM(total_salary), 0) as total_payout,
        COALESCE(SUM(net_salary), 0) as total_net_payout,
        COALESCE(AVG(total_salary), 0) as average_salary,
        COALESCE(AVG(net_salary), 0) as average_net_salary,
        COALESCE(MAX(total_salary), 0) as highest_salary,
        COALESCE(MIN(total_salary), 0) as lowest_salary
      FROM payroll 
      WHERE month = $1
    `;

    // 部門統計
    const departmentStatsQuery = `
      SELECT 
        s.department,
        COUNT(*) as employee_count,
        COALESCE(SUM(p.total_salary), 0) as department_total,
        COALESCE(AVG(p.total_salary), 0) as department_average
      FROM payroll p
      LEFT JOIN staff s ON p.staff_id = s.staff_id
      WHERE p.month = $1
      GROUP BY s.department
      ORDER BY department_total DESC
    `;

    // 薪資組成統計
    const salaryComponentsQuery = `
      SELECT 
        COALESCE(SUM(basic_salary), 0) as total_basic_salary,
        COALESCE(SUM(allowances), 0) as total_allowances,
        COALESCE(SUM(overtime_pay), 0) as total_overtime_pay,
        COALESCE(SUM(bonus), 0) as total_bonus,
        COALESCE(SUM(deductions), 0) as total_deductions,
        COALESCE(SUM(tax_deduction), 0) as total_tax_deduction,
        COALESCE(SUM(insurance_deduction), 0) as total_insurance_deduction
      FROM payroll 
      WHERE month = $1
    `;

    // 歷史趨勢 (最近6個月)
    const trendQuery = `
      WITH monthly_stats AS (
        SELECT 
          month,
          COUNT(*) as employee_count,
          COALESCE(SUM(total_salary), 0) as total_payout,
          COALESCE(AVG(total_salary), 0) as average_salary
        FROM payroll 
        WHERE month >= (DATE($1 || '-01') - INTERVAL '5 months')::text::date
        GROUP BY month
        ORDER BY month DESC
      )
      SELECT * FROM monthly_stats
    `;

    // 執行所有查詢
    const [basicStats, departmentStats, componentsStats, trendStats] = await Promise.all([
      pool.query(basicStatsQuery, [month]),
      pool.query(departmentStatsQuery, [month]),
      pool.query(salaryComponentsQuery, [month]),
      pool.query(trendQuery, [month])
    ]);

    // 格式化數據
    const basic = basicStats.rows[0];
    const departments = departmentStats.rows;
    const components = componentsStats.rows[0];
    const trends = trendStats.rows;

    res.json({
      success: true,
      month: month,
      statistics: {
        overview: {
          total_employees: parseInt(basic.total_employees),
          paid_employees: parseInt(basic.paid_employees),
          processing_employees: parseInt(basic.processing_employees),
          pending_employees: parseInt(basic.pending_employees),
          total_payout: parseFloat(basic.total_payout),
          total_net_payout: parseFloat(basic.total_net_payout),
          average_salary: parseFloat(basic.average_salary),
          average_net_salary: parseFloat(basic.average_net_salary),
          highest_salary: parseFloat(basic.highest_salary),
          lowest_salary: parseFloat(basic.lowest_salary)
        },
        by_department: departments.map(dept => ({
          department: dept.department,
          employee_count: parseInt(dept.employee_count),
          total_amount: parseFloat(dept.department_total),
          average_salary: parseFloat(dept.department_average)
        })),
        salary_components: {
          basic_salary: parseFloat(components.total_basic_salary),
          allowances: parseFloat(components.total_allowances),
          overtime_pay: parseFloat(components.total_overtime_pay),
          bonus: parseFloat(components.total_bonus),
          deductions: parseFloat(components.total_deductions),
          tax_deduction: parseFloat(components.total_tax_deduction),
          insurance_deduction: parseFloat(components.total_insurance_deduction)
        },
        monthly_trends: trends.map(trend => ({
          month: trend.month,
          employee_count: parseInt(trend.employee_count),
          total_payout: parseFloat(trend.total_payout),
          average_salary: parseFloat(trend.average_salary)
        }))
      }
    });

  } catch (error) {
    console.error('獲取薪資統計錯誤:', error);
    res.status(500).json({
      success: false,
      message: '獲取薪資統計失敗',
      error: error.message
    });
  }
});

// ===== 3. 生成月薪資 =====
router.post('/generate', async (req, res) => {
  try {
    const { month, department, staff_ids } = req.body;

    if (!month || !validateDateFormat(month)) {
      return res.status(400).json({
        success: false,
        message: '請提供有效的月份 (YYYY-MM 格式)'
      });
    }

    // 檢查該月份是否已生成薪資
    const existingCheck = await pool.query(
      'SELECT COUNT(*) as count FROM payroll WHERE month = $1',
      [month]
    );

    if (parseInt(existingCheck.rows[0].count) > 0) {
      return res.status(400).json({
        success: false,
        message: `${month} 月份薪資已存在，請使用更新功能`
      });
    }

    // 構建員工查詢條件
    let staffQuery = `
      SELECT 
        staff_id,
        name,
        department,
        position,
        basic_salary,
        status
      FROM staff 
      WHERE status = 'active'
    `;

    const queryParams = [];
    let paramCount = 0;

    if (department) {
      paramCount++;
      staffQuery += ` AND department = $${paramCount}`;
      queryParams.push(department);
    }

    if (staff_ids && Array.isArray(staff_ids) && staff_ids.length > 0) {
      paramCount++;
      staffQuery += ` AND staff_id = ANY($${paramCount})`;
      queryParams.push(staff_ids);
    }

    // 獲取符合條件的員工
    const staffResult = await pool.query(staffQuery, queryParams);
    const employees = staffResult.rows;

    if (employees.length === 0) {
      return res.status(400).json({
        success: false,
        message: '沒有找到符合條件的活躍員工'
      });
    }

    // 開始事務
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      const insertedPayrolls = [];

      for (const employee of employees) {
        // 計算薪資組成 (這裡可以根據實際業務邏輯調整)
        const basicSalary = parseFloat(employee.basic_salary) || 0;
        const allowances = basicSalary * 0.1; // 10% 津貼
        const overtimePay = 0; // 加班費需要另外計算
        const bonus = 0; // 獎金需要另外設定
        const taxDeduction = basicSalary * 0.05; // 5% 稅金
        const insuranceDeduction = basicSalary * 0.03; // 3% 保險
        const otherDeductions = 0;

        const totalSalary = basicSalary + allowances + overtimePay + bonus;
        const totalDeductions = taxDeduction + insuranceDeduction + otherDeductions;
        const netSalary = totalSalary - totalDeductions;

        const payrollId = `P${month.replace('-', '')}${employee.staff_id.toString().padStart(4, '0')}`;

        // 插入薪資記錄
        const insertQuery = `
          INSERT INTO payroll (
            payroll_id, staff_id, month, basic_salary, allowances, 
            overtime_pay, bonus, deductions, tax_deduction, 
            insurance_deduction, total_salary, net_salary, status, notes
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
          RETURNING *
        `;

        const insertResult = await client.query(insertQuery, [
          payrollId,
          employee.staff_id,
          month,
          basicSalary,
          allowances,
          overtimePay,
          bonus,
          otherDeductions,
          taxDeduction,
          insuranceDeduction,
          totalSalary,
          netSalary,
          'pending',
          `自動生成 - ${month}`
        ]);

        insertedPayrolls.push({
          ...insertResult.rows[0],
          staff_name: employee.name,
          department: employee.department
        });
      }

      await client.query('COMMIT');

      res.json({
        success: true,
        message: `成功生成 ${month} 月份薪資`,
        data: {
          month: month,
          generated_count: insertedPayrolls.length,
          total_payout: insertedPayrolls.reduce((sum, p) => sum + parseFloat(p.total_salary), 0),
          total_net_payout: insertedPayrolls.reduce((sum, p) => sum + parseFloat(p.net_salary), 0),
          payrolls: insertedPayrolls
        }
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('生成薪資錯誤:', error);
    res.status(500).json({
      success: false,
      message: '生成薪資失敗',
      error: error.message
    });
  }
});

// ===== 4. 獲取單筆薪資記錄 =====
router.get('/:payroll_id', async (req, res) => {
  try {
    const { payroll_id } = req.params;

    const query = `
      SELECT 
        p.*,
        s.name as staff_name,
        s.department,
        s.position,
        s.email,
        s.phone
      FROM payroll p
      LEFT JOIN staff s ON p.staff_id = s.staff_id
      WHERE p.payroll_id = $1
    `;

    const result = await pool.query(query, [payroll_id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '找不到該薪資記錄'
      });
    }

    res.json({
      success: true,
      data: result.rows[0]
    });

  } catch (error) {
    console.error('獲取薪資記錄錯誤:', error);
    res.status(500).json({
      success: false,
      message: '獲取薪資記錄失敗',
      error: error.message
    });
  }
});

// ===== 5. 更新薪資記錄 =====
router.put('/:payroll_id', async (req, res) => {
  try {
    const { payroll_id } = req.params;
    const {
      basic_salary,
      allowances,
      overtime_pay,
      bonus,
      deductions,
      tax_deduction,
      insurance_deduction,
      status,
      payment_date,
      notes
    } = req.body;

    // 驗證薪資記錄是否存在
    const checkQuery = 'SELECT * FROM payroll WHERE payroll_id = $1';
    const checkResult = await pool.query(checkQuery, [payroll_id]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '找不到該薪資記錄'
      });
    }

    // 重新計算總薪資和淨薪資
    const totalSalary = (parseFloat(basic_salary) || 0) + 
                       (parseFloat(allowances) || 0) + 
                       (parseFloat(overtime_pay) || 0) + 
                       (parseFloat(bonus) || 0);

    const totalDeductions = (parseFloat(deductions) || 0) + 
                           (parseFloat(tax_deduction) || 0) + 
                           (parseFloat(insurance_deduction) || 0);

    const netSalary = totalSalary - totalDeductions;

    // 更新記錄
    const updateQuery = `
      UPDATE payroll SET
        basic_salary = COALESCE($2, basic_salary),
        allowances = COALESCE($3, allowances),
        overtime_pay = COALESCE($4, overtime_pay),
        bonus = COALESCE($5, bonus),
        deductions = COALESCE($6, deductions),
        tax_deduction = COALESCE($7, tax_deduction),
        insurance_deduction = COALESCE($8, insurance_deduction),
        total_salary = $9,
        net_salary = $10,
        status = COALESCE($11, status),
        payment_date = COALESCE($12, payment_date),
        notes = COALESCE($13, notes),
        updated_at = CURRENT_TIMESTAMP
      WHERE payroll_id = $1
      RETURNING *
    `;

    const updateResult = await pool.query(updateQuery, [
      payroll_id,
      basic_salary,
      allowances,
      overtime_pay,
      bonus,
      deductions,
      tax_deduction,
      insurance_deduction,
      totalSalary,
      netSalary,
      status,
      payment_date,
      notes
    ]);

    res.json({
      success: true,
      message: '薪資記錄更新成功',
      data: updateResult.rows[0]
    });

  } catch (error) {
    console.error('更新薪資記錄錯誤:', error);
    res.status(500).json({
      success: false,
      message: '更新薪資記錄失敗',
      error: error.message
    });
  }
});

// ===== 6. 批量更新狀態 =====
router.put('/bulk/status', async (req, res) => {
  try {
    const { payroll_ids, status, payment_date } = req.body;

    if (!payroll_ids || !Array.isArray(payroll_ids) || payroll_ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: '請提供要更新的薪資記錄ID列表'
      });
    }

    if (!['pending', 'processing', 'paid', 'cancelled'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: '無效的狀態值'
      });
    }

    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');

      const updateQuery = `
        UPDATE payroll SET
          status = $1,
          payment_date = CASE WHEN $1 = 'paid' THEN COALESCE($2, CURRENT_DATE) ELSE payment_date END,
          updated_at = CURRENT_TIMESTAMP
        WHERE payroll_id = ANY($3)
        RETURNING payroll_id, staff_id, status, payment_date
      `;

      const result = await client.query(updateQuery, [status, payment_date, payroll_ids]);

      await client.query('COMMIT');

      res.json({
        success: true,
        message: `成功更新 ${result.rows.length} 筆薪資記錄狀態`,
        data: {
          updated_count: result.rows.length,
          updated_records: result.rows
        }
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('批量更新狀態錯誤:', error);
    res.status(500).json({
      success: false,
      message: '批量更新狀態失敗',
      error: error.message
    });
  }
});

// ===== 7. 獲取員工薪資歷史 =====
router.get('/staff/:staff_id/history', async (req, res) => {
  try {
    const { staff_id } = req.params;
    const { limit = 12, page = 1 } = req.query;

    // 驗證員工是否存在
    const staffCheck = await pool.query('SELECT name FROM staff WHERE staff_id = $1', [staff_id]);
    
    if (staffCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '找不到該員工'
      });
    }

    const offset = (page - 1) * limit;

    const query = `
      SELECT *
      FROM payroll
      WHERE staff_id = $1
      ORDER BY month DESC
      LIMIT $2 OFFSET $3
    `;

    const countQuery = 'SELECT COUNT(*) as total FROM payroll WHERE staff_id = $1';

    const [result, countResult] = await Promise.all([
      pool.query(query, [staff_id, limit, offset]),
      pool.query(countQuery, [staff_id])
    ]);

    const total = parseInt(countResult.rows[0].total);

    res.json({
      success: true,
      data: {
        staff_name: staffCheck.rows[0].name,
        staff_id: parseInt(staff_id),
        payroll_history: result.rows,
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(total / limit),
          total_records: total,
          records_per_page: parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error('獲取員工薪資歷史錯誤:', error);
    res.status(500).json({
      success: false,
      message: '獲取員工薪資歷史失敗',
      error: error.message
    });
  }
});

// ===== 8. 刪除薪資記錄 =====
router.delete('/:payroll_id', async (req, res) => {
  try {
    const { payroll_id } = req.params;

    // 檢查記錄是否存在
    const checkQuery = 'SELECT status FROM payroll WHERE payroll_id = $1';
    const checkResult = await pool.query(checkQuery, [payroll_id]);

    if (checkResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '找不到該薪資記錄'
      });
    }

    // 檢查是否可以刪除 (已支付的記錄不能刪除)
    if (checkResult.rows[0].status === 'paid') {
      return res.status(400).json({
        success: false,
        message: '已支付的薪資記錄不能刪除'
      });
    }

    // 刪除記錄
    const deleteQuery = 'DELETE FROM payroll WHERE payroll_id = $1 RETURNING *';
    const result = await pool.query(deleteQuery, [payroll_id]);

    res.json({
      success: true,
      message: '薪資記錄刪除成功',
      data: result.rows[0]
    });

  } catch (error) {
    console.error('刪除薪資記錄錯誤:', error);
    res.status(500).json({
      success: false,
      message: '刪除薪資記錄失敗',
      error: error.message
    });
  }
});

module.exports = router;