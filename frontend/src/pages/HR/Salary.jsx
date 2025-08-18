import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Plus, 
  Edit2, 
  Trash2, 
  Save, 
  X, 
  Eye, 
  DollarSign, 
  Users, 
  Calculator, 
  TrendingUp,
  Building,
  User,
  RefreshCw
} from 'lucide-react';

const SalaryManagement = () => {
  const [salaries, setSalaries] = useState([]);
  const [filteredSalaries, setFilteredSalaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [modalMode, setModalMode] = useState('create');
  const [showStats, setShowStats] = useState(true);
  const [successMessage, setSuccessMessage] = useState('');
  
  // Statistics state
  const [stats, setStats] = useState({
    totalSalaries: 0,
    averageSalary: 0,
    highestSalary: 0,
    totalEmployees: 0
  });

  const [formData, setFormData] = useState({
    salary_id: '',
    staff_id: '',
    position_id: '',
    basic_salary: '',
    al_allowance: '',
    sl_allowance: '',
    ml_allowance: '',
    pl_allowance: '',
    cl_deduction: ''
  });

  const [departments] = useState([
    { id: 'all', name: 'All Departments' },
    { id: 'IT', name: 'IT Department' },
    { id: 'HR', name: 'HR Department' },
    { id: 'Finance', name: 'Finance Department' },
    { id: 'Marketing', name: 'Marketing Department' },
    { id: 'Operations', name: 'Operations Department' },
    { id: 'Sales', name: 'Sales Department' },
    { id: 'Customer Service', name: 'Customer Service Department' }
  ]);

  // API
  const getApiUrl = () => {
    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
      return 'http://localhost:3001';
    }
    return import.meta.env.VITE_API_URL || 'http://localhost:3001';
  };

  const API_BASE_URL = `${getApiUrl()}/api`;

  // Show success message
  const showSuccess = (message) => {
    setSuccessMessage(message);
    setError('');
    setTimeout(() => setSuccessMessage(''), 5000);
  };

  // Fetch salaries from API
  const fetchSalaries = async () => {
    try {
      setLoading(true);
      setError('');
      
      console.log('Fetching salaries from API...');
      const response = await fetch(`${API_BASE_URL}/salaries`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('API Response:', data);
      
      if (data.success && data.data) {
        setSalaries(data.data);
        setFilteredSalaries(data.data);
        calculateStatistics(data.data);
      } else {
        throw new Error(data.message || 'Failed to fetch salary data');
      }
      
    } catch (error) {
      console.error('Error fetching salaries:', error);
      setError(`Failed to load salary data: ${error.message}`);
      setSalaries([]);
      setFilteredSalaries([]);
      setStats({ totalSalaries: 0, averageSalary: 0, highestSalary: 0, totalEmployees: 0 });
    } finally {
      setLoading(false);
    }
  };

  // Calculate statistics
  const calculateStatistics = (salaryData) => {
    if (!salaryData || salaryData.length === 0) {
      setStats({ totalSalaries: 0, averageSalary: 0, highestSalary: 0, totalEmployees: 0 });
      return;
    }

    const totalSalaries = salaryData.reduce((sum, salary) => sum + (parseFloat(salary.total_salary) || 0), 0);
    const averageSalary = totalSalaries / salaryData.length;
    const highestSalary = Math.max(...salaryData.map(s => parseFloat(s.total_salary) || 0));
    
    setStats({
      totalSalaries: totalSalaries,
      averageSalary: averageSalary,
      highestSalary: highestSalary,
      totalEmployees: salaryData.length
    });
  };

  // Initial data fetch
  useEffect(() => {
    fetchSalaries();
  }, []);

  // Enhanced filter salaries with unified search logic
  useEffect(() => {
    let filtered = salaries;

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(salary =>
        (salary.staff_name && salary.staff_name.toLowerCase().includes(searchLower)) ||
        (salary.salary_id && salary.salary_id.toLowerCase().includes(searchLower)) ||
        (salary.position_title && salary.position_title.toLowerCase().includes(searchLower)) ||
        (salary.staff_id && salary.staff_id.toString().includes(searchTerm))
      );
    }

    if (selectedDepartment && selectedDepartment !== 'all') {
      filtered = filtered.filter(salary =>
        salary.position_title && salary.position_title.toLowerCase().includes(selectedDepartment.toLowerCase())
      );
    }

    setFilteredSalaries(filtered);
  }, [searchTerm, selectedDepartment, salaries]);

  // Clear search
  const clearSearch = () => {
    setSearchTerm('');
    setSelectedDepartment('all');
  };

  // Check if any search filters are active
  const hasActiveSearch = () => {
    return searchTerm || selectedDepartment !== 'all';
  };

  // Create new salary
  const createSalary = async (salaryData) => {
    try {
      setSubmitting(true);
      console.log('Creating salary:', salaryData);
      
      const response = await fetch(`${API_BASE_URL}/salaries`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(salaryData),
      });

      const data = await response.json();
      console.log('Create response:', data);
      
      if (data.success) {
        await fetchSalaries(); // Refresh data
        return { success: true, message: 'Salary created successfully' };
      } else {
        throw new Error(data.message || 'Failed to create salary');
      }
    } catch (error) {
      console.error('Error creating salary:', error);
      return { success: false, message: error.message };
    } finally {
      setSubmitting(false);
    }
  };

  // Update existing salary
  const updateSalary = async (salaryId, salaryData) => {
    try {
      setSubmitting(true);
      console.log('Updating salary:', salaryId, salaryData);
      
      const response = await fetch(`${API_BASE_URL}/salaries/${salaryId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(salaryData),
      });

      const data = await response.json();
      console.log('Update response:', data);
      
      if (data.success) {
        await fetchSalaries(); // Refresh data
        return { success: true, message: 'Salary updated successfully' };
      } else {
        throw new Error(data.message || 'Failed to update salary');
      }
    } catch (error) {
      console.error('Error updating salary:', error);
      return { success: false, message: error.message };
    } finally {
      setSubmitting(false);
    }
  };

  // Delete salary
  const deleteSalary = async (salaryId) => {
    try {
      console.log('Deleting salary:', salaryId);
      
      const response = await fetch(`${API_BASE_URL}/salaries/${salaryId}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      console.log('Delete response:', data);
      
      if (data.success) {
        await fetchSalaries(); // Refresh data
        return { success: true, message: 'Salary deleted successfully' };
      } else {
        throw new Error(data.message || 'Failed to delete salary');
      }
    } catch (error) {
      console.error('Error deleting salary:', error);
      return { success: false, message: error.message };
    }
  };

  const handleCreate = () => {
    setModalMode('create');
    setError('');
    setFormData({
      salary_id: '',
      staff_id: '',
      position_id: '',
      basic_salary: '',
      al_allowance: '',
      sl_allowance: '',
      ml_allowance: '',
      pl_allowance: '',
      cl_deduction: ''
    });
    setShowModal(true);
  };

  const handleEdit = (salary) => {
    setModalMode('edit');
    setError('');
    setEditingId(salary.salary_id);
    setFormData({
      salary_id: salary.salary_id,
      staff_id: salary.staff_id.toString(),
      position_id: salary.position_id.toString(),
      basic_salary: salary.basic_salary.toString(),
      al_allowance: (salary.al_allowance || 0).toString(),
      sl_allowance: (salary.sl_allowance || 0).toString(),
      ml_allowance: (salary.ml_allowance || 0).toString(),
      pl_allowance: (salary.pl_allowance || 0).toString(),
      cl_deduction: (salary.cl_deduction || 0).toString()
    });
    setShowModal(true);
  };

  const handleView = (salary) => {
    setModalMode('view');
    setError('');
    setFormData({
      salary_id: salary.salary_id,
      staff_id: salary.staff_id.toString(),
      position_id: salary.position_id.toString(),
      basic_salary: salary.basic_salary.toString(),
      al_allowance: (salary.al_allowance || 0).toString(),
      sl_allowance: (salary.sl_allowance || 0).toString(),
      ml_allowance: (salary.ml_allowance || 0).toString(),
      pl_allowance: (salary.pl_allowance || 0).toString(),
      cl_deduction: (salary.cl_deduction || 0).toString()
    });
    setShowModal(true);
  };

  const handleDelete = async (salaryId) => {
    if (window.confirm('Are you sure you want to delete this salary record?')) {
      const result = await deleteSalary(salaryId);
      if (result.success) {
        showSuccess('Salary deleted successfully');
      } else {
        setError(result.message);
      }
    }
  };

  const handleSubmit = async () => {
    // Basic validation
    if (!formData.salary_id || !formData.staff_id || !formData.position_id || !formData.basic_salary) {
      setError('Please fill in all required fields (Salary ID, Staff ID, Position ID, Basic Salary)');
      return;
    }

    setError('');
    
    const salaryData = {
      salary_id: formData.salary_id,
      staff_id: parseInt(formData.staff_id),
      position_id: parseInt(formData.position_id),
      basic_salary: parseFloat(formData.basic_salary),
      al_allowance: parseFloat(formData.al_allowance || 0),
      sl_allowance: parseFloat(formData.sl_allowance || 0),
      ml_allowance: parseFloat(formData.ml_allowance || 0),
      pl_allowance: parseFloat(formData.pl_allowance || 0),
      cl_deduction: parseFloat(formData.cl_deduction || 0)
    };

    let result;
    if (modalMode === 'create') {
      result = await createSalary(salaryData);
    } else if (modalMode === 'edit') {
      result = await updateSalary(editingId, salaryData);
    }

    if (result && result.success) {
      setShowModal(false);
      setEditingId(null);
      showSuccess(result.message);
    } else if (result) {
      setError(result.message);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount || 0);
  };

  // Render content area
  const renderContent = () => {
    if (loading) {
      return (
        <div className="loading-state">
          <div>Loading salary data...</div>
        </div>
      );
    }

    if (error && !filteredSalaries.length) {
      return (
        <div className="error-message">
          {error}
          {error.includes('Failed to load') && (
            <button 
              className="btn btn-primary" 
              onClick={fetchSalaries}
              style={{ marginLeft: '10px' }}
            >
              Retry
            </button>
          )}
        </div>
      );
    }

    if (filteredSalaries.length === 0 && !loading) {
      return (
        <div className="empty-state">
          <h3>No salary records found</h3>
          <p>
            {hasActiveSearch() ? 
             'No results match your search criteria.' : 
             'Start by adding salary information for your employees.'}
          </p>
        </div>
      );
    }

    return (
      <div>
        <h2 className="result-title" style={{ marginBottom: '2rem' }}>
          Salary Records ({filteredSalaries.length})
        </h2>
        
        <div className="table-container">
          <table className="staff-table">
            <thead className="table-header">
              <tr>
                <th>Salary ID</th>
                <th>Employee</th>
                <th>Position</th>
                <th>Basic Salary</th>
                <th>Allowances</th>
                <th>Deductions</th>
                <th>Total Salary</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSalaries.map((salary) => (
                <tr key={salary.salary_id} className="table-row">
                  <td>
                    <span className="staff-id">{salary.salary_id}</span>
                  </td>
                  <td>
                    <div className="employee-info">
                      <div className="employee-name">{salary.staff_name || 'N/A'}</div>
                      <div className="employee-id">ID: {salary.staff_id}</div>
                    </div>
                  </td>
                  <td>
                    <span className="position-badge">{salary.position_title || 'N/A'}</span>
                  </td>
                  <td>
                    <span className="salary-amount basic">
                      {formatCurrency(salary.basic_salary)}
                    </span>
                  </td>
                  <td>
                    <div className="allowances-breakdown">
                      <div className="allowance-item">
                        AL: {formatCurrency(salary.al_allowance)}
                      </div>
                      <div className="allowance-item">
                        SL: {formatCurrency(salary.sl_allowance)}
                      </div>
                      {(salary.ml_allowance > 0) && (
                        <div className="allowance-item">
                          ML: {formatCurrency(salary.ml_allowance)}
                        </div>
                      )}
                      {(salary.pl_allowance > 0) && (
                        <div className="allowance-item">
                          PL: {formatCurrency(salary.pl_allowance)}
                        </div>
                      )}
                    </div>
                  </td>
                  <td>
                    <span className="salary-amount deduction">
                      {formatCurrency(salary.cl_deduction)}
                    </span>
                  </td>
                  <td>
                    <span className="salary-amount total">
                      {formatCurrency(salary.total_salary)}
                    </span>
                  </td>
                  <td className="actions-cell">
                    <div className="edit-actions">
                      <button
                        className="action-btn edit-btn"
                        onClick={() => handleView(salary)}
                        title="View Details"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        className="action-btn edit-btn"
                        onClick={() => handleEdit(salary)}
                        title="Edit Salary"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        className="action-btn cancel-btn"
                        onClick={() => handleDelete(salary.salary_id)}
                        title="Delete Salary"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="app-container">
      {/* Header */}
      <div className="main-card">
        <div className="header">
          <h1>Salary Management</h1>
        </div>
      </div>

      <div className="divider" />

      {/* Statistics Dashboard */}
      {showStats && (
        <div className="main-card">
          <div className="salary-stats-dashboard">
            <div className="stats-header">
              <h3>Salary Statistics</h3>
              <button 
                className="stats-toggle-btn"
                onClick={() => setShowStats(false)}
              >
                <X size={16} />
              </button>
            </div>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon total">
                  <DollarSign size={24} />
                </div>
                <div className="stat-content">
                  <div className="stat-value">{formatCurrency(stats.totalSalaries)}</div>
                  <div className="stat-label">Total Salaries</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon average">
                  <Calculator size={24} />
                </div>
                <div className="stat-content">
                  <div className="stat-value">{formatCurrency(stats.averageSalary)}</div>
                  <div className="stat-label">Average Salary</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon highest">
                  <TrendingUp size={24} />
                </div>
                <div className="stat-content">
                  <div className="stat-value">{formatCurrency(stats.highestSalary)}</div>
                  <div className="stat-label">Highest Salary</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon employees">
                  <Users size={24} />
                </div>
                <div className="stat-content">
                  <div className="stat-value">{stats.totalEmployees}</div>
                  <div className="stat-label">Total Employees</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Controls and Content */}
      <div className="main-card">
        {/* Controls */}
        <div className="controls">
          <div className="controls-wrapper">
            <div className="search-container">
              <div className="search-input-wrapper">
                <Search className="search-icon" size={20} />
                <input
                  type="text"
                  placeholder="Search by name, staff ID, salary ID, or position..."
                  className="search-input"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            
            <div className="filter-container">
              <select
                className="form-select"
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
              >
                {departments.map(dept => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>

            <button className="btn btn-primary" onClick={handleCreate}>
              <Plus className="btn-icon" size={18} />
              Add Salary
            </button>

            <button 
              className="btn btn-secondary"
              onClick={fetchSalaries}
              disabled={loading}
            >
              <RefreshCw className="btn-icon" size={18} />
              Refresh
            </button>

            {hasActiveSearch() && (
              <button 
                className="btn btn-secondary"
                onClick={clearSearch}
              >
                <Trash2 className="btn-icon" size={18} />
                Clear Search
              </button>
            )}

            {!showStats && (
              <button 
                className="btn btn-secondary"
                onClick={() => setShowStats(true)}
              >
                <TrendingUp className="btn-icon" size={18} />
                Show Stats
              </button>
            )}
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

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content modal-large">
            <div className="modal-header">
              <div className="modal-header-content">
                <div className="modal-title-section">
                  <h3 className="modal-title-with-icon">
                    <DollarSign size={20} />
                    {modalMode === 'create' ? 'Add New Salary' : 
                     modalMode === 'edit' ? 'Edit Salary' : 'View Salary Details'}
                  </h3>
                  <p>
                    {modalMode === 'create' ? 'Enter salary information for a new employee' :
                     modalMode === 'edit' ? 'Update salary information' : 
                     'View detailed salary breakdown'}
                  </p>
                </div>
                <button 
                  className="close-btn" 
                  onClick={() => {
                    setShowModal(false);
                    setError('');
                  }}
                  disabled={submitting}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="modal-body">
              {error && (
                <div className="error-message">
                  {error}
                </div>
              )}
              
              <div className="salary-form-grid">
                <div className="form-group">
                  <label className="form-label-with-icon">
                    <User size={16} />
                    Salary ID <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.salary_id}
                    onChange={(e) => setFormData({...formData, salary_id: e.target.value})}
                    placeholder="e.g., S1023"
                    disabled={modalMode !== 'create' || submitting}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label-with-icon">
                    <User size={16} />
                    Staff ID <span className="required">*</span>
                  </label>
                  <input
                    type="number"
                    className="form-input"
                    value={formData.staff_id}
                    onChange={(e) => setFormData({...formData, staff_id: e.target.value})}
                    placeholder="e.g., 100023"
                    disabled={modalMode === 'view' || submitting}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label-with-icon">
                    <Building size={16} />
                    Position ID <span className="required">*</span>
                  </label>
                  <input
                    type="number"
                    className="form-input"
                    value={formData.position_id}
                    onChange={(e) => setFormData({...formData, position_id: e.target.value})}
                    placeholder="e.g., 203"
                    disabled={modalMode === 'view' || submitting}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label-with-icon">
                    <DollarSign size={16} />
                    Basic Salary <span className="required">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-input"
                    value={formData.basic_salary}
                    onChange={(e) => setFormData({...formData, basic_salary: e.target.value})}
                    placeholder="e.g., 25000.00"
                    disabled={modalMode === 'view' || submitting}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label-with-icon">
                    <Calculator size={16} />
                    Annual Leave Allowance
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-input"
                    value={formData.al_allowance}
                    onChange={(e) => setFormData({...formData, al_allowance: e.target.value})}
                    placeholder="e.g., 1136.36"
                    disabled={modalMode === 'view' || submitting}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label-with-icon">
                    <Calculator size={16} />
                    Sick Leave Allowance
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-input"
                    value={formData.sl_allowance}
                    onChange={(e) => setFormData({...formData, sl_allowance: e.target.value})}
                    placeholder="e.g., 909.09"
                    disabled={modalMode === 'view' || submitting}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label-with-icon">
                    <Calculator size={16} />
                    Maternity Leave Allowance
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-input"
                    value={formData.ml_allowance}
                    onChange={(e) => setFormData({...formData, ml_allowance: e.target.value})}
                    placeholder="e.g., 909.09"
                    disabled={modalMode === 'view' || submitting}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label-with-icon">
                    <Calculator size={16} />
                    Personal Leave Allowance
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-input"
                    value={formData.pl_allowance}
                    onChange={(e) => setFormData({...formData, pl_allowance: e.target.value})}
                    placeholder="e.g., 0.00"
                    disabled={modalMode === 'view' || submitting}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label-with-icon">
                    <Calculator size={16} />
                    Casual Leave Deduction
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-input"
                    value={formData.cl_deduction}
                    onChange={(e) => setFormData({...formData, cl_deduction: e.target.value})}
                    placeholder="e.g., 1136.36"
                    disabled={modalMode === 'view' || submitting}
                  />
                </div>
              </div>

              {modalMode !== 'view' && (
                <div className="info-box">
                  <strong>Note:</strong> Daily rates are typically calculated from basic salary divided by 22 working days. 
                  Allowances are usually 80% of the daily rate unless specified otherwise.
                </div>
              )}

              {modalMode === 'view' && (
                <div className="salary-summary">
                  <h4>Salary Breakdown</h4>
                  <div className="summary-grid">
                    <div className="summary-item">
                      <span>Basic Salary:</span>
                      <span>{formatCurrency(parseFloat(formData.basic_salary || 0))}</span>
                    </div>
                    <div className="summary-item">
                      <span>Total Allowances:</span>
                      <span>{formatCurrency(
                        parseFloat(formData.al_allowance || 0) +
                        parseFloat(formData.sl_allowance || 0) +
                        parseFloat(formData.ml_allowance || 0) +
                        parseFloat(formData.pl_allowance || 0)
                      )}</span>
                    </div>
                    <div className="summary-item">
                      <span>Total Deductions:</span>
                      <span>{formatCurrency(parseFloat(formData.cl_deduction || 0))}</span>
                    </div>
                    <div className="summary-item total">
                      <span>Net Salary:</span>
                      <span>{formatCurrency(
                        parseFloat(formData.basic_salary || 0) +
                        parseFloat(formData.al_allowance || 0) +
                        parseFloat(formData.sl_allowance || 0) +
                        parseFloat(formData.ml_allowance || 0) +
                        parseFloat(formData.pl_allowance || 0) -
                        parseFloat(formData.cl_deduction || 0)
                      )}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => {
                  setShowModal(false);
                  setError('');
                }}
                disabled={submitting}
              >
                {modalMode === 'view' ? 'Close' : 'Cancel'}
              </button>
              {modalMode !== 'view' && (
                <button 
                  type="button" 
                  className="btn btn-primary"
                  onClick={handleSubmit}
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="btn-icon" size={16} style={{animation: 'spin 1s linear infinite'}} />
                      {modalMode === 'create' ? 'Creating...' : 'Updating...'}
                    </>
                  ) : (
                    <>
                      <Save className="btn-icon" size={16} />
                      {modalMode === 'create' ? 'Create Salary' : 'Update Salary'}
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalaryManagement;