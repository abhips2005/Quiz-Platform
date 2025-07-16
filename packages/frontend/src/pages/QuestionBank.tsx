import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import {
  PlusIcon,
  TrashIcon,
  PencilIcon,
  MagnifyingGlassIcon,

  XMarkIcon,
  BookmarkIcon,
  TagIcon
} from '@heroicons/react/24/outline';
import type { Question } from '@quizizz-platform/shared/types/quiz.types';
import { QuestionType } from '@quizizz-platform/shared/types/quiz.types';
import './QuestionBank.css';

interface QuestionBankItem {
  id: string;
  type: QuestionType;
  title: string;
  question: string;
  description?: string;
  explanation?: string;
  timeLimit: number;
  points: number;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  tags: string[];
  category: string;
  subject: string;
  isPublic: boolean;
  usageCount: number;
  correctAnswers?: string[];
  correctAnswer?: string;
  acceptedAnswers?: string[];
  options?: Array<{
    id: string;
    text: string;
    isCorrect: boolean;
  }>;
  createdAt: string;
  updatedAt: string;
}

interface QuestionFilters {
  search: string;
  type: QuestionType | 'ALL';
  difficulty: 'ALL' | 'EASY' | 'MEDIUM' | 'HARD';
  category: string;
  subject: string;
  tags: string[];
  isPublic: boolean | null;
}

interface NewQuestionData {
  type: QuestionType;
  question: string;
  explanation?: string;
  points: number;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  category: string;
  subject: string;
  tags: string[];
  isPublic: boolean;
  options?: Array<{
    text: string;
    isCorrect: boolean;
  }>;
  correctAnswer?: string;
  acceptedAnswers?: string[];
}

const QuestionBank: React.FC = () => {
  const [questions, setQuestions] = useState<QuestionBankItem[]>([]);
  const [filteredQuestions, setFilteredQuestions] = useState<QuestionBankItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showNewQuestionModal, setShowNewQuestionModal] = useState(false);
  // const [editingQuestion, setEditingQuestion] = useState<QuestionBankItem | null>(null);
  const [selectedQuestions, setSelectedQuestions] = useState<Set<string>>(new Set());
  
  const [filters, setFilters] = useState<QuestionFilters>({
    search: '',
    type: 'ALL',
    difficulty: 'ALL',
    category: '',
    subject: '',
    tags: [],
    isPublic: null
  });

  const [newQuestion, setNewQuestion] = useState<NewQuestionData>({
    type: QuestionType.MULTIPLE_CHOICE,
    question: '',
    explanation: '',
    points: 1,
    difficulty: 'MEDIUM',
    category: '',
    subject: '',
    tags: [],
    isPublic: false,
    options: [
      { text: '', isCorrect: true },
      { text: '', isCorrect: false },
      { text: '', isCorrect: false },
      { text: '', isCorrect: false }
    ]
  });

  const [availableTags, setAvailableTags] = useState<string[]>([]);
  // const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  // const [availableSubjects, setAvailableSubjects] = useState<string[]>([]);

  useEffect(() => {
    fetchQuestions();
    fetchMetadata();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [questions, filters]);

  const fetchQuestions = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/question-bank`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setQuestions(data.data.questions || []);
      } else {
        toast.error('Failed to fetch questions');
      }
    } catch (error) {
      toast.error('Failed to fetch questions');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMetadata = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/question-bank/metadata`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAvailableTags(data.data.tags || []);
        // setAvailableCategories(data.data.categories || []);
        // setAvailableSubjects(data.data.subjects || []);
      }
    } catch (error) {
      console.error('Failed to fetch metadata:', error);
    }
  };

  const applyFilters = () => {
    let filtered = [...questions];

    // Search filter
    if (filters.search) {
      filtered = filtered.filter(q =>
        q.question.toLowerCase().includes(filters.search.toLowerCase()) ||
        q.category.toLowerCase().includes(filters.search.toLowerCase()) ||
        q.subject.toLowerCase().includes(filters.search.toLowerCase()) ||
        q.tags.some(tag => tag.toLowerCase().includes(filters.search.toLowerCase()))
      );
    }

    // Type filter
    if (filters.type !== 'ALL') {
      filtered = filtered.filter(q => q.type === filters.type);
    }

    // Difficulty filter
    if (filters.difficulty !== 'ALL') {
      filtered = filtered.filter(q => q.difficulty === filters.difficulty);
    }

    // Category filter
    if (filters.category) {
      filtered = filtered.filter(q => 
        q.category.toLowerCase().includes(filters.category.toLowerCase())
      );
    }

    // Subject filter
    if (filters.subject) {
      filtered = filtered.filter(q => 
        q.subject.toLowerCase().includes(filters.subject.toLowerCase())
      );
    }

    // Tags filter
    if (filters.tags.length > 0) {
      filtered = filtered.filter(q => 
        filters.tags.every(tag => q.tags.includes(tag))
      );
    }

    // Public/Private filter
    if (filters.isPublic !== null) {
      filtered = filtered.filter(q => q.isPublic === filters.isPublic);
    }

    setFilteredQuestions(filtered);
  };

  const handleCreateQuestion = async () => {
    if (!newQuestion.question.trim()) {
      toast.error('Question text is required');
      return;
    }

    if (newQuestion.type === 'MULTIPLE_CHOICE' || newQuestion.type === 'CHECKBOX') {
      if (!newQuestion.options?.some(opt => opt.isCorrect)) {
        toast.error('At least one correct answer is required');
        return;
      }
    }

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/question-bank`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(newQuestion),
      });

      if (response.ok) {
        toast.success('Question added to bank successfully!');
        setShowNewQuestionModal(false);
        resetNewQuestion();
        fetchQuestions();
        fetchMetadata();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to create question');
      }
    } catch (error) {
      toast.error('Failed to create question');
    }
  };

  // const handleUpdateQuestion = async () => {
  //   if (!editingQuestion) return;

  //   try {
  //     const token = localStorage.getItem('accessToken');
  //     const response = await fetch(`${import.meta.env.VITE_API_URL}/question-bank/${editingQuestion.id}`, {
  //       method: 'PUT',
  //       headers: {
  //         'Content-Type': 'application/json',
  //         'Authorization': `Bearer ${token}`,
  //       },
  //       body: JSON.stringify(editingQuestion),
  //     });

  //     if (response.ok) {
  //       toast.success('Question updated successfully!');
  //       setEditingQuestion(null);
  //       fetchQuestions();
  //     } else {
  //       toast.error('Failed to update question');
  //     }
  //   } catch (error) {
  //     toast.error('Failed to update question');
  //   }
  // };

  const handleDeleteQuestion = async (questionId: string) => {
    if (!confirm('Are you sure you want to delete this question?')) return;

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/question-bank/${questionId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        toast.success('Question deleted successfully!');
        fetchQuestions();
      } else {
        toast.error('Failed to delete question');
      }
    } catch (error) {
      toast.error('Failed to delete question');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedQuestions.size === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedQuestions.size} question(s)?`)) return;

    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/question-bank/bulk-delete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ questionIds: Array.from(selectedQuestions) }),
      });

      if (response.ok) {
        toast.success(`${selectedQuestions.size} question(s) deleted successfully!`);
        setSelectedQuestions(new Set());
        fetchQuestions();
      } else {
        toast.error('Failed to delete questions');
      }
    } catch (error) {
      toast.error('Failed to delete questions');
    }
  };

  const resetNewQuestion = () => {
    setNewQuestion({
      type: QuestionType.MULTIPLE_CHOICE,
      question: '',
      explanation: '',
      points: 1,
      difficulty: 'MEDIUM',
      category: '',
      subject: '',
      tags: [],
      isPublic: false,
      options: [
        { text: '', isCorrect: true },
        { text: '', isCorrect: false },
        { text: '', isCorrect: false },
        { text: '', isCorrect: false }
      ]
    });
  };

  const toggleQuestionSelection = (questionId: string) => {
    const newSelected = new Set(selectedQuestions);
    if (newSelected.has(questionId)) {
      newSelected.delete(questionId);
    } else {
      newSelected.add(questionId);
    }
    setSelectedQuestions(newSelected);
  };

  const addTagToFilter = (tag: string) => {
    if (!filters.tags.includes(tag)) {
      setFilters(prev => ({
        ...prev,
        tags: [...prev.tags, tag]
      }));
    }
  };

  const removeTagFromFilter = (tag: string) => {
    setFilters(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag)
    }));
  };

  if (isLoading) {
    return (
      <div className="question-bank-loading">
        <div className="loading-spinner"></div>
        <p>Loading question bank...</p>
      </div>
    );
  }

  return (
    <div className="question-bank">
      <div className="question-bank-header">
        <div className="header-content">
          <h1>Question Bank</h1>
          <p>Build your library of reusable questions</p>
        </div>
        <div className="header-actions">
          {selectedQuestions.size > 0 && (
            <button onClick={handleBulkDelete} className="bulk-delete-btn">
              <TrashIcon className="icon" />
              Delete Selected ({selectedQuestions.size})
            </button>
          )}
          <button 
            onClick={() => setShowNewQuestionModal(true)}
            className="add-question-btn"
          >
            <PlusIcon className="icon" />
            Add Question
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="question-filters">
        <div className="search-section">
          <div className="search-box">
            <MagnifyingGlassIcon className="search-icon" />
            <input
              type="text"
              placeholder="Search questions, categories, tags..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="search-input"
            />
          </div>
        </div>

        <div className="filter-grid">
          <div className="filter-group">
            <label>Type</label>
            <select
              value={filters.type}
              onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value as any }))}
              className="filter-select"
            >
              <option value="ALL">All Types</option>
              <option value="MULTIPLE_CHOICE">Multiple Choice</option>
              <option value="CHECKBOX">Multiple Select</option>
              <option value="TRUE_FALSE">True/False</option>
              <option value="SHORT_ANSWER">Short Answer</option>
              <option value="FILL_IN_BLANK">Fill in Blank</option>
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
            <label>Category</label>
            <input
              type="text"
              placeholder="Filter by category"
              value={filters.category}
              onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
              className="filter-input"
            />
          </div>

          <div className="filter-group">
            <label>Subject</label>
            <input
              type="text"
              placeholder="Filter by subject"
              value={filters.subject}
              onChange={(e) => setFilters(prev => ({ ...prev, subject: e.target.value }))}
              className="filter-input"
            />
          </div>
        </div>

        {filters.tags.length > 0 && (
          <div className="active-tags">
            <span className="tags-label">Active Tags:</span>
            {filters.tags.map(tag => (
              <span key={tag} className="active-tag">
                {tag}
                <button onClick={() => removeTagFromFilter(tag)}>
                  <XMarkIcon className="tag-remove-icon" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="question-stats">
        <div className="stat-item">
          <span className="stat-number">{questions.length}</span>
          <span className="stat-label">Total Questions</span>
        </div>
        <div className="stat-item">
          <span className="stat-number">{filteredQuestions.length}</span>
          <span className="stat-label">Showing</span>
        </div>
        <div className="stat-item">
          <span className="stat-number">{selectedQuestions.size}</span>
          <span className="stat-label">Selected</span>
        </div>
        <div className="stat-item">
          <span className="stat-number">{availableTags.length}</span>
          <span className="stat-label">Total Tags</span>
        </div>
      </div>

      {/* Questions Grid */}
      <div className="questions-grid">
        {filteredQuestions.length > 0 ? (
          filteredQuestions.map((question) => (
            <div key={question.id} className="question-card">
              <div className="question-card-header">
                <div className="question-selection">
                  <input
                    type="checkbox"
                    checked={selectedQuestions.has(question.id)}
                    onChange={() => toggleQuestionSelection(question.id)}
                    className="question-checkbox"
                  />
                </div>
                <div className="question-meta">
                  <span className={`type-badge ${question.type.toLowerCase().replace('_', '-')}`}>
                    {question.type.replace('_', ' ')}
                  </span>
                  <span className={`difficulty-badge ${question.difficulty.toLowerCase()}`}>
                    {question.difficulty}
                  </span>
                  {question.isPublic && (
                    <span className="public-badge">Public</span>
                  )}
                </div>
                <div className="question-actions">
                  <button 
                    onClick={() => setEditingQuestion(question)}
                    className="edit-question-btn"
                    title="Edit Question"
                  >
                    <PencilIcon className="icon" />
                  </button>
                  <button 
                    onClick={() => handleDeleteQuestion(question.id)}
                    className="delete-question-btn"
                    title="Delete Question"
                  >
                    <TrashIcon className="icon" />
                  </button>
                </div>
              </div>

              <div className="question-content">
                <h3 className="question-text">{question.question}</h3>
                {question.explanation && (
                  <p className="question-explanation">{question.explanation}</p>
                )}
              </div>

              <div className="question-details">
                <div className="question-info">
                  <span className="question-points">{question.points} pts</span>
                  {question.category && (
                    <span className="question-category">{question.category}</span>
                  )}
                  {question.subject && (
                    <span className="question-subject">{question.subject}</span>
                  )}
                </div>
                <div className="question-usage">
                  <span className="usage-count">Used {question.usageCount} times</span>
                </div>
              </div>

              {question.tags.length > 0 && (
                <div className="question-tags">
                  {question.tags.map(tag => (
                    <span 
                      key={tag} 
                      className="question-tag"
                      onClick={() => addTagToFilter(tag)}
                    >
                      <TagIcon className="tag-icon" />
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              <div className="question-footer">
                <small>Created: {new Date(question.createdAt).toLocaleDateString()}</small>
              </div>
            </div>
          ))
        ) : (
          <div className="empty-state">
            <BookmarkIcon className="empty-icon" />
            <h3>No questions found</h3>
            <p>Start building your question bank by adding your first question!</p>
            <button 
              onClick={() => setShowNewQuestionModal(true)}
              className="add-first-question-btn"
            >
              <PlusIcon className="icon" />
              Add Your First Question
            </button>
          </div>
        )}
      </div>

      {/* New Question Modal would go here */}
      {showNewQuestionModal && (
        <div className="modal-overlay">
          <div className="modal-content new-question-modal">
            <div className="modal-header">
              <h2>Add New Question</h2>
              <button 
                onClick={() => setShowNewQuestionModal(false)}
                className="modal-close"
              >
                <XMarkIcon className="icon" />
              </button>
            </div>
            {/* Question form would go here - similar to QuizCreator */}
            <div className="modal-body">
              <p>Question creation form will be implemented here...</p>
            </div>
            <div className="modal-actions">
              <button 
                onClick={() => setShowNewQuestionModal(false)}
                className="cancel-btn"
              >
                Cancel
              </button>
              <button 
                onClick={handleCreateQuestion}
                className="save-btn"
              >
                Save Question
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuestionBank; 