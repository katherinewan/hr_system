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
  const [currentUser, setCurrentUser] = useState(null);

  const fetchCurrentUser = async () => {
    try {
      const response = await fetch('/api/auth/me');
      const data = await response.json();
      if (data.success) {
        setCurrentUser({ staff_id: data.user.staff_id });
      }
    } catch (error) {
      console.error('Failed to get current user:', error);
      // 測試時使用默認值
      setCurrentUser({ staff_id: 100001 });
    }
  };

  const fetchLeaveData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // 修改API端點：從 /api/holidays/requests/staff/:staff_id 改為 /api/leave/requests/staff/:staff_id
      const response = await fetch(`/api/leave/requests/staff/${currentUser.staff_id}`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setLeaveRequests(data.data || []);
        } else {
          setError(data.message || 'Failed to retrieve leave records');
        }
      } else {
        throw new Error(`HTTP Error: ${response.status}`);
      }

    } catch (err) {
      setError('Unable to load leave data');
      console.error('Error fetching leave data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchLeaveQuota = async () => {
    try {
      // 修改API端點：從 /api/holidays/quotas/:staff_id 改為 /api/leave/quotas/:staff_id
      const response = await fetch(`/api/leave/quotas/${currentUser.staff_id}`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setLeaveQuota(data.data);
        }
      }
    } catch (err) {
      console.error('Error fetching leave quota:', err);
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
        // 修改API端點：從 /api/holidays/requests 改為 /api/leave/requests
        const response = await fetch('/api/leave/requests', {
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
        } else {
          setFormError(result.message || 'Application failed');
        }
      } catch (err) {
        setFormError('Network error, please try again');
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
                  <p className="user-position">Please fill in the following information to submit your leave application</p>
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
                  placeholder="Please provide detailed reason for leave..."
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

  // Request details modal
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

            {selectedRequest.approved_by_name && (
              <div className="info-item">
                <User size={20} className="info-icon" />
                <div className="info-content">
                  <p className="info-label">Approved By</p>
                  <p className="info-value">{selectedRequest.approved_by_name}</p>
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

  // Cancel request function
  const handleCancelRequest = async (requestId) => {
    try {
      // 修改API端點：從 /api/holidays/requests/:request_id/cancel 改為 /api/leave/requests/:request_id/cancel
      const response = await fetch(`/api/leave/requests/${requestId}/cancel`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          staff_id: currentUser.staff_id,
          reason: 'Staff initiated cancellation'
        })
      });

      const result = await response.json();
      
      if (result.success) {
        setSelectedRequest(null);
        fetchLeaveData(); // Refresh data
      } else {
        console.error('Error cancelling request:', result.message);
        alert(result.message || 'Failed to cancel request');
      }
    } catch (err) {
      console.error('Error cancelling request:', err);
      alert('Network error, please try again');
    }
  };

  // Helper functions
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
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading leave data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="staff-profile-container">
        <div className="profile-card">
          <div className="profile-header">
            <div className="header-content">
              <div className="user-info">
                <div className="avatar">
                  <FileText size={32} />
                </div>
                <div className="user-details">
                  <h1 className="user-name">Leave Management</h1>
                  <p className="user-position">Unable to load leave data</p>
                </div>
              </div>
            </div>
          </div>
          <div className="profile-content">
            <div className="error-message">
              <AlertCircle size={20} />
              <span>{error}</span>
            </div>
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
          <div className="profile-content" style={{ paddingBottom: 0 }}>
            <h2 className="section-title">Leave Balance Overview</h2>
            <div className="info-card">
              <div className="info-grid">
                <div className="info-item">
                  <div className="info-icon">
                    <Calendar size={24} color="#10b981" />
                  </div>
                  <div className="info-content">
                    <p className="info-label">Annual Leave Balance</p>
                    <p className="info-value">{leaveQuota.al_remaining || 0} days</p>
                  </div>
                </div>

                <div className="info-item">
                  <div className="info-icon">
                    <Clock size={24} color="#3b82f6" />
                  </div>
                  <div className="info-content">
                    <p className="info-label">Sick Leave Balance</p>
                    <p className="info-value">{leaveQuota.sl_remaining || 0} days</p>
                  </div>
                </div>

                <div className="info-item">
                  <div className="info-icon">
                    <FileText size={24} color="#f59e0b" />
                  </div>
                  <div className="info-content">
                    <p className="info-label">Casual Leave Balance</p>
                    <p className="info-value">{leaveQuota.cl_remaining || 0} days</p>
                  </div>
                </div>

                <div className="info-item">
                  <div className="info-icon">
                    <User size={24} color="#8b5cf6" />
                  </div>
                  <div className="info-content">
                    <p className="info-label">Pending Applications</p>
                    <p className="info-value">{leaveRequests.filter(r => r.status === 'Pending').length}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="profile-content" style={{ paddingTop: 0, paddingBottom: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '300px' }}>
              <Search size={20} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#6b7280' }} />
              <input
                type="text"
                className="edit-input"
                style={{ paddingLeft: '2.5rem' }}
                placeholder="Search leave type or reason..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <select
              className="edit-input"
              style={{ minWidth: '150px' }}
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

        {/* Content */}
        <div className="profile-content">
          <h2 className="section-title">
            My Leave Applications ({filteredRequests.length})
          </h2>

          {filteredRequests.length === 0 ? (
            <div className="info-card">
              <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                <h3 style={{ margin: '0 0 0.5rem 0', color: '#374151' }}>No Application Records Found</h3>
                <p style={{ margin: '0' }}>You haven't submitted any leave applications yet, or no records match your search criteria</p>
              </div>
            </div>
          ) : (
            <div className="info-card">
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                  <thead>
                    <tr style={{ background: 'linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)' }}>
                      <th style={{ padding: '1rem 0.75rem', textAlign: 'left', fontWeight: '700', color: '#374151', borderBottom: '2px solid #e5e7eb', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Application ID</th>
                      <th style={{ padding: '1rem 0.75rem', textAlign: 'left', fontWeight: '700', color: '#374151', borderBottom: '2px solid #e5e7eb', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Leave Type</th>
                      <th style={{ padding: '1rem 0.75rem', textAlign: 'left', fontWeight: '700', color: '#374151', borderBottom: '2px solid #e5e7eb', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Date Range</th>
                      <th style={{ padding: '1rem 0.75rem', textAlign: 'left', fontWeight: '700', color: '#374151', borderBottom: '2px solid #e5e7eb', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Days</th>
                      <th style={{ padding: '1rem 0.75rem', textAlign: 'left', fontWeight: '700', color: '#374151', borderBottom: '2px solid #e5e7eb', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Applied Date</th>
                      <th style={{ padding: '1rem 0.75rem', textAlign: 'left', fontWeight: '700', color: '#374151', borderBottom: '2px solid #e5e7eb', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</th>
                      <th style={{ padding: '1rem 0.75rem', textAlign: 'center', fontWeight: '700', color: '#374151', borderBottom: '2px solid #e5e7eb', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRequests.map((request) => (
                      <tr key={request.request_id} style={{ transition: 'background-color 0.2s ease' }} onMouseEnter={e => e.target.closest('tr').style.backgroundColor = '#f9fafb'} onMouseLeave={e => e.target.closest('tr').style.backgroundColor = 'transparent'}>
                        <td style={{ padding: '1rem 0.75rem', borderBottom: '1px solid #e5e7eb', verticalAlign: 'top' }}>
                          <span style={{ 
                            fontWeight: '700', 
                            color: '#254E70', 
                            background: 'rgba(37, 78, 112, 0.1)', 
                            padding: '0.25rem 0.5rem', 
                            borderRadius: '0.375rem', 
                            fontSize: '0.75rem' 
                          }}>
                            #{request.request_id}
                          </span>
                        </td>
                        <td style={{ padding: '1rem 0.75rem', borderBottom: '1px solid #e5e7eb', verticalAlign: 'top' }}>
                          <span style={{
                            background: '#e9eb9e',
                            color: '#2e382e',
                            padding: '0.25rem 0.5rem',
                            borderRadius: '0.375rem',
                            fontWeight: '600',
                            fontSize: '0.75rem'
                          }}>
                            {getLeaveTypeLabel(request.leave_type)}
                          </span>
                        </td>
                        <td style={{ padding: '1rem 0.75rem', borderBottom: '1px solid #e5e7eb', verticalAlign: 'top' }}>
                          <div style={{ fontSize: '0.875rem' }}>
                            <div>{new Date(request.start_date).toLocaleDateString()}</div>
                            <div style={{ color: '#6b7280' }}>
                              to {new Date(request.end_date).toLocaleDateString()}
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '1rem 0.75rem', borderBottom: '1px solid #e5e7eb', verticalAlign: 'top' }}>
                          <span style={{ fontWeight: '600' }}>{request.total_days} days</span>
                        </td>
                        <td style={{ padding: '1rem 0.75rem', borderBottom: '1px solid #e5e7eb', verticalAlign: 'top' }}>
                          {new Date(request.applied_on).toLocaleDateString()}
                        </td>
                        <td style={{ padding: '1rem 0.75rem', borderBottom: '1px solid #e5e7eb', verticalAlign: 'top' }}>
                          <span className={`status-badge ${getStatusBadgeClass(request.status)}`}>
                            {getStatusLabel(request.status)}
                          </span>
                        </td>
                        <td style={{ padding: '1rem 0.75rem', borderBottom: '1px solid #e5e7eb', verticalAlign: 'top', textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                            <button
                              className="edit-button"
                              style={{ 
                                padding: '0.25rem 0.5rem', 
                                fontSize: '0.75rem',
                                minWidth: 'auto'
                              }}
                              onClick={() => setSelectedRequest(request)}
                              title="View Details"
                            >
                              <FileText size={14} />
                            </button>
                            {request.status === 'Pending' && (
                              <button
                                className="cancel-button"
                                style={{ 
                                  padding: '0.25rem 0.5rem', 
                                  fontSize: '0.75rem',
                                  minWidth: 'auto',
                                  background: '#dc2626',
                                  color: 'white'
                                }}
                                onClick={() => handleCancelRequest(request.request_id)}
                                title="Cancel Application"
                              >
                                <XCircle size={14} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modals */}
        <LeaveApplicationModal />
        <RequestDetailsModal />
      </div>
    </div>
  );
};

export default StaffLeave;