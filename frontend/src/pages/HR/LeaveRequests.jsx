import React, { useState, useEffect } from 'react';
import { 
  Search, Eye, CheckCircle, XCircle, User, Mail, Phone, Building, 
  AlertCircle, Loader, FileText, Calendar, Clock
} from 'lucide-react';

const HRLeaveRequests = () => {
  const [pendingRequests, setPendingRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // API base URL
  const API_BASE_URL = 'http://localhost:3001/api';

  // 通用函數
  const showError = (message) => {
    setError(message);
    setSuccessMessage('');
  };

  const showSuccess = (message) => {
    setSuccessMessage(message);
    setError('');
    setTimeout(() => setSuccessMessage(''), 5000);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('zh-TW');
  };

  const getStatusBadgeClass = (status) => {
    switch (status?.toLowerCase()) {
      case 'approved': return 'status-badge active';
      case 'rejected': return 'status-badge locked';
      case 'pending': return 'attempts-badge normal';
      default: return 'badge-default';
    }
  };

  const getLeaveTypeLabel = (type) => {
    const labels = {
      'sick_leave': '病假',
      'annual_leave': '年假',
      'casual_leave': '事假',
      'maternity_leave': '產假',
      'paternity_leave': '陪產假'
    };
    return labels[type] || type;
  };

  const getStatusLabel = (status) => {
    const labels = {
      'Pending': '待審核',
      'Approved': '已批准',
      'Rejected': '已拒絕',
      'Cancelled': '已取消'
    };
    return labels[status] || status;
  };

  // 載入待審核申請
  const loadPendingRequests = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/holidays/requests/pending`);
      const data = await response.json();
      
      if (data.success) {
        setPendingRequests(data.data || []);
      } else {
        showError(data.message || '無法載入待審核申請');
      }
    } catch (error) {
      showError('載入申請失敗，請檢查網路連接');
      console.error('Error loading pending requests:', error);
    } finally {
      setLoading(false);
    }
  };

  // 處理申請（批准/拒絕）
  const handleRequestAction = async (requestId, action, comments = '') => {
    try {
      setIsProcessing(true);
      
      const endpoint = action === 'approve' ? 'approve' : 'reject';
      const response = await fetch(`${API_BASE_URL}/holidays/requests/${requestId}/${endpoint}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          approver_id: 100002, // 應該從當前用戶獲取
          comments: comments || undefined
        })
      });

      const result = await response.json();
      
      if (result.success) {
        showSuccess(`申請已${action === 'approve' ? '批准' : '拒絕'}`);
        setShowDetailModal(false);
        loadPendingRequests();
      } else {
        showError(result.message || '操作失敗');
      }
    } catch (error) {
      showError('網路錯誤，請稍後再試');
      console.error('Error processing request:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  // 渲染申請詳情彈窗
  const renderRequestDetailModal = () => {
    const [rejectReason, setRejectReason] = useState('');
    const [showRejectForm, setShowRejectForm] = useState(false);

    if (!showDetailModal || !selectedRequest) return null;

    return (
      <div className="modal-overlay" onClick={() => setShowDetailModal(false)}>
        <div className="modal-content modal-large" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <div className="modal-header-content">
              <div className="modal-title-section">
                <h3 className="modal-title-with-icon">
                  <FileText size={24} />
                  假期申請審核
                </h3>
                <p>申請編號: {selectedRequest.request_id}</p>
              </div>
              <button 
                className="close-btn" 
                onClick={() => setShowDetailModal(false)}
                disabled={isProcessing}
              >
                ×
              </button>
            </div>
          </div>

          <div className="modal-body">
            {/* 員工資訊 */}
            <div className="selected-staff-preview">
              <h4 className="preview-title">
                <User size={16} />
                員工資訊
              </h4>
              <div className="selected-staff-content">
                <div className="selected-staff-avatar">
                  {selectedRequest.staff_name?.charAt(0)?.toUpperCase()}
                </div>
                <div className="selected-staff-info">
                  <div className="selected-staff-name">{selectedRequest.staff_name}</div>
                  <div className="selected-staff-detail">
                    <Building size={12} /> {selectedRequest.department_name || '未分配部門'}
                  </div>
                  <div className="selected-staff-detail">
                    <User size={12} /> {selectedRequest.position_title || '未分配職位'}
                  </div>
                  <div className="selected-staff-detail">
                    <Mail size={12} /> {selectedRequest.staff_email}
                  </div>
                </div>
              </div>
            </div>

            {/* 假期申請詳情 */}
            <div className="salary-form-grid">
              <div className="form-group">
                <label>假期類型</label>
                <div className="form-input" style={{ background: '#f8f9fa' }}>
                  <span className="position-badge">
                    {getLeaveTypeLabel(selectedRequest.leave_type)}
                  </span>
                </div>
              </div>

              <div className="form-group">
                <label>申請狀態</label>
                <div className="form-input" style={{ background: '#f8f9fa' }}>
                  <span className={getStatusBadgeClass(selectedRequest.status)}>
                    {getStatusLabel(selectedRequest.status)}
                  </span>
                </div>
              </div>

              <div className="form-group">
                <label>開始日期</label>
                <div className="form-input" style={{ background: '#f8f9fa' }}>
                  {formatDate(selectedRequest.start_date)}
                </div>
              </div>

              <div className="form-group">
                <label>結束日期</label>
                <div className="form-input" style={{ background: '#f8f9fa' }}>
                  {formatDate(selectedRequest.end_date)}
                </div>
              </div>

              <div className="form-group">
                <label>請假天數</label>
                <div className="form-input" style={{ background: '#f8f9fa' }}>
                  <strong>{selectedRequest.total_days} 天</strong>
                </div>
              </div>

              <div className="form-group">
                <label>申請日期</label>
                <div className="form-input" style={{ background: '#f8f9fa' }}>
                  {formatDate(selectedRequest.applied_on)}
                </div>
              </div>
            </div>

            <div className="form-group">
              <label>請假原因</label>
              <div className="form-input" style={{ background: '#f8f9fa', minHeight: '80px' }}>
                {selectedRequest.reason}
              </div>
            </div>

            {selectedRequest.emergency_contact && (
              <div className="form-group">
                <label>緊急聯絡電話</label>
                <div className="form-input" style={{ background: '#f8f9fa' }}>
                  <Phone size={16} style={{ display: 'inline', marginRight: '8px' }} />
                  {selectedRequest.emergency_contact}
                </div>
              </div>
            )}

            {selectedRequest.medical_certificate && (
              <div className="form-group">
                <div className="info-box">
                  <CheckCircle size={16} style={{ color: '#10b981', display: 'inline', marginRight: '8px' }} />
                  <strong>已提供醫生證明</strong>
                </div>
              </div>
            )}

            {/* 拒絕表單 */}
            {showRejectForm && (
              <div className="form-group">
                <label className="form-label-with-icon">
                  <AlertCircle size={16} />
                  拒絕原因 <span className="required">*</span>
                </label>
                <textarea
                  className="form-input"
                  rows="4"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="請說明拒絕此假期申請的原因..."
                />
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button
              className="btn btn-secondary"
              onClick={() => setShowDetailModal(false)}
              disabled={isProcessing}
            >
              關閉
            </button>
            
            {selectedRequest.status === 'Pending' && (
              <>
                {!showRejectForm ? (
                  <>
                    <button
                      className="btn btn-danger"
                      onClick={() => setShowRejectForm(true)}
                      disabled={isProcessing}
                    >
                      <XCircle size={16} />
                      拒絕
                    </button>
                    <button
                      className="btn btn-success"
                      onClick={() => handleRequestAction(selectedRequest.request_id, 'approve', '已批准')}
                      disabled={isProcessing}
                    >
                      {isProcessing ? (
                        <>
                          <Loader size={16} className="animate-spin" />
                          處理中...
                        </>
                      ) : (
                        <>
                          <CheckCircle size={16} />
                          批准
                        </>
                      )}
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      className="btn btn-secondary"
                      onClick={() => {
                        setShowRejectForm(false);
                        setRejectReason('');
                      }}
                      disabled={isProcessing}
                    >
                      取消
                    </button>
                    <button
                      className="btn btn-danger"
                      onClick={() => handleRequestAction(selectedRequest.request_id, 'reject', rejectReason)}
                      disabled={isProcessing || !rejectReason.trim()}
                    >
                      {isProcessing ? (
                        <>
                          <Loader size={16} className="animate-spin" />
                          處理中...
                        </>
                      ) : (
                        <>
                          <XCircle size={16} />
                          確認拒絕
                        </>
                      )}
                    </button>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  // 載入數據
  useEffect(() => {
    loadPendingRequests();
  }, []);

  // 篩選申請
  const filteredRequests = pendingRequests.filter(request => {
    const matchesSearch = searchInput === '' || 
      request.staff_name.toLowerCase().includes(searchInput.toLowerCase()) ||
      request.leave_type.toLowerCase().includes(searchInput.toLowerCase());
    return matchesSearch;
  });

  return (
    <div style={{ minHeight: '100vh' }}>
      {/* 控制區域 */}
      <div className="controls">
        <div className="controls-wrapper">
          <div className="search-container">
            <div className="search-input-wrapper">
              <Search className="search-icon" size={20} />
              <input
                type="text"
                className="search-input"
                placeholder="搜尋員工姓名或假期類型..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>
          </div>
          <button
            className="btn btn-primary"
            onClick={loadPendingRequests}
            disabled={loading}
          >
            <Calendar size={20} className="btn-icon" />
            重新整理
          </button>
        </div>
      </div>

      {/* 成功/錯誤訊息 */}
      {successMessage && (
        <div style={{
          padding: '12px 20px',
          backgroundColor: '#d1fae5',
          color: '#065f46',
          borderBottom: '1px solid #e5e7eb'
        }}>
          {successMessage}
        </div>
      )}

      {error && (
        <div className="error-message" style={{ margin: '0', borderRadius: '0' }}>
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* 內容 */}
      <div className="content">
        <h2 className="result-title">
          待審核申請 ({filteredRequests.length})
        </h2>

        {loading ? (
          <div className="loading-state">
            <Loader size={48} className="animate-spin" />
            <div>載入申請資料中...</div>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="empty-state">
            <FileText size={64} />
            <h3>沒有待審核申請</h3>
            <p>目前沒有需要審核的假期申請</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="staff-table">
              <thead className="table-header">
                <tr>
                  <th>申請編號</th>
                  <th>員工資訊</th>
                  <th>假期類型</th>
                  <th>日期範圍</th>
                  <th>天數</th>
                  <th>申請日期</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredRequests.map((request) => (
                  <tr key={request.request_id} className="table-row">
                    <td>
                      <span className="staff-id">#{request.request_id}</span>
                      {request.days_pending > 3 && (
                        <div style={{ 
                          fontSize: '0.75rem', 
                          color: '#ef4444',
                          fontWeight: '600',
                          marginTop: '2px'
                        }}>
                          已等待 {request.days_pending} 天
                        </div>
                      )}
                    </td>
                    <td>
                      <div className="employee-info">
                        <div className="employee-name">{request.staff_name}</div>
                        <div className="employee-id">ID: {request.staff_id}</div>
                        <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                          {request.department_name || '未分配部門'}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="position-badge">
                        {getLeaveTypeLabel(request.leave_type)}
                      </span>
                      {request.medical_certificate && (
                        <div style={{ fontSize: '0.7rem', color: '#10b981', marginTop: '2px' }}>
                          <CheckCircle size={12} style={{ display: 'inline', marginRight: '4px' }} />
                          有醫證
                        </div>
                      )}
                    </td>
                    <td>
                      <div style={{ fontSize: '0.875rem' }}>
                        <div>{formatDate(request.start_date)}</div>
                        <div style={{ color: '#6b7280' }}>
                          至 {formatDate(request.end_date)}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="font-semibold">{request.total_days} 天</span>
                    </td>
                    <td>
                      {formatDate(request.applied_on)}
                    </td>
                    <td className="actions-cell">
                      <button
                        className="action-btn edit-btn"
                        onClick={() => {
                          setSelectedRequest(request);
                          setShowDetailModal(true);
                        }}
                        title="查看詳情"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        className="action-btn save-btn"
                        onClick={() => handleRequestAction(request.request_id, 'approve', '快速批准')}
                        disabled={isProcessing}
                        title="快速批准"
                      >
                        {isProcessing ? (
                          <Loader size={16} className="animate-spin" />
                        ) : (
                          <CheckCircle size={16} />
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 彈窗 */}
      {renderRequestDetailModal()}
    </div>
  );
};

export default HRLeaveRequests;