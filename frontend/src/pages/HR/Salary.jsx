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
  RefreshCw,
  Eye,
  EyeOff
} from 'lucide-react';

const SalaryManagement = () => {
  const [salaries, setSalaries] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [filteredSalaries, setFilteredSalaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [modalMode, setModalMode] = useState('create');
  const [showStats, setShowStats] = useState(true);
  
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
    allowance: '',
    deduction: '',
    bank_name: '',
    bank_account: ''
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

  const showSuccess = (message) => {
    setSuccessMessage(message);
    setError('');
    setTimeout(() => setSuccessMessage(''), 5000);
  };

  const getBankDisplayName = (bankValue) => {
    const bank = bankOptions.find(option => option.value === bankValue);
    return bank ? bank.label : bankValue || 'N/A';
  };

  const formatCardNumber = (cardNumber) => {
    if (!cardNumber) return 'N/A';
    return cardNumber;
  };

  const loadStaffList = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/staff`);
      const data = await response.json();
      if (data.success) {
        setStaffList(data.data);
      }
    } catch (error) {
      console.error('Error loading staff list:', error);
    }
  };

  const getAvailableStaff = () => {
    const usedStaffIds = salaries.map(salary => salary.staff_id);
    return staffList.filter(staff => !usedStaffIds.includes(staff.staff_id));
  };

  const fetchSalaries = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await fetch(`${API_BASE_URL}/salaries`);
      const data = await response.json();
      if (data.success && data.data) {
        setSalaries(data.data);
        setFilteredSalaries(data.data);
        calculateStatistics(data.data);
      } else {
        throw new Error(data.message || 'Failed to fetch salary data');
      }
    } catch (error) {
      setError(`Failed to load salary data: ${error.message}`);
      setSalaries([]);
      setFilteredSalaries([]);
      setStats({ totalSalaries: 0, averageSalary: 0, highestSalary: 0, totalEmployees: 0 });
    } finally {
      setLoading(false);
    }
  };

  const calculateStatistics = (salaryData) => {
    if (!salaryData || salaryData.length === 0) {
      setStats({ totalSalaries: 0, averageSalary: 0, highestSalary: 0, totalEmployees: 0 });
      return;
    }

    const totalSalaries = salaryData.reduce((sum, salary) => sum + (parseFloat(salary.total_salary) || 0), 0);
    const averageSalary = totalSalaries / salaryData.length;
    const highestSalary = Math.max(...salaryData.map(s => parseFloat(s.total_salary) || 0));
    
    setStats({
      totalSalaries,
      averageSalary,
      highestSalary,
      totalEmployees: salaryData.length
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount || 0);
  };

  useEffect(() => {
    fetchSalaries();
    loadStaffList();
  }, []);

  useEffect(() => {
    let filtered = salaries;

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(salary =>
        (salary.staff_name && salary.staff_name.toLowerCase().includes(searchLower)) ||
        (salary.salary_id && salary.salary_id.toString().includes(searchTerm)) ||
        (salary.position_title && salary.position_title.toLowerCase().includes(searchLower)) ||
        (salary.staff_id && salary.staff_id.toString().includes(searchTerm)) ||
        (salary.card_number && salary.card_number.toLowerCase().includes(searchLower)) ||
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

  const clearSearch = () => {
    setSearchTerm('');
    setSelectedDepartment('all');
  };

  const createSalary = async (salaryData) => {
    try {
      setSubmitting(true);
      const response = await fetch(`${API_BASE_URL}/salaries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(salaryData),
      });
      const data = await response.json();
      if (data.success) {
        await fetchSalaries();
        await loadStaffList();
        return { success: true, message: 'Salary created successfully' };
      } else {
        throw new Error(data.message || 'Failed to create salary');
      }
    } catch (error) {
      return { success: false, message: error.message };
    } finally {
      setSubmitting(false);
    }
  };

  const updateSalary = async (salaryId, salaryData) => {
    try {
      setSubmitting(true);
      const response = await fetch(`${API_BASE_URL}/salaries/${salaryId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(salaryData),
      });
      const data = await response.json();
      if (data.success) {
        await fetchSalaries();
        return { success: true, message: 'Salary updated successfully' };
      } else {
        throw new Error(data.message || 'Failed to update salary');
      }
    } catch (error) {
      return { success: false, message: error.message };
    } finally {
      setSubmitting(false);
    }
  };

  const deleteSalary = async (salaryId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/salaries/${salaryId}`, { method: 'DELETE' });
      const data = await response.json();
      if (data.success) {
        await fetchSalaries();
        await loadStaffList();
        return { success: true, message: 'Salary deleted successfully' };
      } else {
        throw new Error(data.message || 'Failed to delete salary');
      }
    } catch (error) {
      return { success: false, message: error.message };
    }
  };

  const handleCreate = () => {
    setModalMode('create');
    setError('');
    setFormData({
      staff_id: '',
      basic_salary: '',
      allowance: '',
      deduction: '',
      bank_name: '',
      bank_account: ''
    });
    setShowModal(true);
    loadStaffList();
  };

  const handleEdit = (salary) => {
    setModalMode('edit');
    setError('');
    setEditingId(salary.structure_id);
    setFormData({
      staff_id: salary.staff_id.toString(),
      basic_salary: salary.basic_salary?.toString() || '',
      allowance: salary.allowance?.toString() || '',
      deduction: salary.deduction?.toString() || '',
      bank_name: salary.bank_name || '',
      bank_account: salary.bank_account || ''
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
    if (!formData.staff_id || !formData.basic_salary) {
      setError('Please fill in all required fields (Staff ID, Basic Salary)');
      return;
    }
    setError('');
    const salaryData = {
      staff_id: parseInt(formData.staff_id),
      basic_salary: parseFloat(formData.basic_salary),
      allowance: parseFloat(formData.allowance || 0),
      deduction: parseFloat(formData.deduction || 0),
      bank_name: formData.bank_name || null,
      bank_account: formData.bank_account || null
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

  if (loading) {
    return (
      <div className="app-container">
        <div className="main-card">
          <div className="loading-state">
            <div>Loading salary data...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Header */}
      <div className="main-card">
        <div className="header">
          <div>
            <h1>Salary Management</h1>
            <p>Manage employee salaries, allowances, and payment information</p>
          </div>
        </div>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="main-card">
          <div className="content">
            <div style={{ 
              background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
              border: '1px solid #86efac',
              color: '#16a34a',
              padding: '1rem 1.5rem',
              borderRadius: '12px',
              fontWeight: '500'
            }}>
              {successMessage}
            </div>
          </div>
        </div>
      )}

      {/* Statistics Dashboard */}
      {showStats && (
        <div className="main-card">
          <div className="salary-stats-dashboard">
            <div className="stats-header">
              <h3>
                <Calculator size={24} />
                Salary Statistics
              </h3>
              <button 
                className="stats-toggle-btn"
                onClick={() => setShowStats(false)}
                title="Hide Statistics"
              >
                <EyeOff size={16} />
              </button>
            </div>
            <div className="stats-grid">
              <div className="stat-card stat-green">
                <div className="stat-icon total">
                  <DollarSign size={20} />
                </div>
                <div className="stat-content">
                  <div className="stat-value">{formatCurrency(stats.totalSalaries)}</div>
                  <div className="stat-label">Total Salaries</div>
                </div>
              </div>
              <div className="stat-card stat-blue">
                <div className="stat-icon average">
                  <TrendingUp size={20} />
                </div>
                <div className="stat-content">
                  <div className="stat-value">{formatCurrency(stats.averageSalary)}</div>
                  <div className="stat-label">Average Salary</div>
                </div>
              </div>
              <div className="stat-card stat-orange">
                <div className="stat-icon highest">
                  <Calculator size={20} />
                </div>
                <div className="stat-content">
                  <div className="stat-value">{formatCurrency(stats.highestSalary)}</div>
                  <div className="stat-label">Highest Salary</div>
                </div>
              </div>
              <div className="stat-card stat-purple">
                <div className="stat-icon employees">
                  <Users size={20} />
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

      {/* Controls */}
      <div className="main-card">
        <div className="controls">
          <div className="controls-wrapper">
            {/* Search */}
            <div className="search-container">
              <div className="search-input-wrapper">
                <Search className="search-icon" size={20} />
                <input
                  type="text"
                  className="search-input"
                  placeholder="Search by employee name, ID, position, or bank details..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {/* Department Filter */}
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

            {/* Actions */}
            <button className="btn btn-primary" onClick={handleCreate}>
              <Plus className="btn-icon" />
              Add Salary
            </button>

            {(searchTerm || selectedDepartment !== 'all') && (
              <button className="btn btn-secondary" onClick={clearSearch}>
                <X className="btn-icon" />
                Clear
              </button>
            )}

            {!showStats && (
              <button 
                className="btn btn-success"
                onClick={() => setShowStats(true)}
                title="Show Statistics"
              >
                <Eye className="btn-icon" />
                Stats
              </button>
            )}

            <button className="btn btn-secondary" onClick={fetchSalaries}>
              <RefreshCw className="btn-icon" />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="main-card">
        <div className="content">
          <h2 className="result-title">
            Salary Records ({filteredSalaries.length})
          </h2>

          {error && <div className="error-message">{error}</div>}

          {filteredSalaries.length === 0 ? (
            <div className="empty-state">
              <h3>No salary records found</h3>
              <p>
                {searchTerm || selectedDepartment !== 'all' 
                  ? 'Try adjusting your search criteria or clear the filters.'
                  : 'Get started by adding your first salary record.'}
              </p>
            </div>
          ) : (
            <div className="table-container">
              <table className="staff-table">
                <thead className="table-header">
                  <tr>
                    <th>Record ID</th>
                    <th>Employee</th>
                    <th>Basic Salary</th>
                    <th>Allowance</th>
                    <th>Deduction</th>
                    <th>Total Salary</th>
                    <th>Bank Details</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSalaries.map(salary => (
                    <tr key={salary.structure_id} className="table-row">
                      <td>
                        <span className="staff-id">#{salary.structure_id}</span>
                      </td>
                      <td>
                        <div className="employee-info">
                          <div className="employee-name">{salary.staff_name}</div>
                          <div className="employee-id">ID: {salary.staff_id}</div>
                        </div>
                      </td>
                      <td>
                        <span className="salary-amount basic">
                          {formatCurrency(salary.basic_salary)}
                        </span>
                      </td>
                      <td>
                        <span className="salary-amount">
                          {formatCurrency(salary.allowance)}
                        </span>
                      </td>
                      <td>
                        <span className="salary-amount deduction">
                          {formatCurrency(salary.deduction)}
                        </span>
                      </td>
                      <td>
                        <span className="salary-amount total">
                          {formatCurrency(salary.total_salary)}
                        </span>
                      </td>
                      <td>
                        <div className="bank-info">
                          <div className="bank-name">
                            {getBankDisplayName(salary.bank_name)}
                          </div>
                          {salary.bank_account && (
                            <div style={{ fontSize: '0.75rem', color: '#6b7280', fontFamily: 'monospace' }}>
                              {salary.bank_account}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="actions-cell">
                        <button 
                          className="action-btn edit-btn"
                          onClick={() => handleEdit(salary)}
                          title="Edit Salary"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          className="action-btn cancel-btn"
                          onClick={() => handleDelete(salary.structure_id)}
                          title="Delete Salary"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
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
                    <DollarSign size={24} />
                    {modalMode === 'create' ? 'Add New Salary' : 'Edit Salary'}
                  </h3>
                  <p>
                    {modalMode === 'create' 
                      ? 'Enter the salary details for the selected employee'
                      : 'Update the salary information and payment details'
                    }
                  </p>
                </div>
                <button 
                  className="close-btn" 
                  onClick={() => setShowModal(false)}
                  disabled={submitting}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="modal-body">
              {error && <div className="error-message">{error}</div>}
              
              <div className="salary-form-grid">
                {/* Staff Selection */}
                {modalMode === 'create' && (
                  <div className="form-group">
                    <label className="form-label-with-icon">
                      <Users size={16} />
                      Employee <span className="required">*</span>
                    </label>
                    <select
                      className={`form-select ${!formData.staff_id && error ? 'error' : ''}`}
                      value={formData.staff_id}
                      onChange={(e) => setFormData({...formData, staff_id: e.target.value})}
                    >
                      <option value="">Select Employee</option>
                      {getAvailableStaff().map(staff => (
                        <option key={staff.staff_id} value={staff.staff_id}>
                          {staff.staff_name} (ID: {staff.staff_id})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Basic Salary */}
                <div className="form-group">
                  <label className="form-label-with-icon">
                    <DollarSign size={16} />
                    Basic Salary <span className="required">*</span>
                  </label>
                  <input 
                    type="number" 
                    className={`form-input ${!formData.basic_salary && error ? 'error' : ''}`}
                    placeholder="Enter basic salary amount"
                    value={formData.basic_salary}
                    onChange={(e) => setFormData({...formData, basic_salary: e.target.value})}
                    min="0"
                    step="0.01"
                  />
                </div>

                {/* Allowance */}
                <div className="form-group">
                  <label className="form-label-with-icon">
                    <TrendingUp size={16} />
                    Allowance
                  </label>
                  <input 
                    type="number" 
                    className="form-input"
                    placeholder="Enter allowance amount"
                    value={formData.allowance}
                    onChange={(e) => setFormData({...formData, allowance: e.target.value})}
                    min="0"
                    step="0.01"
                  />
                </div>

                {/* Deduction */}
                <div className="form-group">
                  <label className="form-label-with-icon">
                    <Calculator size={16} />
                    Deduction
                  </label>
                  <input 
                    type="number" 
                    className="form-input"
                    placeholder="Enter deduction amount"
                    value={formData.deduction}
                    onChange={(e) => setFormData({...formData, deduction: e.target.value})}
                    min="0"
                    step="0.01"
                  />
                </div>

                {/* Bank Name */}
                <div className="form-group">
                  <label className="form-label-with-icon">
                    <DollarSign size={16} />
                    Bank Name
                  </label>
                  <select
                    className="form-select"
                    value={formData.bank_name}
                    onChange={(e) => setFormData({...formData, bank_name: e.target.value})}
                  >
                    {bankOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                {/* Bank Account */}
                <div className="form-group">
                  <label className="form-label-with-icon">
                    <DollarSign size={16} />
                    Bank Account
                  </label>
                  <input 
                    type="text" 
                    className="form-input"
                    placeholder="Enter bank account number"
                    value={formData.bank_account}
                    onChange={(e) => setFormData({...formData, bank_account: e.target.value})}
                  />
                </div>
              </div>

              {/* Salary Summary Preview */}
              {(formData.basic_salary || formData.allowance || formData.deduction) && (
                <div className="salary-summary">
                  <h4>Salary Calculation Preview</h4>
                  <div className="summary-grid">
                    <div className="summary-item">
                      <span>Basic Salary:</span>
                      <span>{formatCurrency(parseFloat(formData.basic_salary) || 0)}</span>
                    </div>
                    <div className="summary-item">
                      <span>Allowance:</span>
                      <span>{formatCurrency(parseFloat(formData.allowance) || 0)}</span>
                    </div>
                    <div className="summary-item">
                      <span>Deduction:</span>
                      <span>-{formatCurrency(parseFloat(formData.deduction) || 0)}</span>
                    </div>
                    <div className="summary-item total">
                      <span>Total Salary:</span>
                      <span>
                        {formatCurrency(
                          (parseFloat(formData.basic_salary) || 0) +
                          (parseFloat(formData.allowance) || 0) -
                          (parseFloat(formData.deduction) || 0)
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="info-box">
                <small>
                  <strong>Note:</strong> All salary amounts will be calculated automatically. 
                  Please ensure all banking information is accurate for payroll processing.
                </small>
              </div>
            </div>

            <div className="modal-footer">
              <button 
                className="btn btn-secondary"
                onClick={() => setShowModal(false)}
                disabled={submitting}
              >
                <X className="btn-icon" />
                Cancel
              </button>
              <button 
                className="btn btn-primary"
                onClick={handleSubmit} 
                disabled={submitting}
              >
                <Save className="btn-icon" />
                {submitting 
                  ? 'Processing...' 
                  : modalMode === 'create' ? 'Create Salary' : 'Update Salary'
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalaryManagement;