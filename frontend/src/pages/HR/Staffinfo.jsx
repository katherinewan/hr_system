import React, { useState, useEffect } from 'react';
import { Search, RefreshCw, Trash2, UserPlus, Edit3, Save, X, Plus, Loader } from 'lucide-react';

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
    staff_id: '',
    name: '',
    nickname: '',
    gender: 'male',
    birthday: '',
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

  // Load all staff
  const loadAllStaff = async () => {
    setLoading(true);
    clearError();
    
    try {
      console.log('Loading staff data...');
      const response = await fetch(`${API_BASE_URL}/staffs`);
      const data = await response.json();
      
      console.log('API response:', data);
      
      if (data.success) {
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

  // Enhanced search staff with unified search logic
  const searchStaff = async (searchTerm) => {
    if (!searchTerm || !searchTerm.trim()) {
      loadAllStaff();
      return;
    }

    const trimmedInput = searchTerm.trim();
    setLoading(true);
    clearError();
    
    try {
      let response;
      
      if (/^\d+$/.test(trimmedInput)) {
        console.log(`Searching staff ID: ${trimmedInput}`);
        response = await fetch(`${API_BASE_URL}/staffs/${trimmedInput}`);
      } else {
        console.log(`Searching staff name: ${trimmedInput}`);
        const params = new URLSearchParams();
        params.append('name', trimmedInput);
        response = await fetch(`${API_BASE_URL}/staffs/search?${params.toString()}`);
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
  };

  // Filter staffs based on search input
  const filteredStaffs = staffList.filter(staff => {
    if (!searchInput.trim()) return true;
    
    const searchTerm = searchInput.toLowerCase().trim();
    return (
      staff.name.toLowerCase().includes(searchTerm) ||
      staff.staff_id.toString().includes(searchTerm) ||
      (staff.nickname && staff.nickname.toLowerCase().includes(searchTerm)) ||
      (staff.email && staff.email.toLowerCase().includes(searchTerm))
    );
  });

  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      if (typeof dateString === 'string' && dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
        return dateString;
      }
      
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return dateString;
      }
      
      date.setDate(date.getDate() + 1);
      return date.toISOString().split('T')[0];
    } catch (error) {
      console.error('Date formatting error:', error);
      return dateString;
    }
  };

  // Format input date (YYYY-MM-DD)
  const formatDateForInput = (dateString) => {
    if (!dateString) return '';
    try {
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        return dateString;
      }
      const date = new Date(dateString);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch (error) {
      console.error('Date input formatting error:', error);
      return '';
    }
  };

  // Format gender display
  const formatGender = (genderValue) => {
    console.log('Processing gender:', genderValue, 'Type:', typeof genderValue);
    
    if (!genderValue) {
      return { display: 'Unknown', class: 'unknown' };
    }
    
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
      const response = await fetch(`${API_BASE_URL}/staffs/${parseInt(staffID)}`, {
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

  // calculate age from birthday
  const calculateAge = (birthday) => {
    if (!birthday) return '';
    try {
      const birthDate = new Date(birthday);
      const today = new Date();
      
      if (isNaN(birthDate.getTime())) {
        return '';
      }
      
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      
      return age;
    } catch (error) {
      console.error('Error calculating age:', error);
      return '';
    }
  };

  // Start editing staff
  const startEditing = (staff) => {
    console.log('Starting edit for staff:', staff);
    console.log('Original gender:', staff.gender, 'Type:', typeof staff.gender);
    console.log('Original hire_date:', staff.hire_date);
    
    setEditingStaff(staff.staff_id);
    
    let genderValue = 'male';
    if (staff.gender && staff.gender.trim() !== '') {
      genderValue = staff.gender.toLowerCase().trim();
    }
    
    let hireDateValue = '';
    if (staff.hire_date) {
      hireDateValue = formatDateForInput(staff.hire_date);
    }

    let birthdayValue = '';
    if (staff.birthday) {
      birthdayValue = formatDateForInput(staff.birthday);
    }
    
    const formData = {
      name: staff.name || '',
      nickname: staff.nickname || '',
      gender: genderValue,
      birthday: birthdayValue, 
      age: staff.age || '',
      hire_date: hireDateValue,
      email: staff.email || '',
      address: staff.address || '',
      phone_number: staff.phone_number || '',
      emer_phone: staff.emer_phone || '',
      emer_name: staff.emer_name || '',
      position_id: staff.position_id || ''
    };
    
    console.log('Setting edit form to:', formData);
    setEditForm(formData);
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
    console.log(`Form change: ${field} = ${value}`);
    
    if (field === 'birthday') {
      const newAge = calculateAge(value);
      console.log('Birthday changed to:', value, 'New age:', newAge);
      
      setEditForm(prev => ({
        ...prev,
        [field]: value,
        age: newAge
      }));
    } else {
      setEditForm(prev => ({
        ...prev,
        [field]: value
      }));
    }
    
    if (validationErrors[field]) {
      setValidationErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  // Handle add staff form input changes
  const handleAddFormChange = (field, value) => {
    if (field === 'birthday') {
      const newAge = calculateAge(value);
      console.log('Add form birthday changed to:', value, 'New age:', newAge);
      
      setAddForm(prev => ({
        ...prev,
        [field]: value,
        age: newAge
      }));
    } else {
      setAddForm(prev => ({
        ...prev,
        [field]: value
      }));
    }
    
    if (addValidationErrors[field]) {
      setAddValidationErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
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
    
    if (!addForm.birthday.trim()) {
      errors.birthday = 'Birthday is required';
    } else {
      const age = calculateAge(addForm.birthday);
      if (age < 18 || age > 70) {
        errors.birthday = 'Age must be between 18-70 years old';
      }
    }
    
    if (!addForm.hire_date) {
      errors.hire_date = 'Hire date is required';
    }
    
    setAddValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Update staff
  const updateStaff = async (staffID) => {
    if (!editForm.name?.trim() || !editForm.email?.trim() || !editForm.phone_number?.trim() || !editForm.birthday || !editForm.hire_date) {
      setError('Please fill in all required fields');
      return;
    }

    setIsUpdating(true);
    
    try {
      const completeData = {
        name: editForm.name || '',
        nickname: editForm.nickname || '',
        gender: editForm.gender || 'male',
        birthday: editForm.birthday || '',
        age: editForm.age || '', // 添加这行
        hire_date: editForm.hire_date || '',
        email: editForm.email || '',
        address: editForm.address || '',
        phone_number: editForm.phone_number || '',
        emer_phone: editForm.emer_phone || '',
        emer_name: editForm.emer_name || '',
        position_id: editForm.position_id || ''
      };
      
      console.log('Updating staff with complete data:', completeData);
      console.log('Staff ID:', staffID);
      
      const response = await fetch(`${API_BASE_URL}/staffs/${staffID}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(completeData),
      });
      
      const data = await response.json();
      console.log('Update response:', data);
      
      if (response.ok && data.success) {
        await loadAllStaff();
        cancelEditing();
        showSuccess('Staff information updated successfully');
      } else {
        console.error('Update failed:', data);
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
      const staffData = {
        staff_id: addForm.staff_id,
        name: addForm.name,
        nickname: addForm.nickname,
        gender: addForm.gender,
        birthday: addForm.birthday,
        age: addForm.age,
        hire_date: addForm.hire_date,
        email: addForm.email,
        address: addForm.address,
        phone_number: addForm.phone_number,
        emer_phone: addForm.emer_phone,
        emer_name: addForm.emer_name,
        position_id: addForm.position_id
      };

      const response = await fetch(`${API_BASE_URL}/staffs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(staffData),
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        setAddForm({
          staff_id: '',
          name: '',
          nickname: '',
          gender: 'male',
          age: '',
          birthday: '',
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
      staff_id: '',
      name: '',
      nickname: '',
      gender: 'male',
      age: '',
      birthday: '',
      hire_date: new Date().toISOString().split('T')[0],
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
      staff_id: '',
      name: '',
      nickname: '',
      gender: 'male',
      age: '',
      birthday: '',
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
  
  // Enhanced render edit field for specific columns
  const renderEditField = (staff, field, type = 'text') => {
    const isEditing = editingStaff === staff.staff_id;
    const value = editForm[field];
    const hasError = validationErrors[field];
    
    if (!isEditing) {
      if (field === 'hire_date' || field === 'birthday') {
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

    if (field === 'age') {
      return (
        <div className="edit-field-container">
          <input
            type="number"
            value={editForm.age || ''}
            className="edit-input age-readonly"
            readOnly
            style={{ 
              backgroundColor: '#f3f4f6', 
              color: '#6b7280',
              cursor: 'not-allowed'
            }}
            title="Age is automatically calculated from birthday"
          />
          <small style={{ color: '#6b7280', fontSize: '12px' }}>
            Auto-calculated from birthday
          </small>
        </div>
      );
    }

    if (field === 'gender') {
      return (
        <select
          value={value || 'male'}
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
          value={value || ''}
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
          <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3>Add New Staff Member</h3>
              <p>Fill out the form below to add a new staff member</p>
            </div>
            <button 
              onClick={closeAddModal} 
              className="close-btn"
            >
              <X size={20} />
            </button>
          </div>    
          <div className="modal-body">
            <form onSubmit={(e) => e.preventDefault()}>
              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem'}}>
                <div className="form-group">
                  <label htmlFor='add-id'>Staff ID <span className="required">*</span></label>
                  <input id='add-id' 
                    type='number'  
                    value={addForm.staff_id}
                    onChange={(e) => handleAddFormChange('staff_id', e.target.value)}
                    className={addValidationErrors.staff_id ? 'error' : ''}
                    placeholder="Enter staff id"
                  />
                </div>

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
                  <label htmlFor="add-birthday">Birthday *</label>
                  <input
                    id="add-birthday"
                    type="date"
                    value={addForm.birthday}
                    onChange={(e) => handleAddFormChange('birthday', e.target.value)}
                    className={addValidationErrors.birthday ? 'error' : ''}
                  />
                  {addValidationErrors.birthday && (
                    <div className="validation-error">{addValidationErrors.birthday}</div>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="add-age">Age (Auto-calculated) *</label> 
                  <input
                    id="add-age"
                    type="number"
                    value={addForm.age}
                    readOnly
                    style={{ 
                      backgroundColor: '#f3f4f6', 
                      color: '#6b7280',
                      cursor: 'not-allowed'
                    }}
                    placeholder="Select birthday to calculate age"
                    title="Age is automatically calculated from birthday"
                  />
                  <small style={{ color: '#6b7280', fontSize: '12px' }}>
                    Calculated from birthday
                  </small>
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
                <th>Birthday</th>
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
              {filteredStaffs.map((staff) => (
                <tr 
                key={staff.staff_id} 
                className={`table-row ${editingStaff === staff.staff_id ? 'editing' : ''}`}>
                  <td>
                    <strong className="staff-id">{staff.staff_id}</strong>
                  </td>
                  <td>{renderEditField(staff, 'name')}</td>
                  <td>{renderEditField(staff, 'nickname')}</td>
                  <td>{renderEditField(staff, 'gender')}</td>
                  <td>{renderEditField(staff, 'birthday', 'date')}</td>
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
                          onClick={() => deleteRecord(parseInt(staff.staff_id))}
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
          <Loader size={48} className="animate-spin" />
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
        <div className="header">
          <h1>Employee Management</h1>
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
                  placeholder="Search by staff ID or name..."
                  className="search-input"
                />
              </div>
            </div>

            <button
              onClick={loadAllStaff}
              disabled={loading}
              className="btn btn-primary"
            >
              <RefreshCw className="btn-icon" />
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
              onClick={openAddModal}
              className="btn btn-success"
            >
              <UserPlus className="btn-icon" />
              Add Staff Member
            </button>
          </div>
        </div>

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

        <div className="content">
          {renderContent()}
        </div>
      </div>

      {renderAddModal()}
    </div>
  );
};

export default EmployeeManagementSystem;