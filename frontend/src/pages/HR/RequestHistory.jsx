import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Calendar, FileText, BarChart3, History, Users, Clock } from 'lucide-react';
import LeaveRecord from './LeaveRecord';
import LeaveRequests from '../pages/LeaveRequests';
import RequestHistory from './RequestHistory';

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
      path: '/leave-management/history',
      label: 'Request History',
      icon: <History size={18} />,
      description: 'View detailed history of all leave requests'
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
  const [stats, setStats] = React.useState({
    overview: null,
    loading: true
  });

  const API_BASE_URL = 'http://localhost:3001/api';

  React.useEffect(() => {
    const loadStats = async () => {
      try {
        const [leaveStatsRes, requestStatsRes] = await Promise.all([
          fetch(`${API_BASE_URL}/leaves/stats/overview`),
          fetch(`${API_BASE_URL}/leave-requests/stats/overview`)
        ]);

        const leaveStats = await leaveStatsRes.json();
        const requestStats = await requestStatsRes.json();

        setStats({
          overview: {
            leaves: leaveStats.success ? leaveStats.data : null,
            requests: requestStats.success ? requestStats.data : null
          },
          loading: false
        });
      } catch (error) {
        console.error('Error loading statistics:', error);
        setStats(prev => ({ ...prev, loading: false }));
      }
    };

    loadStats();
  }, []);

  if (stats.loading) {
    return (
      <div className="content">
        <div className="loading-state">
          <div>Loading statistics...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="content">
      <h2 className="result-title">Leave Management Statistics</h2>
      
      {/* Overview Cards */}
      <div style={{
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
        gap: '2rem',
        marginBottom: '3rem'
      }}>
        {/* Leave Records Stats */}
        {stats.overview?.leaves && (
          <div style={{
            padding: '1.5rem',
            background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
            borderRadius: '12px',
            border: '1px solid #bae6fd'
          }}>
            <h3 style={{
              margin: '0 0 1rem 0',
              color: '#0369a1',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <Calendar size={20} />
              Leave Records
            </h3>
            <div style={{display: 'grid', gap: '0.5rem'}}>
              <div style={{display: 'flex', justifyContent: 'space-between'}}>
                <span>Total Records:</span>
                <strong>{stats.overview.leaves.overview.total_leaves}</strong>
              </div>
              <div style={{display: 'flex', justifyContent: 'space-between'}}>
                <span>Approved:</span>
                <strong style={{color: '#16a34a'}}>{stats.overview.leaves.overview.approved_leaves}</strong>
              </div>
              <div style={{display: 'flex', justifyContent: 'space-between'}}>
                <span>Pending:</span>
                <strong style={{color: '#d97706'}}>{stats.overview.leaves.overview.pending_leaves}</strong>
              </div>
              <div style={{display: 'flex', justifyContent: 'space-between'}}>
                <span>Average Days:</span>
                <strong>{stats.overview.leaves.overview.avg_leave_days}</strong>
              </div>
            </div>
          </div>
        )}

        {/* Leave Requests Stats */}
        {stats.overview?.requests && (
          <div style={{
            padding: '1.5rem',
            background: 'linear-gradient(135deg, #fef3c7 0%, #fed7aa 100%)',
            borderRadius: '12px',
            border: '1px solid #fbbf24'
          }}>
            <h3 style={{
              margin: '0 0 1rem 0',
              color: '#d97706',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <FileText size={20} />
              Leave Requests
            </h3>
            <div style={{display: 'grid', gap: '0.5rem'}}>
              <div style={{display: 'flex', justifyContent: 'space-between'}}>
                <span>Total Requests:</span>
                <strong>{stats.overview.requests.overview.total_requests}</strong>
              </div>
              <div style={{display: 'flex', justifyContent: 'space-between'}}>
                <span>Approved:</span>
                <strong style={{color: '#16a34a'}}>{stats.overview.requests.overview.approved_requests}</strong>
              </div>
              <div style={{display: 'flex', justifyContent: 'space-between'}}>
                <span>Pending:</span>
                <strong style={{color: '#d97706'}}>{stats.overview.requests.overview.pending_requests}</strong>
              </div>
              <div style={{display: 'flex', justifyContent: 'space-between'}}>
                <span>Urgent:</span>
                <strong style={{color: '#dc2626'}}>{stats.overview.requests.urgent.urgent_requests}</strong>
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div style={{
          padding: '1.5rem',
          background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
          borderRadius: '12px',
          border: '1px solid #86efac'
        }}>
          <h3 style={{
            margin: '0 0 1rem 0',
            color: '#16a34a',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <BarChart3 size={20} />
            Quick Actions
          </h3>
          <div style={{display: 'grid', gap: '0.75rem'}}>
            <button className="btn btn-success" style={{width: '100%', fontSize: '0.875rem'}}>
              <Users className="btn-icon" />
              View by Department
            </button>
            <button className="btn btn-primary" style={{width: '100%', fontSize: '0.875rem'}}>
              <Calendar className="btn-icon" />
              Monthly Report
            </button>
            <button className="btn btn-warning" style={{width: '100%', fontSize: '0.875rem'}}>
              <Clock className="btn-icon" />
              Pending Approvals
            </button>
          </div>
        </div>
      </div>

      {/* Placeholder for charts */}
      <div className="welcome-state">
        <BarChart3 size={64} style={{ color: '#799496', marginBottom: '1rem' }} />
        <h3>Detailed Analytics Coming Soon</h3>
        <p>This section will show comprehensive leave analytics, charts, and detailed reports.</p>
        <div style={{ marginTop: '2rem' }}>
          <button className="btn btn-primary">
            <BarChart3 className="btn-icon" />
            Generate Full Report
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
          path="/leave-management/history" 
          element={
            <LeaveLayout>
              <RequestHistory />
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