import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Loginform';
import Homepage from './pages/HR/HR_Homepage';
import StaffHomepage from './pages/staff/StaffHomepage';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuthentication();
    
    const handleLoginSuccess = () => {
      console.log('Received login success event');
      checkAuthentication();
    };

    const handleLogout = () => {
      console.log('Received logout event');
      setIsAuthenticated(false);
      setUserRole(null);
    };

    window.addEventListener('loginSuccess', handleLoginSuccess);
    window.addEventListener('logout', handleLogout);
    
    return () => {
      window.removeEventListener('loginSuccess', handleLoginSuccess);
      window.removeEventListener('logout', handleLogout);
    };
  }, []);

  const checkAuthentication = () => {
    try {
      const token = localStorage.getItem('authToken');
      const userInfo = localStorage.getItem('userInfo');
      
      console.log('Checking authentication status:', { 
        tokenExists: !!token, 
        userInfoExists: !!userInfo
      });
      
      if (token && userInfo) {
        try {
          const user = JSON.parse(userInfo);
          console.log('Parsed user info:', user);
          
          if (user.role === 'Admin' || user.role === 'HR' || user.role === 'Employee') {
            console.log('Authentication successful, role:', user.role);
            setIsAuthenticated(true);
            setUserRole(user.role);
            return;
          } else {
            console.log('Invalid role:', user.role);
            localStorage.removeItem('authToken');
            localStorage.removeItem('userInfo');
          }
        } catch (parseError) {
          console.error('Failed to parse user info:', parseError);
          localStorage.removeItem('authToken');
          localStorage.removeItem('userInfo');
        }
      } else {
        console.log('No complete authentication data found');
      }
      
      setIsAuthenticated(false);
      setUserRole(null);
    } catch (error) {
      console.error('Authentication check error:', error);
      setIsAuthenticated(false);
      setUserRole(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: 'linear-gradient(135deg, #799496 0%, #254e70 50%, #2e382e 100%)',
        color: 'white',
        fontSize: '1.2rem',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1rem'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '3px solid rgba(255, 255, 255, 0.3)',
            borderRadius: '50%',
            borderTopColor: 'white',
            animation: 'spin 1s linear infinite'
          }}></div>
          <div>Checking authentication...</div>
        </div>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // 只使用一個 Router，根據認證狀態渲染不同的路由
  return (
    <Router>
      <Routes>
        {/* 未認證時的路由 */}
        {!isAuthenticated && (
          <Route path="*" element={<Login />} />
        )}
        
        {/* 已認證時的路由 */}
        {isAuthenticated && (
          <>
            {/* HR 和 Admin 路由 */}
            {(userRole === 'HR' || userRole === 'Admin') && (
              <Route path="/hr/*" element={<Homepage />} />
            )}
            
            {/* Employee 路由 */}
            {userRole === 'Employee' && (
              <Route path="/staff/*" element={<StaffHomepage />} />
            )}
            
            {/* 預設重定向 */}
            <Route 
              path="/" 
              element={
                userRole === 'Employee' 
                  ? <Navigate to="/staff" replace /> 
                  : <Navigate to="/hr" replace />
              } 
            />
            
            {/* 捕獲所有路由的重定向 */}
            <Route 
              path="*" 
              element={
                userRole === 'Employee' 
                  ? <Navigate to="/staff" replace /> 
                  : <Navigate to="/hr" replace />
              } 
            />
          </>
        )}
      </Routes>
    </Router>
  );
}