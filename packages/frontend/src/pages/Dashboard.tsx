import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/SupabaseAuthContext';
import toast from 'react-hot-toast';
import { 
  PlusIcon, 
  PlayIcon, 
  DocumentTextIcon,
  UsersIcon,
  ChartBarIcon,
  ClockIcon,
  AcademicCapIcon,
  StarIcon
} from '@heroicons/react/24/outline';
import './Dashboard.css';

interface DashboardStats {
  totalQuizzes: number;
  publishedQuizzes: number;
  totalStudents: number;
  totalGamesPlayed: number;
  averageScore: number;
  recentActivity: Array<{
    id: string;
    type: 'quiz_created' | 'game_played' | 'student_joined';
    title: string;
    timestamp: string;
  }>;
}

interface QuickQuiz {
  id: string;
  title: string;
  questionsCount: number;
  lastPlayed?: string;
  status: 'DRAFT' | 'PUBLISHED';
}

const Dashboard: React.FC = () => {
  const { dbUser: user, getAccessToken } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [quickQuizzes, setQuickQuizzes] = useState<QuickQuiz[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const token = await getAccessToken();
      
      if (!token) {
        console.error('No access token available');
        return;
      }
      
      // Fetch dashboard stats and recent quizzes in parallel
      const [statsResponse, quizzesResponse] = await Promise.all([
        fetch(`${import.meta.env.VITE_API_URL}/analytics/dashboard`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${import.meta.env.VITE_API_URL}/quizzes?limit=5&status=published`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData.data);
      }

      if (quizzesResponse.ok) {
        const quizzesData = await quizzesResponse.json();
        setQuickQuizzes(quizzesData.data.quizzes || []);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const startQuickGame = async (quizId: string) => {
    try {
      const token = await getAccessToken();
      
      if (!token) {
        toast.error('Authentication required');
        return;
      }
      
      const response = await fetch(`${import.meta.env.VITE_API_URL}/games`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          quizId,
          gameMode: 'LIVE',
          settings: {
            showAnswers: true,
            randomizeQuestions: false
          }
        })
      });

      if (response.ok) {
        const data = await response.json();
        const gamePin = data.data.game.pin;
        window.open(`/game/host/${gamePin}`, '_blank');
      }
    } catch (error) {
      console.error('Failed to start game:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner"></div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div className="welcome-section">
          <h1>Welcome back, {user?.firstName}! 👋</h1>
          <p>Ready to create some amazing quizzes today?</p>
        </div>
        <div className="quick-actions">
          <Link to="/quiz/create" className="create-quiz-btn">
            <PlusIcon className="icon" />
            Create Quiz
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon quiz-icon">
            <DocumentTextIcon />
          </div>
          <div className="stat-content">
            <div className="stat-number">{stats?.totalQuizzes || 0}</div>
            <div className="stat-label">Total Quizzes</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon students-icon">
            <UsersIcon />
          </div>
          <div className="stat-content">
            <div className="stat-number">{stats?.totalStudents || 0}</div>
            <div className="stat-label">Students Reached</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon games-icon">
            <PlayIcon />
          </div>
          <div className="stat-content">
            <div className="stat-number">{stats?.totalGamesPlayed || 0}</div>
            <div className="stat-label">Games Played</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon score-icon">
            <StarIcon />
          </div>
          <div className="stat-content">
            <div className="stat-number">{stats?.averageScore?.toFixed(1) || '0.0'}%</div>
            <div className="stat-label">Avg. Score</div>
          </div>
        </div>
      </div>

      <div className="dashboard-content">
        {/* Quick Start Section */}
        <div className="quick-start-section">
          <h2>Quick Start</h2>
          <div className="quick-start-grid">
            {quickQuizzes.length > 0 ? (
              quickQuizzes.map((quiz) => (
                <div key={quiz.id} className="quick-quiz-card">
                  <div className="quiz-info">
                    <h3>{quiz.title}</h3>
                    <p>{quiz.questionsCount} questions</p>
                    {quiz.lastPlayed && (
                      <small>Last played: {new Date(quiz.lastPlayed).toLocaleDateString()}</small>
                    )}
                  </div>
                  <div className="quiz-actions">
                    <button 
                      onClick={() => startQuickGame(quiz.id)}
                      className="play-btn"
                      title="Start Live Game"
                    >
                      <PlayIcon className="icon" />
                    </button>
                    <Link 
                      to={`/quiz/edit/${quiz.id}`}
                      className="edit-btn"
                      title="Edit Quiz"
                    >
                      <DocumentTextIcon className="icon" />
                    </Link>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state">
                <AcademicCapIcon className="empty-icon" />
                <h3>No quizzes yet</h3>
                <p>Create your first quiz to get started!</p>
                <Link to="/quiz/create" className="create-first-quiz-btn">
                  <PlusIcon className="icon" />
                  Create Your First Quiz
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        {stats?.recentActivity && stats.recentActivity.length > 0 && (
          <div className="recent-activity-section">
            <h2>Recent Activity</h2>
            <div className="activity-list">
              {stats.recentActivity.map((activity) => (
                <div key={activity.id} className="activity-item">
                  <div className="activity-icon">
                    {activity.type === 'quiz_created' && <DocumentTextIcon />}
                    {activity.type === 'game_played' && <PlayIcon />}
                    {activity.type === 'student_joined' && <UsersIcon />}
                  </div>
                  <div className="activity-content">
                    <div className="activity-title">{activity.title}</div>
                    <div className="activity-time">
                      <ClockIcon className="time-icon" />
                      {new Date(activity.timestamp).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tips for Teachers */}
        <div className="tips-section">
          <h2>💡 Tips for Better Quizzes</h2>
          <div className="tips-grid">
            <div className="tip-card">
              <ChartBarIcon className="tip-icon" />
              <h3>Use Analytics</h3>
              <p>Check which questions students find difficult and adjust accordingly.</p>
            </div>
            <div className="tip-card">
              <ClockIcon className="tip-icon" />
              <h3>Time Management</h3>
              <p>Set appropriate time limits - not too short, not too long.</p>
            </div>
            <div className="tip-card">
              <UsersIcon className="tip-icon" />
              <h3>Engage Students</h3>
              <p>Mix different question types to keep students engaged.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 