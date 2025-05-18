import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import DeckList from './DeckList';
import StatisticsSnapshot from './StatisticsSnapshot';
import CircularProgressBar from './CircularProgressBar';
import ForecastChart from './ForecastChart';
import '../styles/HomeDashboard.css';

interface HomeDashboardProps {
  onNavigateToStudySession: (deckId: string) => void;
}

const HomeDashboard: React.FC<HomeDashboardProps> = ({ onNavigateToStudySession }) => {
  const { decks, cards, getCardsByDeckId } = useData();
  const [streakDays, setStreakDays] = useState(0);
  const [cardsToReviewToday, setCardsToReviewToday] = useState(0);
  const [mastery, setMastery] = useState(0);
  const [lastStudiedDeck, setLastStudiedDeck] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Calculate streak days from localStorage or context
    const storedStreak = localStorage.getItem('studyStreak');
    setStreakDays(storedStreak ? parseInt(storedStreak) : 0);
    
    // Get last studied deck
    const lastDeckId = localStorage.getItem('lastStudiedDeckId');
    setLastStudiedDeck(lastDeckId);
    
    // Calculate due cards for today
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    
    const dueCards = cards.filter(card => 
      new Date(card.scheduling.dueDate) <= today
    );
    
    setCardsToReviewToday(dueCards.length);
    
    // Calculate overall mastery (average of all cards' easeFactor relative to max 2.5)
    if (cards.length > 0) {
      const totalMastery = cards.reduce((sum, card) => 
        sum + (card.scheduling.easeFactor / 2.5), 0);
      setMastery(Math.round((totalMastery / cards.length) * 100));
    }
  }, [cards]);
  
  const handleContinueLastDeck = () => {
    if (lastStudiedDeck) {
      onNavigateToStudySession(lastStudiedDeck);
    }
  };
  
  const handleRandomMix = () => {
    navigate('/study/random');
  };
  
  const handleChallengeMode = () => {
    navigate('/challenge');
  };
  
  const handlePracticeMode = () => {
    navigate('/practice');
  };
  
  const handleCreateDeck = () => {
    // Navigate to deck creation page or open a modal
    navigate('/settings');
  };

  return (
    <div className="home-dashboard-container">
      <section className="dashboard-header">
        <div className="welcome-section">
          <h1>Welcome back</h1>
          <p className="subtitle">Your spaced repetition journey continues</p>
        </div>
        
        <div className="quick-stats">
          <div className="stat-card">
            <div className="stat-icon">📚</div>
            <div className="stat-value">{decks.length}</div>
            <div className="stat-label">Decks</div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">🔄</div>
            <div className="stat-value">{cardsToReviewToday}</div>
            <div className="stat-label">Due Today</div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">🔥</div>
            <div className="stat-value">{streakDays}</div>
            <div className="stat-label">Day Streak</div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">🧠</div>
            <div className="stat-progress">
              <CircularProgressBar percentage={mastery} size={60} />
            </div>
            <div className="stat-label">Mastery</div>
          </div>
        </div>
      </section>
      
      <section className="quick-actions">
        <h2>Quick Actions</h2>
        <div className="action-buttons">
          <button 
            className="action-button continue-button"
            onClick={handleContinueLastDeck}
            disabled={!lastStudiedDeck}
          >
            <span className="action-icon">▶️</span>
            <span className="action-text">Continue</span>
          </button>
          
          <button 
            className="action-button random-mix-button"
            onClick={handleRandomMix}
            disabled={cards.length === 0}
          >
            <span className="action-icon">🔀</span>
            <span className="action-text">Random Mix</span>
          </button>
          
          <button 
            className="action-button challenge-button"
            onClick={handleChallengeMode}
            disabled={cards.length === 0}
          >
            <span className="action-icon">🏆</span>
            <span className="action-text">Challenge Mode</span>
          </button>
          
          <button 
            className="action-button practice-button"
            onClick={handlePracticeMode}
            disabled={cards.length === 0}
          >
            <span className="action-icon">🧠</span>
            <span className="action-text">Practice Mode</span>
          </button>
          
          <button 
            className="action-button create-deck-button"
            onClick={handleCreateDeck}
          >
            <span className="action-icon">➕</span>
            <span className="action-text">Create Deck</span>
          </button>
        </div>
      </section>
      
      <div className="dashboard-main">
        <section className="decks-section">
          <h2>Your Decks</h2>
          <DeckList 
            decks={decks} 
            onSelectDeck={onNavigateToStudySession} 
          />
        </section>
        
        <aside className="dashboard-sidebar">
          <section className="statistics-section">
            <h2>Statistics</h2>
            <StatisticsSnapshot />
          </section>
          
          <section className="forecast-section">
            <h2>Weekly Forecast</h2>
            <ForecastChart />
          </section>
        </aside>
      </div>
    </div>
  );
};

export default HomeDashboard; 