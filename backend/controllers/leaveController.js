// controllers/leaveController.js - 簡化的請假管理控制器
const { get } = require('../app');
const { query } = require('../config/database');

console.log('載入簡化請假管理控制器...');

// ===== 工具函數 =====

// 計算請假天數
const calculateTotalDays = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const timeDiff = end.getTime() - start.getTime();
  return Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;
};

// 格式化請假申請數據
const formatLeaveRequest = (row) => {
  // 資料庫格式 -> 前端格式的映射
  const dbToFrontendMapping = {
    'Sick Leave': 'sick_leave',
    'Annual Leave': 'annual_leave',
    'Casual Leave': 'casual_leave',
    'Maternity Leave': 'maternity_leave',
    'Paternity Leave': 'paternity_leave'
  };
  
  return {
    request_id: row.request_id,
    staff_id: row.staff_id,
    staff_name: row.staff_name,
    department_name: row.department_name,
    leave_type: dbToFrontendMapping[row.leave_type] || row.leave_type, // 轉換格式
    start_date: row.start_date,
    end_date: row.end_date,
    total_days: row.total_days,
    reason: row.reason,
    status: row.status,
    applied_on: row.applied_on,
    approved_by: row.approved_by,
    approved_by_name: row.approved_by_name,
    approved_on: row.approved_on,
    rejection_reason: row.rejection_reason,
    medical_certificate: row.medical_certificate
  };
};

// 檢查請假衝突
const checkLeaveConflict = async (staffId, startDate, endDate, excludeRequestId = null) => {
  let conflictQuery = `
    SELECT request_id, start_date, end_date, leave_type, status
    FROM leave_requests 
    WHERE staff_id = $1 
      AND status IN ('Pending', 'Approved')
      AND (
        (start_date <= $2 AND end_date >= $2) OR
        (start_date <= $3 AND end_date >= $3) OR
        (start_date >= $2 AND end_date <= $3)
      )
  `;
  
  const params = [staffId, startDate, endDate];
  
  if (excludeRequestId) {
    conflictQuery += ` AND request_id != $4`;
    params.push(excludeRequestId);
  }
  
  const result = await query(conflictQuery, params);
  return {
    hasConflict: result.rows.length > 0,
    conflicts: result.rows
  };
};

// ===== 主要功能 =====

/**
 * HR查看所有請假申請
 */
const getAllLeaveRequests = async (req, res) => {
  try {
    const { status, leave_type, start_date, end_date, limit = 50, offset = 0 } = req.query;
    
    let whereConditions = [];
    let queryParams = [];
    let paramCount = 0;
    
    // 構建篩選條件
    if (status) {
      paramCount++;
      whereConditions.push(`lr.status = $${paramCount}`);
      queryParams.push(status);
    }
    
    if (leave_type) {
      paramCount++;
      whereConditions.push(`lr.leave_type = $${paramCount}`);
      queryParams.push(leave_type);
    }
    
    if (start_date) {
      paramCount++;
      whereConditions.push(`lr.start_date >= $${paramCount}`);
      queryParams.push(start_date);
    }
    
    if (end_date) {
      paramCount++;
      whereConditions.push(`lr.end_date <= $${paramCount}`);
      queryParams.push(end_date);
    }
    
    const whereClause = whereConditions.length > 0 ? 
      'WHERE ' + whereConditions.join(' AND ') : '';
    
    const mainQuery = `
      SELECT 
        lr.request_id,
        lr.staff_id,
        s.name as staff_name,
        d.department_name,
        lr.leave_type,
        lr.start_date,
        lr.end_date,
        lr.total_days,
        lr.reason,
        lr.status,
        lr.applied_on,
        lr.approved_by,
        approver.name as approved_by_name,
        lr.approved_on,
        lr.rejection_reason,
        lr.medical_certificate,
        -- 計算優先級
        CASE 
          WHEN lr.start_date <= CURRENT_DATE + INTERVAL '1 day' AND lr.status = 'Pending' THEN 'urgent'
          WHEN lr.start_date <= CURRENT_DATE + INTERVAL '3 days' AND lr.status = 'Pending' THEN 'high'
          WHEN lr.status = 'Pending' THEN 'medium'
          ELSE 'normal'
        END as priority
      FROM leave_requests lr
      LEFT JOIN staff s ON lr.staff_id = s.staff_id
      LEFT JOIN staff approver ON lr.approved_by = approver.staff_id
      LEFT JOIN position p ON s.position_id = p.position_id
      LEFT JOIN department d ON p.department_id = d.department_id
      ${whereClause}
      ORDER BY 
        CASE lr.status 
          WHEN 'Pending' THEN 1 
          WHEN 'Approved' THEN 2 
          WHEN 'Rejected' THEN 3 
          ELSE 4 
        END,
        lr.applied_on DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;
    
    queryParams.push(parseInt(limit), parseInt(offset));
    
    const result = await query(mainQuery, queryParams);
    
    // 獲取總數
    const countQuery = `
      SELECT COUNT(*) as total
      FROM leave_requests lr
      LEFT JOIN staff s ON lr.staff_id = s.staff_id
      LEFT JOIN position p ON s.position_id = p.position_id
      LEFT JOIN department d ON p.department_id = d.department_id
      ${whereClause}
    `;
    
    const countResult = await query(countQuery, queryParams.slice(0, -2));
    const total = parseInt(countResult.rows[0].total);
    
    const formattedData = result.rows.map(formatLeaveRequest);
    
    // 統計信息
    const stats = {
      total: formattedData.length,
      pending: formattedData.filter(r => r.status === 'Pending').length,
      approved: formattedData.filter(r => r.status === 'Approved').length,
      rejected: formattedData.filter(r => r.status === 'Rejected').length
    };
    
    console.log(`HR查看了${formattedData.length}個請假申請`);
    
    res.json({
      success: true,
      message: `成功獲取${formattedData.length}個請假申請`,
      data: formattedData,
      statistics: stats,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        has_more: parseInt(offset) + parseInt(limit) < total
      }
    });
    
  } catch (error) {
    console.error('獲取請假申請失敗:', error);
    res.status(500).json({
      success: false,
      message: '獲取請假申請失敗',
      error: process.env.NODE_ENV === 'development' ? error.message : '內部服務器錯誤'
    });
  }
};

/**
 * 員工查看自己的請假記錄
 */
const getMyLeaveRequests = async (req, res) => {
  try {
    const { staff_id } = req.params;
    const { status, limit = 20, offset = 0 } = req.query;
    
    let whereConditions = ['lr.staff_id = $1'];
    let queryParams = [parseInt(staff_id)];
    let paramCount = 1;
    
    if (status) {
      paramCount++;
      whereConditions.push(`lr.status = $${paramCount}`);
      queryParams.push(status);
    }
    
    const whereClause = 'WHERE ' + whereConditions.join(' AND ');
    
    const result = await query(`
      SELECT 
        lr.request_id,
        lr.staff_id,
        s.name as staff_name,
        lr.leave_type,
        lr.start_date,
        lr.end_date,
        lr.total_days,
        lr.reason,
        lr.status,
        lr.applied_on,
        lr.approved_by,
        approver.name as approved_by_name,
        lr.approved_on,
        lr.rejection_reason,
        lr.medical_certificate
      FROM leave_requests lr
      LEFT JOIN staff s ON lr.staff_id = s.staff_id
      LEFT JOIN staff approver ON lr.approved_by = approver.staff_id
      ${whereClause}
      ORDER BY lr.applied_on DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `, [...queryParams, parseInt(limit), parseInt(offset)]);
    
    if (result.rows.length === 0) {
      return res.json({
        success: true,
        message: '暫無請假記錄',
        data: [],
        count: 0
      });
    }
    
    const formattedData = result.rows.map(formatLeaveRequest);
    
    console.log(`員工 ${staff_id} 查看了自己的請假記錄`);
    
    res.json({
      success: true,
      message: `成功獲取${formattedData.length}條請假記錄`,
      data: formattedData,
      count: formattedData.length
    });
    
  } catch (error) {
    console.error('獲取員工請假記錄失敗:', error);
    res.status(500).json({
      success: false,
      message: '獲取請假記錄失敗',
      error: process.env.NODE_ENV === 'development' ? error.message : '內部服務器錯誤'
    });
  }
};

/**
 * 員工提交請假申請
 */
const submitLeaveRequest = async (req, res) => {
  try {
    const { staff_id, leave_type, start_date, end_date, reason, medical_certificate } = req.body;
    
    // 基本驗證
    if (!staff_id || !leave_type || !start_date || !end_date || !reason?.trim()) {
      return res.status(400).json({
        success: false,
        message: '請填寫所有必填字段'
      });
    }
    
    // 驗證員工存在
    const staffCheck = await query('SELECT staff_id, name FROM staff WHERE staff_id = $1', [parseInt(staff_id)]);
    if (staffCheck.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: '員工不存在'
      });
    }
    
    // 驗證日期
    const startDate = new Date(start_date);
    const endDate = new Date(end_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (startDate < today) {
      return res.status(400).json({
        success: false,
        message: '開始日期不能是過去的日期'
      });
    }
    
    if (startDate > endDate) {
      return res.status(400).json({
        success: false,
        message: '開始日期不能晚於結束日期'
      });
    }
    
    // 檢查衝突
    const conflictCheck = await checkLeaveConflict(staff_id, start_date, end_date);
    if (conflictCheck.hasConflict) {
      return res.status(400).json({
        success: false,
        message: '申請時間與現有請假記錄衝突',
        conflicts: conflictCheck.conflicts
      });
    }
    
    // 計算天數
    const totalDays = calculateTotalDays(start_date, end_date);
    
    // 創建申請
    const result = await query(`
      INSERT INTO leave_requests (
        staff_id, leave_type, start_date, end_date, total_days,
        reason, medical_certificate, status, applied_on
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'Pending', CURRENT_TIMESTAMP)
      RETURNING request_id, staff_id, leave_type, start_date, end_date, 
                total_days, reason, status, applied_on
    `, [
      parseInt(staff_id), leave_type, start_date, end_date, 
      totalDays, reason.trim(), medical_certificate || false
    ]);
    
    const newRequest = result.rows[0];
    newRequest.staff_name = staffCheck.rows[0].name;
    
    console.log(`員工 ${staff_id} 提交了新的請假申請`);
    
    res.status(201).json({
      success: true,
      message: '請假申請提交成功',
      data: formatLeaveRequest(newRequest)
    });
    
  } catch (error) {
    console.error('提交請假申請失敗:', error);
    res.status(500).json({
      success: false,
      message: '提交請假申請失敗',
      error: process.env.NODE_ENV === 'development' ? error.message : '內部服務器錯誤'
    });
  }
};

/**
 * HR批准請假申請
 */
const approveLeaveRequest = async (req, res) => {
  try {
    const { request_id } = req.params;
    const { approved_by, comments } = req.body;
    
    if (!approved_by) {
      return res.status(400).json({
        success: false,
        message: '需要提供批准人ID'
      });
    }
    
    // 檢查申請是否存在且為待審批狀態
    const requestCheck = await query(`
      SELECT lr.*, s.name as staff_name 
      FROM leave_requests lr
      LEFT JOIN staff s ON lr.staff_id = s.staff_id
      WHERE lr.request_id = $1
    `, [parseInt(request_id)]);
    
    if (requestCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '請假申請不存在'
      });
    }
    
    const leaveRequest = requestCheck.rows[0];
    
    if (leaveRequest.status !== 'Pending') {
      return res.status(400).json({
        success: false,
        message: `只能批准待審批的申請，當前狀態：${leaveRequest.status}`
      });
    }
    
    // 檢查批准人是否存在
    const approverCheck = await query('SELECT name FROM staff WHERE staff_id = $1', [parseInt(approved_by)]);
    if (approverCheck.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: '批准人不存在'
      });
    }
    
    // 更新申請狀態
    const result = await query(`
      UPDATE leave_requests 
      SET status = 'Approved', 
          approved_by = $1, 
          approved_on = CURRENT_TIMESTAMP,
          rejection_reason = $2,
          updated_at = CURRENT_TIMESTAMP
      WHERE request_id = $3
      RETURNING *
    `, [parseInt(approved_by), comments, parseInt(request_id)]);
    
    const updatedRequest = result.rows[0];
    updatedRequest.staff_name = leaveRequest.staff_name;
    updatedRequest.approved_by_name = approverCheck.rows[0].name;
    
    console.log(`HR批准了請假申請 ${request_id}`);
    
    res.json({
      success: true,
      message: '請假申請已批准',
      data: formatLeaveRequest(updatedRequest)
    });
    
  } catch (error) {
    console.error('批准請假申請失敗:', error);
    res.status(500).json({
      success: false,
      message: '批准請假申請失敗',
      error: process.env.NODE_ENV === 'development' ? error.message : '內部服務器錯誤'
    });
  }
};

/**
 * HR拒絕請假申請
 */
const rejectLeaveRequest = async (req, res) => {
  try {
    const { request_id } = req.params;
    const { rejected_by, reason } = req.body;
    
    if (!rejected_by || !reason?.trim()) {
      return res.status(400).json({
        success: false,
        message: '需要提供拒絕人ID和拒絕原因'
      });
    }
    
    // 檢查申請是否存在且為待審批狀態
    const requestCheck = await query(`
      SELECT lr.*, s.name as staff_name 
      FROM leave_requests lr
      LEFT JOIN staff s ON lr.staff_id = s.staff_id
      WHERE lr.request_id = $1
    `, [parseInt(request_id)]);
    
    if (requestCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '請假申請不存在'
      });
    }
    
    const leaveRequest = requestCheck.rows[0];
    
    if (leaveRequest.status !== 'Pending') {
      return res.status(400).json({
        success: false,
        message: `只能拒絕待審批的申請，當前狀態：${leaveRequest.status}`
      });
    }
    
    // 檢查拒絕人是否存在
    const rejecterCheck = await query('SELECT name FROM staff WHERE staff_id = $1', [parseInt(rejected_by)]);
    if (rejecterCheck.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: '拒絕人不存在'
      });
    }
    
    // 更新申請狀態
    const result = await query(`
      UPDATE leave_requests 
      SET status = 'Rejected', 
          approved_by = $1, 
          approved_on = CURRENT_TIMESTAMP,
          rejection_reason = $2,
          updated_at = CURRENT_TIMESTAMP
      WHERE request_id = $3
      RETURNING *
    `, [parseInt(rejected_by), reason.trim(), parseInt(request_id)]);
    
    const updatedRequest = result.rows[0];
    updatedRequest.staff_name = leaveRequest.staff_name;
    updatedRequest.approved_by_name = rejecterCheck.rows[0].name;
    
    console.log(`HR拒絕了請假申請 ${request_id}`);
    
    res.json({
      success: true,
      message: '請假申請已拒絕',
      data: formatLeaveRequest(updatedRequest)
    });
    
  } catch (error) {
    console.error('拒絕請假申請失敗:', error);
    res.status(500).json({
      success: false,
      message: '拒絕請假申請失敗',
      error: process.env.NODE_ENV === 'development' ? error.message : '內部服務器錯誤'
    });
  }
};

// 正確 - 路由處理函數格式
const getAllLeaveQuotas = async (req, res) => {
  try {
    const result = await query('SELECT * FROM leave');
    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('獲取所有請假配額失敗:', error);
    res.status(500).json({
      success: false,
      message: '獲取配額失敗'
    });
  }
};

const getMyLeaveQuota = async (req, res) => {
  try {
    const { staff_id } = req.params;
    const result = await query(`
      SELECT 
        al_quota, al_used, (al_quota - al_used) as al_remaining,
        sl_quota, sl_used, (sl_quota - sl_used) as sl_remaining,
        cl_quota, cl_used, (cl_quota - cl_used) as cl_remaining,
        ml_quota, ml_used, (ml_quota - ml_used) as ml_remaining,
        pl_quota, pl_used, (pl_quota - pl_used) as pl_remaining
      FROM leave
      WHERE staff_id = $1
    `, [parseInt(staff_id)]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: '找不到該員工的配額記錄'
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0]
    });
    
  } catch (error) {
    console.error('獲取請假配額失敗:', error);
    res.status(500).json({
      success: false,
      message: '獲取配額失敗'
    });
  }
};

const getMyLeaveQuota = async (staffId) => {
  try {
    const result = await query(`
      SELECT 
        al_quota,
        sl_quota,
        maternity_leave_quota,
        paternity_leave_quota
      FROM leave
      WHERE staff_id = $1
    `, [parseInt(staffId)]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return result.rows[0];
    
  } catch (error) {
    console.error('獲取請假配額失敗:', error);
    return null;
  }
};

module.exports = {
  getAllLeaveRequests,
  getMyLeaveRequests,
  submitLeaveRequest,
  approveLeaveRequest,
  rejectLeaveRequest,
  getAllLeaveQuotas,
  getMyLeaveQuota
};

console.log('簡化請假管理控制器載入成功!');