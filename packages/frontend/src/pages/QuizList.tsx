import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { 
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  PlayIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  ShareIcon,
  ClockIcon,
  UsersIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';
import type { Quiz } from '@quizizz-platform/shared/types/quiz.types';
import { QuizStatus } from '@quizizz-platform/shared/types/quiz.types';
import { useAuth } from '../contexts/SupabaseAuthContext';
import './QuizList.css';

interface QuizFilters {
  status: 'ALL' | 'DRAFT' | 'PUBLISHED';
  difficulty: 'ALL' | 'EASY' | 'MEDIUM' | 'HARD';
  subject: string;
}

const QuizList: React.FC = () => {
  const { getAccessToken } = useAuth();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [filteredQuizzes, setFilteredQuizzes] = useState<Quiz[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<QuizFilters>({
    status: 'ALL',
    difficulty: 'ALL',
    subject: ''
  });
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchQuizzes();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [quizzes, searchTerm, filters]);

  const fetchQuizzes = async () => {
    try {
      const token = await getAccessToken();
      
      if (!token) {
        toast.error('Authentication required');
        return;
      }
      
      const response = await fetch(`${import.meta.env.VITE_API_URL}/quizzes`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setQuizzes(data.data.quizzes || []);
      } else {
        toast.error('Failed to fetch quizzes');
      }
    } catch (error) {
      toast.error('Failed to fetch quizzes');
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...quizzes];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(quiz =>
        quiz.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        quiz.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        quiz.subject?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (filters.status !== 'ALL') {
      filtered = filtered.filter(quiz => quiz.status === filters.status);
    }

    // Difficulty filter
    if (filters.difficulty !== 'ALL') {
      filtered = filtered.filter(quiz => quiz.difficulty === filters.difficulty);
    }

    // Subject filter
    if (filters.subject) {
      filtered = filtered.filter(quiz => 
        quiz.subject?.toLowerCase().includes(filters.subject.toLowerCase())
      );
    }

    setFilteredQuizzes(filtered);
  };

  const handleDeleteQuiz = async (quizId: string) => {
    if (!confirm('Are you sure you want to delete this quiz? This action cannot be undone.')) {
      return;
    }

    try {
      const token = await getAccessToken();
      if (!token) {
        toast.error('Authentication required');
        return;
      }
      
      const response = await fetch(`${import.meta.env.VITE_API_URL}/quizzes/${quizId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        setQuizzes(prev => prev.filter(quiz => quiz.id !== quizId));
        toast.success('Quiz deleted successfully');
      } else {
        toast.error('Failed to delete quiz');
      }
    } catch (error) {
      toast.error('Failed to delete quiz');
    }
  };

  const handleTogglePublish = async (quiz: Quiz) => {
    const newStatus = quiz.status === QuizStatus.PUBLISHED ? QuizStatus.DRAFT : QuizStatus.PUBLISHED;
    
    try {
      const token = await getAccessToken();
      if (!token) {
        toast.error('Authentication required');
        return;
      }
      
      const response = await fetch(`${import.meta.env.VITE_API_URL}/quizzes/${quiz.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          status: newStatus
        }),
      });

      if (response.ok) {
        setQuizzes(prev => prev.map(q => 
          q.id === quiz.id ? { ...q, status: newStatus } : q
        ));
        toast.success(`Quiz ${newStatus === 'PUBLISHED' ? 'published' : 'unpublished'} successfully`);
      } else {
        toast.error(`Failed to ${newStatus === 'PUBLISHED' ? 'publish' : 'unpublish'} quiz`);
      }
    } catch (error) {
      toast.error(`Failed to ${newStatus === 'PUBLISHED' ? 'publish' : 'unpublish'} quiz`);
    }
  };

  const startQuickGame = async (quiz: Quiz) => {
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
          quizId: quiz.id,
          gameMode: 'LIVE',
          settings: {
            showAnswers: quiz.showAnswers,
            randomizeQuestions: quiz.randomizeQuestions
          }
        })
      });

      if (response.ok) {
        const data = await response.json();
        const gamePin = data.data.game.pin;
        window.open(`/game/host/${gamePin}`, '_blank');
      } else {
        toast.error('Failed to start game');
      }
    } catch (error) {
      toast.error('Failed to start game');
    }
  };

  const copyQuizLink = (quiz: Quiz) => {
    const quizUrl = `${window.location.origin}/quiz/${quiz.id}`;
    navigator.clipboard.writeText(quizUrl);
    toast.success('Quiz link copied to clipboard!');
  };

  if (isLoading) {
    return (
      <div className="quiz-list-loading">
        <div className="loading-spinner"></div>
        <p>Loading your quizzes...</p>
      </div>
    );
  }

  return (
    <div className="quiz-list">
      <div className="quiz-list-header">
        <div className="header-content">
          <h1>My Quizzes</h1>
          <p>Create, manage, and analyze your quizzes</p>
        </div>
        <Link to="/quiz/create" className="create-quiz-btn">
          <PlusIcon className="icon" />
          Create New Quiz
        </Link>
      </div>

      <div className="quiz-list-controls">
        <div className="search-section">
          <div className="search-box">
            <MagnifyingGlassIcon className="search-icon" />
            <input
              type="text"
              placeholder="Search quizzes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className="filter-toggle"
          >
            <FunnelIcon className="icon" />
            Filters
          </button>
        </div>

        {showFilters && (
          <div className="filters-section">
            <div className="filter-group">
              <label>Status</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value as any }))}
                className="filter-select"
              >
                <option value="ALL">All Status</option>
                <option value="DRAFT">Draft</option>
                <option value="PUBLISHED">Published</option>
              </select>
            </div>
            <div className="filter-group">
              <label>Difficulty</label>
              <select
                value={filters.difficulty}
                onChange={(e) => setFilters(prev => ({ ...prev, difficulty: e.target.value as any }))}
                className="filter-select"
              >
                <option value="ALL">All Levels</option>
                <option value="EASY">Easy</option>
                <option value="MEDIUM">Medium</option>
                <option value="HARD">Hard</option>
              </select>
            </div>
            <div className="filter-group">
              <label>Subject</label>
              <input
                type="text"
                placeholder="Filter by subject..."
                value={filters.subject}
                onChange={(e) => setFilters(prev => ({ ...prev, subject: e.target.value }))}
                className="filter-input"
              />
            </div>
          </div>
        )}
      </div>

      <div className="quiz-stats">
        <div className="stat-item">
          <span className="stat-number">{quizzes.length}</span>
          <span className="stat-label">Total Quizzes</span>
        </div>
        <div className="stat-item">
          <span className="stat-number">{quizzes.filter(q => q.status === 'PUBLISHED').length}</span>
          <span className="stat-label">Published</span>
        </div>
        <div className="stat-item">
          <span className="stat-number">{quizzes.filter(q => q.status === 'DRAFT').length}</span>
          <span className="stat-label">Drafts</span>
        </div>
        <div className="stat-item">
          <span className="stat-number">{filteredQuizzes.length}</span>
          <span className="stat-label">Showing</span>
        </div>
      </div>

      <div className="quiz-grid">
        {filteredQuizzes.length > 0 ? (
          filteredQuizzes.map((quiz) => (
            <div key={quiz.id} className="quiz-card">
              <div className="quiz-card-header">
                <div className="quiz-status">
                  <span className={`status-badge ${quiz.status.toLowerCase()}`}>
                    {quiz.status}
                  </span>
                  {quiz.difficulty && (
                    <span className={`difficulty-badge ${quiz.difficulty.toLowerCase()}`}>
                      {quiz.difficulty}
                    </span>
                  )}
                </div>
                <div className="quiz-actions-dropdown">
                  <button className="action-toggle">⋮</button>
                  <div className="actions-menu">
                    <button onClick={() => copyQuizLink(quiz)}>
                      <ShareIcon className="icon" />
                      Copy Link
                    </button>
                    <button onClick={() => handleTogglePublish(quiz)}>
                      <EyeIcon className="icon" />
                      {quiz.status === 'PUBLISHED' ? 'Unpublish' : 'Publish'}

                    </button>
                    <button 
                      onClick={() => handleDeleteQuiz(quiz.id)}
                      className="delete-action"
                    >
                      <TrashIcon className="icon" />
                      Delete
                    </button>
                  </div>
                </div>
              </div>

              <div className="quiz-content">
                <h3 className="quiz-title">{quiz.title}</h3>
                {quiz.description && (
                  <p className="quiz-description">{quiz.description}</p>
                )}
                {quiz.subject && (
                  <div className="quiz-subject">{quiz.subject}</div>
                )}
              </div>

              <div className="quiz-stats-row">
                <div className="quiz-stat">
                  <ClockIcon className="stat-icon" />
                  <span>{quiz.questions?.length || 0} questions</span>
                </div>
                <div className="quiz-stat">
                  <UsersIcon className="stat-icon" />
                  <span>{quiz.timePerQuestion}s each</span>
                </div>
                <div className="quiz-stat">
                  <ChartBarIcon className="stat-icon" />
                  <span>{quiz._count?.games || 0} plays</span>
                </div>
              </div>

              <div className="quiz-card-actions">
                {quiz.status === 'PUBLISHED' && (
                  <button 
                    onClick={() => startQuickGame(quiz)}
                    className="play-btn"
                  >
                    <PlayIcon className="icon" />
                    Play
                  </button>
                )}
                <Link 
                  to={`/quiz/edit/${quiz.id}`}
                  className="edit-btn"
                >
                  <PencilIcon className="icon" />
                  Edit
                </Link>
              </div>

              <div className="quiz-card-footer">
                <small>
                  Updated: {new Date(quiz.updatedAt).toLocaleDateString()}
                </small>
              </div>
            </div>
          ))
        ) : (
          <div className="empty-state">
            {searchTerm || filters.status !== 'ALL' || filters.difficulty !== 'ALL' || filters.subject ? (
              <div className="no-results">
                <MagnifyingGlassIcon className="empty-icon" />
                <h3>No quizzes found</h3>
                <p>Try adjusting your search or filters</p>
                <button 
                  onClick={() => {
                    setSearchTerm('');
                    setFilters({ status: 'ALL', difficulty: 'ALL', subject: '' });
                  }}
                  className="clear-filters-btn"
                >
                  Clear Filters
                </button>
              </div>
            ) : (
              <div className="no-quizzes">
                <PlusIcon className="empty-icon" />
                <h3>No quizzes yet</h3>
                <p>Create your first quiz to get started!</p>
                <Link to="/quiz/create" className="create-first-quiz-btn">
                  <PlusIcon className="icon" />
                  Create Your First Quiz
                </Link>

              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default QuizList; 
