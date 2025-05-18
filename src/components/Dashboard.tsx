import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { Deck, isRegularDeck, RegularDeck, FilteredDeck, DeckCommon } from '../models/Deck';
import '../styles/Dashboard.css';

type DeckWithStatsDisplay = (RegularDeck | FilteredDeck) & {
  cardCount: number;
  dueCount: number;
};

const Dashboard: React.FC = () => {
  const {
    decks: allDecks,
    getDueCardsForDeck,
    getAllDueCards,
    isLoading: isDataLoading,
  } = useData();
  
  // Instead of using useNavigate, use window.location.href
  const navigateTo = (path: string) => {
    window.location.href = path;
  };

  const [streak, setStreak] = useState(0);

  useEffect(() => {
    calculateStreak();
  }, []);

  const decksWithStats = useMemo((): DeckWithStatsDisplay[] => {
    if (isDataLoading) return [];
    return allDecks
      .map((deck): DeckWithStatsDisplay => ({
        ...deck,
        cardCount: isRegularDeck(deck) && deck.cardIds ? deck.cardIds.length : 0,
        dueCount: getDueCardsForDeck(deck.id).length,
      }))
      .sort((a, b) => b.dueCount - a.dueCount);
  }, [allDecks, getDueCardsForDeck, isDataLoading]);

  const totalDueCards = useMemo(() => {
    if (isDataLoading) return 0;
    return getAllDueCards().length;
  }, [getAllDueCards, isDataLoading]);

  const calculateStreak = () => {
    const today = new Date().toISOString().split('T')[0];
    const lastStudiedDate = localStorage.getItem('lastStudiedDate');
    let currentStreak = 0;
    const storedStreak = localStorage.getItem('studyStreak');

    if (lastStudiedDate) {
      if (lastStudiedDate === today) {
        currentStreak = storedStreak ? parseInt(storedStreak) : 1;
      } else {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        if (lastStudiedDate === yesterdayStr) {
          currentStreak = storedStreak ? parseInt(storedStreak) + 1 : 1;
        } else {
          currentStreak = 0;
        }
      }
    } else if (storedStreak && parseInt(storedStreak) > 0 && lastStudiedDate !== today) {
        currentStreak = 0;
    }

    localStorage.setItem('studyStreak', currentStreak.toString());
    setStreak(currentStreak);
  };

  const handleStartReview = () => {
    if (decksWithStats.length === 0) return;
    const deckToStudy = decksWithStats.find(deck => deck.dueCount > 0) || (decksWithStats.length > 0 ? decksWithStats[0] : null) ;
    if (deckToStudy) {
      navigateTo(`/study/${deckToStudy.id}`);
    }
  };

  const lastStudiedDeckId = localStorage.getItem('lastStudiedDeckId');
  const handleStartRandomMix = () => {
    navigateTo('/study/random');
  };

  if (isDataLoading) {
    return (
      <div className="dashboard-container">
        <div className="loading-spinner">Loading...</div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Dashboard</h1>
        <Link to="/deck/new" className="btn-primary create-deck-button">
          Create New Deck
        </Link>
      </div>

      <div className="overview-panel">
        <div className="overview-card">
          <h2>Today's Review</h2>
          <div className="overview-number">{totalDueCards}</div>
          <div className="overview-label">cards due</div>

          {totalDueCards > 0 ? (
            <button
              className="btn-secondary full-width-button"
              onClick={handleStartReview}
            >
              Start Review
            </button>
          ) : (
            <div className="congrats-message">All caught up! 🎉</div>
          )}
        </div>

        <div className="overview-card">
          <h2>Current Streak</h2>
          <div className="overview-number">{streak}</div>
          <div className="overview-label">days</div>

          <div className="streak-flames">
            {[...Array(Math.min(streak, 5))].map((_, i) => (
              <span key={i} className="flame-icon">🔥</span>
            ))}
          </div>
        </div>
      </div>

      <div className="dashboard-actions">
        {lastStudiedDeckId && (
          <button className="btn-primary" onClick={() => navigateTo(`/study/${lastStudiedDeckId}`)}>
            Continue Last Deck
          </button>
        )}
        <button className="btn-secondary" onClick={handleStartRandomMix}>
          Random Mix Review
        </button>
      </div>

      <h2>Your Decks</h2>

      {decksWithStats.length === 0 ? (
        <div className="empty-state">
          <p>You don't have any decks yet.</p>
          <Link to="/deck/new" className="btn-primary">
            Create Your First Deck
          </Link>
        </div>
      ) : (
        <div className="decks-grid">
          {decksWithStats.map((deck) => (
            <div key={deck.id} className="deck-card">
              <div className="deck-card-header">
                <h3>{deck.name}</h3>
                {deck.dueCount > 0 && (
                  <span className="due-badge">
                    {deck.dueCount} due
                  </span>
                )}
              </div>

              <p className="deck-description">
                {deck.description || 'No description.'}
              </p>

              <div className="deck-stats">
                <div className="stat-item">
                  <span className="stat-value">{deck.cardCount}</span>
                  <span className="stat-label">cards</span>
                </div>
              </div>

              <div className="deck-actions">
                <Link to={`/study/${deck.id}`} className="btn-primary">
                  Study
                </Link>
                <Link to={`/deck/${deck.id}`} className="btn-secondary">
                  Manage
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
