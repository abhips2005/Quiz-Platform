import React, { useState, useEffect, useCallback } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useAuth } from '../contexts/SupabaseAuthContext';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import './Auth.css';

// Debounce hook for username checking
const useDebounce = (value: string, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

const Register: React.FC = () => {
  const { dbUser, register, isLoading: authLoading, isInitialized, error: authError, clearError } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    username: '',
    role: 'STUDENT' as 'STUDENT' | 'TEACHER',
    grade: '',
    school: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});
  const [usernameAvailability, setUsernameAvailability] = useState<{
    checking: boolean;
    available: boolean | null;
    error: string | null;
  }>({
    checking: false,
    available: null,
    error: null
  });

  const debouncedUsername = useDebounce(formData.username, 500);

  // Clear any auth errors when component mounts
  useEffect(() => {
    clearError();
  }, [clearError]);

  // Show auth errors as toasts
  useEffect(() => {
    if (authError) {
      toast.error(authError);
    }
  }, [authError]);

  // Check username availability
  const checkUsernameAvailability = useCallback(async (username: string) => {
    if (!username || username.length < 3) {
      setUsernameAvailability({ checking: false, available: null, error: null });
      return;
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      setUsernameAvailability({ 
        checking: false, 
        available: false, 
        error: 'Username can only contain letters, numbers, underscores, and hyphens' 
      });
      return;
    }

    setUsernameAvailability({ checking: true, available: null, error: null });

    try {
      const apiUrl = import.meta.env.VITE_API_URL;
      if (!apiUrl) {
        throw new Error('API URL not configured');
      }

      const response = await fetch(`${apiUrl}/auth/check-username/${username}`);
      
      if (response.ok) {
        const data = await response.json();
        setUsernameAvailability({
          checking: false,
          available: data.data.available,
          error: null
        });
      } else {
        throw new Error('Failed to check username availability');
      }
    } catch (error: any) {
      console.error('Username check error:', error);
      setUsernameAvailability({
        checking: false,
        available: null,
        error: 'Unable to check username availability'
      });
    }
  }, []);

  // Check username when debounced value changes
  useEffect(() => {
    if (debouncedUsername && debouncedUsername === formData.username) {
      checkUsernameAvailability(debouncedUsername);
    }
  }, [debouncedUsername, formData.username, checkUsernameAvailability]);

  // Redirect if already logged in
  if (dbUser && isInitialized) {
    return <Navigate to="/dashboard" replace />;
  }

  // Show loading if auth is still initializing
  if (!isInitialized) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <h1>Loading...</h1>
            <p>Checking authentication status</p>
          </div>
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <div className="loading-spinner"></div>
          </div>
        </div>
      </div>
    );
  }

  const validateForm = () => {
    const errors: { [key: string]: string } = {};

    // First name validation
    if (!formData.firstName.trim()) {
      errors.firstName = 'First name is required';
    } else if (formData.firstName.trim().length > 50) {
      errors.firstName = 'First name must be less than 50 characters';
    }

    // Last name validation
    if (!formData.lastName.trim()) {
      errors.lastName = 'Last name is required';
    } else if (formData.lastName.trim().length > 50) {
      errors.lastName = 'Last name must be less than 50 characters';
    }

    // Email validation
    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      errors.email = 'Please enter a valid email address';
    }

    // Username validation
    if (!formData.username.trim()) {
      errors.username = 'Username is required';
    } else if (formData.username.trim().length < 3) {
      errors.username = 'Username must be at least 3 characters';
    } else if (formData.username.trim().length > 30) {
      errors.username = 'Username must be less than 30 characters';
    } else if (!/^[a-zA-Z0-9_-]+$/.test(formData.username.trim())) {
      errors.username = 'Username can only contain letters, numbers, underscores, and hyphens';
    } else if (usernameAvailability.available === false) {
      errors.username = 'Username is already taken';
    }

    // Password validation
    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    } else if (formData.password.length > 128) {
      errors.password = 'Password must be less than 128 characters';
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      errors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    // Role-specific validation
    if (formData.role === 'STUDENT') {
      if (formData.grade && formData.grade.trim().length > 20) {
        errors.grade = 'Grade must be less than 20 characters';
      }
    }

    // School validation
    if (formData.school && formData.school.trim().length > 100) {
      errors.school = 'School name must be less than 100 characters';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear field error when user starts typing
    if (formErrors[name]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }

    // Reset username availability when username changes
    if (name === 'username') {
      setUsernameAvailability({ checking: false, available: null, error: null });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      // Focus on first error field
      const firstErrorField = Object.keys(formErrors)[0];
      const element = document.getElementById(firstErrorField) as HTMLInputElement;
      element?.focus();
      return;
    }

    // Wait for username check if still checking
    if (usernameAvailability.checking) {
      toast.error('Please wait while we check username availability');
      return;
    }

    if (usernameAvailability.available === false) {
      toast.error('Please choose a different username');
      const usernameInput = document.getElementById('username') as HTMLInputElement;
      usernameInput?.focus();
      return;
    }

    if (isSubmitting || authLoading) {
      return; // Prevent double submission
    }

    setIsSubmitting(true);

    try {
      const registerData = {
        email: formData.email.trim(),
        password: formData.password,
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        username: formData.username.trim(),
        role: formData.role,
        grade: formData.grade.trim() || undefined,
        school: formData.school.trim() || undefined,
      };

      await register(registerData);
      toast.success('Account created successfully! Welcome to Quizizz Platform!');
      // Navigation will happen automatically via the auth context
    } catch (error: any) {
      console.error('Registration error:', error);
      
      // Focus on relevant field based on error
      if (error.message?.includes('email')) {
        const emailInput = document.getElementById('email') as HTMLInputElement;
        emailInput?.focus();
      } else if (error.message?.includes('username')) {
        const usernameInput = document.getElementById('username') as HTMLInputElement;
        usernameInput?.focus();
      } else if (error.message?.includes('password')) {
        const passwordInput = document.getElementById('password') as HTMLInputElement;
        passwordInput?.focus();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const getUsernameStatusClass = () => {
    if (usernameAvailability.checking) return 'checking';
    if (usernameAvailability.available === true) return 'available';
    if (usernameAvailability.available === false) return 'unavailable';
    return '';
  };

  const getUsernameStatusMessage = () => {
    if (usernameAvailability.checking) return 'Checking availability...';
    if (usernameAvailability.available === true) return 'Username is available!';
    if (usernameAvailability.available === false) return 'Username is already taken';
    if (usernameAvailability.error) return usernameAvailability.error;
    return '';
  };

  const isLoading = authLoading || isSubmitting;

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1>Create Account</h1>
          <p>Join Quizizz Platform and start your learning journey</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form" noValidate>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="firstName">First Name</label>
              <input
                type="text"
                id="firstName"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                placeholder="Enter your first name"
                className={`form-input ${formErrors.firstName ? 'error' : ''}`}
                required
                disabled={isLoading}
                autoComplete="given-name"
                autoFocus
              />
              {formErrors.firstName && (
                <span className="error-message">{formErrors.firstName}</span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="lastName">Last Name</label>
              <input
                type="text"
                id="lastName"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                placeholder="Enter your last name"
                className={`form-input ${formErrors.lastName ? 'error' : ''}`}
                required
                disabled={isLoading}
                autoComplete="family-name"
              />
              {formErrors.lastName && (
                <span className="error-message">{formErrors.lastName}</span>
              )}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Enter your email"
              className={`form-input ${formErrors.email ? 'error' : ''}`}
              required
              disabled={isLoading}
              autoComplete="email"
            />
            {formErrors.email && (
              <span className="error-message">{formErrors.email}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              placeholder="Choose a unique username"
              className={`form-input ${formErrors.username ? 'error' : ''} ${getUsernameStatusClass()}`}
              required
              disabled={isLoading}
              autoComplete="username"
            />
            {getUsernameStatusMessage() && (
              <span className={`username-status ${getUsernameStatusClass()}`}>
                {getUsernameStatusMessage()}
              </span>
            )}
            {formErrors.username && (
              <span className="error-message">{formErrors.username}</span>
            )}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <div className="password-input-wrapper">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Create a password"
                  className={`form-input ${formErrors.password ? 'error' : ''}`}
                  required
                  disabled={isLoading}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="password-toggle"
                  disabled={isLoading}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeSlashIcon /> : <EyeIcon />}
                </button>
              </div>
              {formErrors.password && (
                <span className="error-message">{formErrors.password}</span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <div className="password-input-wrapper">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Confirm your password"
                  className={`form-input ${formErrors.confirmPassword ? 'error' : ''}`}
                  required
                  disabled={isLoading}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="password-toggle"
                  disabled={isLoading}
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <EyeSlashIcon /> : <EyeIcon />}
                </button>
              </div>
              {formErrors.confirmPassword && (
                <span className="error-message">{formErrors.confirmPassword}</span>
              )}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="role">I am a</label>
            <select
              id="role"
              name="role"
              value={formData.role}
              onChange={handleChange}
              className="form-select"
              required
              disabled={isLoading}
            >
              <option value="STUDENT">Student</option>
              <option value="TEACHER">Teacher</option>
            </select>
          </div>

          <div className="form-row">
            {formData.role === 'STUDENT' && (
              <div className="form-group">
                <label htmlFor="grade">Grade (Optional)</label>
                <input
                  type="text"
                  id="grade"
                  name="grade"
                  value={formData.grade}
                  onChange={handleChange}
                  placeholder="e.g., 9th Grade, College"
                  className={`form-input ${formErrors.grade ? 'error' : ''}`}
                  disabled={isLoading}
                />
                {formErrors.grade && (
                  <span className="error-message">{formErrors.grade}</span>
                )}
              </div>
            )}

            <div className="form-group">
              <label htmlFor="school">School/Institution (Optional)</label>
              <input
                type="text"
                id="school"
                name="school"
                value={formData.school}
                onChange={handleChange}
                placeholder="Enter your school name"
                className={`form-input ${formErrors.school ? 'error' : ''}`}
                disabled={isLoading}
              />
              {formErrors.school && (
                <span className="error-message">{formErrors.school}</span>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || usernameAvailability.checking}
            className="auth-submit-btn"
          >
            {isSubmitting ? (
              <>
                <div className="loading-spinner small"></div>
                Creating Account...
              </>
            ) : (
              'Create Account'
            )}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            Already have an account?{' '}
            <Link to="/login" className="auth-link">
              Sign in here
            </Link>
          </p>
        </div>

        {/* Development mode helper */}
        {import.meta.env.DEV && (
          <div className="dev-helper">
            <p>Development Mode - Quick Fill:</p>
            <button
              type="button"
              onClick={() => {
                setFormData({
                  ...formData,
                  firstName: 'John',
                  lastName: 'Student',
                  email: 'john.student@example.com',
                  username: 'johnstudent' + Math.floor(Math.random() * 1000),
                  password: 'password123',
                  confirmPassword: 'password123',
                  role: 'STUDENT',
                  grade: '10th Grade',
                  school: 'Example High School'
                });
              }}
              className="dev-fill-btn"
            >
              Fill Student Data
            </button>
            <button
              type="button"
              onClick={() => {
                setFormData({
                  ...formData,
                  firstName: 'Jane',
                  lastName: 'Teacher',
                  email: 'jane.teacher@example.com',
                  username: 'janeteacher' + Math.floor(Math.random() * 1000),
                  password: 'password123',
                  confirmPassword: 'password123',
                  role: 'TEACHER',
                  grade: '',
                  school: 'Example University'
                });
              }}
              className="dev-fill-btn"
            >
              Fill Teacher Data
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Register; 