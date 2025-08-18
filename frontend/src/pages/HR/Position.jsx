import React, { useState, useEffect } from 'react';
import { Search, History, Trash2, Plus, Edit3, Save, X, Loader, FileText, Building } from 'lucide-react';

const PositionManagementSystem = () => {
  const [positionList, setPositionList] = useState([]);
  const [departmentList, setDepartmentList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [currentView, setCurrentView] = useState('table');
  const [resultTitle, setResultTitle] = useState('');
  const [editingPosition, setEditingPosition] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [validationErrors, setValidationErrors] = useState({});
  const [isUpdating, setIsUpdating] = useState(false);

  // Add position related state
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({
    position_id: '',
    title: '',
    level: '',
    department_id: ''
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

  // Level options
  const levelOptions = [
    { value: 'Junior', label: 'Junior' },
    { value: 'Mid', label: 'Mid-Level' },
    { value: 'Senior', label: 'Senior' }
  ];

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

  // Load all positions
  const loadAllPositions = async () => {
    setLoading(true);
    clearError();
    
    try {
      const response = await fetch(`${API_BASE_URL}/positions`);
      const data = await response.json();
      
      if (data.success) {
        console.log('Raw API data:', data.data);
        setPositionList(data.data);
        setResultTitle(`All Positions (Total: ${data.count} positions)`);
        setCurrentView('table');
      } else {
        showError(data.message || 'Failed to load position data');
      }
    } catch (error) {
      showError('Unable to connect to server, please check if backend is running');
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load all departments
  const loadAllDepartments = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/departments`);
      const data = await response.json();
      
      if (data.success) {
        setDepartmentList(data.data);
      } else {
        console.error('Failed to load departments:', data.message);
      }
    } catch (error) {
      console.error('Error loading departments:', error);
    }
  };

  // Get level color class
  const getLevelColorClass = (level) => {
    switch (level.toLowerCase()) {
      case 'junior':
        return 'badge-employee';
      case 'mid':
        return 'badge-warning';
      case 'senior':
        return 'badge-manager';
      default:
        return 'badge-default';
    }
  };

  // Start editing a position
  const startEditing = (position) => {
    setEditingPosition(position.position_id);
    setEditForm({
      title: position.title || '',
      level: position.level || '',
      department_id: position.department_id || ''
    });
    setValidationErrors({});
  };

  // Cancel editing
  const cancelEditing = () => {
    setEditingPosition(null);
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

  // Handle form input changes for adding new position
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
    
    if (!editForm.title.trim()) {
      errors.title = 'Position title is required';
    }
    
    if (!editForm.level.trim()) {
      errors.level = 'Position level is required';
    }
    
    if (!editForm.department_id) {
      errors.department_id = 'Department is required';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Validate form data for adding new position
  const validateAddForm = () => {
    const errors = {};
    
    if (!addForm.position_id || addForm.position_id.trim() === '') {
      errors.position_id = 'Position ID is required';
    }
    
    if (!addForm.title.trim()) {
      errors.title = 'Position title is required';
    }
    
    if (!addForm.level.trim()) {
      errors.level = 'Position level is required';
    }
    
    if (!addForm.department_id) {
      errors.department_id = 'Department is required';
    }
    
    setAddValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Update position
  const updatePosition = async (positionId) => {
    if (!validateForm()) {
      return;
    }
    
    setIsUpdating(true);
    
    try {
      const response = await fetch(`${API_BASE_URL}/positions/${positionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editForm),
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        // Update the position in the local state
        setPositionList(prev => prev.map(position => 
          position.position_id === positionId 
            ? { ...position, ...editForm, department_name: getDepartmentName(editForm.department_id) }
            : position
        ));
        
        cancelEditing();
        showSuccess('Position updated successfully');
      } else {
        setError(data.message || 'Failed to update position');
      }
    } catch (error) {
      setError('Error occurred while updating position');
      console.error('Update error:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  // Add new position
  const addPosition = async () => {
    if (!validateAddForm()) {
      return;
    }
    
    setIsAdding(true);
    
    try {
      const response = await fetch(`${API_BASE_URL}/positions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(addForm),
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        // Add the new position to the local state
        const newPosition = {
          ...data.data,
          department_name: getDepartmentName(data.data.department_id)
        };
        setPositionList(prev => [...prev, newPosition]);
        
        // Reset add form and close modal
        setAddForm({
          position_id: '',
          title: '',
          level: '',
          department_id: ''
        });
        setAddValidationErrors({});
        setShowAddModal(false);
        
        showSuccess('New position added successfully');
        
        // Refresh the list to get updated count
        loadAllPositions();
      } else {
        setError(data.message || 'Failed to add position');
      }
    } catch (error) {
      setError('Error occurred while adding position');
      console.error('Add error:', error);
    } finally {
      setIsAdding(false);
    }
  };

  // Delete position
  const deletePosition = async (positionId, positionTitle) => {
    if (!confirm(`Are you sure you want to delete position "${positionTitle}"? This action cannot be undone.`)) {
      return;
    }
    
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/positions/${positionId}`, {
        method: 'DELETE',
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        // Remove the position from the local state
        setPositionList(prev => prev.filter(position => position.position_id !== positionId));
        showSuccess('Position deleted successfully');
      } else {
        setError(data.message || 'Failed to delete position');
      }
    } catch (error) {
      setError('Error occurred while deleting position');
      console.error('Delete error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get department name by ID
  const getDepartmentName = (departmentId) => {
    const department = departmentList.find(d => d.department_id.toString() === departmentId.toString());
    return department ? department.department_name : 'Unknown Department';
  };

  // Open add modal
  const openAddModal = () => {
    setShowAddModal(true);
    setAddForm({
      position_id: '',
      title: '',
      level: '',
      department_id: ''
    });
    setAddValidationErrors({});
  };

  // Close add modal
  const closeAddModal = () => {
    setShowAddModal(false);
    setAddForm({
      position_id: '',
      title: '',
      level: '',
      department_id: ''
    });
    setAddValidationErrors({});
  };

  // Render edit form for a specific field
  const renderEditField = (position, field, type = 'text') => {
    const isEditing = editingPosition === position.position_id;
    const value = editForm[field];
    const hasError = validationErrors[field];
    
    if (!isEditing) {
      // Display mode
      if (field === 'title') {
        return <strong>{position[field]}</strong>;
      } else if (field === 'level') {
        return (
          <span className={`position-badge ${getLevelColorClass(position.level)}`}>
            {position.level}
          </span>
        );
      } else if (field === 'department_id') {
        return getDepartmentName(position.department_id);
      }
      return position[field];
    }
    
    // Edit mode
    if (field === 'level') {
      return (
        <select
          value={value}
          onChange={(e) => handleFormChange(field, e.target.value)}
          className={`edit-input ${hasError ? 'error' : ''}`}
        >
          <option value="">Select Level</option>
          {levelOptions.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      );
    } else if (field === 'department_id') {
      return (
        <select
          value={value}
          onChange={(e) => handleFormChange(field, e.target.value)}
          className={`edit-input ${hasError ? 'error' : ''}`}
        >
          <option value="">Select Department</option>
          {departmentList.map(dept => (
            <option key={dept.department_id} value={dept.department_id}>
              {dept.department_name}
            </option>
          ))}
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
        />
        {hasError && (
          <div className="validation-error">{hasError}</div>
        )}
      </div>
    );
  };

  // Render add position modal
  const renderAddModal = () => {
    if (!showAddModal) return null;

    return (
      <div className="modal-overlay">
        <div className="modal-content modal-large">
          <div className="modal-header">
            <h3>Add New Position</h3>
            <p>Fill out the form below to add a new position</p>
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
                  <label htmlFor="add-position-id">Position ID *</label>
                  <input
                    id="add-position-id"
                    type="number"
                    value={addForm.position_id}
                    onChange={(e) => handleAddFormChange('position_id', e.target.value)}
                    className={addValidationErrors.position_id ? 'error' : ''}
                    placeholder="Enter position ID (number)"
                  />
                  {addValidationErrors.position_id && (
                    <div className="validation-error">{addValidationErrors.position_id}</div>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="add-title">Position Title *</label>
                  <input
                    id="add-title"
                    type="text"
                    value={addForm.title}
                    onChange={(e) => handleAddFormChange('title', e.target.value)}
                    className={addValidationErrors.title ? 'error' : ''}
                    placeholder="Enter position title"
                  />
                  {addValidationErrors.title && (
                    <div className="validation-error">{addValidationErrors.title}</div>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="add-level">Position Level *</label>
                  <select
                    id="add-level"
                    value={addForm.level}
                    onChange={(e) => handleAddFormChange('level', e.target.value)}
                    className={addValidationErrors.level ? 'error' : ''}
                  >
                    <option value="">Select Level</option>
                    {levelOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  {addValidationErrors.level && (
                    <div className="validation-error">{addValidationErrors.level}</div>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="add-department">Department *</label>
                  <select
                    id="add-department"
                    value={addForm.department_id}
                    onChange={(e) => handleAddFormChange('department_id', e.target.value)}
                    className={addValidationErrors.department_id ? 'error' : ''}
                  >
                    <option value="">Select Department</option>
                    {departmentList.map(dept => (
                      <option key={dept.department_id} value={dept.department_id}>
                        {dept.department_name}
                      </option>
                    ))}
                  </select>
                  {addValidationErrors.department_id && (
                    <div className="validation-error">{addValidationErrors.department_id}</div>
                  )}
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
              onClick={addPosition}
              disabled={isAdding}
              className="btn btn-success"
            >
              {isAdding ? (
                'Adding...'
              ) : (
                <>
                  <Plus className="btn-icon" />
                  Add Position
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Render position table with filtering
  const renderPositionTable = () => {
    // 🔥 核心Filter功能 - 实时过滤positions
    const filteredPositions = positionList.filter(position => {
      const matchesSearch = searchInput === '' || 
        position.title.toLowerCase().includes(searchInput.toLowerCase()) ||
        position.level.toLowerCase().includes(searchInput.toLowerCase()) ||
        position.position_id.toString().includes(searchInput) ||
        (position.department_name && position.department_name.toLowerCase().includes(searchInput.toLowerCase())) ||
        getDepartmentName(position.department_id).toLowerCase().includes(searchInput.toLowerCase());
      return matchesSearch;
    });

    if (filteredPositions.length === 0) {
      return (
        <div className="empty-state">
          <FileText size={64} />
          <h3>No position data found</h3>
          <p>{searchInput ? `No positions match "${searchInput}"` : 'Please try other search criteria'}</p>
        </div>
      );
    }

    return (
      <div>
        <h2 className="result-title">
          {searchInput ? 
            `Search Results for "${searchInput}" (${filteredPositions.length} positions)` : 
            `All Positions (Total: ${filteredPositions.length} positions)`
          }
        </h2>
        <div className="table-container">
          <table className="staff-table">
            <thead>
              <tr className="table-header">
                <th>Position ID</th>
                <th>Position Title</th>
                <th>Level</th>
                <th>Department</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPositions.map((position) => (
                <tr key={position.position_id} className={`table-row ${editingPosition === position.position_id ? 'editing' : ''}`}>
                  <td>
                    <strong className="staff-id">{position.position_id}</strong>
                  </td>
                  <td>{renderEditField(position, 'title')}</td>
                  <td>{renderEditField(position, 'level')}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {renderEditField(position, 'department_id')}
                    </div>
                  </td>
                  <td className="actions-cell">
                    {editingPosition === position.position_id ? (
                      <div className="edit-actions">
                        <button
                          onClick={() => updatePosition(position.position_id)}
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
                          onClick={() => startEditing(position)}
                          className="action-btn edit-btn"
                          title="Edit position"
                        >
                          <Edit3 size={16} />
                        </button>
                        <button
                          onClick={() => deletePosition(position.position_id, position.title)}
                          className="action-btn cancel-btn"
                          title="Delete position"
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
          <Loader size={48} className="animate-spin" />
          <div>Loading position data...</div>
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
      return renderPositionTable();
    }
  };

  // Load all positions and departments on component mount
  useEffect(() => {
    console.log('React Position Management System is ready');
    console.log('API Base URL:', API_BASE_URL);
    loadAllPositions();
    loadAllDepartments();
  }, []);

  return (
    <div className="app-container">
      <div className="main-card">
        {/* Header */}
        <div className="header">
          <h1>Positions</h1>
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
                  className="search-input"
                  placeholder="Search position title, level, department, or position ID..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                />
              </div>
            </div>

            {/* Buttons */}
            <button
              onClick={loadAllPositions}
              disabled={loading}
              className="btn btn-primary"
            >
              <History size={20} className="btn-icon" />
              Refresh
            </button>

            {searchInput && (
              <button
                className="btn btn-secondary"
                onClick={() => setSearchInput('')}
              >
                <Trash2 size={20} className="btn-icon" />
                Clear Search
              </button>
            )}

            <button 
              onClick={openAddModal}
              className="btn btn-success"
            >
              <Plus className="btn-icon" />
              Add Position
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

export default PositionManagementSystem;