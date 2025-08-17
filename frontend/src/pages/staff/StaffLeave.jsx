import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Clock, 
  FileText, 
  Plus, 
  Search, 
  Filter,
  CheckCircle,
  XCircle,
  Loader,
  AlertCircle,
  User,
  Mail,
  Phone,
  Building
} from 'lucide-react';

const StaffLeave = () => {
  // State management
  const [leaveQuota, setLeaveQuota] = useState(null);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Current user (這裡假設從認證系統獲取)
  const currentUser = {
    staff_id: 100001, // 應該從 JWT token 或 context 獲取
    name: "John Doe",
    email: "john.doe@company.com",
    role: "Employee"
  };

  // Fetch leave quota and requests
  useEffect(() => {
    fetchLeaveData();
  }, []);

  const fetchLeaveData = async () => {
    try {
      setLoading(true);
      
      // Fetch leave quota
      const quotaResponse = await fetch(`/api/holidays/quotas/${currentUser.staff_id}`);
      if (quotaResponse.ok) {
        const quotaData = await quotaResponse.json();
        setLeaveQuota(quotaData.data);
      }

      // Fetch leave requests
      const requestsResponse = await fetch(`/api/holidays/requests?staff_id=${currentUser.staff_id}`);
      if (requestsResponse.ok) {
        const requestsData = await requestsResponse.json();
        setLeaveRequests(requestsData.data || []);
      }

    } catch (err) {
      setError('無法載入假期資料');
      console.error('Error fetching leave data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Filter requests based on status and search
  const filteredRequests = leaveRequests.filter(request => {
    const matchesStatus = statusFilter === 'all' || request.status.toLowerCase() === statusFilter.toLowerCase();
    const matchesSearch = searchTerm === '' || 
      request.leave_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.reason.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  // Leave application form component
  const LeaveApplicationModal = () => {
    const [formData, setFormData] = useState({
      leave_type: 'casual_leave',
      start_date: '',
      end_date: '',
      reason: '',
      emergency_contact: '',
      medical_certificate: false
    });
    const [submitting, setSubmitting] = useState(false);
    const [formError, setFormError] = useState('');

    const handleSubmit = async (e) => {
      e.preventDefault();
      setSubmitting(true);
      setFormError('');

      try {
        const response = await fetch('/api/holidays/requests', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...formData,
            staff_id: currentUser.staff_id
          })
        });

        const result = await response.json();
        
        if (result.success) {
          setShowApplyModal(false);
          fetchLeaveData(); // Refresh data
          // Show success message (你可以添加 toast notification)
        } else {
          setFormError(result.message || '申請失敗');
        }
      } catch (err) {
        setFormError('網路錯誤，請稍後再試');
      } finally {
        setSubmitting(false);
      }
    };

    if (!showApplyModal) return null;

    return (
      <div className="modal-overlay" onClick={() => setShowApplyModal(false)}>
        <div className="modal-content modal-large" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <div className="modal-header-content">
              <div className="modal-title-section">
                <h3 className="modal-title-with-icon">
                  <FileText size={24} />
                  申請假期
                </h3>
                <p>請填寫以下資訊提交假期申請</p>
              </div>
              <button 
                className="close-btn" 
                onClick={() => setShowApplyModal(false)}
                disabled={submitting}
              >
                ×
              </button>
            </div>
          </div>

          <div>
            <div className="modal-body">
              {formError && (
                <div className="error-message">
                  <AlertCircle size={16} />
                  {formError}
                </div>
              )}

              <div className="salary-form-grid">
                <div className="form-group">
                  <label className="form-label-with-icon">
                    <Calendar size={16} />
                    假期類型 <span className="required">*</span>
                  </label>
                  <select
                    className="form-select"
                    value={formData.leave_type}
                    onChange={(e) => setFormData({...formData, leave_type: e.target.value})}
                    required
                  >
                    <option value="casual_leave">事假</option>
                    <option value="sick_leave">病假</option>
                    <option value="annual_leave">年假</option>
                    <option value="maternity_leave">產假</option>
                    <option value="paternity_leave">陪產假</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label-with-icon">
                    <Calendar size={16} />
                    開始日期 <span className="required">*</span>
                  </label>
                  <input
                    type="date"
                    className="form-input"
                    value={formData.start_date}
                    onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label-with-icon">
                    <Calendar size={16} />
                    結束日期 <span className="required">*</span>
                  </label>
                  <input
                    type="date"
                    className="form-input"
                    value={formData.end_date}
                    onChange={(e) => setFormData({...formData, end_date: e.target.value})}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label-with-icon">
                    <Phone size={16} />
                    緊急聯絡電話
                  </label>
                  <input
                    type="tel"
                    className="form-input"
                    value={formData.emergency_contact}
                    onChange={(e) => setFormData({...formData, emergency_contact: e.target.value})}
                    placeholder="選填"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label-with-icon">
                  <FileText size={16} />
                  請假原因 <span className="required">*</span>
                </label>
                <textarea
                  className="form-input"
                  rows="4"
                  value={formData.reason}
                  onChange={(e) => setFormData({...formData, reason: e.target.value})}
                  placeholder="請詳細說明請假原因..."
                  required
                />
              </div>

              {formData.leave_type === 'sick_leave' && (
                <div className="form-group">
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="checkbox"
                      checked={formData.medical_certificate}
                      onChange={(e) => setFormData({...formData, medical_certificate: e.target.checked})}
                    />
                    已提供醫生證明
                  </label>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowApplyModal(false)}
                disabled={submitting}
              >
                取消
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Loader size={16} className="animate-spin" />
                    提交中...
                  </>
                ) : (
                  <>
                    <CheckCircle size={16} />
                    提交申請
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Request details modal
  const RequestDetailsModal = () => {
    if (!selectedRequest) return null;

    return (
      <div className="modal-overlay" onClick={() => setSelectedRequest(null)}>
        <div className="modal-content" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <div className="modal-header-content">
              <div className="modal-title-section">
                <h3 className="modal-title-with-icon">
                  <FileText size={24} />
                  申請詳情
                </h3>
                <p>申請編號: {selectedRequest.request_id}</p>
              </div>
              <button 
                className="close-btn" 
                onClick={() => setSelectedRequest(null)}
              >
                ×
              </button>
            </div>
          </div>

          <div className="modal-body">
            <div className="salary-form-grid">
              <div className="form-group">
                <label>假期類型</label>
                <div className="form-input" style={{ background: '#f8f9fa' }}>
                  {getLeaveTypeLabel(selectedRequest.leave_type)}
                </div>
              </div>

              <div className="form-group">
                <label>申請狀態</label>
                <div className="form-input" style={{ background: '#f8f9fa' }}>
                  <span className={`status-badge ${selectedRequest.status.toLowerCase()}`}>
                    {getStatusLabel(selectedRequest.status)}
                  </span>
                </div>
              </div>

              <div className="form-group">
                <label>開始日期</label>
                <div className="form-input" style={{ background: '#f8f9fa' }}>
                  {new Date(selectedRequest.start_date).toLocaleDateString('zh-TW')}
                </div>
              </div>

              <div className="form-group">
                <label>結束日期</label>
                <div className="form-input" style={{ background: '#f8f9fa' }}>
                  {new Date(selectedRequest.end_date).toLocaleDateString('zh-TW')}
                </div>
              </div>

              <div className="form-group">
                <label>請假天數</label>
                <div className="form-input" style={{ background: '#f8f9fa' }}>
                  {selectedRequest.total_days} 天
                </div>
              </div>

              <div className="form-group">
                <label>申請日期</label>
                <div className="form-input" style={{ background: '#f8f9fa' }}>
                  {new Date(selectedRequest.applied_on).toLocaleDateString('zh-TW')}
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
                  {selectedRequest.emergency_contact}
                </div>
              </div>
            )}

            {selectedRequest.rejection_reason && (
              <div className="form-group">
                <label>拒絕原因</label>
                <div className="form-input" style={{ background: '#fee2e2', border: '1px solid #fca5a5' }}>
                  {selectedRequest.rejection_reason}
                </div>
              </div>
            )}

            {selectedRequest.approved_by_name && (
              <div className="form-group">
                <label>審核人員</label>
                <div className="form-input" style={{ background: '#f8f9fa' }}>
                  {selectedRequest.approved_by_name}
                </div>
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button
              className="btn btn-secondary"
              onClick={() => setSelectedRequest(null)}
            >
              關閉
            </button>
            {selectedRequest.status === 'Pending' && (
              <button
                className="btn btn-danger"
                onClick={() => handleCancelRequest(selectedRequest.request_id)}
              >
                <XCircle size={16} />
                取消申請
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Cancel request function
  const handleCancelRequest = async (requestId) => {
    try {
      const response = await fetch(`/api/holidays/requests/${requestId}/cancel`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          staff_id: currentUser.staff_id,
          reason: '員工主動取消'
        })
      });

      if (response.ok) {
        setSelectedRequest(null);
        fetchLeaveData(); // Refresh data
      }
    } catch (err) {
      console.error('Error cancelling request:', err);
    }
  };

  // Helper functions
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

  const getStatusBadgeClass = (status) => {
    switch (status.toLowerCase()) {
      case 'approved': return 'active';
      case 'pending': return 'warning';
      case 'rejected': return 'locked';
      case 'cancelled': return 'default';
      default: return 'default';
    }
  };

  if (loading) {
    return (
      <div className="main-card">
        <div className="loading-state">
          <Loader size={48} className="animate-spin" />
          <div>載入假期資料中...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="main-card">
        <div className="error-message">
          <AlertCircle size={20} />
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="main-card">
      {/* Header */}
      <div className="header">
        <h1>假期管理</h1>
        <p>管理您的假期申請和查看假期餘額</p>
      </div>

      {/* Leave Quota Dashboard */}
      {leaveQuota && (
        <div className="salary-stats-dashboard">
          <div className="stats-header">
            <h3>假期餘額總覽</h3>
          </div>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon total">
                <Calendar size={24} />
              </div>
              <div className="stat-content">
                <div className="stat-value">{leaveQuota.al_remaining || 0}</div>
                <div className="stat-label">年假餘額</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon average">
                <Clock size={24} />
              </div>
              <div className="stat-content">
                <div className="stat-value">{leaveQuota.sl_remaining || 0}</div>
                <div className="stat-label">病假餘額</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon highest">
                <FileText size={24} />
              </div>
              <div className="stat-content">
                <div className="stat-value">{leaveQuota.cl_remaining || 0}</div>
                <div className="stat-label">事假餘額</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon employees">
                <User size={24} />
              </div>
              <div className="stat-content">
                <div className="stat-value">{leaveRequests.filter(r => r.status === 'Pending').length}</div>
                <div className="stat-label">待審核申請</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="controls">
        <div className="controls-wrapper">
          <div className="search-container">
            <div className="search-input-wrapper">
              <Search className="search-icon" size={20} />
              <input
                type="text"
                className="search-input"
                placeholder="搜尋假期類型或原因..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="filter-container">
            <select
              className="search-input"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">所有狀態</option>
              <option value="pending">待審核</option>
              <option value="approved">已批准</option>
              <option value="rejected">已拒絕</option>
              <option value="cancelled">已取消</option>
            </select>
          </div>

          <button
            className="btn btn-primary"
            onClick={() => setShowApplyModal(true)}
          >
            <Plus size={20} className="btn-icon" />
            申請假期
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="content">
        <h2 className="result-title">
          我的假期申請 ({filteredRequests.length})
        </h2>

        {filteredRequests.length === 0 ? (
          <div className="empty-state">
            <FileText size={64} />
            <h3>沒有找到申請記錄</h3>
            <p>您還沒有任何假期申請，或者沒有符合篩選條件的記錄</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="staff-table">
              <thead className="table-header">
                <tr>
                  <th>申請編號</th>
                  <th>假期類型</th>
                  <th>日期</th>
                  <th>天數</th>
                  <th>申請日期</th>
                  <th>狀態</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredRequests.map((request) => (
                  <tr key={request.request_id} className="table-row">
                    <td>
                      <span className="staff-id">#{request.request_id}</span>
                    </td>
                    <td>
                      <span className="position-badge">
                        {getLeaveTypeLabel(request.leave_type)}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.875rem' }}>
                        <div>{new Date(request.start_date).toLocaleDateString('zh-TW')}</div>
                        <div style={{ color: '#6b7280' }}>
                          至 {new Date(request.end_date).toLocaleDateString('zh-TW')}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="font-semibold">{request.total_days} 天</span>
                    </td>
                    <td>
                      {new Date(request.applied_on).toLocaleDateString('zh-TW')}
                    </td>
                    <td>
                      <span className={`status-badge ${getStatusBadgeClass(request.status)}`}>
                        {getStatusLabel(request.status)}
                      </span>
                    </td>
                    <td className="actions-cell">
                      <button
                        className="action-btn edit-btn"
                        onClick={() => setSelectedRequest(request)}
                        title="查看詳情"
                      >
                        <FileText size={16} />
                      </button>
                      {request.status === 'Pending' && (
                        <button
                          className="action-btn cancel-btn"
                          onClick={() => handleCancelRequest(request.request_id)}
                          title="取消申請"
                        >
                          <XCircle size={16} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      <LeaveApplicationModal />
      <RequestDetailsModal />
    </div>
  );
};

export default StaffLeave;