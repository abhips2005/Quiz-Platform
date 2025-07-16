import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useAuth } from '../contexts/SupabaseAuthContext';
import {
  PlusIcon,
  TrashIcon,

  XMarkIcon,
  ArrowLeftIcon,

} from '@heroicons/react/24/outline';
import type { Question } from '@quizizz-platform/shared/types/quiz.types';
import { QuestionType } from '@quizizz-platform/shared/types/quiz.types';
import MediaUpload from '../components/MediaUpload/MediaUpload';
import MediaDisplay from '../components/MediaDisplay/MediaDisplay';
import { MathText } from '../components/MathRenderer/MathRenderer';
import './QuizCreator.css';

interface QuizFormData {
  title: string;
  description: string;
  subject: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  timePerQuestion: number;
  showAnswers: boolean;
  randomizeQuestions: boolean;
  isPublic: boolean;
}

interface QuestionFormData {
  type: QuestionType;
  question: string;
  explanation?: string;
  points: number;
  timeLimit?: number;
  options: Array<{
    text: string;
    isCorrect: boolean;
    explanation?: string;
  }>;
  correctAnswer?: string;
  acceptedAnswers?: string[];
  media?: {
    id: string;
    type: 'IMAGE' | 'AUDIO' | 'VIDEO';
    url: string;
    filename: string;
    size: number;
    mimeType: string;
  };
}

const QuizCreator: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getAccessToken } = useAuth();
  const isEditing = Boolean(id);

  const [quiz, setQuiz] = useState<QuizFormData>({
    title: '',
    description: '',
    subject: '',
    difficulty: 'MEDIUM',
    timePerQuestion: 30,
    showAnswers: true,
    randomizeQuestions: false,
    isPublic: false,
  });

  const [questions, setQuestions] = useState<QuestionFormData[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);


  useEffect(() => {
    if (isEditing && id) {
      loadQuiz(id);
    }
  }, [isEditing, id]);

  const loadQuiz = async (quizId: string) => {
    try {
      const token = await getAccessToken();
      if (!token) {
        toast.error('Authentication required');
        return;
      }
      
      const response = await fetch(`${import.meta.env.VITE_API_URL}/quizzes/${quizId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const quizData = data.data.quiz;
        
        setQuiz({
          title: quizData.title,
          description: quizData.description || '',
          subject: quizData.subject || '',
          difficulty: quizData.difficulty,
          timePerQuestion: quizData.timePerQuestion,
          showAnswers: quizData.showAnswers,
          randomizeQuestions: quizData.randomizeQuestions,
          isPublic: quizData.isPublic,
        });

        const formattedQuestions: QuestionFormData[] = quizData.questions.map((q: Question) => ({
          type: q.type,
          question: q.title,
          explanation: q.explanation,
          points: q.points,
          timeLimit: q.timeLimit,
          options: q.options || [],
          correctAnswer: q.correctAnswers?.[0] || '',
          acceptedAnswers: q.correctAnswers || [],
          media: q.media,
        }));

        setQuestions(formattedQuestions);
      } else {
        toast.error('Failed to load quiz');
        navigate('/quizzes');
      }
    } catch (error) {
      toast.error('Failed to load quiz');
      navigate('/quizzes');
    }
  };

  const handleQuizDataChange = (field: keyof QuizFormData, value: any) => {
    setQuiz(prev => ({ ...prev, [field]: value }));
  };

  const addQuestion = () => {
    const newQuestion: QuestionFormData = {
      type: QuestionType.MULTIPLE_CHOICE,
      question: '',
      points: 1,
      timeLimit: quiz.timePerQuestion,
      options: [
        { text: '', isCorrect: true },
        { text: '', isCorrect: false },
        { text: '', isCorrect: false },
        { text: '', isCorrect: false },
      ],
    };
    
    setQuestions(prev => [...prev, newQuestion]);
    setCurrentQuestionIndex(questions.length);
  };

  const updateQuestion = (index: number, field: keyof QuestionFormData, value: any) => {
    setQuestions(prev => prev.map((q, i) => 
      i === index ? { ...q, [field]: value } : q
    ));
  };

  const updateQuestionOption = (questionIndex: number, optionIndex: number, field: 'text' | 'isCorrect' | 'explanation', value: any) => {
    setQuestions(prev => prev.map((q, i) => {
      if (i === questionIndex) {
        const newOptions = q.options.map((opt, j) => {
          if (j === optionIndex) {
            if (field === 'isCorrect' && value && q.type === 'MULTIPLE_CHOICE') {
              // For multiple choice, only one can be correct
              return { ...opt, [field]: value };
            } else if (field === 'isCorrect' && value && q.type === 'MULTIPLE_CHOICE') {
              // Uncheck other options for multiple choice
              return { ...opt, [field]: value };
            }
            return { ...opt, [field]: value };
          } else if (field === 'isCorrect' && value && q.type === 'MULTIPLE_CHOICE') {
            // Uncheck other options for multiple choice
            return { ...opt, isCorrect: false };
          }
          return opt;
        });
        return { ...q, options: newOptions };
      }
      return q;
    }));
  };

  const addOption = (questionIndex: number) => {
    setQuestions(prev => prev.map((q, i) => 
      i === questionIndex 
        ? { ...q, options: [...q.options, { text: '', isCorrect: false }] }
        : q
    ));
  };

  const removeOption = (questionIndex: number, optionIndex: number) => {
    setQuestions(prev => prev.map((q, i) => 
      i === questionIndex 
        ? { ...q, options: q.options.filter((_, j) => j !== optionIndex) }
        : q
    ));
  };

  const removeQuestion = (index: number) => {
    setQuestions(prev => prev.filter((_, i) => i !== index));
    if (currentQuestionIndex === index) {
      setCurrentQuestionIndex(null);
    } else if (currentQuestionIndex !== null && currentQuestionIndex > index) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const saveQuiz = async (publish: boolean = false) => {
    if (!quiz.title.trim()) {
      toast.error('Quiz title is required');
      return;
    }

    if (questions.length === 0) {
      toast.error('Add at least one question');
      return;
    }

    // Validate questions
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.question.trim()) {
        toast.error(`Question ${i + 1} text is required`);
        return;
      }

      if (q.type === 'MULTIPLE_CHOICE' || q.type === 'CHECKBOX') {
        if (q.options.length < 2) {
          toast.error(`Question ${i + 1} needs at least 2 options`);
          return;
        }
        if (!q.options.some(opt => opt.isCorrect)) {
          toast.error(`Question ${i + 1} needs at least one correct answer`);
          return;
        }
      }
    }

    setIsPublishing(true);

    try {
      const payload = {
        ...quiz,
        questions: questions.map(q => ({
          ...q,
          options: q.options.length > 0 ? q.options : undefined,
        })),
        status: publish ? 'PUBLISHED' : 'DRAFT',
      };

      const token = await getAccessToken();
      if (!token) {
        toast.error('Authentication required');
        return;
      }
      
      const url = isEditing 
        ? `${import.meta.env.VITE_API_URL}/quizzes/${id}`
        : `${import.meta.env.VITE_API_URL}/quizzes`;
      
      const method = isEditing ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        toast.success(
          publish 
            ? `Quiz ${isEditing ? 'updated and published' : 'created and published'} successfully!`
            : `Quiz ${isEditing ? 'updated' : 'saved as draft'} successfully!`
        );
        navigate('/quizzes');
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to save quiz');
      }
    } catch (error) {
      toast.error('Failed to save quiz');
    } finally {
      setIsPublishing(false);
    }
  };

  const renderQuestionEditor = () => {
    if (currentQuestionIndex === null) return null;
    
    const question = questions[currentQuestionIndex];
    if (!question) return null;

    return (
      <div className="question-editor">
        <div className="question-editor-header">
          <h3>Question {currentQuestionIndex + 1}</h3>
          <button 
            onClick={() => removeQuestion(currentQuestionIndex)}
            className="remove-question-btn"
          >
            <TrashIcon className="icon" />
          </button>
        </div>

        <div className="form-group">
          <label>Question Type</label>
          <select
            value={question.type}
            onChange={(e) => updateQuestion(currentQuestionIndex, 'type', e.target.value as QuestionType)}
            className="form-select"
          >
            <option value="MULTIPLE_CHOICE">Multiple Choice</option>
            <option value="CHECKBOX">Multiple Select</option>
            <option value="TRUE_FALSE">True/False</option>
            <option value="SHORT_ANSWER">Short Answer</option>
            <option value="FILL_IN_BLANK">Fill in the Blank</option>
          </select>
        </div>

        <div className="form-group">
          <label>Question Text</label>
          <textarea
            value={question.question}
            onChange={(e) => updateQuestion(currentQuestionIndex, 'question', e.target.value)}
            placeholder="Enter your question here... (Use $math$ for inline math or $$math$$ for display math)"
            className="form-textarea"
            rows={3}
          />
          <div className="question-preview">
            <label>Preview:</label>
            <div className="math-preview">
              <MathText text={question.question || 'Enter question text to see preview...'} />
            </div>
          </div>
        </div>

        {/* Media Upload Section */}
        <div className="form-group">
          <label>Media (Optional)</label>
          {question.media ? (
            <div className="media-section">
              <MediaDisplay
                media={question.media}
                editable={true}
                onDelete={() => updateQuestion(currentQuestionIndex, 'media', undefined)}
                maxHeight="300px"
              />
            </div>
          ) : (
            <MediaUpload
              onUpload={(mediaFile) => updateQuestion(currentQuestionIndex, 'media', mediaFile)}
              maxSize={50}
              className="question-media-upload"
            />
          )}
        </div>

        <div className="question-settings">
          <div className="form-group">
            <label>Points</label>
            <input
              type="number"
              min="1"
              max="10"
              value={question.points}
              onChange={(e) => updateQuestion(currentQuestionIndex, 'points', parseInt(e.target.value))}
              className="form-input"
            />
          </div>
          <div className="form-group">
            <label>Time Limit (seconds)</label>
            <input
              type="number"
              min="5"
              max="300"
              value={question.timeLimit}
              onChange={(e) => updateQuestion(currentQuestionIndex, 'timeLimit', parseInt(e.target.value))}
              className="form-input"
            />
          </div>
        </div>

        {/* Render options for multiple choice and checkbox questions */}
        {(question.type === 'MULTIPLE_CHOICE' || question.type === 'CHECKBOX') && (
          <div className="question-options">
            <div className="options-header">
              <h4>Answer Options</h4>
              <button 
                onClick={() => addOption(currentQuestionIndex)}
                className="add-option-btn"
              >
                <PlusIcon className="icon" />
                Add Option
              </button>
            </div>

            {question.options.map((option, optionIndex) => (
              <div key={optionIndex} className="option-item">
                <div className="option-control">
                  <input
                    type={question.type === 'MULTIPLE_CHOICE' ? 'radio' : 'checkbox'}
                    name={`question-${currentQuestionIndex}-correct`}
                    checked={option.isCorrect}
                    onChange={(e) => updateQuestionOption(currentQuestionIndex, optionIndex, 'isCorrect', e.target.checked)}
                    className="option-checkbox"
                  />
                  <div className="option-text-group">
                    <input
                      type="text"
                      value={option.text}
                      onChange={(e) => updateQuestionOption(currentQuestionIndex, optionIndex, 'text', e.target.value)}
                      placeholder={`Option ${optionIndex + 1} (supports $math$)`}
                      className="option-input"
                    />
                    {option.text && (
                      <div className="option-preview">
                        <MathText text={option.text} />
                      </div>
                    )}
                  </div>
                  {question.options.length > 2 && (
                    <button
                      onClick={() => removeOption(currentQuestionIndex, optionIndex)}
                      className="remove-option-btn"
                    >
                      <XMarkIcon className="icon" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* True/False options */}
        {question.type === 'TRUE_FALSE' && (
          <div className="true-false-options">
            <h4>Correct Answer</h4>
            <div className="true-false-controls">
              <label className="true-false-option">
                <input
                  type="radio"
                  name={`question-${currentQuestionIndex}-tf`}
                  checked={question.correctAnswer === 'true'}
                  onChange={() => updateQuestion(currentQuestionIndex, 'correctAnswer', 'true')}
                />
                True
              </label>
              <label className="true-false-option">
                <input
                  type="radio"
                  name={`question-${currentQuestionIndex}-tf`}
                  checked={question.correctAnswer === 'false'}
                  onChange={() => updateQuestion(currentQuestionIndex, 'correctAnswer', 'false')}
                />
                False
              </label>
            </div>
          </div>
        )}

        {/* Short answer */}
        {question.type === 'SHORT_ANSWER' && (
          <div className="short-answer-setup">
            <h4>Accepted Answers</h4>
            <input
              type="text"
              value={question.acceptedAnswers?.join(', ') || ''}
              onChange={(e) => updateQuestion(currentQuestionIndex, 'acceptedAnswers', e.target.value.split(',').map(s => s.trim()))}
              placeholder="Enter accepted answers separated by commas"
              className="form-input"
            />
            <small>Students' answers will be checked against these values (case-insensitive)</small>
          </div>
        )}

        {/* Fill in the blank */}
        {question.type === 'FILL_IN_BLANK' && (
          <div className="fill-blank-setup">
            <h4>Correct Answer</h4>
            <input
              type="text"
              value={question.correctAnswer || ''}
              onChange={(e) => updateQuestion(currentQuestionIndex, 'correctAnswer', e.target.value)}
              placeholder="Enter the correct answer"
              className="form-input"
            />
            <small>Use _____ (5 underscores) in your question to indicate the blank</small>
          </div>
        )}

        <div className="form-group">
          <label>Explanation (optional)</label>
          <textarea
            value={question.explanation || ''}
            onChange={(e) => updateQuestion(currentQuestionIndex, 'explanation', e.target.value)}
            placeholder="Explain why this is the correct answer..."
            className="form-textarea"
            rows={2}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="quiz-creator">
      <div className="quiz-creator-header">
        <div className="header-left">
          <button onClick={() => navigate('/quizzes')} className="back-btn">
            <ArrowLeftIcon className="icon" />
            Back to Quizzes
          </button>
          <h1>{isEditing ? 'Edit Quiz' : 'Create New Quiz'}</h1>
        </div>
        <div className="header-actions">
          <button 
            onClick={() => saveQuiz(false)}
            disabled={isPublishing}
            className="save-draft-btn"
          >
            {isPublishing ? 'Saving...' : 'Save Draft'}
          </button>
          <button 
            onClick={() => saveQuiz(true)}
            disabled={isPublishing}
            className="publish-btn"
          >
            {isPublishing ? 'Publishing...' : 'Publish Quiz'}
          </button>
        </div>
      </div>

      <div className="quiz-creator-content">
        <div className="quiz-setup">
          <div className="quiz-info">
            <h2>Quiz Information</h2>
            
            <div className="form-group">
              <label>Quiz Title</label>
              <input
                type="text"
                value={quiz.title}
                onChange={(e) => handleQuizDataChange('title', e.target.value)}
                placeholder="Enter quiz title..."
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label>Description</label>
              <textarea
                value={quiz.description}
                onChange={(e) => handleQuizDataChange('description', e.target.value)}
                placeholder="Describe what this quiz is about..."
                className="form-textarea"
                rows={3}
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Subject</label>
                <input
                  type="text"
                  value={quiz.subject}
                  onChange={(e) => handleQuizDataChange('subject', e.target.value)}
                  placeholder="e.g., Mathematics, Science"
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label>Difficulty</label>
                <select
                  value={quiz.difficulty}
                  onChange={(e) => handleQuizDataChange('difficulty', e.target.value)}
                  className="form-select"
                >
                  <option value="EASY">Easy</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HARD">Hard</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>Default Time Per Question (seconds)</label>
              <input
                type="number"
                min="5"
                max="300"
                value={quiz.timePerQuestion}
                onChange={(e) => handleQuizDataChange('timePerQuestion', parseInt(e.target.value))}
                className="form-input"
              />
            </div>

            <div className="quiz-settings">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={quiz.showAnswers}
                  onChange={(e) => handleQuizDataChange('showAnswers', e.target.checked)}
                />
                Show correct answers after each question
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={quiz.randomizeQuestions}
                  onChange={(e) => handleQuizDataChange('randomizeQuestions', e.target.checked)}
                />
                Randomize question order
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={quiz.isPublic}
                  onChange={(e) => handleQuizDataChange('isPublic', e.target.checked)}
                />
                Make quiz public
              </label>
            </div>
          </div>

          <div className="questions-section">
            <div className="questions-header">
              <h2>Questions ({questions.length})</h2>
              <button onClick={addQuestion} className="add-question-btn">
                <PlusIcon className="icon" />
                Add Question
              </button>
            </div>

            <div className="questions-layout">
              <div className="questions-list">
                {questions.map((question, index) => (
                  <div 
                    key={index}
                    className={`question-item ${currentQuestionIndex === index ? 'active' : ''}`}
                    onClick={() => setCurrentQuestionIndex(index)}
                  >
                    <div className="question-preview">
                      <span className="question-number">{index + 1}</span>
                      <span className="question-type">{question.type.replace('_', ' ')}</span>
                      <span className="question-text">
                        {question.question || 'Untitled Question'}
                      </span>
                    </div>
                    <span className="question-points">{question.points} pts</span>
                  </div>
                ))}

                {questions.length === 0 && (
                  <div className="empty-questions">
                    <p>No questions added yet</p>
                    <button onClick={addQuestion} className="add-first-question-btn">
                      <PlusIcon className="icon" />
                      Add Your First Question
                    </button>
                  </div>
                )}
              </div>

              <div className="question-editor-container">
                {renderQuestionEditor()}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuizCreator; 