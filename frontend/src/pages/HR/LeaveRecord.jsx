import React, { useState, useEffect } from 'react';
import { 
  Search, RefreshCw, Eye, AlertCircle, Loader, History,
  Trash2, FileText, User, Building
} from 'lucide-react';

const HRLeaveRecords = () => {
  const [allRequests, setAllRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // API
  const getApiUrl = () => {
    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
      return 'http://localhost:3001';
    }
    return import.meta.env.VITE_API_URL || 'http://localhost:3001';
  };

  const API_BASE_URL = `${getApiUrl()}/api`;

  // Utility functions
  const showError = (message) => {
    setError(message);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US');
  };

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString('en-US');
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
      'sick_leave': 'Sick Leave',
      'annual_leave': 'Annual Leave',
      'casual_leave': 'Casual Leave',
      'maternity_leave': 'Maternity Leave',
      'paternity_leave': 'Paternity Leave'
    };
    return labels[type] || type;
  };

  const getStatusLabel = (status) => {
    const labels = {
      'Pending': 'Pending',
      'Approved': 'Approved',
      'Rejected': 'Rejected',
      'Cancelled': 'Cancelled'
    };
    return labels[status] || status;
  };

  // Load all request records
  const loadAllRequests = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/holidays/requests`);
      const data = await response.json();
      
      if (data.success) {
        setAllRequests(data.data || []);
      } else {
        showError(data.message || 'Unable to load request records');
      }
    } catch (error) {
      showError('Failed to load records, please check network connection');
      console.error('Error loading all requests:', error);
    } finally {
      setLoading(false);
    }
  };

  // Render request detail modal
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
                  Request Record Details
                </h3>
                <p>Request ID: {selectedRequest.request_id}</p>
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
            {/* Employee Information */}
            <div className="selected-staff-preview">
              <h4 className="preview-title">
                <User size={16} />
                Employee Information
              </h4>
              <div className="selected-staff-content">
                <div className="selected-staff-avatar">
                  {selectedRequest.staff_name?.charAt(0)?.toUpperCase()}
                </div>
                <div className="selected-staff-info">
                  <div className="selected-staff-name">{selectedRequest.staff_name}</div>
                  <div className="selected-staff-detail">
                    <Building size={12} /> {selectedRequest.department_name || 'Unassigned Department'}
                  </div>
                  <div className="selected-staff-detail">
                    <User size={12} /> {selectedRequest.position_title || 'Unassigned Position'}
                  </div>
                  <div className="selected-staff-detail">
                    ID: {selectedRequest.staff_id}
                  </div>
                </div>
              </div>
            </div>

            {/* Leave Request Details */}
            <div className="salary-form-grid">
              <div className="form-group">
                <label>Leave Type</label>
                <div className="form-input" style={{ background: '#f8f9fa' }}>
                  <span className="position-badge">
                    {getLeaveTypeLabel(selectedRequest.leave_type)}
                  </span>
                </div>
              </div>

              <div className="form-group">
                <label>Request Status</label>
                <div className="form-input" style={{ background: '#f8f9fa' }}>
                  <span className={getStatusBadgeClass(selectedRequest.status)}>
                    {getStatusLabel(selectedRequest.status)}
                  </span>
                </div>
              </div>

              <div className="form-group">
                <label>Start Date</label>
                <div className="form-input" style={{ background: '#f8f9fa' }}>
                  {formatDate(selectedRequest.start_date)}
                </div>
              </div>

              <div className="form-group">
                <label>End Date</label>
                <div className="form-input" style={{ background: '#f8f9fa' }}>
                  {formatDate(selectedRequest.end_date)}
                </div>
              </div>

              <div className="form-group">
                <label>Leave Days</label>
                <div className="form-input" style={{ background: '#f8f9fa' }}>
                  <strong>{selectedRequest.total_days} days</strong>
                </div>
              </div>

              <div className="form-group">
                <label>Application Date</label>
                <div className="form-input" style={{ background: '#f8f9fa' }}>
                  {formatDateTime(selectedRequest.applied_on)}
                </div>
              </div>
            </div>

            <div className="form-group">
              <label>Leave Reason</label>
              <div className="form-input" style={{ background: '#f8f9fa', minHeight: '80px' }}>
                {selectedRequest.reason}
              </div>
            </div>

            {selectedRequest.emergency_contact && (
              <div className="form-group">
                <label>Emergency Contact</label>
                <div className="form-input" style={{ background: '#f8f9fa' }}>
                  {selectedRequest.emergency_contact}
                </div>
              </div>
            )}

            {/* Review Information */}
            {(selectedRequest.approved_by_name || selectedRequest.approved_on) && (
              <div style={{ marginTop: '1.5rem' }}>
                <h4 style={{ marginBottom: '0.5rem', color: '#2e382e' }}>Review Information</h4>
                <div style={{
                  padding: '1rem',
                  backgroundColor: selectedRequest.status === 'Approved' ? '#ecfdf5' : '#fef2f2',
                  borderRadius: '8px',
                  border: `1px solid ${selectedRequest.status === 'Approved' ? '#86efac' : '#fca5a5'}`
                }}>
                  {selectedRequest.approved_by_name && (
                    <div style={{ marginBottom: '0.5rem' }}>
                      <strong>Reviewer:</strong> {selectedRequest.approved_by_name}
                    </div>
                  )}
                  {selectedRequest.approved_on && (
                    <div style={{ marginBottom: '0.5rem' }}>
                      <strong>Review Date:</strong> {formatDateTime(selectedRequest.approved_on)}
                    </div>
                  )}
                  {selectedRequest.rejection_reason && (
                    <div>
                      <strong>Comments:</strong> {selectedRequest.rejection_reason}
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
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Load data
  useEffect(() => {
    loadAllRequests();
  }, []);

  // Filter records - Enhanced with Staff ID search
  const filteredRecords = allRequests.filter(request => {
    const matchesSearch = searchInput === '' || 
      request.staff_name.toLowerCase().includes(searchInput.toLowerCase()) ||
      request.staff_id.toString().toLowerCase().includes(searchInput.toLowerCase()) ||
      request.leave_type.toLowerCase().includes(searchInput.toLowerCase());
    return matchesSearch;
  });

  return (
    <div style={{ minHeight: '100vh' }}>
      {/* Control Area */}
      <div className="controls">
        <div className="controls-wrapper">
          <div className="search-container">
            <div className="search-input-wrapper">
              <Search className="search-icon" size={20} />
              <input
                type="text"
                className="search-input"
                placeholder="Search employee name, staff ID, or leave type..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>
          </div>

          <button
            className="btn btn-primary"
            onClick={loadAllRequests}
            disabled={loading}
          >
            <RefreshCw size={20} className="btn-icon" />
            Refresh
          </button>

          {searchInput && (
            <button
              className="btn btn-secondary"
              onClick={() => setSearchInput('')}
            >
              <Trash2 size={20} className="btn-icon" />
              Clear Search
            </button>
          )}
        </div>
      </div>

      {/* Error Messages */}
      {error && (
        <div className="error-message" style={{ margin: '0', borderRadius: '0' }}>
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* Content */}
      <div className="content">
        <h2 className="result-title">
          Request Records ({filteredRecords.length})
        </h2>

        {loading ? (
          <div className="loading-state">
            <Loader size={48} className="animate-spin" />
            <div>Loading record data...</div>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="empty-state">
            <History size={64} />
            <h3>No Request Records Found</h3>
            <p>No request records match the search criteria</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="staff-table">
              <thead className="table-header">
                <tr>
                  <th>Request ID</th>
                  <th>Employee Info</th>
                  <th>Leave Type</th>
                  <th>Date Range</th>
                  <th>Days</th>
                  <th>Status</th>
                  <th>Applied Date</th>
                  <th>Reviewer</th>
                  <th>Actions</th>
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
                          {request.department_name || 'Unassigned Department'}
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
                          to {formatDate(request.end_date)}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="font-semibold">{request.total_days} days</span>
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
                        title="View Details"
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

      {/* Modal */}
      {renderRequestDetailModal()}
    </div>
  );
};

export default HRLeaveRecords;