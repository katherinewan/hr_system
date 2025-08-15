import React, { useState, useEffect } from 'react';
import { Search, Users, Trash2, UserPlus, Edit3, Save, X, Check, Plus } from 'lucide-react';

const EmployeeManagementSystem = () => {
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [currentView, setCurrentView] = useState('table');
  const [resultTitle, setResultTitle] = useState('');
  const [editingStaff, setEditingStaff] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [validationErrors, setValidationErrors] = useState({});
  const [isUpdating, setIsUpdating] = useState(false);

  // Add employee related state
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({
    name: '',
    nickname: '',
    gender: 'male',
    age: '',
    hire_date: '',
    email: '',
    address: '',
    phone_number: '',
    emer_phone: '',
    emer_name: '',
    position_id: ''
  });
  const [addValidationErrors, setAddValidationErrors] = useState({});
  const [isAdding, setIsAdding] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // API base URL
  const API_BASE_URL = 'http://localhost:3001/api';

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

  // Load all staff
  const loadAllStaff = async () => {
    setLoading(true);
    clearError();
    
    try {
      console.log('📄 Loading staff data...');
      const response = await fetch(`${API_BASE_URL}/staff`);
      const data = await response.json();
      
      console.log('API response:', data);
      
      if (data.success) {
        // Debug: Check data returned from API
        console.log('Staff data:', data.data);
        if (data.data.length > 0) {
          console.log('First staff member:', data.data[0]);
          console.log('Gender field:', data.data[0].gender, 'Type:', typeof data.data[0].gender);
        }
        
        setStaffList(data.data);
        setResultTitle(`All Staff (Total: ${data.count} people)`);
        setCurrentView('table');
      } else {
        showError(data.message || 'Failed to load staff data');
      }
    } catch (error) {
      showError('Unable to connect to server, please check if backend is running');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Search staff
  const searchStaff = async (searchTerm) => {
    if (!searchTerm || !searchTerm.trim()) {
      showError('Please enter search keywords');
      return;
    }

    const trimmedInput = searchTerm.trim();
    setLoading(true);
    clearError();
    
    try {
      let response;
      
      if (/^\d+$/.test(trimmedInput)) {
        console.log(`Searching staff ID: ${trimmedInput}`);
        response = await fetch(`${API_BASE_URL}/staff/${trimmedInput}`);
      } else {
        console.log(`Searching staff name: ${trimmedInput}`);
        const params = new URLSearchParams();
        params.append('name', trimmedInput);
        response = await fetch(`${API_BASE_URL}/staff/search?${params.toString()}`);
      }
      
      const data = await response.json();
      console.log('Backend response:', data);
      
      if (response.ok && data) {
        if (data.success) {
          let staffData;
          if (Array.isArray(data.data)) {
            staffData = data.data;
          } else {
            staffData = [data.data];
          }
          
          const count = data.count || staffData.length;
          setStaffList(staffData);
          setResultTitle(`Search results for "${trimmedInput}" (Total: ${count} people)`);
          setCurrentView('table');
        } else {
          showError(data.message || 'Staff data not found');
        }
      } else {
        if (response.status === 404) {
          showError(`Staff member "${trimmedInput}" not found`);
        } else {
          showError(data.message || 'Error occurred during search');
        }
      }
    } catch (error) {
      showError('Error occurred during search, please check network connection');
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Clear results
  const clearResults = () => {
    setSearchInput('');
    loadAllStaff();
  };

  // Handle search input
  const handleSearch = (e) => {
    if (e.key === 'Enter') {
      if (searchInput.trim()) {
        searchStaff(searchInput);
      } else {
        loadAllStaff();
      }
    }
  };

  // Format date display
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US');
  };

  // Format input date (YYYY-MM-DD)
  const formatDateForInput = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toISOString().split('T')[0];
  };

  // Format gender display
  const formatGender = (genderValue) => {
    // Debug: Show original gender value
    console.log('Processing gender:', genderValue, 'Type:', typeof genderValue);
    
    if (!genderValue) {
      return { display: 'Unknown', class: 'unknown' };
    }
    
    // Ensure conversion to string and clean spaces
    const cleanGender = String(genderValue).trim().toLowerCase();
    console.log('Cleaned gender:', cleanGender);
    
    switch (cleanGender) {
      case 'male':
        return { display: 'Male', class: 'male' };
      case 'female':
        return { display: 'Female', class: 'female' };
      default:
        console.warn('Unknown gender value:', genderValue);
        return { display: `Unknown (${genderValue})`, class: 'unknown' };
    }
  };

  // Delete record
  const deleteRecord = async (staffID) => {
    if (!confirm('Are you sure you want to delete this staff member?')) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/staff/${staffID}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        showSuccess('Staff member deleted successfully');
        loadAllStaff();
      } else {
        setError(data.message || 'Delete failed');
      }
    } catch (error) {
      console.error('Delete error:', error);
      setError('Error occurred during deletion');
    }
  };

  // Start editing staff
  const startEditing = (staff) => {
    setEditingStaff(staff.staff_id);
    setEditForm({
      name: staff.name || '',
      nickname: staff.nickname || '',
      gender: staff.gender || 'male',
      age: staff.age || '',
      hire_date: formatDateForInput(staff.hire_date),
      email: staff.email || '',
      address: staff.address || '',
      phone_number: staff.phone_number || '',
      emer_phone: staff.emer_phone || '',
      emer_name: staff.emer_name || '',
      position_id: staff.position_id || ''
    });
    setValidationErrors({});
  };

  // Cancel editing
  const cancelEditing = () => {
    setEditingStaff(null);
    setEditForm({});
    setValidationErrors({});
  };

  // Handle edit form input changes
  const handleFormChange = (field, value) => {
    setEditForm(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear validation error for this field
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
    
    // Clear validation error for this field
    if (addValidationErrors[field]) {
      setAddValidationErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  // Validate edit form data
  const validateForm = () => {
    const errors = {};
    
    if (!editForm.name.trim()) {
      errors.name = 'Name is required';
    }
    
    if (!editForm.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editForm.email)) {
      errors.email = 'Invalid email format';
    }
    
    if (!editForm.phone_number.trim()) {
      errors.phone_number = 'Phone number is required';
    }
    
    if (!editForm.age || editForm.age < 1 || editForm.age > 120) {
      errors.age = 'Age must be between 1-120';
    }
    
    if (!editForm.hire_date) {
      errors.hire_date = 'Hire date is required';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Validate add staff form data
  const validateAddForm = () => {
    const errors = {};
    
    if (!addForm.name.trim()) {
      errors.name = 'Name is required';
    }
    
    if (!addForm.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(addForm.email)) {
      errors.email = 'Invalid email format';
    }
    
    if (!addForm.phone_number.trim()) {
      errors.phone_number = 'Phone number is required';
    }
    
    if (!addForm.age || addForm.age < 1 || addForm.age > 120) {
      errors.age = 'Age must be between 1-120';
    }
    
    if (!addForm.hire_date) {
      errors.hire_date = 'Hire date is required';
    }
    
    setAddValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Update staff
  const updateStaff = async (staffId) => {
    if (!validateForm()) {
      return;
    }
    
    setIsUpdating(true);
    
    try {
      const response = await fetch(`${API_BASE_URL}/staff/${staffId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editForm),
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        // Update staff in local state
        setStaffList(prev => prev.map(staff => 
          staff.staff_id === staffId 
            ? { ...staff, ...editForm }
            : staff
        ));
        
        cancelEditing();
        showSuccess('Staff information updated successfully');
      } else {
        setError(data.message || 'Failed to update staff');
      }
    } catch (error) {
      setError('Error occurred while updating staff');
      console.error('Update error:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  // Add staff
  const addStaff = async () => {
    if (!validateAddForm()) {
      return;
    }
    
    setIsAdding(true);
    
    try {
      const response = await fetch(`${API_BASE_URL}/staff`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(addForm),
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        // Add new staff to local state
        setStaffList(prev => [...prev, data.data]);
        
        // Reset add form and close modal
        setAddForm({
          name: '',
          nickname: '',
          gender: 'male',
          age: '',
          hire_date: '',
          email: '',
          address: '',
          phone_number: '',
          emer_phone: '',
          emer_name: '',
          position_id: ''
        });
        setAddValidationErrors({});
        setShowAddModal(false);
        
        showSuccess('Staff member added successfully');
        
        // Refresh list to get updated count
        loadAllStaff();
      } else {
        setError(data.message || 'Failed to add staff member');
      }
    } catch (error) {
      setError('Error occurred while adding staff member');
      console.error('Add error:', error);
    } finally {
      setIsAdding(false);
    }
  };

  // Open add modal
  const openAddModal = () => {
    setShowAddModal(true);
    setAddForm({
      name: '',
      nickname: '',
      gender: 'male',
      age: '',
      hire_date: new Date().toISOString().split('T')[0], // Default to today
      email: '',
      address: '',
      phone_number: '',
      emer_phone: '',
      emer_name: '',
      position_id: ''
    });
    setAddValidationErrors({});
  };

  // Close add modal
  const closeAddModal = () => {
    setShowAddModal(false);
    setAddForm({
      name: '',
      nickname: '',
      gender: 'male',
      age: '',
      hire_date: '',
      email: '',
      address: '',
      phone_number: '',
      emer_phone: '',
      emer_name: '',
      position_id: ''
    });
    setAddValidationErrors({});
  };
  
  // Render edit field for specific columns
  const renderEditField = (staff, field, type = 'text') => {
    const isEditing = editingStaff === staff.staff_id;
    const value = editForm[field];
    const hasError = validationErrors[field];
    
    if (!isEditing) {
      // Display mode
      if (field === 'hire_date') {
        return formatDate(staff[field]);
      } else if (field === 'gender') {
        const genderInfo = formatGender(staff.gender);
        return (
          <span className={`gender-badge ${genderInfo.class}`}>
            {genderInfo.display}
          </span>
        );
      } else if (field === 'email') {
        return (
          <a href={`mailto:${staff.email}`} className="email-link">
            {staff.email}
          </a>
        );
      } else if (field === 'age') {
        return `${staff.age} `;
      } else if (field === 'position_id') {
        return (
          <span className="position-badge">
            {staff.position_id || 'Unassigned'}
          </span>
        );
      } else if (field === 'nickname') {
        return staff.nickname || 'None';
      }
      return staff[field] || 'N/A';
    }
    
    // Edit mode
    if (field === 'gender') {
      return (
        <select
          value={value}
          onChange={(e) => handleFormChange(field, e.target.value)}
          className={`edit-input ${hasError ? 'error' : ''}`}
        >
          <option value="male">Male</option>
          <option value="female">Female</option>
        </select>
      );
    }
    
    return (
      <div className="edit-field-container">
        <input
          type={type}
          value={value}
          onChange={(e) => handleFormChange(field, e.target.value)}
          className={`edit-input ${hasError ? 'error' : ''}`}
          placeholder={field === 'nickname' ? 'Optional' : ''}
        />
        {hasError && (
          <div className="validation-error">{hasError}</div>
        )}
      </div>
    );
  };

  // Render add staff modal
  const renderAddModal = () => {
    if (!showAddModal) return null;

    return (
      <div className="modal-overlay">
        <div className="modal-content modal-large">
          <div className="modal-header">
            <h3>Add New Staff Member</h3>
            <p>Fill out the form below to add a new staff member</p>
            <button 
              onClick={closeAddModal} 
              className="close-btn"
              style={{ position: 'absolute', top: '1.5rem', right: '1.5rem' }}
            >
              <X size={20} />
            </button>
          </div>
          
          <div className="modal-body">
            <form onSubmit={(e) => e.preventDefault()}>
              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem'}}>
                <div className="form-group">
                  <label htmlFor="add-name">Full Name *</label>
                  <input
                    id="add-name"
                    type="text"
                    value={addForm.name}
                    onChange={(e) => handleAddFormChange('name', e.target.value)}
                    className={addValidationErrors.name ? 'error' : ''}
                    placeholder="Enter full name"
                  />
                  {addValidationErrors.name && (
                    <div className="validation-error">{addValidationErrors.name}</div>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="add-nickname">Nickname</label>
                  <input
                    id="add-nickname"
                    type="text"
                    value={addForm.nickname}
                    onChange={(e) => handleAddFormChange('nickname', e.target.value)}
                    placeholder="Optional nickname"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="add-gender">Gender *</label>
                  <select
                    id="add-gender"
                    value={addForm.gender}
                    onChange={(e) => handleAddFormChange('gender', e.target.value)}
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="add-age">Age *</label>
                  <input
                    id="add-age"
                    type="number"
                    value={addForm.age}
                    onChange={(e) => handleAddFormChange('age', e.target.value)}
                    className={addValidationErrors.age ? 'error' : ''}
                    min="1"
                    max="120"
                    placeholder="Age"
                  />
                  {addValidationErrors.age && (
                    <div className="validation-error">{addValidationErrors.age}</div>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="add-hire-date">Hire Date *</label>
                  <input
                    id="add-hire-date"
                    type="date"
                    value={addForm.hire_date}
                    onChange={(e) => handleAddFormChange('hire_date', e.target.value)}
                    className={addValidationErrors.hire_date ? 'error' : ''}
                  />
                  {addValidationErrors.hire_date && (
                    <div className="validation-error">{addValidationErrors.hire_date}</div>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="add-email">Email *</label>
                  <input
                    id="add-email"
                    type="email"
                    value={addForm.email}
                    onChange={(e) => handleAddFormChange('email', e.target.value)}
                    className={addValidationErrors.email ? 'error' : ''}
                    placeholder="email@company.com"
                  />
                  {addValidationErrors.email && (
                    <div className="validation-error">{addValidationErrors.email}</div>
                  )}
                </div>

                <div className="form-group" style={{gridColumn: '1 / -1'}}>
                  <label htmlFor="add-address">Address</label>
                  <input
                    id="add-address"
                    type="text"
                    value={addForm.address}
                    onChange={(e) => handleAddFormChange('address', e.target.value)}
                    placeholder="Home address"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="add-phone">Phone Number *</label>
                  <input
                    id="add-phone"
                    type="tel"
                    value={addForm.phone_number}
                    onChange={(e) => handleAddFormChange('phone_number', e.target.value)}
                    className={addValidationErrors.phone_number ? 'error' : ''}
                    placeholder="Phone number"
                  />
                  {addValidationErrors.phone_number && (
                    <div className="validation-error">{addValidationErrors.phone_number}</div>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="add-emer-phone">Emergency Contact Phone</label>
                  <input
                    id="add-emer-phone"
                    type="tel"
                    value={addForm.emer_phone}
                    onChange={(e) => handleAddFormChange('emer_phone', e.target.value)}
                    placeholder="Emergency contact phone"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="add-emer-name">Emergency Contact Name</label>
                  <input
                    id="add-emer-name"
                    type="text"
                    value={addForm.emer_name}
                    onChange={(e) => handleAddFormChange('emer_name', e.target.value)}
                    placeholder="Emergency contact name"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="add-position">Position ID</label>
                  <input
                    id="add-position"
                    type="text"
                    value={addForm.position_id}
                    onChange={(e) => handleAddFormChange('position_id', e.target.value)}
                    placeholder="Position ID"
                  />
                </div>
              </div>
            </form>
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
              onClick={addStaff}
              disabled={isAdding}
              className="btn btn-success"
            >
              {isAdding ? (
                'Adding...'
              ) : (
                <>
                  <Plus className="btn-icon" />
                  Add Staff Member
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  };  

  // Render staff table
  const renderStaffTable = () => {
    if (staffList.length === 0) {
      return (
        <div className="empty-state">
          <h3>No staff data found</h3>
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
                <th>Staff ID</th>
                <th>Name</th>
                <th>Nickname</th>
                <th>Gender</th>
                <th>Age</th>
                <th>Hire Date</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Address</th>
                <th>Emergency Contact</th>
                <th>Emergency Phone</th>
                <th>Position ID</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {staffList.map((staff, index) => (
                <tr key={staff.staff_id} className={`table-row ${editingStaff === staff.staff_id ? 'editing' : ''}`}>
                  <td>
                    <strong className="staff-id">{staff.staff_id}</strong>
                  </td>
                  <td>{renderEditField(staff, 'name')}</td>
                  <td>{renderEditField(staff, 'nickname')}</td>
                  <td>{renderEditField(staff, 'gender')}</td>
                  <td>{renderEditField(staff, 'age', 'number')}</td>
                  <td>{renderEditField(staff, 'hire_date', 'date')}</td>
                  <td>{renderEditField(staff, 'email', 'email')}</td>
                  <td>{renderEditField(staff, 'phone_number')}</td>
                  <td>{renderEditField(staff, 'address')}</td>
                  <td>{renderEditField(staff, 'emer_name')}</td>
                  <td>{renderEditField(staff, 'emer_phone')}</td>
                  <td>{renderEditField(staff, 'position_id')}</td>
                  <td className="actions-cell">
                    {editingStaff === staff.staff_id ? (
                      <div className="edit-actions">
                        <button
                          onClick={() => updateStaff(staff.staff_id)}
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
                          onClick={() => startEditing(staff)}
                          className="action-btn edit-btn"
                          title="Edit"
                        >
                          <Edit3 size={16} />
                        </button>
                        <button 
                          onClick={() => deleteRecord(staff.staff_id)}
                          className="action-btn cancel-btn"
                          title="Delete"
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
          <div>Loading staff data...</div>
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
      return renderStaffTable();
    }
  };

  // Load all staff on component mount
  useEffect(() => {
    console.log('React Employee Management System ready');
    console.log('API Base URL:', API_BASE_URL);
    loadAllStaff();
  }, []);

  return (
    <div className="app-container">
      <div className="main-card">
        {/* Header */}
        <div className="header">
          <h1>Employee Management</h1>
        </div>
      </div>  

      <div className="divider" />

        {/* Controls */}
      <div className="main-card">
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
                  onKeyPress={handleSearch}
                  placeholder="Search by staff name or staff ID..."
                  className="search-input"
                />
              </div>
            </div>

            {/* Buttons */}
            <button
              onClick={loadAllStaff}
              disabled={loading}
              className="btn btn-primary"
            >
              <Users className="btn-icon" />
              Refresh All Staff
            </button>

            <button
              onClick={clearResults}
              className="btn btn-secondary"
            >
              <Trash2 className="btn-icon" />
              Clear Search
            </button>

            <button 
              onClick={openAddModal}
              className="btn btn-success"
            >
              <UserPlus className="btn-icon" />
              Add Staff Member
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
      </div>

      {/* Add Modal */}
      {renderAddModal()}
    </div>
  );
};

export default EmployeeManagementSystem;