import React, { useState, useEffect } from 'react';
import { Search, Users, Trash2, UserPlus, Key, Shield, Lock, Unlock, X, Eye, EyeOff, User, Mail, CheckCircle, AlertCircle, Edit3, Save, Info } from 'lucide-react';

const UserAccountManagementSystem = () => {
  const [userList, setUserList] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [currentView, setCurrentView] = useState('table');
  const [resultTitle, setResultTitle] = useState('');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [validationErrors, setValidationErrors] = useState({});
  const [isUpdating, setIsUpdating] = useState(false);
  const [passwordData, setPasswordData] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [newUserData, setNewUserData] = useState({
    staff_id: '',
    password: '',
    confirmPassword: '',
    role: 'employee',
    selectedStaff: null
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [staffSearchInput, setStaffSearchInput] = useState('');
  const [filteredStaff, setFilteredStaff] = useState([]);
  const [showStaffDropdown, setShowStaffDropdown] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [isAdding, setIsAdding] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Add employee related state
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({
    user_id: '',
    staff_id: '',
    password: '',
    role: '',
    last_login: '',
    password_reset_expires: '',
    failed_login_attempts: '',
    account_locked: ''
  });
  const [addValidationErrors, setAddValidationErrors] = useState({});

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

  // Load staff list for dropdown
  const loadStaffList = async () => {
    try {
      console.log('Loading staff list...');
      const response = await fetch(`${API_BASE_URL}/staff`);
      const data = await response.json();
      
      console.log('Staff data response:', data);
      
      if (data.success) {
        // Get existing users list first to exclude staff who already have accounts
        const usersResponse = await fetch(`${API_BASE_URL}/users`);
        const usersData = await usersResponse.json();
        
        let availableStaff = data.data;
        
        if (usersData.success) {
          // Exclude staff who already have user accounts
          const existingStaffIds = usersData.data.map(user => user.staff_id);
          availableStaff = data.data.filter(staff => 
            !existingStaffIds.includes(staff.staff_id)
          );
          console.log(`Excluded staff with existing accounts, ${availableStaff.length} available staff remaining`);
        }
        
        setStaffList(availableStaff);
        setFilteredStaff(availableStaff);
        
        if (availableStaff.length === 0) {
          console.log('No available staff to create accounts for');
        }
      } else {
        console.error('Failed to load staff list:', data.message);
        setStaffList([]);
        setFilteredStaff([]);
      }
    } catch (error) {
      console.error('Error loading staff list:', error);
      setStaffList([]);
      setFilteredStaff([]);
    }
  };

  // Load all users and staff information
  const loadAllUsers = async () => {
    setLoading(true);
    clearError();
    
    try {
      console.log('Loading all users...');
      const response = await fetch(`${API_BASE_URL}/users`);
      const data = await response.json();
      
      console.log('User data response:', data);
      
      if (data.success) {
        setUserList(data.data);
        setResultTitle(`All User Accounts (Total: ${data.count} accounts)`);
        setCurrentView('table');
        console.log(`Successfully loaded ${data.count} users`);
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

  const filteredUsers = userList.filter(user => {
    if (!searchInput.trim()) return true;
    
    const searchTerm = searchInput.toLowerCase().trim();
    return (
      user.name.toLowerCase().includes(searchTerm) ||
      user.staff_id.toString().includes(searchTerm)
    );
  });

  // Clear results
  const clearResults = () => {
    setSearchInput('');
  };

  // Real-time search as user types
  const handleSearchChange = (value) => {
    setSearchInput(value);
  };

  // Format date display
  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US');
  };

  // Start editing user
  const startEditing = (user) => {
    setEditingUser(user.user_id);
    setEditForm({
      role: user.role || 'employee',
      account_locked: user.account_locked || false
    });
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
    console.log(`Form change: ${field} = ${value}`);
    setEditForm(prev => ({
      ...prev,
      [field]: value
    }));
    
    if (validationErrors[field]) {
      setValidationErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  // Handle add staff form input changes
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

  // Handle password change
  const handlePasswordChange = async () => {
    if (!passwordData.oldPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      setError('Please fill in all password fields');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('New password and confirm password do not match');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setError('New password must be at least 6 characters long');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/users/change-password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: selectedUser.user_id,
          old_password: passwordData.oldPassword,
          new_password: passwordData.newPassword
        })
      });

      const data = await response.json();

      if (data.success) {
        showSuccess('Password changed successfully');
        setShowPasswordModal(false);
        setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' });
        setSelectedUser(null);
      } else {
        setError(data.message || 'Failed to change password');
      }
    } catch (error) {
      console.error('Password change error:', error);
      setError('Error occurred while changing password');
    }
  };

  // Validate form
  const validateForm = () => {
    const errors = {};

    if (!newUserData.selectedStaff) {
      errors.staff = 'Please select a staff member';
    }

    if (!newUserData.password) {
      errors.password = 'Password is required';
    } else if (newUserData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters long';
    }

    if (!newUserData.confirmPassword) {
      errors.confirmPassword = 'Please confirm password';
    } else if (newUserData.password !== newUserData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    if (!newUserData.role) {
      errors.role = 'Please select a role';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Update User
  const updateUser = async (staffID) => {
    if (!validateForm()) {
      return;
    }
    
    setIsUpdating(true);
    
    try {
      const completeData = {
        password: editForm.password || '',
        role: editForm.role || '',
        last_login: editForm.last_login || '',
        password_reset_expires: editForm.password_reset_expires || '',
        failed_login_attempts: editForm.failed_login_attempts || '',
        account_locked: editForm.account_locked || ''
      };
      
      console.log('Updating user with complete data:', completeData);
      console.log('Staff ID:', staffID);
      
      const response = await fetch(`${API_BASE_URL}/users/${staffID}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(completeData),
      });
      
      const data = await response.json();
      console.log('Update response:', data);
      
      if (response.ok && data.success) {
        setStaffList(prev => prev.map(user => 
          user.staff_id === staffID 
            ? { ...user, ...completeData }
            : user
        ));
        
        cancelEditing();
        showSuccess('User information updated successfully');
      } else {
        console.error('Update failed:', data);
        setError(data.message || 'Failed to update user');
      }
    } catch (error) {
      setError('Error occurred while updating user');
      console.error('Update error:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  // Add User
  const addStaff = async () => {
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
        body: JSON.stringify(addForm),
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        setStaffList(prev => [...prev, data.data]);
        
        setAddForm({
          user_id: '',
          staff_id: '',
          password: '',
          role: '',
          last_login: '',
          password_reset_expires: '',
          failed_login_attempts: '',
          account_locked: ''
        });
        setAddValidationErrors({});
        setShowAddModal(false);
        
        showSuccess('User member added successfully');
        loadAllStaff();
      } else {
        setError(data.message || 'Failed to add user member');
      }
    } catch (error) {
      setError('Error occurred while adding user member');
      console.error('Add error:', error);
    } finally {
      setIsAdding(false);
    }
  };

  // Replace in openAddUserModal and closeAddUserModal:

  const openAddUserModal = () => {
    setShowAddUserModal(true);
    setAddForm({
      user_id: '',
      staff_id: '',
      password: '',
      role: '',
      last_login: '',
      password_reset_expires: '',
      failed_login_attempts: '',
      account_locked: ''
    });
    setAddValidationErrors({});
    loadStaffList();
  };

  const closeAddUserModal = () => {
    setShowAddUserModal(false);
    setAddForm({
      user_id: '',
      staff_id: '',
      password: '',
      role: '',
      last_login: '',
      password_reset_expires: '',
      failed_login_attempts: '',
      account_locked: ''
    });
    setAddValidationErrors({});
  };

  // Enhanced staff search with Staff ID support
  const handleStaffSearch = (searchTerm) => {
    console.log('Searching staff:', searchTerm);
    setStaffSearchInput(searchTerm);
    
    if (searchTerm.trim()) {
      const filtered = staffList.filter(staff => {
        const searchLower = searchTerm.toLowerCase();
        return (
          staff.name.toLowerCase().includes(searchLower) ||
          staff.staff_id.toString().includes(searchTerm) ||
          (staff.email && staff.email.toLowerCase().includes(searchLower)) ||
          (staff.nickname && staff.nickname.toLowerCase().includes(searchLower))
        );
      });
      console.log(`Found ${filtered.length} matching staff members`);
      setFilteredStaff(filtered);
    } else {
      setFilteredStaff(staffList);
    }
    
    if (searchTerm.trim() && !showStaffDropdown) {
      setShowStaffDropdown(true);
    }
  };

  // Handle staff selection
  const handleStaffSelection = (staff) => {
    setNewUserData({
      ...newUserData,
      selectedStaff: staff,
      staff_id: staff.staff_id
    });
    setStaffSearchInput(`${staff.name} (${staff.staff_id})`);
    setShowStaffDropdown(false);
    // Clear staff error when selected
    if (formErrors.staff) {
      setFormErrors({ ...formErrors, staff: null });
    }
  };

  // Open password modal
  const openPasswordModal = (user) => {
    setSelectedUser(user);
    setShowPasswordModal(true);
  };

  // Close password modal
  const closePasswordModal = () => {
    setShowPasswordModal(false);
    setSelectedUser(null);
    setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' });
  };

  const validateNewUserForm = () => {
    const errors = {};

    if (!newUserData.selectedStaff) {
      errors.staff = 'Please select a staff member';
    }
    if (!newUserData.password) {
      errors.password = 'Password is required';
    } else if (newUserData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters long';
    }
    if (!newUserData.confirmPassword) {
      errors.confirmPassword = 'Please confirm password';
    } else if (newUserData.password !== newUserData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }
    if (!newUserData.role) {
      errors.role = 'Please select a role';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const addUser = async () => {
    if (!validateNewUserForm()) {
      return;
    }

    setIsAdding(true);

    try {
      const payload = {
        staff_id: newUserData.staff_id,
        password: newUserData.password,
        role: newUserData.role
      };

      const response = await fetch(`${API_BASE_URL}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setSuccessMessage('User account created successfully');
        setShowAddUserModal(false);
        setNewUserData({
          staff_id: '',
          password: '',
          confirmPassword: '',
          role: 'employee',
          selectedStaff: null
        });
        setFormErrors({});
        loadAllUsers();
        loadStaffList();
      } else {
        setFormErrors({ general: data.message || 'Failed to create user account' });
      }
    } catch (error) {
      setFormErrors({ general: 'Error occurred while creating user account' });
      console.error('Add user error:', error);
    } finally {
      setIsAdding(false);
    }
  };

  // Get role badge color
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

  // Enhanced render edit field for specific columns
  const renderEditField = (user, field, type = 'text') => {
    const isEditing = editingUser === user.user_id;
    const value = editForm[field];
    const hasError = validationErrors[field];
    
    if (!isEditing) {
      // Display mode
      if (field === 'last_login') {
        return formatDate(user[field]);
      } else if (field === 'staff_position') {
        return (
          <span className="position-badge">
            {user.staff_position && user.staff_position !== 'N/A' ? user.staff_position : 'Unassigned'}
          </span>
        );
      } else if (field === 'role') {
        return (
          <span className={`role-badge ${getRoleBadgeColor(user.role)}`}>
            {user.role || 'No Role'}
          </span>
        );
      } else if (field === 'account_locked') {
        return (
          <span className={`status-badge ${user.account_locked ? 'locked' : 'active'}`}>
            {user.account_locked ? (
              <>
                <Lock size={14} />
                Locked
              </>
            ) : (
              <>
                <Unlock size={14} />
                Active
              </>
            )}
          </span>
        );
      } else if (field === 'failed_login_attempts') {
        return (
          <span className={`attempts-badge ${user.failed_login_attempts > 3 ? 'high' : 'normal'}`}>
            {user.failed_login_attempts || 0}
          </span>
        );
      }
      return user[field] || 'N/A';
    }
    
    // Edit mode
    if (field === 'role') {
      return (
        <select
          value={value}
          onChange={(e) => handleFormChange(field, e.target.value)}
          className={`edit-input ${hasError ? 'error' : ''}`}
        >
          <option value="employee">Employee</option>
          <option value="manager">Manager</option>
          <option value="hr">HR</option>
          <option value="admin">Admin</option>
        </select>
      );
    }

    if (field === 'account_locked') {
      return (
        <select
          value={value}
          onChange={(e) => handleFormChange(field, e.target.value === 'true')}
          className={`edit-input ${hasError ? 'error' : ''}`}
        >
          <option value="false">Active</option>
          <option value="true">Locked</option>
        </select>
      );
    }
    
    return (
      <div className="edit-field-container">
        <input
          type={type}
          value={value || ''}
          onChange={(e) => handleFormChange(field, e.target.value)}
          className={`edit-input ${hasError ? 'error' : ''}`}
          readOnly={field === 'staff_position' || field === 'last_login' || field === 'failed_login_attempts'}
        />
        {hasError && (
          <div className="validation-error">{hasError}</div>
        )}
      </div>
    );
  };

  // Render user table
  const renderUserTable = () => {
    if (userList.length === 0) {
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
              {userList.map((user) => (
                <tr key={user.user_id} className={`table-row ${editingUser === user.user_id ? 'editing' : ''}`}>
                  <td>
                    <strong className="staff-id">{user.user_id}</strong>
                  </td>
                  <td>{user.staff_id || 'N/A'}</td>
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
                        <button
                          onClick={() => startEditing(user)}
                          className="action-btn edit-btn"
                          title="Edit User"
                        >
                          <Edit3 size={16} />
                        </button>
                        <button
                          className="action-btn btn-password"
                          onClick={() => openPasswordModal(user)}
                          title="Change Password"
                        >
                          <Key size={16} />
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
              {Object.entries(validationErrors).map(([field, error]) => (
                <li key={field}>{error}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };

  // Render content area
  const renderContent = () => {
    if (loading) {
      return (
        <div className="loading-state">
          <div>Loading user accounts...</div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="error-message">
          {error}
        </div>
      );
    }

    if (currentView === 'table') {
      return renderUserTable();
    }
  };

  // Password modal
  const PasswordModal = () => {
    if (!showPasswordModal) return null;

    return (
      <div className="modal-overlay">
        <div className="modal-content">
          <div className="modal-header">
            <h3>Change Password</h3>
            <p>User: {selectedUser?.staff_name || selectedUser?.name || `ID: ${selectedUser?.user_id}`}</p>
            <button 
              onClick={closePasswordModal} 
              className="close-btn"
              style={{ position: 'absolute', top: '1.5rem', right: '1.5rem' }}
            >
              <X size={20} />
            </button>
          </div>
          <div className="modal-body">
            <div className="form-group">
              <label>Old Password:</label>
              <input
                type="password"
                value={passwordData.oldPassword}
                onChange={(e) => setPasswordData({...passwordData, oldPassword: e.target.value})}
                placeholder="Enter old password"
              />
            </div>
            <div className="form-group">
              <label>New Password:</label>
              <input
                type="password"
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                placeholder="Enter new password (at least 6 characters)"
              />
            </div>
            <div className="form-group">
              <label>Confirm New Password:</label>
              <input
                type="password"
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                placeholder="Confirm new password"
              />
            </div>
          </div>
          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={closePasswordModal}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={handlePasswordChange}>
              Change Password
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Enhanced add user modal with improved staff selection functionality
  const AddUserModal = () => {
    if (!showAddUserModal) return null;

    return (
      <div className="modal-overlay">
        <div className="modal-content modal-large">
          <div className="modal-header">
            <div className="modal-header-content">
              <div className="modal-title-section">
                <h3 className="modal-title-with-icon">
                  <UserPlus size={24} />
                  Create New User Account
                </h3>
                <p>Select a staff member and configure their account settings</p>
              </div>
              <button 
                onClick={closeAddUserModal}
                className="close-btn"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          <div className="modal-body">
            <form onSubmit={(e) => e.preventDefault()}>
              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem'}}>
                <div className="form-group">
                  <label className="form-label-with-icon">
                    <User size={16} />
                    Staff Member <span className="required">*</span>
                  </label>
                  <div className="staff-search-container">
                  <input
                    type="text"
                    value={staffSearchInput}
                    onChange={(e) => handleStaffSearch(e.target.value)}
                    onFocus={() => {
                      if (filteredStaff.length > 0) {
                        setShowStaffDropdown(true);
                      }
                    }}
                    placeholder={
                      staffList.length === 0 
                        ? "Loading staff..." 
                        : "Search by name, staff ID, or email..."
                    }
                    className={`form-input ${formErrors.staff ? 'error' : ''}`}
                    disabled={staffList.length === 0}
                  />
                <button
                  type="button"
                  onClick={() => {
                    if (staffList.length > 0) {
                      setShowStaffDropdown(!showStaffDropdown);
                    } else {
                      loadStaffList();
                    }
                  }}
                  className="search-toggle-btn"
                  disabled={staffList.length === 0}
                >
                  {staffList.length === 0 ? (
                    <div className="spinner">⟳</div>
                  ) : (
                    <Search size={16} />
                  )}
                </button>
                
                {showStaffDropdown && (
                  <div className="staff-dropdown">
                    {filteredStaff.length > 0 ? (
                      filteredStaff.map((staff) => (
                        <div
                          key={staff.staff_id}
                          onClick={() => handleStaffSelection(staff)}
                          className="staff-dropdown-item"
                        >
                          <div className="staff-avatar">
                            {staff.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div className="staff-details">
                            <div className="staff-name">
                              {staff.name}
                              {staff.nickname && ` (${staff.nickname})`}
                            </div>
                            <div className="staff-info">
                              ID: {staff.staff_id} | {staff.position_id || 'No Position'}
                            </div>
                            <div className="staff-email">
                              <Mail size={12} />
                              {staff.email || 'No Email'}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="staff-dropdown-item no-results">
                        <div className="staff-details">
                          <div className="staff-name">
                            {staffSearchInput.trim() 
                              ? `No staff found matching "${staffSearchInput}"` 
                              : 'No available staff'
                            }
                          </div>
                          {staffList.length === 0 && (
                            <div className="staff-info">
                              All staff may already have user accounts
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              {formErrors.staff && (
                <small className="validation-message">
                  <AlertCircle size={12} />
                  {formErrors.staff}
                </small>
              )}
              
              {/* If no available staff, show notification */}
              {staffList.length === 0 && !loading && (
                <small className="info-message">
                  <Info size={12} />
                  No available staff. All staff may already have user accounts.
                </small>
              )}
            </div>

            {/* Selected Staff Preview */}
            {newUserData.selectedStaff && (
              <div className="selected-staff-preview">
                <h4 className="preview-title">
                  <CheckCircle size={16} />
                  Selected Staff
                </h4>
                <div className="selected-staff-content">
                  <div className="selected-staff-avatar">
                    {newUserData.selectedStaff.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="selected-staff-info">
                    <div className="selected-staff-name">
                      {newUserData.selectedStaff.name}
                    </div>
                    <div className="selected-staff-detail">
                      Staff ID: {newUserData.selectedStaff.staff_id} • {newUserData.selectedStaff.position_id || 'No Position'}
                    </div>
                    <div className="selected-staff-detail">
                      {newUserData.selectedStaff.email || 'No Email'} • {newUserData.selectedStaff.phone_number || 'No Phone'}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Role Selection */}
            <div className="form-group">
              <label className="form-label-with-icon">
                <Shield size={16} />
                Account Role <span className="required">*</span>
              </label>
              <select
                value={newUserData.role}
                onChange={(e) => setNewUserData({...newUserData, role: e.target.value})}
                className={`form-select ${formErrors.role ? 'error' : ''}`}
              >
                <option value="employee">Employee - Basic permissions</option>
                <option value="manager">Manager - Department management permissions</option>
                <option value="hr">HR - Human resources management</option>
                <option value="admin">Admin - Full system permissions</option>
              </select>
              {formErrors.role && (
                <small className="validation-message">
                  <AlertCircle size={12} />
                  {formErrors.role}
                </small>
              )}
            </div>

            {/* Password Fields */}
            <div className="form-group">
              <label className="form-label-with-icon">
                <Key size={16} />
                Password <span className="required">*</span>
              </label>
              <div className="password-input-container">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newUserData.password}
                  onChange={(e) => setNewUserData({...newUserData, password: e.target.value})}
                  placeholder="Enter password (at least 6 characters)"
                  className={`form-input ${formErrors.password ? 'error' : ''}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="password-toggle-btn"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {formErrors.password && (
                <small className="validation-message">
                  <AlertCircle size={12} />
                  {formErrors.password}
                </small>
              )}
            </div>

            <div className="form-group">
              <label className="form-label-with-icon">
                <Key size={16} />
                Confirm Password <span className="required">*</span>
              </label>
              <div className="password-input-container">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={newUserData.confirmPassword}
                  onChange={(e) => setNewUserData({...newUserData, confirmPassword: e.target.value})}
                  placeholder="Confirm your password"
                  className={`form-input ${formErrors.confirmPassword ? 'error' : ''}`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="password-toggle-btn"
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {formErrors.confirmPassword && (
                <small className="validation-message">
                  <AlertCircle size={12} />
                  {formErrors.confirmPassword}
                </small>
              )}
            </div>

            {/* Info Box */}
            <div className="info-box">
              <small>
                <strong>Note:</strong> The selected staff member's information will be used to create the user account.
                Please ensure all details are correct before proceeding.
              </small>
            </div>
          </div>

          <div className="modal-footer">
            <button 
              className="btn btn-secondary" 
              onClick={closeAddUserModal}
              disabled={isAdding}
            >
              Cancel
            </button>
            <button 
              className="btn btn-success" 
              onClick={addUser}
              disabled={isAdding}
            >
              {isAdding ? (
                'Adding...'
              ) : (
                <>
                  <UserPlus className="btn-icon" />
                  Create Account
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Component loads all user data on mount
  useEffect(() => {
    console.log('React User Account Management System ready');
    console.log('API Base URL:', API_BASE_URL);
    loadAllUsers();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showStaffDropdown && !event.target.closest('.form-group')) {
        setShowStaffDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showStaffDropdown]);

  return (
    <div className="app-container">
      <div className="main-card">
        {/* Header */}
        <div className="header">
          <h1>User Account Management</h1>
        </div>
      </div>

      <div className="divider" />

      <div className="main-card">
        {/* Controls */}
        <div className="controls">
          <div className="controls-wrapper">
            {/* Search Box */}
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

            {/* Buttons */}
            <button
              onClick={loadAllUsers}
              disabled={loading}
              className="btn btn-primary"
            >
              <Users className="btn-icon" />
              Refresh
            </button>

            {searchInput && (
              <button
                onClick={clearResults}
                className="btn btn-secondary"
              >
                <Trash2 size={20} className="btn-icon" />
                Clear Search
              </button>
            )}

            <button 
              className="btn btn-success"
              onClick={openAddUserModal}
              disabled={loading}
            >
              <UserPlus className="btn-icon" />
              Add Account
            </button>
          </div>
        </div>

        {/* Success Message */}
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

        {/* Content */}
        <div className="content">
          {renderContent()}
        </div>

        {/* Modals */}
        <PasswordModal />
        <AddUserModal />
      </div>
    </div>
  );
};

export default UserAccountManagementSystem;