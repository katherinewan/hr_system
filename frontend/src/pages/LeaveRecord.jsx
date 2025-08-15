import React, { useState, useEffect } from 'react';
import { Search, Calendar, Trash2, Plus, Edit3, Save, X, Check, Clock, User, BarChart3, Filter, CheckCircle, XCircle } from 'lucide-react';

const LeaveManagementSystem = () => {
  const [leaveList, setLeaveList] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [currentView, setCurrentView] = useState('table');
  const [resultTitle, setResultTitle] = useState('');
  const [editingLeave, setEditingLeave] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [validationErrors, setValidationErrors] = useState({});
  const [isUpdating, setIsUpdating] = useState(false);

  // 新增請假相關狀態
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({
    leave_id: '',
    staff_id: '',
    leave_type: '',
    start_date: '',
    end_date: '',
    reason: '',
    comments: ''
  });
  const [addValidationErrors, setAddValidationErrors] = useState({});
  const [isAdding, setIsAdding] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // API base URL
  const API_BASE_URL = 'http://localhost:3001/api';

  // 請假類型選項
  const leaveTypes = [
    { value: 'Annual', label: 'Annual Leave' },
    { value: 'Sick', label: 'Sick Leave' },
    { value: 'Personal', label: 'Personal Leave' },
    { value: 'Maternity', label: 'Maternity Leave' },
    { value: 'Paternity', label: 'Paternity Leave' },
    { value: 'Bereavement', label: 'Bereavement Leave' },
    { value: 'Other', label: 'Other' }
  ];

  // 狀態選項
  const statusOptions = [
    { value: 'pending', label: 'Pending' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' }
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

  // Load all leaves
  const loadAllLeaves = async () => {
    setLoading(true);
    clearError();
    
    try {
      const response = await fetch(`${API_BASE_URL}/leaves`);
      const data = await response.json();
      
      if (data.success) {
        console.log('Raw API data:', data.data);
        setLeaveList(data.data);
        setResultTitle(`All Leave Records (Total: ${data.count} records)`);
        setCurrentView('table');
      } else {
        showError(data.message || 'Failed to load leave data');
      }
    } catch (error) {
      showError('Unable to connect to server, please check if backend is running');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load staff list for dropdown
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

  // Search leaves
  const searchLeaves = async (searchTerm) => {
    if (!searchTerm || !searchTerm.trim()) {
      showError('Please enter search keywords');
      return;
    }

    const trimmedInput = searchTerm.trim();
    setLoading(true);
    clearError();
    
    try {
      let response;
      
      if (/^\d+$/.test(trimmedInput)) {
        console.log(`Searching leave ID: ${trimmedInput}`);
        response = await fetch(`${API_BASE_URL}/leaves/${trimmedInput}`);
      } else {
        console.log(`Searching staff name: ${trimmedInput}`);
        // 在請假列表中本地搜索
        const filteredLeaves = leaveList.filter(leave => 
          leave.staff_name.toLowerCase().includes(trimmedInput.toLowerCase()) ||
          leave.reason.toLowerCase().includes(trimmedInput.toLowerCase())
        );
        
        setLeaveList(filteredLeaves);
        setResultTitle(`Search Results for "${trimmedInput}" (Total: ${filteredLeaves.length} records)`);
        setCurrentView('table');
        setLoading(false);
        return;
      }
      
      const data = await response.json();
      console.log('Backend response:', data);
      
      if (response.ok && data) {
        if (data.success) {
          let leaveData;
          if (Array.isArray(data.data)) {
            leaveData = data.data;
          } else {
            leaveData = [data.data];
          }
          
          setLeaveList(leaveData);
          setResultTitle(`Search Results for "${trimmedInput}" (Total: ${leaveData.length} records)`);
          setCurrentView('table');
        } else {
          showError(data.message || 'Leave data not found');
        }
      } else {
        if (response.status === 404) {
          showError(`Leave "${trimmedInput}" not found`);
        } else {
          showError(data.message || 'Error occurred during search');
        }
      }
    } catch (error) {
      showError('Error occurred during search, please check network connection');
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter leaves
  const filterLeaves = async () => {
    setLoading(true);
    clearError();
    
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (typeFilter) params.append('leave_type', typeFilter);
      
      const response = await fetch(`${API_BASE_URL}/leaves?${params.toString()}`);
      const data = await response.json();
      
      if (data.success) {
        setLeaveList(data.data);
        let filterText = '';
        if (statusFilter) filterText += `Status: ${statusFilter} `;
        if (typeFilter) filterText += `Type: ${typeFilter}`;
        setResultTitle(`Filtered Results ${filterText}(Total: ${data.count} records)`);
        setCurrentView('table');
      } else {
        showError(data.message || 'Failed to filter leaves');
      }
    } catch (error) {
      showError('Error occurred during filtering');
      console.error('Filter error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Clear results
  const clearResults = () => {
    setSearchInput('');
    setStatusFilter('');
    setTypeFilter('');
    loadAllLeaves();
  };

  // Handle search input
  const handleSearch = (e) => {
    if (e.key === 'Enter') {
      if (searchInput.trim()) {
        searchLeaves(searchInput);
      } else {
        loadAllLeaves();
      }
    }
  };

  // Format date for display
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US');
  };

  // Format date for input (YYYY-MM-DD)
  const formatDateForInput = (dateString) => {
    return new Date(dateString).toISOString().split('T')[0];
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

  // Get leave type color class
  const getLeaveTypeColorClass = (type) => {
    switch (type.toLowerCase()) {
      case 'annual':
        return 'badge-employee';
      case 'sick':
        return 'badge-warning';
      case 'personal':
        return 'badge-manager';
      case 'maternity':
      case 'paternity':
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

  // Start editing a leave
  const startEditing = (leave) => {
    setEditingLeave(leave.leave_id);
    setEditForm({
      leave_type: leave.leave_type || '',
      start_date: formatDateForInput(leave.start_date),
      end_date: formatDateForInput(leave.end_date),
      reason: leave.reason || '',
      comments: leave.comments || ''
    });
    setValidationErrors({});
  };

  // Cancel editing
  const cancelEditing = () => {
    setEditingLeave(null);
    setEditForm({});
    setValidationErrors({});
  };

  // Handle form input changes for editing
  const handleFormChange = (field, value) => {
    setEditForm(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear validation error for this field
    if (validationErrors[field]) {
      setValidationErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  // Handle form input changes for adding new leave
  const handleAddFormChange = (field, value) => {
    setAddForm(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear validation error for this field
    if (addValidationErrors[field]) {
      setAddValidationErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  // Validate form data for editing
  const validateForm = () => {
    const errors = {};
    
    if (!editForm.leave_type.trim()) {
      errors.leave_type = 'Leave type is required';
    }
    
    if (!editForm.start_date) {
      errors.start_date = 'Start date is required';
    }
    
    if (!editForm.end_date) {
      errors.end_date = 'End date is required';
    }
    
    if (editForm.start_date && editForm.end_date && editForm.start_date > editForm.end_date) {
      errors.end_date = 'End date cannot be earlier than start date';
    }
    
    if (!editForm.reason.trim()) {
      errors.reason = 'Reason is required';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Validate form data for adding new leave
  const validateAddForm = () => {
    const errors = {};
    
    if (!addForm.leave_id || addForm.leave_id.trim() === '') {
      errors.leave_id = 'Leave ID is required';
    }
    
    if (!addForm.staff_id) {
      errors.staff_id = 'Staff member is required';
    }
    
    if (!addForm.leave_type.trim()) {
      errors.leave_type = 'Leave type is required';
    }
    
    if (!addForm.start_date) {
      errors.start_date = 'Start date is required';
    }
    
    if (!addForm.end_date) {
      errors.end_date = 'End date is required';
    }
    
    if (addForm.start_date && addForm.end_date && addForm.start_date > addForm.end_date) {
      errors.end_date = 'End date cannot be earlier than start date';
    }
    
    if (!addForm.reason.trim()) {
      errors.reason = 'Reason is required';
    }
    
    // Check if start date is in the past
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startDate = new Date(addForm.start_date);
    if (startDate < today) {
      errors.start_date = 'Start date cannot be in the past';
    }
    
    setAddValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Update leave
  const updateLeave = async (leaveId) => {
    if (!validateForm()) {
      return;
    }
    
    setIsUpdating(true);
    
    try {
      const response = await fetch(`${API_BASE_URL}/leaves/${leaveId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editForm),
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        // Update the leave in the local state
        setLeaveList(prev => prev.map(leave => 
          leave.leave_id === leaveId 
            ? { ...leave, ...editForm, days: calculateDays(editForm.start_date, editForm.end_date) }
            : leave
        ));
        
        cancelEditing();
        showSuccess('Leave record updated successfully');
      } else {
        setError(data.message || 'Failed to update leave record');
      }
    } catch (error) {
      setError('Error occurred while updating leave record');
      console.error('Update error:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  // Add new leave
  const addLeave = async () => {
    if (!validateAddForm()) {
      return;
    }
    
    setIsAdding(true);
    
    try {
      const response = await fetch(`${API_BASE_URL}/leaves`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(addForm),
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        // Add the new leave to the local state
        setLeaveList(prev => [...prev, data.data]);
        
        // Reset add form and close modal
        setAddForm({
          leave_id: '',
          staff_id: '',
          leave_type: '',
          start_date: '',
          end_date: '',
          reason: '',
          comments: ''
        });
        setAddValidationErrors({});
        setShowAddModal(false);
        
        showSuccess('New leave application submitted successfully');
        
        // Refresh the list to get updated count
        loadAllLeaves();
      } else {
        setError(data.message || 'Failed to submit leave application');
      }
    } catch (error) {
      setError('Error occurred while submitting leave application');
      console.error('Add error:', error);
    } finally {
      setIsAdding(false);
    }
  };

  // Approve leave
  const approveLeave = async (leaveId) => {
    if (!confirm('Are you sure you want to approve this leave application?')) {
      return;
    }
    
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/leaves/${leaveId}/approve`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          approved_by: 'HR Manager', // You might want to get this from user context
          comments: 'Approved via web interface'
        }),
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        // Update the leave status in the local state
        setLeaveList(prev => prev.map(leave => 
          leave.leave_id === leaveId 
            ? { ...leave, status: 'approved', approved_by: 'HR Manager', approved_date: new Date().toISOString().split('T')[0] }
            : leave
        ));
        showSuccess('Leave application approved successfully');
      } else {
        setError(data.message || 'Failed to approve leave application');
      }
    } catch (error) {
      setError('Error occurred while approving leave application');
      console.error('Approve error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Reject leave
  const rejectLeave = async (leaveId) => {
    const reason = prompt('Please provide a reason for rejection:');
    if (!reason) return;
    
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/leaves/${leaveId}/reject`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          approved_by: 'HR Manager',
          comments: reason
        }),
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        // Update the leave status in the local state
        setLeaveList(prev => prev.map(leave => 
          leave.leave_id === leaveId 
            ? { ...leave, status: 'rejected', approved_by: 'HR Manager', approved_date: new Date().toISOString().split('T')[0], comments: reason }
            : leave
        ));
        showSuccess('Leave application rejected');
      } else {
        setError(data.message || 'Failed to reject leave application');
      }
    } catch (error) {
      setError('Error occurred while rejecting leave application');
      console.error('Reject error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Delete leave
  const deleteLeave = async (leaveId, staffName, leaveType) => {
    if (!confirm(`Are you sure you want to delete this ${leaveType} leave application for ${staffName}? This action cannot be undone.`)) {
      return;
    }
    
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/leaves/${leaveId}`, {
        method: 'DELETE',
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        // Remove the leave from the local state
        setLeaveList(prev => prev.filter(leave => leave.leave_id !== leaveId));
        showSuccess('Leave application deleted successfully');
      } else {
        setError(data.message || 'Failed to delete leave application');
      }
    } catch (error) {
      setError('Error occurred while deleting leave application');
      console.error('Delete error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get staff name by ID
  const getStaffNameById = (staffId) => {
    const staff = staffList.find(s => s.staff_id.toString() === staffId.toString());
    return staff ? staff.name : 'Unknown Staff';
  };

  // Open add modal
  const openAddModal = () => {
    setShowAddModal(true);
    setAddForm({
      leave_id: '',
      staff_id: '',
      leave_type: '',
      start_date: new Date().toISOString().split('T')[0], // Default to today
      end_date: '',
      reason: '',
      comments: ''
    });
    setAddValidationErrors({});
  };

  // Close add modal
  const closeAddModal = () => {
    setShowAddModal(false);
    setAddForm({
      leave_id: '',
      staff_id: '',
      leave_type: '',
      start_date: '',
      end_date: '',
      reason: '',
      comments: ''
    });
    setAddValidationErrors({});
  };

  // Render edit form for a specific field
  const renderEditField = (leave, field, type = 'text') => {
    const isEditing = editingLeave === leave.leave_id;
    const value = editForm[field];
    const hasError = validationErrors[field];
    
    if (!isEditing) {
      // Display mode
      if (field === 'start_date' || field === 'end_date') {
        return formatDate(leave[field]);
      } else if (field === 'leave_type') {
        return (
          <span className={`position-badge ${getLeaveTypeColorClass(leave.leave_type)}`}>
            {leave.leave_type}
          </span>
        );
      } else if (field === 'reason') {
        return leave.reason.length > 50 ? leave.reason.substring(0, 50) + '...' : leave.reason;
      }
      return leave[field];
    }
    
    // Edit mode
    if (field === 'leave_type') {
      return (
        <select
          value={value}
          onChange={(e) => handleFormChange(field, e.target.value)}
          className={`edit-input ${hasError ? 'error' : ''}`}
        >
          <option value="">Select Type</option>
          {leaveTypes.map(type => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
      );
    }
    
    if (type === 'textarea') {
      return (
        <div className="edit-field-container">
          <textarea
            value={value}
            onChange={(e) => handleFormChange(field, e.target.value)}
            className={`edit-input ${hasError ? 'error' : ''}`}
            rows="2"
          />
          {hasError && (
            <div className="validation-error">{hasError}</div>
          )}
        </div>
      );
    }
    
    return (
      <div className="edit-field-container">
        <input
          type={type}
          value={value}
          onChange={(e) => handleFormChange(field, e.target.value)}
          className={`edit-input ${hasError ? 'error' : ''}`}
        />
        {hasError && (
          <div className="validation-error">{hasError}</div>
        )}
      </div>
    );
  };

  // Render add leave modal
  const renderAddModal = () => {
    if (!showAddModal) return null;

    return (
      <div className="modal-overlay">
        <div className="modal-content modal-large">
          <div className="modal-header">
            <h3>Submit Leave Application</h3>
            <p>Fill out the form below to submit a new leave application</p>
            <button 
              onClick={closeAddModal} 
              className="close-btn"
              style={{ position: 'absolute', top: '1.5rem', right: '1.5rem' }}
            >
              <X size={20} />
            </button>
          </div>
          
          <div className="modal-body">
            <form onSubmit={(e) => e.preventDefault()}>
              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem'}}>
                <div className="form-group">
                  <label htmlFor="add-leave-id">Leave ID *</label>
                  <input
                    id="add-leave-id"
                    type="number"
                    value={addForm.leave_id}
                    onChange={(e) => handleAddFormChange('leave_id', e.target.value)}
                    className={addValidationErrors.leave_id ? 'error' : ''}
                    placeholder="Enter leave ID (number)"
                  />
                  {addValidationErrors.leave_id && (
                    <div className="validation-error">{addValidationErrors.leave_id}</div>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="add-staff">Staff Member *</label>
                  <select
                    id="add-staff"
                    value={addForm.staff_id}
                    onChange={(e) => handleAddFormChange('staff_id', e.target.value)}
                    className={addValidationErrors.staff_id ? 'error' : ''}
                  >
                    <option value="">Select Staff Member</option>
                    {staffList.map(staff => (
                      <option key={staff.staff_id} value={staff.staff_id}>
                        {staff.name} ({staff.staff_id})
                      </option>
                    ))}
                  </select>
                  {addValidationErrors.staff_id && (
                    <div className="validation-error">{addValidationErrors.staff_id}</div>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="add-type">Leave Type *</label>
                  <select
                    id="add-type"
                    value={addForm.leave_type}
                    onChange={(e) => handleAddFormChange('leave_type', e.target.value)}
                    className={addValidationErrors.leave_type ? 'error' : ''}
                  >
                    <option value="">Select Leave Type</option>
                    {leaveTypes.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                  {addValidationErrors.leave_type && (
                    <div className="validation-error">{addValidationErrors.leave_type}</div>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="add-start-date">Start Date *</label>
                  <input
                    id="add-start-date"
                    type="date"
                    value={addForm.start_date}
                    onChange={(e) => handleAddFormChange('start_date', e.target.value)}
                    className={addValidationErrors.start_date ? 'error' : ''}
                  />
                  {addValidationErrors.start_date && (
                    <div className="validation-error">{addValidationErrors.start_date}</div>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="add-end-date">End Date *</label>
                  <input
                    id="add-end-date"
                    type="date"
                    value={addForm.end_date}
                    onChange={(e) => handleAddFormChange('end_date', e.target.value)}
                    className={addValidationErrors.end_date ? 'error' : ''}
                  />
                  {addValidationErrors.end_date && (
                    <div className="validation-error">{addValidationErrors.end_date}</div>
                  )}
                </div>

                <div className="form-group" style={{gridColumn: '1 / -1'}}>
                  <label htmlFor="add-reason">Reason *</label>
                  <textarea
                    id="add-reason"
                    value={addForm.reason}
                    onChange={(e) => handleAddFormChange('reason', e.target.value)}
                    className={addValidationErrors.reason ? 'error' : ''}
                    placeholder="Please provide the reason for your leave application"
                    rows="3"
                  />
                  {addValidationErrors.reason && (
                    <div className="validation-error">{addValidationErrors.reason}</div>
                  )}
                </div>

                <div className="form-group" style={{gridColumn: '1 / -1'}}>
                  <label htmlFor="add-comments">Additional Comments</label>
                  <textarea
                    id="add-comments"
                    value={addForm.comments}
                    onChange={(e) => handleAddFormChange('comments', e.target.value)}
                    placeholder="Any additional information (optional)"
                    rows="2"
                  />
                </div>

                {addForm.start_date && addForm.end_date && (
                  <div className="form-group" style={{gridColumn: '1 / -1'}}>
                    <div className="info-box">
                      <strong>Duration:</strong> {calculateDays(addForm.start_date, addForm.end_date)} day(s)
                    </div>
                  </div>
                )}
              </div>
            </form>
          </div>

          <div className="modal-footer">
            <button
              type="button"
              onClick={closeAddModal}
              disabled={isAdding}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={addLeave}
              disabled={isAdding}
              className="btn btn-success"
            >
              {isAdding ? (
                'Submitting...'
              ) : (
                <>
                  <Plus className="btn-icon" />
                  Submit Application
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Render leave table
  const renderLeaveTable = () => {
    if (leaveList.length === 0) {
      return (
        <div className="empty-state">
          <h3>No leave records found</h3>
          <p>Please try other search criteria or submit a new leave application</p>
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
                <th>Leave ID</th>
                <th>Staff Name</th>
                <th>Leave Type</th>
                <th>Start Date</th>
                <th>End Date</th>
                <th>Days</th>
                <th>Reason</th>
                <th>Status</th>
                <th>Applied Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {leaveList.map((leave) => (
                <tr key={leave.leave_id} className={`table-row ${editingLeave === leave.leave_id ? 'editing' : ''}`}>
                  <td>
                    <strong className="staff-id">{leave.leave_id}</strong>
                  </td>
                  <td>
                    <strong>{leave.staff_name}</strong>
                    {leave.department_name && (
                      <div style={{fontSize: '0.75rem', color: '#6b7280'}}>
                        {leave.department_name}
                      </div>
                    )}
                  </td>
                  <td>{renderEditField(leave, 'leave_type')}</td>
                  <td>{renderEditField(leave, 'start_date', 'date')}</td>
                  <td>{renderEditField(leave, 'end_date', 'date')}</td>
                  <td>
                    <span className="attempts-badge normal">
                      {leave.days} days
                    </span>
                  </td>
                  <td>{renderEditField(leave, 'reason', 'textarea')}</td>
                  <td>
                    <span className={getStatusColorClass(leave.status)}>
                      {leave.status}
                    </span>
                  </td>
                  <td>{formatDate(leave.applied_date)}</td>
                  <td className="actions-cell">
                    {editingLeave === leave.leave_id ? (
                      <div className="edit-actions">
                        <button
                          onClick={() => updateLeave(leave.leave_id)}
                          disabled={isUpdating}
                          className="action-btn save-btn"
                          title="Save changes"
                        >
                          {isUpdating ? '...' : <Save size={16} />}
                        </button>
                        <button
                          onClick={cancelEditing}
                          disabled={isUpdating}
                          className="action-btn cancel-btn"
                          title="Cancel editing"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <div className="edit-actions">
                        {leave.status === 'pending' && (
                          <>
                            <button
                              onClick={() => approveLeave(leave.leave_id)}
                              className="action-btn save-btn"
                              title="Approve leave"
                            >
                              <CheckCircle size={16} />
                            </button>
                            <button
                              onClick={() => rejectLeave(leave.leave_id)}
                              className="action-btn cancel-btn"
                              title="Reject leave"
                            >
                              <XCircle size={16} />
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => startEditing(leave)}
                          className="action-btn edit-btn"
                          title="Edit leave"
                        >
                          <Edit3 size={16} />
                        </button>
                        <button
                          onClick={() => deleteLeave(leave.leave_id, leave.staff_name, leave.leave_type)}
                          className="action-btn cancel-btn"
                          title="Delete leave"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {Object.keys(validationErrors).length > 0 && (
          <div className="validation-summary">
            <h4>Please fix the following errors:</h4>
            <ul>
              {Object.entries(validationErrors).map(([field, error]) => (
                <li key={field}>{error}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };

  // Render content area
  const renderContent = () => {
    if (loading) {
      return (
        <div className="loading-state">
          <div>Loading leave records...</div>
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
      return renderLeaveTable();
    }
  };

  // Load all leaves and staff on component mount
  useEffect(() => {
    console.log('React Leave Management System is ready');
    console.log('API Base URL:', API_BASE_URL);
    loadAllLeaves();
    loadStaffList();
  }, []);

  return (
    <div className="app-container">
      <div className="main-card">
        {/* Header */}
        <div className="header">
          <h1>Leave Management</h1>
        </div>

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
                  placeholder="Search leave ID or staff name..."
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
              <option value="">All Status</option>
              {statusOptions.map(status => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>

            {/* Type Filter */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="btn btn-secondary"
              style={{ minWidth: '160px' }}
            >
              <option value="">All Types</option>
              {leaveTypes.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>

            {/* Buttons */}
            <button
              onClick={filterLeaves}
              disabled={loading}
              className="btn btn-primary"
            >
              <Filter className="btn-icon" />
              Apply Filters
            </button>

            <button
              onClick={loadAllLeaves}
              disabled={loading}
              className="btn btn-secondary"
            >
              <Calendar className="btn-icon" />
              Refresh All
            </button>

            <button
              onClick={clearResults}
              className="btn btn-secondary"
            >
              <Trash2 className="btn-icon" />
              Clear Filters
            </button>

            <button 
              onClick={openAddModal}
              className="btn btn-success"
            >
              <Plus className="btn-icon" />
              New Application
            </button>

            <button
              onClick={() => window.location.href = '/leaves/stats'}
              className="btn btn-warning"
            >
              <BarChart3 className="btn-icon" />
              View Statistics
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
      </div>

      {/* Add Modal */}
      {renderAddModal()}
    </div>
  );
};

export default LeaveManagementSystem;