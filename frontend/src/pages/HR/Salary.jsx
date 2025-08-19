import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Plus, 
  Edit2, 
  Trash2, 
  Save, 
  X, 
  DollarSign, 
  Users, 
  Calculator, 
  TrendingUp,
  Building,
  User,
  RefreshCw,
  CreditCard
} from 'lucide-react';

const SalaryManagement = () => {
  const [salaries, setSalaries] = useState([]);
  const [staffList, setStaffList] = useState([]);
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
    staff_id: '',
    basic_salary: '',
    al_allowance: '',
    sl_allowance: '',
    ml_allowance: '',
    pl_allowance: '',
    cl_deduction: '',
    card_number: '',
    card_name: '',
    bank_name: ''
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

  const [bankOptions] = useState([
    { value: '', label: 'Select Bank' },
    { value: 'hsbc', label: 'HSBC' },
    { value: 'hang_seng_bank', label: 'Hang Seng Bank' },
    { value: 'bank_of_china', label: 'Bank of China' },
    { value: 'standard_chartered', label: 'Standard Chartered' },
    { value: 'citibank', label: 'Citibank' },
    { value: 'dbs_bank', label: 'DBS Bank' },
    { value: 'icbc', label: 'ICBC' },
    { value: 'boc_hong_kong', label: 'BOC Hong Kong' },
    { value: 'china_construction_bank', label: 'China Construction Bank' },
    { value: 'agricultural_bank_of_china', label: 'Agricultural Bank of China' },
    { value: 'other', label: 'Other' }
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

  // Get bank display name
  const getBankDisplayName = (bankValue) => {
    const bank = bankOptions.find(option => option.value === bankValue);
    return bank ? bank.label : bankValue || 'N/A';
  };

  // Format card number for Hong Kong bank account format
  const formatCardNumber = (cardNumber) => {
    if (!cardNumber) return 'N/A';
    return cardNumber;
  };

  // Load staff list
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

  // Get available staff (staff without salary records)
  const getAvailableStaff = () => {
    const usedStaffIds = salaries.map(salary => salary.staff_id);
    return staffList.filter(staff => !usedStaffIds.includes(staff.staff_id));
  };

  // Generate next salary ID
  const generateNextSalaryId = () => {
    if (salaries.length === 0) return 'S1';
    
    const maxId = salaries.reduce((max, salary) => {
      const numPart = parseInt(salary.salary_id.substring(1));
      return numPart > max ? numPart : max;
    }, 0);
    
    return `S${maxId + 1}`;
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

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount || 0);
  };

// Initial data fetch
  useEffect(() => {
    fetchSalaries();
    loadStaffList();
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
        (salary.staff_id && salary.staff_id.toString().includes(searchTerm)) ||
        (salary.card_number && salary.card_number.toLowerCase().includes(searchLower)) ||
        (salary.card_name && salary.card_name.toLowerCase().includes(searchLower)) ||
        (salary.bank_name && salary.bank_name.toLowerCase().includes(searchLower))
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
        await fetchSalaries();
        await loadStaffList();
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
        await fetchSalaries();
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
        await fetchSalaries();
        await loadStaffList();
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
    const nextSalaryId = generateNextSalaryId();
    setFormData({
      salary_id: nextSalaryId,
      staff_id: '',
      basic_salary: '',
      al_allowance: '',
      sl_allowance: '',
      ml_allowance: '',
      pl_allowance: '',
      cl_deduction: '',
      card_number: '',
      card_name: '',
      bank_name: ''
    });
    setShowModal(true);
    loadStaffList();
  };

  const handleEdit = (salary) => {
    setModalMode('edit');
    setError('');
    setEditingId(salary.salary_id);
    setFormData({
      salary_id: salary.salary_id,
      staff_id: salary.staff_id.toString(),
      basic_salary: salary.basic_salary.toString(),
      al_allowance: (salary.al_allowance || 0).toString(),
      sl_allowance: (salary.sl_allowance || 0).toString(),
      ml_allowance: (salary.ml_allowance || 0).toString(),
      pl_allowance: (salary.pl_allowance || 0).toString(),
      cl_deduction: (salary.cl_deduction || 0).toString(),
      card_number: salary.card_number || '',
      card_name: salary.card_name || '',
      bank_name: salary.bank_name || ''
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
    if (!formData.staff_id || !formData.basic_salary) {
      setError('Please fill in all required fields (Staff ID, Basic Salary)');
      return;
    }

    setError('');
    
    const salaryData = {
      staff_id: parseInt(formData.staff_id),
      basic_salary: parseFloat(formData.basic_salary),
      al_allowance: parseFloat(formData.al_allowance || 0),
      sl_allowance: parseFloat(formData.sl_allowance || 0),
      ml_allowance: parseFloat(formData.ml_allowance || 0),
      pl_allowance: parseFloat(formData.pl_allowance || 0),
      cl_deduction: parseFloat(formData.cl_deduction || 0),
      card_number: formData.card_number || null,
      card_name: formData.card_name || null,
      bank_name: formData.bank_name || null
    };

    // Add salary_id for create mode (auto-generated)
    if (modalMode === 'create') {
      salaryData.salary_id = formData.salary_id;
    }

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
                <th>Payroll Card</th>
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
                  <td>
                    <div className="payroll-card-info">
                      {salary.card_number ? (
                        <>
                          <div className="card-number">
                            <CreditCard size={14} style={{ marginRight: '4px' }} />
                            {formatCardNumber(salary.card_number)}
                          </div>
                          <div className="card-details">
                            <div className="card-name">{salary.card_name}</div>
                            <div className="bank-name">{getBankDisplayName(salary.bank_name)}</div>
                          </div>
                        </>
                      ) : (
                        <span className="no-card">No card info</span>
                      )}
                    </div>
                  </td>
                  <td className="actions-cell">
                    <div className="edit-actions">
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
            <div className="stats-grid" style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '1.5rem',
              marginTop: '1rem'
            }}>
              <div className="stat-card" style={{
                display: 'flex',
                alignItems: 'center',
                padding: '1.5rem',
                backgroundColor: '#ffffff',
                borderRadius: '12px',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                border: '1px solid #e5e7eb'
              }}>
                <div className="stat-icon total" style={{
                  backgroundColor: '#10b981',
                  color: 'white',
                  padding: '12px',
                  borderRadius: '8px',
                  marginRight: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <DollarSign size={24} />
                </div>
                <div className="stat-content">
                  <div className="stat-value" style={{
                    fontSize: '1.5rem',
                    fontWeight: '700',
                    color: '#1f2937',
                    marginBottom: '4px'
                  }}>
                    {formatCurrency(stats.totalSalaries)}
                  </div>
                  <div className="stat-label" style={{
                    fontSize: '0.875rem',
                    color: '#6b7280'
                  }}>
                    Total Salaries
                  </div>
                </div>
              </div>

              <div className="stat-card" style={{
                display: 'flex',
                alignItems: 'center',
                padding: '1.5rem',
                backgroundColor: '#ffffff',
                borderRadius: '12px',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                border: '1px solid #e5e7eb'
              }}>
                <div className="stat-icon average" style={{
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  padding: '12px',
                  borderRadius: '8px',
                  marginRight: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Calculator size={24} />
                </div>
                <div className="stat-content">
                  <div className="stat-value" style={{
                    fontSize: '1.5rem',
                    fontWeight: '700',
                    color: '#1f2937',
                    marginBottom: '4px'
                  }}>
                    {formatCurrency(stats.averageSalary)}
                  </div>
                  <div className="stat-label" style={{
                    fontSize: '0.875rem',
                    color: '#6b7280'
                  }}>
                    Average Salary
                  </div>
                </div>
              </div>

              <div className="stat-card" style={{
                display: 'flex',
                alignItems: 'center',
                padding: '1.5rem',
                backgroundColor: '#ffffff',
                borderRadius: '12px',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                border: '1px solid #e5e7eb'
              }}>
                <div className="stat-icon highest" style={{
                  backgroundColor: '#f59e0b',
                  color: 'white',
                  padding: '12px',
                  borderRadius: '8px',
                  marginRight: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <TrendingUp size={24} />
                </div>
                <div className="stat-content">
                  <div className="stat-value" style={{
                    fontSize: '1.5rem',
                    fontWeight: '700',
                    color: '#1f2937',
                    marginBottom: '4px'
                  }}>
                    {formatCurrency(stats.highestSalary)}
                  </div>
                  <div className="stat-label" style={{
                    fontSize: '0.875rem',
                    color: '#6b7280'
                  }}>
                    Highest Salary
                  </div>
                </div>
              </div>

              <div className="stat-card" style={{
                display: 'flex',
                alignItems: 'center',
                padding: '1.5rem',
                backgroundColor: '#ffffff',
                borderRadius: '12px',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                border: '1px solid #e5e7eb'
              }}>
                <div className="stat-icon employees" style={{
                  backgroundColor: '#8b5cf6',
                  color: 'white',
                  padding: '12px',
                  borderRadius: '8px',
                  marginRight: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Users size={24} />
                </div>
                <div className="stat-content">
                  <div className="stat-value" style={{
                    fontSize: '1.5rem',
                    fontWeight: '700',
                    color: '#1f2937',
                    marginBottom: '4px'
                  }}>
                    {stats.totalEmployees}
                  </div>
                  <div className="stat-label" style={{
                    fontSize: '0.875rem',
                    color: '#6b7280'
                  }}>
                    Total Employees
                  </div>
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
                  placeholder="Search by name, staff ID, salary ID, position, or card info..."
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
                    {modalMode === 'create' ? 'Add New Salary' : 'Edit Salary'}
                  </h3>
                  <p>
                    {modalMode === 'create' ? 'Enter salary information for a new employee' :
                     'Update salary information'}
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
                    Salary ID
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.salary_id || ''}
                    disabled={true}
                    placeholder="Auto-generated"
                    style={{ backgroundColor: '#f9fafb', color: '#6b7280' }}
                  />
                  <small style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                    Salary ID is automatically generated
                  </small>
                </div>

                <div className="form-group">
                  <label className="form-label-with-icon">
                    Staff Member <span className="required">*</span>
                  </label>
                  {modalMode === 'create' ? (
                    <>
                      <select
                        className="form-input"
                        value={formData.staff_id}
                        onChange={(e) => setFormData({...formData, staff_id: e.target.value})}
                        disabled={submitting}
                        required
                      >
                        <option value="">Select Staff Member</option>
                        {getAvailableStaff().map(staff => (
                          <option key={staff.staff_id} value={staff.staff_id}>
                            {staff.staff_id} - {staff.name}
                          </option>
                        ))}
                      </select>
                      {getAvailableStaff().length === 0 && (
                        <small style={{ color: '#ef4444', fontSize: '0.875rem' }}>
                          No available staff members (all staff already have salary records)
                        </small>
                      )}
                    </>
                  ) : (
                    <input
                      type="text"
                      className="form-input"
                      value={`${formData.staff_id} - ${salaries.find(s => s.salary_id === editingId)?.staff_name || 'Unknown'}`}
                      disabled={true}
                      style={{ backgroundColor: '#f9fafb', color: '#6b7280' }}
                    />
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label-with-icon">
                    Basic Salary <span className="required">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-input"
                    value={formData.basic_salary}
                    onChange={(e) => setFormData({...formData, basic_salary: e.target.value})}
                    placeholder="e.g., 25000.00"
                    disabled={submitting}
                    required
                  />
                </div>

                {/* Payroll Card Section */}
                <div className="form-section-divider">
                  <CreditCard size={20} />
                  <h4>Payroll Card Information</h4>
                </div>

                <div className="form-group">
                  <label className="form-label-with-icon">
                    Card Number
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.card_number}
                    onChange={(e) => setFormData({...formData, card_number: e.target.value})}
                    placeholder="e.g., 1234567890123456"
                    disabled={submitting}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label-with-icon">
                    Card Name
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.card_name}
                    onChange={(e) => setFormData({...formData, card_name: e.target.value})}
                    placeholder="e.g., John Doe"
                    disabled={submitting}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label-with-icon">
                    Bank Name
                  </label>
                  <select
                    className="form-select"
                    value={formData.bank_name}
                    onChange={(e) => setFormData({...formData, bank_name: e.target.value})}
                    disabled={submitting}
                  >
                    {bankOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
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
                Cancel
              </button>
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
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalaryManagement;