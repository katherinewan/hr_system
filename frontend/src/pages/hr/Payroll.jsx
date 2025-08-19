import React, { useState, useEffect } from 'react';
import { 
  Search, Calendar, Download, Eye, DollarSign, Users, TrendingUp,
  FileText, ChevronDown, Clock, RefreshCw
} from 'lucide-react';

const PayrollManagement = () => {
  const [payrollData, setPayrollData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [viewMode, setViewMode] = useState('monthly'); // 'monthly' or 'history'
  const [showStats, setShowStats] = useState(true);
  
  // Mock statistics
  const [stats, setStats] = useState({
    totalPayout: 125000,
    totalEmployees: 45,
    averageSalary: 2777.78,
    processedPayrolls: 45
  });

  // Mock payroll data
  const mockPayrollData = [
    {
      payroll_id: 'P2024001',
      staff_id: 100023,
      staff_name: 'John Smith',
      department: 'IT',
      month: '2024-01',
      total_salary: 3500,
      basic_salary: 3000,
      allowances: 500,
      deductions: 0,
      net_salary: 3500,
      status: 'Paid',
      payment_date: '2024-01-31'
    },
    {
      payroll_id: 'P2024002',
      staff_id: 100024,
      staff_name: 'Sarah Johnson',
      department: 'HR',
      month: '2024-01',
      total_salary: 2800,
      basic_salary: 2500,
      allowances: 300,
      deductions: 0,
      net_salary: 2800,
      status: 'Paid',
      payment_date: '2024-01-31'
    },
    {
      payroll_id: 'P2024003',
      staff_id: 100025,
      staff_name: 'Mike Wilson',
      department: 'Finance',
      month: '2024-01',
      total_salary: 3200,
      basic_salary: 2800,
      allowances: 400,
      deductions: 0,
      net_salary: 3200,
      status: 'Processing',
      payment_date: null
    }
  ];

  // API functions would go here
  const getApiUrl = () => {
    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
      return 'http://localhost:3001';
    }
    return import.meta.env.VITE_API_URL || 'http://localhost:3001';
  };

  const API_BASE_URL = `${getApiUrl()}/api`;

  // Load payroll data
  const loadPayrollData = async () => {
    setLoading(true);
    try {
      // Mock data loading
      setTimeout(() => {
        setPayrollData(mockPayrollData);
        setLoading(false);
      }, 1000);
      
      // Real API call would be:
      // const response = await fetch(`${API_BASE_URL}/payroll?month=${selectedMonth}`);
      // const data = await response.json();
      // if (data.success) setPayrollData(data.data);
    } catch (error) {
      setError('Failed to load payroll data');
      setLoading(false);
    }
  };

  // Generate payroll for month
  const generatePayroll = async () => {
    if (!confirm(`Generate payroll for ${selectedMonth}? This will calculate salaries for all employees.`)) {
      return;
    }
    
    try {
      setLoading(true);
      // Mock generation
      setTimeout(() => {
        alert('Payroll generated successfully!');
        loadPayrollData();
      }, 2000);
      
      // Real API call would be:
      // const response = await fetch(`${API_BASE_URL}/payroll/generate`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ month: selectedMonth })
      // });
    } catch (error) {
      setError('Failed to generate payroll');
      setLoading(false);
    }
  };

  // Download payroll report
  const downloadReport = (type) => {
    // Mock download
    alert(`Downloading ${type} report for ${selectedMonth}`);
    
    // Real implementation would generate and download file
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount || 0);
  };

  // Get status badge class
  const getStatusBadgeClass = (status) => {
    switch (status?.toLowerCase()) {
      case 'paid': return 'status-badge active';
      case 'processing': return 'attempts-badge normal';
      case 'pending': return 'badge-warning';
      case 'cancelled': return 'status-badge locked';
      default: return 'badge-default';
    }
  };

  // Filter payroll data
  const filteredData = payrollData.filter(payroll => {
    const matchesSearch = searchInput === '' || 
      payroll.staff_name.toLowerCase().includes(searchInput.toLowerCase()) ||
      payroll.staff_id.toString().includes(searchInput) ||
      payroll.payroll_id.toLowerCase().includes(searchInput.toLowerCase());
    
    const matchesMonth = viewMode === 'history' || payroll.month === selectedMonth;
    
    return matchesSearch && matchesMonth;
  });

  useEffect(() => {
    loadPayrollData();
  }, [selectedMonth]);

  return (
    <div className="app-container">
      {/* Header */}
      <div className="main-card">
        <div className="header">
          <h1>Payroll Management</h1>
        </div>
      </div>

      <div className="divider" />

      {/* Statistics Dashboard */}
      {showStats && (
        <div className="main-card">
          <div className="salary-stats-dashboard">
            <div className="stats-header">
              <h3>Payroll Statistics - {selectedMonth}</h3>
              <button 
                className="stats-toggle-btn"
                onClick={() => setShowStats(false)}
              >
                ×
              </button>
            </div>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon total">
                  <DollarSign size={24} />
                </div>
                <div className="stat-content">
                  <div className="stat-value">{formatCurrency(stats.totalPayout)}</div>
                  <div className="stat-label">Total Payout</div>
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
              <div className="stat-card">
                <div className="stat-icon average">
                  <TrendingUp size={24} />
                </div>
                <div className="stat-content">
                  <div className="stat-value">{formatCurrency(stats.averageSalary)}</div>
                  <div className="stat-label">Average Salary</div>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon highest">
                  <FileText size={24} />
                </div>
                <div className="stat-content">
                  <div className="stat-value">{stats.processedPayrolls}</div>
                  <div className="stat-label">Processed Payrolls</div>
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
            {/* View Mode Toggle */}
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                className={`btn ${viewMode === 'monthly' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setViewMode('monthly')}
              >
                <Calendar size={16} />
                Monthly Payroll
              </button>
              <button
                className={`btn ${viewMode === 'history' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setViewMode('history')}
              >
                <Clock size={16} />
                Payment History
              </button>
            </div>

            {/* Month Selector */}
            {viewMode === 'monthly' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.875rem', color: '#6b7280' }}>Month:</label>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="form-input"
                  style={{ width: '150px' }}
                />
              </div>
            )}

            {/* Search */}
            <div className="search-container">
              <div className="search-input-wrapper">
                <Search className="search-icon" size={20} />
                <input
                  type="text"
                  placeholder="Search by name, staff ID, or payroll ID..."
                  className="search-input"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                />
              </div>
            </div>

            {/* Action Buttons */}
            <button 
              className="btn btn-success"
              onClick={generatePayroll}
              disabled={loading}
            >
              <FileText size={16} />
              Generate Payroll
            </button>

            <div style={{ position: 'relative' }}>
              <button className="btn btn-secondary">
                <Download size={16} />
                Download Reports
                <ChevronDown size={14} />
              </button>
              {/* Dropdown menu would go here */}
            </div>

            <button 
              className="btn btn-secondary"
              onClick={loadPayrollData}
              disabled={loading}
            >
              <RefreshCw size={16} />
              Refresh
            </button>

            {searchInput && (
              <button
                className="btn btn-secondary"
                onClick={() => setSearchInput('')}
              >
                Clear Search
              </button>
            )}

            {!showStats && (
              <button 
                className="btn btn-secondary"
                onClick={() => setShowStats(true)}
              >
                <TrendingUp size={16} />
                Show Stats
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="content">
          <h2 className="result-title">
            {viewMode === 'monthly' ? `Monthly Payroll - ${selectedMonth}` : 'Payment History'} 
            ({filteredData.length})
          </h2>

          {loading ? (
            <div className="loading-state">
              <div>Loading payroll data...</div>
            </div>
          ) : error ? (
            <div className="error-message">
              {error}
            </div>
          ) : filteredData.length === 0 ? (
            <div className="empty-state">
              <FileText size={64} />
              <h3>No Payroll Records Found</h3>
              <p>
                {viewMode === 'monthly' 
                  ? `No payroll data for ${selectedMonth}. Generate payroll to create records.`
                  : 'No payment history matches your search criteria.'
                }
              </p>
            </div>
          ) : (
            <div className="table-container">
              <table className="staff-table">
                <thead className="table-header">
                  <tr>
                    <th>Payroll ID</th>
                    <th>Employee</th>
                    <th>Department</th>
                    <th>Month</th>
                    <th>Basic Salary</th>
                    <th>Allowances</th>
                    <th>Deductions</th>
                    <th>Net Salary</th>
                    <th>Status</th>
                    <th>Payment Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.map((payroll) => (
                    <tr key={payroll.payroll_id} className="table-row">
                      <td>
                        <span className="staff-id">{payroll.payroll_id}</span>
                      </td>
                      <td>
                        <div className="employee-info">
                          <div className="employee-name">{payroll.staff_name}</div>
                          <div className="employee-id">ID: {payroll.staff_id}</div>
                        </div>
                      </td>
                      <td>
                        <span className="position-badge">{payroll.department}</span>
                      </td>
                      <td>{payroll.month}</td>
                      <td>{formatCurrency(payroll.basic_salary)}</td>
                      <td>{formatCurrency(payroll.allowances)}</td>
                      <td>{formatCurrency(payroll.deductions)}</td>
                      <td>
                        <strong>{formatCurrency(payroll.net_salary)}</strong>
                      </td>
                      <td>
                        <span className={getStatusBadgeClass(payroll.status)}>
                          {payroll.status}
                        </span>
                      </td>
                      <td>
                        {payroll.payment_date 
                          ? new Date(payroll.payment_date).toLocaleDateString()
                          : '-'
                        }
                      </td>
                      <td className="actions-cell">
                        <div className="edit-actions">
                          <button
                            className="action-btn edit-btn"
                            title="View Details"
                            onClick={() => alert(`View details for ${payroll.payroll_id}`)}
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            className="action-btn edit-btn"
                            title="Download Payslip"
                            onClick={() => alert(`Download payslip for ${payroll.staff_name}`)}
                          >
                            <Download size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PayrollManagement;