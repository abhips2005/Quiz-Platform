import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import {
  UserIcon,
  HashtagIcon,
  PlayIcon,
  ArrowRightIcon,
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
  const pinFromUrl = searchParams.get('pin') || '';

  const [formData, setFormData] = useState<JoinFormData>({
    pin: pinFromUrl,
    playerName: ''
  });
  const [loading, setLoading] = useState(false);
  const [gameInfo, setGameInfo] = useState<GameInfo | null>(null);
  const [step, setStep] = useState<'enter-pin' | 'enter-name' | 'waiting'>('enter-pin');

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

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validatePin(formData.pin)) {
      toast.error('Please enter a valid 6-digit game PIN');
      return;
    }

    setLoading(true);
    try {
      // First, just validate the PIN exists by attempting to join with a temporary name
      const response = await fetch(`${import.meta.env.VITE_API_URL}/game-host/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          pin: formData.pin,
          playerName: `temp_${Date.now()}` // Temporary name to validate PIN
        })
      });

      if (response.ok) {
        // PIN is valid, move to name entry step
        setStep('enter-name');
        toast.success('Game found! Enter your name to join.');
      } else {
        const errorData = await response.json();
        if (response.status === 404) {
          toast.error('Game not found. Please check the PIN and try again.');
        } else if (response.status === 400) {
          if (errorData.error.includes('full')) {
            toast.error('This game is full. Please try again later.');
          } else {
            toast.error(errorData.error);
          }
        } else {
          toast.error('Failed to find game. Please try again.');
        }
      }
    } catch (error) {
      console.error('Pin validation error:', error);
      toast.error('Connection error. Please check your internet and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinGame = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validatePlayerName(formData.playerName)) {
      toast.error('Player name must be 2-50 characters long');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/game-host/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          pin: formData.pin,
          playerName: formData.playerName.trim()
        })
      });

      if (response.ok) {
        const data: GameInfo = await response.json();
        setGameInfo(data);
        setStep('waiting');
        
        // Store player info in localStorage for the game session
        localStorage.setItem('gameSession', JSON.stringify({
          playerId: data.playerId,
          gameId: data.gameId,
          playerName: data.playerName,
          pin: formData.pin
        }));

        toast.success(`Welcome ${data.playerName}! Joined successfully.`);

        // If game is already in progress, navigate to game play
        if (data.gameStatus === 'IN_PROGRESS') {
          navigate(`/game/${data.gameId}/play`);
        }
      } else {
        const errorData = await response.json();
        if (errorData.error.includes('name already taken')) {
          toast.error('This name is already taken. Please choose a different name.');
        } else if (errorData.error.includes('full')) {
          toast.error('This game is full. Please try again later.');
        } else {
          toast.error(errorData.error || 'Failed to join game');
        }
      }
    } catch (error) {
      console.error('Join game error:', error);
      toast.error('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({ pin: '', playerName: '' });
    setGameInfo(null);
    setStep('enter-pin');
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

        {step === 'enter-pin' && (
          <div className="join-form-section">
            <form onSubmit={handlePinSubmit} className="join-form">
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

              <button
                type="submit"
                disabled={!validatePin(formData.pin) || loading}
                className="submit-btn primary"
              >
                {loading ? (
                  <div className="loading-content">
                    <div className="spinner"></div>
                    <span>Finding Game...</span>
                  </div>
                ) : (
                  <div className="button-content">
                    <span>Find Game</span>
                    <ArrowRightIcon className="button-icon" />
                  </div>
                )}
              </button>
            </form>
          </div>
        )}

        {step === 'enter-name' && (
          <div className="join-form-section">
            <div className="step-indicator">
              <div className="step-info">
                <span className="step-number">Step 2 of 2</span>
                <h3>Choose Your Name</h3>
              </div>
            </div>

            <form onSubmit={handleJoinGame} className="join-form">
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
                    autoFocus
                  />
                </div>
                <p className="form-hint">This name will be visible to other players</p>
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  onClick={resetForm}
                  className="submit-btn secondary"
                >
                  Back to PIN
                </button>
                
                <button
                  type="submit"
                  disabled={!validatePlayerName(formData.playerName) || loading}
                  className="submit-btn primary"
                >
                  {loading ? (
                    <div className="loading-content">
                      <div className="spinner"></div>
                      <span>Joining...</span>
                    </div>
                  ) : (
                    <div className="button-content">
                      <span>Join Game</span>
                      <PlayIcon className="button-icon" />
                    </div>
                  )}
                </button>
              </div>
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