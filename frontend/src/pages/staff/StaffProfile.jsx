import React, { useState, useEffect } from 'react';
import { User, Phone, Mail, MapPin, Calendar, Building, Edit3, Save, X, Clock, Award } from 'lucide-react';
import '../../styles/StaffProfile.css';

const StaffProfile = () => {
  const [profileData, setProfileData] = useState(null);
  const [workSummary, setWorkSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [updateLoading, setUpdateLoading] = useState(false);

  useEffect(() => {
    fetchProfileData();
    fetchWorkSummary();
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
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${getApiUrl()}/api/staff/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch profile data');
      }

      const data = await response.json();
      if (data.success) {
        setProfileData(data.data);
        setEditForm({
          nickname: data.data.personalInfo.nickname || '',
          phoneNumber: data.data.personalInfo.phoneNumber || '',
          address: data.data.personalInfo.address || '',
          emergencyContactName: data.data.emergencyContact.name || '',
          emergencyContactPhone: data.data.emergencyContact.phone || ''
        });
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Error loading profile data');
      console.error('Error:', err);
    }
  };

  const fetchWorkSummary = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${getApiUrl()}/api/staff/work-summary`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setWorkSummary(data.data);
        }
      }
    } catch (err) {
      console.error('Error fetching work summary:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEditToggle = () => {
    setIsEditing(!isEditing);
    if (isEditing) {
      setEditForm({
        nickname: profileData.personalInfo.nickname || '',
        phoneNumber: profileData.personalInfo.phoneNumber || '',
        address: profileData.personalInfo.address || '',
        emergencyContactName: profileData.emergencyContact.name || '',
        emergencyContactPhone: profileData.emergencyContact.phone || ''
      });
    }
  };

  const handleInputChange = (field, value) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveProfile = async () => {
    setUpdateLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      // 修正：從 geREACTtApiUrl() 改為 getApiUrl()
      const response = await fetch(`${getApiUrl()}/api/staff/profile`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editForm)
      });

      const data = await response.json();
      if (data.success) {
        await fetchProfileData();
        setIsEditing(false);
        setError('');
      } else {
        setError(data.message);
      }
    } catch (err) {
      setError('Error updating profile');
      console.error('Error:', err);
    } finally {
      setUpdateLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-content">
          <div className="loading-spinner"></div>
          <p>Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error && !profileData) {
    return (
      <div className="error-container">
        <div className="error-content">
          <p className="error-message">{error}</p>
          <button className="retry-button" onClick={() => window.location.reload()}>
            Retry
          </button>
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
                  {profileData?.personalInfo.name || 'Staff Profile'}
                </h1>
                <p className="user-position">
                  {profileData?.workInfo.positionName || 'Position'} • ID: {profileData?.staffId}
                </p>
              </div>
            </div>
            <div className="action-buttons">
              {isEditing ? (
                <>
                  <button
                    className="save-button"
                    onClick={handleSaveProfile}
                    disabled={updateLoading}
                  >
                    <Save size={16} />
                    {updateLoading ? 'Saving...' : 'Save'}
                  </button>
                  <button className="cancel-button" onClick={handleEditToggle}>
                    <X size={16} />
                    Cancel
                  </button>
                </>
              ) : (
                <button className="edit-button" onClick={handleEditToggle}>
                  <Edit3 size={16} />
                  Edit Profile
                </button>
              )}
            </div>
          </div>
        </div>

        {error && (
          <div className="error-banner">
            {error}
          </div>
        )}

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
                      <p className="info-value">{profileData?.personalInfo.name}</p>
                    </div>
                  </div>
                  
                  <div className="info-item">
                    <User size={20} className="info-icon" />
                    <div className="info-content">
                      <p className="info-label">Nickname</p>
                      {isEditing ? (
                        <input
                          type="text"
                          className="edit-input"
                          value={editForm.nickname}
                          onChange={(e) => handleInputChange('nickname', e.target.value)}
                        />
                      ) : (
                        <p className="info-value">{profileData?.personalInfo.nickname || 'Not set'}</p>
                      )}
                    </div>
                  </div>

                  <div className="info-item">
                    <Mail size={20} className="info-icon" />
                    <div className="info-content">
                      <p className="info-label">Email</p>
                      <p className="info-value">{profileData?.personalInfo.email}</p>
                    </div>
                  </div>

                  <div className="info-item">
                    <Phone size={20} className="info-icon" />
                    <div className="info-content">
                      <p className="info-label">Phone Number</p>
                      {isEditing ? (
                        <input
                          type="text"
                          className="edit-input"
                          value={editForm.phoneNumber}
                          onChange={(e) => handleInputChange('phoneNumber', e.target.value)}
                        />
                      ) : (
                        <p className="info-value">{profileData?.personalInfo.phoneNumber || 'Not set'}</p>
                      )}
                    </div>
                  </div>

                  <div className="info-item">
                    <User size={20} className="info-icon" />
                    <div className="info-content">
                      <p className="info-label">Gender</p>
                      <p className="info-value">{profileData?.personalInfo.gender}</p>
                    </div>
                  </div>

                  <div className="info-item">
                    <Calendar size={20} className="info-icon" />
                    <div className="info-content">
                      <p className="info-label">Age</p>
                      <p className="info-value">{profileData?.personalInfo.age} years old</p>
                    </div>
                  </div>
                </div>

                <div className="address-item">
                  <MapPin size={20} className="info-icon" />
                  <div className="info-content">
                    <p className="info-label">Address</p>
                    {isEditing ? (
                      <textarea
                        className="edit-textarea"
                        value={editForm.address}
                        onChange={(e) => handleInputChange('address', e.target.value)}
                        rows={2}
                      />
                    ) : (
                      <p className="info-value">{profileData?.personalInfo.address || 'Not set'}</p>
                    )}
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
                      {isEditing ? (
                        <input
                          type="text"
                          className="edit-input"
                          value={editForm.emergencyContactName}
                          onChange={(e) => handleInputChange('emergencyContactName', e.target.value)}
                        />
                      ) : (
                        <p className="info-value">{profileData?.emergencyContact.name || 'Not set'}</p>
                      )}
                    </div>
                  </div>

                  <div className="info-item">
                    <Phone size={20} className="info-icon" />
                    <div className="info-content">
                      <p className="info-label">Contact Phone</p>
                      {isEditing ? (
                        <input
                          type="text"
                          className="edit-input"
                          value={editForm.emergencyContactPhone}
                          onChange={(e) => handleInputChange('emergencyContactPhone', e.target.value)}
                        />
                      ) : (
                        <p className="info-value">{profileData?.emergencyContact.phone || 'Not set'}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Work Information & Statistics */}
            <div className="work-section">
              <h2 className="section-title">Work Information</h2>
              <div className="info-card">
                <div className="work-info-grid">
                  <div className="info-item">
                    <Building size={20} className="info-icon" />
                    <div className="info-content">
                      <p className="info-label">Department</p>
                      <p className="info-value">{profileData?.workInfo.department}</p>
                    </div>
                  </div>

                  <div className="info-item">
                    <Award size={20} className="info-icon" />
                    <div className="info-content">
                      <p className="info-label">Position</p>
                      <p className="info-value">{profileData?.workInfo.positionName}</p>
                    </div>
                  </div>

                  <div className="info-item">
                    <Calendar size={20} className="info-icon" />
                    <div className="info-content">
                      <p className="info-label">Hire Date</p>
                      <p className="info-value">{formatDate(profileData?.workInfo.hireDate)}</p>
                    </div>
                  </div>

                  {workSummary && (
                    <div className="info-item">
                      <Clock size={20} className="info-icon" />
                      <div className="info-content">
                        <p className="info-label">Years of Service</p>
                        <p className="info-value">{workSummary.tenure.yearsOfService} years</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Work Statistics */}
              {workSummary && (
                <div className="stats-section">
                  <h2 className="section-title">This Month</h2>
                  <div className="stats-card">
                    <div className="stats-grid">
                      <div className="stat-item">
                        <p className="stat-value">{workSummary.currentMonth.totalWorkDays}</p>
                        <p className="stat-label">Work Days</p>
                      </div>
                      
                      <div className="stat-item">
                        <p className="stat-value">{workSummary.currentMonth.totalHours}</p>
                        <p className="stat-label">Total Hours</p>
                      </div>

                      <div className="stat-item">
                        <p className="stat-value">{workSummary.currentMonth.averageDailyHours}</p>
                        <p className="stat-label">Avg Hours/Day</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StaffProfile;