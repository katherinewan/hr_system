import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Clock, 
  FileText, 
  Plus, 
  Search,
  CheckCircle,
  XCircle,
  Loader,
  AlertCircle,
  User,
  Phone
} from 'lucide-react';

const StaffLeave = () => {
  const [leaveQuota, setLeaveQuota] = useState(null);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    initializeComponent();
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchLeaveData();
      fetchLeaveQuota();
    }
  }, [currentUser]);

  const initializeComponent = async () => {
    try {
      await fetchCurrentUser();
    } catch (error) {
      setError('Failed to initialize. Please log in first.');
      setLoading(false);
    }
  };

  const fetchCurrentUser = async () => {
    try {
      // Try to get from localStorage first - é…åˆä½ çš„ç™»å…¥é é¢æ ¼å¼
      const storedUserInfo = localStorage.getItem('userInfo');
      const storedToken = localStorage.getItem('authToken');
      
      if (storedUserInfo) {
        const user = JSON.parse(storedUserInfo);
        // ç¢ºä¿ä½¿ç"¨æ­£ç¢ºçš„ staff_id æ ¼å¼ (æ‡‰è©²æ˜¯ 1001-1020 ç¯„åœ)
        setCurrentUser({ staff_id: user.staff_id });
        return;
      }

      // Try API call with auth token if available
      if (storedToken) {
        const response = await fetch('/api/auth/me', {
          headers: {
            'Authorization': `Bearer ${storedToken}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.user) {
            setCurrentUser({ staff_id: data.user.staff_id });
            return;
          }
        }
      }
      
      // No valid user found - redirect to login
      window.location.href = '/login';
      
    } catch (error) {
      window.location.href = '/login';
    }
  };

  const fetchLeaveData = async () => {
    try {
      setError(null);
      
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/holidays/requests/staff/${currentUser.staff_id}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setLeaveRequests(data.data || []);
        } else {
          setError(data.message || 'Failed to retrieve leave records');
        }
      } else if (response.status === 401) {
        // Unauthorized - redirect to login
        localStorage.clear();
        window.location.href = '/login';
      } else {
        setError('Unable to connect to server');
      }

    } catch (err) {
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const fetchLeaveQuota = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/holidays/quotas/${currentUser.staff_id}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setLeaveQuota(data.data);
        }
      } else if (response.status === 401) {
        localStorage.clear();
        window.location.href = '/login';
      }
    } catch (err) {
      console.log('Failed to fetch leave quota');
    }
  };

  const filteredRequests = leaveRequests.filter(request => {
    const matchesStatus = statusFilter === 'all' || request.status.toLowerCase() === statusFilter.toLowerCase();
    const matchesSearch = searchTerm === '' || 
      request.leave_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.reason.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

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
        const token = localStorage.getItem('authToken');
        const response = await fetch('/api/holidays/requests', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
          },
          body: JSON.stringify({
            ...formData,
            staff_id: currentUser.staff_id
          })
        });

        const result = await response.json();
        
        if (response.ok && result.success) {
          setShowApplyModal(false);
          fetchLeaveData();
          return;
        }
        
        setFormError(result.message || 'Failed to submit application');
        
      } catch (err) {
        setFormError('Network error occurred');
      } finally {
        setSubmitting(false);
      }
    };

    if (!showApplyModal) return null;

    return (
      <div className="modal-overlay" onClick={() => setShowApplyModal(false)}>
        <div className="modal-content modal-large" onClick={e => e.stopPropagation()}>
          <div className="profile-header">
            <div className="header-content">
              <div className="user-info">
                <div className="avatar">
                  <FileText size={24} />
                </div>
                <div className="user-details">
                  <h1 className="user-name">Apply for Leave</h1>
                  <p className="user-position">Please fill in all required information</p>
                </div>
              </div>
              <div className="action-buttons">
                <button 
                  className="cancel-button" 
                  onClick={() => setShowApplyModal(false)}
                  disabled={submitting}
                >
                  ×
                </button>
              </div>
            </div>
          </div>

          <div className="profile-content">
            {formError && (
              <div className="error-banner">
                <AlertCircle size={16} />
                <span>{formError}</span>
              </div>
            )}

            <div className="info-grid">
              <div className="info-item">
                <Calendar size={20} className="info-icon" />
                <div className="info-content">
                  <p className="info-label">Leave Type *</p>
                  <select
                    className="edit-input"
                    value={formData.leave_type}
                    onChange={(e) => setFormData({...formData, leave_type: e.target.value})}
                    required
                  >
                    <option value="casual_leave">Casual Leave</option>
                    <option value="sick_leave">Sick Leave</option>
                    <option value="annual_leave">Annual Leave</option>
                    <option value="maternity_leave">Maternity Leave</option>
                    <option value="paternity_leave">Paternity Leave</option>
                  </select>
                </div>
              </div>

              <div className="info-item">
                <Calendar size={20} className="info-icon" />
                <div className="info-content">
                  <p className="info-label">Start Date *</p>
                  <input
                    type="date"
                    className="edit-input"
                    value={formData.start_date}
                    onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div className="info-item">
                <Calendar size={20} className="info-icon" />
                <div className="info-content">
                  <p className="info-label">End Date *</p>
                  <input
                    type="date"
                    className="edit-input"
                    value={formData.end_date}
                    onChange={(e) => setFormData({...formData, end_date: e.target.value})}
                    required
                  />
                </div>
              </div>

              <div className="info-item">
                <Phone size={20} className="info-icon" />
                <div className="info-content">
                  <p className="info-label">Emergency Contact</p>
                  <input
                    type="tel"
                    className="edit-input"
                    value={formData.emergency_contact}
                    onChange={(e) => setFormData({...formData, emergency_contact: e.target.value})}
                    placeholder="Optional"
                  />
                </div>
              </div>
            </div>

            <div className="address-item">
              <FileText size={20} className="info-icon" />
              <div className="info-content">
                <p className="info-label">Reason for Leave *</p>
                <textarea
                  className="edit-textarea"
                  rows="4"
                  value={formData.reason}
                  onChange={(e) => setFormData({...formData, reason: e.target.value})}
                  placeholder="Please provide reason for leave..."
                  required
                />
              </div>
            </div>

            {formData.leave_type === 'sick_leave' && (
              <div className="info-item">
                <div className="info-content">
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="checkbox"
                      checked={formData.medical_certificate}
                      onChange={(e) => setFormData({...formData, medical_certificate: e.target.checked})}
                    />
                    <span className="info-label">Medical certificate provided</span>
                  </label>
                </div>
              </div>
            )}

            <div className="action-buttons" style={{ marginTop: '2rem' }}>
              <button
                type="button"
                className="cancel-button"
                onClick={() => setShowApplyModal(false)}
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="save-button"
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Loader size={16} className="animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <CheckCircle size={16} />
                    Submit Application
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const RequestDetailsModal = () => {
    if (!selectedRequest) return null;

    return (
      <div className="modal-overlay" onClick={() => setSelectedRequest(null)}>
        <div className="modal-content" onClick={e => e.stopPropagation()}>
          <div className="profile-header">
            <div className="header-content">
              <div className="user-info">
                <div className="avatar">
                  <FileText size={24} />
                </div>
                <div className="user-details">
                  <h1 className="user-name">Application Details</h1>
                  <p className="user-position">Application ID: {selectedRequest.request_id}</p>
                </div>
              </div>
              <div className="action-buttons">
                <button 
                  className="cancel-button" 
                  onClick={() => setSelectedRequest(null)}
                >
                  ×
                </button>
              </div>
            </div>
          </div>

          <div className="profile-content">
            <div className="info-grid">
              <div className="info-item">
                <Calendar size={20} className="info-icon" />
                <div className="info-content">
                  <p className="info-label">Leave Type</p>
                  <p className="info-value">{getLeaveTypeLabel(selectedRequest.leave_type)}</p>
                </div>
              </div>

              <div className="info-item">
                <AlertCircle size={20} className="info-icon" />
                <div className="info-content">
                  <p className="info-label">Status</p>
                  <p className="info-value">
                    <span className={`status-badge ${getStatusBadgeClass(selectedRequest.status)}`}>
                      {getStatusLabel(selectedRequest.status)}
                    </span>
                  </p>
                </div>
              </div>

              <div className="info-item">
                <Calendar size={20} className="info-icon" />
                <div className="info-content">
                  <p className="info-label">Start Date</p>
                  <p className="info-value">
                    {new Date(selectedRequest.start_date).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="info-item">
                <Calendar size={20} className="info-icon" />
                <div className="info-content">
                  <p className="info-label">End Date</p>
                  <p className="info-value">
                    {new Date(selectedRequest.end_date).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="info-item">
                <Clock size={20} className="info-icon" />
                <div className="info-content">
                  <p className="info-label">Total Days</p>
                  <p className="info-value">{selectedRequest.total_days} days</p>
                </div>
              </div>

              <div className="info-item">
                <Calendar size={20} className="info-icon" />
                <div className="info-content">
                  <p className="info-label">Application Date</p>
                  <p className="info-value">
                    {new Date(selectedRequest.applied_on).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>

            <div className="address-item">
              <FileText size={20} className="info-icon" />
              <div className="info-content">
                <p className="info-label">Reason for Leave</p>
                <div className="info-value" style={{ 
                  minHeight: '80px', 
                  padding: '1rem', 
                  background: '#f8f9fa', 
                  borderRadius: '0.5rem',
                  border: '1px solid #e5e7eb'
                }}>
                  {selectedRequest.reason}
                </div>
              </div>
            </div>

            {selectedRequest.emergency_contact && (
              <div className="info-item">
                <Phone size={20} className="info-icon" />
                <div className="info-content">
                  <p className="info-label">Emergency Contact</p>
                  <p className="info-value">{selectedRequest.emergency_contact}</p>
                </div>
              </div>
            )}

            {selectedRequest.rejection_reason && (
              <div className="address-item">
                <AlertCircle size={20} className="info-icon" />
                <div className="info-content">
                  <p className="info-label">Rejection Reason</p>
                  <div className="info-value" style={{ 
                    background: '#fee2e2', 
                    border: '1px solid #fca5a5', 
                    padding: '1rem', 
                    borderRadius: '0.5rem' 
                  }}>
                    {selectedRequest.rejection_reason}
                  </div>
                </div>
              </div>
            )}

            <div className="action-buttons" style={{ marginTop: '2rem' }}>
              <button
                className="cancel-button"
                onClick={() => setSelectedRequest(null)}
              >
                Close
              </button>
              {selectedRequest.status === 'Pending' && (
                <button
                  className="cancel-button"
                  onClick={() => handleCancelRequest(selectedRequest.request_id)}
                  style={{ background: '#dc2626', color: 'white' }}
                >
                  <XCircle size={16} />
                  Cancel Application
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const handleCancelRequest = async (requestId) => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/holidays/requests/${requestId}/cancel`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify({
          staff_id: currentUser.staff_id,
          reason: 'Staff initiated cancellation'
        })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setSelectedRequest(null);
          fetchLeaveData();
          return;
        }
      }
      
      alert('Failed to cancel application');
    } catch (err) {
      alert('Network error occurred');
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
      'Pending': 'Pending Review',
      'Approved': 'Approved',
      'Rejected': 'Rejected',
      'Cancelled': 'Cancelled'
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
      <div className="staff-profile-container">
        <div className="profile-card">
          <div className="profile-content">
            <div className="loading-state">
              <Loader size={48} className="animate-spin" />
              <div>Loading leave data...</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="staff-profile-container">
        <div className="info-card">
          <div style={{ textAlign: 'center', padding: '2rem', color: '#dc2626' }}>
            <AlertCircle size={48} style={{ margin: '0 auto 1rem' }} />
            <h3 style={{ margin: '0 0 0.5rem 0', color: '#dc2626' }}>Error</h3>
            <p style={{ margin: '0' }}>{error}</p>
            <button 
              className="edit-button" 
              onClick={() => window.location.reload()}
              style={{ marginTop: '1rem' }}
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="staff-profile-container">
      <div className="profile-card">
        {/* Header */}
        <div className="profile-header">
          <div className="header-content">
            <div className="user-info">
              <div className="user-details">
                <h1 className="user-name">My Leave Management</h1>
                <p className="user-position">Staff ID: {currentUser?.staff_id}</p>
              </div>
            </div>
            <div className="action-buttons">
              <button
                className="edit-button"
                onClick={() => setShowApplyModal(true)}
              >
                <Plus size={20} />
                Apply for Leave
              </button>
            </div>
          </div>
        </div>

        {/* Leave Quota Dashboard */}
        {leaveQuota && (
          <div className="salary-stats-dashboard">
            <div className="stats-header">
              <h3>Leave Balance Overview</h3>
            </div>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon total">
                  <Calendar size={24} />
                </div>
                <div className="stat-content">
                  <div className="stat-value">{leaveQuota.al_remaining || 0}</div>
                  <div className="stat-label">Annual Leave Balance</div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon average">
                  <Clock size={24} />
                </div>
                <div className="stat-content">
                  <div className="stat-value">{leaveQuota.sl_remaining || 0}</div>
                  <div className="stat-label">Sick Leave Balance</div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon highest">
                  <FileText size={24} />
                </div>
                <div className="stat-content">
                  <div className="stat-value">{leaveQuota.cl_remaining || 0}</div>
                  <div className="stat-label">Casual Leave Balance</div>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-icon employees">
                  <User size={24} />
                </div>
                <div className="stat-content">
                  <div className="stat-value">{leaveRequests.filter(r => r.status === 'Pending').length}</div>
                  <div className="stat-label">Pending Applications</div>
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
                  placeholder="Search leave type or reason..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="filter-container">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="content">
          <h2 className="result-title">
            My Leave Applications ({filteredRequests.length})
          </h2>

          {filteredRequests.length === 0 ? (
            <div className="empty-state">
              <FileText size={64} />
              <h3>No Application Records Found</h3>
              <p>You haven't submitted any leave applications yet, or no records match your search criteria</p>
            </div>
          ) : (
            <div className="table-container">
              <table className="staff-table">
                <thead className="table-header">
                  <tr>
                    <th>ID</th>
                    <th>Type</th>
                    <th>Date Range</th>
                    <th>Days</th>
                    <th>Status</th>
                    <th>Actions</th>
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
                          <div>{new Date(request.start_date).toLocaleDateString()}</div>
                          <div style={{ color: '#6b7280' }}>
                            to {new Date(request.end_date).toLocaleDateString()}
                          </div>
                        </div>
                      </td>
                      <td>
                        <span style={{ fontWeight: '600' }}>{request.total_days} days</span>
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
                          title="View Details"
                        >
                          <FileText size={16} />
                        </button>
                        {request.status === 'Pending' && (
                          <button
                            className="action-btn cancel-btn"
                            onClick={() => handleCancelRequest(request.request_id)}
                            title="Cancel Application"
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

        <LeaveApplicationModal />
        <RequestDetailsModal />
      </div>
    </div>
  );
};

export default StaffLeave;