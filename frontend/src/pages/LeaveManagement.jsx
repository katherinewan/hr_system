import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Calendar, FileText, BarChart3, Users } from 'lucide-react';
import LeaveRecord from './LeaveRecord';
import LeaveRequests from '../pages/LeaveRequests';

// Navigation component
const LeaveNavigation = () => {
  const location = useLocation();
  
  const navItems = [
    {
      path: '/leave-management',
      label: 'Leave Records',
      icon: <Calendar size={18} />,
      description: 'View and manage all leave records'
    },
    {
      path: '/leave-management/requests',
      label: 'Leave Requests',
      icon: <FileText size={18} />,
      description: 'Manage leave applications and approvals'
    },
    {
      path: '/leave-management/statistics',
      label: 'Statistics',
      icon: <BarChart3 size={18} />,
      description: 'View leave analytics and reports'
    }
  ];

  return (
    <div className="controls" style={{ borderBottom: '1px solid #e5e7eb' }}>
      <div className="controls-wrapper" style={{ gap: '0.5rem' }}>
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`btn ${
              location.pathname === item.path ? 'btn-primary' : 'btn-secondary'
            }`}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.5rem',
              textDecoration: 'none',
              minWidth: 'fit-content'
            }}
          >
            {item.icon}
            {item.label}
          </Link>
        ))}
      </div>
    </div>
  );
};

// Main layout wrapper
const LeaveLayout = ({ children }) => {
  return (
    <div className="app-container">
      <div className="main-card">
        {/* Header */}
        <div className="header">
          <h1>Leave Management System</h1>
          <p>Manage employee leave records, applications, and approvals</p>
        </div>

        {/* Navigation */}
        <LeaveNavigation />

        {/* Content */}
        {children}
      </div>
    </div>
  );
};

// Statistics placeholder component
const LeaveStatistics = () => {
  return (
    <div className="content">
      <div className="welcome-state">
        <BarChart3 size={64} style={{ color: '#799496', marginBottom: '1rem' }} />
        <h3>Leave Statistics</h3>
        <p>This section will show leave analytics, charts, and reports.</p>
        <div style={{ marginTop: '2rem' }}>
          <button className="btn btn-primary">
            <BarChart3 className="btn-icon" />
            Generate Reports
          </button>
        </div>
      </div>
    </div>
  );
};

// Main Leave Management component
export default function LeaveManagement() {
  return (
    <Router>
      <Routes>
        <Route 
          path="/leave-management" 
          element={
            <LeaveLayout>
              <LeaveRecord />
            </LeaveLayout>
          } 
        />
        <Route 
          path="/leave-management/requests" 
          element={
            <LeaveLayout>
              <LeaveRequests />
            </LeaveLayout>
          } 
        />
        <Route 
          path="/leave-management/statistics" 
          element={
            <LeaveLayout>
              <LeaveStatistics />
            </LeaveLayout>
          } 
        />
        {/* Default route */}
        <Route 
          path="/" 
          element={
            <LeaveLayout>
              <LeaveRecord />
            </LeaveLayout>
          } 
        />
      </Routes>
    </Router>
  );
};