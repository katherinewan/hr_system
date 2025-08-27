// middleware/leaveMiddleware.js - 簡化的請假管理中間件
const { validateLeaveRequest, checkStaffExists } = require('../utils/leaveUtilities');

console.log('載入簡化請假管理中間件...');

/**
 * 驗證請假申請數據
 */
const validateLeaveRequestData = async (req, res, next) => {
  try {
    const requestData = req.body;
    
    // 基本數據驗證
    const validation = validateLeaveRequest(requestData);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        message: '數據驗證失敗',
        errors: validation.errors
      });
    }
    
    // 檢查員工是否存在
    if (requestData.staff_id) {
      const staffCheck = await checkStaffExists(requestData.staff_id);
      if (!staffCheck.exists) {
        return res.status(400).json({
          success: false,
          message: `員工ID ${requestData.staff_id} 不存在`
        });
      }
      // 將員工信息添加到請求中
      req.staffInfo = staffCheck.staff;
    }
    
    next();
  } catch (error) {
    console.error('請假數據驗證錯誤:', error);
    res.status(500).json({
      success: false,
      message: '數據驗證過程中發生錯誤',
      error: process.env.NODE_ENV === 'development' ? error.message : '內部服務器錯誤'
    });
  }
};

/**
 * 驗證批准權限
 */
const validateApprovalPermission = async (req, res, next) => {
  try {
    const { request_id } = req.params;
    const { approved_by, rejected_by } = req.body;
    const approverId = approved_by || rejected_by;
    
    if (!approverId) {
      return res.status(400).json({
        success: false,
        message: '需要提供審批人ID'
      });
    }
    
    // 檢查審批人是否存在
    const approverCheck = await checkStaffExists(approverId);
    if (!approverCheck.exists) {
      return res.status(400).json({
        success: false,
        message: `審批人ID ${approverId} 不存在`
      });
    }
    
    // 將審批人信息添加到請求中
    req.approverInfo = approverCheck.staff;
    
    next();
  } catch (error) {
    console.error('審批權限驗證錯誤:', error);
    res.status(500).json({
      success: false,
      message: '審批權限驗證過程中發生錯誤',
      error: process.env.NODE_ENV === 'development' ? error.message : '內部服務器錯誤'
    });
  }
};

/**
 * 請假操作日誌記錄
 */
const logLeaveOperation = (operation) => {
  return (req, res, next) => {
    const timestamp = new Date().toISOString();
    const { staff_id, request_id } = req.params;
    const clientIP = req.ip || req.connection.remoteAddress || 'unknown';
    
    console.log(`[${timestamp}] ${operation} - 員工: ${staff_id || 'all'} - 申請: ${request_id || 'none'} - IP: ${clientIP}`);
    
    // 記錄響應狀態
    const originalSend = res.send;
    res.send = function(data) {
      const statusCode = res.statusCode;
      console.log(`[${timestamp}] ${operation} 完成 - 狀態碼: ${statusCode}`);
      
      if (statusCode >= 400) {
        try {
          const parsedData = JSON.parse(data);
          console.log(`[${timestamp}] ${operation} 錯誤詳情:`, parsedData.message || '未知錯誤');
        } catch (parseError) {
          // 忽略解析錯誤
        }
      }
      
      originalSend.call(this, data);
    };
    
    next();
  };
};

/**
 * 統一錯誤處理
 */
const handleLeaveErrors = (err, req, res, next) => {
  console.error('請假管理錯誤:', err);
  
  // PostgreSQL 錯誤處理
  if (err.code) {
    switch (err.code) {
      case '23505': // 唯一約束違反
        return res.status(400).json({
          success: false,
          message: '重複的數據，請檢查輸入',
          error_code: 'DUPLICATE_DATA'
        });
        
      case '23503': // 外鍵約束違反
        return res.status(400).json({
          success: false,
          message: '相關數據不存在，請檢查輸入',
          error_code: 'FOREIGN_KEY_VIOLATION'
        });
        
      case '23514': // 檢查約束違反
        return res.status(400).json({
          success: false,
          message: '數據不符合業務規則',
          error_code: 'CHECK_CONSTRAINT_VIOLATION'
        });
        
      default:
        return res.status(500).json({
          success: false,
          message: '數據庫操作失敗',
          error_code: 'DATABASE_ERROR'
        });
    }
  }
  
  // 其他錯誤
  res.status(500).json({
    success: false,
    message: '請假管理系統錯誤',
    error: process.env.NODE_ENV === 'development' ? err.message : '內部服務器錯誤'
  });
};

/**
 * Content-Type 驗證
 */
const validateContentType = (req, res, next) => {
  if (req.method === 'POST' || req.method === 'PUT') {
    const contentType = req.get('Content-Type');
    
    if (!contentType || !contentType.includes('application/json')) {
      return res.status(400).json({
        success: false,
        message: 'Content-Type 必須是 application/json'
      });
    }
  }
  
  next();
};

module.exports = {
  validateLeaveRequestData,
  validateApprovalPermission,
  logLeaveOperation,
  handleLeaveErrors,
  validateContentType
};

console.log('簡化請假管理中間件載入成功!');