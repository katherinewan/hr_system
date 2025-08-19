import React, { useState, useEffect } from 'react';
import { Search, History, Trash2, Plus, Edit, Save, X, Loader } from 'lucide-react';

const AttendanceManagementSystem = () => {
  const [attendanceList, setAttendanceList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Search parameters
  const [searchParams, setSearchParams] = useState({
    staff_id: '',
    start_date: '',
    end_date: '',
    status: '',
    date: ''
  });
  
  // Edit mode
  const [editingRecord, setEditingRecord] = useState(null);
  const [editData, setEditData] = useState({
    check_in: '',
    check_out: '',
    status: ''
  });

  // Add attendance related state
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({
    staff_id: '',
    date: '',
    check_in: '',
    check_out: '',
    status: 'Present'
  });
  const [addValidationErrors, setAddValidationErrors] = useState({});
  const [isAdding, setIsAdding] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // API
  const getApiUrl = () => {
    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
      return 'http://localhost:3001';
    }
    return import.meta.env.VITE_API_URL || 'http://localhost:3001';
  };

  const API_BASE_URL = `${getApiUrl()}/api`;

  // Show error
  const showError = (message) => {
    setError(message);
    setSuccessMessage('');
    setLoading(false);
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

  // Convert HH:MM to HH:MM:SS format for backend
  const convertToFullTimeFormat = (timeStr) => {
    if (!timeStr) return '';
    if (timeStr.length === 5) { // HH:MM format
      return timeStr + ':00';
    }
    return timeStr;
  };

  // Convert HH:MM:SS to HH:MM format for display
  const convertToDisplayFormat = (timeStr) => {
    if (!timeStr) return '';
    return timeStr.substring(0, 5); // Show only HH:MM
  };

  // Load all attendance records
  const loadAllAttendance = async () => {
    setLoading(true);
    clearError();
    
    try {
      const params = new URLSearchParams();
      
      // Add search parameters
      if (searchParams.staff_id) params.append('staff_id', searchParams.staff_id);
      if (searchParams.start_date) params.append('start_date', searchParams.start_date);
      if (searchParams.end_date) params.append('end_date', searchParams.end_date);
      if (searchParams.status) params.append('status', searchParams.status);
      if (searchParams.date) params.append('date', searchParams.date);
      
      const response = await fetch(`${API_BASE_URL}/attendance?${params.toString()}`);
      const data = await response.json();
      
      if (data.success) {
        setAttendanceList(data.data);
      } else {
        showError(data.message || 'Failed to load attendance records');
      }
    } catch (error) {
      showError('Unable to connect to server, please check if backend is running');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle search
  const handleSearch = () => {
    loadAllAttendance();
  };

  // Clear search
  const clearSearch = () => {
    setSearchParams({
      staff_id: '',
      start_date: '',
      end_date: '',
      status: '',
      date: ''
    });
    // Reload all data after clearing
    setTimeout(() => {
      loadAllAttendance();
    }, 100);
  };

  // Start editing
  const startEdit = (record) => {
    setEditingRecord(record.attendance_log);
    setEditData({
      check_in: convertToDisplayFormat(record.check_in) || '',
      check_out: convertToDisplayFormat(record.check_out) || '',
      status: record.status || ''
    });
  };

  // Cancel editing
  const cancelEdit = () => {
    setEditingRecord(null);
    setEditData({ check_in: '', check_out: '', status: '' });
  };

  // Save edit
  const saveEdit = async () => {
    setIsUpdating(true);
    
    try {
      const payload = {
        check_in: convertToFullTimeFormat(editData.check_in),
        check_out: convertToFullTimeFormat(editData.check_out),
        status: editData.status
      };

      const response = await fetch(`${API_BASE_URL}/attendance/${editingRecord}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (data.success) {
        showSuccess('Attendance information updated successfully');
        cancelEdit();
        loadAllAttendance();
      } else {
        showError(data.message || 'Update failed');
      }
    } catch (error) {
      console.error('Update error:', error);
      showError('Error occurred during update');
    } finally {
      setIsUpdating(false);
    }
  };

  // Delete record
  const deleteRecord = async (attendanceLog) => {
    if (!confirm('Are you sure you want to delete this record?')) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/attendance/${attendanceLog}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        showSuccess('Attendance deleted successfully');
        loadAllAttendance();
      } else {
        showError(data.message || 'Delete failed');
      }
    } catch (error) {
      console.error('Delete error:', error);
      showError('Error occurred during deletion');
    }
  };

  // Handle add form input changes
  const handleAddFormChange = (field, value) => {
    setAddForm(prev => ({
      ...prev,
      [field]: value
    }));
    
    if (addValidationErrors[field]) {
      setAddValidationErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  // Validate add form data
  const validateAddForm = () => {
    const errors = {};
    
    if (!addForm.staff_id || !addForm.staff_id.toString().trim()) {
      errors.staff_id = 'Staff ID is required';
    } else if (!/^\d+$/.test(addForm.staff_id.toString())) {
      errors.staff_id = 'Staff ID must be numeric';
    }
    
    if (!addForm.date) {
      errors.date = 'Date is required';
    }
    
    if (!addForm.status) {
      errors.status = 'Status is required';
    }
    
    // If check_out is provided, check_in must also be provided
    if (addForm.check_out && !addForm.check_in) {
      errors.check_in = 'Check in time is required when check out time is provided';
    }
    
    setAddValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Add attendance record
  const addAttendance = async () => {
    if (!validateAddForm()) {
      return;
    }
    
    setIsAdding(true);
    
    try {
      const payload = {
        staff_id: parseInt(addForm.staff_id),
        date: addForm.date,
        check_in: convertToFullTimeFormat(addForm.check_in),
        check_out: convertToFullTimeFormat(addForm.check_out),
        status: addForm.status
      };

      const response = await fetch(`${API_BASE_URL}/attendance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        setAttendanceList(prev => [...prev, data.data]);
        
        setAddForm({
          staff_id: '',
          date: '',
          check_in: '',
          check_out: '',
          status: 'Present'
        });
        setAddValidationErrors({});
        setShowAddModal(false);
        
        showSuccess('Attendance record added successfully');
        loadAllAttendance();
      } else {
        showError(data.message || 'Failed to add attendance record');
      }
    } catch (error) {
      showError('Error occurred while adding attendance record');
      console.error('Add error:', error);
    } finally {
      setIsAdding(false);
    }
  };

  // Open add modal
  const openAddModal = () => {
    setShowAddModal(true);
    setAddForm({
      staff_id: '',
      date: new Date().toISOString().split('T')[0], // Today's date
      check_in: '',
      check_out: '',
      status: 'Present'
    });
    setAddValidationErrors({});
  };

  // Close add modal
  const closeAddModal = () => {
    setShowAddModal(false);
    setAddForm({
      staff_id: '',
      date: '',
      check_in: '',
      check_out: '',
      status: 'Present'
    });
    setAddValidationErrors({});
  };

  // Format time for display
  const formatTime = (timeString) => {
    return convertToDisplayFormat(timeString);
  };

  // Format date to YYYY-MM-DD
  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      // If already in YYYY-MM-DD format, return as is
      if (typeof dateString === 'string' && dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
        return dateString;
      }
      
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return dateString; // Return original if invalid
      }
      
      // Format as YYYY-MM-DD
      return date.toISOString().split('T')[0];
    } catch (error) {
      console.error('Date formatting error:', error);
      return dateString;
    }
  };

  // Check if time is late (after 09:00)
  const isLate = (timeString) => {
    if (!timeString) return false;
    return convertToDisplayFormat(timeString) > "09:00";
  };

  // Check if time is overtime (after 18:01)
  const isOvertime = (timeString) => {
    if (!timeString) return false;
    return convertToDisplayFormat(timeString) > "18:01";
  };

  // Get status badge class
  const getStatusBadgeClass = (status) => {
    switch (status?.toLowerCase()) {
      case 'present':
        return 'badge-employee';
      case 'absent':
        return 'badge-default';
      case 'late':
        return 'badge-warning';
      case 'sick leave':
        return 'badge-hr';
      case 'annual leave':
        return 'badge-manager';
      case 'overtime':
        return 'badge-admin';
      default:
        return 'badge-default';
    }
  };

  // Check if any search filters are active
  const hasActiveSearch = () => {
    return searchParams.staff_id || searchParams.start_date || 
           searchParams.end_date || searchParams.status || searchParams.date;
  };

  // Render add attendance modal
  const renderAddModal = () => {
    if (!showAddModal) return null;

    return (
      <div className="modal-overlay">
        <div className="modal-content modal-large">
          <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3>Add New Attendance Record</h3>
              <p>Fill out the form below to add a new attendance record</p>
            </div>
            <button 
              onClick={closeAddModal} 
              className="close-btn"
            >
              <X size={20} />
            </button>
          </div>    
          <div className="modal-body">
            <form onSubmit={(e) => e.preventDefault()}>
              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem'}}>
                <div className="form-group">
                  <label htmlFor='add-staff-id'>Staff ID <span className="required">*</span></label>
                  <input 
                    id='add-staff-id' 
                    type='number'  
                    value={addForm.staff_id}
                    onChange={(e) => handleAddFormChange('staff_id', e.target.value)}
                    className={addValidationErrors.staff_id ? 'error' : ''}
                    placeholder="Enter staff ID (numbers only)"
                  />
                  {addValidationErrors.staff_id && (
                    <div className="validation-error">{addValidationErrors.staff_id}</div>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="add-date">Date <span className="required">*</span></label>
                  <input
                    id="add-date"
                    type="date"
                    value={addForm.date}
                    onChange={(e) => handleAddFormChange('date', e.target.value)}
                    className={addValidationErrors.date ? 'error' : ''}
                  />
                  {addValidationErrors.date && (
                    <div className="validation-error">{addValidationErrors.date}</div>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="add-check-in">Check In Time</label>
                  <input
                    id="add-check-in"
                    type="time"
                    value={addForm.check_in}
                    onChange={(e) => handleAddFormChange('check_in', e.target.value)}
                    className={addValidationErrors.check_in ? 'error' : ''}
                  />
                  {addValidationErrors.check_in && (
                    <div className="validation-error">{addValidationErrors.check_in}</div>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="add-check-out">Check Out Time</label>
                  <input
                    id="add-check-out"
                    type="time"
                    value={addForm.check_out}
                    onChange={(e) => handleAddFormChange('check_out', e.target.value)}
                  />
                </div>

                <div className="form-group" style={{gridColumn: '1 / -1'}}>
                  <label htmlFor="add-status">Status <span className="required">*</span></label>
                  <select
                    id="add-status"
                    value={addForm.status}
                    onChange={(e) => handleAddFormChange('status', e.target.value)}
                    className={addValidationErrors.status ? 'error' : ''}
                  >
                    <option value="Present">Present</option>
                    <option value="Absent">Absent</option>
                    <option value="Late">Late</option>
                    <option value="Sick Leave">Sick Leave</option>
                    <option value="Annual Leave">Annual Leave</option>
                    <option value="Overtime">Overtime</option>
                  </select>
                  {addValidationErrors.status && (
                    <div className="validation-error">{addValidationErrors.status}</div>
                  )}
                </div>
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
              onClick={addAttendance}
              disabled={isAdding}
              className="btn btn-success"
            >
              {isAdding ? (
                'Adding...'
              ) : (
                <>
                  <Plus className="btn-icon" />
                  Add Attendance Record
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Load all records when component mounts
  useEffect(() => {
    loadAllAttendance();
  }, []);

  return (
    <div className="app-container">
      <div className="main-card">
        {/* Header */}
        <div className="header">
          <h1>Attendance Management System</h1>
        </div>
      </div>
      
      <div className="divider" />

      <div className="main-card">
        {/* Controls */}
        <div className="controls">
          <div className="controls-wrapper">
            {/* Search area */}
            <div className="search-container">
              <div style={{ marginBottom: '1rem' }}>
                <form onSubmit={(e) => { e.preventDefault(); handleSearch(); }}>
                  <div className="search-input-wrapper">
                    <Search className="search-icon" />
                    <input
                      type="text"
                      value={searchParams.staff_id}
                      onChange={(e) => setSearchParams({...searchParams, staff_id: e.target.value})}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                      placeholder="Search by employee ID..."
                      className="search-input"
                    />
                  </div>
                </form>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.5rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', color: '#6b7280' }}>Start Date:</label>
                  <input
                    type="date"
                    value={searchParams.start_date}
                    onChange={(e) => setSearchParams({...searchParams, start_date: e.target.value})}
                    className="form-input"
                    style={{ width: '100%', padding: '0.5rem', fontFamily: 'monospace'}}
                  />
                </div>
                
                <div>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', color: '#6b7280' }}>End Date:</label>
                  <input
                    type="date"
                    value={searchParams.end_date}
                    onChange={(e) => setSearchParams({...searchParams, end_date: e.target.value})}
                    className="form-input"
                    style={{ width: '100%', padding: '0.5rem', fontFamily: 'monospace' }}
                  />
                </div>
                
                <div>
                  <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', color: '#6b7280' }}>Status:</label>
                  <select
                    value={searchParams.status}
                    onChange={(e) => setSearchParams({...searchParams, status: e.target.value})}
                    className="form-select"
                    style={{ width: '100%', padding: '0.5rem' }}
                  >
                    <option value="">All Status</option>
                    <option value="Present">Present</option>
                    <option value="Absent">Absent</option>
                    <option value="Late">Late</option>
                    <option value="Sick Leave">Sick Leave</option>
                    <option value="Annual Leave">Annual Leave</option>
                    <option value="Overtime">Overtime</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Button group */}
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                onClick={handleSearch}
                className="btn btn-primary"
                disabled={loading}
              >
                <Search className="btn-icon" />
                Search
              </button>

              <button
                onClick={loadAllAttendance}
                disabled={loading}
                className="btn btn-primary"
              >
                <History className="btn-icon" />
                Refresh
              </button>

              {hasActiveSearch() && (
                <button
                  onClick={clearSearch}
                  className="btn btn-secondary"
                  disabled={loading}
                >
                  <Trash2 className="btn-icon" />
                  Clear Search
                </button>
              )}

              <button 
                onClick={openAddModal}
                className="btn btn-success"
                disabled={loading}
              >
                <Plus className="btn-icon" />
                Add Attendance Record
              </button>
            </div>
          </div>
        </div>

        {/* Success Message Banner */}
        {successMessage && (
          <div style={{ padding: '12px 20px', backgroundColor: '#d1fae5', color: '#065f46', borderBottom: '1px solid #e5e7eb' }}>
            {successMessage}
          </div>
        )}

        {/* Content */}
        <div className="content">
          {loading && (
            <div className="loading-state">
              <Loader size={48} className="animate-spin" />
              <div>Loading attendance records...</div>
            </div>
          )}
          
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          {!loading && !error && attendanceList.length === 0 && (
            <div className="empty-state">
              <h3>No attendance records found</h3>
              <p>Please try adjusting search criteria or add new attendance records</p>
            </div>
          )}

          {!loading && !error && attendanceList.length > 0 && (
            <div>
              <h2 className="result-title">Attendance Records (Total: {attendanceList.length})</h2>
              
              <div className="table-container">
                <table className="staff-table">
                  <thead>
                    <tr className="table-header">
                      <th>Record ID</th>
                      <th>Employee ID</th>
                      <th>Date</th>
                      <th>Check In</th>
                      <th>Check Out</th>
                      <th>Total Hours</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendanceList.map((record) => (
                      <tr 
                        key={record.attendance_log} 
                        className={`table-row ${editingRecord === record.attendance_log ? 'editing' : ''}`}
                      >
                        <td>
                          <strong className="staff-id">{record.attendance_log}</strong>
                        </td>
                        <td>{record.staff_id}</td>
                        <td>{formatDate(record.date)}</td>
                        <td>
                          {editingRecord === record.attendance_log ? (
                            <input
                              type="time"
                              value={editData.check_in}
                              onChange={(e) => setEditData({...editData, check_in: e.target.value})}
                              className="edit-input"
                              disabled={isUpdating}
                            />
                          ) : (
                            <span style={{ color: isLate(record.check_in) ? "red" : "inherit" }}>
                              {formatTime(record.check_in) || '-'}
                            </span>
                          )}
                        </td>
                        <td>
                          {editingRecord === record.attendance_log ? (
                            <input
                              type="time"
                              value={editData.check_out}
                              onChange={(e) => setEditData({...editData, check_out: e.target.value})}
                              className="edit-input"
                              disabled={isUpdating}
                            />
                          ) : (
                            <span style={{color: isOvertime(record.check_out) ? "orange" : "inherit"}}>
                              {formatTime(record.check_out) || '-'}
                            </span>
                          )}
                        </td>
                        <td>
                          <span className="position-badge">
                            {record.total_hours || '0'} hours
                          </span>
                        </td>
                        <td>
                          {editingRecord === record.attendance_log ? (
                            <select
                              value={editData.status}
                              onChange={(e) => setEditData({...editData, status: e.target.value})}
                              className="edit-input"
                              disabled={isUpdating}
                            >
                              <option value="Present">Present</option>
                              <option value="Absent">Absent</option>
                              <option value="Late">Late</option>
                              <option value="Sick Leave">Sick Leave</option>
                              <option value="Annual Leave">Annual Leave</option>
                              <option value="Overtime">Overtime</option>
                            </select>
                          ) : (
                            <span className={`role-badge ${getStatusBadgeClass(record.status)}`}>
                              {record.status}
                            </span>
                          )}
                        </td>
                        <td className="actions-cell">
                          {editingRecord === record.attendance_log ? (
                            <div className="edit-actions">
                              <button 
                                onClick={saveEdit}
                                className="action-btn save-btn"
                                title="Save"
                                disabled={isUpdating}
                              >
                                {isUpdating ? <Loader size={16} className="animate-spin" /> : <Save size={16} />}
                              </button>
                              <button 
                                onClick={cancelEdit}
                                className="action-btn cancel-btn"
                                title="Cancel"
                                disabled={isUpdating}
                              >
                                <X size={16} />
                              </button>
                            </div>
                          ) : (
                            <div className="edit-actions">
                              <button 
                                onClick={() => startEdit(record)}
                                className="action-btn edit-btn"
                                title="Edit"
                              >
                                <Edit size={16} />
                              </button>
                              <button 
                                onClick={() => deleteRecord(record.attendance_log)}
                                className="action-btn cancel-btn"
                                title="Delete"
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
            </div>
          )}
        </div>

        {/* Add Modal */}
        {renderAddModal()}
      </div>
    </div>
  );
};

export default AttendanceManagementSystem;