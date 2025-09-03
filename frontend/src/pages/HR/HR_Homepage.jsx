// HR_Homepage.jsx - Fixed Route Configuration
import { Routes, Route, useNavigate } from 'react-router-dom';
import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserCheck, 
  Clock, 
  Briefcase, 
  Building2, 
  DollarSign,
  ArrowRight,
  TrendingUp,
  Shield,
  Calendar
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

// Layout Component
const Layout = ({ children }) => (
  <div>
    <Header />
    {children}
  </div>
);

// Main Dashboard Component
const DashboardHome = () => {
  const navigate = useNavigate();
  const [userInfo, setUserInfo] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Fetch logged-in user info
  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        // Get user info from localStorage or session storage
        const storedUser = localStorage.getItem('currentUser') || sessionStorage.getItem('currentUser');
        
        if (storedUser) {
          const userData = JSON.parse(storedUser);
          setUserInfo(userData);
        } else {
          // If no stored user data, try to fetch from API using auth token
          const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
          
          if (token) {
            // API call to get current user info
            const response = await fetch('/api/auth/me', {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            });
            
            if (response.ok) {
              const userData = await response.json();
              setUserInfo(userData);
              // Store user data for future use
              localStorage.setItem('currentUser', JSON.stringify(userData));
            } else {
              console.error('Failed to fetch user info:', response.statusText);
              // Redirect to login if unauthorized
              if (response.status === 401) {
                window.location.href = '/login';
              }
            }
          } else {
            // No token found, redirect to login
            console.warn('No auth token found');
            window.location.href = '/login';
          }
        }
      } catch (error) {
        console.error('Error fetching user info:', error);
        // Fallback: try to get user from context or props if available
        // You might want to handle this differently based on your auth system
      }
    };

    fetchUserInfo();
  }, []);

  // Data arrays
  const quickStats = [
    { 
      label: 'Active Employees', 
      value: '156', 
      icon: Users, 
      color: '#799496',
      trend: '+3 this month'
    },
    { 
      label: 'Present Today', 
      value: '142', 
      icon: UserCheck, 
      color: '#254E70',
      trend: '91% attendance'
    },
    { 
      label: 'Pending Reviews', 
      value: '8', 
      icon: Clock, 
      color: '#7a8b99',
      trend: 'Due this week'
    },
    { 
      label: 'New Hires', 
      value: '3', 
      icon: TrendingUp, 
      color: '#e9eb9e',
      trend: 'Starting Monday'
    }
  ];

  const menuItems = [
    { 
      title: 'Employee Management', 
      desc: 'Comprehensive employee records, profiles, and personal information management', 
      icon: Users,
      path: '/hr/staff',
      iconColor: '#799496',
      iconBg: 'rgba(121, 148, 150, 0.1)'
    },
    { 
      title: 'User Accounts', 
      desc: 'System access control, user permissions, and authentication management', 
      icon: Shield,
      path: '/hr/user-accounts',
      iconColor: '#254E70',
      iconBg: 'rgba(37, 78, 112, 0.1)'
    },
    { 
      title: 'Attendance System', 
      desc: 'Real-time attendance tracking, working hours monitoring and reporting', 
      icon: Clock,
      path: '/hr/attendance',
      iconColor: '#7a8b99',
      iconBg: 'rgba(122, 139, 153, 0.1)'
    },
    { 
      title: 'Leave Management', 
      desc: 'Streamlined leave requests, approvals, and vacation planning workflow', 
      icon: Calendar,
      path: '/hr/leave-management',
      iconColor: '#799496',
      iconBg: 'rgba(121, 148, 150, 0.1)'
    },
    { 
      title: 'Position Control', 
      desc: 'Job roles definition, requirements setup and organizational structure', 
      icon: Briefcase,
      path: '/hr/position',
      iconColor: '#254E70',
      iconBg: 'rgba(37, 78, 112, 0.1)'
    },
    { 
      title: 'Department Hub', 
      desc: 'Departmental organization, team management and cross-functional coordination', 
      icon: Building2,
      path: '/hr/department',
      iconColor: '#7a8b99',
      iconBg: 'rgba(122, 139, 153, 0.1)'
    },
    { 
      title: 'Payroll & Compensation', 
      desc: 'Comprehensive salary management, payroll processing and benefits administration', 
      icon: DollarSign,
      path: '/hr/salary',
      iconColor: '#799496',
      iconBg: 'rgba(121, 148, 150, 0.1)'
    }
  ];

  const handleMenuClick = (path) => {
    navigate(path);
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
                e.currentTarget.style.backgroundColor = '#f3f4f6';
                e.currentTarget.style.borderColor = '#254e70';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 8px 15px rgba(0, 0, 0, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#f9fafb';
                e.currentTarget.style.borderColor = '#e5e7eb';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div style={{
                backgroundColor: item.iconBg,
                color: item.iconColor,
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

// HR_Homepage.jsx - Fixed Route Configuration
export default function Homepage() {
  console.log('HR Homepage component loaded');
  
  return (
    <Layout>
      <Routes>
        {/* Specific routes MUST come before wildcard */}
        <Route path="/" element={<DashboardHome />} />
        <Route path="/staff" element={<Staffinfo />} />
        <Route path="/staffinfo" element={<Staffinfo />} />
        <Route path="/user-accounts" element={<UserAccount />} />
        <Route path="/attendance" element={<Attendance />} />
        <Route path="/leave-management/*" element={<LeaveManagement />} />
        <Route path="/salary" element={<Salary />} />
        <Route path="/position" element={<Position />} />
        <Route path="/department" element={<Department />} />
        <Route path="/payroll" element={<Payroll />} />
      </Routes>
    </Layout>
  );
}