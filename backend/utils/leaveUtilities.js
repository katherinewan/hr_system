// utils/leaveUtilities.js - 簡化的請假管理工具
const { query } = require('../config/database');

console.log('載入簡化請假管理工具...');

// ===== 常量定義 =====
const LEAVE_TYPES = {
  'sick_leave': '病假',
  'annual_leave': '年假',
  'casual_leave': '事假',
  'maternity_leave': '產假',
  'paternity_leave': '陪產假'
};

const LEAVE_STATUS = {
  'Pending': '待審批',
  'Approved': '已批准',
  'Rejected': '已拒絕',
  'Cancelled': '已取消'
};

// ===== 日期和時間函數 =====

/**
 * 計算請假總天數
 */
const calculateTotalDays = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  if (start > end) return 0;
  
  const timeDiff = end.getTime() - start.getTime();
  return Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;
};

/**
 * 驗證日期範圍
 */
const validateDateRange = (startDate, endDate) => {
  const errors = [];
  
  if (!startDate) errors.push('開始日期是必填的');
  if (!endDate) errors.push('結束日期是必填的');
  
  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (isNaN(start.getTime())) errors.push('開始日期格式無效');
    if (isNaN(end.getTime())) errors.push('結束日期格式無效');
    
    if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
      if (start > end) {
        errors.push('開始日期不能晚於結束日期');
      }
      
      if (start < today) {
        errors.push('開始日期不能是過去的日期');
      }
      
      // 檢查是否超過一年
      const oneYearLater = new Date();
      oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
      if (end > oneYearLater) {
        errors.push('結束日期不能超過一年後');
      }
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// ===== 數據驗證函數 =====

/**
 * 驗證請假申請數據
 */
const validateLeaveRequest = (requestData) => {
  const errors = [];
  
  // 必填字段檢查
  if (!requestData.staff_id) errors.push('員工ID是必填的');
  if (!requestData.leave_type) errors.push('請假類型是必填的');
  if (!requestData.reason || !requestData.reason.trim()) errors.push('請假原因是必填的');
  
  // 員工ID格式檢查
  if (requestData.staff_id && !Number.isInteger(Number(requestData.staff_id))) {
    errors.push('員工ID必須是有效數字');
  }
  
  // 請假類型檢查
  if (requestData.leave_type && !Object.keys(LEAVE_TYPES).includes(requestData.leave_type)) {
    errors.push(`無效的請假類型。有效類型：${Object.keys(LEAVE_TYPES).join(', ')}`);
  }
  
  // 原因長度檢查
  if (requestData.reason && requestData.reason.trim().length < 10) {
    errors.push('請假原因至少需要10個字符');
  }
  
  // 日期檢查
  if (requestData.start_date && requestData.end_date) {
    const dateValidation = validateDateRange(requestData.start_date, requestData.end_date);
    if (!dateValidation.isValid) {
      errors.push(...dateValidation.errors);
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// ===== 數據格式化函數 =====

/**
 * 格式化請假申請數據
 */
const formatLeaveRequest = (requestData) => {
  if (!requestData) return null;
  
  return {
    request_id: requestData.request_id,
    staff_id: requestData.staff_id,
    staff_name: requestData.staff_name,
    department_name: requestData.department_name,
    leave_type: requestData.leave_type,
    leave_type_display: LEAVE_TYPES[requestData.leave_type] || requestData.leave_type,
    start_date: requestData.start_date ? formatDate(requestData.start_date) : null,
    end_date: requestData.end_date ? formatDate(requestData.end_date) : null,
    total_days: requestData.total_days,
    reason: requestData.reason,
    status: requestData.status,
    status_display: LEAVE_STATUS[requestData.status] || requestData.status,
    applied_on: requestData.applied_on ? formatDateTime(requestData.applied_on) : null,
    approved_by: requestData.approved_by,
    approved_by_name: requestData.approved_by_name,
    approved_on: requestData.approved_on ? formatDateTime(requestData.approved_on) : null,
    rejection_reason: requestData.rejection_reason,
    medical_certificate: Boolean(requestData.medical_certificate),
    // 計算狀態標識
    is_pending: requestData.status === 'Pending',
    is_approved: requestData.status === 'Approved',
    is_rejected: requestData.status === 'Rejected',
    // 時間相關計算
    days_until_start: requestData.start_date ? 
      Math.max(0, Math.ceil((new Date(requestData.start_date) - new Date()) / (1000 * 60 * 60 * 24))) : 0,
    days_since_applied: requestData.applied_on ?
      Math.floor((new Date() - new Date(requestData.applied_on)) / (1000 * 60 * 60 * 24)) : 0
  };
};

/**
 * 格式化日期為 YYYY-MM-DD 格式
 */
const formatDate = (date) => {
  if (!date) return null;
  const d = new Date(date);
  return d.toISOString().split('T')[0];
};

/**
 * 格式化日期時間為可讀格式
 */
const formatDateTime = (datetime) => {
  if (!datetime) return null;
  const d = new Date(datetime);
  return d.toLocaleString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// ===== 業務邏輯函數 =====

/**
 * 檢查請假時間衝突
 */
const checkLeaveConflict = async (staffId, startDate, endDate, excludeRequestId = null) => {
  try {
    let conflictQuery = `
      SELECT 
        request_id,
        leave_type,
        start_date,
        end_date,
        status,
        reason
      FROM leave_requests 
      WHERE staff_id = $1 
        AND status IN ('Pending', 'Approved')
        AND (
          (start_date <= $2 AND end_date >= $2) OR
          (start_date <= $3 AND end_date >= $3) OR
          (start_date >= $2 AND end_date <= $3)
        )
    `;
    
    const params = [parseInt(staffId), startDate, endDate];
    
    if (excludeRequestId) {
      conflictQuery += ` AND request_id != $4`;
      params.push(parseInt(excludeRequestId));
    }
    
    conflictQuery += ` ORDER BY start_date ASC`;
    
    const result = await query(conflictQuery, params);
    
    return {
      hasConflict: result.rows.length > 0,
      conflictCount: result.rows.length,
      conflicts: result.rows.map(row => ({
        request_id: row.request_id,
        leave_type: row.leave_type,
        start_date: formatDate(row.start_date),
        end_date: formatDate(row.end_date),
        status: row.status,
        reason: row.reason
      }))
    };
  } catch (error) {
    console.error('檢查請假衝突失敗:', error);
    return {
      hasConflict: false,
      conflictCount: 0,
      conflicts: [],
      error: error.message
    };
  }
};

/**
 * 檢查員工是否存在
 */
const checkStaffExists = async (staffId) => {
  try {
    const result = await query(
      'SELECT staff_id, name, email FROM staff WHERE staff_id = $1',
      [parseInt(staffId)]
    );
    
    return {
      exists: result.rows.length > 0,
      staff: result.rows[0] || null
    };
  } catch (error) {
    console.error('檢查員工存在失敗:', error);
    return {
      exists: false,
      staff: null,
      error: error.message
    };
  }
};

/**
 * 生成請假統計摘要
 */
const generateLeaveStatistics = (leaveRequests) => {
  if (!Array.isArray(leaveRequests) || leaveRequests.length === 0) {
    return {
      total: 0,
      by_status: {},
      by_type: {},
      total_days: 0,
      avg_days: 0
    };
  }
  
  const stats = {
    total: leaveRequests.length,
    by_status: {},
    by_type: {},
    total_days: 0,
    avg_days: 0
  };
  
  leaveRequests.forEach(request => {
    // 狀態統計
    stats.by_status[request.status] = (stats.by_status[request.status] || 0) + 1;
    
    // 類型統計
    stats.by_type[request.leave_type] = (stats.by_type[request.leave_type] || 0) + 1;
    
    // 天數統計
    const days = parseInt(request.total_days) || 0;
    stats.total_days += days;
  });
  
  // 計算平均天數
  stats.avg_days = stats.total > 0 ? 
    Math.round((stats.total_days / stats.total) * 100) / 100 : 0;
  
  return stats;
};

// ===== 導出函數 =====
module.exports = {
  // 常量
  LEAVE_TYPES,
  LEAVE_STATUS,
  
  // 日期函數
  calculateTotalDays,
  validateDateRange,
  formatDate,
  formatDateTime,
  
  // 驗證函數
  validateLeaveRequest,
  
  // 格式化函數
  formatLeaveRequest,
  
  // 業務邏輯函數
  checkLeaveConflict,
  checkStaffExists,
  generateLeaveStatistics
};

console.log('簡化請假管理工具載入成功!');