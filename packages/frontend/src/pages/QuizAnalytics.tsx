import React from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../contexts/SupabaseAuthContext';
import './Analytics.css';

const QuizAnalytics: React.FC = () => {
  const { quizId } = useParams<{ quizId: string }>();
  const { user } = useAuth();

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div className="quiz-analytics">
      <div className="page-header">
        <h1>Quiz Analytics</h1>
        <p>Analytics for Quiz ID: {quizId}</p>
      </div>

      <div className="analytics-grid">
        <div className="analytics-card">
          <h3>Times Played</h3>
          <p className="stat-number">Coming Soon</p>
        </div>

        <div className="analytics-card">
          <h3>Average Score</h3>
          <p className="stat-number">Coming Soon</p>
        </div>

        <div className="analytics-card">
          <h3>Difficulty Rating</h3>
          <p className="stat-number">Coming Soon</p>
        </div>

        <div className="analytics-card">
          <h3>Popular Questions</h3>
          <p className="stat-number">Coming Soon</p>
        </div>
      </div>

      <div className="analytics-message">
        <h3>Quiz Analytics Coming Soon</h3>
        <p>Detailed quiz analytics will be available after the Firebase authentication migration is complete.</p>
      </div>
    </div>
  );
};

export default QuizAnalytics; 