import React, { useState, useEffect } from 'react';
import { Search, Users, Trash2, UserPlus, Edit3, Save, X, Plus } from 'lucide-react';

const EmployeeManagementSystem = () => {
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [currentView, setCurrentView] = useState('table');
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
      const response = await fetch(`${API_BASE_URL}/staff`);
      const data = await response.json();
      
      if (data.success) {
        setStaffList(data.data);
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

  // 搜尋過濾
  const filteredStaff = staffList.filter(staff => {
    const matchesSearch = searchInput === ''
      staff.name?.toLowerCase().includes(searchInput.toLowerCase()) ||
      staff.staff_id?.toString().toLowerCase().includes(searchInput.toLowerCase()) ||
      staff.position_id?.toLowerCase().includes(searchInput.toLowerCase());
    return matchesSearch;
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
    if (!genderValue) {
      return { display: 'Unknown', class: 'unknown' };
    }
    const cleanGender = String(genderValue).trim().toLowerCase();
    switch (cleanGender) {
      case 'male': return { display: 'Male', class: 'male' };
      case 'female': return { display: 'Female', class: 'female' };
      default: return { display: `Unknown (${genderValue})`, class: 'unknown' };
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

  // Validate edit form data
  const validateForm = () => {
    const errors = {};
    if (!editForm.name?.trim()) errors.name = 'Name is required';
    if (!editForm.email?.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editForm.email)) {
      errors.email = 'Invalid email format';
    }
    if (!editForm.phone_number?.trim()) errors.phone_number = 'Phone number is required';
    if (!editForm.age || editForm.age < 1 || editForm.age > 120) errors.age = 'Age must be between 1-120';
    if (!editForm.hire_date) errors.hire_date = 'Hire date is required';
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Validate add staff form data
  const validateAddForm = () => {
    const errors = {};
    if (!addForm.name?.trim()) errors.name = 'Name is required';
    if (!addForm.email?.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(addForm.email)) {
      errors.email = 'Invalid email format';
    }
    if (!addForm.phone_number?.trim()) errors.phone_number = 'Phone number is required';
    if (!addForm.age || addForm.age < 1 || addForm.age > 120) errors.age = 'Age must be between 1-120';
    if (!addForm.hire_date) errors.hire_date = 'Hire date is required';
    setAddValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Update staff
  const updateStaff = async (staffId) => {
    if (!validateForm()) return;
    setIsUpdating(true);
    try {
      const response = await fetch(`${API_BASE_URL}/staff/${staffId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setStaffList(prev => prev.map(staff => staff.staff_id === staffId ? { ...staff, ...editForm } : staff));
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
    if (!validateAddForm()) return;
    setIsAdding(true);
    try {
      const response = await fetch(`${API_BASE_URL}/staff`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addForm),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setStaffList(prev => [...prev, data.data]);
        setAddForm({
          staff_id: '', name: '', nickname: '', gender: 'male',
          age: '', hire_date: '', email: '', address: '',
          phone_number: '', emer_phone: '', emer_name: '', position_id: ''
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

  // Render staff table
  const renderStaffTable = () => {
    if (filteredStaff.length === 0) {
      return (
        <div className="empty-state">
          <h3>No staff data found</h3>
          <p>Please try different search criteria</p>
        </div>
      );
    }

    return (
      <div>
        <h2 className="result-title">All Staffs ({filteredStaff.length})</h2>
          {loading ? (
            <div className="loading-state">
              <Loader size={48} className="animate-spin" />
              <div>Loading request data...</div>
            </div>
          ) : filteredStaff.length === 0 ? (
            <div className="empty-state">
              <FileText size={64} />
              <h3>No Pending Requests</h3>
              <p>There are currently no leave requests requiring review</p>
            </div>
          ) : (
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
              {filteredStaff.map((staff) => (
                <tr key={staff.staff_id} className={`table-row ${editingStaff === staff.staff_id ? 'editing' : ''}`}>
                  <td><strong className="staff-id">{staff.staff_id}</strong></td>
                  <td>{staff.name}</td>
                  <td>{staff.nickname || 'None'}</td>
                  <td>{formatGender(staff.gender).display}</td>
                  <td>{staff.age}</td>
                  <td>{formatDate(staff.hire_date)}</td>
                  <td><a href={`mailto:${staff.email}`}>{staff.email}</a></td>
                  <td>{staff.phone_number}</td>
                  <td>{staff.address}</td>
                  <td>{staff.emer_name}</td>
                  <td>{staff.emer_phone}</td>
                  <td>{staff.position_id || 'Unassigned'}</td>
                  <td className="actions-cell">
                    <button onClick={() => startEditing(staff)} className="action-btn edit-btn"><Edit3 size={16} /></button>
                    <button onClick={() => deleteRecord(staff.staff_id)} className="action-btn cancel-btn"><Trash2 size={16} /></button>
                    <button
                      className="action-btn save-btn"
                      onClick={() => handleRequestAction(request.request_id, 'approve', 'Quick Approval')}
                      disabled={isProcessing}
                      title="Quick Approve"
                    >
                      {isProcessing ? (
                        <Loader size={16} className="animate-spin" />
                      ) : (
                        <CheckCircle size={16} />
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}
      </div>
    );
  };

  // Render content area
  const renderContent = () => {
    if (loading) return <div className="loading-state">Loading staff data...</div>;
    if (error) return <div className="error-message">{error}</div>;
    if (currentView === 'table') return renderStaffTable();
  };

  useEffect(() => {
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
                  onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder="Search by staff ID, name, or position..."
                  className="search-input"
                />
              </div>
            </div>
            <button onClick={loadAllStaff} disabled={loading} className="btn btn-primary">
              <Users className="btn-icon" /> Refresh
            </button>
            {searchInput && (
              <button onClick={clearResults} className="btn btn-secondary">
                <Trash2 size={20} className="btn-icon" /> Clear Search
              </button>
            )}
            <button onClick={openAddModal} className="btn btn-success">
              <UserPlus className="btn-icon" /> Add Staff Member
            </button>
          </div>
        </div>
        {successMessage && (
          <div style={{ padding: '12px 20px', backgroundColor: '#d1fae5', color: '#065f46' }}>
            {successMessage}
          </div>
        )}
        <div className="content">{renderContent()}</div>
      </div>
      {/* Add Modal */}
      {/* 這裡保留你的 renderAddModal 函數即可 */}
    </div>
  );
};

export default EmployeeManagementSystem;
