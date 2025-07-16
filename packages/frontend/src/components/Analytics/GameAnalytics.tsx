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
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  ArrowLeftIcon,
  DocumentArrowDownIcon,
  UserGroupIcon,
  ClockIcon,
  TrophyIcon,
  ChartBarIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../../contexts/SupabaseAuthContext';
import { analyticsApi } from '../../services/analytics';
import type { GameAnalytics } from '../../services/analytics';

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

const GameAnalyticsDetail: React.FC = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const [gameData, setGameData] = useState<GameAnalytics | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const { getAccessToken } = useAuth();

  useEffect(() => {
    if (gameId) {
      fetchGameAnalytics();
    }
  }, [gameId]);

  const fetchGameAnalytics = async () => {
    try {
      setLoading(true);
      const token = await getAccessToken();
      if (!token) {
        setError('Authentication required');
        return;
      }
      const response = await analyticsApi.getGameAnalytics(token, gameId!);
      setGameData(response.data);
      setError(null);
    } catch (err) {
      setError('Failed to load game analytics');
      console.error('Game analytics error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      setExporting(true);
      const token = await getAccessToken();
      if (!token) {
        toast.error('Authentication required');
        return;
      }
      await analyticsApi.exportGameCSV(token, gameId!);
      toast.success('CSV export started');
    } catch (error) {
      toast.error('Failed to export CSV');
    } finally {
      setExporting(false);
    }
  };

  const handleExportPDF = async () => {
    try {
      setExporting(true);
      const token = await getAccessToken();
      if (!token) {
        toast.error('Authentication required');
        return;
      }
      await analyticsApi.exportGamePDF(token, gameId!);
      toast.success('PDF export started');
    } catch (error) {
      toast.error('Failed to export PDF');
    } finally {
      setExporting(false);
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

  if (error || !gameData) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 mb-4">{error || 'Game not found'}</div>
        <Link
          to="/analytics"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          Back to Analytics
        </Link>
      </div>
    );
  }

  const { summary, questionAnalytics, playerAnalytics } = gameData;

  // Question accuracy chart
  const questionAccuracyData = {
    labels: questionAnalytics.map((q, index) => `Q${index + 1}`),
    datasets: [
      {
        label: 'Accuracy (%)',
        data: questionAnalytics.map(q => q.accuracy),
        backgroundColor: questionAnalytics.map(q => 
          q.accuracy >= 80 ? 'rgba(16, 185, 129, 0.8)' :
          q.accuracy >= 60 ? 'rgba(245, 158, 11, 0.8)' :
          'rgba(239, 68, 68, 0.8)'
        ),
      },
    ],
  };

  // Score distribution chart
  const scoreRanges = ['0-25%', '26-50%', '51-75%', '76-100%'];
  const scoreDistribution = playerAnalytics.reduce((acc, player) => {
    const percentage = (player.finalScore / Math.max(...playerAnalytics.map(p => p.finalScore))) * 100;
    if (percentage <= 25) acc[0]++;
    else if (percentage <= 50) acc[1]++;
    else if (percentage <= 75) acc[2]++;
    else acc[3]++;
    return acc;
  }, [0, 0, 0, 0]);

  const scoreDistributionData = {
    labels: scoreRanges,
    datasets: [
      {
        data: scoreDistribution,
        backgroundColor: [
          'rgba(239, 68, 68, 0.8)',
          'rgba(245, 158, 11, 0.8)',
          'rgba(59, 130, 246, 0.8)',
          'rgba(16, 185, 129, 0.8)',
        ],
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
              <h1 className="text-3xl font-bold text-gray-900">{summary.quizTitle}</h1>
              <p className="text-gray-600 mt-1">Game Analytics Report</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={handleExportCSV}
              disabled={exporting}
              className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              <DocumentArrowDownIcon className="h-5 w-5" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={handleExportPDF}
              disabled={exporting}
              className="flex items-center space-x-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              <DocumentArrowDownIcon className="h-5 w-5" />
              <span>Export PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* Game Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500"
        >
          <div className="flex items-center">
            <UserGroupIcon className="h-8 w-8 text-blue-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Players</p>
              <p className="text-2xl font-bold text-gray-900">{summary.totalPlayers}</p>
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
            <TrophyIcon className="h-8 w-8 text-green-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Average Score</p>
              <p className="text-2xl font-bold text-gray-900">{Math.round(summary.averageScore)}</p>
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
            <CheckCircleIcon className="h-8 w-8 text-purple-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Completion Rate</p>
              <p className="text-2xl font-bold text-gray-900">{Math.round(summary.completionRate)}%</p>
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
            <ClockIcon className="h-8 w-8 text-yellow-500" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Duration</p>
              <p className="text-2xl font-bold text-gray-900">{Math.round(summary.duration / 60)}m</p>
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
              { id: 'questions', name: 'Question Analysis', icon: CheckCircleIcon },
              { id: 'players', name: 'Player Performance', icon: UserGroupIcon },
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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-gray-50 rounded-lg p-6"
              >
                <h3 className="text-lg font-semibold mb-4">Question Accuracy</h3>
                <div className="h-64">
                  <Bar data={questionAccuracyData} options={chartOptions} />
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
                className="bg-gray-50 rounded-lg p-6"
              >
                <h3 className="text-lg font-semibold mb-4">Score Distribution</h3>
                <div className="h-64">
                  <Doughnut data={scoreDistributionData} options={{
                    ...chartOptions,
                    plugins: {
                      legend: {
                        position: 'bottom' as const,
                      },
                    },
                  }} />
                </div>
              </motion.div>
            </div>
          )}

          {activeTab === 'questions' && (
            <div className="space-y-6">
              {questionAnalytics.map((question, index) => (
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

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                        question.difficulty === 'Easy' ? 'bg-green-100 text-green-800' :
                        question.difficulty === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {question.difficulty}
                      </div>
                    </div>
                  </div>

                  {Object.keys(question.optionDistribution).length > 0 && (
                    <div className="mt-4">
                      <h5 className="font-medium mb-2">Answer Distribution:</h5>
                      <div className="space-y-2">
                        {Object.entries(question.optionDistribution).map(([option, data]) => (
                          <div key={option} className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              {data.isCorrect ? (
                                <CheckCircleIcon className="h-5 w-5 text-green-500" />
                              ) : (
                                <XCircleIcon className="h-5 w-5 text-red-500" />
                              )}
                              <span>{option}</span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <div className="w-32 bg-gray-200 rounded-full h-2">
                                <div
                                  className={`h-2 rounded-full ${
                                    data.isCorrect ? 'bg-green-500' : 'bg-blue-500'
                                  }`}
                                  style={{ width: `${data.percentage}%` }}
                                ></div>
                              </div>
                              <span className="text-sm text-gray-600 w-12">
                                {Math.round(data.percentage)}%
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          )}

          {activeTab === 'players' && (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="min-w-full bg-white">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Player
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Rank
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Score
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Accuracy
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Avg Time
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Streak
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {playerAnalytics.map((player, index) => (
                      <motion.tr
                        key={player.playerId}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="hover:bg-gray-50"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="h-10 w-10 flex-shrink-0">
                              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                                <span className="text-sm font-medium text-blue-800">
                                  {player.user.firstName[0]}{player.user.lastName[0]}
                                </span>
                              </div>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">
                                {player.user.firstName} {player.user.lastName}
                              </div>
                              <div className="text-sm text-gray-500">
                                @{player.user.username}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {player.rank <= 3 && (
                              <TrophyIcon className={`h-5 w-5 mr-2 ${
                                player.rank === 1 ? 'text-yellow-500' :
                                player.rank === 2 ? 'text-gray-400' :
                                'text-yellow-600'
                              }`} />
                            )}
                            <span className="text-sm font-medium text-gray-900">
                              #{player.rank}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {player.finalScore}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {Math.round(player.accuracy)}%
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {Math.round(player.averageTime)}s
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {player.longestStreak}
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GameAnalyticsDetail; 