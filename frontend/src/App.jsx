import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// 現有組件
import LoginForm from './components/LoginForm';
import Dashboard from './components/Dashboard';

// 新的假期管理組件
import StaffLeave from './components/StaffLeave';
import HRDashboard from './components/HRDashboard';

// Auth Hook
const useAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 檢查認證狀態
    const checkAuth = () => {
      try {
        const token = localStorage.getItem('authToken');
        const userInfo = localStorage.getItem('userInfo');
        
        if (token && userInfo) {
          setUser(JSON.parse(userInfo));
        }
      } catch (error) {
        console.error('Auth check error:', error);
        localStorage.removeItem('authToken');
        localStorage.removeItem('userInfo');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();

    // 監聽登入成功事件 (從 LoginForm 觸發)
    const handleLoginSuccess = () => {
      checkAuth();
    };

    window.addEventListener('loginSuccess', handleLoginSuccess);
    return () => window.removeEventListener('loginSuccess', handleLoginSuccess);
  }, []);

  const logout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userInfo');
    localStorage.removeItem('rememberedStaffId');
    setUser(null);
  };

  return { user, loading, logout };
};

// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles, user }) => {
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

// Layout Component with Navigation
const Layout = ({ children, user, logout }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navigationItems = [
    { 
      path: '/dashboard', 
      label: '儀表板', 
      roles: ['Admin', 'HR', 'Manager', 'Employee'] 
    },
    { 
      path: '/staff', 
      label: '我的假期', 
      roles: ['Employee', 'Manager'] 
    },
    { 
      path: '/hr', 
      label: '假期審批', 
      roles: ['HR', 'Admin'] 
    }
  ];

  const availableNavigation = navigationItems.filter(item => 
    item.roles.includes(user?.role)
  );

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <nav style={{
        width: sidebarOpen ? '250px' : '60px',
        backgroundColor: '#ffffff',
        boxShadow: '2px 0 10px rgba(0,0,0,0.1)',
        transition: 'width 0.3s ease',
        position: 'fixed',
        height: '100vh',
        zIndex: 1000
      }}>
        {/* Sidebar Header */}
        <div style={{
          padding: '16px',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          alignItems: 'center',
          justifyContent: sidebarOpen ? 'space-between' : 'center'
        }}>
          {sidebarOpen && (
            <span style={{ fontWeight: '700', color: '#2e382e' }}>HR系統</span>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px'
            }}
          >
            {sidebarOpen ? '✕' : '☰'}
          </button>
        </div>

        {/* Navigation Links */}
        <div style={{ padding: '16px 0' }}>
          {availableNavigation.map((item) => (
            <a
              key={item.path}
              href={item.path}
              style={{
                display: 'block',
                padding: sidebarOpen ? '12px 16px' : '12px',
                color: '#6b7280',
                textDecoration: 'none',
                transition: 'background-color 0.2s',
                textAlign: sidebarOpen ? 'left' : 'center'
              }}
              onClick={(e) => {
                e.preventDefault();
                window.location.href = item.path;
              }}
            >
              {sidebarOpen ? item.label : item.label.charAt(0)}
            </a>
          ))}
        </div>

        {/* User Info & Logout */}
        <div style={{
          position: 'absolute',
          bottom: '0',
          width: '100%',
          borderTop: '1px solid #e5e7eb',
          padding: '16px'
        }}>
          {sidebarOpen && (
            <div style={{ marginBottom: '12px', fontSize: '0.875rem' }}>
              <div style={{ fontWeight: '600', color: '#2e382e' }}>{user?.name}</div>
              <div style={{ color: '#6b7280' }}>{user?.role}</div>
            </div>
          )}
          <button
            onClick={logout}
            style={{
              width: '100%',
              padding: '8px',
              border: 'none',
              background: 'none',
              color: '#ef4444',
              cursor: 'pointer',
              textAlign: sidebarOpen ? 'left' : 'center'
            }}
          >
            {sidebarOpen ? '登出' : '↪'}
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main style={{
        marginLeft: sidebarOpen ? '250px' : '60px',
        transition: 'margin-left 0.3s ease',
        width: '100%',
        overflow: 'auto'
      }}>
        {children}
      </main>
    </div>
  );
};

// Unauthorized Page
const UnauthorizedPage = () => (
  <div style={{
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    textAlign: 'center'
  }}>
    <h2>訪問被拒絕</h2>
    <p>您沒有權限訪問此頁面</p>
    <button 
      onClick={() => window.history.back()}
      style={{
        padding: '10px 20px',
        backgroundColor: '#254e70',
        color: 'white',
        border: 'none',
        borderRadius: '5px',
        cursor: 'pointer'
      }}
    >
      返回
    </button>
  </div>
);

// Main App Component
const App = () => {
  const { user, loading, logout } = useAuth();

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh'
      }}>
        載入中...
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route 
          path="/login" 
          element={user ? <Navigate to="/dashboard" replace /> : <LoginForm />} 
        />

        {/* Protected Routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute user={user} allowedRoles={['Admin', 'HR', 'Manager', 'Employee']}>
              <Layout user={user} logout={logout}>
                <Dashboard />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/staff"
          element={
            <ProtectedRoute user={user} allowedRoles={['Employee', 'Manager']}>
              <Layout user={user} logout={logout}>
                <StaffLeave />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/hr"
          element={
            <ProtectedRoute user={user} allowedRoles={['HR', 'Admin']}>
              <Layout user={user} logout={logout}>
                <HRDashboard />
              </Layout>
            </ProtectedRoute>
          }
        />

        <Route path="/unauthorized" element={<UnauthorizedPage />} />

        {/* Default Routes */}
        <Route
          path="/"
          element={
            user ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />
          }
        />

        {/* Catch-all Route */}
        <Route
          path="*"
          element={<Navigate to={user ? "/dashboard" : "/login"} replace />}
        />
      </Routes>
    </Router>
  );
};

export default App;