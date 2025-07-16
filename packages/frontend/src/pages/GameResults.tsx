import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  TrophyIcon, 
  FireIcon, 
  ClockIcon,
  CheckCircleIcon,
  PlayIcon,
  HomeIcon,
  ShareIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';
import confetti from 'canvas-confetti';
import toast from 'react-hot-toast';
import './GameResults.css';

interface PlayerResult {
  playerId: string;
  username: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  rank: number;
  totalScore: number;
  correctAnswers: number;
  incorrectAnswers: number;
  averageTime: number;
  longestStreak: number;
  accuracy: number;
}

interface QuestionAnalysis {
  questionId: string;
  question: string;
  correctPercentage: number;
  averageTime: number;
  playerAnswer?: {
    isCorrect: boolean;
    timeSpent: number;
    answer: string[];
  };
}

interface GameSummary {
  gameId: string;
  quizTitle: string;
  totalQuestions: number;
  totalPlayers: number;
  gameMode: string;
  duration: number;
  averageScore: number;
  completionRate: number;
}

const GameResults: React.FC = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const [leaderboard, setLeaderboard] = useState<PlayerResult[]>([]);
  const [currentPlayer, setCurrentPlayer] = useState<PlayerResult | null>(null);
  const [gameSummary, setGameSummary] = useState<GameSummary | null>(null);
  const [questionAnalysis, setQuestionAnalysis] = useState<QuestionAnalysis[]>([]);
  const [activeTab, setActiveTab] = useState<'leaderboard' | 'analysis' | 'stats'>('leaderboard');
  const [isLoading, setIsLoading] = useState(true);
  const [showShareModal, setShowShareModal] = useState(false);

  useEffect(() => {
    fetchGameResults();
    
    // Trigger confetti for top 3 players
    const gameSession = localStorage.getItem('gameSession');
    if (gameSession) {
      const sessionData = JSON.parse(gameSession);
      setTimeout(() => {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
      }, 1000);
    }
  }, [gameId]);

  const fetchGameResults = async () => {
    try {
      const gameSession = localStorage.getItem('gameSession');
      if (!gameSession) {
        navigate('/join');
        return;
      }

      const sessionData = JSON.parse(gameSession);
              const response = await fetch(`${import.meta.env.VITE_API_URL}/game-host/${gameId}/results`, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setLeaderboard(data.leaderboard || []);
        setGameSummary(data.summary || null);
        setQuestionAnalysis(data.questionAnalysis || []);
        
        // Find current player in leaderboard
        const player = data.leaderboard?.find((p: PlayerResult) => p.playerId === sessionData.playerId);
        setCurrentPlayer(player || null);
      } else {
        toast.error('Failed to load game results');
      }
    } catch (error) {
      console.error('Fetch results error:', error);
      toast.error('Failed to load game results');
    } finally {
      setIsLoading(false);
    }
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  const getRankColor = (rank: number) => {
    if (rank === 1) return 'linear-gradient(135deg, #fbbf24, #f59e0b)';
    if (rank === 2) return 'linear-gradient(135deg, #94a3b8, #64748b)';
    if (rank === 3) return 'linear-gradient(135deg, #fb923c, #ea580c)';
    return '#f3f4f6';
  };



  const shareResults = async () => {
    if (!currentPlayer || !gameSummary) return;

    const shareText = `🎯 Just completed "${gameSummary.quizTitle}"!\n` +
      `🏆 Rank: ${currentPlayer.rank}/${gameSummary.totalPlayers}\n` +
      `📊 Score: ${currentPlayer.totalScore} points\n` +
      `✅ Accuracy: ${currentPlayer.accuracy.toFixed(1)}%\n` +
      `🔥 Best Streak: ${currentPlayer.longestStreak}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Quiz Results',
          text: shareText,
          url: window.location.href
        });
      } catch (error) {
        // User cancelled sharing
      }
    } else {
      // Fallback to clipboard
      await navigator.clipboard.writeText(shareText);
      toast.success('Results copied to clipboard!');
    }
    setShowShareModal(false);
  };

  const playAgain = () => {
    navigate('/join');
  };

  const goHome = () => {
    navigate('/dashboard');
  };

  if (isLoading) {
    return (
      <div className="game-results-loading">
        <div className="loading-spinner"></div>
        <p>Loading results...</p>
      </div>
    );
  }

  return (
    <div className="game-results">
      {/* Header */}
      <div className="results-header">
        <div className="header-content">
          <h1>🎉 Game Complete!</h1>
          {gameSummary && (
            <div className="game-info">
              <h2>{gameSummary.quizTitle}</h2>
              <div className="game-stats">
                <span>{gameSummary.totalPlayers} players</span>
                <span>•</span>
                <span>{gameSummary.totalQuestions} questions</span>
                <span>•</span>
                <span>{Math.floor(gameSummary.duration / 60)}m {gameSummary.duration % 60}s</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Current Player Highlight */}
      {currentPlayer && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="player-highlight"
        >
          <div className="highlight-card" style={{ background: getRankColor(currentPlayer.rank) }}>
            <div className="rank-badge">
              <span className="rank-icon">{getRankIcon(currentPlayer.rank)}</span>
              <span className="rank-text">Rank {currentPlayer.rank}</span>
            </div>
            <div className="player-stats-grid">
              <div className="stat">
                <TrophyIcon className="stat-icon" />
                <span className="stat-value">{currentPlayer.totalScore}</span>
                <span className="stat-label">Points</span>
              </div>
              <div className="stat">
                <CheckCircleIcon className="stat-icon" />
                <span className="stat-value">{currentPlayer.accuracy.toFixed(1)}%</span>
                <span className="stat-label">Accuracy</span>
              </div>
              <div className="stat">
                <FireIcon className="stat-icon" />
                <span className="stat-value">{currentPlayer.longestStreak}</span>
                <span className="stat-label">Best Streak</span>
              </div>
              <div className="stat">
                <ClockIcon className="stat-icon" />
                <span className="stat-value">{(currentPlayer.averageTime / 1000).toFixed(1)}s</span>
                <span className="stat-label">Avg Time</span>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Navigation Tabs */}
      <div className="results-tabs">
        <button
          className={`tab ${activeTab === 'leaderboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('leaderboard')}
        >
          <TrophyIcon className="tab-icon" />
          Leaderboard
        </button>
        <button
          className={`tab ${activeTab === 'analysis' ? 'active' : ''}`}
          onClick={() => setActiveTab('analysis')}
        >
          <ChartBarIcon className="tab-icon" />
          Analysis
        </button>
        <button
          className={`tab ${activeTab === 'stats' ? 'active' : ''}`}
          onClick={() => setActiveTab('stats')}
        >
          <CheckCircleIcon className="tab-icon" />
          Stats
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'leaderboard' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="leaderboard-section"
          >
            <h3>Final Rankings</h3>
            <div className="leaderboard-grid">
              {leaderboard.map((player, index) => (
                <motion.div
                  key={player.playerId}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`leaderboard-item ${
                    currentPlayer?.playerId === player.playerId ? 'current-player' : ''
                  }`}
                  style={{ background: index < 3 ? getRankColor(player.rank) : '#f9fafb' }}
                >
                  <div className="player-rank">
                    <span className="rank-display">{getRankIcon(player.rank)}</span>
                  </div>
                  <div className="player-details">
                    <div className="player-name">
                      {player.firstName} {player.lastName}
                    </div>
                    <div className="player-username">@{player.username}</div>
                  </div>
                  <div className="player-metrics">
                    <div className="metric">
                      <span className="metric-value">{player.totalScore}</span>
                      <span className="metric-label">pts</span>
                    </div>
                    <div className="metric">
                      <span className="metric-value">{player.accuracy.toFixed(0)}%</span>
                      <span className="metric-label">acc</span>
                    </div>
                    <div className="metric">
                      <span className="metric-value">{player.longestStreak}</span>
                      <span className="metric-label">streak</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {activeTab === 'analysis' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="analysis-section"
          >
            <h3>Question Analysis</h3>
            <div className="analysis-grid">
              {questionAnalysis.map((question, index) => (
                <div key={question.questionId} className="analysis-card">
                  <div className="question-header">
                    <span className="question-number">Q{index + 1}</span>
                    <div className="question-metrics">
                      <span className={`accuracy ${question.correctPercentage >= 70 ? 'high' : question.correctPercentage >= 40 ? 'medium' : 'low'}`}>
                        {question.correctPercentage.toFixed(0)}% correct
                      </span>
                    </div>
                  </div>
                  <div className="question-text">
                    {question.question.substring(0, 100)}
                    {question.question.length > 100 ? '...' : ''}
                  </div>
                  {question.playerAnswer && (
                    <div className={`player-answer ${question.playerAnswer.isCorrect ? 'correct' : 'incorrect'}`}>
                      <span className="answer-status">
                        {question.playerAnswer.isCorrect ? '✅ Correct' : '❌ Incorrect'}
                      </span>
                      <span className="answer-time">
                        {(question.playerAnswer.timeSpent / 1000).toFixed(1)}s
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {activeTab === 'stats' && gameSummary && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="stats-section"
          >
            <h3>Game Statistics</h3>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon-large">
                  <TrophyIcon />
                </div>
                <div className="stat-info">
                  <span className="stat-value">{gameSummary.averageScore.toFixed(0)}</span>
                  <span className="stat-label">Average Score</span>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon-large">
                  <CheckCircleIcon />
                </div>
                <div className="stat-info">
                  <span className="stat-value">{gameSummary.completionRate.toFixed(0)}%</span>
                  <span className="stat-label">Completion Rate</span>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon-large">
                  <ChartBarIcon />
                </div>
                <div className="stat-info">
                  <span className="stat-value">{gameSummary.totalPlayers}</span>
                  <span className="stat-label">Total Players</span>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon-large">
                  <ClockIcon />
                </div>
                <div className="stat-info">
                  <span className="stat-value">{Math.floor(gameSummary.duration / 60)}m</span>
                  <span className="stat-label">Game Duration</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="action-buttons">
        <button onClick={() => setShowShareModal(true)} className="btn-secondary">
          <ShareIcon className="btn-icon" />
          Share Results
        </button>
        <button onClick={playAgain} className="btn-primary">
          <PlayIcon className="btn-icon" />
          Play Again
        </button>
        <button onClick={goHome} className="btn-outline">
          <HomeIcon className="btn-icon" />
          Home
        </button>
      </div>

      {/* Share Modal */}
      {showShareModal && (
        <div className="modal-overlay" onClick={() => setShowShareModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Share Your Results</h3>
            <div className="share-preview">
              <p>🎯 Just completed "{gameSummary?.quizTitle}"!</p>
              <p>🏆 Rank: {currentPlayer?.rank}/{gameSummary?.totalPlayers}</p>
              <p>📊 Score: {currentPlayer?.totalScore} points</p>
              <p>✅ Accuracy: {currentPlayer?.accuracy.toFixed(1)}%</p>
              <p>🔥 Best Streak: {currentPlayer?.longestStreak}</p>
            </div>
            <div className="modal-actions">
              <button onClick={shareResults} className="btn-primary">
                Share
              </button>
              <button onClick={() => setShowShareModal(false)} className="btn-secondary">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GameResults; 
