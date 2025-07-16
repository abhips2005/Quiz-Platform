// import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

// Import Supabase Auth Context instead of Firebase Auth Context
import { SupabaseAuthProvider } from './contexts/SupabaseAuthContext';

// Import pages
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import QuizList from './pages/QuizList';
import QuizCreator from './pages/QuizCreator';
import GameHost from './pages/GameHost';
import JoinGame from './pages/JoinGame';
import GamePlay from './pages/GamePlay';
import GameMonitor from './pages/GameMonitor';
import GameResults from './pages/GameResults';
import AnalyticsDashboard from './pages/AnalyticsDashboard';
import GameAnalytics from './pages/GameAnalytics';
import QuizAnalytics from './pages/QuizAnalytics';
import QuestionBank from './pages/QuestionBank';
import Layout from './components/Layout';

function App() {
  return (
    <SupabaseAuthProvider>
      <Router>
        <div className="App">
          <Toaster 
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#363636',
                color: '#fff',
              },
            }}
          />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/join" element={<JoinGame />} />
            <Route path="/game/:gameId/play" element={<GamePlay />} />
            <Route path="/game/:gameId/monitor" element={<GameMonitor />} />
            <Route path="/game/:gameId/results" element={<GameResults />} />
            <Route path="/" element={<Layout />}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="quizzes" element={<QuizList />} />
              <Route path="question-bank" element={<QuestionBank />} />
              <Route path="quiz/create" element={<QuizCreator />} />
              <Route path="quiz/edit/:id" element={<QuizCreator />} />
              <Route path="game/host" element={<GameHost />} />
              <Route path="analytics" element={<AnalyticsDashboard />} />
              <Route path="analytics/game/:gameId" element={<GameAnalytics />} />
              <Route path="analytics/quiz/:quizId" element={<QuizAnalytics />} />
            </Route>
          </Routes>
        </div>
      </Router>
    </SupabaseAuthProvider>
  );
}

export default App;
