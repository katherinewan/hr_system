import React, { useState, useEffect } from 'react';
import { Search, Building, Trash2, Plus, Edit3, Save, X, Users, BarChart3 } from 'lucide-react';

const DepartmentManagementSystem = () => {
  const [departmentList, setDepartmentList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [currentView, setCurrentView] = useState('table');
  const [resultTitle, setResultTitle] = useState('');
  const [editingDepartment, setEditingDepartment] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [validationErrors, setValidationErrors] = useState({});
  const [isUpdating, setIsUpdating] = useState(false);

  // 新增部門相關狀態
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({
    department_id: '',
    department_name: '',
    department_head: ''
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

  // Load all departments
  const loadAllDepartments = async () => {
    setLoading(true);
    clearError();
    
    try {
      const response = await fetch(`${API_BASE_URL}/departments`);
      const data = await response.json();
      
      if (data.success) {
        console.log('Raw API data:', data.data);
        setDepartmentList(data.data);
        setResultTitle(`All Departments (Total: ${data.count} departments)`);
        setCurrentView('table');
      } else {
        showError(data.message || 'Failed to load department data');
      }
    } catch (error) {
      showError('Unable to connect to server, please check if backend is running');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Search departments
  const searchDepartments = async (searchTerm) => {
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
        console.log(`Searching department ID: ${trimmedInput}`);
        response = await fetch(`${API_BASE_URL}/departments/${trimmedInput}`);
      } else {
        console.log(`Searching department name: ${trimmedInput}`);
        // 在部門列表中本地搜索
        const filteredDepartments = departmentList.filter(dept => 
          dept.department_name.toLowerCase().includes(trimmedInput.toLowerCase()) ||
          dept.department_head.toLowerCase().includes(trimmedInput.toLowerCase())
        );
        
        setDepartmentList(filteredDepartments);
        setResultTitle(`Search Results for "${trimmedInput}" (Total: ${filteredDepartments.length} departments)`);
        setCurrentView('table');
        setLoading(false);
        return;
      }
      
      const data = await response.json();
      console.log('Backend response:', data);
      
      if (response.ok && data) {
        if (data.success) {
          let deptData;
          if (Array.isArray(data.data)) {
            deptData = data.data;
          } else {
            deptData = [data.data];
          }
          
          setDepartmentList(deptData);
          setResultTitle(`Search Results for "${trimmedInput}" (Total: ${deptData.length} departments)`);
          setCurrentView('table');
        } else {
          showError(data.message || 'Department data not found');
        }
      } else {
        if (response.status === 404) {
          showError(`Department "${trimmedInput}" not found`);
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
    loadAllDepartments();
  };

  // Handle search input
  const handleSearch = (e) => {
    if (e.key === 'Enter') {
      if (searchInput.trim()) {
        searchDepartments(searchInput);
      } else {
        loadAllDepartments();
      }
    }
  };

  // Start editing a department
  const startEditing = (department) => {
    setEditingDepartment(department.department_id);
    setEditForm({
      department_name: department.department_name || '',
      department_head: department.department_head || ''
    });
    setValidationErrors({});
  };

  // Cancel editing
  const cancelEditing = () => {
    setEditingDepartment(null);
    setEditForm({});
    setValidationErrors({});
  };

  // Handle form input changes for editing
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

  // Handle form input changes for adding new department
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

  // Validate form data for editing
  const validateForm = () => {
    const errors = {};
    
    if (!editForm.department_name.trim()) {
      errors.department_name = 'Department name is required';
    }
    
    if (!editForm.department_head.trim()) {
      errors.department_head = 'Department head is required';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Validate form data for adding new department
  const validateAddForm = () => {
    const errors = {};
    
    if (!addForm.department_id || addForm.department_id.trim() === '') {
      errors.department_id = 'Department ID is required';
    }
    
    if (!addForm.department_name.trim()) {
      errors.department_name = 'Department name is required';
    }
    
    if (!addForm.department_head.trim()) {
      errors.department_head = 'Department head is required';
    }
    
    setAddValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Update department
  const updateDepartment = async (departmentId) => {
    if (!validateForm()) {
      return;
    }
    
    setIsUpdating(true);
    
    try {
      const response = await fetch(`${API_BASE_URL}/departments/${departmentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editForm),
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        // Update the department in the local state
        setDepartmentList(prev => prev.map(dept => 
          dept.department_id === departmentId 
            ? { ...dept, ...editForm }
            : dept
        ));
        
        cancelEditing();
        showSuccess('Department updated successfully');
      } else {
        setError(data.message || 'Failed to update department');
      }
    } catch (error) {
      setError('Error occurred while updating department');
      console.error('Update error:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  // Add new department
  const addDepartment = async () => {
    if (!validateAddForm()) {
      return;
    }
    
    setIsAdding(true);
    
    try {
      const response = await fetch(`${API_BASE_URL}/departments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(addForm),
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        // Add the new department to the local state
        setDepartmentList(prev => [...prev, data.data]);
        
        // Reset add form and close modal
        setAddForm({
          department_id: '',
          department_name: '',
          department_head: ''
        });
        setAddValidationErrors({});
        setShowAddModal(false);
        
        showSuccess('New department added successfully');
        
        // Refresh the list to get updated count
        loadAllDepartments();
      } else {
        setError(data.message || 'Failed to add department');
      }
    } catch (error) {
      setError('Error occurred while adding department');
      console.error('Add error:', error);
    } finally {
      setIsAdding(false);
    }
  };

  // Delete department
  const deleteDepartment = async (departmentId, departmentName) => {
    if (!confirm(`Are you sure you want to delete department "${departmentName}"? This action cannot be undone.`)) {
      return;
    }
    
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/departments/${departmentId}`, {
        method: 'DELETE',
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        // Remove the department from the local state
        setDepartmentList(prev => prev.filter(dept => dept.department_id !== departmentId));
        showSuccess('Department deleted successfully');
      } else {
        setError(data.message || 'Failed to delete department');
      }
    } catch (error) {
      setError('Error occurred while deleting department');
      console.error('Delete error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Open add modal
  const openAddModal = () => {
    setShowAddModal(true);
    setAddForm({
      department_id: '',
      department_name: '',
      department_head: ''
    });
    setAddValidationErrors({});
  };

  // Close add modal
  const closeAddModal = () => {
    setShowAddModal(false);
    setAddForm({
      department_id: '',
      department_name: '',
      department_head: ''
    });
    setAddValidationErrors({});
  };

  // Render edit form for a specific field
  const renderEditField = (department, field, type = 'text') => {
    const isEditing = editingDepartment === department.department_id;
    const value = editForm[field];
    const hasError = validationErrors[field];
    
    if (!isEditing) {
      // Display mode
      if (field === 'department_name') {
        return <strong>{department[field]}</strong>;
      }
      return department[field];
    }
    
    // Edit mode
    return (
      <div className="edit-field-container">
        <input
          type={type}
          value={value}
          onChange={(e) => handleFormChange(field, e.target.value)}
          className={`edit-input ${hasError ? 'error' : ''}`}
        />
        {hasError && (
          <div className="validation-error">{hasError}</div>
        )}
      </div>
    );
  };

  // Render add department modal
  const renderAddModal = () => {
    if (!showAddModal) return null;

    return (
      <div className="modal-overlay">
        <div className="modal-content modal-large">
          <div className="modal-header">
            <h3>Add New Department</h3>
            <p>Fill out the form below to add a new department</p>
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
              <div className="form-group">
                <label htmlFor="add-dept-id">Department ID *</label>
                <input
                  id="add-dept-id"
                  type="number"
                  value={addForm.department_id}
                  onChange={(e) => handleAddFormChange('department_id', e.target.value)}
                  className={addValidationErrors.department_id ? 'error' : ''}
                  placeholder="Enter department ID (number)"
                />
                {addValidationErrors.department_id && (
                  <div className="validation-error">{addValidationErrors.department_id}</div>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="add-dept-name">Department Name *</label>
                <input
                  id="add-dept-name"
                  type="text"
                  value={addForm.department_name}
                  onChange={(e) => handleAddFormChange('department_name', e.target.value)}
                  className={addValidationErrors.department_name ? 'error' : ''}
                  placeholder="Enter department name"
                />
                {addValidationErrors.department_name && (
                  <div className="validation-error">{addValidationErrors.department_name}</div>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="add-dept-head">Department Head *</label>
                <input
                  id="add-dept-head"
                  type="text"
                  value={addForm.department_head}
                  onChange={(e) => handleAddFormChange('department_head', e.target.value)}
                  className={addValidationErrors.department_head ? 'error' : ''}
                  placeholder="Enter department head name"
                />
                {addValidationErrors.department_head && (
                  <div className="validation-error">{addValidationErrors.department_head}</div>
                )}
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
              onClick={addDepartment}
              disabled={isAdding}
              className="btn btn-success"
            >
              {isAdding ? (
                'Adding...'
              ) : (
                <>
                  <Plus className="btn-icon" />
                  Add Department
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Render department table
  const renderDepartmentTable = () => {
    if (departmentList.length === 0) {
      return (
        <div className="empty-state">
          <h3>No department data found</h3>
          <p>Please try other search criteria</p>
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
                <th>Department ID</th>
                <th>Department Name</th>
                <th>Department Head</th>
                <th>Position Count</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {departmentList.map((department) => (
                <tr key={department.department_id} className={`table-row ${editingDepartment === department.department_id ? 'editing' : ''}`}>
                  <td>
                    <strong className="staff-id">{department.department_id}</strong>
                  </td>
                  <td>{renderEditField(department, 'department_name')}</td>
                  <td>{renderEditField(department, 'department_head')}</td>
                  <td>
                    <span className="position-badge">
                      {department.position_count || 0} positions
                    </span>
                  </td>
                  <td className="actions-cell">
                    {editingDepartment === department.department_id ? (
                      <div className="edit-actions">
                        <button
                          onClick={() => updateDepartment(department.department_id)}
                          disabled={isUpdating}
                          className="action-btn save-btn"
                          title="Save changes"
                        >
                          {isUpdating ? '...' : <Save size={16} />}
                        </button>
                        <button
                          onClick={cancelEditing}
                          disabled={isUpdating}
                          className="action-btn cancel-btn"
                          title="Cancel editing"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <div className="edit-actions">
                        <button
                          onClick={() => startEditing(department)}
                          className="action-btn edit-btn"
                          title="Edit department"
                        >
                          <Edit3 size={16} />
                        </button>
                        <button
                          onClick={() => deleteDepartment(department.department_id, department.department_name)}
                          className="action-btn cancel-btn"
                          title="Delete department"
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
            <h4>Please fix the following errors:</h4>
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
          <div>Loading department data...</div>
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
      return renderDepartmentTable();
    }
  };

  // Load all departments on component mount
  useEffect(() => {
    console.log('React Department Management System is ready');
    console.log('API Base URL:', API_BASE_URL);
    loadAllDepartments();
  }, []);

  return (
    <div className="app-container">
      <div className="main-card">
        {/* Header */}
        <div className="header">
          <h1>Departments</h1>
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
                  onKeyPress={handleSearch}
                  placeholder="Search department name or department ID..."
                  className="search-input"
                />
              </div>
            </div>

            {/* Buttons */}
            <button
              onClick={loadAllDepartments}
              disabled={loading}
              className="btn btn-primary"
            >
              <Building className="btn-icon" />
              Refresh All Departments
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
              <Plus className="btn-icon" />
              Add New Department
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

export default DepartmentManagementSystem;