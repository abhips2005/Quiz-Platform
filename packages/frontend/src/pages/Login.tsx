import React, { useState, useEffect } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useAuth } from '../contexts/SupabaseAuthContext';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import './Auth.css';

const Login: React.FC = () => {
  const { dbUser, login, isLoading: authLoading, isInitialized, error: authError, clearError } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<{ [key: string]: string }>({});

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

    // Email validation
    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      errors.email = 'Please enter a valid email address';
    }

    // Password validation
    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    if (isSubmitting || authLoading) {
      return; // Prevent double submission
    }

    setIsSubmitting(true);

    try {
      await login(formData.email.trim(), formData.password);
      toast.success('Welcome back!');
      // Navigation will happen automatically via the auth context
    } catch (error: any) {
      console.error('Login error:', error);
      
      // Don't show toast here since authError will handle it
      // Just focus on the first error field
      if (error.message?.includes('email') || error.message?.includes('credentials')) {
        const emailInput = document.getElementById('email') as HTMLInputElement;
        emailInput?.focus();
      } else if (error.message?.includes('password')) {
        const passwordInput = document.getElementById('password') as HTMLInputElement;
        passwordInput?.focus();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!formData.email.trim()) {
      toast.error('Please enter your email address first');
      const emailInput = document.getElementById('email') as HTMLInputElement;
      emailInput?.focus();
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      toast.error('Please enter a valid email address');
      const emailInput = document.getElementById('email') as HTMLInputElement;
      emailInput?.focus();
      return;
    }

    try {
      const { supabase } = await import('../config/supabase');
      const { error } = await supabase.auth.resetPasswordForEmail(formData.email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`
      });

      if (error) {
        throw error;
      }

      toast.success('Password reset email sent! Please check your inbox.');
    } catch (error: any) {
      console.error('Password reset error:', error);
      toast.error(error.message || 'Failed to send password reset email');
    }
  };

  const isLoading = authLoading || isSubmitting;

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1>Welcome Back!</h1>
          <p>Sign in to your account to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form" noValidate>
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
              autoFocus
            />
            {formErrors.email && (
              <span className="error-message">{formErrors.email}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div className="password-input-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter your password"
                className={`form-input ${formErrors.password ? 'error' : ''}`}
                required
                disabled={isLoading}
                autoComplete="current-password"
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
            <button
              type="button"
              onClick={handleForgotPassword}
              className="forgot-password-btn"
              disabled={isLoading}
            >
              Forgot your password?
            </button>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="auth-submit-btn"
          >
            {isSubmitting ? (
              <>
                <div className="loading-spinner small"></div>
                Signing In...
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            Don't have an account?{' '}
            <Link to="/register" className="auth-link">
              Sign up here
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
                  email: 'student@example.com',
                  password: 'password123'
                });
              }}
              className="dev-fill-btn"
            >
              Fill Student Credentials
            </button>
            <button
              type="button"
              onClick={() => {
                setFormData({
                  email: 'teacher@example.com',
                  password: 'password123'
                });
              }}
              className="dev-fill-btn"
            >
              Fill Teacher Credentials
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Login; 