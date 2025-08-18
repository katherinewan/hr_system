import React, { useState, useEffect } from 'react';
import { 
  Search, BarChart3, AlertCircle, Loader, 
  Edit3, Save, X
} from 'lucide-react';

const HRLeaveBalances = () => {
  const [leaveBalances, setLeaveBalances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [editingBalance, setEditingBalance] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [isUpdating, setIsUpdating] = useState(false);

  // API
  const getApiUrl = () => {
    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
      return 'http://localhost:3001';
    }
    return import.meta.env.VITE_API_URL || 'http://localhost:3001';
  };

  const API_BASE_URL = `${getApiUrl()}/api`;

  // Utility functions
  const showError = (message) => {
    setError(message);
    setSuccessMessage('');
  };

  const showSuccess = (message) => {
    setSuccessMessage(message);
    setError('');
    setTimeout(() => setSuccessMessage(''), 5000);
  };

  // Load leave balances
  const loadLeaveBalances = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/holidays/quotas`);
      const data = await response.json();
      
      if (data.success) {
        setLeaveBalances(data.data || []);
      } else {
        showError(data.message || 'Unable to load leave balances');
      }
    } catch (error) {
      showError('Failed to load balances, please check network connection');
      console.error('Error loading leave balances:', error);
    } finally {
      setLoading(false);
    }
  };

  // Start editing balance
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

  // Cancel editing
  const cancelEditing = () => {
    setEditingBalance(null);
    setEditForm({});
  };

  // Handle form changes
  const handleFormChange = (field, value) => {
    setEditForm(prev => ({
      ...prev,
      [field]: parseInt(value) || 0
    }));
  };

  // Update balance allocation
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
        showSuccess('Leave allocation updated successfully');
        setEditingBalance(null);
        setEditForm({});
        loadLeaveBalances(); // Reload data
      } else {
        showError(result.message || 'Update failed');
      }
    } catch (error) {
      showError('Network error, please try again later');
      console.error('Error updating balance:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  // Render edit field
  const renderEditField = (balance, field) => {
    const isEditing = editingBalance === `${balance.staff_id}-${balance.leave_year}`;
    const value = editForm[field];
    
    if (!isEditing) {
      return (
        <div className="allowances-breakdown">
          <div className="allowance-item">
            Remaining: {balance[field.replace('_quota', '_remaining')]} days
          </div>
          <div style={{ fontSize: '0.7rem', color: '#6b7280' }}>
            Quota: {balance[field]} days
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
          Used: {balance[field.replace('_quota', '_used')]} days
        </div>
      </div>
    );
  };

  // Load data
  useEffect(() => {
    loadLeaveBalances();
  }, []);

  // Filter balances (only keep search functionality)
  const filteredBalances = leaveBalances.filter(balance => {
    const matchesSearch = searchInput === '' || 
      balance.staff_name.toLowerCase().includes(searchInput.toLowerCase());
    return matchesSearch;
  });

  return (
    <div style={{ minHeight: '100vh' }}>
      {/* Control Area - only keep search and refresh */}
      <div className="controls">
        <div className="controls-wrapper">
          <div className="search-container">
            <div className="search-input-wrapper">
              <Search className="search-icon" size={20} />
              <input
                type="text"
                className="search-input"
                placeholder="Search employee name..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>
          </div>

          <button
            className="btn btn-primary"
            onClick={loadLeaveBalances}
            disabled={loading}
          >
            <BarChart3 size={20} className="btn-icon" />
            Refresh
          </button>

          {searchInput && (
            <button
              className="btn btn-secondary"
              onClick={() => setSearchInput('')}
            >
              Clear Search
            </button>
          )}
        </div>
      </div>

      {/* Success/Error Messages */}
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

      {/* Content */}
      <div className="content">
        <h2 className="result-title">
          Employee Leave Balances ({filteredBalances.length})
        </h2>

        {loading ? (
          <div className="loading-state">
            <Loader size={48} className="animate-spin" />
            <div>Loading balance data...</div>
          </div>
        ) : filteredBalances.length === 0 ? (
          <div className="empty-state">
            <BarChart3 size={64} />
            <h3>No Balance Records Found</h3>
            <p>No employee leave balances match the filter criteria</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="staff-table">
              <thead className="table-header">
                <tr>
                  <th>Employee Info</th>
                  <th>Sick Leave</th>
                  <th>Annual Leave</th>
                  <th>Casual Leave</th>
                  <th>Maternity Leave</th>
                  <th>Paternity Leave</th>
                  <th>Leave Year</th>
                  <th>Actions</th>
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
                            {balance.department_name || 'Unassigned Department'}
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
                              title="Save Changes"
                            >
                              {isUpdating ? '...' : <Save size={16} />}
                            </button>
                            <button
                              onClick={cancelEditing}
                              disabled={isUpdating}
                              className="action-btn cancel-btn"
                              title="Cancel Editing"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => startEditing(balance)}
                            className="action-btn edit-btn"
                            title="Edit Allocation"
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
      </div>
    </div>
  );
};

export default HRLeaveBalances;