import React, { useState, useEffect } from 'react';
import { Search, Users, Trash2, Plus, Edit, Save, X, Clock, Calendar, Filter } from 'lucide-react';

const AttendanceManagementSystem = () => {
  const [attendanceList, setAttendanceList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Search parameters
  const [searchParams, setSearchParams] = useState({
    staff_id: '',
    start_date: '',
    end_date: '',
    status: '',
    date: ''
  });
  
  // Clock data parameters
  const [clockData, setClockData] = useState({
    staff_id: '',
    type: 'check_in',
    notes: ''
  });
  
  // Edit mode
  const [editingRecord, setEditingRecord] = useState(null);
  const [editData, setEditData] = useState({
    check_in: '',
    check_out: '',
    status: ''
  });

  // Modal states
  const [showClockModal, setShowClockModal] = useState(false);

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
    setLoading(false);
  };

  // Clear error
  const clearError = () => {
    setError('');
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
  };

  // Handle clock in/out
  const handleClock = async () => {
    if (!clockData.staff_id || !clockData.type) {
      alert('Please fill in Employee ID and clock type');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/attendance/clock`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(clockData)
      });

      const data = await response.json();

      if (data.success) {
        alert(data.message);
        setClockData({ staff_id: '', type: 'check_in', notes: '' });
        setShowClockModal(false);
        loadAllAttendance();
      } else {
        alert(data.message || 'Clock in/out failed');
      }
    } catch (error) {
      console.error('Clock error:', error);
      alert('Error occurred during clock in/out');
    }
  };

  // Start editing
  const startEdit = (record) => {
    setEditingRecord(record.attendance_log);
    setEditData({
      check_in: record.check_in || '',
      check_out: record.check_out || '',
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
    try {
      const response = await fetch(`${API_BASE_URL}/attendance/${editingRecord}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editData)
      });

      const data = await response.json();

      if (data.success) {
        alert('Record updated successfully');
        cancelEdit();
        loadAllAttendance();
      } else {
        alert(data.message || 'Update failed');
      }
    } catch (error) {
      console.error('Update error:', error);
      alert('Error occurred during update');
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
        alert('Record deleted successfully');
        loadAllAttendance();
      } else {
        alert(data.message || 'Delete failed');
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('Error occurred during deletion');
    }
  };

  // Format time
  const formatTime = (timeString) => {
    if (!timeString) return '';
    return timeString.substring(0, 5); // Show only HH:MM
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US');
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

  // Load all records when component mounts
  useEffect(() => {
    loadAllAttendance();
  }, []);

  // Clock modal
  const ClockModal = () => {
    if (!showClockModal) return null;

    return (
      <div className="modal-overlay">
        <div className="modal-content">
          <div className="modal-header">
            <div className="modal-header-content">
              <div className="modal-title-section">
                <h3 className="modal-title-with-icon">
                  <Clock size={20} />
                  Employee Clock In/Out
                </h3>
                <p>Please select employee and clock type</p>
              </div>
              <button 
                onClick={() => setShowClockModal(false)}
                className="close-btn"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          <div className="modal-body">
            <div className="form-group">
              <label className="form-label-with-icon">
                <Users size={16} />
                Employee ID <span className="required">*</span>
              </label>
              <input
                type="text"
                value={clockData.staff_id}
                onChange={(e) => setClockData({...clockData, staff_id: e.target.value})}
                placeholder="Enter Employee ID"
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label className="form-label-with-icon">
                <Clock size={16} />
                Clock Type <span className="required">*</span>
              </label>
              <select
                value={clockData.type}
                onChange={(e) => setClockData({...clockData, type: e.target.value})}
                className="form-select"
              >
                <option value="check_in">Clock In</option>
                <option value="check_out">Clock Out</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label-with-icon">
                <Edit size={16} />
                Notes
              </label>
              <input
                type="text"
                value={clockData.notes}
                onChange={(e) => setClockData({...clockData, notes: e.target.value})}
                placeholder="Optional notes"
                className="form-input"
              />
            </div>
          </div>

          <div className="modal-footer">
            <button 
              className="btn btn-secondary" 
              onClick={() => setShowClockModal(false)}
            >
              Cancel
            </button>
            <button 
              className="btn btn-success" 
              onClick={handleClock}
            >
              <Clock className="btn-icon" />
              Clock In/Out
            </button>
          </div>
        </div>
      </div>
    );
  };

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
                <div className="search-input-wrapper">
                  <Search className="search-icon" />
                  <input
                    type="text"
                    value={searchParams.staff_id}
                    onChange={(e) => setSearchParams({...searchParams, staff_id: e.target.value})}
                    placeholder="Enter Employee ID to search..."
                    className="search-input"
                  />
                </div>
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
              >
                <Search className="btn-icon" />
                Search
              </button>

              <button
                onClick={clearSearch}
                className="btn btn-secondary"
              >
                <Trash2 className="btn-icon" />
                Clear
              </button>

              <button
                onClick={loadAllAttendance}
                disabled={loading}
                className="btn btn-primary"
              >
                <Users className="btn-icon" />
                Load All
              </button>

              <button 
                onClick={() => setShowClockModal(true)}
                className="btn btn-success"
              >
                <Plus className="btn-icon" />
                Employee Clock
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="content">
          {loading && (
            <div className="loading-state">
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
                            />
                          ) : (
                            formatTime(record.check_in)
                          )}
                        </td>
                        <td>
                          {editingRecord === record.attendance_log ? (
                            <input
                              type="time"
                              value={editData.check_out}
                              onChange={(e) => setEditData({...editData, check_out: e.target.value})}
                              className="edit-input"
                            />
                          ) : (
                            formatTime(record.check_out)
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
                              >
                                <Save size={16} />
                              </button>
                              <button 
                                onClick={cancelEdit}
                                className="action-btn cancel-btn"
                                title="Cancel"
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

        {/* Modals */}
        <ClockModal />
      </div>
    </div>
  );
};

export default AttendanceManagementSystem;