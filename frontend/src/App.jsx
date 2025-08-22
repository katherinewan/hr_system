import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// 修正後的組件導入路徑
import LoginForm from './components/Loginform';  

// HR 相關組件
import HRHomepage from './pages/HR/HR_Homepage';  // HR 主頁面

// Staff 相關組件  
import StaffHomepage from './pages/staff/StaffHomepage';  // Staff 主頁面
import StaffLeave from './pages/staff/StaffLeave';

// Auth Hook - 添加 logout 事件監聽
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

    // 監聽登出事件 (從 Header 觸發)
    const handleLogout = () => {
      console.log('Logout event received');
      setUser(null);
      // 可選：強制重導向到登入頁
      window.location.href = '/login';
    };

    window.addEventListener('loginSuccess', handleLoginSuccess);
    window.addEventListener('logout', handleLogout);
    
    return () => {
      window.removeEventListener('loginSuccess', handleLoginSuccess);
      window.removeEventListener('logout', handleLogout);
    };
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

        {/* Dashboard Route - 根據角色重定向 */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute user={user} allowedRoles={['Admin', 'HR', 'Manager', 'Employee']}>
              {user?.role === 'HR' || user?.role === 'Admin' ? (
                <Navigate to="/hr" replace />
              ) : (
                <Navigate to="/staff" replace />
              )}
            </ProtectedRoute>
          }
        />

        {/* HR Routes - 使用通配符路由 */}
        <Route
          path="/hr/*"
          element={
            <ProtectedRoute user={user} allowedRoles={['HR', 'Admin']}>
              <HRHomepage />
            </ProtectedRoute>
          }
        />

        {/* Staff Routes - 使用通配符路由 */}
        <Route
          path="/staff/*"
          element={
            <ProtectedRoute user={user} allowedRoles={['Employee', 'Manager']}>
              <StaffHomepage />
            </ProtectedRoute>
          }
        />

        {/* 兼容舊路由 */}
        <Route
          path="/staff-leave"
          element={
            <ProtectedRoute user={user} allowedRoles={['Employee', 'Manager']}>
              <StaffLeave />
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