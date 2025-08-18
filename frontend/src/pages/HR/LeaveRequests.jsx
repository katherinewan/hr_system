import React, { useState, useEffect } from 'react';
import { 
  Search, Eye, CheckCircle, XCircle, User, Mail, Phone, Building, Trash2, 
  AlertCircle, Loader, FileText, History
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
    setSuccessMessage('');
  };

  const showSuccess = (message) => {
    setSuccessMessage(message);
    setError('');
    setTimeout(() => setSuccessMessage(''), 5000);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US');
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

  const loadPendingRequests = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await fetch(`${API_BASE_URL}/holidays/requests/pending`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('HTTP Error Details:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText
        });
        
        if (response.status === 404) {
          showError('API endpoint does not exist. Please check backend server and route configuration.');
        } else if (response.status === 500) {
          showError('Internal server error. Please check backend logs.');
        } else {
          showError(`HTTP Error ${response.status}: ${response.statusText}`);
        }
        return;
      }
      
      const data = await response.json();
      
      if (data.success) {
        setPendingRequests(data.data || []);
        showSuccess(`Successfully loaded ${data.count || 0} pending requests`);
      } else {
        showError(data.message || 'Unable to load pending requests');
      }
      
    } catch (error) {
      console.error('Complete error details:', error);
      
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        showError('Network connection failed. Please confirm backend server is running.');
      } else {
        showError(`Loading failed: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle request action (approve/reject)
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
          approver_id: 100002,
          comments: comments || undefined
        })
      });

      const result = await response.json();
      
      if (result.success) {
        showSuccess(`Request has been ${action === 'approve' ? 'approved' : 'rejected'}`);
        setShowDetailModal(false);
        loadPendingRequests();
      } else {
        showError(result.message || 'Operation failed');
      }
    } catch (error) {
      showError('Network error, please try again later');
      console.error('Error processing request:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Render request detail modal
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
                  Leave Request Review
                </h3>
                <p>Request ID: {selectedRequest.request_id}</p>
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
                    <Mail size={12} /> {selectedRequest.staff_email}
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
                  {formatDate(selectedRequest.applied_on)}
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
                  <Phone size={16} style={{ display: 'inline', marginRight: '8px' }} />
                  {selectedRequest.emergency_contact}
                </div>
              </div>
            )}

            {selectedRequest.medical_certificate && (
              <div className="form-group">
                <div className="info-box">
                  <CheckCircle size={16} style={{ color: '#10b981', display: 'inline', marginRight: '8px' }} />
                  <strong>Medical Certificate Provided</strong>
                </div>
              </div>
            )}

            {/* Reject Form */}
            {showRejectForm && (
              <div className="form-group">
                <label className="form-label-with-icon">
                  <AlertCircle size={16} />
                  Rejection Reason <span className="required">*</span>
                </label>
                <textarea
                  className="form-input"
                  rows="4"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Please explain the reason for rejecting this leave request..."
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
              Close
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
                      Reject
                    </button>
                    <button
                      className="btn btn-success"
                      onClick={() => handleRequestAction(selectedRequest.request_id, 'approve', 'Approved')}
                      disabled={isProcessing}
                    >
                      {isProcessing ? (
                        <>
                          <Loader size={16} className="animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <CheckCircle size={16} />
                          Approve
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
                      Cancel
                    </button>
                    <button
                      className="btn btn-danger"
                      onClick={() => handleRequestAction(selectedRequest.request_id, 'reject', rejectReason)}
                      disabled={isProcessing || !rejectReason.trim()}
                    >
                      {isProcessing ? (
                        <>
                          <Loader size={16} className="animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <XCircle size={16} />
                          Confirm Rejection
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

  // Load data
  useEffect(() => {
    loadPendingRequests();
  }, []);

  // Filter requests - Enhanced with Staff ID search
  const filteredRequests = pendingRequests.filter(request => {
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
            onClick={loadPendingRequests}
            disabled={loading}
          >
            <History size={20} className="btn-icon" />
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

      {/* Success/Error Messages */}
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

      {/* Content */}
      <div className="content">
        <h2 className="result-title">
          Pending Requests ({filteredRequests.length})
        </h2>

        {loading ? (
          <div className="loading-state">
            <Loader size={48} className="animate-spin" />
            <div>Loading request data...</div>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="empty-state">
            <FileText size={64} />
            <h3>No Pending Requests</h3>
            <p>There are currently no leave requests requiring review</p>
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
                  <th>Applied Date</th>
                  <th>Actions</th>
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
                          Pending {request.days_pending} days
                        </div>
                      )}
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
                      {request.medical_certificate && (
                        <div style={{ fontSize: '0.7rem', color: '#10b981', marginTop: '2px' }}>
                          <CheckCircle size={12} style={{ display: 'inline', marginRight: '4px' }} />
                          Medical Cert
                        </div>
                      )}
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
                      {formatDate(request.applied_on)}
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
                      <button
                        className="action-btn save-btn"
                        onClick={() => handleRequestAction(request.request_id, 'approve', 'Quick Approval')}
                        disabled={isProcessing}
                        title="Quick Approve"
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

      {/* Modal */}
      {renderRequestDetailModal()}
    </div>
  );
};

export default HRLeaveRequests;