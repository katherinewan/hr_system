import { Routes, Route } from 'react-router-dom';
import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserCheck, 
  Clock, 
  Briefcase, 
  Building2, 
  DollarSign,
  ArrowRight,
  Bell,
  TrendingUp
} from 'lucide-react';
import Header from '../../components/Header.jsx';
import Staffinfo from './Staffinfo';
import UserAccount from './UserAccount'; 
import Attendance from './All_Attendance'; 
import Position from './Position'; 
import Department from './Department';
import Salary from './Salary';
import LeaveManagement from './LeaveManagement.jsx';

// Layout Component
const Layout = ({ children }) => (
  <div>
    <Header />
    {children}
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

  const quickStats = [
    { label: 'Active Employees', value: '156', icon: Users, color: 'blue' },
    { label: 'Present Today', value: '142', icon: UserCheck, color: 'green' },
    { label: 'Pending Reviews', value: '8', icon: Clock, color: 'orange' },
    { label: 'New Hires', value: '3', icon: TrendingUp, color: 'purple' }
  ];

  const menuItems = [
    { 
      title: 'Employee Management', 
      desc: 'View and manage employee information and records', 
      icon: Users,
      path: '/staffs',
      color: 'blue'
    },
    { 
      title: 'User Accounts', 
      desc: 'Manage system user accounts and permissions', 
      icon: UserCheck,
      path: '/user-accounts',
      color: 'green'
    },
    { 
      title: 'Attendance Tracking', 
      desc: 'Monitor employee attendance and working hours', 
      icon: Clock,
      path: '/attendance',
      color: 'orange'
    },
    { 
      title: 'Position Management', 
      desc: 'Configure job positions and requirements', 
      icon: Briefcase,
      path: '/position',
      color: 'purple'
    },
    { 
      title: 'Department Structure', 
      desc: 'Organize and manage company departments', 
      icon: Building2,
      path: '/department',
      color: 'indigo'
    },
    { 
      title: 'Payroll & Salary', 
      desc: 'Handle salary calculations and payments', 
      icon: DollarSign,
      path: '/salary',
      color: 'emerald'
    }
  ];

  return (
    <div className="dashboard-container">
      {/* Hero Section */}
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

      {/* Quick Stats */}
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

      {/* Quick Actions */}
      <div className="section-card">
        <div className="section-header">
          <h2 className="section-title">Quick Actions</h2>
          <Bell className="notification-icon" />
        </div>
        
        <div className="menu-grid">
          {menuItems.map((item, index) => (
            <div key={index} className={`menu-card menu-${item.color}`}>
              <div className="menu-icon">
                <item.icon size={28} />
              </div>
              <div className="menu-content">
                <h3 className="menu-title">{item.title}</h3>
                <p className="menu-desc">{item.desc}</p>
                <div className="menu-arrow">
                  <ArrowRight size={16} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* System Info */}
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
        <Route path="/" element={<DashboardHome />} />
        <Route path="/staffs" element={<Staffinfo />} />
        <Route path="/staffinfo" element={<Staffinfo />} />
        <Route path="/user-accounts" element={<UserAccount />} />
        <Route path="/attendance" element={<Attendance />} />
        <Route path="/salary" element={<Salary />} />
        <Route path="/leave-management" element={<LeaveManagement />} />
        <Route path="/payroll" element={
          <div className="coming-soon">
            <h2>Payroll Management</h2>
            <p>Coming soon...</p>
          </div>
        } />
        <Route path="/position" element={<Position />} />
        <Route path="/department" element={<Department />} />
        <Route path="/settings" element={
          <div className="coming-soon">
            <h2>System Settings</h2>
            <p>Coming soon...</p>
          </div>
        } />
        <Route path="*" element={<DashboardHome />} />
      </Routes>
    </Layout>
  );
}