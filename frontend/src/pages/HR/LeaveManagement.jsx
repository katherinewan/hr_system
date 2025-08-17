import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { Calendar, FileText, BarChart3 } from 'lucide-react';

// 直接導入組件，不使用 React.lazy
import HRLeaveRequests from './LeaveRequests';
import HRLeaveRecords from './LeaveRecord';
import HRLeaveBalances from './LeaveBalance'; 

// 導航組件
const LeaveNavigation = () => {
  const location = useLocation();
  
  const navItems = [
    {
      path: '/hr/leave-management/requests',
      label: '員工申請',
      icon: <FileText size={18} />,
      description: '審核和管理員工假期申請'
    },
    {
      path: '/hr/leave-management/records',
      label: '申請記錄',
      icon: <Calendar size={18} />,
      description: '查看所有假期申請記錄'
    },
    {
      path: '/hr/leave-management/balances',
      label: '假期餘額',
      icon: <BarChart3 size={18} />,
      description: '管理員工假期餘額統計'
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

// 主要的 Leave Management 組件
const LeaveManagementSystem = () => {
  const [error, setError] = useState('');

  useEffect(() => {
    console.log('Leave Management System loaded successfully');
  }, []);

  return (
    <div className="app-container">
      <div className="main-card">
        {/* Header */}
        <div className="header">
          <h1>Leave Management System</h1>
          <p>HR 假期管理系統 - 審核、記錄與統計員工假期申請</p>
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
            {/* 默認路由 */}
            <Route path="" element={<HRLeaveRequests />} />
            <Route path="*" element={<HRLeaveRequests />} />
          </Routes>
        </div>
      </div>
    </div>
  );
};

export default LeaveManagementSystem;