import React, { useEffect, useState } from 'react';
import Login from './pages/Loginform';
import Homepage from './pages/HR_Homepage';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuthentication();
    
    // 監聽登入成功事件
    const handleLoginSuccess = () => {
      console.log('🔔 收到登入成功事件');
      checkAuthentication();
    };

    // 監聽登出事件
    const handleLogout = () => {
      console.log('🔔 收到登出事件');
      setIsAuthenticated(false);
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
      
      console.log('檢查認證狀態 - 原始數據:', { 
        tokenExists: !!token, 
        userInfoExists: !!userInfo,
        tokenValue: token,
        userInfoValue: userInfo
      });
      
      if (token && userInfo) {
        try {
          const user = JSON.parse(userInfo);
          console.log('解析的用戶資訊:', user);
          
          // 檢查用戶角色是否為 Admin 或 HR
          if (user.role === 'Admin' || user.role === 'HR') {
            console.log('✅ 認證成功，角色:', user.role);
            setIsAuthenticated(true);
            return; // 早期返回，避免設置為 false
          } else {
            console.log('❌ 角色權限不足:', user.role);
            // 清除無效的認證資訊
            localStorage.removeItem('authToken');
            localStorage.removeItem('userInfo');
          }
        } catch (parseError) {
          console.error('解析用戶資訊失敗:', parseError);
          // 清除損壞的數據
          localStorage.removeItem('authToken');
          localStorage.removeItem('userInfo');
        }
      } else {
        console.log('❌ 未找到完整的認證資訊');
      }
      
      setIsAuthenticated(false);
    } catch (error) {
      console.error('認證檢查錯誤:', error);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  // 載入中狀態
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
          <div>檢查認證狀態...</div>
        </div>
      </div>
    );
  }

  // 根據認證狀態渲染不同組件
  if (isAuthenticated) {
    console.log('渲染 Homepage 組件');
    return <Homepage />;
  } else {
    console.log('渲染 Login 組件');
    return <Login />;
  }
}