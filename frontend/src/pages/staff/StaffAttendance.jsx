import React, { useState, useEffect } from 'react';
import { User, AlertCircle } from 'lucide-react';

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

      // 修正：使用正確的API端點獲取員工自己的出勤記錄
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
        // 修正：設置出勤數據而不是profile數據
        setAttendanceData(data.data);
        setError('');
      } else {
        setError(data.message || 'Failed to load attendance data');
      }
    } catch (err) {
      console.error('Attendance fetch error:', err);
      setError(err.message || 'Error loading attendance data');
      
      // If authentication failed, redirect to login
      if (err.message.includes('session') || err.message.includes('login')) {
        // Clear invalid token
        localStorage.removeItem('authToken');
        // You can redirect to login page here if needed
        // window.location.href = '/login';
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
      return new Date(dateString).toLocaleDateString('en-GB'); // 使用 DD/MM/YYYY 格式
    } catch (err) {
      return 'Invalid date';
    }
  };

  const formatTime = (timeString) => {
    if (!timeString) return 'N/A';
    try {
      // 如果時間格式是 HH:mm:ss，只顯示 HH:mm
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
      'Present': 'status-present',
      'Absent': 'status-absent', 
      'Late': 'status-late',
      'Sick Leave': 'status-sick',
      'Annual Leave': 'status-leave',
      'Overtime': 'status-overtime'
    };

    return (
      <span className={`status-badge ${statusColors[status] || 'status-default'}`}>
        {status}
      </span>
    );
  };

  const renderLoadingState = () => (
    <div className="staff-attendance-container">
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading your attendance...</p>
      </div>
    </div>
  );

  const renderErrorMessage = (message, type = 'error') => (
    <div className={`error-message ${type}`}>
      <AlertCircle size={20} />
      <span>{message}</span>
    </div>
  );

  if (loading) {
    return renderLoadingState();
  }

  // If there's an error and no attendance data
  if (error && !attendanceData) {
    return (
      <div className="staff-attendance-container">
        <div className="attendance-card">
          <div className="attendance-header">
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
          <div className="error-section">
            {renderErrorMessage(error)}
            <div className="error-actions">
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
    <div className="staff-attendance-container">
      <div className="attendance-header">
        <h2>My Attendance Records</h2>
        <button 
          className="refresh-button"
          onClick={handleRetry}
        >
          Refresh
        </button>
      </div>

      {error && (
        <div className="error-banner">
          {renderErrorMessage(error, 'warning')}
        </div>
      )}

      {attendanceData && attendanceData.length > 0 ? (
        <div className="attendance-table-container">
          <table className="attendance-table">
            <thead>
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
                <tr key={record.attendance_log || index}>
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
      ) : (
        <div className="no-data-message">
          <User size={48} />
          <h3>No Attendance Records Found</h3>
          <p>You don't have any attendance records yet.</p>
          <button 
            className="retry-button"
            onClick={handleRetry}
          >
            Refresh
          </button>
        </div>
      )}
    </div>
  );
};

export default StaffAttendance;