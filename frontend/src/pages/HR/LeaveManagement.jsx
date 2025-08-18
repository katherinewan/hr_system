import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { Calendar, FileText, BarChart3 } from 'lucide-react';

// Direct import components to avoid dynamic import issues
import HRLeaveRequests from './LeaveRequests';
import HRLeaveRecords from './LeaveRecord';
// Temporarily use built-in component to avoid filename issues
// import HRLeaveBalances from './LeaveBalance';

// Temporary HRLeaveBalances component
const HRLeaveBalances = () => {
  const [loading, setLoading] = useState(true);
  const [balanceData, setBalanceData] = useState([]);
  const [error, setError] = useState('');

  // API configuration
  const getApiUrl = () => {
    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
      return 'http://localhost:3001';
    }
    return import.meta.env.VITE_API_URL || 'http://localhost:3001';
  };

  const API_BASE_URL = `${getApiUrl()}/api`;

  useEffect(() => {
    const loadBalances = async () => {
      try {
        setLoading(true);
        console.log('Loading balances from:', `${API_BASE_URL}/holidays/quotas`);
        
        const response = await fetch(`${API_BASE_URL}/holidays/quotas`);
        const data = await response.json();
        
        if (data.success) {
          setBalanceData(data.data || []);
        } else {
          setError(data.message || 'Unable to load leave balances');
        }
      } catch (error) {
        console.error('Error loading balances:', error);
        setError('Failed to load balances, please check network connection');
      } finally {
        setLoading(false);
      }
    };

    loadBalances();
  }, [API_BASE_URL]);

  if (loading) {
    return (
      <div className="loading-state">
        <div>Loading leave balance data...</div>
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

  return (
    <div className="app-container">
      <div className="main-card">
        <div className="header">
          <h2>Leave Balance Management</h2>
          <p>Manage employee leave balance statistics ({balanceData.length} records)</p>
        </div>
        
        <div className="content">
          <div className="table-container">
            <table className="staff-table">
              <thead>
                <tr className="table-header">
                  <th>Employee ID</th>
                  <th>Employee Name</th>
                  <th>Sick Leave</th>
                  <th>Annual Leave</th>
                  <th>Casual Leave</th>
                  <th>Maternity Leave</th>
                  <th>Paternity Leave</th>
                  <th>Year</th>
                </tr>
              </thead>
              <tbody>
                {balanceData.map((staff) => (
                  <tr key={`${staff.staff_id}-${staff.leave_year}`} className="table-row">
                    <td><strong className="staff-id">{staff.staff_id}</strong></td>
                    <td>{staff.staff_name || 'N/A'}</td>
                    <td>
                      <div style={{ fontSize: '0.875rem' }}>
                        <div>Remaining: {staff.sl_remaining || 0} days</div>
                        <div style={{ color: '#6b7280', fontSize: '0.75rem' }}>
                          Quota: {staff.sl_quota || 0} days
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.875rem' }}>
                        <div>Remaining: {staff.al_remaining || 0} days</div>
                        <div style={{ color: '#6b7280', fontSize: '0.75rem' }}>
                          Quota: {staff.al_quota || 0} days
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.875rem' }}>
                        <div>Remaining: {staff.cl_remaining || 0} days</div>
                        <div style={{ color: '#6b7280', fontSize: '0.75rem' }}>
                          Quota: {staff.cl_quota || 0} days
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.875rem' }}>
                        <div>Remaining: {staff.ml_remaining || 0} days</div>
                        <div style={{ color: '#6b7280', fontSize: '0.75rem' }}>
                          Quota: {staff.ml_quota || 0} days
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: '0.875rem' }}>
                        <div>Remaining: {staff.pl_remaining || 0} days</div>
                        <div style={{ color: '#6b7280', fontSize: '0.75rem' }}>
                          Quota: {staff.pl_quota || 0} days
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="attempts-badge normal">
                        {staff.leave_year || new Date().getFullYear()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {balanceData.length === 0 && (
            <div className="empty-state">
              <BarChart3 size={64} />
              <h3>No Balance Records Found</h3>
              <p>No employee leave balance data available in the system</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Navigation component
const LeaveNavigation = () => {
  const location = useLocation();
  
  const navItems = [
    {
      path: '/hr/leave-management/requests',
      label: 'Employee Requests',
      icon: <FileText size={18} />,
      description: 'Review and manage employee leave requests'
    },
    {
      path: '/hr/leave-management/records',
      label: 'Request Records',
      icon: <Calendar size={18} />,
      description: 'View all leave request records'
    },
    {
      path: '/hr/leave-management/balances',
      label: 'Leave Balances',
      icon: <BarChart3 size={18} />,
      description: 'Manage employee leave balance statistics'
    }
  ];

  return (
    <div className="controls">
      <div className="controls-wrapper">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`btn ${isActive ? 'btn-primary' : 'btn-secondary'}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                textDecoration: 'none',
                minWidth: '140px'
              }}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
};

// Main Leave Management component
const LeaveManagementSystem = () => {
  const [error, setError] = useState('');

  useEffect(() => {
    console.log('Leave Management System loaded successfully');
    console.log('Current URL:', window.location.href);
    console.log('Available routes: requests, records, balances');
  }, []);

  return (
    <div className="app-container">
      <div className="main-card">
        {/* Header */}
        <div className="header">
          <h1>Leave Management</h1>
        </div>
      </div>
      
      <div className="divider" />
      
      <div className="main-card">
        {/* Navigation */}
        <LeaveNavigation />

        {/* Error Message */}
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {/* Content */}
        <div className="content">
          <Routes>
            <Route path="requests" element={<HRLeaveRequests />} />
            <Route path="records" element={<HRLeaveRecords />} />
            <Route path="balances" element={<HRLeaveBalances />} />
            {/* Default routes */}
            <Route path="" element={<HRLeaveRequests />} />
            <Route path="*" element={<HRLeaveRequests />} />
          </Routes>
        </div>
      </div>
    </div>
  );
};

export default LeaveManagementSystem;