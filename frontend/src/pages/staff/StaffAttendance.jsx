import React, { useState, useEffect } from 'react';
import { User, AlertCircle, Loader } from 'lucide-react';

const StaffAttendance = () => {
  const [attendanceData, setAttendanceData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAttendanceData();
  }, []);

  // API
  const getApiUrl = () => {
    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
      return 'http://localhost:3001';
    }
    return import.meta.env.VITE_API_URL || 'http://localhost:3001';
  };

  const API_BASE_URL = `${getApiUrl()}/api`;

  const fetchAttendanceData = async () => {
    try {
      setLoading(true);
      setError('');

      const token = localStorage.getItem('authToken');
      
      if (!token) {
        setError('Please login to view your attendance records.');
        setLoading(false);
        return;
      }

      console.log('Fetching attendance from:', `${API_BASE_URL}/attendance/my-records`);
      console.log('Token present:', !!token);

      const response = await fetch(`${API_BASE_URL}/attendance/my-records`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Attendance response status:', response.status);

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Your session has expired. Please login again.');
        } else if (response.status === 404) {
          throw new Error('No attendance records found.');
        } else {
          throw new Error(`Server error: ${response.status}`);
        }
      }
      
      const data = await response.json();
      console.log('Attendance data received:', data);

      if (data.success) {
        setAttendanceData(data.data);
        setError('');
      } else {
        setError(data.message || 'Failed to load attendance data');
      }
    } catch (err) {
      console.error('Attendance fetch error:', err);
      setError(err.message || 'Error loading attendance data');
      
      if (err.message.includes('session') || err.message.includes('login')) {
        localStorage.removeItem('authToken');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    fetchAttendanceData();
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
    try {
      return new Date(dateString).toLocaleDateString('en-GB');
    } catch (err) {
      return 'Invalid date';
    }
  };

  const formatTime = (timeString) => {
    if (!timeString) return 'N/A';
    try {
      return timeString.substring(0, 5);
    } catch (err) {
      return timeString;
    }
  };

  const formatHours = (hours) => {
    if (!hours) return 'N/A';
    return `${parseFloat(hours).toFixed(2)}h`;
  };

  const getStatusBadge = (status) => {
    const statusColors = {
      'Present': 'status-badge active',
      'Absent': 'status-badge locked', 
      'Late': 'status-badge warning',
      'Sick Leave': 'status-badge default',
      'Annual Leave': 'status-badge default',
      'Overtime': 'status-badge active'
    };

    return (
      <span className={statusColors[status] || 'status-badge default'}>
        {status}
      </span>
    );
  };

  const renderErrorMessage = (message, type = 'error') => (
    <div className={`error-message ${type}`}>
      <AlertCircle size={20} />
      <span>{message}</span>
    </div>
  );

  if (loading) {
    return (
      <div className="staff-profile-container">
        <div className="profile-card">
          <div className="profile-content">
            <div className="loading-state">
              <Loader size={48} className="animate-spin" />
              <div>Loading your attendance records...</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // If there's an error and no attendance data
  if (error && !attendanceData) {
    return (
      <div className="staff-profile-container">
        <div className="profile-card">
          <div className="profile-header">
            <div className="header-content">
              <div className="user-info">
                <div className="avatar">
                  <User size={32} />
                </div>
                <div className="user-details">
                  <h1 className="user-name">My Attendance</h1>
                  <p className="user-position">Unable to load attendance records</p>
                </div>
              </div>
            </div>
          </div>
          <div className="profile-content">
            {renderErrorMessage(error)}
            <div className="error-actions" style={{ marginTop: '1rem' }}>
              <button 
                className="retry-button"
                onClick={handleRetry}
              >
                Try Again
              </button>
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
                <h1 className="user-name">My Attendance Records</h1>
              </div>
            </div>
            <div className="action-buttons">
              <button 
                className="edit-button"
                onClick={handleRetry}
              >
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="error-banner">
            {renderErrorMessage(error, 'warning')}
          </div>
        )}

        {/* Content */}
        <div className="profile-content">
          {attendanceData && attendanceData.length > 0 ? (
            <div className="info-card">
              <h2 className="section-title">Attendance History</h2>
              <div className="table-container">
                <table className="staff-table">
                  <thead className="table-header">
                    <tr>
                      <th>Date</th>
                      <th>Clock In</th>
                      <th>Clock Out</th>
                      <th>Total Hours</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendanceData.map((record, index) => (
                      <tr key={record.attendance_log || index} className="table-row">
                        <td>{formatDate(record.date)}</td>
                        <td>{formatTime(record.check_in)}</td>
                        <td>{formatTime(record.check_out)}</td>
                        <td>{formatHours(record.total_hours)}</td>
                        <td>{getStatusBadge(record.status)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="info-card">
              <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                <User size={48} style={{ color: '#d1d5db', marginBottom: '1rem' }} />
                <h3 style={{ margin: '0 0 0.5rem 0', color: '#374151' }}>No Attendance Records Found</h3>
                <p style={{ margin: '0 0 1rem 0' }}>You don't have any attendance records yet.</p>
                <button 
                  className="retry-button"
                  onClick={handleRetry}
                >
                  Refresh
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StaffAttendance;