import React from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../contexts/SupabaseAuthContext';
import './Analytics.css';

const GameAnalytics: React.FC = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const { user } = useAuth();

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div className="game-analytics">
      <div className="page-header">
        <h1>Game Analytics</h1>
        <p>Analytics for Game ID: {gameId}</p>
      </div>

      <div className="analytics-grid">
        <div className="analytics-card">
          <h3>Players Participated</h3>
          <p className="stat-number">Coming Soon</p>
        </div>

        <div className="analytics-card">
          <h3>Average Score</h3>
          <p className="stat-number">Coming Soon</p>
        </div>

        <div className="analytics-card">
          <h3>Completion Rate</h3>
          <p className="stat-number">Coming Soon</p>
        </div>

        <div className="analytics-card">
          <h3>Duration</h3>
          <p className="stat-number">Coming Soon</p>
        </div>
      </div>

      <div className="analytics-message">
        <h3>Game Analytics Coming Soon</h3>
        <p>Detailed game analytics will be available after the Firebase authentication migration is complete.</p>
      </div>
    </div>
  );
};

export default GameAnalytics; 