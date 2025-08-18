import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { Calendar, FileText, BarChart3 } from 'lucide-react';

// Import components
import HRLeaveRequests from './LeaveRequests';
import HRLeaveRecords from './LeaveRecord';
import HRLeaveBalances from './LeaveBalance';

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