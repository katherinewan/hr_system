// utils/leaveUtilities.js - Leave Management Utilities
const { query } = require('../config/database');

console.log('Loading leave management utilities...');

// Leave type mappings
const DB_LEAVE_TYPES = {
  'annual_leave': 'AL',
  'sick_leave': 'SL', 
  'casual_leave': 'CL',
  'maternity_leave': 'ML',
  'paternity_leave': 'PL'
};

const FRONTEND_LEAVE_TYPES = {
  'AL': 'annual_leave',
  'SL': 'sick_leave',
  'CL': 'casual_leave', 
  'ML': 'maternity_leave',
  'PL': 'paternity_leave'
};

/**
 * Calculate total days between two dates (excluding weekends)
 */
const calculateTotalDays = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  let totalDays = 0;
  
  const currentDate = new Date(start);
  
  while (currentDate <= end) {
    const dayOfWeek = currentDate.getDay();
    // Count weekdays only (Monday to Friday)
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      totalDays++;
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return totalDays;
};

/**
 * Format leave request data for frontend
 */
const formatLeaveRequest = (request) => {
  if (!request) return null;
  
  return {
    ...request,
    // Format dates
    start_date: request.start_date ? new Date(request.start_date).toISOString().split('T')[0] : null,
    end_date: request.end_date ? new Date(request.end_date).toISOString().split('T')[0] : null,
    applied_on: request.applied_on ? new Date(request.applied_on).toISOString() : null,
    approved_on: request.approved_on ? new Date(request.approved_on).toISOString() : null,
    
    // Convert leave type to frontend format
    leave_type: FRONTEND_LEAVE_TYPES[request.leave_type] || request.leave_type,
    
    // Ensure boolean fields
    medical_certificate: Boolean(request.medical_certificate),
    
    // Clean up null values
    emergency_contact: request.emergency_contact || '',
    rejection_reason: request.rejection_reason || '',
    approved_by_name: request.approved_by_name || '',
    
    // Add computed fields
    is_past_due: request.start_date ? new Date(request.start_date) < new Date() : false,
    is_urgent: request.start_date ? 
      (new Date(request.start_date) - new Date()) / (1000 * 60 * 60 * 24) <= 1 : false
  };
};

/**
 * Check for leave conflicts
 */
const checkLeaveConflict = async (staffId, startDate, endDate, excludeRequestId = null) => {
  try {
    let queryStr = `
      SELECT request_id, start_date, end_date, status, leave_type
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
      queryStr += ` AND request_id != $4`;
      params.push(parseInt(excludeRequestId));
    }
    
    const result = await query(queryStr, params);
    
    return {
      hasConflict: result.rows.length > 0,
      conflicts: result.rows.map(row => ({
        request_id: row.request_id,
        start_date: row.start_date,
        end_date: row.end_date,
        status: row.status,
        leave_type: FRONTEND_LEAVE_TYPES[row.leave_type] || row.leave_type
      }))
    };
    
  } catch (error) {
    console.error('Error checking leave conflicts:', error);
    throw error;
  }
};

/**
 * Check if staff exists
 */
const checkStaffExists = async (staffId) => {
  try {
    const result = await query(
      'SELECT staff_id, name FROM staff WHERE staff_id = $1',
      [parseInt(staffId)]
    );
    
    return {
      exists: result.rows.length > 0,
      staff: result.rows[0] || null
    };
    
  } catch (error) {
    console.error('Error checking staff existence:', error);
    throw error;
  }
};

/**
 * Validate leave dates
 */
const validateLeaveDates = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const errors = [];
  
  if (isNaN(start.getTime())) {
    errors.push('Invalid start date');
  }
  
  if (isNaN(end.getTime())) {
    errors.push('Invalid end date');
  }
  
  if (start < today) {
    errors.push('Start date cannot be in the past');
  }
  
  if (start > end) {
    errors.push('Start date cannot be later than end date');
  }
  
  const daysDifference = (end - start) / (1000 * 60 * 60 * 24);
  if (daysDifference > 365) {
    errors.push('Leave duration cannot exceed 365 days');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
};

/**
 * Get leave balance for specific leave type
 */
const getLeaveBalance = async (staffId, leaveType) => {
  try {
    const dbLeaveType = leaveType.toLowerCase();
    let quotaField, usedField;
    
    switch (dbLeaveType) {
      case 'annual_leave':
      case 'al':
        quotaField = 'al_quota';
        usedField = 'al_used';
        break;
      case 'sick_leave':
      case 'sl':
        quotaField = 'sl_quota';
        usedField = 'sl_used';
        break;
      case 'casual_leave':
      case 'cl':
        quotaField = 'cl_quota';
        usedField = 'cl_used';
        break;
      case 'maternity_leave':
      case 'ml':
        quotaField = 'ml_quota';
        usedField = 'ml_used';
        break;
      case 'paternity_leave':
      case 'pl':
        quotaField = 'pl_quota';
        usedField = 'pl_used';
        break;
      default:
        throw new Error(`Unknown leave type: ${leaveType}`);
    }
    
    const result = await query(`
      SELECT ${quotaField} as quota, ${usedField} as used,
             (${quotaField} - ${usedField}) as remaining
      FROM leave
      WHERE staff_id = $1
    `, [parseInt(staffId)]);
    
    if (result.rows.length === 0) {
      return { quota: 0, used: 0, remaining: 0 };
    }
    
    return result.rows[0];
    
  } catch (error) {
    console.error('Error getting leave balance:', error);
    throw error;
  }
};

/**
 * Update leave balance after approval/cancellation
 */
const updateLeaveBalance = async (staffId, leaveType, days, operation = 'use') => {
  try {
    const dbLeaveType = leaveType.toUpperCase();
    let usedField;
    
    switch (dbLeaveType) {
      case 'AL':
      case 'ANNUAL_LEAVE':
        usedField = 'al_used';
        break;
      case 'SL':
      case 'SICK_LEAVE':
        usedField = 'sl_used';
        break;
      case 'CL':
      case 'CASUAL_LEAVE':
        usedField = 'cl_used';
        break;
      case 'ML':
      case 'MATERNITY_LEAVE':
        usedField = 'ml_used';
        break;
      case 'PL':
      case 'PATERNITY_LEAVE':
        usedField = 'pl_used';
        break;
      default:
        throw new Error(`Unknown leave type: ${leaveType}`);
    }
    
    const increment = operation === 'use' ? days : -days;
    
    const result = await query(`
      UPDATE leave 
      SET ${usedField} = GREATEST(0, ${usedField} + $1)
      WHERE staff_id = $2
      RETURNING ${usedField} as used
    `, [increment, parseInt(staffId)]);
    
    return result.rows[0];
    
  } catch (error) {
    console.error('Error updating leave balance:', error);
    throw error;
  }
};

/**
 * Validate leave request data
 */
const validateLeaveRequest = (data) => {
  const errors = [];
  
  if (!data.staff_id || isNaN(parseInt(data.staff_id))) {
    errors.push('Valid staff ID is required');
  }
  
  if (!data.leave_type) {
    errors.push('Leave type is required');
  }
  
  if (!data.start_date) {
    errors.push('Start date is required');
  }
  
  if (!data.end_date) {
    errors.push('End date is required');
  }
  
  if (!data.reason || !data.reason.trim()) {
    errors.push('Reason is required');
  }
  
  if (data.reason && data.reason.length > 500) {
    errors.push('Reason cannot exceed 500 characters');
  }
  
  if (data.emergency_contact && data.emergency_contact.length > 50) {
    errors.push('Emergency contact cannot exceed 50 characters');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
};

/**
 * Get leave statistics for dashboard
 */
const getLeaveStatistics = async (staffId = null) => {
  try {
    let whereClause = '';
    const params = [];
    
    if (staffId) {
      whereClause = 'WHERE staff_id = $1';
      params.push(parseInt(staffId));
    }
    
    const result = await query(`
      SELECT 
        status,
        COUNT(*) as count,
        COALESCE(SUM(total_days), 0) as total_days
      FROM leave_requests 
      ${whereClause}
      GROUP BY status
      ORDER BY status
    `, params);
    
    const stats = {
      total: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
      cancelled: 0,
      total_days: 0
    };
    
    result.rows.forEach(row => {
      const status = row.status.toLowerCase();
      stats[status] = parseInt(row.count);
      stats.total += parseInt(row.count);
      stats.total_days += parseInt(row.total_days);
    });
    
    return stats;
    
  } catch (error) {
    console.error('Error getting leave statistics:', error);
    throw error;
  }
};

module.exports = {
  DB_LEAVE_TYPES,
  FRONTEND_LEAVE_TYPES,
  calculateTotalDays,
  formatLeaveRequest,
  checkLeaveConflict,
  checkStaffExists,
  validateLeaveDates,
  validateLeaveRequest,
  getLeaveBalance,
  updateLeaveBalance,
  getLeaveStatistics
};

console.log('Leave management utilities loaded successfully!');