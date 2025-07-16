import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import { motion } from 'framer-motion';
import {
  ArrowLeftIcon,
  PlayCircleIcon,
  UsersIcon,
  ClipboardDocumentListIcon,
  CalendarDaysIcon,
  ArrowTrendingUpIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/SupabaseAuthContext';
import { analyticsApi } from '../../services/analytics';
import type { QuizAnalytics } from '../../services/analytics';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const QuizAnalyticsDetail: React.FC = () => {
  const { quizId } = useParams<{ quizId: string }>();
  const [quizData, setQuizData] = useState<QuizAnalytics | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { getAccessToken } = useAuth();

  useEffect(() => {
    if (quizId) {
      fetchQuizAnalytics();
    }
  }, [quizId]);

  const fetchQuizAnalytics = async () => {
    try {
      setLoading(true);
      const token = await getAccessToken();
      if (!token) {
        setError('Authentication required');
        return;
      }
      const response = await analyticsApi.getQuizAnalytics(token, quizId!);
      setQuizData(response.data);
      setError(null);
    } catch (err) {
      setError('Failed to load quiz analytics');
      console.error('Quiz analytics error:', err);
    } finally {
      setLoading(false);
    }
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !quizData) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 mb-4">{error || 'Quiz not found'}</div>
        <Link
          to="/analytics"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          Back to Analytics
        </Link>
      </div>
    );
  }

  const { quiz, questionPerformance, usageStats, recentGames } = quizData;

  // Question performance chart
  const questionPerformanceData = {
    labels: questionPerformance.map((q, index) => `Q${index + 1}`),
    datasets: [
      {
        label: 'Accuracy (%)',
        data: questionPerformance.map(q => q.accuracy),
        backgroundColor: questionPerformance.map(q => 
          q.accuracy >= 80 ? 'rgba(16, 185, 129, 0.8)' :
          q.accuracy >= 60 ? 'rgba(245, 158, 11, 0.8)' :
          'rgba(239, 68, 68, 0.8)'
        ),
      },
    ],
  };

  // Average time chart
  const averageTimeData = {
    labels: questionPerformance.map((q, index) => `Q${index + 1}`),
    datasets: [
      {
        label: 'Average Time (seconds)',
        data: questionPerformance.map(q => q.averageTime),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
      },
    ],
  };

  // Popularity trend chart
  const popularityTrendData = {
    labels: usageStats.popularityTrend.map(item => 
      new Date(item.date).toLocaleDateString()
    ),
    datasets: [
      {
        label: 'Games Played',
        data: usageStats.popularityTrend.map(item => item.count),
        borderColor: 'rgb(16, 185, 129)',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        tension: 0.4,
      },
    ],
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link
              to="/analytics"
              className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{quiz.title}</h1>
              <p className="text-gray-600 mt-1">Quiz Performance Analytics</p>
            </div>
          </div>
        </div>
      </div>

      {/* Usage Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500"
        >
          <div className="flex items-center">
            <PlayCircleIcon className="h-8 w-8 text-blue-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Games</p>
              <p className="text-2xl font-bold text-gray-900">{usageStats.totalGames}</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-500"
        >
          <div className="flex items-center">
            <UsersIcon className="h-8 w-8 text-green-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Players</p>
              <p className="text-2xl font-bold text-gray-900">{usageStats.totalPlayers}</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-purple-500"
        >
          <div className="flex items-center">
            <ArrowTrendingUpIcon className="h-8 w-8 text-purple-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Avg Players/Game</p>
              <p className="text-2xl font-bold text-gray-900">
                {Math.round(usageStats.averagePlayersPerGame)}
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-yellow-500"
        >
          <div className="flex items-center">
            <CalendarDaysIcon className="h-8 w-8 text-yellow-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Last Played</p>
              <p className="text-sm font-bold text-gray-900">
                {usageStats.lastPlayed 
                  ? new Date(usageStats.lastPlayed).toLocaleDateString()
                  : 'Never'
                }
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-lg mb-8">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6">
            {[
              { id: 'overview', name: 'Overview', icon: ChartBarIcon },
              { id: 'questions', name: 'Question Performance', icon: ClipboardDocumentListIcon },
              { id: 'games', name: 'Recent Games', icon: PlayCircleIcon },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="h-5 w-5" />
                <span>{tab.name}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="space-y-8">
              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-gray-50 rounded-lg p-6"
                >
                  <h3 className="text-lg font-semibold mb-4">Question Accuracy Overview</h3>
                  <div className="h-64">
                    <Bar data={questionPerformanceData} options={chartOptions} />
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 }}
                  className="bg-gray-50 rounded-lg p-6"
                >
                  <h3 className="text-lg font-semibold mb-4">Average Response Time</h3>
                  <div className="h-64">
                    <Line data={averageTimeData} options={chartOptions} />
                  </div>
                </motion.div>
              </div>

              {/* Popularity Trend */}
              {usageStats.popularityTrend.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 }}
                  className="bg-gray-50 rounded-lg p-6"
                >
                  <h3 className="text-lg font-semibold mb-4">Usage Trend (Last 30 Days)</h3>
                  <div className="h-64">
                    <Line data={popularityTrendData} options={chartOptions} />
                  </div>
                </motion.div>
              )}

              {/* Quiz Info */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-gray-50 rounded-lg p-6"
              >
                <h3 className="text-lg font-semibold mb-4">Quiz Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Description</h4>
                    <p className="text-gray-700">{quiz.description || 'No description available'}</p>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <span className="text-sm text-gray-600">Total Questions:</span>
                      <span className="ml-2 font-semibold">{quiz.totalQuestions}</span>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Created:</span>
                      <span className="ml-2 font-semibold">
                        {new Date(quiz.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          )}

          {activeTab === 'questions' && (
            <div className="space-y-6">
              {questionPerformance.map((question, index) => (
                <motion.div
                  key={question.questionId}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-gray-50 rounded-lg p-6"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h4 className="font-semibold text-lg mb-2">Question {index + 1}</h4>
                      <p className="text-gray-700 mb-4">{question.question}</p>
                    </div>
                    <div className="flex space-x-4 text-sm">
                      <div className="text-center">
                        <div className="font-semibold text-2xl text-green-600">
                          {Math.round(question.accuracy)}%
                        </div>
                        <div className="text-gray-600">Accuracy</div>
                      </div>
                      <div className="text-center">
                        <div className="font-semibold text-2xl text-blue-600">
                          {question.averageTime}s
                        </div>
                        <div className="text-gray-600">Avg Time</div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-white rounded-lg p-4">
                      <div className="text-sm text-gray-600 mb-1">Times Asked</div>
                      <div className="text-2xl font-bold">{question.timesAsked}</div>
                    </div>
                    <div className="bg-white rounded-lg p-4">
                      <div className="text-sm text-gray-600 mb-1">Total Answers</div>
                      <div className="text-2xl font-bold">{question.totalAnswers}</div>
                    </div>
                    <div className="bg-white rounded-lg p-4">
                      <div className="text-sm text-gray-600 mb-1">Correct Answers</div>
                      <div className="text-2xl font-bold text-green-600">{question.correctAnswers}</div>
                    </div>
                    <div className="bg-white rounded-lg p-4">
                      <div className="text-sm text-gray-600 mb-1">Difficulty</div>
                      <div className={`text-sm font-semibold px-2 py-1 rounded ${
                        question.difficultyRating === 'Easy' ? 'bg-green-100 text-green-800' :
                        question.difficultyRating === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                        question.difficultyRating === 'Hard' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {question.difficultyRating}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {activeTab === 'games' && (
            <div className="space-y-4">
              {recentGames.length > 0 ? (
                recentGames.map((game, index) => (
                  <motion.div
                    key={game.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <PlayCircleIcon className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="ml-4">
                        <p className="font-medium text-gray-900">Game {game.id.slice(-8)}</p>
                        <p className="text-sm text-gray-600">
                          {game.playerCount} players • {new Date(game.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        game.status === 'FINISHED' 
                          ? 'bg-green-100 text-green-800'
                          : game.status === 'ACTIVE'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {game.status}
                      </span>
                      
                      <Link
                        to={`/analytics/game/${game.id}`}
                        className="text-blue-600 hover:text-blue-700"
                      >
                        <ChartBarIcon className="h-5 w-5" />
                      </Link>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="text-center py-12 text-gray-500">
                  No games played with this quiz yet
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuizAnalyticsDetail; 
