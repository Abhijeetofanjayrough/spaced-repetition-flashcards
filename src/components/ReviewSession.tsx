import React, { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import FlashcardComponent from './FlashcardComponent';
import { Card } from '../models/Card';
import { Deck } from '../models/Deck';
import '../styles/ReviewSession.css';

// Define rating options based on SM-2 quality (1-5)
const RATING_OPTIONS = [
  { label: 'Again', quality: 1, hint: '<1m' }, // Quality 1 (e.g. completely forgotten)
  { label: 'Hard', quality: 2, hint: '~1d' },  // Quality 2 (recalled with great difficulty)
  { label: 'Good', quality: 3, hint: '~3d' },  // Quality 3 (recalled with some difficulty)
  { label: 'Easy', quality: 4, hint: '~7d' },  // Quality 4 (recalled correctly)
  { label: 'V.Easy', quality: 5, hint: '~10d'} // Quality 5 (recalled with ease)
];

const ReviewSession: React.FC = () => {
  const params = useParams<{ deckId: string }>();
  const deckId = params.deckId;
  
  // Replace useNavigate with direct navigation
  const navigateTo = (path: string) => {
    window.location.href = path;
  };
  
  const { 
    getDeckById, 
    getDueCardsForDeck, 
    reviewCard,
    isLoading: isDataLoading 
  } = useData();

  const [deck, setDeck] = useState<Deck | null>(null);
  const [reviewQueue, setReviewQueue] = useState<Card[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [sessionStats, setSessionStats] = useState({ reviewed: 0, correctStreak: 0 }); // Basic stats for now

  const loadSessionData = useCallback(async () => {
    if (!deckId || isDataLoading) return;

    const currentDeck = getDeckById(deckId);
    if (currentDeck) {
      setDeck(currentDeck);
      const dueCards = getDueCardsForDeck(deckId);
      // For now, shuffle the due cards for variety
      setReviewQueue(dueCards.sort(() => Math.random() - 0.5)); 
      setCurrentCardIndex(0);
      setIsFlipped(false);
      setSessionComplete(dueCards.length === 0);
      setSessionStats({ reviewed: 0, correctStreak: 0 });
    } else {
      // Deck not found, navigate away or show error
      navigateTo('/');
    }
  }, [deckId, getDeckById, getDueCardsForDeck, navigateTo, isDataLoading]);

  useEffect(() => {
    loadSessionData();
  }, [loadSessionData]);

  const handleFlipCard = () => {
    setIsFlipped(prev => !prev);
  };

  const handleRateCard = (quality: 1 | 2 | 3 | 4 | 5) => {
    if (reviewQueue.length === 0 || currentCardIndex >= reviewQueue.length) return;

    const cardToReview = reviewQueue[currentCardIndex];
    reviewCard(cardToReview.id, quality);

    // Update streak and last studied deck info
    if (quality >= 3) { // Consider it studied if recalled with at least 'Good'
      const today = new Date().toISOString().split('T')[0];
      localStorage.setItem('lastStudiedDate', today);
      if (deckId) {
        localStorage.setItem('lastStudiedDeckId', deckId);
      }
      // The calculateStreak logic in Dashboard will handle incrementing the streak value itself.
    }

    setSessionStats(prev => ({
      ...prev,
      reviewed: prev.reviewed + 1,
      correctStreak: quality >=3 ? prev.correctStreak + 1 : 0
    }));

    if (currentCardIndex < reviewQueue.length - 1) {
      setCurrentCardIndex(prev => prev + 1);
      setIsFlipped(false); // Show front of next card
    } else {
      setSessionComplete(true);
    }
  };

  const handleFinishSession = () => {
    navigateTo('/'); // Navigate to dashboard or deck page
  };
  
  if (isDataLoading) {
    return <div className="loading">Loading session...</div>;
  }

  if (!deck) {
    return <div className="loading">Deck not found or loading...</div>;
  }

  if (sessionComplete) {
    return (
      <div className="review-session session-complete">
        <h1>Session Complete!</h1>
        <p>You reviewed {sessionStats.reviewed} cards.</p>
        {/* Add more stats from original component if needed */}
        <button className="btn-primary finish-button" onClick={handleFinishSession}>
          Back to Dashboard
        </button>
      </div>
    );
  }

  if (reviewQueue.length === 0 || currentCardIndex >= reviewQueue.length) {
    return (
      <div className="review-session">
        <h1>{deck.name}</h1>
        <p>No cards due for review in this deck right now!</p>
        <button className="btn-primary" onClick={handleFinishSession}>
          Back to Dashboard
        </button>
      </div>
    );
  }

  const currentCard = reviewQueue[currentCardIndex];

  return (
    <div className="review-session">
      <div className="session-header">
        <h1>Reviewing: {deck.name}</h1>
        {/* Timer can be added back here */}
      </div>

      <div className="progress-container">
        <div className="progress-text">
          Card {currentCardIndex + 1} of {reviewQueue.length}
        </div>
        <div className="progress-bar">
          <div 
            className="progress-fill"
            style={{ 
              width: `${((currentCardIndex +1) / reviewQueue.length) * 100}%`
            }}
          ></div>
        </div>
      </div>

      <FlashcardComponent
        frontContent={<div>{currentCard.front}</div>} 
        backContent={<div>{currentCard.back}</div>}
        isFlipped={isFlipped}
        onFlip={handleFlipCard}
      />

      {isFlipped && (
        <div className="rating-buttons">
          {RATING_OPTIONS.map(opt => (
            <button 
              key={opt.quality}
              className={`rating-btn rating-btn-q${opt.quality}`} // Added quality-specific class for styling
              onClick={() => handleRateCard(opt.quality as 1 | 2 | 3 | 4 | 5)}
              title={opt.hint} // Add hint for interval
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {!isFlipped && (
         <button 
            className="reveal-button btn-primary" 
            onClick={handleFlipCard}
          >
            Show Answer
          </button>
      )}
      
      <button className="btn-secondary exit-button" onClick={handleFinishSession}>
        Exit Session
      </button>
    </div>
  );
};

export default ReviewSession;
