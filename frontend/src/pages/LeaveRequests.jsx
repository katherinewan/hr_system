import React, { useState, useEffect } from 'react';
import { 
  Search, Calendar, CheckCircle, XCircle, Clock, User, 
  Filter, Eye, MessageSquare, AlertCircle, FileText,
  Mail, Phone, MapPin, Briefcase, Award
} from 'lucide-react';

const LeaveRequests = () => {
  const [requests, setRequests] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending');
  const [urgencyFilter, setUrgencyFilter] = useState('');
  const [currentView, setCurrentView] = useState('table');
  const [resultTitle, setResultTitle] = useState('');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [approvalComment, setApprovalComment] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // API base URL
  const API_BASE_URL = 'http://localhost:3001/api';

  // 狀態選項
  const statusOptions = [
    { value: '', label: 'All Status' },
    { value: 'pending', label: 'Pending Approval' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' }
  ];

  // 緊急程度選項
  const urgencyOptions = [
    { value: '', label: 'All Urgency' },
    { value: 'low', label: 'Normal' },
    { value: 'medium', label: 'Urgent' },
    { value: 'high', label: 'Emergency' }
  ];

  // Show error message
  const showError = (message) => {
    setError(message);
    setSuccessMessage('');
    setLoading(false);
    setCurrentView('error');
  };

  // Show success message
  const showSuccess = (message) => {
    setSuccessMessage(message);
    setError('');
    setTimeout(() => setSuccessMessage(''), 5000);
  };

  // Clear error
  const clearError = () => {
    setError('');
  };

  // Load leave requests
  const loadRequests = async () => {
    setLoading(true);
    clearError();
    
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (urgencyFilter) params.append('urgency', urgencyFilter);
      
      const response = await fetch(`${API_BASE_URL}/leave-requests?${params.toString()}`);
      const data = await response.json();
      
      if (data.success) {
        console.log('Leave requests data:', data.data);
        setRequests(data.data);
        
        let title = 'Leave Requests';
        if (statusFilter) {
          title += ` - ${statusOptions.find(s => s.value === statusFilter)?.label}`;
        }
        if (urgencyFilter) {
          title += ` - ${urgencyOptions.find(u => u.value === urgencyFilter)?.label}`;
        }
        title += ` (Total: ${data.count} requests)`;
        
        setResultTitle(title);
        setCurrentView('table');
      } else {
        showError(data.message || 'Failed to load leave requests');
      }
    } catch (error) {
      showError('Unable to connect to server, please check if backend is running');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load staff list
  const loadStaffList = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/staff`);
      const data = await response.json();
      
      if (data.success) {
        setStaffList(data.data);
      } else {
        console.error('Failed to load staff:', data.message);
      }
    } catch (error) {
      console.error('Error loading staff:', error);
    }
  };

  // Search requests
  const searchRequests = async (searchTerm) => {
    if (!searchTerm || !searchTerm.trim()) {
      loadRequests();
      return;
    }

    const trimmedInput = searchTerm.trim();
    setLoading(true);
    clearError();
    
    try {
      // 在本地搜索
      const filteredRequests = requests.filter(request => 
        request.staff_name.toLowerCase().includes(trimmedInput.toLowerCase()) ||
        request.leave_type.toLowerCase().includes(trimmedInput.toLowerCase()) ||
        request.reason.toLowerCase().includes(trimmedInput.toLowerCase()) ||
        request.request_id.toString().includes(trimmedInput)
      );
      
      setRequests(filteredRequests);
      setResultTitle(`Search Results for "${trimmedInput}" (Total: ${filteredRequests.length} requests)`);
      setCurrentView('table');
    } catch (error) {
      showError('Error occurred during search');
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle search input
  const handleSearch = (e) => {
    if (e.key === 'Enter') {
      searchRequests(searchInput);
    }
  };

  // Format date for display
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Format datetime for display
  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get status color class
  const getStatusColorClass = (status) => {
    switch (status.toLowerCase()) {
      case 'approved':
        return 'status-badge active';
      case 'rejected':
        return 'status-badge locked';
      case 'pending':
        return 'attempts-badge normal';
      default:
        return 'badge-default';
    }
  };

  // Get urgency color class
  const getUrgencyColorClass = (urgency) => {
    switch (urgency?.toLowerCase()) {
      case 'high':
        return 'status-badge locked';
      case 'medium':
        return 'badge-warning';
      case 'low':
        return 'badge-employee';
      default:
        return 'badge-default';
    }
  };

  // Get leave type color class
  const getLeaveTypeColorClass = (type) => {
    switch (type?.toLowerCase()) {
      case 'annual_leave':
        return 'badge-employee';
      case 'sick_leave':
        return 'badge-warning';
      case 'casual_leave':
        return 'badge-manager';
      case 'maternity_leave':
      case 'paternity_leave':
        return 'badge-hr';
      default:
        return 'badge-default';
    }
  };

  // Calculate days between dates
  const calculateDays = (startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const timeDiff = end.getTime() - start.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;
    return daysDiff;
  };

  // Get days until start date
  const getDaysUntilStart = (startDate) => {
    const today = new Date();
    const start = new Date(startDate);
    const timeDiff = start.getTime() - today.getTime();
    const daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
    return daysDiff;
  };

  // View request details
  const viewRequestDetails = (request) => {
    setSelectedRequest(request);
    setShowDetailModal(true);
    setApprovalComment('');
  };

  // Close detail modal
  const closeDetailModal = () => {
    setShowDetailModal(false);
    setSelectedRequest(null);
    setApprovalComment('');
  };

  // Approve request
  const approveRequest = async (requestId, comment = '') => {
    if (!confirm('Are you sure you want to approve this leave request?')) {
      return;
    }
    
    setIsProcessing(true);
    
    try {
      const response = await fetch(`${API_BASE_URL}/leave-requests/${requestId}/approve`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          approved_by: 'HR Manager', // This should come from user context
          comments: comment || 'Approved via web interface'
        }),
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        // Update the request status in the local state
        setRequests(prev => prev.map(request => 
          request.request_id === requestId 
            ? { 
                ...request, 
                status: 'Approved', 
                approved_by: 'HR Manager', 
                approved_on: new Date().toISOString(),
                rejection_reason: comment
              }
            : request
        ));
        
        showSuccess('Leave request approved successfully');
        closeDetailModal();
        loadRequests(); // Refresh the list
      } else {
        setError(data.message || 'Failed to approve leave request');
      }
    } catch (error) {
      setError('Error occurred while approving leave request');
      console.error('Approve error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Reject request
  const rejectRequest = async (requestId, reason) => {
    if (!reason || !reason.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }
    
    if (!confirm('Are you sure you want to reject this leave request?')) {
      return;
    }
    
    setIsProcessing(true);
    
    try {
      const response = await fetch(`${API_BASE_URL}/leave-requests/${requestId}/reject`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          approved_by: 'HR Manager',
          rejection_reason: reason
        }),
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        // Update the request status in the local state
        setRequests(prev => prev.map(request => 
          request.request_id === requestId 
            ? { 
                ...request, 
                status: 'Rejected', 
                approved_by: 'HR Manager', 
                approved_on: new Date().toISOString(),
                rejection_reason: reason
              }
            : request
        ));
        
        showSuccess('Leave request rejected');
        closeDetailModal();
        loadRequests(); // Refresh the list
      } else {
        setError(data.message || 'Failed to reject leave request');
      }
    } catch (error) {
      setError('Error occurred while rejecting leave request');
      console.error('Reject error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Get staff details by ID
  const getStaffDetails = (staffId) => {
    return staffList.find(staff => staff.staff_id.toString() === staffId.toString());
  };

  // Render request detail modal
  const renderDetailModal = () => {
    if (!showDetailModal || !selectedRequest) return null;

    const staffDetails = getStaffDetails(selectedRequest.staff_id);
    const daysRequested = calculateDays(selectedRequest.start_date, selectedRequest.end_date);
    const daysUntilStart = getDaysUntilStart(selectedRequest.start_date);

    return (
      <div className="modal-overlay">
        <div className="modal-content modal-large">
          <div className="modal-header">
            <div className="modal-header-content">
              <div className="modal-title-section">
                <h3 className="modal-title-with-icon">
                  <FileText size={20} />
                  Leave Request Details
                </h3>
                <p>Request ID: {selectedRequest.request_id}</p>
              </div>
              <button 
                onClick={closeDetailModal} 
                className="close-btn"
                disabled={isProcessing}
              >
                ×
              </button>
            </div>
          </div>
          
          <div className="modal-body">
            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem'}}>
              {/* Employee Information */}
              <div>
                <h4 style={{marginBottom: '1rem', color: '#2e382e', display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                  <User size={18} />
                  Employee Information
                </h4>
                
                {staffDetails && (
                  <div className="selected-staff-preview">
                    <div className="selected-staff-content">
                      <div className="selected-staff-avatar">
                        {staffDetails.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="selected-staff-info">
                        <div className="selected-staff-name">{staffDetails.name}</div>
                        <div className="selected-staff-detail">
                          <Briefcase size={12} style={{marginRight: '4px'}} />
                          Staff ID: {staffDetails.staff_id}
                        </div>
                        <div className="selected-staff-detail">
                          <Mail size={12} style={{marginRight: '4px'}} />
                          {staffDetails.email}
                        </div>
                        <div className="selected-staff-detail">
                          <Phone size={12} style={{marginRight: '4px'}} />
                          {staffDetails.phone_number}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Leave Details */}
              <div>
                <h4 style={{marginBottom: '1rem', color: '#2e382e', display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                  <Calendar size={18} />
                  Leave Details
                </h4>
                
                <div style={{display: 'grid', gap: '0.75rem'}}>
                  <div style={{display: 'flex', justifyContent: 'space-between'}}>
                    <span style={{fontWeight: '600'}}>Type:</span>
                    <span className={`position-badge ${getLeaveTypeColorClass(selectedRequest.leave_type)}`}>
                      {selectedRequest.leave_type}
                    </span>
                  </div>
                  
                  <div style={{display: 'flex', justifyContent: 'space-between'}}>
                    <span style={{fontWeight: '600'}}>Status:</span>
                    <span className={getStatusColorClass(selectedRequest.status)}>
                      {selectedRequest.status}
                    </span>
                  </div>
                  
                  <div style={{display: 'flex', justifyContent: 'space-between'}}>
                    <span style={{fontWeight: '600'}}>Start Date:</span>
                    <span>{formatDate(selectedRequest.start_date)}</span>
                  </div>
                  
                  <div style={{display: 'flex', justifyContent: 'space-between'}}>
                    <span style={{fontWeight: '600'}}>End Date:</span>
                    <span>{formatDate(selectedRequest.end_date)}</span>
                  </div>
                  
                  <div style={{display: 'flex', justifyContent: 'space-between'}}>
                    <span style={{fontWeight: '600'}}>Duration:</span>
                    <span className="attempts-badge normal">{daysRequested} days</span>
                  </div>
                  
                  <div style={{display: 'flex', justifyContent: 'space-between'}}>
                    <span style={{fontWeight: '600'}}>Days Until Start:</span>
                    <span className={daysUntilStart < 0 ? 'status-badge locked' : daysUntilStart < 7 ? 'badge-warning' : 'badge-employee'}>
                      {daysUntilStart < 0 ? 'Started' : daysUntilStart === 0 ? 'Today' : `${daysUntilStart} days`}
                    </span>
                  </div>
                  
                  <div style={{display: 'flex', justifyContent: 'space-between'}}>
                    <span style={{fontWeight: '600'}}>Applied On:</span>
                    <span>{formatDateTime(selectedRequest.applied_on)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Reason */}
            <div style={{marginTop: '1.5rem'}}>
              <h4 style={{marginBottom: '0.5rem', color: '#2e382e'}}>Reason for Leave</h4>
              <div style={{
                padding: '1rem',
                backgroundColor: '#f8faf9',
                borderRadius: '8px',
                border: '1px solid #e5e7eb'
              }}>
                {selectedRequest.reason}
              </div>
            </div>

            {/* Emergency Contact */}
            {selectedRequest.emergency_contact && (
              <div style={{marginTop: '1rem'}}>
                <h4 style={{marginBottom: '0.5rem', color: '#2e382e'}}>Emergency Contact</h4>
                <div style={{
                  padding: '0.75rem',
                  backgroundColor: '#fef3c7',
                  borderRadius: '8px',
                  border: '1px solid #fbbf24',
                  color: '#92400e'
                }}>
                  {selectedRequest.emergency_contact}
                </div>
              </div>
            )}

            {/* Medical Certificate */}
            {selectedRequest.medical_certificate && (
              <div style={{marginTop: '1rem'}}>
                <div style={{
                  padding: '0.75rem',
                  backgroundColor: '#ecfdf5',
                  borderRadius: '8px',
                  border: '1px solid #86efac',
                  color: '#16a34a',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <Award size={16} />
                  Medical certificate provided
                </div>
              </div>
            )}

            {/* Approval Section */}
            {selectedRequest.status === 'Pending' && (
              <div style={{marginTop: '1.5rem', padding: '1rem', backgroundColor: '#f0f9ff', borderRadius: '8px', border: '1px solid #bae6fd'}}>
                <h4 style={{marginBottom: '1rem', color: '#0369a1'}}>Action Required</h4>
                <div className="form-group">
                  <label htmlFor="approval-comment">Comments (Optional)</label>
                  <textarea
                    id="approval-comment"
                    value={approvalComment}
                    onChange={(e) => setApprovalComment(e.target.value)}
                    placeholder="Add comments for approval/rejection..."
                    rows="3"
                    className="form-input"
                  />
                </div>
              </div>
            )}

            {/* Previous Actions */}
            {(selectedRequest.approved_by || selectedRequest.rejection_reason) && (
              <div style={{marginTop: '1.5rem'}}>
                <h4 style={{marginBottom: '0.5rem', color: '#2e382e'}}>Previous Actions</h4>
                <div style={{
                  padding: '1rem',
                  backgroundColor: selectedRequest.status === 'Approved' ? '#ecfdf5' : '#fef2f2',
                  borderRadius: '8px',
                  border: `1px solid ${selectedRequest.status === 'Approved' ? '#86efac' : '#fca5a5'}`
                }}>
                  {selectedRequest.approved_by && (
                    <div style={{marginBottom: '0.5rem'}}>
                      <strong>Processed by:</strong> {selectedRequest.approved_by}
                    </div>
                  )}
                  {selectedRequest.approved_on && (
                    <div style={{marginBottom: '0.5rem'}}>
                      <strong>Date:</strong> {formatDateTime(selectedRequest.approved_on)}
                    </div>
                  )}
                  {selectedRequest.rejection_reason && (
                    <div>
                      <strong>Reason:</strong> {selectedRequest.rejection_reason}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button
              type="button"
              onClick={closeDetailModal}
              disabled={isProcessing}
              className="btn btn-secondary"
            >
              Close
            </button>
            
            {selectedRequest.status === 'Pending' && (
              <>
                <button
                  type="button"
                  onClick={() => rejectRequest(selectedRequest.request_id, approvalComment || 'Rejected via web interface')}
                  disabled={isProcessing}
                  className="btn btn-danger"
                >
                  {isProcessing ? 'Processing...' : (
                    <>
                      <XCircle className="btn-icon" />
                      Reject
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => approveRequest(selectedRequest.request_id, approvalComment)}
                  disabled={isProcessing}
                  className="btn btn-success"
                >
                  {isProcessing ? 'Processing...' : (
                    <>
                      <CheckCircle className="btn-icon" />
                      Approve
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Render requests table
  const renderRequestsTable = () => {
    if (requests.length === 0) {
      return (
        <div className="empty-state">
          <FileText size={64} style={{ color: '#799496', marginBottom: '1rem' }} />
          <h3>No leave requests found</h3>
          <p>No leave requests match your current filter criteria</p>
        </div>
      );
    }

    return (
      <div>
        <h2 className="result-title">{resultTitle}</h2>
        <div className="table-container">
          <table className="staff-table">
            <thead>
              <tr className="table-header">
                <th>Request ID</th>
                <th>Employee</th>
                <th>Leave Type</th>
                <th>Period</th>
                <th>Days</th>
                <th>Status</th>
                <th>Urgency</th>
                <th>Applied Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((request) => {
                const daysUntilStart = getDaysUntilStart(request.start_date);
                const isUrgent = daysUntilStart >= 0 && daysUntilStart < 3;
                
                return (
                  <tr key={request.request_id} className="table-row">
                    <td>
                      <strong className="staff-id">{request.request_id}</strong>
                    </td>
                    <td>
                      <div>
                        <strong>{request.staff_name}</strong>
                        <div style={{fontSize: '0.75rem', color: '#6b7280'}}>
                          ID: {request.staff_id}
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`position-badge ${getLeaveTypeColorClass(request.leave_type)}`}>
                        {request.leave_type}
                      </span>
                    </td>
                    <td>
                      <div style={{fontSize: '0.875rem'}}>
                        <div>{formatDate(request.start_date)}</div>
                        <div style={{color: '#6b7280'}}>to {formatDate(request.end_date)}</div>
                      </div>
                    </td>
                    <td>
                      <span className="attempts-badge normal">
                        {request.total_days} days
                      </span>
                    </td>
                    <td>
                      <span className={getStatusColorClass(request.status)}>
                        {request.status}
                      </span>
                    </td>
                    <td>
                      {isUrgent && request.status === 'Pending' ? (
                        <span className="status-badge locked">
                          <AlertCircle size={12} style={{marginRight: '4px'}} />
                          Urgent
                        </span>
                      ) : daysUntilStart >= 0 && daysUntilStart < 7 && request.status === 'Pending' ? (
                        <span className="badge-warning">Soon</span>
                      ) : (
                        <span className="badge-employee">Normal</span>
                      )}
                    </td>
                    <td>{formatDate(request.applied_on)}</td>
                    <td className="actions-cell">
                      <div className="edit-actions">
                        <button
                          onClick={() => viewRequestDetails(request)}
                          className="action-btn edit-btn"
                          title="View details"
                        >
                          <Eye size={16} />
                        </button>
                        
                        {request.status === 'Pending' && (
                          <>
                            <button
                              onClick={() => approveRequest(request.request_id)}
                              className="action-btn save-btn"
                              title="Quick approve"
                            >
                              <CheckCircle size={16} />
                            </button>
                            <button
                              onClick={() => {
                                const reason = prompt('Please provide a reason for rejection:');
                                if (reason) rejectRequest(request.request_id, reason);
                              }}
                              className="action-btn cancel-btn"
                              title="Quick reject"
                            >
                              <XCircle size={16} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // Render content area
  const renderContent = () => {
    if (loading) {
      return (
        <div className="loading-state">
          <div>Loading leave requests...</div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="error-message">
          {error}
        </div>
      );
    }

    if (currentView === 'table') {
      return renderRequestsTable();
    }
  };

  // Load requests on component mount and when filters change
  useEffect(() => {
    console.log('Leave Requests component is ready');
    console.log('API Base URL:', API_BASE_URL);
    loadRequests();
    loadStaffList();
  }, [statusFilter, urgencyFilter]);

  return (
    <div style={{ minHeight: '100vh' }}>
      {/* Controls */}
      <div className="controls">
        <div className="controls-wrapper">
          {/* Search Box */}
          <div className="search-container">
            <div className="search-input-wrapper">
              <Search className="search-icon" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyPress={handleSearch}
                placeholder="Search requests by employee, type, or reason..."
                className="search-input"
              />
            </div>
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="btn btn-secondary"
            style={{ minWidth: '140px' }}
          >
            {statusOptions.map(status => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>

          {/* Urgency Filter */}
          <select
            value={urgencyFilter}
            onChange={(e) => setUrgencyFilter(e.target.value)}
            className="btn btn-secondary"
            style={{ minWidth: '120px' }}
          >
            {urgencyOptions.map(urgency => (
              <option key={urgency.value} value={urgency.value}>
                {urgency.label}
              </option>
            ))}
          </select>

          {/* Buttons */}
          <button
            onClick={() => {
              setSearchInput('');
              setStatusFilter('pending');
              setUrgencyFilter('');
            }}
            className="btn btn-secondary"
          >
            <Filter className="btn-icon" />
            Reset Filters
          </button>

          <button
            onClick={loadRequests}
            disabled={loading}
            className="btn btn-primary"
          >
            <Calendar className="btn-icon" />
            Refresh
          </button>
        </div>
      </div>

      {/* Success Message */}
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

      {/* Content */}
      <div className="content">
        {renderContent()}
      </div>

      {/* Detail Modal */}
      {renderDetailModal()}
    </div>
  );
};

export default LeaveRequests;