import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../contexts/SupabaseAuthContext';
import {
  UserIcon,
  HashtagIcon,
  PlayIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import './JoinGame.css';

interface JoinFormData {
  pin: string;
  playerName: string;
}

interface GameInfo {
  playerId: string;
  gameId: string;
  playerName: string;
  quiz: {
    id: string;
    title: string;
    description?: string;
  };
  gameMode: 'LIVE' | 'HOMEWORK' | 'PRACTICE';
  gameStatus: 'WAITING' | 'IN_PROGRESS' | 'SCHEDULED';
  playerCount: number;
}

const JoinGame: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, getAccessToken, isInitialized } = useAuth();
  const pinFromUrl = searchParams.get('pin') || '';

  const [formData, setFormData] = useState<JoinFormData>({
    pin: pinFromUrl,
    playerName: user?.firstName || ''
  });
  const [loading, setLoading] = useState(false);
  const [gameInfo, setGameInfo] = useState<GameInfo | null>(null);
  const [step, setStep] = useState<'enter-details' | 'waiting'>('enter-details');
  const [socket, setSocket] = useState<Socket | null>(null);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (isInitialized && !user) {
      const currentUrl = `/join${pinFromUrl ? `?pin=${pinFromUrl}` : ''}`;
      navigate(`/login?redirect=${encodeURIComponent(currentUrl)}`);
    }
  }, [isInitialized, user, navigate, pinFromUrl]);

  // Cleanup socket on unmount
  useEffect(() => {
    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [socket]);

  const handleInputChange = (field: keyof JoinFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const validatePin = (pin: string): boolean => {
    return /^\d{6}$/.test(pin);
  };

  const validatePlayerName = (name: string): boolean => {
    return name.trim().length >= 2 && name.trim().length <= 50;
  };

  const handleJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validatePin(formData.pin)) {
      toast.error('Please enter a valid 6-digit game PIN');
      return;
    }

    if (!validatePlayerName(formData.playerName)) {
      toast.error('Player name must be 2-50 characters long');
      return;
    }

    if (!user) {
      toast.error('Please log in to join games');
      navigate('/login');
      return;
    }

    setLoading(true);
    try {
      // Get auth token
      const token = await getAccessToken();
      if (!token) {
        toast.error('Authentication required');
        navigate('/login');
        return;
      }

      // Join the game directly
      const response = await fetch(`${import.meta.env.VITE_API_URL}/games/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          pin: formData.pin,
          username: formData.playerName.trim()
        })
      });

      if (response.ok) {
        const responseData = await response.json();
        const gameData = responseData.data.game;
        
        // Connect to WebSocket and actually join the game
        const wsUrl = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';
        const newSocket = io(wsUrl, {
          auth: { token }
        });
        setSocket(newSocket);
        
        newSocket.on('connect', () => {
          newSocket.emit('join_game', {
            gameId: gameData.id,
            pin: formData.pin
          });
        });

        newSocket.on('game_joined', (gameState: any) => {
          console.log('Game joined successfully:', gameState);
          
          const currentPlayer = gameState.players?.find((p: any) => p.userId === user.id) || 
                              gameState.players?.[gameState.players.length - 1];
          
          const gameInfo: GameInfo = {
            playerId: currentPlayer?.id || 'temp',
            gameId: gameState.id,
            playerName: formData.playerName,
            quiz: gameState.quiz,
            gameMode: 'LIVE',
            gameStatus: gameState.status,
            playerCount: gameState.players?.length || 0
          };
          
          setGameInfo(gameInfo);
          setStep('waiting');
          
          localStorage.setItem('gameSession', JSON.stringify({
            playerId: currentPlayer?.id,
            gameId: gameState.id,
            playerName: formData.playerName,
            pin: formData.pin
          }));

          toast.success(`Welcome ${formData.playerName}! Joined successfully.`);

          if (gameState.status === 'IN_PROGRESS') {
            navigate(`/game/${gameState.id}/play`);
          }
          
          // Don't disconnect socket - keep it alive to listen for game events
        });

        // Listen for game events while waiting
        newSocket.on('game_event', (event: any) => {
          console.log('Game event received:', event);
          
          switch (event.type) {
            case 'GAME_STARTED':
              toast.success('Game is starting!');
              navigate(`/game/${gameData.id}/play`);
              break;
            
            case 'PLAYER_JOINED':
              setGameInfo(prev => prev ? {
                ...prev,
                playerCount: prev.playerCount + 1
              } : null);
              break;
              
            case 'PLAYER_LEFT':
              setGameInfo(prev => prev ? {
                ...prev,
                playerCount: Math.max(0, prev.playerCount - 1)
              } : null);
              break;
          }
        });

        newSocket.on('error', (error: any) => {
          toast.error(error.message || 'Failed to join game');
          setLoading(false);
          newSocket.disconnect();
          setSocket(null);
        });
      } else {
        const errorData = await response.json();
        if (response.status === 404) {
          toast.error('Game not found. Please check the PIN and try again.');
        } else if (response.status === 400) {
          toast.error(errorData.error || 'Failed to join game');
        } else {
          toast.error('Failed to join game. Please try again.');
        }
        setLoading(false);
      }
    } catch (error) {
      console.error('Join game error:', error);
      toast.error('Connection error. Please try again.');
      setLoading(false);
    }
  };



  const resetForm = () => {
    if (socket) {
      socket.disconnect();
      setSocket(null);
    }
    setFormData({ pin: '', playerName: user?.firstName || '' });
    setGameInfo(null);
    setStep('enter-details');
  };

  const getGameModeDisplay = (mode: string) => {
    switch (mode) {
      case 'LIVE':
        return { label: 'Live Game', color: '#e53e3e', emoji: '🔴' };
      case 'HOMEWORK':
        return { label: 'Homework', color: '#3182ce', emoji: '📚' };
      case 'PRACTICE':
        return { label: 'Practice', color: '#38a169', emoji: '💪' };
      default:
        return { label: mode, color: '#718096', emoji: '🎮' };
    }
  };

  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'WAITING':
        return { label: 'Waiting to Start', color: '#ed8936', emoji: '⏳' };
      case 'IN_PROGRESS':
        return { label: 'In Progress', color: '#38a169', emoji: '▶️' };
      case 'SCHEDULED':
        return { label: 'Scheduled', color: '#3182ce', emoji: '📅' };
      default:
        return { label: status, color: '#718096', emoji: '❓' };
    }
  };

  return (
    <div className="join-game">
      <div className="join-game-background">
        <div className="background-shapes">
          <div className="shape shape-1"></div>
          <div className="shape shape-2"></div>
          <div className="shape shape-3"></div>
          <div className="shape shape-4"></div>
        </div>
      </div>

      <div className="join-game-container">
        <div className="join-game-header">
          <SparklesIcon className="header-icon" />
          <h1>Join Game</h1>
          <p>Enter your game PIN to start playing!</p>
        </div>

        {step === 'enter-details' && (
          <div className="join-form-section">
            <form onSubmit={handleJoinSubmit} className="join-form">
              <div className="form-group">
                <label htmlFor="pin">Game PIN</label>
                <div className="pin-input-container">
                  <HashtagIcon className="input-icon" />
                  <input
                    type="text"
                    id="pin"
                    value={formData.pin}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                      handleInputChange('pin', value);
                    }}
                    placeholder="123456"
                    maxLength={6}
                    className="pin-input"
                    autoComplete="off"
                    autoFocus
                  />
                </div>
                <p className="form-hint">Enter the 6-digit PIN from your teacher</p>
              </div>

              <div className="form-group">
                <label htmlFor="playerName">Your Name</label>
                <div className="name-input-container">
                  <UserIcon className="input-icon" />
                  <input
                    type="text"
                    id="playerName"
                    value={formData.playerName}
                    onChange={(e) => handleInputChange('playerName', e.target.value)}
                    placeholder="Enter your name"
                    maxLength={50}
                    className="name-input"
                    autoComplete="off"
                  />
                </div>
                <p className="form-hint">This name will be visible to other players</p>
              </div>

              <button
                type="submit"
                disabled={!validatePin(formData.pin) || !validatePlayerName(formData.playerName) || loading}
                className="submit-btn primary"
              >
                {loading ? (
                  <div className="loading-content">
                    <div className="spinner"></div>
                    <span>Joining Game...</span>
                  </div>
                ) : (
                  <div className="button-content">
                    <span>Join Game</span>
                    <PlayIcon className="button-icon" />
                  </div>
                )}
              </button>
            </form>
          </div>
        )}

        {step === 'waiting' && gameInfo && (
          <div className="waiting-section">
            <div className="game-info-card">
              <div className="game-info-header">
                <h3>{gameInfo.quiz.title}</h3>
                {gameInfo.quiz.description && (
                  <p className="game-description">{gameInfo.quiz.description}</p>
                )}
              </div>

              <div className="game-meta">
                <div className="meta-item">
                  <span className="meta-label">Game Mode:</span>
                  <span 
                    className="meta-value"
                    style={{ color: getGameModeDisplay(gameInfo.gameMode).color }}
                  >
                    {getGameModeDisplay(gameInfo.gameMode).emoji} {getGameModeDisplay(gameInfo.gameMode).label}
                  </span>
                </div>

                <div className="meta-item">
                  <span className="meta-label">Status:</span>
                  <span 
                    className="meta-value"
                    style={{ color: getStatusDisplay(gameInfo.gameStatus).color }}
                  >
                    {getStatusDisplay(gameInfo.gameStatus).emoji} {getStatusDisplay(gameInfo.gameStatus).label}
                  </span>
                </div>

                <div className="meta-item">
                  <span className="meta-label">Players:</span>
                  <span className="meta-value">{gameInfo.playerCount} joined</span>
                </div>
              </div>

              <div className="player-info">
                <div className="player-avatar">
                  {formData.playerName.charAt(0).toUpperCase()}
                </div>
                <div className="player-details">
                  <span className="player-name">{formData.playerName}</span>
                  <span className="player-status">✅ Ready to play</span>
                </div>
              </div>

              {gameInfo.gameStatus === 'WAITING' && (
                <div className="waiting-message">
                  <div className="waiting-animation">
                    <div className="dot dot-1"></div>
                    <div className="dot dot-2"></div>
                    <div className="dot dot-3"></div>
                  </div>
                  <p>Waiting for the teacher to start the game...</p>
                </div>
              )}

              {gameInfo.gameStatus === 'SCHEDULED' && (
                <div className="scheduled-message">
                  <p>This assignment will be available soon.</p>
                </div>
              )}

              <div className="waiting-actions">
                <button
                  onClick={resetForm}
                  className="submit-btn secondary"
                >
                  Leave Game
                </button>
                
                {gameInfo.gameStatus === 'IN_PROGRESS' && (
                  <button
                    onClick={() => navigate(`/game/${gameInfo.gameId}/play`)}
                    className="submit-btn primary"
                  >
                    <PlayIcon className="button-icon" />
                    Join Game Now
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="join-game-footer">
          <p>
            Don't have a PIN? Ask your teacher for the game PIN or 
            <button 
              onClick={() => navigate('/dashboard')}
              className="link-button"
            >
              go back to dashboard
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default JoinGame;