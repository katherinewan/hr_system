import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import logo from '../assets/Logo.png';

const LoginPage = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    staff_id: '',
    password: '',
    rememberMe: false
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // Clear error message
    if (error) setError('');
  };

  // Toggle password visibility
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  // Role-based navigation function
  const navigateBasedOnRole = (userRole) => {
    switch (userRole) {
      case 'Employee':
        navigate('/staff');
        break;
      case 'HR':
      case 'Admin':
        navigate('/hr');
        break;
      default:
        console.warn('Unknown role:', userRole);
        navigate('/staff'); // Default to staff page
        break;
    }
  };

  // Handle login
  const handleLogin = async () => {
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      // Basic validation
      if (!formData.staff_id || !formData.password) {
        throw new Error('Please enter staff ID and password');
      }

      // Get API URL - 修正：使用 Vite 環境變數
      const getApiUrl = () => {
        if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
          return 'http://localhost:3001';
        }
        // 修正：從 process.env.NEXT_PUBLIC_API_URL 改為 import.meta.env.VITE_API_URL
        return import.meta.env.VITE_API_URL || 'http://localhost:3001';
      };

      console.log('Using real backend login');
      console.log('API URL:', getApiUrl()); // 新增：用於調試
      
      // Real backend API call with better error handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const response = await fetch(`${getApiUrl()}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          staff_id: formData.staff_id,
          password: formData.password
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        // Handle specific HTTP errors
        if (response.status === 403) {
          const data = await response.json();
          throw new Error(data.message || 'Insufficient permissions, only admins and HR personnel can log in');
        }
        if (response.status === 401) {
          throw new Error('Invalid staff ID or password');
        }
        if (response.status >= 500) {
          throw new Error('Server error. Please try again later.');
        }
        throw new Error('Login failed. Please check your credentials.');
      }

      const data = await response.json();

      if (data.success) {
        setSuccess('Login successful! Redirecting...');
        
        // Save user information and token
        const { user, token } = data.data;
        
        console.log('Ready to save to localStorage:', { user, token });
        console.log('User role detected:', user.role);
        
        try {
          localStorage.setItem('authToken', token);
          localStorage.setItem('userInfo', JSON.stringify(user));
          
          // Verify save was successful
          const savedToken = localStorage.getItem('authToken');
          const savedUserInfo = localStorage.getItem('userInfo');
          
          console.log('Post-save verification:', {
            savedToken: !!savedToken,
            savedUserInfo: !!savedUserInfo,
            parsedUser: savedUserInfo ? JSON.parse(savedUserInfo) : null
          });
          
          // If remember me is selected, save staff_id
          if (formData.rememberMe) {
            localStorage.setItem('rememberedStaffId', formData.staff_id);
          } else {
            localStorage.removeItem('rememberedStaffId');
          }
          
        } catch (error) {
          console.error('Failed to save to localStorage:', error);
        }

        // Delay redirect to let user see success message, then navigate based on role
        setTimeout(() => {
          console.log('Login successful, navigating based on role:', user.role);
          
          // Final verification of localStorage
          const finalToken = localStorage.getItem('authToken');
          const finalUserInfo = localStorage.getItem('userInfo');
          console.log('Final check before redirect:', {
            finalToken: !!finalToken,
            finalUserInfo: !!finalUserInfo
          });
          
          // Trigger login success event to notify App.jsx to update auth state
          window.dispatchEvent(new Event('loginSuccess'));
          
          // Navigate based on user role
          navigateBasedOnRole(user.role);
          
        }, 1500);
      }
    } catch (error) {
      console.error('Login error:', error);
      
      // Handle different types of errors
      if (error.name === 'AbortError') {
        setError('Connection timeout. Please check your internet connection and try again.');
      } else if (error.message.includes('fetch')) {
        setError('Unable to connect to server. Please ensure the backend is running and try again.');
      } else {
        setError(error.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Enter key
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleLogin();
    }
  };

  // Load remembered staff_id
  useEffect(() => {
    const rememberedStaffId = localStorage.getItem('rememberedStaffId');
    if (rememberedStaffId) {
      setFormData(prev => ({
        ...prev,
        staff_id: rememberedStaffId,
        rememberMe: true
      }));
    }
  }, []);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #799496 0%, #254e70 50%, #2e382e 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1rem',
      position: 'relative',
      overflow: 'hidden',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
    }}>
      {/* Background Pattern */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundImage: `url('data:image/svg+xml,<svg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"><g fill="none" fill-rule="evenodd"><g fill="%23ffffff" fill-opacity="0.03"><circle cx="30" cy="30" r="1.5"/></g></svg>')`,
        backgroundRepeat: 'repeat',
        opacity: 0.4
      }}></div>

      <div style={{
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(20px)',
        borderRadius: '24px',
        padding: '3rem 2.5rem',
        boxShadow: `
          0 25px 50px -12px rgba(0, 0, 0, 0.25),
          0 0 0 1px rgba(255, 255, 255, 0.1),
          inset 0 1px 0 rgba(255, 255, 255, 0.2)
        `,
        width: '100%',
        maxWidth: '420px',
        position: 'relative',
        zIndex: 1,
        border: '1px solid rgba(255, 255, 255, 0.2)',
        animation: 'slideInUp 0.6s cubic-bezier(0.4, 0, 0.2, 1)'
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{
            width: '100px',
            height: '100px',
            borderRadius: '20px',
            margin: '0 auto 1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 25px -8px rgba(37, 78, 112, 0.3)',
            position: 'relative',
            overflow: 'hidden',
            border: '2px solid #d1d5db',
            backgroundColor: '#f9fafb'
          }}>
            {/* Shimmer Effect */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: '-100%',
              width: '100%',
              height: '100%',
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
              animation: 'shimmer 2s ease-in-out infinite'
            }}>
            </div>
            
            <div style={{
              color: 'white',
              textShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}>
              <img src={logo} width="110px" alt="HRNet Logo" />
            </div>
          </div>
          
          <h1 style={{
            fontSize: '2rem',
            fontWeight: '700',
            color: '#2e382e',
            marginBottom: '0.5rem',
            letterSpacing: '-0.025em',
            margin: '0 0 0.5rem 0'
          }}>
            Welcome Back
          </h1>
          
          <p style={{
            fontSize: '1rem',
            color: '#799496',
            fontWeight: '500',
            margin: 0
          }}>
            Sign in to your HRNet account
          </p>
        </div>

        {/* Messages */}
        {error && (
          <div style={{
            background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
            border: '1px solid #fca5a5',
            color: '#dc2626',
            padding: '0.75rem 1rem',
            borderRadius: '8px',
            fontSize: '0.875rem',
            fontWeight: '500',
            marginBottom: '1rem'
          }}>
            {error}
          </div>
        )}
        
        {success && (
          <div style={{
            background: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
            border: '1px solid #86efac',
            color: '#16a34a',
            padding: '0.75rem 1rem',
            borderRadius: '8px',
            fontSize: '0.875rem',
            fontWeight: '500',
            marginBottom: '1rem'
          }}>
            {success}
          </div>
        )}

        {/* Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Staff ID Input */}
          <div>
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              color: '#2e382e',
              fontWeight: '600',
              fontSize: '0.875rem'
            }}>
              Staff ID
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <svg style={{
                position: 'absolute',
                left: '1rem',
                color: '#799496',
                zIndex: 2,
                width: '1.25rem',
                height: '1.25rem'
              }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
              </svg>
              <input
                type="text"
                name="staff_id"
                value={formData.staff_id}
                onChange={handleInputChange}
                onKeyPress={handleKeyPress}
                placeholder="Please enter your staff ID"
                style={{
                  width: '100%',
                  padding: '1rem 1rem 1rem 3rem',
                  border: '2px solid #e5e7eb',
                  borderRadius: '12px',
                  fontSize: '1rem',
                  outline: 'none',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  background: 'rgba(255, 255, 255, 0.8)',
                  backdropFilter: 'blur(10px)',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#799496';
                  e.target.style.boxShadow = '0 0 0 4px rgba(121, 148, 150, 0.15)';
                  e.target.style.transform = 'translateY(-1px)';
                  e.target.style.background = 'rgba(255, 255, 255, 0.95)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#e5e7eb';
                  e.target.style.boxShadow = 'none';
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.background = 'rgba(255, 255, 255, 0.8)';
                }}
                required
              />
            </div>
          </div>

          {/* Password Input */}
          <div>
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              color: '#2e382e',
              fontWeight: '600',
              fontSize: '0.875rem'
            }}>
              Password
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <svg style={{
                position: 'absolute',
                left: '1rem',
                color: '#799496',
                zIndex: 2,
                width: '1.25rem',
                height: '1.25rem'
              }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
              </svg>
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                onKeyPress={handleKeyPress}
                placeholder="Please enter your password"
                style={{
                  width: '100%',
                  padding: '1rem 3rem 1rem 3rem',
                  border: '2px solid #e5e7eb',
                  borderRadius: '12px',
                  fontSize: '1rem',
                  outline: 'none',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  background: 'rgba(255, 255, 255, 0.8)',
                  backdropFilter: 'blur(10px)',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#799496';
                  e.target.style.boxShadow = '0 0 0 4px rgba(121, 148, 150, 0.15)';
                  e.target.style.transform = 'translateY(-1px)';
                  e.target.style.background = 'rgba(255, 255, 255, 0.95)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#e5e7eb';
                  e.target.style.boxShadow = 'none';
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.background = 'rgba(255, 255, 255, 0.8)';
                }}
                required
              />
              <button
                type="button"
                onClick={togglePasswordVisibility}
                style={{
                  position: 'absolute',
                  right: '1rem',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#6b7280',
                  padding: '0.5rem',
                  borderRadius: '6px',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.color = '#799496';
                  e.target.style.background = 'rgba(121, 148, 150, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.color = '#6b7280';
                  e.target.style.background = 'none';
                }}
              >
                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {showPassword ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                  ) : (
                    <>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </>
                  )}
                </svg>
              </button>
            </div>
          </div>

          {/* Remember Me */}
          <div style={{
            display: 'flex',
            justifyContent: 'flex-start',
            alignItems: 'center',
            margin: '1rem 0'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              cursor: 'pointer',
              userSelect: 'none'
            }}>
              <input
                type="checkbox"
                id="rememberMe"
                name="rememberMe"
                checked={formData.rememberMe}
                onChange={handleInputChange}
                style={{
                  width: '1.125rem',
                  height: '1.125rem',
                  border: '2px solid #e5e7eb',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  accentColor: '#799496'
                }}
              />
              <label htmlFor="rememberMe" style={{
                fontSize: '0.875rem',
                color: '#6b7280',
                cursor: 'pointer',
                margin: 0
              }}>
                Remember me
              </label>
            </div>
          </div>

          {/* Login Button */}
          <button
            onClick={handleLogin}
            disabled={isLoading}
            style={{
              width: '100%',
              padding: '1rem 1.5rem',
              background: isLoading ? '#9ca3af' : 'linear-gradient(135deg, #254e70 0%, #799496 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              position: 'relative',
              overflow: 'hidden',
              boxShadow: '0 4px 15px rgba(37, 78, 112, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem'
            }}
            onMouseEnter={(e) => {
              if (!isLoading) {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 8px 25px rgba(37, 78, 112, 0.3)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isLoading) {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 4px 15px rgba(37, 78, 112, 0.2)';
              }
            }}
          >
            {isLoading && (
              <div style={{
                width: '20px',
                height: '20px',
                border: '2px solid rgba(255, 255, 255, 0.3)',
                borderRadius: '50%',
                borderTopColor: 'white',
                animation: 'spin 0.8s linear infinite'
              }}></div>
            )}
            <span>{isLoading ? 'Signing in...' : 'Sign In'}</span>
          </button>
        </div>
      </div>

      {/* Add keyframes as inline styles */}
      <style>{`
        @keyframes shimmer {
          0% { left: -100%; }
          50% { left: 100%; }
          100% { left: 100%; }
        }
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        
        @keyframes slideInUp {
          from {
            opacity: 0;
            transform: translateY(30px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        
        @media (max-width: 768px) {
          .login-card {
            padding: 2rem 1.5rem !important;
            margin: 1rem !important;
            border-radius: 16px !important;
          }
        }
        
        @media (max-width: 480px) {
          .login-card {
            padding: 1.5rem 1rem !important;
            max-width: none !important;
            margin: 0.5rem !important;
          }
        }
      `}</style>
    </div>
  );
};

export default LoginPage;