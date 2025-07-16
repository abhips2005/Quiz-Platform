import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ClockIcon, 
  TrophyIcon,
  FireIcon,
  CheckCircleIcon,
  XCircleIcon,
  PlayIcon,
  PauseIcon
} from '@heroicons/react/24/outline';
import { MathRenderer } from '../components/MathRenderer/MathRenderer';
import { MediaDisplay } from '../components/MediaDisplay/MediaDisplay';
import toast from 'react-hot-toast';
import './GamePlay.css';

interface QuestionOption {
  id: string;
  text: string;
}

interface Question {
  id: string;
  question: string;
  type: 'MULTIPLE_CHOICE' | 'TRUE_FALSE' | 'CHECKBOX' | 'SHORT_ANSWER' | 'FILL_IN_BLANK';
  options: QuestionOption[];
  media?: {
    type: 'IMAGE' | 'AUDIO' | 'VIDEO';
    url: string;
    filename: string;
  };
  timeLimit: number;
  points: number;
}

interface GameState {
  id: string;
  status: 'WAITING' | 'IN_PROGRESS' | 'FINISHED';
  currentQuestionIndex: number;
  totalQuestions: number;
  currentQuestion?: Question;
}

interface PlayerStats {
  score: number;
  streak: number;
  correctAnswers: number;
  position: number;
  averageTime: number;
}

interface TimerState {
  timeRemaining: number;
  timeElapsed: number;
  timeLimit: number;
}

interface LeaderboardEntry {
  playerId: string;
  username: string;
  firstName: string;
  lastName: string;
  score: number;
  position: number;
  streak: number;
}

interface AnswerResult {
  isCorrect: boolean;
  pointsEarned: number;
  basePoints: number;
  streakBonus: number;
  newStreak: number;
  correctAnswer: string[];
  explanation?: string;
}

const GamePlay: React.FC = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [playerStats, setPlayerStats] = useState<PlayerStats>({
    score: 0,
    streak: 0,
    correctAnswers: 0,
    position: 0,
    averageTime: 0
  });
  const [timer, setTimer] = useState<TimerState>({ timeRemaining: 0, timeElapsed: 0, timeLimit: 0 });
  const [selectedAnswers, setSelectedAnswers] = useState<string[]>([]);
  const [textAnswer, setTextAnswer] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [answerResult, setAnswerResult] = useState<AnswerResult | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  
  const answerStartTime = useRef<number>(0);
  const vibrationEnabled = useRef(true);

  useEffect(() => {
    const gameSession = localStorage.getItem('gameSession');
    if (!gameSession) {
      navigate('/join');
      return;
    }

    const sessionData = JSON.parse(gameSession);
    if (sessionData.gameId !== gameId) {
      navigate('/join');
      return;
    }

    initializeSocket(sessionData);

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [gameId, navigate]);

  const initializeSocket = (sessionData: any) => {
    // Connect to backend WebSocket server
    const newSocket = io('http://localhost:5000', {
      auth: {
        token: sessionData.playerId
      }
    });

    newSocket.on('connect', () => {
      setConnectionStatus('connected');
      // Join the game room
      newSocket.emit('join_game', { gameId: sessionData.gameId });
    });

    newSocket.on('disconnect', () => {
      setConnectionStatus('disconnected');
      toast.error('Connection lost. Trying to reconnect...');
    });

    newSocket.on('game_event', handleGameEvent);
    newSocket.on('answer_result', handleAnswerResult);
    newSocket.on('error', handleError);

    setSocket(newSocket);
  };

  const handleGameEvent = (event: any) => {
    switch (event.type) {
      case 'GAME_STARTED':
        setGameState(prev => prev ? { ...prev, status: 'IN_PROGRESS' } : null);
        setIsLoading(false);
        break;

      case 'QUESTION_STARTED':
        setGameState(prev => ({
          id: prev?.id || gameId!,
          status: 'IN_PROGRESS',
          currentQuestionIndex: event.data.questionIndex,
          totalQuestions: event.data.totalQuestions,
          currentQuestion: event.data.question
        }));
        setSelectedAnswers([]);
        setTextAnswer('');
        setIsSubmitted(false);
        setShowResults(false);
        setShowLeaderboard(false);
        answerStartTime.current = Date.now();
        toast.success(`Question ${event.data.questionIndex + 1} of ${event.data.totalQuestions}`);
        break;

      case 'TIMER_UPDATE':
        setTimer(event.data);
        break;

      case 'TIMER_WARNING':
        if (vibrationEnabled.current && navigator.vibrate) {
          navigator.vibrate([200, 100, 200]);
        }
        toast('⏰ 10 seconds left!', { 
          duration: 2000,
          style: { background: '#f97316', color: 'white' }
        });
        break;

      case 'QUESTION_ENDED':
        setShowResults(true);
        if (!isSubmitted) {
          toast.error('Time\'s up!');
        }
        setTimeout(() => {
          setShowLeaderboard(true);
        }, 3000);
        break;

      case 'LEADERBOARD_UPDATED':
        setLeaderboard(event.data.leaderboard);
        // Update player position
        const playerEntry = event.data.leaderboard.find((entry: LeaderboardEntry) => 
          entry.playerId === JSON.parse(localStorage.getItem('gameSession') || '{}').playerId
        );
        if (playerEntry) {
          setPlayerStats(prev => ({ ...prev, position: playerEntry.position }));
        }
        break;

      case 'GAME_ENDED':
        setGameState(prev => prev ? { ...prev, status: 'FINISHED' } : null);
        navigate(`/game/${gameId}/results`);
        break;

      default:
        break;
    }
  };

  const handleAnswerResult = (result: AnswerResult) => {
    setAnswerResult(result);
    setPlayerStats(prev => ({
      ...prev,
      score: prev.score + result.pointsEarned,
      streak: result.newStreak,
      correctAnswers: result.isCorrect ? prev.correctAnswers + 1 : prev.correctAnswers
    }));

    // Show result feedback
    if (result.isCorrect) {
      toast.success(`+${result.pointsEarned} points! ${result.streakBonus > 1 ? `🔥 ${result.newStreak} streak!` : ''}`, {
        duration: 3000,
        icon: '🎉'
      });
    } else {
      toast.error('Incorrect answer', {
        duration: 2000,
        icon: '😔'
      });
    }
  };

  const handleError = (error: any) => {
    toast.error(error.message || 'Something went wrong');
  };

  const handleOptionSelect = (optionId: string) => {
    if (isSubmitted || !gameState?.currentQuestion) return;

    const question = gameState.currentQuestion;
    
    if (question.type === 'MULTIPLE_CHOICE' || question.type === 'TRUE_FALSE') {
      setSelectedAnswers([optionId]);
    } else if (question.type === 'CHECKBOX') {
      setSelectedAnswers(prev => 
        prev.includes(optionId) 
          ? prev.filter(id => id !== optionId)
          : [...prev, optionId]
      );
    }
  };

  const submitAnswer = () => {
    if (isSubmitted || !socket || !gameState?.currentQuestion) return;

    const timeSpent = Date.now() - answerStartTime.current;
    const question = gameState.currentQuestion;

    let submission: any = {
      gameId: gameId!,
      questionId: question.id,
      timeSpent: timeSpent
    };

    if (question.type === 'SHORT_ANSWER' || question.type === 'FILL_IN_BLANK') {
      submission.textAnswer = textAnswer.trim();
    } else {
      submission.selectedOptions = selectedAnswers;
    }

    socket.emit('submit_answer', submission);
    setIsSubmitted(true);
    toast.success('Answer submitted!');
  };

  const canSubmit = () => {
    if (isSubmitted || !gameState?.currentQuestion) return false;
    
    const question = gameState.currentQuestion;
    if (question.type === 'SHORT_ANSWER' || question.type === 'FILL_IN_BLANK') {
      return textAnswer.trim().length > 0;
    }
    return selectedAnswers.length > 0;
  };

  const getProgressPercentage = () => {
    if (!gameState) return 0;
    return ((gameState.currentQuestionIndex + 1) / gameState.totalQuestions) * 100;
  };

  const getTimerPercentage = () => {
    if (timer.timeLimit === 0) return 100;
    return (timer.timeRemaining / timer.timeLimit) * 100;
  };

  const getTimerColor = () => {
    const percentage = getTimerPercentage();
    if (percentage > 50) return '#10b981'; // Green
    if (percentage > 25) return '#f59e0b'; // Yellow
    return '#ef4444'; // Red
  };

  if (isLoading) {
    return (
      <div className="game-play-loading">
        <div className="loading-spinner"></div>
        <p>Connecting to game...</p>
        <div className="connection-status">
          Status: {connectionStatus}
        </div>
      </div>
    );
  }

  if (!gameState) {
    return (
      <div className="game-play-error">
        <h2>Game not found</h2>
        <button onClick={() => navigate('/join')} className="btn-primary">
          Join Another Game
        </button>
      </div>
    );
  }

  return (
    <div className="game-play">
      {/* Header with game info */}
      <div className="game-header">
        <div className="game-progress">
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${getProgressPercentage()}%` }}
            />
          </div>
          <span className="progress-text">
            Question {gameState.currentQuestionIndex + 1} of {gameState.totalQuestions}
          </span>
        </div>

        <div className="player-stats">
          <div className="stat-item">
            <TrophyIcon className="stat-icon" />
            <span>{playerStats.score}</span>
          </div>
          <div className="stat-item">
            <FireIcon className="stat-icon" />
            <span>{playerStats.streak}</span>
          </div>
          <div className="stat-item position">
            <span>#{playerStats.position}</span>
          </div>
        </div>
      </div>

      {/* Timer */}
      <div className="timer-container">
        <div className="timer-circle">
          <svg className="timer-svg" width="80" height="80">
            <circle
              cx="40"
              cy="40"
              r="36"
              fill="none"
              stroke="#e5e7eb"
              strokeWidth="8"
            />
            <circle
              cx="40"
              cy="40"
              r="36"
              fill="none"
              stroke={getTimerColor()}
              strokeWidth="8"
              strokeDasharray={`${2 * Math.PI * 36}`}
              strokeDashoffset={`${2 * Math.PI * 36 * (1 - getTimerPercentage() / 100)}`}
              strokeLinecap="round"
              transform="rotate(-90 40 40)"
              className="timer-progress"
            />
          </svg>
          <div className="timer-text">
            <ClockIcon className="timer-icon" />
            <span>{timer.timeRemaining}</span>
          </div>
        </div>
      </div>

      {/* Question Content */}
      {gameState.currentQuestion && !showLeaderboard && (
        <div className="question-container">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="question-card"
          >
            <div className="question-header">
              <h2 className="question-text">
                <MathRenderer math={gameState.currentQuestion.question} />
              </h2>
              {gameState.currentQuestion.media && (
                <div className="question-media">
                  <MediaDisplay media={{
                    ...gameState.currentQuestion.media,
                    id: gameState.currentQuestion.media.id || '',
                    size: gameState.currentQuestion.media.size || 0,
                    mimeType: gameState.currentQuestion.media.mimeType || ''
                  }} />
                </div>
              )}
            </div>

            <div className="question-content">
              {(gameState.currentQuestion.type === 'SHORT_ANSWER' || 
                gameState.currentQuestion.type === 'FILL_IN_BLANK') ? (
                <div className="text-answer-container">
                  <input
                    type="text"
                    value={textAnswer}
                    onChange={(e) => setTextAnswer(e.target.value)}
                    placeholder="Type your answer here..."
                    className="text-answer-input"
                    disabled={isSubmitted}
                    onKeyPress={(e) => e.key === 'Enter' && canSubmit() && submitAnswer()}
                  />
                </div>
              ) : (
                <div className="options-container">
                  {gameState.currentQuestion.options.map((option, index) => (
                    <motion.button
                      key={option.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      onClick={() => handleOptionSelect(option.id)}
                      className={`option-button ${
                        selectedAnswers.includes(option.id) ? 'selected' : ''
                      } ${isSubmitted ? 'disabled' : ''}`}
                      disabled={isSubmitted}
                    >
                      <div className="option-letter">
                        {String.fromCharCode(65 + index)}
                      </div>
                      <div className="option-text">
                        <MathRenderer math={option.text} />
                      </div>
                      {selectedAnswers.includes(option.id) && (
                        <CheckCircleIcon className="option-check" />
                      )}
                    </motion.button>
                  ))}
                </div>
              )}

              <div className="submit-container">
                <button
                  onClick={submitAnswer}
                  disabled={!canSubmit()}
                  className={`submit-button ${canSubmit() ? 'enabled' : 'disabled'}`}
                >
                  {isSubmitted ? 'Submitted' : 'Submit Answer'}
                </button>
              </div>
            </div>
          </motion.div>

          {/* Answer Result */}
          <AnimatePresence>
            {showResults && answerResult && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className={`answer-result ${answerResult.isCorrect ? 'correct' : 'incorrect'}`}
              >
                <div className="result-icon">
                  {answerResult.isCorrect ? (
                    <CheckCircleIcon className="correct-icon" />
                  ) : (
                    <XCircleIcon className="incorrect-icon" />
                  )}
                </div>
                <div className="result-content">
                  <h3>{answerResult.isCorrect ? 'Correct!' : 'Incorrect'}</h3>
                  {answerResult.isCorrect && (
                    <div className="score-breakdown">
                      <p>+{answerResult.pointsEarned} points</p>
                      {answerResult.streakBonus > 1 && (
                        <p className="streak-bonus">
                          🔥 {answerResult.newStreak} streak! (×{answerResult.streakBonus.toFixed(1)})
                        </p>
                      )}
                    </div>
                  )}
                  {answerResult.explanation && (
                    <div className="explanation">
                      <p><strong>Explanation:</strong></p>
                      <MathRenderer math={answerResult.explanation} />
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Leaderboard */}
      <AnimatePresence>
        {showLeaderboard && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="leaderboard-overlay"
          >
            <div className="leaderboard-container">
              <h3>Leaderboard</h3>
              <div className="leaderboard-list">
                {leaderboard.slice(0, 10).map((player, index) => (
                  <div
                    key={player.playerId}
                    className={`leaderboard-item ${
                      player.playerId === JSON.parse(localStorage.getItem('gameSession') || '{}').playerId
                        ? 'current-player'
                        : ''
                    }`}
                  >
                    <div className="player-rank">#{index + 1}</div>
                    <div className="player-info">
                      <span className="player-name">
                        {player.firstName} {player.lastName}
                      </span>
                      {player.streak > 0 && (
                        <span className="player-streak">🔥 {player.streak}</span>
                      )}
                    </div>
                    <div className="player-score">{player.score}</div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GamePlay; 