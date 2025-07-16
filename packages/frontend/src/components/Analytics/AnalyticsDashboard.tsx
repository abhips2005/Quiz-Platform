import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
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
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { motion } from 'framer-motion';
import {
  ArrowTrendingUpIcon,
  UsersIcon,
  ClipboardDocumentListIcon,
  PlayCircleIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  DocumentArrowDownIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/SupabaseAuthContext';
import { analyticsApi } from '../../services/analytics';

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

interface DashboardData {
  overview: {
    totalQuizzes: number;
    totalGames: number;
    totalStudents: number;
    averageAccuracy: number;
    averageGameDuration: number;
  };
  recentActivity: Array<{
    id: string;
    quizTitle: string;
    playerCount: number;
    status: string;
    createdAt: string;
  }>;
  trends: {
    gamesPerDay: Array<{ date: string; count: number }>;
    popularQuizzes: Array<{ id: string; title: string; gamesCount: number }>;
  };
}

const AnalyticsDashboard: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [timeframe, setTimeframe] = useState('30');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { getAccessToken } = useAuth();

  useEffect(() => {
    fetchDashboardData();
  }, [timeframe]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const token = await getAccessToken();
      if (!token) {
        setError('Authentication required');
        return;
      }
      const response = await analyticsApi.getDashboardAnalytics(token, timeframe);
      setDashboardData(response.data);
      setError(null);
    } catch (err) {
      setError('Failed to load analytics data');
      console.error('Analytics error:', err);
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

  const gamesChartData = dashboardData ? {
    labels: dashboardData.trends.gamesPerDay.map(item => 
      new Date(item.date).toLocaleDateString()
    ),
    datasets: [
      {
        label: 'Games Played',
        data: dashboardData.trends.gamesPerDay.map(item => item.count),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
      },
    ],
  } : { labels: [], datasets: [] };

  const popularQuizzesData = dashboardData ? {
    labels: dashboardData.trends.popularQuizzes.map(quiz => quiz.title),
    datasets: [
      {
        label: 'Times Played',
        data: dashboardData.trends.popularQuizzes.map(quiz => quiz.gamesCount),
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)',
          'rgba(16, 185, 129, 0.8)',
          'rgba(245, 158, 11, 0.8)',
          'rgba(239, 68, 68, 0.8)',
          'rgba(139, 92, 246, 0.8)',
        ],
      },
    ],
  } : { labels: [], datasets: [] };

  const accuracyData = dashboardData ? {
    labels: ['Correct', 'Incorrect'],
    datasets: [
      {
        data: [
          dashboardData.overview.averageAccuracy,
          100 - dashboardData.overview.averageAccuracy,
        ],
        backgroundColor: [
          'rgba(16, 185, 129, 0.8)',
          'rgba(239, 68, 68, 0.8)',
        ],
      },
    ],
  } : { labels: [], datasets: [] };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 mb-4">{error}</div>
        <button
          onClick={fetchDashboardData}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-600">No analytics data available</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
            <p className="text-gray-600 mt-2">
              Insights and performance metrics for your quizzes
            </p>
          </div>
          
          {/* Timeframe Selector */}
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Timeframe:</label>
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 3 months</option>
            </select>
          </div>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500"
        >
          <div className="flex items-center">
            <ClipboardDocumentListIcon className="h-8 w-8 text-blue-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Quizzes</p>
              <p className="text-2xl font-bold text-gray-900">
                {dashboardData.overview.totalQuizzes}
              </p>
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
            <PlayCircleIcon className="h-8 w-8 text-green-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Games Played</p>
              <p className="text-2xl font-bold text-gray-900">
                {dashboardData.overview.totalGames}
              </p>
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
            <UsersIcon className="h-8 w-8 text-purple-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Students Reached</p>
              <p className="text-2xl font-bold text-gray-900">
                {dashboardData.overview.totalStudents}
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
            <ArrowTrendingUpIcon className="h-8 w-8 text-yellow-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Avg Accuracy</p>
              <p className="text-2xl font-bold text-gray-900">
                {dashboardData.overview.averageAccuracy}%
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-red-500"
        >
          <div className="flex items-center">
            <CalendarDaysIcon className="h-8 w-8 text-red-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Avg Duration</p>
              <p className="text-2xl font-bold text-gray-900">
                {Math.round(dashboardData.overview.averageGameDuration / 60)}m
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Games Trend Chart */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
          className="bg-white rounded-xl shadow-lg p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Games Activity</h3>
          <div className="h-64">
            <Line data={gamesChartData} options={chartOptions} />
          </div>
        </motion.div>

        {/* Popular Quizzes Chart */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6 }}
          className="bg-white rounded-xl shadow-lg p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Popular Quizzes</h3>
          <div className="h-64">
            <Bar data={popularQuizzesData} options={chartOptions} />
          </div>
        </motion.div>
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Accuracy Breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="bg-white rounded-xl shadow-lg p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Overall Accuracy</h3>
          <div className="h-48">
            <Doughnut 
              data={accuracyData} 
              options={{
                ...chartOptions,
                plugins: {
                  ...chartOptions.plugins,
                  legend: {
                    position: 'bottom' as const,
                  },
                },
              }} 
            />
          </div>
        </motion.div>

        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="lg:col-span-2 bg-white rounded-xl shadow-lg p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
            <Link
              to="/analytics/games"
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              View All
            </Link>
          </div>
          
          <div className="space-y-4">
            {dashboardData.recentActivity.map((activity, index) => (
              <motion.div
                key={activity.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.9 + index * 0.1 }}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <PlayCircleIcon className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <p className="font-medium text-gray-900">{activity.quizTitle}</p>
                    <p className="text-sm text-gray-600">
                      {activity.playerCount} players • {new Date(activity.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    activity.status === 'FINISHED' 
                      ? 'bg-green-100 text-green-800'
                      : activity.status === 'ACTIVE'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {activity.status}
                  </span>
                  
                  <Link
                    to={`/analytics/game/${activity.id}`}
                    className="text-blue-600 hover:text-blue-700"
                  >
                    <ChartBarIcon className="h-5 w-5" />
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard; 
