import React, { useEffect } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate
} from 'react-router-dom';
import { DataProvider } from './contexts/DataContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { initializeDatabase } from './data/initDatabase';

// Layout
import Navbar from './components/Layout/Navbar';

// Pages
import HomePage from './pages/HomePage';
import StudySessionPage from './pages/StudySessionPage';
import CardEditorPage from './pages/CardEditorPage';
import DeckEditorPage from './pages/DeckEditorPage';
import NotFoundPage from './pages/NotFoundPage';
import ChallengeModePage from './pages/ChallengeModePage';
import PracticeModePage from './pages/PracticeModePage';
import KnowledgeGraphPage from './pages/KnowledgeGraphPage';

// Import global styles
import './App.css';

function App() {
  // Initialize database with mock data on first run
  useEffect(() => {
    initializeDatabase().catch(error => {
      console.error('Failed to initialize database:', error);
    });
  }, []);

  return (
    <DataProvider>
      <ThemeProvider>
        <Router>
          <Navbar />
          <div className="app-content-container">
            <Routes>
              <Route path="/" element={<HomePage />} />
              
              {/* Study Routes */}
              {/* The :deckId param will be 'random' for random mix, or an actual ID */}
              <Route path="/study/:deckId" element={<StudySessionPage />} />
              
              {/* Card Routes */}
              <Route path="/create-card" element={<CardEditorPage />} />
              <Route path="/edit-card/:cardId" element={<CardEditorPage />} />
              
              {/* Deck Routes */}
              <Route path="/create-deck" element={<DeckEditorPage />} />
              <Route path="/edit-deck/:deckId" element={<DeckEditorPage />} />
              
              {/* Advanced Mode Routes */}
              <Route path="/challenge" element={<ChallengeModePage />} />
              <Route path="/challenge/:deckId" element={<ChallengeModePage />} />
              <Route path="/practice" element={<PracticeModePage />} />
              <Route path="/practice/:deckId" element={<PracticeModePage />} />
              
              {/* Knowledge Graph */}
              <Route path="/knowledge-graph" element={<KnowledgeGraphPage />} />
              <Route path="/knowledge-graph/:deckId" element={<KnowledgeGraphPage />} />
              
              {/* Fallback for 404 - Not Found */}
              <Route path="/404" element={<NotFoundPage />} />
              <Route path="*" element={<Navigate replace to="/404" />} />
            </Routes>
          </div>
        </Router>
      </ThemeProvider>
    </DataProvider>
  );
}

export default App;
