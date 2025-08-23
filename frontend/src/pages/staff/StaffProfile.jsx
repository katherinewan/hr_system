import React, { useState, useEffect } from 'react';
import { User, Phone, Mail, MapPin, Calendar, Building, Award, AlertCircle } from 'lucide-react';
import '../../styles/StaffProfile.css';

const StaffProfile = () => {
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchProfileData();
  }, []);

  // API
  const getApiUrl = () => {
    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
      return 'http://localhost:3001';
    }
    return import.meta.env.VITE_API_URL || 'http://localhost:3001';
  };

  const API_BASE_URL = `${getApiUrl()}/api`;

  const fetchProfileData = async () => {
    try {
      setLoading(true);
      setError('');

      // Get token from localStorage
      const token = localStorage.getItem('authToken');
      
      if (!token) {
        setError('Please login to view your profile');
        setLoading(false);
        return;
      }

      console.log('Fetching profile from:', `${API_BASE_URL}/staff/profile`);
      console.log('Token present:', !!token);
      
      const response = await fetch(`${API_BASE_URL}/staff/profile`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Profile response status:', response.status);

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Your session has expired. Please login again.');
        } else if (response.status === 404) {
          throw new Error('Your profile was not found.');
        } else {
          throw new Error(`Server error: ${response.status}`);
        }
      }

      const data = await response.json();
      console.log('Profile data received:', data);

      if (data.success) {
        setProfileData(data.data);
        setError('');
      } else {
        setError(data.message || 'Failed to load profile data');
      }
    } catch (err) {
      console.error('Profile fetch error:', err);
      setError(err.message || 'Error loading profile data');
      
      // If authentication failed, redirect to login
      if (err.message.includes('session') || err.message.includes('login')) {
        // Clear invalid token
        localStorage.removeItem('authToken');
        // You can redirect to login page here if needed
        // window.location.href = '/login';
      }
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch (err) {
      return 'Invalid date';
    }
  };

  const handleRetry = () => {
    fetchProfileData();
  };



  const renderLoadingState = () => (
    <div className="staff-profile-container">
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading your profile...</p>
      </div>
    </div>
  );

  const renderErrorMessage = (message, type = 'error') => (
    <div className={`error-message ${type}`}>
      <AlertCircle size={20} />
      <span>{message}</span>
    </div>
  );

  if (loading) {
    return renderLoadingState();
  }

  // If there's an error and no profile data
  if (error && !profileData) {
    return (
      <div className="staff-profile-container">
        <div className="profile-card">
          <div className="profile-header">
            <div className="header-content">
              <div className="user-info">
                <div className="avatar">
                  <User size={32} />
                </div>
                <div className="user-details">
                  <h1 className="user-name">Staff Profile</h1>
                  <p className="user-position">Unable to load profile</p>
                </div>
              </div>
            </div>
          </div>
          <div className="error-section">
            {renderErrorMessage(error)}
            <div className="error-actions">
              <button 
                className="retry-button"
                onClick={handleRetry}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  marginRight: '10px'
                }}
              >
                Try Again
              </button>
              {error.includes('login') && (
                <button 
                  className="login-button"
                  onClick={() => window.location.href = '/login'}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Go to Login
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="staff-profile-container">
      <div className="profile-card">
        {/* Header */}
        <div className="profile-header">
          <div className="header-content">
            <div className="user-info">
              <div className="avatar">
                <User size={32} />
              </div>
              <div className="user-details">
                <h1 className="user-name">
                  {profileData?.personalInfo?.name || 'Staff Profile'}
                </h1>
                <div className="user-details2">
                  <p className="user-position">
                    {profileData?.workInfo?.positionName || 'Position'}
                  </p>
                  <p className="user-position">
                    ID: {profileData?.staffId || 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Error Messages */}
        {error && renderErrorMessage(error, 'warning')}

        {profileData && (
          <div className="profile-content">
            <div className="content-grid">
              {/* Personal Information */}
              <div className="personal-section">
                <h2 className="section-title">Personal Information</h2>
                <div className="info-card">
                  <div className="info-grid">
                    <div className="info-item">
                      <User size={20} className="info-icon" />
                      <div className="info-content">
                        <p className="info-label">Full Name</p>
                        <p className="info-value">{profileData.personalInfo?.name || 'Not available'}</p>
                      </div>
                    </div>
                    
                    <div className="info-item">
                      <User size={20} className="info-icon" />
                      <div className="info-content">
                        <p className="info-label">Nickname</p>
                        <p className="info-value">{profileData.personalInfo?.nickname || 'Not set'}</p>
                      </div>
                    </div>

                    <div className="info-item">
                      <Mail size={20} className="info-icon" />
                      <div className="info-content">
                        <p className="info-label">Email</p>
                        <p className="info-value">{profileData.personalInfo?.email || 'Not available'}</p>
                      </div>
                    </div>

                    <div className="info-item">
                      <Phone size={20} className="info-icon" />
                      <div className="info-content">
                        <p className="info-label">Phone Number</p>
                        <p className="info-value">{profileData.personalInfo?.phoneNumber || 'Not set'}</p>
                      </div>
                    </div>

                    <div className="info-item">
                      <User size={20} className="info-icon" />
                      <div className="info-content">
                        <p className="info-label">Gender</p>
                        <p className="info-value">{profileData.personalInfo?.gender || 'Not specified'}</p>
                      </div>
                    </div>

                    <div className="info-item">
                      <Calendar size={20} className="info-icon" />
                      <div className="info-content">
                        <p className="info-label">Age</p>
                        <p className="info-value">
                          {profileData.personalInfo?.age ? `${profileData.personalInfo.age} years old` : 'Not available'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="address-item">
                    <MapPin size={20} className="info-icon" />
                    <div className="info-content">
                      <p className="info-label">Address</p>
                      <p className="info-value">{profileData.personalInfo?.address || 'Not set'}</p>
                    </div>
                  </div>
                </div>

                {/* Emergency Contact */}
                <h2 className="section-title">Emergency Contact</h2>
                <div className="info-card">
                  <div className="info-grid">
                    <div className="info-item">
                      <User size={20} className="info-icon" />
                      <div className="info-content">
                        <p className="info-label">Contact Name</p>
                        <p className="info-value">{profileData.emergencyContact?.name || 'Not set'}</p>
                      </div>
                    </div>

                    <div className="info-item">
                      <Phone size={20} className="info-icon" />
                      <div className="info-content">
                        <p className="info-label">Contact Phone</p>
                        <p className="info-value">{profileData.emergencyContact?.phone || 'Not set'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Work Information */}
              <div className="work-section">
                <h2 className="section-title">Work Information</h2>
                <div className="info-card">
                  <div className="work-info-grid">
                    <div className="info-item">
                      <Building size={20} className="info-icon" />
                      <div className="info-content">
                        <p className="info-label">Department</p>
                        <p className="info-value">{profileData.workInfo?.department || 'Not available'}</p>
                      </div>
                    </div>

                    <div className="info-item">
                      <Award size={20} className="info-icon" />
                      <div className="info-content">
                        <p className="info-label">Position</p>
                        <p className="info-value">{profileData.workInfo?.positionName || 'Not available'}</p>
                      </div>
                    </div>

                    <div className="info-item">
                      <Calendar size={20} className="info-icon" />
                      <div className="info-content">
                        <p className="info-label">Hire Date</p>
                        <p className="info-value">{formatDate(profileData.workInfo?.hireDate)}</p>
                      </div>
                    </div>

                    {profileData.workInfo?.basicSalary && (
                      <div className="info-item">
                        <Award size={20} className="info-icon" />
                        <div className="info-content">
                          <p className="info-label">Basic Salary</p>
                          <p className="info-value">${profileData.workInfo.basicSalary}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StaffProfile;