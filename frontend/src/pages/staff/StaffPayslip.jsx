import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Download, 
  Eye, 
  Calendar, 
  FileText, 
  Clock, 
  History,
  CheckCircle,
  RefreshCw
} from 'lucide-react';

const EmployeePayslipView = () => {
  const [payslips, setPayslips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredPayslips, setFilteredPayslips] = useState([]);
  const [selectedPayslip, setSelectedPayslip] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [downloading, setDownloading] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Get current user's staff_id (you'll need to implement authentication)
  const getCurrentStaffId = () => {
    // This should come from your authentication system
    // For now, returning a placeholder - replace with actual implementation
    const userInfo = JSON.parse(localStorage.getItem('userInfo') || '{}');
    return userInfo.staff_id || 1; // Replace with actual staff ID from logged-in user
  };

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

  const formatDateRange = (startDate, endDate) => {
    return `${formatDate(startDate)} - ${formatDate(endDate)}`;
  };

  const getStatusBadge = (status) => {
    const badges = {
      confirmed: { class: 'badge-employee', icon: CheckCircle, text: 'Confirmed' },
      paid: { class: 'badge-default', icon: CheckCircle, text: 'Paid' }
    };
    const badge = badges[status] || badges.confirmed;
    const IconComponent = badge.icon;
    
    return (
      <span className={`status-badge ${badge.class}`}>
        <IconComponent size={12} />
        {badge.text}
      </span>
    );
  };

  const fetchPayslips = async () => {
    try {
      setLoading(true);
      setError('');
      const staffId = getCurrentStaffId();
      const response = await fetch(`${API_BASE_URL}/payslips/staff/${staffId}`);
      const data = await response.json();
      
      if (data.success && data.data) {
        setPayslips(data.data);
        setFilteredPayslips(data.data);
      } else {
        throw new Error(data.message || 'Failed to fetch payslip data');
      }
    } catch (error) {
      setError(`Failed to load payslips: ${error.message}`);
      setPayslips([]);
      setFilteredPayslips([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchPayslipDetails = async (payrollId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/payslips/${payrollId}`);
      const data = await response.json();
      
      if (data.success) {
        setSelectedPayslip(data.data);
        setShowModal(true);
      } else {
        throw new Error(data.message || 'Failed to fetch payslip details');
      }
    } catch (error) {
      setError(`Failed to load payslip details: ${error.message}`);
    }
  };

  const downloadPayslip = async (payrollId, filename) => {
    try {
      setDownloading(payrollId);
      const response = await fetch(`${API_BASE_URL}/payslips/${payrollId}/download`);
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = filename || `payslip_${payrollId}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        throw new Error('Failed to download payslip');
      }
    } catch (error) {
      setError(`Download failed: ${error.message}`);
    } finally {
      setDownloading(null);
    }
  };

  useEffect(() => {
    fetchPayslips();
  }, []);

  useEffect(() => {
    if (!searchTerm) {
      setFilteredPayslips(payslips);
      return;
    }

    const searchLower = searchTerm.toLowerCase();
    const filtered = payslips.filter(payslip =>
      formatDateRange(payslip.period_start, payslip.period_end).toLowerCase().includes(searchLower) ||
      payslip.total_salary.toString().includes(searchTerm) ||
      payslip.status.toLowerCase().includes(searchLower)
    );
    setFilteredPayslips(filtered);
  }, [searchTerm, payslips]);

  if (loading) {
    return (
      <div className="app-container">
        <div className="main-card">
          <div className="loading-state">
            <div>Loading your payslips...</div>
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
              <h1>My Payslips</h1>
              <p>View and download your payslip records</p>
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
                  <span className="last-login-label">Total Records</span>
                  <div className="last-login-time">{payslips.length}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

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
                  placeholder="Search by period, amount, or status..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {/* Refresh */}
            <button className="btn btn-secondary" onClick={fetchPayslips}>
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
            Payslip Records ({filteredPayslips.length})
          </h2>

          {error && <div className="error-message">{error}</div>}

          {filteredPayslips.length === 0 ? (
            <div className="empty-state">
              <h3>No payslip records found</h3>
              <p>
                {searchTerm 
                  ? 'Try adjusting your search criteria.'
                  : 'You don\'t have any payslip records yet.'}
              </p>
            </div>
          ) : (
            <div className="table-container">
              <table className="staff-table">
                <thead className="table-header">
                  <tr>
                    <th>Pay Period</th>
                    <th>Total Amount</th>
                    <th>Status</th>
                    <th>Issue Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPayslips.map(payslip => (
                    <tr key={payslip.payroll_id} className="table-row">
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <Calendar size={16} style={{ color: '#799496' }} />
                          <div>
                            <div className="employee-name">
                              {formatDateRange(payslip.period_start, payslip.period_end)}
                            </div>
                            <div className="employee-id">
                              ID: {payslip.payroll_id}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="salary-amount total">
                          {formatCurrency(payslip.total_salary)}
                        </span>
                      </td>
                      <td>
                        {getStatusBadge(payslip.status)}
                      </td>
                      <td>
                        <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                          {formatDate(payslip.created_at)}
                        </div>
                      </td>
                      <td className="actions-cell">
                        <button 
                          className="action-btn edit-btn"
                          onClick={() => fetchPayslipDetails(payslip.payroll_id)}
                          title="View Details"
                        >
                          <Eye size={16} />
                        </button>
                        <button 
                          className="action-btn save-btn"
                          onClick={() => downloadPayslip(
                            payslip.payroll_id, 
                            `payslip_${payslip.period_start.replace(/-/g, '')}_${payslip.period_end.replace(/-/g, '')}.pdf`
                          )}
                          disabled={downloading === payslip.payroll_id}
                          title="Download PDF"
                        >
                          {downloading === payslip.payroll_id ? (
                            <RefreshCw size={16} className="spinning" />
                          ) : (
                            <Download size={16} />
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
      </div>

      {/* Payslip Detail Modal */}
      {showModal && selectedPayslip && (
        <div className="modal-overlay">
          <div className="modal-content modal-large">
            <div className="modal-header">
              <div className="modal-header-content">
                <div className="modal-title-section">
                  <h3 className="modal-title-with-icon">
                    <FileText size={24} />
                    Payslip Details
                  </h3>
                  <p>
                    Pay period: {formatDateRange(selectedPayslip.period_start, selectedPayslip.period_end)}
                  </p>
                </div>
                <button 
                  className="close-btn" 
                  onClick={() => setShowModal(false)}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="modal-body">
              {/* Employee Information */}
              <div className="salary-form-grid">
                <div className="form-group">
                  <label className="form-label-with-icon">
                    <Users size={16} />
                    Employee Name
                  </label>
                  <div className="form-input" style={{ background: '#f9fafb', border: '1px solid #e5e7eb' }}>
                    {selectedPayslip.staff_name}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label-with-icon">
                    <FileText size={16} />
                    Position
                  </label>
                  <div className="form-input" style={{ background: '#f9fafb', border: '1px solid #e5e7eb' }}>
                    {selectedPayslip.position_title || 'N/A'}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label-with-icon">
                    <Calendar size={16} />
                    Period Start
                  </label>
                  <div className="form-input" style={{ background: '#f9fafb', border: '1px solid #e5e7eb' }}>
                    {formatDate(selectedPayslip.period_start)}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label-with-icon">
                    <Calendar size={16} />
                    Period End
                  </label>
                  <div className="form-input" style={{ background: '#f9fafb', border: '1px solid #e5e7eb' }}>
                    {formatDate(selectedPayslip.period_end)}
                  </div>
                </div>
              </div>

              {/* Salary Components */}
              <div style={{ marginTop: '2rem' }}>
                <h4 style={{ marginBottom: '1rem' }}>Salary Components</h4>
                
                {selectedPayslip.details && selectedPayslip.details.length > 0 ? (
                  <div className="table-container">
                    <table className="staff-table">
                      <thead className="table-header">
                        <tr>
                          <th>Component</th>
                          <th>Type</th>
                          <th>Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedPayslip.details.map((detail, index) => (
                          <tr key={index} className="table-row">
                            <td>{detail.component_name}</td>
                            <td>
                              <span className={`position-badge ${detail.component_type === 'earning' ? 'badge-employee' : 'badge-warning'}`}>
                                {detail.component_type === 'earning' ? 'Earning (+)' : 'Deduction (-)'}
                              </span>
                            </td>
                            <td>
                              <span className={`salary-amount ${detail.component_type === 'earning' ? 'basic' : 'deduction'}`}>
                                {detail.component_type === 'earning' ? '+' : '-'}{formatCurrency(detail.amount)}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div style={{ 
                    background: '#f9fafb', 
                    padding: '1rem', 
                    borderRadius: '8px', 
                    border: '1px solid #e5e7eb',
                    textAlign: 'center',
                    color: '#6b7280'
                  }}>
                    No detailed components available. This payslip uses basic salary structure.
                  </div>
                )}
              </div>

              {/* Summary */}
              <div className="salary-summary">
                <h4>Payment Summary</h4>
                <div className="summary-grid">
                  <div className="summary-item total">
                    <span>Total Amount:</span>
                    <span>{formatCurrency(selectedPayslip.total_salary)}</span>
                  </div>
                  <div className="summary-item">
                    <span>Status:</span>
                    <span>{getStatusBadge(selectedPayslip.status)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button 
                className="btn btn-secondary"
                onClick={() => setShowModal(false)}
              >
                Close
              </button>
              <button 
                className="btn btn-primary"
                onClick={() => downloadPayslip(
                  selectedPayslip.payroll_id,
                  `payslip_${selectedPayslip.period_start.replace(/-/g, '')}_${selectedPayslip.period_end.replace(/-/g, '')}.pdf`
                )}
                disabled={downloading === selectedPayslip.payroll_id}
              >
                <Download className="btn-icon" />
                {downloading === selectedPayslip.payroll_id ? 'Downloading...' : 'Download PDF'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .spinning {
          animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default EmployeePayslipView;