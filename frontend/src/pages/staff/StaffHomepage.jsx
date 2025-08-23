import { Routes, Route } from 'react-router-dom';
import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserCheck, 
  Clock, 
  TrendingUp
} from 'lucide-react';
import Header_staff from '../../components/Header_staff.jsx';
import StaffDashboard from './StaffDashboard.jsx';
import StaffProfile from './StaffProfile.jsx';
import Attendance from './StaffAttendance.jsx'; 
import Leave from './StaffLeave.jsx'; 
import Payslip from './StaffPayslip.jsx';

// Layout Component
const Layout = ({ children }) => (
  <div>
    <Header_staff />
    {children}
  </div>
);

// Coming Soon Component
const ComingSoon = ({ title }) => (
  <div>
    <h2>{title}</h2>
    <p>Coming soon...</p>
  </div>
);

// Main Dashboard Component
const DashboardHome = () => {
  const [userInfo, setUserInfo] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    // Get user information
    try {
      const storedUserInfo = localStorage.getItem('userInfo');
      if (storedUserInfo) {
        setUserInfo(JSON.parse(storedUserInfo));
      }
    } catch (error) {
      console.error('Error parsing user info:', error);
    }

    // Update current time every minute
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="dashboard-container">
      <div className="hero-section">
        <div className="hero-content">
          <div className="hero-text">
            <h1 className="hero-title">HR Management System</h1>
            <p className="hero-subtitle">
              {userInfo ? `Welcome back, ${userInfo.name}!` : 'Welcome to HR Management System'}
            </p>
            {userInfo && (
              <div className="user-details">
                <span className="user-role">{userInfo.role}</span>
                <span className="user-id">ID: {userInfo.staff_id}</span>
                {userInfo.department_name && (
                  <span className="user-dept">{userInfo.department_name}</span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="stats-grid">
        {quickStats.map((stat, index) => (
          <div key={index} className={`stat-card stat-${stat.color}`}>
            <div className="stat-icon">
              <stat.icon size={24} />
            </div>
            <div className="stat-content">
              <div className="stat-value">{stat.value}</div>
              <div className="stat-label">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>



      <div className="system-info">
        <div className="system-info-item">
          <span className="info-label">System Version:</span>
          <span className="info-value">v2.0.1</span>
        </div>
        <div className="system-info-item">
          <span className="info-label">Last Login:</span>
          <span className="info-value">
            {userInfo?.last_login 
              ? new Date(userInfo.last_login).toLocaleString() 
              : 'First time login'
            }
          </span>
        </div>
        <div className="system-info-item">
          <span className="info-label">Server Status:</span>
          <span className="info-value status-online">Online</span>
        </div>
      </div>
    </div>
  );
};

// Main Homepage Component
export default function Homepage() {
  console.log('✅ HR Homepage component loaded');
  
  return (
    // 移除 <Router> 標籤
    <Layout>
      <Routes>
        <Route path="/" element={<StaffDashboard />} />
        <Route path="/dashboard" element={<StaffDashboard />} />
        <Route path="/home" element={<DashboardHome />} />
        <Route path="/staff-profile" element={<StaffProfile />} />
        <Route path="/staff-attendance" element={<Attendance />} />
        <Route path="/leave" element={<Leave />} />
        <Route path="/payslip" element={<Payslip />} />
        <Route path="/settings" element={<ComingSoon title="System Settings" />} />
        <Route path="*" element={<StaffDashboard />} />
      </Routes>
    </Layout>
  );
}