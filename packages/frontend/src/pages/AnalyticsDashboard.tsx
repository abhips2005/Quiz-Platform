import React from 'react';
import { useAuth } from '../contexts/SupabaseAuthContext';
import './Analytics.css';

const AnalyticsDashboard: React.FC = () => {
  const { user } = useAuth();

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div className="analytics-dashboard">
      <div className="page-header">
        <h1>Analytics Dashboard</h1>
        <p>Welcome back, {user.firstName}! Here's your analytics overview.</p>
      </div>

      <div className="analytics-grid">
        <div className="analytics-card">
          <h3>Total Quizzes Created</h3>
          <p className="stat-number">Coming Soon</p>
        </div>

        <div className="analytics-card">
          <h3>Total Games Hosted</h3>
          <p className="stat-number">Coming Soon</p>
        </div>

        <div className="analytics-card">
          <h3>Total Students Reached</h3>
          <p className="stat-number">Coming Soon</p>
        </div>

        <div className="analytics-card">
          <h3>Average Quiz Score</h3>
          <p className="stat-number">Coming Soon</p>
        </div>
      </div>

      <div className="analytics-message">
        <h3>Analytics Coming Soon</h3>
        <p>We're working on bringing you detailed analytics and insights. This feature will be available after the Firebase authentication migration is complete.</p>
      </div>
    </div>
  );
};

export default AnalyticsDashboard; 