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
  EyeOff,
  Clock,
  History,
  FileText,
  Calendar,
  CheckCircle,
  AlertCircle,
  Circle
} from 'lucide-react';

const PayrollManagement = () => {
  const [payrolls, setPayrolls] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [filteredPayrolls, setFilteredPayrolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [modalMode, setModalMode] = useState('create');
  const [showStats, setShowStats] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Statistics state
  const [stats, setStats] = useState({
    totalPayrolls: 0,
    totalAmount: 0,
    avgAmount: 0,
    confirmedCount: 0
  });

  const [formData, setFormData] = useState({
    staff_id: '',
    period_start: '',
    period_end: '',
    status: 'draft',
    details: [
      { component_name: 'Basic Salary', amount: '', component_type: 'earning' }
    ]
  });

  const [statusOptions] = useState([
    { id: 'all', name: 'All Status' },
    { id: 'draft', name: 'Draft' },
    { id: 'confirmed', name: 'Confirmed' },
    { id: 'paid', name: 'Paid' }
  ]);

  const [componentTypes] = useState([
    { value: 'earning', label: 'Earning (+)' },
    { value: 'deduction', label: 'Deduction (-)' }
  ]);

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

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

  const getStatusBadge = (status) => {
    const badges = {
      draft: { class: 'badge-warning', icon: Circle },
      confirmed: { class: 'badge-employee', icon: CheckCircle },
      paid: { class: 'badge-default', icon: CheckCircle }
    };
    const badge = badges[status] || badges.draft;
    const IconComponent = badge.icon;
    
    return (
      <span className={`status-badge ${badge.class}`}>
        <IconComponent size={12} />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
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

  const fetchPayrolls = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await fetch(`${API_BASE_URL}/payrolls`);
      const data = await response.json();
      if (data.success && data.data) {
        setPayrolls(data.data);
        setFilteredPayrolls(data.data);
        calculateStatistics(data.data);
      } else {
        throw new Error(data.message || 'Failed to fetch payroll data');
      }
    } catch (error) {
      setError(`Failed to load payroll data: ${error.message}`);
      setPayrolls([]);
      setFilteredPayrolls([]);
      setStats({ totalPayrolls: 0, totalAmount: 0, avgAmount: 0, confirmedCount: 0 });
    } finally {
      setLoading(false);
    }
  };

  const calculateStatistics = (payrollData) => {
    if (!payrollData || payrollData.length === 0) {
      setStats({ totalPayrolls: 0, totalAmount: 0, avgAmount: 0, confirmedCount: 0 });
      return;
    }

    const totalAmount = payrollData.reduce((sum, payroll) => sum + (parseFloat(payroll.total_salary) || 0), 0);
    const avgAmount = totalAmount / payrollData.length;
    const confirmedCount = payrollData.filter(p => p.status === 'confirmed' || p.status === 'paid').length;
    
    setStats({
      totalPayrolls: payrollData.length,
      totalAmount,
      avgAmount,
      confirmedCount
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  useEffect(() => {
    fetchPayrolls();
    loadStaffList();
  }, []);

  useEffect(() => {
    let filtered = payrolls;

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(payroll =>
        (payroll.staff_name && payroll.staff_name.toLowerCase().includes(searchLower)) ||
        (payroll.payroll_id && payroll.payroll_id.toString().includes(searchTerm)) ||
        (payroll.position_title && payroll.position_title.toLowerCase().includes(searchLower)) ||
        (payroll.staff_id && payroll.staff_id.toString().includes(searchTerm))
      );
    }

    if (selectedStatus && selectedStatus !== 'all') {
      filtered = filtered.filter(payroll => payroll.status === selectedStatus);
    }

    setFilteredPayrolls(filtered);
  }, [searchTerm, selectedStatus, payrolls]);

  const clearSearch = () => {
    setSearchTerm('');
    setSelectedStatus('all');
  };

  const createPayroll = async (payrollData) => {
    try {
      setSubmitting(true);
      const response = await fetch(`${API_BASE_URL}/payrolls`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payrollData),
      });
      const data = await response.json();
      if (data.success) {
        await fetchPayrolls();
        return { success: true, message: 'Payroll created successfully' };
      } else {
        throw new Error(data.message || 'Failed to create payroll');
      }
    } catch (error) {
      return { success: false, message: error.message };
    } finally {
      setSubmitting(false);
    }
  };

  const updatePayroll = async (payrollId, payrollData) => {
    try {
      setSubmitting(true);
      const response = await fetch(`${API_BASE_URL}/payrolls/${payrollId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payrollData),
      });
      const data = await response.json();
      if (data.success) {
        await fetchPayrolls();
        return { success: true, message: 'Payroll updated successfully' };
      } else {
        throw new Error(data.message || 'Failed to update payroll');
      }
    } catch (error) {
      return { success: false, message: error.message };
    } finally {
      setSubmitting(false);
    }
  };

  const deletePayroll = async (payrollId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/payrolls/${payrollId}`, { method: 'DELETE' });
      const data = await response.json();
      if (data.success) {
        await fetchPayrolls();
        return { success: true, message: 'Payroll deleted successfully' };
      } else {
        throw new Error(data.message || 'Failed to delete payroll');
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
      period_start: '',
      period_end: '',
      status: 'draft',
      details: [
        { component_name: 'Basic Salary', amount: '', component_type: 'earning' }
      ]
    });
    setShowModal(true);
    loadStaffList();
  };

  const handleEdit = async (payroll) => {
    setModalMode('edit');
    setError('');
    setEditingId(payroll.payroll_id);
    
    // Fetch full payroll details
    try {
      const response = await fetch(`${API_BASE_URL}/payrolls/${payroll.payroll_id}`);
      const data = await response.json();
      if (data.success) {
        setFormData({
          staff_id: data.data.staff_id.toString(),
          period_start: data.data.period_start ? data.data.period_start.split('T')[0] : '',
          period_end: data.data.period_end ? data.data.period_end.split('T')[0] : '',
          status: data.data.status,
          details: data.data.details.length > 0 ? data.data.details : [
            { component_name: 'Basic Salary', amount: '', component_type: 'earning' }
          ]
        });
      }
    } catch (error) {
      console.error('Error loading payroll details:', error);
    }
    
    setShowModal(true);
  };

  const handleDelete = async (payrollId) => {
    if (window.confirm('Are you sure you want to delete this payroll record? This will also delete all associated details.')) {
      const result = await deletePayroll(payrollId);
      if (result.success) {
        showSuccess('Payroll deleted successfully');
      } else {
        setError(result.message);
      }
    }
  };

  const addDetail = () => {
    setFormData({
      ...formData,
      details: [...formData.details, { component_name: '', amount: '', component_type: 'earning' }]
    });
  };

  const removeDetail = (index) => {
    const newDetails = formData.details.filter((_, i) => i !== index);
    setFormData({ ...formData, details: newDetails });
  };

  const updateDetail = (index, field, value) => {
    const newDetails = [...formData.details];
    newDetails[index][field] = value;
    setFormData({ ...formData, details: newDetails });
  };

  const calculateTotal = () => {
    return formData.details.reduce((sum, detail) => {
      const amount = parseFloat(detail.amount) || 0;
      return sum + (detail.component_type === 'earning' ? amount : -amount);
    }, 0);
  };

  const handleSubmit = async () => {
    if (!formData.staff_id || !formData.period_start || !formData.period_end) {
      setError('Please fill in all required fields (Staff, Period Start, Period End)');
      return;
    }

    // Validate details
    const validDetails = formData.details.filter(detail => 
      detail.component_name && detail.amount && parseFloat(detail.amount) > 0
    );

    if (validDetails.length === 0) {
      setError('Please add at least one payroll component with a valid amount');
      return;
    }

    setError('');
    const payrollData = {
      staff_id: parseInt(formData.staff_id),
      period_start: formData.period_start,
      period_end: formData.period_end,
      status: formData.status,
      details: validDetails.map(detail => ({
        component_name: detail.component_name,
        amount: parseFloat(detail.amount),
        component_type: detail.component_type
      }))
    };

    let result;
    if (modalMode === 'create') {
      result = await createPayroll(payrollData);
    } else if (modalMode === 'edit') {
      result = await updatePayroll(editingId, payrollData);
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
            <div>Loading payroll data...</div>
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
            <div>
              <h1>Payroll Management</h1>
              <p>Manage employee payroll records with detailed salary components</p>
            </div>
            <div className="header-time-display">
              <div className="current-time-section">
                <Clock className="time-icon" size={20} />
                <div className="time-content">
                  <div className="current-time">
                    {currentTime.toLocaleTimeString('en-US', { 
                      hour12: false,
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit'
                    })}
                  </div>
                  <div className="current-date">
                    {currentTime.toLocaleDateString('en-US', { 
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </div>
                </div>
              </div>
              <div className="time-divider"></div>
              <div className="last-login-section">
                <History className="history-icon" size={16} />
                <div className="last-login-content">
                  <span className="last-login-label">System Status</span>
                  <div className="last-login-time">Online</div>
                </div>
              </div>
            </div>
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
                Payroll Statistics
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
                  <FileText size={20} />
                </div>
                <div className="stat-content">
                  <div className="stat-value">{stats.totalPayrolls}</div>
                  <div className="stat-label">Total Payrolls</div>
                </div>
              </div>
              <div className="stat-card stat-blue">
                <div className="stat-icon average">
                  <DollarSign size={20} />
                </div>
                <div className="stat-content">
                  <div className="stat-value">{formatCurrency(stats.totalAmount)}</div>
                  <div className="stat-label">Total Amount</div>
                </div>
              </div>
              <div className="stat-card stat-orange">
                <div className="stat-icon highest">
                  <TrendingUp size={20} />
                </div>
                <div className="stat-content">
                  <div className="stat-value">{formatCurrency(stats.avgAmount)}</div>
                  <div className="stat-label">Average Amount</div>
                </div>
              </div>
              <div className="stat-card stat-purple">
                <div className="stat-icon employees">
                  <CheckCircle size={20} />
                </div>
                <div className="stat-content">
                  <div className="stat-value">{stats.confirmedCount}</div>
                  <div className="stat-label">Confirmed/Paid</div>
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
                  placeholder="Search by employee name, ID, position..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {/* Status Filter */}
            <div className="filter-container">
              <select
                className="form-select"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
              >
                {statusOptions.map(status => (
                  <option key={status.id} value={status.id}>
                    {status.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Actions */}
            <button className="btn btn-primary" onClick={handleCreate}>
              <Plus className="btn-icon" />
              Add Payroll
            </button>

            {(searchTerm || selectedStatus !== 'all') && (
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

            <button className="btn btn-secondary" onClick={fetchPayrolls}>
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
            Payroll Records ({filteredPayrolls.length})
          </h2>

          {error && <div className="error-message">{error}</div>}

          {filteredPayrolls.length === 0 ? (
            <div className="empty-state">
              <h3>No payroll records found</h3>
              <p>
                {searchTerm || selectedStatus !== 'all' 
                  ? 'Try adjusting your search criteria or clear the filters.'
                  : 'Get started by creating your first payroll record.'}
              </p>
            </div>
          ) : (
            <div className="table-container">
              <table className="staff-table">
                <thead className="table-header">
                  <tr>
                    <th>Payroll ID</th>
                    <th>Employee</th>
                    <th>Period</th>
                    <th>Total Amount</th>
                    <th>Components</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPayrolls.map(payroll => (
                    <tr key={payroll.payroll_id} className="table-row">
                      <td>
                        <span className="staff-id">#{payroll.payroll_id}</span>
                      </td>
                      <td>
                        <div className="employee-info">
                          <div className="employee-name">{payroll.staff_name}</div>
                          <div className="employee-id">ID: {payroll.staff_id}</div>
                        </div>
                      </td>
                      <td>
                        <div style={{ fontSize: '0.875rem' }}>
                          <div>{formatDate(payroll.period_start)}</div>
                          <div style={{ color: '#6b7280' }}>to {formatDate(payroll.period_end)}</div>
                        </div>
                      </td>
                      <td>
                        <span className="salary-amount total">
                          {formatCurrency(payroll.total_salary)}
                        </span>
                      </td>
                      <td>
                        <span className="position-badge">
                          {payroll.component_count} items
                        </span>
                      </td>
                      <td>
                        {getStatusBadge(payroll.status)}
                      </td>
                      <td>
                        <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                          {formatDate(payroll.created_at)}
                        </div>
                      </td>
                      <td className="actions-cell">
                        <button 
                          className="action-btn edit-btn"
                          onClick={() => handleEdit(payroll)}
                          title="Edit Payroll"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          className="action-btn cancel-btn"
                          onClick={() => handleDelete(payroll.payroll_id)}
                          title="Delete Payroll"
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
                    <FileText size={24} />
                    {modalMode === 'create' ? 'Create New Payroll' : 'Edit Payroll'}
                  </h3>
                  <p>
                    {modalMode === 'create' 
                      ? 'Create a payroll record with salary components for an employee'
                      : 'Update the payroll information and salary components'
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
              
              {/* Basic Information */}
              <div className="salary-form-grid">
                {/* Staff Selection */}
                <div className="form-group">
                  <label className="form-label-with-icon">
                    <Users size={16} />
                    Employee <span className="required">*</span>
                  </label>
                  <select
                    className={`form-select ${!formData.staff_id && error ? 'error' : ''}`}
                    value={formData.staff_id}
                    onChange={(e) => setFormData({...formData, staff_id: e.target.value})}
                    disabled={modalMode === 'edit'}
                  >
                    <option value="">Select Employee</option>
                    {staffList.map(staff => (
                      <option key={staff.staff_id} value={staff.staff_id}>
                        {staff.name} (ID: {staff.staff_id})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Period Start */}
                <div className="form-group">
                  <label className="form-label-with-icon">
                    <Calendar size={16} />
                    Period Start <span className="required">*</span>
                  </label>
                  <input 
                    type="date"
                    className={`form-input ${!formData.period_start && error ? 'error' : ''}`}
                    value={formData.period_start}
                    onChange={(e) => setFormData({...formData, period_start: e.target.value})}
                  />
                </div>

                {/* Period End */}
                <div className="form-group">
                  <label className="form-label-with-icon">
                    <Calendar size={16} />
                    Period End <span className="required">*</span>
                  </label>
                  <input 
                    type="date"
                    className={`form-input ${!formData.period_end && error ? 'error' : ''}`}
                    value={formData.period_end}
                    onChange={(e) => setFormData({...formData, period_end: e.target.value})}
                  />
                </div>

                {/* Status */}
                <div className="form-group">
                  <label className="form-label-with-icon">
                    <AlertCircle size={16} />
                    Status
                  </label>
                  <select
                    className="form-select"
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                  >
                    <option value="draft">Draft</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="paid">Paid</option>
                  </select>
                </div>
              </div>

              {/* Payroll Components */}
              <div style={{ marginTop: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h4>Payroll Components</h4>
                  <button 
                    type="button"
                    className="btn btn-secondary"
                    onClick={addDetail}
                    style={{ padding: '0.5rem 1rem' }}
                  >
                    <Plus size={16} />
                    Add Component
                  </button>
                </div>

                {formData.details.map((detail, index) => (
                  <div key={index} className="salary-form-grid" style={{ 
                    marginBottom: '1rem', 
                    padding: '1rem', 
                    border: '1px solid #e5e7eb', 
                    borderRadius: '8px',
                    position: 'relative'
                  }}>
                    <div className="form-group">
                      <label>Component Name</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="e.g., Basic Salary, Overtime, Tax"
                        value={detail.component_name}
                        onChange={(e) => updateDetail(index, 'component_name', e.target.value)}
                      />
                    </div>
                    
                    <div className="form-group">
                      <label>Amount</label>
                      <input
                        type="number"
                        className="form-input"
                        placeholder="0.00"
                        value={detail.amount}
                        onChange={(e) => updateDetail(index, 'amount', e.target.value)}
                        min="0"
                        step="0.01"
                      />
                    </div>

                    <div className="form-group">
                      <label>Type</label>
                      <select
                        className="form-select"
                        value={detail.component_type}
                        onChange={(e) => updateDetail(index, 'component_type', e.target.value)}
                      >
                        {componentTypes.map(type => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {formData.details.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeDetail(index)}
                        style={{
                          position: 'absolute',
                          top: '0.5rem',
                          right: '0.5rem',
                          background: '#fee2e2',
                          border: '1px solid #fecaca',
                          borderRadius: '4px',
                          padding: '0.25rem',
                          cursor: 'pointer',
                          color: '#dc2626'
                        }}
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Total Calculation */}
              <div className="salary-summary">
                <h4>Payroll Summary</h4>
                <div className="summary-grid">
                  <div className="summary-item total">
                    <span>Total Payroll Amount:</span>
                    <span>{formatCurrency(calculateTotal())}</span>
                  </div>
                </div>
              </div>

              <div className="info-box">
                <small>
                  <strong>Note:</strong> The total amount will be automatically calculated from the components. 
                  Earnings will be added and deductions will be subtracted.
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
                  : modalMode === 'create' ? 'Create Payroll' : 'Update Payroll'
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PayrollManagement;