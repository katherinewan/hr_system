// HR_Homepage.jsx - 完整版本
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
import Payroll from './Payroll.jsx';
import LoginForm from '../../components/LoginForm.jsx';

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
      path: '/hr/staffs',
      color: 'blue'
    },
    { 
      title: 'User Accounts', 
      desc: 'Manage system user accounts and permissions', 
      icon: UserCheck,
      path: '/hr/user-accounts',
      color: 'green'
    },
    { 
      title: 'Attendance Tracking', 
      desc: 'Monitor employee attendance and working hours', 
      icon: Clock,
      path: '/hr/attendance',
      color: 'orange'
    },
    { 
      title: 'Leave Management', 
      desc: 'Manage employee leave requests and approvals', 
      icon: Clock,
      path: '/hr/leave-management',
      color: 'red'
    },
    { 
      title: 'Position Management', 
      desc: 'Configure job positions and requirements', 
      icon: Briefcase,
      path: '/hr/position',
      color: 'purple'
    },
    { 
      title: 'Department Structure', 
      desc: 'Organize and manage company departments', 
      icon: Building2,
      path: '/hr/department',
      color: 'indigo'
    },
    { 
      title: 'Payroll & Salary', 
      desc: 'Handle salary calculations and payments', 
      icon: DollarSign,
      path: '/hr/salary',
      color: 'emerald'
    }
  ];

  const handleMenuClick = (path) => {
    window.location.href = path;
  };

  return (
    <div className="dashboard-container">
      {/* Hero Section */}
      <div className="hero-section" style={{
        background: 'linear-gradient(135deg, #254e70 0%, #799496 100%)',
        color: 'white',
        padding: '3rem 2rem',
        borderRadius: '12px',
        margin: '2rem',
        marginTop: '1rem'
      }}>
        <div className="hero-content">
          <div className="hero-text">
            <h1 style={{ 
              fontSize: '2.5rem', 
              fontWeight: '700',
              margin: '0 0 1rem 0'
            }}>
              HR Management System
            </h1>
            <p style={{ 
              fontSize: '1.2rem',
              margin: '0 0 1rem 0',
              opacity: 0.9
            }}>
              {userInfo ? `Welcome back, ${userInfo.name}!` : 'Welcome to HR Management System'}
            </p>
            {userInfo && (
              <div style={{
                display: 'flex',
                gap: '1rem',
                flexWrap: 'wrap'
              }}>
                <span style={{
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  padding: '0.5rem 1rem',
                  borderRadius: '20px',
                  fontSize: '0.9rem'
                }}>
                  {userInfo.role}
                </span>
                <span style={{
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  padding: '0.5rem 1rem',
                  borderRadius: '20px',
                  fontSize: '0.9rem'
                }}>
                  ID: {userInfo.staff_id}
                </span>
                {userInfo.department_name && (
                  <span style={{
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    padding: '0.5rem 1rem',
                    borderRadius: '20px',
                    fontSize: '0.9rem'
                  }}>
                    {userInfo.department_name}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div style={{
        backgroundColor: 'white',
        margin: '0 2rem',
        borderRadius: '12px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        overflow: 'hidden'
      }}>
        <div style={{
          padding: '2rem 2rem 1rem 2rem',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <h2 style={{ 
            margin: 0, 
            fontSize: '1.5rem',
            fontWeight: '600',
            color: '#1f2937'
          }}>
            Quick Actions
          </h2>
        </div>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '1rem',
          padding: '2rem'
        }}>
          {menuItems.map((item, index) => (
            <div 
              key={index} 
              onClick={() => handleMenuClick(item.path)}
              style={{
                backgroundColor: '#f9fafb',
                padding: '1.5rem',
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '1rem'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = '#f3f4f6';
                e.target.style.borderColor = '#254e70';
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 8px 15px rgba(0, 0, 0, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = '#f9fafb';
                e.target.style.borderColor = '#e5e7eb';
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = 'none';
              }}
            >
              <div style={{
                backgroundColor: `var(--${item.color}-50, #f0f9ff)`,
                color: `var(--${item.color}-600, #2563eb)`,
                padding: '0.75rem',
                borderRadius: '8px',
                flexShrink: 0
              }}>
                <item.icon size={28} />
              </div>
              <div style={{ flex: 1 }}>
                <h3 style={{ 
                  margin: '0 0 0.5rem 0',
                  fontSize: '1.1rem',
                  fontWeight: '600',
                  color: '#1f2937'
                }}>
                  {item.title}
                </h3>
                <p style={{ 
                  margin: 0,
                  color: '#6b7280',
                  fontSize: '0.9rem',
                  lineHeight: 1.4
                }}>
                  {item.desc}
                </p>
              </div>
              <div style={{
                color: '#6b7280',
                alignSelf: 'center'
              }}>
                <ArrowRight size={16} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* System Info */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '1rem',
        padding: '2rem',
        paddingBottom: '3rem'
      }}>
        <div style={{
          backgroundColor: 'white',
          padding: '1rem',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span style={{ color: '#6b7280', fontSize: '0.9rem' }}>System Version:</span>
          <span style={{ fontWeight: '600', color: '#1f2937' }}>v2.0.1</span>
        </div>
        <div style={{
          backgroundColor: 'white',
          padding: '1rem',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span style={{ color: '#6b7280', fontSize: '0.9rem' }}>Last Login:</span>
          <span style={{ fontWeight: '600', color: '#1f2937', fontSize: '0.85rem' }}>
            {userInfo?.last_login 
              ? new Date(userInfo.last_login).toLocaleString() 
              : 'First time login'
            }
          </span>
        </div>
        <div style={{
          backgroundColor: 'white',
          padding: '1rem',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span style={{ color: '#6b7280', fontSize: '0.9rem' }}>Server Status:</span>
          <span style={{ 
            fontWeight: '600', 
            color: '#10b981',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <div style={{
              width: '8px',
              height: '8px',
              backgroundColor: '#10b981',
              borderRadius: '50%'
            }}></div>
            Online
          </span>
        </div>
      </div>
    </div>
  );
};

// HR_Homepage.jsx - 修正後的路由配置
export default function Homepage() {
  console.log('✅ HR Homepage component loaded');
  
  return (
    <Layout>
      <Routes>
        <Route path="*" element={<DashboardHome />} />
        <Route path="/" element={<DashboardHome />} />
        <Route path="/staffs" element={<Staffinfo />} />
        <Route path="/staffinfo" element={<Staffinfo />} />
        <Route path="/user-accounts" element={<UserAccount />} />
        <Route path="/attendance" element={<Attendance />} />
        <Route path="/salary" element={<Salary />} />
        <Route path="/leave-management/*" element={<LeaveManagement />} />
        <Route path="/payroll" element={<Payroll />} />
        <Route path="/position" element={<Position />} />
        <Route path="/department" element={<Department />} />
        <Route path="/settings" element={
          <div style={{
            padding: '3rem',
            textAlign: 'center',
            backgroundColor: 'white',
            margin: '2rem',
            borderRadius: '12px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
          }}>
            <h2 style={{ color: '#254e70', marginBottom: '1rem' }}>System Settings</h2>
            <p style={{ color: '#6b7280' }}>Coming soon...</p>
          </div>
        } />
        {/* 移除這行！這是造成問題的根源 */}
        {/* <Route path="/login" element={<LoginForm />} /> */}
      </Routes>
    </Layout>
  );
}