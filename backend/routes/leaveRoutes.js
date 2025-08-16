// routes/holidayRoutes.js
const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { 
  getAllStaffLeaveQuotas,
  getStaffLeaveQuota,
  getAllLeaveRequests,
  getPendingLeaveRequests,
  submitLeaveRequest,
  processLeaveRequest,
  cancelLeaveRequest,
  getLeaveRequestHistory,
  getLeaveStatistics,
  checkLeaveEligibility,
  initializeStaffLeaveQuota,
  updateStaffLeaveQuota,
  getLeaveRequestDetail
} = require('../controllers/leaveController');

console.log('🏖️  Loading Leave Management Routes...');

// ===== LEAVE QUOTA MANAGEMENT =====

// GET /api/holidays/quotas - Get all staff leave quotas
router.get('/quotas', getAllStaffLeaveQuotas);

// GET /api/holidays/quotas/:staff_id - Get specific staff leave quota
router.get('/quotas/:staff_id', getStaffLeaveQuota);

// POST /api/holidays/quotas - Initialize staff leave quota
router.post('/quotas', initializeStaffLeaveQuota);

// PUT /api/holidays/quotas/:staff_id - Update staff leave quota
router.put('/quotas/:staff_id', updateStaffLeaveQuota);

// ===== LEAVE REQUEST MANAGEMENT =====

// GET /api/holidays/requests - Get all leave requests
router.get('/requests', getAllLeaveRequests);

// POST /api/holidays/requests - Submit leave request
router.post('/requests', submitLeaveRequest);

// GET /api/holidays/requests/pending - Get pending leave requests
router.get('/requests/pending', getPendingLeaveRequests);

// GET /api/holidays/requests/:request_id - Get specific leave request details
router.get('/requests/:request_id', getLeaveRequestDetail);

// PUT /api/holidays/requests/:request_id/approve - Approve leave request
router.put('/requests/:request_id/approve', async (req, res) => {
  req.body.action = 'Approved';
  return processLeaveRequest(req, res);
});

// PUT /api/holidays/requests/:request_id/reject - Reject leave request
router.put('/requests/:request_id/reject', async (req, res) => {
  req.body.action = 'Rejected';
  return processLeaveRequest(req, res);
});

// PUT /api/holidays/requests/:request_id/cancel - Cancel leave request
router.put('/requests/:request_id/cancel', cancelLeaveRequest);

// GET /api/holidays/requests/:request_id/history - Get leave request history
router.get('/requests/:request_id/history', getLeaveRequestHistory);

// ===== LEAVE ELIGIBILITY CHECK =====

// GET /api/holidays/eligibility - Check leave eligibility
router.get('/eligibility', checkLeaveEligibility);

// ===== LEAVE STATISTICS AND REPORTS =====

// GET /api/holidays/statistics - Get leave statistics
router.get('/statistics', getLeaveStatistics);

// GET /api/holidays/statistics/overview - Get leave statistics overview
router.get('/statistics/overview', async (req, res) => {
  try {
    const { leave_year = new Date().getFullYear() } = req.query;
    
    console.log('📥 Request: Get leave statistics overview');
    
    // Basic statistics
    const overviewResult = await query(`
      SELECT 
        COUNT(DISTINCT lr.request_id) as total_requests,
        COUNT(DISTINCT CASE WHEN lr.status = 'Pending' THEN lr.request_id END) as pending_requests,
        COUNT(DISTINCT CASE WHEN lr.status = 'Approved' THEN lr.request_id END) as approved_requests,
        COUNT(DISTINCT CASE WHEN lr.status = 'Rejected' THEN lr.request_id END) as rejected_requests,
        COUNT(DISTINCT lr.staff_id) as total_applicants,
        ROUND(AVG(CASE WHEN lr.status = 'Approved' THEN lr.total_days END), 2) as avg_approved_days,
        SUM(CASE WHEN lr.status = 'Approved' THEN lr.total_days ELSE 0 END) as total_approved_days
      FROM leave_requests lr
      WHERE EXTRACT(YEAR FROM lr.start_date) = $1
    `, [leave_year]);
    
    // Monthly statistics
    const monthlyResult = await query(`
      SELECT 
        COUNT(*) as this_month_requests,
        COUNT(CASE WHEN status = 'Approved' THEN 1 END) as this_month_approved,
        SUM(CASE WHEN status = 'Approved' THEN total_days ELSE 0 END) as this_month_approved_days
      FROM leave_requests 
      WHERE EXTRACT(YEAR FROM applied_on) = EXTRACT(YEAR FROM CURRENT_DATE)
      AND EXTRACT(MONTH FROM applied_on) = EXTRACT(MONTH FROM CURRENT_DATE)
    `);
    
    // Urgent pending requests (pending for more than 3 days)
    const urgentResult = await query(`
      SELECT COUNT(*) as urgent_pending
      FROM leave_requests 
      WHERE status = 'Pending' 
      AND (CURRENT_DATE - applied_on::date) > 3
    `);
    
    console.log('✅ Successfully retrieved leave statistics overview');
    
    res.json({
      success: true,
      message: 'Successfully retrieved leave statistics overview',
      data: {
        overview: overviewResult.rows[0],
        monthly: monthlyResult.rows[0],
        urgent: urgentResult.rows[0],
        leave_year: parseInt(leave_year)
      }
    });
  } catch (error) {
    console.error('❌ Error retrieving leave statistics overview:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve leave statistics overview',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// GET /api/holidays/statistics/by-type - Statistics by leave type
router.get('/statistics/by-type', async (req, res) => {
  try {
    const { leave_year = new Date().getFullYear() } = req.query;
    
    console.log('📥 Request: Get statistics by leave type');
    
    const result = await query(`
      SELECT 
        lr.leave_type,
        COUNT(*) as total_requests,
        COUNT(CASE WHEN lr.status = 'Approved' THEN 1 END) as approved_count,
        COUNT(CASE WHEN lr.status = 'Pending' THEN 1 END) as pending_count,
        COUNT(CASE WHEN lr.status = 'Rejected' THEN 1 END) as rejected_count,
        COUNT(CASE WHEN lr.status = 'Cancelled' THEN 1 END) as cancelled_count,
        SUM(CASE WHEN lr.status = 'Approved' THEN lr.total_days ELSE 0 END) as total_approved_days,
        ROUND(AVG(CASE WHEN lr.status = 'Approved' THEN lr.total_days END), 2) as avg_approved_days,
        ROUND(
          COUNT(CASE WHEN lr.status = 'Approved' THEN 1 END) * 100.0 / 
          NULLIF(COUNT(*), 0), 2
        ) as approval_rate
      FROM leave_requests lr
      WHERE EXTRACT(YEAR FROM lr.start_date) = $1
      GROUP BY lr.leave_type
      ORDER BY total_requests DESC
    `, [leave_year]);
    
    console.log('✅ Successfully retrieved statistics by leave type');
    
    res.json({
      success: true,
      message: 'Successfully retrieved statistics by leave type',
      data: result.rows,
      leave_year: parseInt(leave_year)
    });
  } catch (error) {
    console.error('❌ Error retrieving leave type statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve leave type statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// GET /api/holidays/statistics/by-department - Statistics by department
router.get('/statistics/by-department', async (req, res) => {
  try {
    const { leave_year = new Date().getFullYear() } = req.query;
    
    console.log('📥 Request: Get statistics by department');
    
    const result = await query(`
      SELECT 
        d.department_name,
        d.department_id,
        COUNT(DISTINCT lr.request_id) as total_requests,
        COUNT(DISTINCT CASE WHEN lr.status = 'Approved' THEN lr.request_id END) as approved_requests,
        COUNT(DISTINCT CASE WHEN lr.status = 'Pending' THEN lr.request_id END) as pending_requests,
        SUM(CASE WHEN lr.status = 'Approved' THEN lr.total_days ELSE 0 END) as total_approved_days,
        ROUND(AVG(CASE WHEN lr.status = 'Approved' THEN lr.total_days END), 2) as avg_approved_days,
        COUNT(DISTINCT lr.staff_id) as staff_with_requests,
        ROUND(
          COUNT(DISTINCT CASE WHEN lr.status = 'Approved' THEN lr.request_id END) * 100.0 / 
          NULLIF(COUNT(DISTINCT lr.request_id), 0), 2
        ) as approval_rate
      FROM department d
      LEFT JOIN position p ON d.department_id = p.department_id
      LEFT JOIN staff s ON p.position_id = s.position_id
      LEFT JOIN leave_requests lr ON s.staff_id = lr.staff_id 
        AND EXTRACT(YEAR FROM lr.start_date) = $1
      GROUP BY d.department_id, d.department_name
      HAVING COUNT(DISTINCT lr.request_id) > 0
      ORDER BY total_requests DESC
    `, [leave_year]);
    
    console.log('✅ Successfully retrieved statistics by department');
    
    res.json({
      success: true,
      message: 'Successfully retrieved statistics by department',
      data: result.rows,
      leave_year: parseInt(leave_year)
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

// GET /api/holidays/statistics/by-month - Statistics by month
router.get('/statistics/by-month', async (req, res) => {
  try {
    const { leave_year = new Date().getFullYear() } = req.query;
    
    console.log('📥 Request: Get statistics by month');
    
    const result = await query(`
      SELECT 
        EXTRACT(MONTH FROM lr.start_date) as month,
        TO_CHAR(DATE_TRUNC('month', lr.start_date), 'YYYY-MM') as month_year,
        COUNT(*) as total_requests,
        COUNT(CASE WHEN lr.status = 'Approved' THEN 1 END) as approved_count,
        COUNT(CASE WHEN lr.status = 'Pending' THEN 1 END) as pending_count,
        COUNT(CASE WHEN lr.status = 'Rejected' THEN 1 END) as rejected_count,
        SUM(CASE WHEN lr.status = 'Approved' THEN lr.total_days ELSE 0 END) as total_approved_days,
        COUNT(DISTINCT lr.staff_id) as unique_applicants
      FROM leave_requests lr
      WHERE EXTRACT(YEAR FROM lr.start_date) = $1
      GROUP BY EXTRACT(MONTH FROM lr.start_date), DATE_TRUNC('month', lr.start_date)
      ORDER BY month ASC
    `, [leave_year]);
    
    console.log('✅ Successfully retrieved statistics by month');
    
    res.json({
      success: true,
      message: 'Successfully retrieved statistics by month',
      data: result.rows,
      leave_year: parseInt(leave_year)
    });
  } catch (error) {
    console.error('❌ Error retrieving monthly statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve monthly statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// ===== SPECIAL QUERIES AND REPORTS =====

// GET /api/holidays/calendar/:year/:month - Get leave calendar for specific month
router.get('/calendar/:year/:month', async (req, res) => {
  try {
    const { year, month } = req.params;
    console.log(`📥 Request: Get leave calendar for ${year}-${month}`);
    
    // Validate year and month format
    const yearNum = parseInt(year);
    const monthNum = parseInt(month);
    
    if (isNaN(yearNum) || isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
      return res.status(400).json({
        success: false,
        message: 'Invalid year or month'
      });
    }
    
    const result = await query(`
      SELECT 
        lr.request_id,
        lr.staff_id,
        s.name as staff_name,
        d.department_name,
        lr.leave_type,
        lr.start_date,
        lr.end_date,
        lr.total_days,
        lr.status
      FROM leave_requests lr
      LEFT JOIN staff s ON lr.staff_id = s.staff_id
      LEFT JOIN department d ON s.position_id = (SELECT position_id FROM position WHERE staff_id = s.staff_id LIMIT 1)
      WHERE lr.status = 'Approved'
      AND (
        (EXTRACT(YEAR FROM lr.start_date) = $1 AND EXTRACT(MONTH FROM lr.start_date) = $2) OR
        (EXTRACT(YEAR FROM lr.end_date) = $1 AND EXTRACT(MONTH FROM lr.end_date) = $2) OR
        (lr.start_date <= MAKE_DATE($1, $2, 1) AND lr.end_date >= (MAKE_DATE($1, $2, 1) + INTERVAL '1 month - 1 day')::date)
      )
      ORDER BY lr.start_date ASC
    `, [yearNum, monthNum]);
    
    console.log(`✅ Successfully retrieved ${result.rows.length} leave records for ${year}-${month}`);
    
    res.json({
      success: true,
      message: `Successfully retrieved leave calendar for ${year}-${month}`,
      data: result.rows,
      count: result.rows.length,
      calendar_info: {
        year: yearNum,
        month: monthNum,
        total_approved_leaves: result.rows.length
      }
    });
  } catch (error) {
    console.error('❌ Error retrieving leave calendar:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve leave calendar',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// GET /api/holidays/search/by-date-range - Search leave records by date range
router.get('/search/by-date-range', async (req, res) => {
  try {
    const { start_date, end_date, leave_type, status, department_id } = req.query;
    console.log(`📥 Request: Search leave records from ${start_date} to ${end_date}`);
    
    if (!start_date || !end_date) {
      return res.status(400).json({
        success: false,
        message: 'Start date and end date are required parameters'
      });
    }
    
    let queryText = `
      SELECT 
        lr.request_id,
        lr.staff_id,
        s.name as staff_name,
        d.department_name,
        p.title as position_title,
        lr.leave_type,
        lr.start_date,
        lr.end_date,
        lr.total_days,
        lr.reason,
        lr.status,
        lr.applied_on,
        lr.approved_by,
        approver.name as approved_by_name,
        lr.approved_on
      FROM leave_requests lr
      LEFT JOIN staff s ON lr.staff_id = s.staff_id
      LEFT JOIN staff approver ON lr.approved_by = approver.staff_id
      LEFT JOIN department d ON s.position_id = (SELECT position_id FROM position WHERE staff_id = s.staff_id LIMIT 1)
      LEFT JOIN position p ON s.position_id = p.position_id
      WHERE (lr.start_date >= $1 AND lr.start_date <= $2)
         OR (lr.end_date >= $1 AND lr.end_date <= $2)
         OR (lr.start_date <= $1 AND lr.end_date >= $2)
    `;
    
    const queryParams = [start_date, end_date];
    let paramCount = 2;
    
    if (leave_type) {
      paramCount++;
      queryText += ` AND lr.leave_type = $${paramCount}`;
      queryParams.push(leave_type);
    }
    
    if (status) {
      paramCount++;
      queryText += ` AND lr.status = $${paramCount}`;
      queryParams.push(status);
    }
    
    if (department_id) {
      paramCount++;
      queryText += ` AND d.department_id = $${paramCount}`;
      queryParams.push(department_id);
    }
    
    queryText += ` ORDER BY lr.start_date ASC`;
    
    const result = await query(queryText, queryParams);
    
    console.log(`✅ Successfully found ${result.rows.length} leave records`);
    
    res.json({
      success: true,
      message: `Successfully found ${result.rows.length} leave records`,
      data: result.rows,
      count: result.rows.length,
      search_criteria: {
        start_date,
        end_date,
        leave_type: leave_type || 'all',
        status: status || 'all',
        department_id: department_id || 'all'
      }
    });
  } catch (error) {
    console.error('❌ Error searching leave records by date range:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search leave records by date range',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// GET /api/holidays/reports/quota-utilization - Leave quota utilization report
router.get('/reports/quota-utilization', async (req, res) => {
  try {
    const { leave_year = new Date().getFullYear(), department_id } = req.query;
    
    console.log('📥 Request: Leave quota utilization report');
    
    let queryText = `
      SELECT 
        l.staff_id,
        s.name as staff_name,
        d.department_name,
        p.title as position_title,
        l.leave_year,
        -- Sick leave utilization
        l.sl_quota,
        l.sl_used,
        CASE 
          WHEN l.sl_quota > 0 THEN ROUND((l.sl_used * 100.0) / l.sl_quota, 2)
          ELSE 0 
        END as sl_utilization_rate,
        -- Annual leave utilization
        l.al_quota,
        l.al_used,
        CASE 
          WHEN l.al_quota > 0 THEN ROUND((l.al_used * 100.0) / l.al_quota, 2)
          ELSE 0 
        END as al_utilization_rate,
        -- Casual leave utilization
        l.cl_quota,
        l.cl_used,
        CASE 
          WHEN l.cl_quota > 0 THEN ROUND((l.cl_used * 100.0) / l.cl_quota, 2)
          ELSE 0 
        END as cl_utilization_rate,
        -- Total quota and usage
        (l.sl_quota + l.al_quota + l.cl_quota + l.ml_quota + l.pl_quota) as total_quota,
        (l.sl_used + l.al_used + l.cl_used + l.ml_used + l.pl_used) as total_used,
        CASE 
          WHEN (l.sl_quota + l.al_quota + l.cl_quota + l.ml_quota + l.pl_quota) > 0 
          THEN ROUND(((l.sl_used + l.al_used + l.cl_used + l.ml_used + l.pl_used) * 100.0) / 
                     (l.sl_quota + l.al_quota + l.cl_quota + l.ml_quota + l.pl_quota), 2)
          ELSE 0 
        END as total_utilization_rate
      FROM leave l
      LEFT JOIN staff s ON l.staff_id = s.staff_id
      LEFT JOIN department d ON s.position_id = (SELECT position_id FROM position WHERE staff_id = s.staff_id LIMIT 1)
      LEFT JOIN position p ON s.position_id = p.position_id
      WHERE l.leave_year = $1
    `;
    
    const queryParams = [leave_year];
    let paramCount = 1;
    
    if (department_id) {
      paramCount++;
      queryText += ` AND d.department_id = ${paramCount}`;
      queryParams.push(department_id);
    }
    
    queryText += ` ORDER BY total_utilization_rate DESC, s.name ASC`;
    
    const result = await query(queryText, queryParams);
    
    console.log('✅ Successfully retrieved leave quota utilization report');
    
    res.json({
      success: true,
      message: 'Successfully retrieved leave quota utilization report',
      data: result.rows,
      count: result.rows.length,
      leave_year: parseInt(leave_year)
    });
  } catch (error) {
    console.error('❌ Error retrieving leave quota utilization report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve leave quota utilization report',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// GET /api/holidays/reports/approval-trends - Approval trends report
router.get('/reports/approval-trends', async (req, res) => {
  try {
    const { leave_year = new Date().getFullYear(), period = 'month' } = req.query; // month, quarter, week
    
    console.log('📥 Request: Approval trends report');
    
    let dateGrouping, dateName;
    switch (period) {
      case 'week':
        dateGrouping = "DATE_TRUNC('week', lr.applied_on)";
        dateName = "TO_CHAR(DATE_TRUNC('week', lr.applied_on), 'YYYY-\"W\"IW')";
        break;
      case 'quarter':
        dateGrouping = "DATE_TRUNC('quarter', lr.applied_on)";
        dateName = "EXTRACT(YEAR FROM lr.applied_on) || '-Q' || EXTRACT(QUARTER FROM lr.applied_on)";
        break;
      default: // month
        dateGrouping = "DATE_TRUNC('month', lr.applied_on)";
        dateName = "TO_CHAR(DATE_TRUNC('month', lr.applied_on), 'YYYY-MM')";
    }
    
    const result = await query(`
      SELECT 
        ${dateName} as period_name,
        ${dateGrouping} as period_date,
        COUNT(*) as total_applications,
        COUNT(CASE WHEN lr.status = 'Approved' THEN 1 END) as approved_count,
        COUNT(CASE WHEN lr.status = 'Rejected' THEN 1 END) as rejected_count,
        COUNT(CASE WHEN lr.status = 'Pending' THEN 1 END) as pending_count,
        COUNT(CASE WHEN lr.status = 'Cancelled' THEN 1 END) as cancelled_count,
        ROUND(
          COUNT(CASE WHEN lr.status = 'Approved' THEN 1 END) * 100.0 / 
          NULLIF(COUNT(CASE WHEN lr.status IN ('Approved', 'Rejected') THEN 1 END), 0), 2
        ) as approval_rate,
        ROUND(AVG(CASE WHEN lr.status = 'Approved' THEN lr.total_days END), 2) as avg_approved_days,
        SUM(CASE WHEN lr.status = 'Approved' THEN lr.total_days ELSE 0 END) as total_approved_days
      FROM leave_requests lr
      WHERE EXTRACT(YEAR FROM lr.applied_on) = $1
      GROUP BY ${dateGrouping}, ${dateName}
      ORDER BY period_date ASC
    `, [leave_year]);
    
    console.log('✅ Successfully retrieved approval trends report');
    
    res.json({
      success: true,
      message: 'Successfully retrieved approval trends report',
      data: result.rows,
      count: result.rows.length,
      period,
      leave_year: parseInt(leave_year)
    });
  } catch (error) {
    console.error('❌ Error retrieving approval trends report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve approval trends report',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// ===== ADMIN FUNCTIONS =====

// POST /api/holidays/admin/batch-approve - Batch approve leave requests
router.post('/admin/batch-approve', async (req, res) => {
  try {
    const { request_ids, approver_id, action, comments } = req.body; // action: 'Approved' or 'Rejected'
    
    console.log(`📥 Request: Batch ${action === 'Approved' ? 'approve' : 'reject'} leave requests`);
    
    if (!request_ids || !Array.isArray(request_ids) || request_ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Request IDs list is required and cannot be empty'
      });
    }
    
    if (!approver_id) {
      return res.status(400).json({
        success: false,
        message: 'Approver ID is required'
      });
    }
    
    if (!action || !['Approved', 'Rejected'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'Action must be Approved or Rejected'
      });
    }
    
    const results = [];
    const errors = [];
    
    // Process each request individually
    for (const request_id of request_ids) {
      try {
        const result = await query(`
          SELECT * FROM process_leave_request($1, $2, $3, $4)
        `, [request_id, approver_id, action, comments || null]);
        
        const processResult = result.rows[0];
        
        if (processResult.success) {
          results.push({
            request_id,
            success: true,
            message: processResult.message
          });
        } else {
          errors.push({
            request_id,
            success: false,
            message: processResult.message
          });
        }
      } catch (error) {
        errors.push({
          request_id,
          success: false,
          message: error.message
        });
      }
    }
    
    console.log(`✅ Batch processing completed: ${results.length} successful, ${errors.length} failed`);
    
    res.json({
      success: true,
      message: `Batch processing completed: ${results.length} successful, ${errors.length} failed`,
      data: {
        successful: results,
        failed: errors,
        summary: {
          total: request_ids.length,
          successful_count: results.length,
          failed_count: errors.length
        }
      }
    });
  } catch (error) {
    console.error('❌ Error in batch processing leave requests:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to batch process leave requests',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// PUT /api/holidays/admin/update-quota-batch - 批量更新假期配額
router.put('/admin/update-quota-batch', async (req, res) => {
  try {
    const { staff_ids, leave_year = new Date().getFullYear(), quota_updates } = req.body;
    
    console.log('📥 請求：批量更新假期配額');
    
    if (!staff_ids || !Array.isArray(staff_ids) || staff_ids.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Staff IDs list is required and cannot be empty'
      });
    }
    
    if (!quota_updates || typeof quota_updates !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Quota updates data is required'
      });
    }
    
    const results = [];
    const errors = [];
    
    // 構建更新字段
    let updateFields = [];
    let updateValues = [];
    
    if (quota_updates.sl_quota !== undefined) {
      updateFields.push('sl_quota = $' + (updateFields.length + 1));
      updateValues.push(parseInt(quota_updates.sl_quota));
    }
    
    if (quota_updates.al_quota !== undefined) {
      updateFields.push('al_quota = $' + (updateFields.length + 1));
      updateValues.push(parseInt(quota_updates.al_quota));
    }
    
    if (quota_updates.cl_quota !== undefined) {
      updateFields.push('cl_quota = $' + (updateFields.length + 1));
      updateValues.push(parseInt(quota_updates.cl_quota));
    }
    
    if (quota_updates.ml_quota !== undefined) {
      updateFields.push('ml_quota = $' + (updateFields.length + 1));
      updateValues.push(parseInt(quota_updates.ml_quota));
    }
    
    if (quota_updates.pl_quota !== undefined) {
      updateFields.push('pl_quota = $' + (updateFields.length + 1));
      updateValues.push(parseInt(quota_updates.pl_quota));
    }
    
    // 🚨 這裡是修正的重點
    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No quota fields provided for update'
      });
    }
    
    // 添加更新時間
    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    updateFields.push('last_quota_update = CURRENT_DATE');
    
    // 逐個處理每個員工
    for (const staff_id of staff_ids) {
      try {
        const currentValues = [...updateValues, staff_id, leave_year];
        const paramCount = updateValues.length;
        
        const updateQuery = `
          UPDATE leave 
          SET ${updateFields.join(', ')}
          WHERE staff_id = $${paramCount + 1} AND leave_year = $${paramCount + 2}
          RETURNING staff_id, leave_year
        `;
        
        const result = await query(updateQuery, currentValues);
        
        if (result.rows.length > 0) {
          results.push({
            staff_id,
            success: true,
            message: 'Quota updated successfully'
          });
        } else {
          errors.push({
            staff_id,
            success: false,
            message: `Leave record not found for staff ${staff_id} in year ${leave_year}`
          });
        }
      } catch (error) {
        errors.push({
          staff_id,
          success: false,
          message: error.message
        });
      }
    }
    
    console.log(`✅ Batch quota update completed: ${results.length} successful, ${errors.length} failed`);
    
    res.json({
      success: true,
      message: `Batch quota update completed: ${results.length} successful, ${errors.length} failed`,
      data: {
        successful: results,
        failed: errors,
        summary: {
          total: staff_ids.length,
          successful_count: results.length,
          failed_count: errors.length
        }
      }
    });
  } catch (error) {
    console.error('❌ Error in batch updating leave quotas:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to batch update leave quotas',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

module.exports = router;