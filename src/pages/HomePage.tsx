import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import './HomePage.css';
import ForecastChart from '../components/ForecastChart';

const HomePage: React.FC = () => {
  const { decks, cards, getStudyStats, getStudyStreak, calculateDeckMastery } = useData();
  const [streak, setStreak] = useState(0);
  const [stats, setStats] = useState({
    cardsToStudy: 0,
    cardsLearned: 0,
    currentStreak: 0,
    retentionRate: 0,
    studyTimeMinutes: 0
  });
  
  useEffect(() => {
    // Get study statistics
    const studyStats = getStudyStats();
    setStats(studyStats);
    
    // Load streak separately since it's async
    const loadStreak = async () => {
      try {
        const currentStreak = await getStudyStreak();
        setStreak(currentStreak);
      } catch (error) {
        console.error("Error loading streak:", error);
      }
    };
    
    loadStreak();
  }, [getStudyStats, getStudyStreak]);
  
  // Calculate cards due today
  const dueToday = cards.filter(card => {
    if (!card.scheduling?.dueDate) return false;
    const dueDate = new Date(card.scheduling.dueDate);
    const today = new Date();
    return dueDate <= today;
  }).length;
  
  // Calculate 7-day forecast (simplified)
  const next7DaysDue = Array(7).fill(0).map((_, i) => {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + i);
    targetDate.setHours(23, 59, 59, 999);
    
    return cards.filter(card => {
      if (!card.scheduling?.dueDate) return false;
      const dueDate = new Date(card.scheduling.dueDate);
      const prevDate = new Date(targetDate);
      prevDate.setDate(prevDate.getDate() - 1);
      return dueDate > prevDate && dueDate <= targetDate;
    }).length;
  });
  
  return (
    <div className="home-page">
      <div className="dashboard-header">
        <h1>Your Learning Dashboard</h1>
        <div className="quick-actions">
          <Link to="/study/random" className="btn btn-primary">
            Random Mix
          </Link>
          <Link to={decks.length > 0 ? `/study/${decks[0].id}` : '/create-deck'} className="btn btn-secondary">
            Continue
          </Link>
          <Link to="/create-card" className="btn btn-outline">
            Create Card
          </Link>
        </div>
      </div>
      
      {/* Study Overview Panel */}
      <div className="dashboard-grid">
        <div className="overview-panel card">
          <h2>Study Overview</h2>
          
          <div className="stats-grid">
            <div className="stat-item">
              <div className="stat-value">{dueToday}</div>
              <div className="stat-label">Cards Due Today</div>
            </div>
            
            <div className="stat-item">
              <div className="stat-value">{stats.cardsLearned}</div>
              <div className="stat-label">Cards Learned</div>
            </div>
            
            <div className="stat-item">
              <div className="stat-value">{streak}</div>
              <div className="stat-label">Day Streak</div>
            </div>
            
            <div className="stat-item">
              <div className="stat-value">{stats.retentionRate}%</div>
              <div className="stat-label">Retention Rate</div>
            </div>
          </div>
          
          <div className="forecast-container">
            <h3>7-Day Forecast</h3>
            <ForecastChart />
          </div>
        </div>
        
        {/* Decks Panel */}
        <div className="decks-panel card">
          <div className="panel-header">
            <h2>Your Decks</h2>
            <Link to="/create-deck" className="btn btn-sm btn-outline">
              + New Deck
            </Link>
          </div>
          
          {decks.length === 0 ? (
            <div className="empty-state">
              <p>You don't have any decks yet. Create your first deck to get started!</p>
              <Link to="/create-deck" className="btn btn-primary">
                Create Your First Deck
              </Link>
            </div>
          ) : (
            <div className="decks-list">
              {decks.map(deck => {
                const deckCards = cards.filter(card => card.deckId === deck.id);
                const dueCards = deckCards.filter(card => {
                  if (!card.scheduling?.dueDate) return false;
                  const dueDate = new Date(card.scheduling.dueDate);
                  const today = new Date();
                  return dueDate <= today;
                }).length;
                const mastery = Math.round(calculateDeckMastery(deck.id) * 100);
                
                return (
                  <div key={deck.id} className="deck-item">
                    <div className="deck-info">
                      <h3 className="deck-name">{deck.name}</h3>
                      <div className="deck-stats">
                        <span>{deckCards.length} cards</span>
                        {dueCards > 0 && <span className="due-badge">{dueCards} due</span>}
                      </div>
                      <div className="deck-mastery-bar">
                        <div className="mastery-bar-bg">
                          <div className="mastery-bar-fill" style={{ width: `${mastery}%` }}></div>
                        </div>
                        <span className="mastery-label">Mastery: {mastery}%</span>
                      </div>
                    </div>
                    <div className="deck-actions">
                      <Link to={`/study/${deck.id}`} className="btn btn-sm btn-primary">
                        Study
                      </Link>
                      <div className="deck-menu">
                        <button className="btn btn-sm btn-ghost">•••</button>
                        <div className="deck-menu-dropdown">
                          <Link to={`/edit-deck/${deck.id}`}>Edit Deck</Link>
                          <Link to={`/knowledge-graph/${deck.id}`}>View Knowledge Graph</Link>
                          <Link to={`/challenge/${deck.id}`}>Challenge Mode</Link>
                          <Link to={`/practice/${deck.id}`}>Practice Mode</Link>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      
      {/* Study Modes Panel */}
      <div className="study-modes-panel card">
        <h2>Advanced Study Modes</h2>
        <div className="modes-grid">
          <Link to="/challenge" className="mode-card">
            <div className="mode-icon">🏆</div>
            <div className="mode-title">Challenge Mode</div>
            <div className="mode-description">
              Test your knowledge under time pressure to reinforce recall speed
            </div>
          </Link>
          
          <Link to="/practice" className="mode-card">
            <div className="mode-icon">🧠</div>
            <div className="mode-title">Practice Mode</div>
            <div className="mode-description">
              Strengthen memory through active recall and concept application
            </div>
          </Link>
          
          <Link to="/knowledge-graph" className="mode-card">
            <div className="mode-icon">🔗</div>
            <div className="mode-title">Knowledge Graph</div>
            <div className="mode-description">
              Visualize connections between concepts to build deeper understanding
            </div>
          </Link>
        </div>
      </div>
      
      {/* Streak and Achievements Teaser */}
      <div className="achievements-teaser">
        <div className="streak-display">
          <div className="streak-count">{streak}</div>
          <div className="streak-label">Day Streak</div>
        </div>
        <div className="achievements-cta">
          <h3>Keep your learning momentum!</h3>
          <p>Study every day to build your streak and unlock achievements.</p>
        </div>
      </div>
    </div>
  );
};

export default HomePage; 