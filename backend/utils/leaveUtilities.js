// utils/leaveUtilities.js - Optimized Leave Management Utilities
const { query } = require('../config/database');

console.log('🔧 Loading Optimized Leave Management Utilities...');

// ===== CONSTANTS AND MAPPINGS =====

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

const PRIORITY_LEVELS = {
  URGENT: 'urgent',
  HIGH: 'high', 
  MEDIUM: 'medium',
  NORMAL: 'normal'
};

const LEAVE_TYPE_PRIORITIES = {
  'emergency_leave': 25,
  'sick_leave': 15,
  'maternity_leave': 10,
  'paternity_leave': 10,
  'annual_leave': 5,
  'casual_leave': 0
};

// ===== TRANSLATION FUNCTIONS =====

/**
 * Translate leave type to display format
 * @param {string} leaveType - Leave type code
 * @param {string} targetLang - Target language ('en' or 'zh')
 * @returns {string} Translated leave type
 */
const translateLeaveType = (leaveType, targetLang = 'en') => {
  if (!leaveType) return '';
  return LEAVE_TYPE_MAPPING[leaveType] || leaveType;
};

/**
 * Translate leave status to display format
 * @param {string} status - Leave status
 * @param {string} targetLang - Target language ('en' or 'zh')
 * @returns {string} Translated leave status
 */
const translateLeaveStatus = (status, targetLang = 'en') => {
  if (!status) return '';
  return LEAVE_STATUS_MAPPING[status] || status;
};

// ===== DATE CALCULATION FUNCTIONS =====

/**
 * Calculate working days (excluding weekends and holidays)
 * @param {Date|string} startDate - Start date
 * @param {Date|string} endDate - End date
 * @param {Array} holidays - Array of holiday dates (optional)
 * @returns {number} Working days
 */
const calculateWorkingDays = (startDate, endDate, holidays = []) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  if (start > end) return 0;
  
  let workingDays = 0;
  const currentDate = new Date(start);
  const holidaySet = new Set(holidays.map(h => new Date(h).toDateString()));
  
  while (currentDate <= end) {
    const dayOfWeek = currentDate.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isHoliday = holidaySet.has(currentDate.toDateString());
    
    if (!isWeekend && !isHoliday) {
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
  
  if (start > end) return 0;
  
  const timeDiff = end.getTime() - start.getTime();
  return Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1; // +1 to include start date
};

/**
 * Calculate working days between two dates using database function (if available)
 * @param {string} startDate - Start date
 * @param {string} endDate - End date
 * @returns {Promise<number>} Number of working days
 */
const calculateWorkingDaysDB = async (startDate, endDate) => {
  try {
    const result = await query(`
      SELECT calculate_working_days($1, $2) as working_days
    `, [startDate, endDate]);
    
    return result.rows[0]?.working_days || 0;
  } catch (error) {
    console.warn('Database working days calculation failed, using JavaScript fallback:', error.message);
    return calculateWorkingDays(startDate, endDate);
  }
};

// ===== DATE VALIDATION FUNCTIONS =====

/**
 * Validate leave application dates with comprehensive checks
 * @param {string} startDate - Start date
 * @param {string} endDate - End date
 * @param {Object} options - Validation options
 * @returns {Object} Validation result
 */
const validateLeaveDates = (startDate, endDate, options = {}) => {
  const { 
    allowPastDates = false,
    maxFutureDays = 730, // 2 years
    maxLeaveDays = 365    // 1 year
  } = options;
  
  const errors = [];
  const warnings = [];
  
  if (!startDate) errors.push('Start date is required');
  if (!endDate) errors.push('End date is required');
  
  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Date format validation
    if (isNaN(start.getTime())) errors.push('Invalid start date format');
    if (isNaN(end.getTime())) errors.push('Invalid end date format');
    
    if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
      // Date logic validation
      if (start > end) {
        errors.push('Start date cannot be later than end date');
      }
      
      // Past date validation
      if (!allowPastDates && start < today) {
        errors.push('Start date cannot be in the past');
      }
      
      // Future date validation
      const maxFutureDate = new Date();
      maxFutureDate.setDate(maxFutureDate.getDate() + maxFutureDays);
      
      if (end > maxFutureDate) {
        errors.push(`End date cannot be more than ${Math.floor(maxFutureDays / 365)} years in the future`);
      }
      
      // Duration validation
      const totalDays = calculateTotalDays(startDate, endDate);
      if (totalDays > maxLeaveDays) {
        errors.push(`Leave duration cannot exceed ${maxLeaveDays} days`);
      }
      
      // Warning for very short applications
      const daysUntilStart = Math.floor((start - today) / (1000 * 60 * 60 * 24));
      if (daysUntilStart < 3 && daysUntilStart >= 0) {
        warnings.push('Leave application with less than 3 days notice may require special approval');
      }
      
      // Warning for weekend-only leave
      const workingDays = calculateWorkingDays(startDate, endDate);
      if (workingDays === 0 && totalDays > 0) {
        warnings.push('This leave request covers only weekends');
      }
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    hasWarnings: warnings.length > 0
  };
};

// ===== DATA FORMATTING FUNCTIONS =====

/**
 * Format leave request data for API response
 * @param {Object} leaveRequest - Raw leave request data
 * @param {string} locale - Language setting ('en' or 'zh')
 * @returns {Object} Formatted data
 */
const formatLeaveRequest = (leaveRequest, locale = 'en') => {
  if (!leaveRequest) return null;
  
  const formatted = {
    ...leaveRequest,
    leave_type_display: translateLeaveType(leaveRequest.leave_type, locale),
    status_display: translateLeaveStatus(leaveRequest.status, locale),
    
    // Formatted dates
    applied_on_formatted: leaveRequest.applied_on ? 
      new Date(leaveRequest.applied_on).toLocaleDateString('en-US') : null,
    approved_on_formatted: leaveRequest.approved_on ? 
      new Date(leaveRequest.approved_on).toLocaleDateString('en-US') : null,
    start_date_formatted: leaveRequest.start_date ? 
      new Date(leaveRequest.start_date).toLocaleDateString('en-US') : null,
    end_date_formatted: leaveRequest.end_date ? 
      new Date(leaveRequest.end_date).toLocaleDateString('en-US') : null,
    
    // Calculated fields
    working_days: leaveRequest.start_date && leaveRequest.end_date ? 
      calculateWorkingDays(leaveRequest.start_date, leaveRequest.end_date) : 0,
    
    // Convert numeric days to integers
    days_until_start: parseInt(leaveRequest.days_until_start) || 0,
    days_since_applied: parseInt(leaveRequest.days_since_applied) || 0,
    
    // Medical certificate as boolean
    has_medical_certificate: Boolean(leaveRequest.medical_certificate),
    
    // Emergency contact availability
    has_emergency_contact: Boolean(leaveRequest.emergency_contact)
  };
  
  return formatted;
};

/**
 * Format leave quota data for API response
 * @param {Object} leaveQuota - Raw leave quota data
 * @param {string} locale - Language setting
 * @returns {Object} Formatted data
 */
const formatLeaveQuota = (leaveQuota, locale = 'en') => {
  if (!leaveQuota) return null;
  
  const formatQuotaItem = (quota, used, type) => ({
    quota: parseInt(quota) || 0,
    used: parseInt(used) || 0,
    remaining: (parseInt(quota) || 0) - (parseInt(used) || 0),
    utilization_rate: quota > 0 ? Math.round((used / quota) * 100) : 0,
    type_display: translateLeaveType(type, locale)
  });
  
  const totalQuota = (leaveQuota.sl_quota || 0) + (leaveQuota.al_quota || 0) + 
                    (leaveQuota.cl_quota || 0) + (leaveQuota.ml_quota || 0) + 
                    (leaveQuota.pl_quota || 0);
  
  const totalUsed = (leaveQuota.sl_used || 0) + (leaveQuota.al_used || 0) + 
                   (leaveQuota.cl_used || 0) + (leaveQuota.ml_used || 0) + 
                   (leaveQuota.pl_used || 0);
  
  return {
    ...leaveQuota,
    
    // Individual leave types
    sick_leave: formatQuotaItem(leaveQuota.sl_quota, leaveQuota.sl_used, 'sick_leave'),
    annual_leave: formatQuotaItem(leaveQuota.al_quota, leaveQuota.al_used, 'annual_leave'),
    casual_leave: formatQuotaItem(leaveQuota.cl_quota, leaveQuota.cl_used, 'casual_leave'),
    maternity_leave: formatQuotaItem(leaveQuota.ml_quota, leaveQuota.ml_used, 'maternity_leave'),
    paternity_leave: formatQuotaItem(leaveQuota.pl_quota, leaveQuota.pl_used, 'paternity_leave'),
    
    // Totals
    total_quota: totalQuota,
    total_used: totalUsed,
    total_remaining: totalQuota - totalUsed,
    overall_utilization_rate: totalQuota > 0 ? Math.round((totalUsed / totalQuota) * 100) : 0,
    
    // Status indicators
    is_overused: totalUsed > totalQuota,
    is_nearly_exhausted: totalQuota > 0 && ((totalQuota - totalUsed) / totalQuota) < 0.1,
    
    // Formatted dates
    last_quota_update_formatted: leaveQuota.last_quota_update ?
      new Date(leaveQuota.last_quota_update).toLocaleDateString('en-US') : null
  };
};

// ===== BUSINESS LOGIC FUNCTIONS =====

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
        status,
        total_days
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
    
    conflictQuery += ` ORDER BY start_date ASC`;
    
    const result = await query(conflictQuery, params);
    
    return {
      hasConflict: result.rows.length > 0,
      conflictCount: result.rows.length,
      conflictingRequests: result.rows.map(row => ({
        ...row,
        overlap_type: determineOverlapType(
          { start: startDate, end: endDate },
          { start: row.start_date, end: row.end_date }
        )
      }))
    };
  } catch (error) {
    console.error('Error checking leave conflict:', error);
    return {
      hasConflict: false,
      conflictCount: 0,
      conflictingRequests: [],
      error: error.message
    };
  }
};

/**
 * Determine the type of date overlap between two date ranges
 * @param {Object} range1 - First date range
 * @param {Object} range2 - Second date range
 * @returns {string} Overlap type
 */
const determineOverlapType = (range1, range2) => {
  const start1 = new Date(range1.start);
  const end1 = new Date(range1.end);
  const start2 = new Date(range2.start);
  const end2 = new Date(range2.end);
  
  if (start1.getTime() === start2.getTime() && end1.getTime() === end2.getTime()) {
    return 'exact_match';
  } else if (start1 >= start2 && end1 <= end2) {
    return 'contained_within';
  } else if (start2 >= start1 && end2 <= end1) {
    return 'contains';
  } else if (start1 <= end2 && end1 >= start2) {
    return 'partial_overlap';
  }
  
  return 'no_overlap';
};

/**
 * Calculate leave application priority with detailed scoring
 * @param {Object} leaveRequest - Leave request data
 * @returns {Object} Priority information
 */
const calculateLeavePriority = (leaveRequest) => {
  if (!leaveRequest) return { priority: PRIORITY_LEVELS.NORMAL, score: 0 };
  
  let score = 0;
  const reasons = [];
  
  // Base priority by leave type
  const typeScore = LEAVE_TYPE_PRIORITIES[leaveRequest.leave_type] || 0;
  score += typeScore;
  if (typeScore > 0) {
    reasons.push(`${translateLeaveType(leaveRequest.leave_type)} type priority`);
  }
  
  // Urgency based on start date
  const daysUntilStart = Math.floor(
    (new Date(leaveRequest.start_date) - new Date()) / (1000 * 60 * 60 * 24)
  );
  
  if (daysUntilStart <= 0) {
    score += 30;
    reasons.push('Leave has already started or starts today');
  } else if (daysUntilStart <= 1) {
    score += 25;
    reasons.push('Leave starting within 1 day');
  } else if (daysUntilStart <= 3) {
    score += 15;
    reasons.push('Leave starting within 3 days');
  } else if (daysUntilStart <= 7) {
    score += 5;
    reasons.push('Leave starting within a week');
  }
  
  // Application age
  const daysFromApplication = Math.floor(
    (new Date() - new Date(leaveRequest.applied_on)) / (1000 * 60 * 60 * 24)
  );
  
  if (daysFromApplication > 14) {
    score += 20;
    reasons.push('Application pending for more than 2 weeks');
  } else if (daysFromApplication > 7) {
    score += 15;
    reasons.push('Application pending for more than a week');
  } else if (daysFromApplication > 3) {
    score += 10;
    reasons.push('Application pending for more than 3 days');
  }
  
  // Medical certificate bonus
  if (leaveRequest.medical_certificate) {
    score += 10;
    reasons.push('Medical certificate provided');
  }
  
  // Leave duration considerations
  const totalDays = parseInt(leaveRequest.total_days) || 0;
  if (totalDays > 30) {
    score += 20;
    reasons.push('Long-term leave (more than 30 days)');
  } else if (totalDays > 10) {
    score += 10;
    reasons.push('Extended leave (10-30 days)');
  } else if (totalDays > 5) {
    score += 5;
    reasons.push('Medium-term leave (5-10 days)');
  }
  
  // Determine priority level
  let priority = PRIORITY_LEVELS.NORMAL;
  if (score >= 50) {
    priority = PRIORITY_LEVELS.URGENT;
  } else if (score >= 30) {
    priority = PRIORITY_LEVELS.HIGH;
  } else if (score >= 15) {
    priority = PRIORITY_LEVELS.MEDIUM;
  }
  
  return {
    priority,
    score,
    reasons,
    days_from_application: daysFromApplication,
    days_until_start: daysUntilStart,
    total_days: totalDays,
    scoring_breakdown: {
      type_score: typeScore,
      urgency_bonus: Math.max(0, 30 - Math.max(0, daysUntilStart * 5)),
      age_bonus: Math.min(20, Math.max(0, (daysFromApplication - 3) * 2)),
      medical_bonus: leaveRequest.medical_certificate ? 10 : 0,
      duration_bonus: totalDays > 30 ? 20 : totalDays > 10 ? 10 : totalDays > 5 ? 5 : 0
    }
  };
};

/**
 * Comprehensive validation of leave request data
 * @param {Object} requestData - Leave request data
 * @returns {Object} Validation result
 */
const validateLeaveRequestData = (requestData) => {
  const errors = [];
  const warnings = [];
  
  // Required field validation
  const requiredFields = {
    staff_id: 'Staff ID',
    leave_type: 'Leave type',
    start_date: 'Start date',
    end_date: 'End date',
    reason: 'Leave reason'
  };
  
  Object.entries(requiredFields).forEach(([field, displayName]) => {
    if (!requestData[field] || (typeof requestData[field] === 'string' && !requestData[field].trim())) {
      errors.push(`${displayName} is required`);
    }
  });
  
  // Leave type validation
  const validLeaveTypes = Object.keys(LEAVE_TYPE_MAPPING).filter(key => !key.includes(' '));
  if (requestData.leave_type && !validLeaveTypes.includes(requestData.leave_type)) {
    errors.push(`Invalid leave type. Valid types: ${validLeaveTypes.join(', ')}`);
  }
  
  // Date validation
  if (requestData.start_date && requestData.end_date) {
    const dateValidation = validateLeaveDates(requestData.start_date, requestData.end_date);
    if (!dateValidation.isValid) {
      errors.push(...dateValidation.errors);
    }
    if (dateValidation.hasWarnings) {
      warnings.push(...dateValidation.warnings);
    }
  }
  
  // Staff ID format validation
  if (requestData.staff_id && typeof requestData.staff_id !== 'number') {
    if (!Number.isInteger(Number(requestData.staff_id))) {
      errors.push('Staff ID must be a valid integer');
    }
  }
  
  // Reason length validation
  if (requestData.reason && requestData.reason.trim().length < 10) {
    warnings.push('Leave reason is very short. Consider providing more details.');
  }
  
  // Emergency contact validation
  if (requestData.emergency_contact && requestData.emergency_contact.trim().length < 5) {
    warnings.push('Emergency contact information seems incomplete');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    hasWarnings: warnings.length > 0
  };
};

/**
 * Generate comprehensive leave summary statistics
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
      avg_days: 0,
      date_range: null
    };
  }
  
  const summary = {
    total: leaveRequests.length,
    by_status: {},
    by_type: {},
    by_priority: { urgent: 0, high: 0, medium: 0, normal: 0 },
    total_days: 0,
    approved_days: 0,
    avg_days: 0,
    avg_approved_days: 0,
    date_range: {
      earliest_application: null,
      latest_application: null,
      earliest_start: null,
      latest_end: null
    },
    medical_certificates: 0,
    emergency_contacts: 0
  };
  
  let earliestApp = null, latestApp = null, earliestStart = null, latestEnd = null;
  
  // Process each request
  leaveRequests.forEach(request => {
    // Status statistics
    summary.by_status[request.status] = (summary.by_status[request.status] || 0) + 1;
    
    // Type statistics
    summary.by_type[request.leave_type] = (summary.by_type[request.leave_type] || 0) + 1;
    
    // Priority statistics (if priority is calculated)
    if (request.priority_level) {
      summary.by_priority[request.priority_level] = (summary.by_priority[request.priority_level] || 0) + 1;
    }
    
    // Days calculation
    const totalDays = parseInt(request.total_days) || 0;
    summary.total_days += totalDays;
    
    if (request.status === 'Approved') {
      summary.approved_days += totalDays;
    }
    
    // Date range tracking
    const appDate = new Date(request.applied_on);
    const startDate = new Date(request.start_date);
    const endDate = new Date(request.end_date);
    
    if (!earliestApp || appDate < earliestApp) earliestApp = appDate;
    if (!latestApp || appDate > latestApp) latestApp = appDate;
    if (!earliestStart || startDate < earliestStart) earliestStart = startDate;
    if (!latestEnd || endDate > latestEnd) latestEnd = endDate;
    
    // Additional statistics
    if (request.medical_certificate) summary.medical_certificates++;
    if (request.emergency_contact) summary.emergency_contacts++;
  });
  
  // Calculate averages
  summary.avg_days = summary.total > 0 ? 
    Math.round((summary.total_days / summary.total) * 100) / 100 : 0;
  
  const approvedCount = summary.by_status['Approved'] || 0;
  summary.avg_approved_days = approvedCount > 0 ? 
    Math.round((summary.approved_days / approvedCount) * 100) / 100 : 0;
  
  // Set date ranges
  summary.date_range = {
    earliest_application: earliestApp?.toISOString().split('T')[0] || null,
    latest_application: latestApp?.toISOString().split('T')[0] || null,
    earliest_start: earliestStart?.toISOString().split('T')[0] || null,
    latest_end: latestEnd?.toISOString().split('T')[0] || null
  };
  
  // Calculate rates
  summary.approval_rate = summary.total > 0 ? 
    Math.round(((summary.by_status['Approved'] || 0) / summary.total) * 100) : 0;
  summary.medical_certificate_rate = summary.total > 0 ?
    Math.round((summary.medical_certificates / summary.total) * 100) : 0;
  
  return summary;
};

// ===== UTILITY FUNCTIONS =====

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
 * Check if date is a working day (Monday-Friday)
 * @param {Date|string} date - Date
 * @returns {boolean} Whether it's a working day
 */
const isWorkingDay = (date) => {
  const d = new Date(date);
  const dayOfWeek = d.getDay();
  return dayOfWeek !== 0 && dayOfWeek !== 6; // Not Sunday(0) and Saturday(6)
};

/**
 * Get next working day after given date
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

// ===== EXPORTS =====
module.exports = {
  // Constants
  LEAVE_TYPE_MAPPING,
  LEAVE_STATUS_MAPPING,
  PRIORITY_LEVELS,
  
  // Translation functions
  translateLeaveType,
  translateLeaveStatus,
  
  // Date calculation functions
  calculateWorkingDays,
  calculateTotalDays,
  calculateWorkingDaysDB,
  validateLeaveDates,
  formatDateForDB,
  isWorkingDay,
  getNextWorkingDay,
  
  // Data formatting functions
  formatLeaveRequest,
  formatLeaveQuota,
  
  // Business logic functions
  checkLeaveConflict,
  calculateLeavePriority,
  validateLeaveRequestData,
  generateLeaveSummary,
  
  // Utility functions
  determineOverlapType
};

console.log('✅ Optimized Leave Management Utilities loaded successfully!');