import React, { useState, useEffect } from 'react';
import { 
  Search, History, Filter, Eye, AlertCircle, Loader, 
  Calendar, FileText, User, Building
} from 'lucide-react';

const HRLeaveRecords = () => {
  const [allRequests, setAllRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // API base URL
  const API_BASE_URL = 'http://localhost:3001/api';

  // 通用函數
  const showError = (message) => {
    setError(message);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('zh-TW');
  };

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString('zh-TW');
  };

  const getStatusBadgeClass = (status) => {
    switch (status?.toLowerCase()) {
      case 'approved': return 'status-badge active';
      case 'rejected': return 'status-badge locked';
      case 'pending': return 'attempts-badge normal';
      case 'cancelled': return 'badge-default';
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

  // 載入所有申請記錄
  const loadAllRequests = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (typeFilter) params.append('leave_type', typeFilter);
      
      const response = await fetch(`${API_BASE_URL}/holidays/requests?${params.toString()}`);
      const data = await response.json();
      
      if (data.success) {
        setAllRequests(data.data || []);
      } else {
        showError(data.message || '無法載入申請記錄');
      }
    } catch (error) {
      showError('載入記錄失敗，請檢查網路連接');
      console.error('Error loading all requests:', error);
    } finally {
      setLoading(false);
    }
  };

  // 渲染申請詳情彈窗
  const renderRequestDetailModal = () => {
    if (!showDetailModal || !selectedRequest) return null;

    return (
      <div className="modal-overlay" onClick={() => setShowDetailModal(false)}>
        <div className="modal-content modal-large" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <div className="modal-header-content">
              <div className="modal-title-section">
                <h3 className="modal-title-with-icon">
                  <FileText size={24} />
                  申請記錄詳情
                </h3>
                <p>申請編號: {selectedRequest.request_id}</p>
              </div>
              <button 
                className="close-btn" 
                onClick={() => setShowDetailModal(false)}
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
                    ID: {selectedRequest.staff_id}
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
                  {formatDateTime(selectedRequest.applied_on)}
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

            {/* 審核資訊 */}
            {(selectedRequest.approved_by_name || selectedRequest.approved_on) && (
              <div style={{ marginTop: '1.5rem' }}>
                <h4 style={{ marginBottom: '0.5rem', color: '#2e382e' }}>審核資訊</h4>
                <div style={{
                  padding: '1rem',
                  backgroundColor: selectedRequest.status === 'Approved' ? '#ecfdf5' : '#fef2f2',
                  borderRadius: '8px',
                  border: `1px solid ${selectedRequest.status === 'Approved' ? '#86efac' : '#fca5a5'}`
                }}>
                  {selectedRequest.approved_by_name && (
                    <div style={{ marginBottom: '0.5rem' }}>
                      <strong>審核人員:</strong> {selectedRequest.approved_by_name}
                    </div>
                  )}
                  {selectedRequest.approved_on && (
                    <div style={{ marginBottom: '0.5rem' }}>
                      <strong>審核日期:</strong> {formatDateTime(selectedRequest.approved_on)}
                    </div>
                  )}
                  {selectedRequest.rejection_reason && (
                    <div>
                      <strong>備註:</strong> {selectedRequest.rejection_reason}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button
              className="btn btn-secondary"
              onClick={() => setShowDetailModal(false)}
            >
              關閉
            </button>
          </div>
        </div>
      </div>
    );
  };

  // 載入數據
  useEffect(() => {
    loadAllRequests();
  }, [statusFilter, typeFilter]);

  // 篩選記錄
  const filteredRecords = allRequests.filter(request => {
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
          
          <select
            className="search-input"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ minWidth: '140px' }}
          >
            <option value="">所有狀態</option>
            <option value="pending">待審核</option>
            <option value="approved">已批准</option>
            <option value="rejected">已拒絕</option>
            <option value="cancelled">已取消</option>
          </select>

          <select
            className="search-input"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            style={{ minWidth: '140px' }}
          >
            <option value="">所有類型</option>
            <option value="sick_leave">病假</option>
            <option value="annual_leave">年假</option>
            <option value="casual_leave">事假</option>
            <option value="maternity_leave">產假</option>
            <option value="paternity_leave">陪產假</option>
          </select>

          <button
            className="btn btn-primary"
            onClick={loadAllRequests}
            disabled={loading}
          >
            <History size={20} className="btn-icon" />
            重新整理
          </button>

          <button
            className="btn btn-secondary"
            onClick={() => {
              setSearchInput('');
              setStatusFilter('');
              setTypeFilter('');
            }}
          >
            <Filter size={20} className="btn-icon" />
            清除篩選
          </button>
        </div>
      </div>

      {/* 錯誤訊息 */}
      {error && (
        <div className="error-message" style={{ margin: '0', borderRadius: '0' }}>
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* 內容 */}
      <div className="content">
        <h2 className="result-title">
          申請記錄 ({filteredRecords.length})
        </h2>

        {loading ? (
          <div className="loading-state">
            <Loader size={48} className="animate-spin" />
            <div>載入記錄資料中...</div>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="empty-state">
            <History size={64} />
            <h3>沒有找到申請記錄</h3>
            <p>沒有符合篩選條件的申請記錄</p>
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
                  <th>狀態</th>
                  <th>申請日期</th>
                  <th>審核人</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map((request) => (
                  <tr key={request.request_id} className="table-row">
                    <td>
                      <span className="staff-id">#{request.request_id}</span>
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
                      <span className={getStatusBadgeClass(request.status)}>
                        {getStatusLabel(request.status)}
                      </span>
                    </td>
                    <td>
                      {formatDate(request.applied_on)}
                    </td>
                    <td>
                      <div style={{ fontSize: '0.875rem' }}>
                        {request.approved_by_name || '-'}
                        {request.approved_on && (
                          <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                            {formatDate(request.approved_on)}
                          </div>
                        )}
                      </div>
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

export default HRLeaveRecords;