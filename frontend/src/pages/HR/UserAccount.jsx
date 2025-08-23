import React, { useState, useEffect } from 'react';
import { Search, RefreshCw, Trash2, Lock, Unlock, X, Edit3, Save, Loader, Plus, UserPlus } from 'lucide-react';

const UserAccountManagementSystem = () => {
  // --- Core state ---
  const [userList, setUserList] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [currentView, setCurrentView] = useState('table');
  const [resultTitle, setResultTitle] = useState('');
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [validationErrors, setValidationErrors] = useState({});
  const [isUpdating, setIsUpdating] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Add user related state
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({
    staff_id: '',
    password: '',
    confirmPassword: '',
    role: 'Employee'
  });
  const [addValidationErrors, setAddValidationErrors] = useState({});
  const [isAdding, setIsAdding] = useState(false);

  // Staff dropdown state
  const [showStaffDropdown, setShowStaffDropdown] = useState(false);

  // API
  const getApiUrl = () => {
    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
      return 'http://localhost:3001';
    }
    return import.meta.env.VITE_API_URL || 'http://localhost:3001';
  };

  const API_BASE_URL = `${getApiUrl()}/api`;

  // Show error message
  const showError = (message) => {
    setError(message);
    setSuccessMessage('');
    setLoading(false);
    setCurrentView('error');
  };

  // Show success message
  const showSuccess = (message) => {
    setSuccessMessage(message);
    setError('');
    setTimeout(() => setSuccessMessage(''), 5000);
  }; 
  
  // Clear error
  const clearError = () => {
    setError('');
  };

  const loadAllUsers = async () => {
    setLoading(true);
    clearError();

    try {
      console.log('Loading user data...');
      const response = await fetch(`${API_BASE_URL}/users`);
      const data = await response.json();
      
      console.log('API response:', data);
      
      if (data.success) {
        console.log('User data:', data.data);
        if (data.data.length > 0) {
          console.log('First user:', data.data[0]);
        }
        
        setUserList(data.data);
        setResultTitle(`All Users (Total: ${data.count} accounts)`);
        setCurrentView('table');
      } else {
        showError(data.message || 'Failed to load user data');
      }
    } catch (error) {
      showError('Unable to connect to server, please check if backend is running');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStaffList = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/staff`);
      const data = await response.json();
      
      if (data.success) {
        setStaffList(data.data);
      } else {
        console.error('Failed to load staff list:', data.message);
      }
    } catch (error) {
      console.error('Error loading staff list:', error);
    }
  };

  // --- Search (users) ---
  const filteredUsers = userList.filter((user) => {
    if (!searchInput.trim()) return true;
    const q = searchInput.toLowerCase().trim();
    const userIdStr = (user.user_id ?? '').toString();
    const staffIdStr = (user.staff_id ?? '').toString();
    const nameStr = (user.staff_name || user.name || '').toLowerCase();
    return userIdStr.includes(q) || staffIdStr.includes(q) || nameStr.includes(q);
  });

  const displayedUsers = filteredUsers;

  const clearResults = () => setSearchInput('');

  // --- Delete user ---
  const deleteUser = async (userId) => {
    if (!confirm('Are you sure you want to delete this user account?')) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        showSuccess('User account deleted successfully');
        loadAllUsers();
        loadStaffList(); // Refresh staff list to show available staff again
      } else {
        setError(data.message || 'Delete failed');
      }
    } catch (error) {
      console.error('Delete error:', error);
      setError('Error occurred during deletion');
    }
  };

  // Start editing user
  const startEditing = (user) => {    
    setEditingUser(user.user_id);    
    const formData = {
      role: user.role || 'Employee',
      account_status: user.account_status || 'active',
      account_locked: !!user.account_locked,
    };
    
    console.log('Setting edit form to:', formData);
    setEditForm(formData);
    setValidationErrors({});
  };

  // Cancel editing
  const cancelEditing = () => {
    setEditingUser(null);
    setEditForm({});
    setValidationErrors({});
  };

  // Handle edit form input changes
  const handleFormChange = (field, value) => {
    setEditForm(prev => ({
      ...prev,
      [field]: value
    }));
    
    // æ¸…é™¤è©²æ¬„ä½çš„é©—è­‰éŒ¯èª¤
    if (validationErrors[field]) {
      setValidationErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  // Handle add form input changes
  const handleAddFormChange = (field, value) => {
    setAddForm(prev => ({
      ...prev,
      [field]: value
    }));
    
    if (addValidationErrors[field]) {
      setAddValidationErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  // Validate edit form data
  const validateEditForm = () => {
    const errs = {};
    const validRoles = ['Employee', 'Manager', 'HR', 'Admin'];
    if (!validRoles.includes((editForm.role || ''))) {
      errs.role = 'Role must be one of: Employee, Manager, HR, Admin';
    }
    if (typeof editForm.account_locked !== 'boolean') {
      errs.account_locked = 'Account status must be Active or Locked';
    }
    setValidationErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Validate add form data
  const validateAddForm = () => {
    const errors = {};
    
    if (!addForm.staff_id || !addForm.staff_id.toString().trim()) {
      errors.staff_id = 'Staff ID is required';
    }
    
    if (!addForm.password || addForm.password.length < 6) {
      errors.password = 'Password must be at least 6 characters long';
    }
    
    if (!addForm.confirmPassword) {
      errors.confirmPassword = 'Please confirm your password';
    } else if (addForm.password !== addForm.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }
    
    const validRoles = ['Employee', 'Manager', 'HR', 'Admin'];
    if (!validRoles.includes(addForm.role)) {
      errors.role = 'Please select a valid role';
    }
    
    setAddValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Update User
  const updateUser = async (userId) => {
    if (!validateEditForm()) return;
    setIsUpdating(true);
    try {
      const payload = {
        role: editForm.role,
        account_locked: editForm.account_locked,
      };
      const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setUserList((prev) =>
          prev.map((u) => (u.user_id === userId ? { ...u, ...payload } : u))
        );
        cancelEditing();
        showSuccess('User information updated successfully');
      } else {
        setError(data.message || 'Failed to update user');
      }
    } catch (err) {
      console.error('Update error:', err);
      setError('Error occurred while updating user');
    } finally {
      setIsUpdating(false);
    }
  };

  // Add user
  const addUser = async () => {
    if (!validateAddForm()) {
      return;
    }
    
    setIsAdding(true);
    
    try {
      const response = await fetch(`${API_BASE_URL}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          staff_id: parseInt(addForm.staff_id),
          password: addForm.password,
          role: addForm.role
        }),
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        setUserList(prev => [...prev, data.data]);
        
        setAddForm({
          staff_id: '',
          password: '',
          confirmPassword: '',
          role: 'Employee'
        });
        setAddValidationErrors({});
        setShowAddModal(false);
        
        showSuccess('User account created successfully');
        loadAllUsers();
        loadStaffList(); // Refresh staff list
      } else {
        setError(data.message || 'Failed to create user account');
      }
    } catch (error) {
      setError('Error occurred while creating user account');
      console.error('Add error:', error);
    } finally {
      setIsAdding(false);
    }
  };

  // Open add modal
  const openAddUserModal = () => {
    setShowAddModal(true);
    setAddForm({
      staff_id: '',
      password: '',
      confirmPassword: '',
      role: 'Employee'
    });
    setAddValidationErrors({});
    loadStaffList(); // Load available staff
  };

  // Close add modal
  const closeAddModal = () => {
    setShowAddModal(false);
    setAddForm({
      staff_id: '',
      password: '',
      confirmPassword: '',
      role: 'Employee'
    });
    setAddValidationErrors({});
  };

  // Get available staff (staff without user accounts)
  const getAvailableStaff = () => {
    const usedStaffIds = userList.map(user => user.staff_id);
    return staffList.filter(staff => !usedStaffIds.includes(staff.staff_id));
  };

  // Render edit field
  const renderEditField = (user, field) => {
    if (editingUser !== user.user_id) {
      // Display mode
      switch (field) {
        case 'role':
          return <span className={`role-badge ${getRoleBadgeColor(user.role)}`}>
            {user.role || '無角色'}</span>;
        case 'account_locked':
          return user.account_locked ? (
            <span className="status-badge locked">
              <Lock size={14} /> Locked
            </span>
          ) : (
            <span className="status-badge active">
              <Unlock size={14} /> Active
            </span>
          );
        case 'last_login':
          return user.last_login || 'Never';
        case 'failed_login_attempts':
          return user.failed_login_attempts || 0;
        default:
          return user[field] || 'N/A';
      }
    }

    // Edit mode
    switch (field) {
      case 'role':
        return (
          <select
            value={editForm.role || 'Employee'}
            onChange={(e) => handleFormChange('role', e.target.value)}
            className={`edit-input ${validationErrors.role ? 'error' : ''}`}
          >
            <option value="Employee">Employee</option>
            <option value="Manager">Manager</option>
            <option value="HR">HR</option>
            <option value="Admin">Admin</option>
          </select>
        );
      case 'account_locked':
        return (
          <select
            value={editForm.account_locked ? 'true' : 'false'}
            onChange={(e) => handleFormChange('account_locked', e.target.value === 'true')}
            className={`edit-input ${validationErrors.account_locked ? 'error' : ''}`}
          >
            <option value="false">Active</option>
            <option value="true">Locked</option>
          </select>
        );
      default:
        return user[field] || 'N/A';
    }
  };

  const getRoleBadgeColor = (role) => {
    switch (role?.toLowerCase()) {
      case 'admin':
        return 'badge-admin';
      case 'hr':
        return 'badge-hr';
      case 'manager':
        return 'badge-manager';
      case 'employee':
        return 'badge-employee';
      default:
        return 'badge-default';
    }
  };

  // Render add user modal
  const renderAddModal = () => {
    if (!showAddModal) return null;

    const availableStaff = getAvailableStaff();

    return (
      <div className="modal-overlay">
        <div className="modal-content modal-large">
          <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3>Add New User Account</h3>
              <p>Create a new user account for staff member</p>
            </div>
            <button 
              onClick={closeAddModal} 
              className="close-btn"
            >
              <X size={20} />
            </button>
          </div>    
          <div className="modal-body">
            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem'}}>
              <div className="form-group">
                <label htmlFor='add-staff-id'>Staff ID <span className="required">*</span></label>
                <select 
                  id='add-staff-id' 
                  value={addForm.staff_id}
                  onChange={(e) => handleAddFormChange('staff_id', e.target.value)}
                  className={addValidationErrors.staff_id ? 'error' : ''}
                >
                  <option value="">Select Staff Member</option>
                  {availableStaff.map(staff => (
                    <option key={staff.staff_id} value={staff.staff_id}>
                      {staff.staff_id} - {staff.name}
                    </option>
                  ))}
                </select>
                {addValidationErrors.staff_id && (
                  <div className="validation-error">{addValidationErrors.staff_id}</div>
                )}
                {availableStaff.length === 0 && (
                  <div style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '4px' }}>
                    No available staff members (all staff already have accounts)
                  </div>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="add-role">Role <span className="required">*</span></label>
                <select
                  id="add-role"
                  value={addForm.role}
                  onChange={(e) => handleAddFormChange('role', e.target.value)}
                  className={addValidationErrors.role ? 'error' : ''}
                >
                  <option value="Employee">Employee</option>
                  <option value="Manager">Manager</option>
                  <option value="HR">HR</option>
                  <option value="Admin">Admin</option>
                </select>
                {addValidationErrors.role && (
                  <div className="validation-error">{addValidationErrors.role}</div>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="add-password">Password <span className="required">*</span></label>
                <input
                  id="add-password"
                  type="password"
                  value={addForm.password}
                  onChange={(e) => handleAddFormChange('password', e.target.value)}
                  className={addValidationErrors.password ? 'error' : ''}
                  placeholder="Enter password (min 6 characters)"
                  autoComplete="new-password"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck="false"
                  data-lpignore="true"
                  data-form-type="other"
                />
                {addValidationErrors.password && (
                  <div className="validation-error">{addValidationErrors.password}</div>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="add-confirm-password">Confirm Password <span className="required">*</span></label>
                <input
                  id="add-confirm-password"
                  type="password"
                  value={addForm.confirmPassword}
                  onChange={(e) => handleAddFormChange('confirmPassword', e.target.value)}
                  className={addValidationErrors.confirmPassword ? 'error' : ''}
                  placeholder="Confirm password"
                  autoComplete="new-password"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck="false"
                  data-lpignore="true"
                  data-form-type="other"
                />
                {addValidationErrors.confirmPassword && (
                  <div className="validation-error">{addValidationErrors.confirmPassword}</div>
                )}
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button
              type="button"
              onClick={closeAddModal}
              disabled={isAdding}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={addUser}
              disabled={isAdding || availableStaff.length === 0}
              className="btn btn-success"
            >
              {isAdding ? (
                'Creating...'
              ) : (
                <>
                  <Plus className="btn-icon" />
                  Create Account
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  };
  
  const renderUserTable = () => {
    if (displayedUsers.length === 0) {
      return (
        <div className="empty-state">
          <h3>No user accounts found</h3>
          <p>Please try different search criteria</p>
        </div>
      );
    }
    return (
      <div>
        <h2 className="result-title">{resultTitle}</h2>
        <div className="table-container">
          <table className="staff-table">
            <thead>
              <tr className="table-header">
                <th>User ID</th>
                <th>Staff ID</th>
                <th>Staff Name</th>
                <th>Role</th>
                <th>Last Login</th>
                <th>Account Status</th>
                <th>Failed Attempts</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {displayedUsers.map((user) => (
                <tr key={user.user_id} className={`table-row ${editingUser === user.user_id ? 'editing' : ''}`}>
                  <td>
                    <strong className="staff-id">{user.user_id}</strong>
                  </td>
                  <td>{user.staff_id ?? 'N/A'}</td>
                  <td>{user.staff_name || user.name || 'N/A'}</td>
                  <td>{renderEditField(user, 'role')}</td>
                  <td>{renderEditField(user, 'last_login')}</td>
                  <td>{renderEditField(user, 'account_locked')}</td>
                  <td>{renderEditField(user, 'failed_login_attempts')}</td>
                  <td className="actions-cell">
                    {editingUser === user.user_id ? (
                      <div className="edit-actions">
                        <button
                          onClick={() => updateUser(user.user_id)}
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
                          title="Cancel Edit"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <div className="edit-actions">
                        <button onClick={() => startEditing(user)} className="action-btn edit-btn" title="Edit User">
                          <Edit3 size={16} />
                        </button>
                        <button 
                          onClick={() => deleteUser(user.user_id)}
                          className="action-btn cancel-btn"
                          title="Delete User"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {Object.keys(validationErrors).length > 0 && (
          <div className="validation-summary">
            <h4>Please correct the following errors:</h4>
            <ul>
              {Object.entries(validationErrors).map(([field, err]) => (
                <li key={field}>{err}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="loading-state">
          <Loader size={48} className="animate-spin" />
          <div>Loading user accounts...</div>
        </div>
      );
    }
    if (error) return <div className="error-message">{error}</div>;
    return renderUserTable();
  };

  // --- Effects ---
  useEffect(() => {
    // Initial load
    loadAllUsers();
    loadStaffList();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showStaffDropdown && !event.target.closest('.form-group')) setShowStaffDropdown(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showStaffDropdown]);

  return (
    <div className="app-container">
      <div className="main-card">
        <div className="header">
          <h1>User Account Management</h1>
        </div>
      </div>

      <div className="divider" />

      <div className="main-card">
        <div className="controls">
          <div className="controls-wrapper">
            <div className="search-container">
              <div className="search-input-wrapper">
                <Search className="search-icon" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="Search by user ID, staff ID, or name..."
                  className="search-input"
                />
              </div>
            </div>

            <button onClick={loadAllUsers} disabled={loading} className="btn btn-primary">
              <RefreshCw className="btn-icon" /> Refresh
            </button>

            {searchInput && (
              <button onClick={clearResults} className="btn btn-secondary">
                <Trash2 size={20} className="btn-icon" /> Clear Search
              </button>
            )}

            <button 
              onClick={openAddUserModal}
              className="btn btn-success"
            >
              <UserPlus className="btn-icon" />
              Add User Account
            </button>
          </div>
        </div>

        {successMessage && (
          <div style={{ padding: '12px 20px', backgroundColor: '#d1fae5', color: '#065f46', borderBottom: '1px solid #e5e7eb' }}>
            {successMessage}
          </div>
        )}

        <div className="content">{renderContent()}</div>
      </div>

      {/* Add Modal */}
      {renderAddModal()}
    </div>
  );
};

export default UserAccountManagementSystem;