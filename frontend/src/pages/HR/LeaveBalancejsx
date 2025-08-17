import React, { useState, useEffect } from 'react';
import { 
  Search, BarChart3, User, Building, AlertCircle, Loader, 
  Calendar, Edit3, Save, X, TrendingUp, Users
} from 'lucide-react';

const HRLeaveBalances = () => {
  const [leaveBalances, setLeaveBalances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [editingBalance, setEditingBalance] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [isUpdating, setIsUpdating] = useState(false);
  const [statistics, setStatistics] = useState({});

  // API base URL
  const API_BASE_URL = 'http://localhost:3001/api';

  // 通用函數
  const showError = (message) => {
    setError(message);
    setSuccessMessage('');
  };

  const showSuccess = (message) => {
    setSuccessMessage(message);
    setError('');
    setTimeout(() => setSuccessMessage(''), 5000);
  };

  // 載入假期餘額
  const loadLeaveBalances = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/holidays/quotas`);
      const data = await response.json();
      
      if (data.success) {
        setLeaveBalances(data.data || []);
        calculateStatistics(data.data || []);
      } else {
        showError(data.message || '無法載入假期餘額');
      }
    } catch (error) {
      showError('載入餘額失敗，請檢查網路連接');
      console.error('Error loading leave balances:', error);
    } finally {
      setLoading(false);
    }
  };

  // 計算統計資訊
  const calculateStatistics = (balances) => {
    const stats = {
      totalEmployees: balances.length,
      totalSickLeave: balances.reduce((sum, b) => sum + (b.sl_quota || 0), 0),
      totalAnnualLeave: balances.reduce((sum, b) => sum + (b.al_quota || 0), 0),
      totalCasualLeave: balances.reduce((sum, b) => sum + (b.cl_quota || 0), 0),
      averageUtilization: 0
    };

    if (balances.length > 0) {
      const totalQuota = stats.totalSickLeave + stats.totalAnnualLeave + stats.totalCasualLeave;
      const totalUsed = balances.reduce((sum, b) => sum + (b.sl_used || 0) + (b.al_used || 0) + (b.cl_used || 0), 0);
      stats.averageUtilization = totalQuota > 0 ? Math.round((totalUsed / totalQuota) * 100) : 0;
    }

    setStatistics(stats);
  };

  // 開始編輯餘額
  const startEditing = (balance) => {
    setEditingBalance(`${balance.staff_id}-${balance.leave_year}`);
    setEditForm({
      sl_quota: balance.sl_quota || 0,
      al_quota: balance.al_quota || 0,
      cl_quota: balance.cl_quota || 0,
      ml_quota: balance.ml_quota || 0,
      pl_quota: balance.pl_quota || 0
    });
  };

  // 取消編輯
  const cancelEditing = () => {
    setEditingBalance(null);
    setEditForm({});
  };

  // 處理表單變更
  const handleFormChange = (field, value) => {
    setEditForm(prev => ({
      ...prev,
      [field]: parseInt(value) || 0
    }));
  };

  // 更新餘額配額
  const updateBalance = async (staffId) => {
    try {
      setIsUpdating(true);
      
      const response = await fetch(`${API_BASE_URL}/holidays/quotas/${staffId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editForm)
      });

      const result = await response.json();
      
      if (result.success) {
        showSuccess('假期配額更新成功');
        setEditingBalance(null);
        setEditForm({});
        loadLeaveBalances(); // 重新載入數據
      } else {
        showError(result.message || '更新失敗');
      }
    } catch (error) {
      showError('網路錯誤，請稍後再試');
      console.error('Error updating balance:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  // 渲染編輯欄位
  const renderEditField = (balance, field) => {
    const isEditing = editingBalance === `${balance.staff_id}-${balance.leave_year}`;
    const value = editForm[field];
    
    if (!isEditing) {
      return (
        <div className="allowances-breakdown">
          <div className="allowance-item">
            剩餘: {balance[field.replace('_quota', '_remaining')]}天
          </div>
          <div style={{ fontSize: '0.7rem', color: '#6b7280' }}>
            配額: {balance[field]}天
          </div>
        </div>
      );
    }
    
    return (
      <div className="edit-field-container">
        <input
          type="number"
          value={value}
          onChange={(e) => handleFormChange(field, e.target.value)}
          className="edit-input"
          min="0"
          max="365"
          style={{ width: '80px', textAlign: 'center' }}
        />
        <div style={{ fontSize: '0.7rem', color: '#6b7280', marginTop: '2px' }}>
          已用: {balance[field.replace('_quota', '_used')]}天
        </div>
      </div>
    );
  };

  // 載入數據
  useEffect(() => {
    loadLeaveBalances();
  }, []);

  // 篩選餘額
  const filteredBalances = leaveBalances.filter(balance => {
    const matchesSearch = searchInput === '' || 
      balance.staff_name.toLowerCase().includes(searchInput.toLowerCase());
    const matchesDepartment = departmentFilter === '' || 
      balance.department_name === departmentFilter;
    return matchesSearch && matchesDepartment;
  });

  // 獲取所有部門
  const departments = [...new Set(leaveBalances.map(b => b.department_name).filter(Boolean))];

  return (
    <div style={{ minHeight: '100vh' }}>
      {/* 統計儀表板 */}
      <div className="salary-stats-dashboard">
        <div className="stats-header">
          <h3>假期餘額統計概覽</h3>
        </div>
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon total">
              <Users size={24} />
            </div>
            <div className="stat-content">
              <div className="stat-value">{statistics.totalEmployees}</div>
              <div className="stat-label">員工總數</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon average">
              <Calendar size={24} />
            </div>
            <div className="stat-content">
              <div className="stat-value">{statistics.totalAnnualLeave}</div>
              <div className="stat-label">年假總配額</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon highest">
              <BarChart3 size={24} />
            </div>
            <div className="stat-content">
              <div className="stat-value">{statistics.totalSickLeave}</div>
              <div className="stat-label">病假總配額</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon employees">
              <TrendingUp size={24} />
            </div>
            <div className="stat-content">
              <div className="stat-value">{statistics.averageUtilization}%</div>
              <div className="stat-label">平均使用率</div>
            </div>
          </div>
        </div>
      </div>

      {/* 控制區域 */}
      <div className="controls">
        <div className="controls-wrapper">
          <div className="search-container">
            <div className="search-input-wrapper">
              <Search className="search-icon" size={20} />
              <input
                type="text"
                className="search-input"
                placeholder="搜尋員工姓名..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>
          </div>

          <select
            className="search-input"
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            style={{ minWidth: '140px' }}
          >
            <option value="">所有部門</option>
            {departments.map(dept => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>

          <button
            className="btn btn-primary"
            onClick={loadLeaveBalances}
            disabled={loading}
          >
            <BarChart3 size={20} className="btn-icon" />
            重新整理
          </button>

          <button
            className="btn btn-secondary"
            onClick={() => {
              setSearchInput('');
              setDepartmentFilter('');
            }}
          >
            清除篩選
          </button>
        </div>
      </div>

      {/* 成功/錯誤訊息 */}
      {successMessage && (
        <div style={{
          padding: '12px 20px',
          backgroundColor: '#d1fae5',
          color: '#065f46',
          borderBottom: '1px solid #e5e7eb'
        }}>
          {successMessage}
        </div>
      )}

      {error && (
        <div className="error-message" style={{ margin: '0', borderRadius: '0' }}>
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* 內容 */}
      <div className="content">
        <h2 className="result-title">
          員工假期餘額 ({filteredBalances.length})
        </h2>

        {loading ? (
          <div className="loading-state">
            <Loader size={48} className="animate-spin" />
            <div>載入餘額資料中...</div>
          </div>
        ) : filteredBalances.length === 0 ? (
          <div className="empty-state">
            <BarChart3 size={64} />
            <h3>沒有找到餘額記錄</h3>
            <p>沒有符合篩選條件的員工假期餘額</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="staff-table">
              <thead className="table-header">
                <tr>
                  <th>員工資訊</th>
                  <th>病假</th>
                  <th>年假</th>
                  <th>事假</th>
                  <th>產假</th>
                  <th>陪產假</th>
                  <th>假期年度</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredBalances.map((balance) => {
                  const isEditing = editingBalance === `${balance.staff_id}-${balance.leave_year}`;
                  
                  return (
                    <tr key={`${balance.staff_id}-${balance.leave_year}`} 
                        className={`table-row ${isEditing ? 'editing' : ''}`}>
                      <td>
                        <div className="employee-info">
                          <div className="employee-name">{balance.staff_name}</div>
                          <div className="employee-id">ID: {balance.staff_id}</div>
                          <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                            {balance.department_name || '未分配部門'}
                          </div>
                        </div>
                      </td>
                      <td>{renderEditField(balance, 'sl_quota')}</td>
                      <td>{renderEditField(balance, 'al_quota')}</td>
                      <td>{renderEditField(balance, 'cl_quota')}</td>
                      <td>{renderEditField(balance, 'ml_quota')}</td>
                      <td>{renderEditField(balance, 'pl_quota')}</td>
                      <td>
                        <span className="attempts-badge normal">
                          {balance.leave_year}
                        </span>
                      </td>
                      <td className="actions-cell">
                        {isEditing ? (
                          <div className="edit-actions">
                            <button
                              onClick={() => updateBalance(balance.staff_id)}
                              disabled={isUpdating}
                              className="action-btn save-btn"
                              title="儲存變更"
                            >
                              {isUpdating ? '...' : <Save size={16} />}
                            </button>
                            <button
                              onClick={cancelEditing}
                              disabled={isUpdating}
                              className="action-btn cancel-btn"
                              title="取消編輯"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => startEditing(balance)}
                            className="action-btn edit-btn"
                            title="編輯配額"
                          >
                            <Edit3 size={16} />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* 使用率警告 */}
        {filteredBalances.length > 0 && (
          <div style={{ marginTop: '2rem' }}>
            <h3 style={{ marginBottom: '1rem', color: '#2e382e' }}>使用率分析</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
              {filteredBalances
                .filter(balance => {
                  const totalQuota = (balance.sl_quota || 0) + (balance.al_quota || 0) + (balance.cl_quota || 0);
                  const totalUsed = (balance.sl_used || 0) + (balance.al_used || 0) + (balance.cl_used || 0);
                  const utilizationRate = totalQuota > 0 ? (totalUsed / totalQuota) * 100 : 0;
                  return utilizationRate > 80; // 顯示使用率超過80%的員工
                })
                .map(balance => {
                  const totalQuota = (balance.sl_quota || 0) + (balance.al_quota || 0) + (balance.cl_quota || 0);
                  const totalUsed = (balance.sl_used || 0) + (balance.al_used || 0) + (balance.cl_used || 0);
                  const utilizationRate = totalQuota > 0 ? Math.round((totalUsed / totalQuota) * 100) : 0;
                  
                  return (
                    <div key={`warning-${balance.staff_id}`} style={{
                      padding: '1rem',
                      backgroundColor: utilizationRate > 90 ? '#fef2f2' : '#fef3c7',
                      borderRadius: '8px',
                      border: `1px solid ${utilizationRate > 90 ? '#fca5a5' : '#fbbf24'}`
                    }}>
                      <div style={{ fontWeight: '600', marginBottom: '0.5rem' }}>
                        {balance.staff_name} (使用率: {utilizationRate}%)
                      </div>
                      <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                        已使用 {totalUsed} 天，配額 {totalQuota} 天
                      </div>
                      {utilizationRate > 90 && (
                        <div style={{ fontSize: '0.75rem', color: '#dc2626', marginTop: '0.25rem' }}>
                          <AlertCircle size={12} style={{ display: 'inline', marginRight: '4px' }} />
                          假期使用率過高，建議關注
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
            
            {filteredBalances.filter(balance => {
              const totalQuota = (balance.sl_quota || 0) + (balance.al_quota || 0) + (balance.cl_quota || 0);
              const totalUsed = (balance.sl_used || 0) + (balance.al_used || 0) + (balance.cl_used || 0);
              const utilizationRate = totalQuota > 0 ? (totalUsed / totalQuota) * 100 : 0;
              return utilizationRate > 80;
            }).length === 0 && (
              <div style={{
                padding: '2rem',
                textAlign: 'center',
                backgroundColor: '#ecfdf5',
                borderRadius: '8px',
                border: '1px solid #86efac',
                color: '#16a34a'
              }}>
                <BarChart3 size={48} style={{ marginBottom: '1rem', opacity: 0.7 }} />
                <div style={{ fontWeight: '600' }}>假期使用狀況良好</div>
                <div style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
                  目前沒有員工的假期使用率超過 80%
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default HRLeaveBalances;