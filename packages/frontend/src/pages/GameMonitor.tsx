import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  PlayIcon, 
  PauseIcon, 
  StopIcon,
  UsersIcon,
  ClockIcon,
  TrophyIcon,
  FireIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  EyeIcon,
  SpeakerWaveIcon,
  SpeakerXMarkIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/SupabaseAuthContext';
import toast from 'react-hot-toast';
import './GameMonitor.css';

interface GameStats {
  totalPlayers: number;
  activeAnswers: number;
  averageTime: number;
  currentQuestion: number;
  totalQuestions: number;
  gameStatus: 'WAITING' | 'IN_PROGRESS' | 'PAUSED' | 'FINISHED';
}

interface PlayerData {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  score: number;
  streak: number;
  correctAnswers: number;
  incorrectAnswers: number;
  position: number;
  status: 'JOINED' | 'PLAYING' | 'DISCONNECTED';
  lastSeen: Date;
  currentAnswer?: string;
  timeSpent?: number;
}

interface QuestionData {
  id: string;
  question: string;
  type: string;
  timeLimit: number;
  startTime?: Date;
  responses: {
    total: number;
    correct: number;
    incorrect: number;
    noAnswer: number;
  };
}

interface LiveStatistics {
  questionAccuracy: number;
  averageResponseTime: number;
  playersFinished: number;
  topPerformer: PlayerData | null;
  strugglingPlayers: PlayerData[];
}

const GameMonitor: React.FC = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const { user, getAccessToken } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [gameStats, setGameStats] = useState<GameStats>({
    totalPlayers: 0,
    activeAnswers: 0,
    averageTime: 0,
    currentQuestion: 1,
    totalQuestions: 10,
    gameStatus: 'WAITING'
  });
  const [players, setPlayers] = useState<PlayerData[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<QuestionData | null>(null);
  const [liveStats, setLiveStats] = useState<LiveStatistics>({
    questionAccuracy: 0,
    averageResponseTime: 0,
    playersFinished: 0,
    topPerformer: null,
    strugglingPlayers: []
  });
  const [activeTab, setActiveTab] = useState<'overview' | 'players' | 'question' | 'analytics'>('overview');
  const [gamePin, setGamePin] = useState<string>('');
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [autoAdvance, setAutoAdvance] = useState(true);
  const [showControls, setShowControls] = useState(false);

  useEffect(() => {
    if (!gameId) {
      navigate('/game/host');
      return;
    }

    const setupGame = async () => {
      await initializeSocket();
      await fetchGameData();
    };

    setupGame();

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [gameId, navigate]);

  const initializeSocket = async () => {
    const token = await getAccessToken();
    if (!token) {
      toast.error('Authentication required');
      navigate('/login');
      return;
    }
    
    // Connect to backend WebSocket server
    const wsUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';
    const newSocket = io(wsUrl, {
      auth: { token }
    });

    newSocket.on('connect', () => {
      newSocket.emit('join_game_monitor', { gameId });
    });

    newSocket.on('monitor_joined', handleMonitorJoined);
    newSocket.on('game_event', handleGameEvent);
    newSocket.on('player_update', handlePlayerUpdate);
    newSocket.on('question_update', handleQuestionUpdate);
    newSocket.on('error', handleError);

    setSocket(newSocket);
  };

  const fetchGameData = async () => {
    try {
      const token = await getAccessToken();
      
      if (!token) {
        toast.error('Authentication required');
        navigate('/login');
        return;
      }
      
      const response = await fetch(`${import.meta.env.VITE_API_URL}/games/${gameId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const response_data = await response.json();
        const game = response_data.data.game;
        console.log('Game data received:', game); // Debug log
        
        setGamePin(game.pin || '');
        setGameStats(prev => ({
          ...prev,
          totalPlayers: game.players?.length || 0,
          currentQuestion: (game.currentQuestionIndex || 0) + 1,
          totalQuestions: game.quiz?.questions?.length || 0,
          gameStatus: game.status || 'WAITING'
        }));
        setPlayers(game.players || []);
      } else {
        toast.error('Failed to load game data');
        navigate('/game/host');
      }
    } catch (error) {
      console.error('Fetch game data error:', error);
      toast.error('Failed to load game data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMonitorJoined = (gameState: any) => {
    console.log('Monitor joined, received game state:', gameState);
    
    setGamePin(gameState.pin || '');
    setGameStats(prev => ({
      ...prev,
      totalPlayers: gameState.players?.length || 0,
      currentQuestion: (gameState.currentQuestionIndex || 0) + 1,
      totalQuestions: gameState.totalQuestions || 0,
      gameStatus: gameState.status || 'WAITING'
    }));
    setPlayers(gameState.players || []);
    setIsLoading(false);
  };

  const handleGameEvent = (event: any) => {
    switch (event.type) {
      case 'PLAYER_JOINED':
        setGameStats(prev => ({ ...prev, totalPlayers: prev.totalPlayers + 1 }));
        if (soundEnabled) {
          playNotificationSound('join');
        }
        const playerName = event.data.player?.firstName || event.data.player?.username || 'Player';
        toast.success(`${playerName} joined the game`);
        // Update players list
        setPlayers(prev => [...prev, event.data.player]);
        break;

      case 'PLAYER_LEFT':
        setGameStats(prev => ({ ...prev, totalPlayers: prev.totalPlayers - 1 }));
        break;

      case 'QUESTION_STARTED':
        setCurrentQuestion(event.data.question);
        setGameStats(prev => ({ ...prev, currentQuestion: event.data.questionIndex + 1 }));
        setTimeRemaining(event.data.question.timeLimit);
        break;

      case 'TIMER_UPDATE':
        setTimeRemaining(event.data.timeRemaining);
        break;

      case 'ANSWER_SUBMITTED':
        setGameStats(prev => ({ ...prev, activeAnswers: prev.activeAnswers + 1 }));
        updatePlayerAnswer(event.data);
        break;

      case 'GAME_STARTED':
        setGameStats(prev => ({ ...prev, gameStatus: 'IN_PROGRESS' }));
        toast.success('Game started!');
        break;

      case 'QUESTION_ENDED':
        calculateLiveStatistics();
        break;

      case 'GAME_ENDED':
        setGameStats(prev => ({ ...prev, gameStatus: 'FINISHED' }));
        toast.success('Game completed!');
        setTimeout(() => {
          navigate(`/game/${gameId}/results`);
        }, 3000);
        break;

      default:
        break;
    }
  };

  const handlePlayerUpdate = (playerData: PlayerData) => {
    setPlayers(prev => 
      prev.map(p => p.id === playerData.id ? { ...p, ...playerData } : p)
    );
  };

  const handleQuestionUpdate = (questionData: QuestionData) => {
    setCurrentQuestion(questionData);
  };

  const handleError = (error: any) => {
    toast.error(error.message || 'Something went wrong');
  };

  const updatePlayerAnswer = (answerData: any) => {
    setPlayers(prev => 
      prev.map(player => 
        player.id === answerData.playerId 
          ? { 
              ...player, 
              currentAnswer: answerData.isCorrect ? 'correct' : 'incorrect',
              timeSpent: answerData.timeSpent 
            }
          : player
      )
    );
  };

  const calculateLiveStatistics = () => {
    if (players.length === 0) return;

    const finished = players.filter(p => p.currentAnswer).length;
    const correct = players.filter(p => p.currentAnswer === 'correct').length;
    const accuracy = finished > 0 ? (correct / finished) * 100 : 0;
    const avgTime = players
      .filter(p => p.timeSpent)
      .reduce((sum, p) => sum + (p.timeSpent || 0), 0) / finished;

    const topPerformer = [...players]
      .sort((a, b) => b.score - a.score)[0] || null;

    const strugglingPlayers = players
      .filter(p => p.correctAnswers / (p.correctAnswers + p.incorrectAnswers) < 0.5)
      .slice(0, 3);

    setLiveStats({
      questionAccuracy: accuracy,
      averageResponseTime: avgTime / 1000,
      playersFinished: finished,
      topPerformer,
      strugglingPlayers
    });
  };

  const playNotificationSound = (type: 'join' | 'answer' | 'complete') => {
    // Audio feedback for different events
    const context = new AudioContext();
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(context.destination);

    const frequencies = { join: 800, answer: 600, complete: 1000 };
    oscillator.frequency.setValueAtTime(frequencies[type], context.currentTime);
    oscillator.type = 'sine';

    gainNode.gain.setValueAtTime(0, context.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.1, context.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.3);

    oscillator.start(context.currentTime);
    oscillator.stop(context.currentTime + 0.3);
  };

  const startGame = async () => {
    if (!socket) return;

    try {
      socket.emit('start_game', { gameId });
      toast.success('Game started!');
    } catch (error) {
      toast.error('Failed to start game');
    }
  };

  const controlGame = async (action: 'pause' | 'resume' | 'end' | 'next') => {
    if (!socket) return;

    try {
      socket.emit('game_control', { gameId, action });
      
      const actionMessages = {
        pause: 'Game paused',
        resume: 'Game resumed',
        end: 'Game ended',
        next: 'Moving to next question'
      };
      
      toast.success(actionMessages[action]);
    } catch (error) {
      toast.error(`Failed to ${action} game`);
    }
  };

  const getPlayerStatusColor = (player: PlayerData) => {
    if (player.status === 'DISCONNECTED') return '#ef4444';
    if (player.currentAnswer === 'correct') return '#10b981';
    if (player.currentAnswer === 'incorrect') return '#f59e0b';
    if (player.currentAnswer) return '#6b7280';
    return '#94a3b8';
  };

  const getGameStatusIcon = () => {
    switch (gameStats.gameStatus) {
      case 'WAITING': return <ClockIcon className="status-icon waiting" />;
      case 'IN_PROGRESS': return <PlayIcon className="status-icon playing" />;
      case 'PAUSED': return <PauseIcon className="status-icon paused" />;
      case 'FINISHED': return <CheckCircleIcon className="status-icon finished" />;
      default: return <ClockIcon className="status-icon" />;
    }
  };

  if (isLoading) {
    return (
      <div className="game-monitor-loading">
        <div className="loading-spinner"></div>
        <p>Loading game monitor...</p>
      </div>
    );
  }

  return (
    <div className="game-monitor">
      {/* Header */}
      <div className="monitor-header">
        <div className="game-info">
          <div className="game-status">
            {getGameStatusIcon()}
            <span className="status-text">{gameStats.gameStatus}</span>
          </div>
          <div className="game-details">
            <h2>Game PIN: {gamePin}</h2>
            <p>Question {gameStats.currentQuestion} of {gameStats.totalQuestions}</p>
          </div>
        </div>

        <div className="header-controls">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`control-btn ${soundEnabled ? 'active' : ''}`}
          >
            {soundEnabled ? <SpeakerWaveIcon /> : <SpeakerXMarkIcon />}
          </button>
          <button
            onClick={() => setShowControls(!showControls)}
            className="control-btn primary"
          >
            Game Controls
          </button>
        </div>
      </div>

      {/* Game Controls */}
      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="game-controls"
          >
            <div className="controls-grid">
              {gameStats.gameStatus === 'WAITING' && (
                <button
                  onClick={startGame}
                  className="control-button success"
                  disabled={gameStats.totalPlayers === 0}
                  title={gameStats.totalPlayers === 0 ? 'Need at least one player to start' : 'Start the game'}
                >
                  <PlayIcon />
                  Start Game
                </button>
              )}
              <button
                onClick={() => controlGame(gameStats.gameStatus === 'PAUSED' ? 'resume' : 'pause')}
                className="control-button warning"
                disabled={gameStats.gameStatus === 'FINISHED' || gameStats.gameStatus === 'WAITING'}
              >
                {gameStats.gameStatus === 'PAUSED' ? <PlayIcon /> : <PauseIcon />}
                {gameStats.gameStatus === 'PAUSED' ? 'Resume' : 'Pause'}
              </button>
              <button
                onClick={() => controlGame('next')}
                className="control-button primary"
                disabled={gameStats.gameStatus !== 'IN_PROGRESS'}
              >
                <PlayIcon />
                Next Question
              </button>
              <button
                onClick={() => controlGame('end')}
                className="control-button danger"
                disabled={gameStats.gameStatus === 'FINISHED'}
              >
                <StopIcon />
                End Game
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats Overview */}
      <div className="stats-overview">
        <div className="stat-card">
          <UsersIcon className="stat-icon" />
          <div className="stat-info">
            <span className="stat-value">{gameStats.totalPlayers}</span>
            <span className="stat-label">Players</span>
          </div>
        </div>
        <div className="stat-card">
          <ClockIcon className="stat-icon" />
          <div className="stat-info">
            <span className="stat-value">{timeRemaining}s</span>
            <span className="stat-label">Time Left</span>
          </div>
        </div>
        <div className="stat-card">
          <CheckCircleIcon className="stat-icon" />
          <div className="stat-info">
            <span className="stat-value">{liveStats.playersFinished}</span>
            <span className="stat-label">Answered</span>
          </div>
        </div>
        <div className="stat-card">
          <ChartBarIcon className="stat-icon" />
          <div className="stat-info">
            <span className="stat-value">{liveStats.questionAccuracy.toFixed(0)}%</span>
            <span className="stat-label">Accuracy</span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="monitor-tabs">
        <button
          className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          <EyeIcon className="tab-icon" />
          Overview
        </button>
        <button
          className={`tab ${activeTab === 'players' ? 'active' : ''}`}
          onClick={() => setActiveTab('players')}
        >
          <UsersIcon className="tab-icon" />
          Players ({gameStats.totalPlayers})
        </button>
        <button
          className={`tab ${activeTab === 'question' ? 'active' : ''}`}
          onClick={() => setActiveTab('question')}
        >
          <ChartBarIcon className="tab-icon" />
          Question
        </button>
        <button
          className={`tab ${activeTab === 'analytics' ? 'active' : ''}`}
          onClick={() => setActiveTab('analytics')}
        >
          <TrophyIcon className="tab-icon" />
          Analytics
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'overview' && (
          <div className="overview-content">
            <div className="overview-grid">
              {/* Live Leaderboard */}
              <div className="overview-card">
                <h3>Top Players</h3>
                <div className="mini-leaderboard">
                  {players
                    .sort((a, b) => b.score - a.score)
                    .slice(0, 5)
                    .map((player, index) => (
                      <div key={`mini-player-${player.id || player.userId || index}`} className="mini-player">
                        <span className="player-rank">#{index + 1}</span>
                        <span className="player-name">{player.firstName} {player.lastName}</span>
                        <span className="player-score">{player.score}</span>
                      </div>
                    ))}
                </div>
              </div>

              {/* Question Progress */}
              <div className="overview-card">
                <h3>Question Progress</h3>
                <div className="progress-info">
                  <div className="progress-bar">
                    <div 
                      className="progress-fill"
                      style={{ width: `${(gameStats.currentQuestion / gameStats.totalQuestions) * 100}%` }}
                    />
                  </div>
                  <div className="progress-text">
                    Question {gameStats.currentQuestion} of {gameStats.totalQuestions}
                  </div>
                </div>
                {currentQuestion && (
                  <div className="current-question">
                    <p className="question-text">
                      {currentQuestion.question.substring(0, 100)}...
                    </p>
                    <div className="question-stats">
                      <span>⏱️ {currentQuestion.timeLimit}s</span>
                      <span>📊 {liveStats.playersFinished}/{gameStats.totalPlayers} answered</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Performance Alerts */}
              <div className="overview-card">
                <h3>Performance Alerts</h3>
                <div className="alerts-list">
                  {liveStats.questionAccuracy < 50 && (
                    <div className="alert warning">
                      <ExclamationTriangleIcon className="alert-icon" />
                      <span>Low question accuracy ({liveStats.questionAccuracy.toFixed(0)}%)</span>
                    </div>
                  )}
                  {liveStats.strugglingPlayers.length > 0 && (
                    <div className="alert info">
                      <UsersIcon className="alert-icon" />
                      <span>{liveStats.strugglingPlayers.length} players struggling</span>
                    </div>
                  )}
                  {gameStats.totalPlayers - liveStats.playersFinished > gameStats.totalPlayers * 0.3 && (
                    <div className="alert warning">
                      <ClockIcon className="alert-icon" />
                      <span>Many players haven't answered yet</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'players' && (
          <div className="players-content">
            <div className="players-grid">
              {players.map((player, index) => (
                <motion.div
                  key={`player-card-${player.id || player.userId || index}`}
                  layout
                  className="player-card"
                  style={{ borderLeftColor: getPlayerStatusColor(player) }}
                >
                  <div className="player-header">
                    <div className="player-info">
                      <span className="player-name">{player.firstName} {player.lastName}</span>
                      <span className="player-username">@{player.username}</span>
                    </div>
                    <div className="player-status">
                      <span className={`status-indicator ${player.status.toLowerCase()}`}>
                        {player.status}
                      </span>
                    </div>
                  </div>
                  <div className="player-stats">
                    <div className="stat">
                      <TrophyIcon className="stat-icon" />
                      <span>{player.score}</span>
                    </div>
                    <div className="stat">
                      <FireIcon className="stat-icon" />
                      <span>{player.streak}</span>
                    </div>
                    <div className="stat">
                      <span className="stat-text">#{player.position}</span>
                    </div>
                  </div>
                  <div className="player-progress">
                    <div className="accuracy">
                      Accuracy: {player.correctAnswers + player.incorrectAnswers > 0 
                        ? Math.round((player.correctAnswers / (player.correctAnswers + player.incorrectAnswers)) * 100)
                        : 0}%
                    </div>
                    {player.currentAnswer && (
                      <div className={`current-answer ${player.currentAnswer}`}>
                        {player.currentAnswer === 'correct' ? '✅' : '❌'} 
                        {player.timeSpent ? ` ${(player.timeSpent / 1000).toFixed(1)}s` : ''}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'question' && currentQuestion && (
          <div className="question-content">
            <div className="question-analysis">
              <div className="question-header">
                <h3>Current Question Analysis</h3>
                <div className="question-timer">
                  <ClockIcon className="timer-icon" />
                  <span>{timeRemaining}s remaining</span>
                </div>
              </div>
              
              <div className="question-text">
                <p>{currentQuestion.question}</p>
              </div>

              <div className="response-statistics">
                <div className="stat-grid">
                  <div className="response-stat">
                    <span className="stat-value">{liveStats.playersFinished}</span>
                    <span className="stat-label">Responses</span>
                  </div>
                  <div className="response-stat">
                    <span className="stat-value">{liveStats.questionAccuracy.toFixed(0)}%</span>
                    <span className="stat-label">Accuracy</span>
                  </div>
                  <div className="response-stat">
                    <span className="stat-value">{liveStats.averageResponseTime.toFixed(1)}s</span>
                    <span className="stat-label">Avg Time</span>
                  </div>
                  <div className="response-stat">
                    <span className="stat-value">{gameStats.totalPlayers - liveStats.playersFinished}</span>
                    <span className="stat-label">Pending</span>
                  </div>
                </div>

                <div className="response-visualization">
                  <div className="response-bar">
                    <div 
                      className="response-fill correct"
                      style={{ 
                        width: `${gameStats.totalPlayers > 0 
                          ? (players.filter(p => p.currentAnswer === 'correct').length / gameStats.totalPlayers) * 100 
                          : 0}%` 
                      }}
                    />
                    <div 
                      className="response-fill incorrect"
                      style={{ 
                        width: `${gameStats.totalPlayers > 0 
                          ? (players.filter(p => p.currentAnswer === 'incorrect').length / gameStats.totalPlayers) * 100 
                          : 0}%` 
                      }}
                    />
                  </div>
                  <div className="response-legend">
                    <span className="legend-item correct">
                      <span className="legend-color"></span>
                      Correct ({players.filter(p => p.currentAnswer === 'correct').length})
                    </span>
                    <span className="legend-item incorrect">
                      <span className="legend-color"></span>
                      Incorrect ({players.filter(p => p.currentAnswer === 'incorrect').length})
                    </span>
                    <span className="legend-item pending">
                      <span className="legend-color"></span>
                      No Answer ({gameStats.totalPlayers - liveStats.playersFinished})
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="analytics-content">
            <div className="analytics-grid">
              <div className="analytics-card">
                <h3>Game Performance</h3>
                <div className="performance-metrics">
                  <div className="metric">
                    <span className="metric-label">Average Score</span>
                    <span className="metric-value">
                      {players.length > 0 
                        ? Math.round(players.reduce((sum, p) => sum + p.score, 0) / players.length)
                        : 0}
                    </span>
                  </div>
                  <div className="metric">
                    <span className="metric-label">Completion Rate</span>
                    <span className="metric-value">
                      {players.length > 0 
                        ? Math.round((liveStats.playersFinished / players.length) * 100)
                        : 0}%
                    </span>
                  </div>
                  <div className="metric">
                    <span className="metric-label">Top Streak</span>
                    <span className="metric-value">
                      {players.length > 0 
                        ? Math.max(...players.map(p => p.streak))
                        : 0}
                    </span>
                  </div>
                </div>
              </div>

              {liveStats.topPerformer && (
                <div className="analytics-card">
                  <h3>Top Performer</h3>
                  <div className="top-performer">
                    <div className="performer-info">
                      <span className="performer-name">
                        {liveStats.topPerformer.firstName} {liveStats.topPerformer.lastName}
                      </span>
                      <span className="performer-score">{liveStats.topPerformer.score} points</span>
                    </div>
                    <div className="performer-stats">
                      <span>🔥 {liveStats.topPerformer.streak} streak</span>
                      <span>✅ {liveStats.topPerformer.correctAnswers} correct</span>
                    </div>
                  </div>
                </div>
              )}

              {liveStats.strugglingPlayers.length > 0 && (
                <div className="analytics-card">
                  <h3>Need Support</h3>
                  <div className="struggling-players">
                    {liveStats.strugglingPlayers.map((player, index) => (
                      <div key={`struggling-player-${player.id || player.userId || index}`} className="struggling-player">
                        <span className="player-name">{player.firstName} {player.lastName}</span>
                        <span className="player-accuracy">
                          {player.correctAnswers + player.incorrectAnswers > 0 
                            ? Math.round((player.correctAnswers / (player.correctAnswers + player.incorrectAnswers)) * 100)
                            : 0}% accuracy
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GameMonitor; 