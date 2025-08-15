// utils/holidayUtils.js
const { query } = require('../config/database');

console.log('🔧 Loading Leave Management Utilities...');

const LEAVE_TYPE_MAPPING = {
  'sick_leave': 'Sick Leave',
  'annual_leave': 'Annual Leave', 
  'casual_leave': 'Casual Leave',
  'maternity_leave': 'Maternity Leave',
  'paternity_leave': 'Paternity Leave',
  'emergency_leave': 'Emergency Leave',
  // Reverse mapping
  'Sick Leave': 'sick_leave',
  'Annual Leave': 'annual_leave',
  'Casual Leave': 'casual_leave', 
  'Maternity Leave': 'maternity_leave',
  'Paternity Leave': 'paternity_leave',
  'Emergency Leave': 'emergency_leave'
};

const LEAVE_STATUS_MAPPING = {
  'Pending': 'Pending',
  'Approved': 'Approved',
  'Rejected': 'Rejected',
  'Cancelled': 'Cancelled'
};

/**
 * Translate leave type
 * @param {string} leaveType - Leave type
 * @param {string} targetLang - Target language ('en' or 'zh')
 * @returns {string} Translated leave type
 */
const translateLeaveType = (leaveType, targetLang = 'en') => {
  if (!leaveType) return '';
  
  if (targetLang === 'en') {
    return LEAVE_TYPE_MAPPING[leaveType] || leaveType;
  } else {
    return LEAVE_TYPE_MAPPING[leaveType] || leaveType;
  }
};

/**
 * Translate leave status
 * @param {string} status - Leave status
 * @param {string} targetLang - Target language ('en' or 'zh')
 * @returns {string} Translated leave status
 */
const translateLeaveStatus = (status, targetLang = 'en') => {
  if (!status) return '';
  
  if (targetLang === 'en') {
    return LEAVE_STATUS_MAPPING[status] || status;
  } else {
    return LEAVE_STATUS_MAPPING[status] || status;
  }
};

/**
 * Calculate working days (excluding weekends)
 * @param {Date|string} startDate - Start date
 * @param {Date|string} endDate - End date
 * @returns {number} Working days
 */
const calculateWorkingDays = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  if (start > end) {
    return 0;
  }
  
  let workingDays = 0;
  const currentDate = new Date(start);
  
  while (currentDate <= end) {
    const dayOfWeek = currentDate.getDay();
    // 0 = Sunday, 6 = Saturday
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      workingDays++;
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return workingDays;
};

/**
 * Calculate total days for leave application (including weekends)
 * @param {Date|string} startDate - Start date
 * @param {Date|string} endDate - End date
 * @returns {number} Total days
 */
const calculateTotalDays = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  if (start > end) {
    return 0;
  }
  
  const timeDiff = end.getTime() - start.getTime();
  const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1; // +1 to include start date
  
  return daysDiff;
};

/**
 * Validate leave application dates
 * @param {string} startDate - Start date
 * @param {string} endDate - End date
 * @param {boolean} allowPastDates - Whether to allow past dates
 * @returns {Object} Validation result
 */
const validateLeaveDates = (startDate, endDate, allowPastDates = false) => {
  const errors = [];
  
  if (!startDate) {
    errors.push('Start date is required');
  }
  
  if (!endDate) {
    errors.push('End date is required');
  }
  
  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (isNaN(start.getTime())) {
      errors.push('Invalid start date format');
    }
    
    if (isNaN(end.getTime())) {
      errors.push('Invalid end date format');
    }
    
    if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
      if (start > end) {
        errors.push('Start date cannot be later than end date');
      }
      
      if (!allowPastDates && start < today) {
        errors.push('Start date cannot be in the past');
      }
      
      // Check if date is too far in the future (more than 2 years)
      const twoYearsLater = new Date();
      twoYearsLater.setFullYear(twoYearsLater.getFullYear() + 2);
      
      if (end > twoYearsLater) {
        errors.push('End date cannot be more than two years in the future');
      }
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Format leave request data
 * @param {Object} leaveRequest - Leave request data
 * @param {string} locale - Language setting ('en' or 'zh')
 * @returns {Object} Formatted data
 */
const formatLeaveRequest = (leaveRequest, locale = 'en') => {
  if (!leaveRequest) return null;
  
  return {
    ...leaveRequest,
    leave_type_display: translateLeaveType(leaveRequest.leave_type, locale),
    status_display: translateLeaveStatus(leaveRequest.status, locale),
    applied_on_formatted: leaveRequest.applied_on ? 
      new Date(leaveRequest.applied_on).toLocaleDateString('en-US') : null,
    approved_on_formatted: leaveRequest.approved_on ? 
      new Date(leaveRequest.approved_on).toLocaleDateString('en-US') : null,
    start_date_formatted: leaveRequest.start_date ? 
      new Date(leaveRequest.start_date).toLocaleDateString('en-US') : null,
    end_date_formatted: leaveRequest.end_date ? 
      new Date(leaveRequest.end_date).toLocaleDateString('en-US') : null,
    working_days: leaveRequest.start_date && leaveRequest.end_date ? 
      calculateWorkingDays(leaveRequest.start_date, leaveRequest.end_date) : 0
  };
};

/**
 * Format leave quota data
 * @param {Object} leaveQuota - Leave quota data
 * @param {string} locale - Language setting
 * @returns {Object} Formatted data
 */
const formatLeaveQuota = (leaveQuota, locale = 'en') => {
  if (!leaveQuota) return null;
  
  const formatQuotaItem = (enabled, quota, used, type) => ({
    enabled,
    quota: quota || 0,
    used: used || 0,
    remaining: (quota || 0) - (used || 0),
    utilization_rate: quota > 0 ? Math.round((used / quota) * 100) : 0,
    type_display: translateLeaveType(type, locale)
  });
  
  return {
    ...leaveQuota,
    sick_leave: formatQuotaItem(
      leaveQuota.sick_leave_enabled, 
      leaveQuota.sl_quota, 
      leaveQuota.sl_used, 
      'sick_leave'
    ),
    annual_leave: formatQuotaItem(
      leaveQuota.annual_leave_enabled, 
      leaveQuota.al_quota, 
      leaveQuota.al_used, 
      'annual_leave'
    ),
    casual_leave: formatQuotaItem(
      leaveQuota.casual_leave_enabled, 
      leaveQuota.cl_quota, 
      leaveQuota.cl_used, 
      'casual_leave'
    ),
    maternity_leave: formatQuotaItem(
      leaveQuota.maternity_leave_enabled, 
      leaveQuota.ml_quota, 
      leaveQuota.ml_used, 
      'maternity_leave'
    ),
    paternity_leave: formatQuotaItem(
      leaveQuota.paternity_leave_enabled, 
      leaveQuota.pl_quota, 
      leaveQuota.pl_used, 
      'paternity_leave'
    ),
    total_quota: (leaveQuota.sl_quota || 0) + (leaveQuota.al_quota || 0) + 
                 (leaveQuota.cl_quota || 0) + (leaveQuota.ml_quota || 0) + 
                 (leaveQuota.pl_quota || 0),
    total_used: (leaveQuota.sl_used || 0) + (leaveQuota.al_used || 0) + 
                (leaveQuota.cl_used || 0) + (leaveQuota.ml_used || 0) + 
                (leaveQuota.pl_used || 0)
  };
};

/**
 * Check for leave application conflicts
 * @param {number} staffId - Staff ID
 * @param {string} startDate - Start date
 * @param {string} endDate - End date
 * @param {number} excludeRequestId - Request ID to exclude (for updates)
 * @returns {Promise<Object>} Check result
 */
const checkLeaveConflict = async (staffId, startDate, endDate, excludeRequestId = null) => {
  try {
    let conflictQuery = `
      SELECT 
        request_id,
        leave_type,
        start_date,
        end_date,
        status
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
      conflictingRequests: result.rows
    };
  } catch (error) {
    console.error('Error checking leave conflict:', error);
    return {
      hasConflict: false,
      conflictingRequests: [],
      error: error.message
    };
  }
};

/**
 * Get staff leave history statistics
 * @param {number} staffId - Staff ID
 * @param {number} leaveYear - Leave year
 * @returns {Promise<Object>} Statistics result
 */
const getStaffLeaveHistory = async (staffId, leaveYear = new Date().getFullYear()) => {
  try {
    const historyResult = await query(`
      SELECT 
        leave_type,
        COUNT(*) as total_requests,
        COUNT(CASE WHEN status = 'Approved' THEN 1 END) as approved_count,
        COUNT(CASE WHEN status = 'Rejected' THEN 1 END) as rejected_count,
        COUNT(CASE WHEN status = 'Pending' THEN 1 END) as pending_count,
        SUM(CASE WHEN status = 'Approved' THEN total_days ELSE 0 END) as total_approved_days,
        AVG(CASE WHEN status = 'Approved' THEN total_days END) as avg_approved_days,
        MIN(CASE WHEN status = 'Approved' THEN applied_on END) as first_approved,
        MAX(CASE WHEN status = 'Approved' THEN applied_on END) as latest_approved
      FROM leave_requests 
      WHERE staff_id = $1 
      AND EXTRACT(YEAR FROM start_date) = $2
      GROUP BY leave_type
      ORDER BY total_requests DESC
    `, [staffId, leaveYear]);
    
    return {
      success: true,
      data: historyResult.rows,
      staff_id: staffId,
      leave_year: leaveYear
    };
  } catch (error) {
    console.error('Error getting staff leave history:', error);
    return {
      success: false,
      error: error.message,
      data: []
    };
  }
};

/**
 * Calculate leave application priority
 * @param {Object} leaveRequest - Leave request data
 * @returns {Object} Priority information
 */
const calculateLeavePriority = (leaveRequest) => {
  if (!leaveRequest) return { priority: 'normal', score: 0 };
  
  let score = 0;
  let priority = 'normal';
  let reasons = [];
  
  // Check application date (earlier applications get lower score, higher priority)
  const daysFromApplication = Math.floor(
    (new Date() - new Date(leaveRequest.applied_on)) / (1000 * 60 * 60 * 24)
  );
  
  if (daysFromApplication > 7) {
    score += 20;
    reasons.push('Application pending for more than a week');
  } else if (daysFromApplication > 3) {
    score += 10;
    reasons.push('Application pending for more than 3 days');
  }
  
  // Check leave type
  if (leaveRequest.leave_type === 'sick_leave') {
    score += 15;
    reasons.push('Sick leave application');
  } else if (leaveRequest.leave_type === 'emergency_leave') {
    score += 25;
    reasons.push('Emergency leave application');
  } else if (leaveRequest.medical_certificate) {
    score += 10;
    reasons.push('Medical certificate provided');
  }
  
  // Check leave duration
  if (leaveRequest.total_days > 10) {
    score += 15;
    reasons.push('Long-term leave (more than 10 days)');
  } else if (leaveRequest.total_days > 5) {
    score += 8;
    reasons.push('Medium-term leave (5-10 days)');
  }
  
  // Check urgency of start date
  const daysUntilStart = Math.floor(
    (new Date(leaveRequest.start_date) - new Date()) / (1000 * 60 * 60 * 24)
  );
  
  if (daysUntilStart <= 1) {
    score += 20;
    reasons.push('Leave starting within 1 day');
  } else if (daysUntilStart <= 3) {
    score += 10;
    reasons.push('Leave starting within 3 days');
  }
  
  // Determine priority level
  if (score >= 40) {
    priority = 'urgent';
  } else if (score >= 20) {
    priority = 'high';
  } else if (score >= 10) {
    priority = 'medium';
  }
  
  return {
    priority,
    score,
    reasons,
    days_from_application: daysFromApplication,
    days_until_start: daysUntilStart
  };
};

/**
 * Generate leave summary report
 * @param {Array} leaveRequests - Leave request list
 * @returns {Object} Summary report
 */
const generateLeaveSummary = (leaveRequests) => {
  if (!Array.isArray(leaveRequests) || leaveRequests.length === 0) {
    return {
      total: 0,
      by_status: {},
      by_type: {},
      total_days: 0,
      avg_days: 0
    };
  }
  
  const summary = {
    total: leaveRequests.length,
    by_status: {},
    by_type: {},
    total_days: 0,
    approved_days: 0,
    avg_days: 0,
    avg_approved_days: 0
  };
  
  // Calculate various statistics
  leaveRequests.forEach(request => {
    // By status statistics
    summary.by_status[request.status] = (summary.by_status[request.status] || 0) + 1;
    
    // By type statistics
    summary.by_type[request.leave_type] = (summary.by_type[request.leave_type] || 0) + 1;
    
    // Total days
    summary.total_days += request.total_days || 0;
    
    // Approved days
    if (request.status === 'Approved') {
      summary.approved_days += request.total_days || 0;
    }
  });
  
  // Calculate averages
  summary.avg_days = summary.total > 0 ? Math.round((summary.total_days / summary.total) * 100) / 100 : 0;
  
  const approvedCount = summary.by_status['Approved'] || 0;
  summary.avg_approved_days = approvedCount > 0 ? 
    Math.round((summary.approved_days / approvedCount) * 100) / 100 : 0;
  
  return summary;
};

/**
 * Validate leave application permission
 * @param {number} staffId - Staff ID
 * @param {string} leaveType - Leave type
 * @param {number} requestedDays - Requested days
 * @param {number} leaveYear - Leave year
 * @returns {Promise<Object>} Permission check result
 */
const validateLeavePermission = async (staffId, leaveType, requestedDays, leaveYear = new Date().getFullYear()) => {
  try {
    // Use database function to check permission
    const result = await query(`
      SELECT * FROM check_leave_eligibility($1, $2, $3, $4)
    `, [staffId, leaveType, requestedDays, leaveYear]);
    
    const eligibility = result.rows[0];
    
    return {
      success: true,
      eligible: eligibility.eligible,
      available_quota: eligibility.available_quota,
      message: eligibility.message,
      details: {
        staff_id: staffId,
        leave_type: leaveType,
        requested_days: requestedDays,
        leave_year: leaveYear
      }
    };
  } catch (error) {
    console.error('Error validating leave permission:', error);
    return {
      success: false,
      eligible: false,
      available_quota: 0,
      message: 'Permission check failed',
      error: error.message
    };
  }
};

/**
 * Format date for database (YYYY-MM-DD format)
 * @param {Date|string} date - Date
 * @returns {string} Formatted date string
 */
const formatDateForDB = (date) => {
  if (!date) return null;
  
  const d = new Date(date);
  if (isNaN(d.getTime())) return null;
  
  return d.toISOString().split('T')[0];
};

/**
 * Check if date is a working day
 * @param {Date|string} date - Date
 * @returns {boolean} Whether it's a working day
 */
const isWorkingDay = (date) => {
  const d = new Date(date);
  const dayOfWeek = d.getDay();
  return dayOfWeek !== 0 && dayOfWeek !== 6; // Not Sunday(0) and Saturday(6)
};

/**
 * Get next working day
 * @param {Date|string} date - Starting date
 * @returns {Date} Next working day
 */
const getNextWorkingDay = (date) => {
  const d = new Date(date);
  do {
    d.setDate(d.getDate() + 1);
  } while (!isWorkingDay(d));
  
  return d;
};

/**
 * Calculate working days between two dates (using database function)
 * @param {string} startDate - Start date
 * @param {string} endDate - End date
 * @returns {Promise<number>} Number of working days
 */
const calculateWorkingDaysDB = async (startDate, endDate) => {
  try {
    const result = await query(`
      SELECT calculate_working_days($1, $2) as working_days
    `, [startDate, endDate]);
    
    return result.rows[0].working_days || 0;
  } catch (error) {
    console.error('Error calculating working days:', error);
    // Fallback to JavaScript calculation
    return calculateWorkingDays(startDate, endDate);
  }
};

/**
 * Generate leave application reminder
 * @param {Object} leaveRequest - Leave request
 * @returns {Object} Reminder information
 */
const generateLeaveReminder = (leaveRequest) => {
  if (!leaveRequest) return null;
  
  const now = new Date();
  const startDate = new Date(leaveRequest.start_date);
  const appliedDate = new Date(leaveRequest.applied_on);
  
  const daysUntilStart = Math.ceil((startDate - now) / (1000 * 60 * 60 * 24));
  const daysSinceApplied = Math.floor((now - appliedDate) / (1000 * 60 * 60 * 24));
  
  let reminderType = 'info';
  let message = '';
  let urgent = false;
  
  if (leaveRequest.status === 'Pending') {
    if (daysUntilStart <= 1) {
      reminderType = 'urgent';
      message = 'Leave starts soon, please process this request urgently';
      urgent = true;
    } else if (daysUntilStart <= 3) {
      reminderType = 'warning';
      message = 'Leave starts within 3 days, please process soon';
    } else if (daysSinceApplied >= 7) {
      reminderType = 'warning';
      message = 'Application has been pending for more than a week';
    } else if (daysSinceApplied >= 3) {
      reminderType = 'info';
      message = 'Application has been pending for more than 3 days';
    }
  }
  
  return {
    type: reminderType,
    message,
    urgent,
    days_until_start: daysUntilStart,
    days_since_applied: daysSinceApplied,
    priority: calculateLeavePriority(leaveRequest)
  };
};

/**
 * Validate leave request data comprehensively
 * @param {Object} requestData - Leave request data
 * @returns {Object} Validation result
 */
const validateLeaveRequestData = (requestData) => {
  const errors = [];
  
  // Required field validation
  if (!requestData.staff_id) {
    errors.push('Staff ID is required');
  }
  
  if (!requestData.leave_type) {
    errors.push('Leave type is required');
  }
  
  if (!requestData.start_date) {
    errors.push('Start date is required');
  }
  
  if (!requestData.end_date) {
    errors.push('End date is required');
  }
  
  if (!requestData.reason || !requestData.reason.trim()) {
    errors.push('Leave reason is required');
  }
  
  // Date validation
  if (requestData.start_date && requestData.end_date) {
    const dateValidation = validateLeaveDates(requestData.start_date, requestData.end_date);
    if (!dateValidation.isValid) {
      errors.push(...dateValidation.errors);
    }
  }
  
  // Leave type validation
  const validLeaveTypes = ['sick_leave', 'annual_leave', 'casual_leave', 'maternity_leave', 'paternity_leave'];
  if (requestData.leave_type && !validLeaveTypes.includes(requestData.leave_type)) {
    errors.push(`Invalid leave type. Valid types: ${validLeaveTypes.join(', ')}`);
  }
  
  // Days validation
  if (requestData.start_date && requestData.end_date) {
    const totalDays = calculateTotalDays(requestData.start_date, requestData.end_date);
    if (totalDays > 365) {
      errors.push('Leave duration cannot exceed 365 days');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Calculate leave application approval rate
 * @param {Array} requests - Leave requests
 * @returns {Object} Approval rate statistics
 */
const calculateApprovalRate = (requests) => {
  if (!Array.isArray(requests) || requests.length === 0) {
    return {
      total_requests: 0,
      approved_requests: 0,
      rejected_requests: 0,
      approval_rate: 0,
      rejection_rate: 0
    };
  }
  
  const processedRequests = requests.filter(req => 
    req.status === 'Approved' || req.status === 'Rejected'
  );
  
  const approvedCount = requests.filter(req => req.status === 'Approved').length;
  const rejectedCount = requests.filter(req => req.status === 'Rejected').length;
  
  const approvalRate = processedRequests.length > 0 ? 
    Math.round((approvedCount / processedRequests.length) * 100) : 0;
  const rejectionRate = processedRequests.length > 0 ? 
    Math.round((rejectedCount / processedRequests.length) * 100) : 0;
  
  return {
    total_requests: requests.length,
    processed_requests: processedRequests.length,
    approved_requests: approvedCount,
    rejected_requests: rejectedCount,
    pending_requests: requests.filter(req => req.status === 'Pending').length,
    approval_rate: approvalRate,
    rejection_rate: rejectionRate
  };
};

/**
 * Generate leave analytics for a specific period
 * @param {Array} requests - Leave requests
 * @param {string} period - Period type ('month', 'quarter', 'year')
 * @returns {Object} Analytics data
 */
const generateLeaveAnalytics = (requests, period = 'month') => {
  if (!Array.isArray(requests) || requests.length === 0) {
    return {
      period,
      total_requests: 0,
      analytics: []
    };
  }
  
  const groupedData = {};
  
  requests.forEach(request => {
    let key;
    const date = new Date(request.applied_on);
    
    switch (period) {
      case 'year':
        key = date.getFullYear().toString();
        break;
      case 'quarter':
        key = `${date.getFullYear()}-Q${Math.ceil((date.getMonth() + 1) / 3)}`;
        break;
      default: // month
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    }
    
    if (!groupedData[key]) {
      groupedData[key] = [];
    }
    groupedData[key].push(request);
  });
  
  const analytics = Object.keys(groupedData).sort().map(key => ({
    period: key,
    total_requests: groupedData[key].length,
    approved: groupedData[key].filter(req => req.status === 'Approved').length,
    rejected: groupedData[key].filter(req => req.status === 'Rejected').length,
    pending: groupedData[key].filter(req => req.status === 'Pending').length,
    total_days: groupedData[key].reduce((sum, req) => sum + (req.total_days || 0), 0),
    avg_days: Math.round(
      groupedData[key].reduce((sum, req) => sum + (req.total_days || 0), 0) / 
      groupedData[key].length * 100
    ) / 100
  }));
  
  return {
    period,
    total_requests: requests.length,
    analytics
  };
};

module.exports = {
  // Mappings and translations
  LEAVE_TYPE_MAPPING,
  LEAVE_STATUS_MAPPING,
  translateLeaveType,
  translateLeaveStatus,
  
  // Date calculations
  calculateWorkingDays,
  calculateTotalDays,
  calculateWorkingDaysDB,
  validateLeaveDates,
  formatDateForDB,
  isWorkingDay,
  getNextWorkingDay,
  
  // Data formatting
  formatLeaveRequest,
  formatLeaveQuota,
  
  // Business logic checks
  checkLeaveConflict,
  validateLeavePermission,
  validateLeaveRequestData,
  
  // Statistics and analysis
  getStaffLeaveHistory,
  calculateLeavePriority,
  generateLeaveSummary,
  generateLeaveReminder,
  calculateApprovalRate,
  generateLeaveAnalytics
};
  