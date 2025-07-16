import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useAuth } from '../contexts/SupabaseAuthContext';
import { 
  PlayIcon, 
  PlusIcon, 
  ClockIcon,
  CpuChipIcon,
  AcademicCapIcon,
  UsersIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  StopIcon
} from '@heroicons/react/24/outline';
import './GameHost.css';

interface Quiz {
  id: string;
  title: string;
  description: string;
  questionCount: number;
  difficulty: string;
  subject: string;
  status: string;
  createdAt: string;
}

interface ActiveGame {
  id: string;
  pin: string;
  mode: 'LIVE' | 'HOMEWORK' | 'PRACTICE';
  status: 'WAITING' | 'IN_PROGRESS' | 'SCHEDULED';
  quiz: {
    id: string;
    title: string;
  };
  playerCount: number;
  maxPlayers: number;
  createdAt: string;
  startedAt?: string;
}

interface GameSettings {
  randomizeQuestions: boolean;
  randomizeAnswers: boolean;
  allowRetake: boolean;
  showAnswersAfterSubmission: boolean;
  timePerQuestion?: number;
  maxAttempts: number;
  availableFrom?: string;
  availableUntil?: string;
  classId?: string;
}

const GameHost: React.FC = () => {
  const navigate = useNavigate();
  const { getAccessToken } = useAuth();
  const [activeTab, setActiveTab] = useState<'create' | 'active'>('create');
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [activeGames, setActiveGames] = useState<ActiveGame[]>([]);
  const [selectedQuiz, setSelectedQuiz] = useState<string>('');
  const [gameMode, setGameMode] = useState<'LIVE' | 'HOMEWORK' | 'PRACTICE'>('LIVE');
  const [gameSettings, setGameSettings] = useState<GameSettings>({
    randomizeQuestions: false,
    randomizeAnswers: false,
    allowRetake: false,
    showAnswersAfterSubmission: true,
    maxAttempts: 1
  });
  const [loading, setLoading] = useState(false);
  const [createGameLoading, setCreateGameLoading] = useState(false);

  useEffect(() => {
    loadQuizzes();
    loadActiveGames();
  }, []);

  const loadQuizzes = async () => {
    try {
      const token = await getAccessToken();
      if (!token) {
        toast.error('Authentication required');
        return;
      }
      
      const response = await fetch(`${import.meta.env.VITE_API_URL}/quizzes?status=published`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setQuizzes(data.data?.quizzes || []);
      } else {
        throw new Error('Failed to load quizzes');
      }
    } catch (error) {
      console.error('Load quizzes error:', error);
      toast.error('Failed to load quizzes');
      setQuizzes([]); // Ensure quizzes is always an array
    }
  };

  const loadActiveGames = async () => {
    try {
      const token = await getAccessToken();
      if (!token) {
        toast.error('Authentication required');
        return;
      }
      
      const response = await fetch(`${import.meta.env.VITE_API_URL}/game-host/host/active`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setActiveGames(data);
      } else {
        throw new Error('Failed to load active games');
      }
    } catch (error) {
      console.error('Load active games error:', error);
      toast.error('Failed to load active games');
    }
  };

  const createGame = async () => {
    if (!selectedQuiz) {
      toast.error('Please select a quiz first');
      return;
    }

    setCreateGameLoading(true);
    try {
      const token = await getAccessToken();
      if (!token) {
        toast.error('Authentication required');
        return;
      }
      
      const response = await fetch(`${import.meta.env.VITE_API_URL}/game-host/create`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          quizId: selectedQuiz,
          mode: gameMode,
          settings: gameSettings
        })
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(`Game created! PIN: ${data.pin}`);
        
        if (gameMode === 'LIVE') {
          // Navigate to game control room
          navigate(`/game/${data.gameId}/control`);
        } else {
          // Refresh active games and switch to active tab
          loadActiveGames();
          setActiveTab('active');
          toast.success('Assignment created successfully!');
        }
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create game');
      }
    } catch (error) {
      console.error('Create game error:', error);
      toast.error((error as Error).message);
    } finally {
      setCreateGameLoading(false);
    }
  };

  const startGame = async (gameId: string) => {
    setLoading(true);
    try {
      const token = await getAccessToken();
      if (!token) {
        toast.error('Authentication required');
        return;
      }
      
      const response = await fetch(`${import.meta.env.VITE_API_URL}/game-host/${gameId}/start`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        toast.success('Game started!');
        navigate(`/game/${gameId}/control`);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to start game');
      }
    } catch (error) {
      console.error('Start game error:', error);
      toast.error((error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const endGame = async (gameId: string) => {
    if (!window.confirm('Are you sure you want to end this game?')) return;

    try {
      const token = await getAccessToken();
      if (!token) {
        toast.error('Authentication required');
        return;
      }
      
      const response = await fetch(`${import.meta.env.VITE_API_URL}/game-host/${gameId}/end`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        toast.success('Game ended successfully');
        loadActiveGames();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to end game');
      }
    } catch (error) {
      console.error('End game error:', error);
      toast.error((error as Error).message);
    }
  };

  const deleteGame = async (gameId: string) => {
    if (!window.confirm('Are you sure you want to delete this game?')) return;

    try {
      const token = await getAccessToken();
      if (!token) {
        toast.error('Authentication required');
        return;
      }
      
      const response = await fetch(`${import.meta.env.VITE_API_URL}/game-host/${gameId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        toast.success('Game deleted successfully');
        loadActiveGames();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete game');
      }
    } catch (error) {
      console.error('Delete game error:', error);
      toast.error((error as Error).message);
    }
  };

  const copyPinToClipboard = (pin: string) => {
    navigator.clipboard.writeText(pin);
    toast.success('PIN copied to clipboard!');
  };

  const getGameModeIcon = (mode: string) => {
    switch (mode) {
      case 'LIVE':
        return <PlayIcon className="game-mode-icon live" />;
      case 'HOMEWORK':
        return <AcademicCapIcon className="game-mode-icon homework" />;
      case 'PRACTICE':
        return <CpuChipIcon className="game-mode-icon practice" />;
      default:
        return <PlayIcon className="game-mode-icon" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const statusClasses = {
      WAITING: 'status-waiting',
      IN_PROGRESS: 'status-active',
      SCHEDULED: 'status-scheduled'
    };

    return (
      <span className={`status-badge ${statusClasses[status as keyof typeof statusClasses] || ''}`}>
        {status.replace('_', ' ')}
      </span>
    );
  };

  const handleEndGame = async (gameId: string) => {
    if (!window.confirm('Are you sure you want to end this game? This action cannot be undone.')) {
      return;
    }

    try {
      const token = await getAccessToken();
      if (!token) {
        toast.error('Authentication required');
        return;
      }
      
      const response = await fetch(`${import.meta.env.VITE_API_URL}/game-host/${gameId}/end`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

      if (response.ok) {
        toast.success('Game ended successfully');
        loadActiveGames(); // Refresh the active games list
      } else {
        throw new Error('Failed to end game');
      }
    } catch (error) {
      console.error('End game error:', error);
      toast.error('Failed to end game');
    }
  };

  return (
    <div className="game-host">
      <div className="game-host-header">
        <h1>Game Hosting</h1>
        <p>Create and manage live quiz games for your students</p>
      </div>

      <div className="game-host-tabs">
        <button
          className={`tab-button ${activeTab === 'create' ? 'active' : ''}`}
          onClick={() => setActiveTab('create')}
        >
          <PlusIcon className="tab-icon" />
          Create Game
        </button>
        <button
          className={`tab-button ${activeTab === 'active' ? 'active' : ''}`}
          onClick={() => setActiveTab('active')}
        >
          <UsersIcon className="tab-icon" />
          Active Games ({activeGames.length})
        </button>
      </div>

      {activeTab === 'create' && (
        <div className="create-game-section">
          <div className="create-game-content">
            <div className="quiz-selection">
              <h3>Select a Quiz</h3>
              {quizzes.length === 0 ? (
                <div className="empty-state">
                  <p>No published quizzes available.</p>
                  <button 
                    onClick={() => navigate('/quiz-creator')}
                    className="create-quiz-btn"
                  >
                    Create Your First Quiz
                  </button>
                </div>
              ) : (
                <div className="quiz-grid">
                  {Array.isArray(quizzes) && quizzes.length > 0 ? (
                    quizzes.map((quiz) => (
                      <div
                        key={quiz.id}
                        className={`quiz-card ${selectedQuiz === quiz.id ? 'selected' : ''}`}
                        onClick={() => setSelectedQuiz(quiz.id)}
                      >
                        <div className="quiz-card-header">
                          <h4>{quiz.title}</h4>
                          <span className="question-count">{quiz.questionCount} questions</span>
                        </div>
                        <p className="quiz-description">{quiz.description}</p>
                        <div className="quiz-meta">
                          <span className="difficulty">{quiz.difficulty || 'N/A'}</span>
                          <span className="subject">{quiz.subject || 'N/A'}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="no-quizzes">
                      <p>No published quizzes available. Create and publish a quiz first.</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {selectedQuiz && (
              <div className="game-configuration">
                <h3>Game Settings</h3>
                
                <div className="game-mode-selection">
                  <label>Game Mode</label>
                  <div className="mode-options">
                    <button
                      className={`mode-option ${gameMode === 'LIVE' ? 'selected' : ''}`}
                      onClick={() => setGameMode('LIVE')}
                    >
                      <PlayIcon className="mode-icon" />
                      <div>
                        <strong>Live Game</strong>
                        <span>Real-time quiz with all players</span>
                      </div>
                    </button>
                    <button
                      className={`mode-option ${gameMode === 'HOMEWORK' ? 'selected' : ''}`}
                      onClick={() => setGameMode('HOMEWORK')}
                    >
                      <AcademicCapIcon className="mode-icon" />
                      <div>
                        <strong>Homework Assignment</strong>
                        <span>Students complete at their own pace</span>
                      </div>
                    </button>
                    <button
                      className={`mode-option ${gameMode === 'PRACTICE' ? 'selected' : ''}`}
                      onClick={() => setGameMode('PRACTICE')}
                    >
                      <CpuChipIcon className="mode-icon" />
                      <div>
                        <strong>Practice Mode</strong>
                        <span>Self-paced learning with immediate feedback</span>
                      </div>
                    </button>
                  </div>
                </div>

                <div className="game-settings-grid">
                  <div className="setting-group">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={gameSettings.randomizeQuestions}
                        onChange={(e) => setGameSettings({
                          ...gameSettings,
                          randomizeQuestions: e.target.checked
                        })}
                      />
                      Randomize question order
                    </label>
                  </div>

                  <div className="setting-group">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={gameSettings.randomizeAnswers}
                        onChange={(e) => setGameSettings({
                          ...gameSettings,
                          randomizeAnswers: e.target.checked
                        })}
                      />
                      Randomize answer options
                    </label>
                  </div>

                  <div className="setting-group">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={gameSettings.showAnswersAfterSubmission}
                        onChange={(e) => setGameSettings({
                          ...gameSettings,
                          showAnswersAfterSubmission: e.target.checked
                        })}
                      />
                      Show answers after submission
                    </label>
                  </div>

                  {gameMode !== 'LIVE' && (
                    <div className="setting-group">
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={gameSettings.allowRetake}
                          onChange={(e) => setGameSettings({
                            ...gameSettings,
                            allowRetake: e.target.checked
                          })}
                        />
                        Allow retakes
                      </label>
                    </div>
                  )}
                </div>

                <div className="create-game-actions">
                  <button
                    onClick={createGame}
                    disabled={createGameLoading || !selectedQuiz}
                    className="create-game-btn primary"
                  >
                    {createGameLoading ? 'Creating...' : `Create ${gameMode === 'LIVE' ? 'Live Game' : 'Assignment'}`}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'active' && (
        <div className="active-games-section">
          <div className="active-games-header">
            <h3>Active Games</h3>
            <button onClick={loadActiveGames} className="refresh-btn">
              Refresh
            </button>
          </div>

          {activeGames.length === 0 ? (
            <div className="empty-state">
              <p>No active games. Create a new game to get started!</p>
              <button
                onClick={() => setActiveTab('create')}
                className="create-game-btn"
              >
                Create Game
              </button>
            </div>
          ) : (
            <div className="active-games-grid">
              {activeGames.map(game => (
                <div key={game.id} className="active-game-card">
                  <div className="game-card-header">
                    <div className="game-info">
                      <h3>{game.quizTitle}</h3>
                      <p className="game-pin">PIN: {game.pin}</p>
                    </div>
                    <div className={`game-status ${game.status.toLowerCase()}`}>
                      {game.status}
                    </div>
                  </div>
                  
                  <div className="game-stats">
                    <div className="stat">
                      <UsersIcon className="stat-icon" />
                      <span>{game.playerCount} players</span>
                    </div>
                    <div className="stat">
                      <AcademicCapIcon className="stat-icon" />
                      <span>{game.mode}</span>
                    </div>
                    <div className="stat">
                      <ClockIcon className="stat-icon" />
                      <span>{new Date(game.createdAt).toLocaleTimeString()}</span>
                    </div>
                  </div>

                  <div className="game-actions">
                    <button
                      onClick={() => window.open(`/game/${game.id}/monitor`, '_blank')}
                      className="action-btn monitor"
                      title="Monitor Game"
                    >
                      <EyeIcon className="btn-icon" />
                      Monitor
                    </button>
                    <button
                      onClick={() => window.open(`/join?pin=${game.pin}`, '_blank')}
                      className="action-btn join"
                      title="Join as Player"
                    >
                      <PlayIcon className="btn-icon" />
                      Join
                    </button>
                    <button
                      onClick={() => handleEndGame(game.id)}
                      className="action-btn danger"
                      title="End Game"
                      disabled={game.status === 'FINISHED'}
                    >
                      <StopIcon className="btn-icon" />
                      End
                    </button>
                  </div>

                  {game.status === 'WAITING' && (
                    <div className="game-alert">
                      <ExclamationTriangleIcon className="alert-icon" />
                      <span>Waiting for players to join</span>
                    </div>
                  )}

                  {game.status === 'IN_PROGRESS' && (
                    <div className="game-progress">
                      <div className="progress-info">
                        <span>Question {game.currentQuestion || 1}</span>
                        <div className="live-indicator">
                          <span className="pulse-dot"></span>
                          Live
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GameHost; 