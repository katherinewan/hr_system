// LeaveManagement.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Calendar, FileText, BarChart3 } from 'lucide-react';
import HRLeaveRequests from './HRLeaveRequests';
import HRLeaveRecords from './HRLeaveRecords';
import HRLeaveBalances from './HRLeaveBalances';

const LeaveNavigation = () => {
  const location = useLocation();
  
  const navItems = [
    {
      path: '/leave-management/requests',
      label: '員工申請',
      icon: <FileText size={18} />,
      description: '審核和管理員工假期申請'
    },
    {
      path: '/leave-management/records',
      label: '申請記錄',
      icon: <Calendar size={18} />,
      description: '查看所有假期申請記錄'
    },
    {
      path: '/leave-management/balances',
      label: '假期餘額',
      icon: <BarChart3 size={18} />,
      description: '管理員工假期餘額統計'
    }
  ];

  // ... 導航渲染邏輯
};

export default function LeaveManagement() {
  return (
    <Router>
      <div className="app-container">
        <div className="main-card">
          <div className="header">
            <h1>Leave Management System</h1>
            <p>HR 假期管理系統</p>
          </div>

          <LeaveNavigation />

          <Routes>
            <Route path="/leave-management/requests" element={<HRLeaveRequests />} />
            <Route path="/leave-management/records" element={<HRLeaveRecords />} />
            <Route path="/leave-management/balances" element={<HRLeaveBalances />} />
            <Route path="/leave-management" element={<HRLeaveRequests />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}