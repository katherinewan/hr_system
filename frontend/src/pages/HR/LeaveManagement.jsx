// LeaveManagement.jsx - 完整版本
import React from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { Calendar, FileText, BarChart3 } from 'lucide-react';

// 暫時的測試組件 - 你可以用實際的組件替換
const HRLeaveRequests = () => (
  <div style={{ padding: '2rem', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
    <h2 style={{ color: '#254e70', marginBottom: '1rem' }}>員工申請</h2>
    <p>這是 HR 假期申請審核頁面</p>
    <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: 'white', borderRadius: '6px' }}>
      <p>功能包含:</p>
      <ul>
        <li>查看待審核的假期申請</li>
        <li>批准或拒絕申請</li>
        <li>查看申請詳情</li>
      </ul>
    </div>
  </div>
);

const HRLeaveRecords = () => (
  <div style={{ padding: '2rem', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
    <h2 style={{ color: '#254e70', marginBottom: '1rem' }}>申請記錄</h2>
    <p>這是所有假期申請記錄頁面</p>
    <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: 'white', borderRadius: '6px' }}>
      <p>功能包含:</p>
      <ul>
        <li>查看所有申請歷史</li>
        <li>搜尋和篩選記錄</li>
        <li>導出記錄報告</li>
      </ul>
    </div>
  </div>
);

const HRLeaveBalances = () => (
  <div style={{ padding: '2rem', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
    <h2 style={{ color: '#254e70', marginBottom: '1rem' }}>假期餘額</h2>
    <p>這是員工假期餘額管理頁面</p>
    <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: 'white', borderRadius: '6px' }}>
      <p>功能包含:</p>
      <ul>
        <li>查看員工假期餘額</li>
        <li>調整假期額度</li>
        <li>生成餘額報告</li>
      </ul>
    </div>
  </div>
);

// 導航組件
const LeaveNavigation = () => {
  const location = useLocation();
  
  const navItems = [
    {
      path: '/hr/leave-management/requests',
      label: '員工申請',
      icon: <FileText size={18} />,
      description: '審核和管理員工假期申請'
    },
    {
      path: '/hr/leave-management/records',
      label: '申請記錄',
      icon: <Calendar size={18} />,
      description: '查看所有假期申請記錄'
    },
    {
      path: '/hr/leave-management/balances',
      label: '假期餘額',
      icon: <BarChart3 size={18} />,
      description: '管理員工假期餘額統計'
    }
  ];

  return (
    <div style={{
      display: 'flex',
      gap: '1rem',
      padding: '1rem',
      backgroundColor: '#f8f9fa',
      borderRadius: '8px',
      marginBottom: '2rem',
      flexWrap: 'wrap'
    }}>
      {navItems.map((item) => {
        const isActive = location.pathname === item.path;
        return (
          <Link
            key={item.path}
            to={item.path}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1rem',
              borderRadius: '6px',
              textDecoration: 'none',
              backgroundColor: isActive ? '#254e70' : 'white',
              color: isActive ? 'white' : '#254e70',
              border: `1px solid ${isActive ? '#254e70' : '#e5e7eb'}`,
              transition: 'all 0.2s ease',
              fontWeight: '500',
              fontSize: '0.9rem',
              boxShadow: isActive ? '0 2px 4px rgba(37, 78, 112, 0.2)' : '0 1px 3px rgba(0, 0, 0, 0.1)'
            }}
            onMouseEnter={(e) => {
              if (!isActive) {
                e.target.style.backgroundColor = '#f3f4f6';
                e.target.style.borderColor = '#254e70';
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                e.target.style.backgroundColor = 'white';
                e.target.style.borderColor = '#e5e7eb';
              }
            }}
          >
            {item.icon}
            {item.label}
          </Link>
        );
      })}
    </div>
  );
};

// 主要組件
export default function LeaveManagement() {
  console.log('LeaveManagement component loaded successfully');
  
  return (
    <div style={{
      padding: '2rem',
      maxWidth: '1200px',
      margin: '0 auto',
      minHeight: '80vh'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        overflow: 'hidden'
      }}>
        {/* 標題區域 */}
        <div style={{
          padding: '2rem',
          borderBottom: '1px solid #e5e7eb',
          background: 'linear-gradient(135deg, #254e70 0%, #799496 100%)',
          color: 'white'
        }}>
          <h1 style={{
            fontSize: '2rem',
            fontWeight: '700',
            margin: '0 0 0.5rem 0'
          }}>
            Leave Management System
          </h1>
          <p style={{
            margin: 0,
            fontSize: '1rem',
            opacity: 0.9
          }}>
            HR 假期管理系統 - 審核、記錄與統計員工假期申請
          </p>
        </div>

        {/* 內容區域 */}
        <div style={{ padding: '2rem' }}>
          <LeaveNavigation />

          {/* 路由配置 - 使用相對路徑 */}
          <Routes>
            <Route path="requests" element={<HRLeaveRequests />} />
            <Route path="records" element={<HRLeaveRecords />} />
            <Route path="balances" element={<HRLeaveBalances />} />
            {/* 默認路由 */}
            <Route path="" element={<HRLeaveRequests />} />
            <Route path="*" element={<HRLeaveRequests />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}