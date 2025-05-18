import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card } from '../models/Card';
import Flashcard from './Flashcard';
import { calculateNextSchedule, getInitialScheduling, SchedulingData } from '../spacedRepetition';
import './StudySession.css';
import { reorderCardsForInterleaving, AdaptiveSettings } from './AdaptiveLearning';

export type StudySessionControls = {
  flipCard: () => void;
  rateCard: (rating: number) => void;
  toggleFavorite: () => void;
  showHint: () => void;
  restartSession: () => void;
  toggleView: () => void;
};

export type StudySessionProps = {
  cards: Card[];
  onSessionComplete?: (updatedCards: Card[]) => void;
  onFavoriteToggle?: (cardId: string) => void;
  onArchiveToggle?: (cardId: string) => void;
  onEditCardRequest?: (cardToEdit: Card) => void;
  onReportCardRequest?: (cardToReport: Card, reportText: string) => void;
  exportControls?: (controls: StudySessionControls) => void;
  onHint?: () => void;
};

// Define constants for learning/relearning if not already in SM2.ts or a central place
// For now, SM2.ts has LEARNING_STEPS and RELEARNING_STEPS

export const StudySession: React.FC<StudySessionProps> = ({ 
  cards, 
  onSessionComplete, 
  onFavoriteToggle, 
  onArchiveToggle, 
  onEditCardRequest, 
  onReportCardRequest,
  exportControls,
  onHint 
}) => {
  const [current, setCurrent] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [sessionCards, setSessionCards] = useState<Card[]>([]);
  const [completed, setCompleted] = useState(false);
  const [hintUsedForCurrentCard, setHintUsedForCurrentCard] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [timeToRecall, setTimeToRecall] = useState<number | null>(null);
  const [pressedRating, setPressedRating] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [showSideBySide, setShowSideBySide] = useState(false);
  const [showSessionStats, setShowSessionStats] = useState(false);
  const [sessionStats, setSessionStats] = useState({
    cardsStudied: 0,
    correct: 0,
    avgTimeMs: 0,
    totalTimeMs: 0
  });
  const [personalBestMessage, setPersonalBestMessage] = useState<string | null>(null);
  
  const timerRef = useRef<number | null>(null);
  const [cardElapsedSeconds, setCardElapsedSeconds] = useState(0);
  const cardTimerRef = useRef<number | null>(null);
  const [lastRatingForCurrentCard, setLastRatingForCurrentCard] = useState<number | null>(null);

  const selectSessionCards = useCallback(() => {
    const now = new Date();
    const activeCards = cards.filter(c => !c.archived);

    const learningCards = activeCards.filter(c => c.scheduling.learningStage === 'learning');
    const reviewAndRelearningCards = activeCards.filter(c => c.scheduling.learningStage === 'review' || c.scheduling.learningStage === 'relearning');

    const dueReviewCards = reviewAndRelearningCards
      .filter(c => c.scheduling.dueDate && new Date(c.scheduling.dueDate) <= now)
      .sort((a, b) => new Date(a.scheduling.dueDate).getTime() - new Date(b.scheduling.dueDate).getTime());

    const shuffledLearningCards = [...learningCards].sort(() => Math.random() - 0.5);

    const MAX_SESSION_CARDS_INTERNAL = 20; 
    const TARGET_NEW_RATIO_INTERNAL = 0.3;

    let selectedForSessionInternal: Card[] = [];
    
    const targetNewCountInternal = Math.floor(MAX_SESSION_CARDS_INTERNAL * TARGET_NEW_RATIO_INTERNAL);
    const targetReviewCount = MAX_SESSION_CARDS_INTERNAL - targetNewCountInternal;

    const actualReviewCards = dueReviewCards.slice(0, targetReviewCount);
    selectedForSessionInternal.push(...actualReviewCards);

    const remainingSlotsAfterReview = MAX_SESSION_CARDS_INTERNAL - selectedForSessionInternal.length;
    const newCardsToAddCount = Math.min(shuffledLearningCards.length, targetNewCountInternal, remainingSlotsAfterReview);
    const actualNewCards = shuffledLearningCards.slice(0, newCardsToAddCount);
    selectedForSessionInternal.push(...actualNewCards);
    
    if (selectedForSessionInternal.length < MAX_SESSION_CARDS_INTERNAL) {
        const additionalReviewNeeded = MAX_SESSION_CARDS_INTERNAL - selectedForSessionInternal.length;
        const availableAdditionalReview = dueReviewCards.slice(actualReviewCards.length); 
        selectedForSessionInternal.push(...availableAdditionalReview.slice(0, additionalReviewNeeded));
    }

    if (selectedForSessionInternal.length < MAX_SESSION_CARDS_INTERNAL) {
        const additionalNewNeeded = MAX_SESSION_CARDS_INTERNAL - selectedForSessionInternal.length;
        const availableAdditionalNew = shuffledLearningCards.slice(actualNewCards.length); 
        selectedForSessionInternal.push(...availableAdditionalNew.slice(0, additionalNewNeeded));
    }
    
    if (selectedForSessionInternal.length === 0 && activeCards.length > 0) {
        const fallbackSortedCards = [...activeCards].sort((a, b) => {
            const aIsNew = !a.scheduling.dueDate || a.scheduling.learningStage === 'learning';
            const bIsNew = !b.scheduling.dueDate || b.scheduling.learningStage === 'learning';
            const aDueDateVal = a.scheduling?.dueDate ? new Date(a.scheduling.dueDate) : new Date(0);
            const bDueDateVal = b.scheduling?.dueDate ? new Date(b.scheduling.dueDate) : new Date(0);
            const aIsDueTodayOrNew = aIsNew || aDueDateVal <= now;
            const bIsDueTodayOrNew = bIsNew || bDueDateVal <= now;
            if (aIsDueTodayOrNew && !bIsDueTodayOrNew) return -1;
            if (!aIsDueTodayOrNew && bIsDueTodayOrNew) return 1;
            return aDueDateVal.getTime() - bDueDateVal.getTime();
        }).slice(0, MAX_SESSION_CARDS_INTERNAL);
        return fallbackSortedCards;
    } else {
        selectedForSessionInternal.sort((a, b) => {
            const aEffectiveDueDate = a.scheduling.learningStage === 'learning' ? now.getTime() : new Date(a.scheduling.dueDate).getTime();
            const bEffectiveDueDate = b.scheduling.learningStage === 'learning' ? now.getTime() : new Date(b.scheduling.dueDate).getTime();
            return aEffectiveDueDate - bEffectiveDueDate;
        });
        return selectedForSessionInternal;
    }
  }, [cards]);

  useEffect(() => {
    setSessionCards(selectSessionCards());
    setCurrent(0);
    setCompleted(false);
    setFlipped(false);
    setHintUsedForCurrentCard(false);
    setElapsedSeconds(0);
    setSessionStats({
      cardsStudied: 0,
      correct: 0,
      avgTimeMs: 0,
      totalTimeMs: 0
    });
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    timerRef.current = window.setInterval(() => {
      setElapsedSeconds(prev => prev + 1);
    }, 1000);
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (cardTimerRef.current) {
        clearInterval(cardTimerRef.current);
      }
    };
  }, [cards, selectSessionCards]);

  useEffect(() => {
    if (!completed) {
        setStartTime(Date.now());
        setHintUsedForCurrentCard(false);
        setTimeToRecall(null);
        setPersonalBestMessage(null);
        setLastRatingForCurrentCard(null);
        
        setCardElapsedSeconds(0);
        if (cardTimerRef.current) {
          clearInterval(cardTimerRef.current);
        }
        cardTimerRef.current = window.setInterval(() => {
          setCardElapsedSeconds(prev => prev + 1);
        }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (cardTimerRef.current) {
        clearInterval(cardTimerRef.current);
      }
    }
    return () => {
        if (cardTimerRef.current) {
            clearInterval(cardTimerRef.current);
        }
    };
  }, [current, completed]);

  const internalRestartSession = useCallback(() => {
    setSessionCards(selectSessionCards());
    setCurrent(0);
    setCompleted(false);
    setFlipped(false);
    setHintUsedForCurrentCard(false);
    setElapsedSeconds(0);
    setSessionStats({
      cardsStudied: 0,
      correct: 0,
      avgTimeMs: 0,
      totalTimeMs: 0
    });
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    timerRef.current = window.setInterval(() => {
      setElapsedSeconds(prev => prev + 1);
    }, 1000);
    setCardElapsedSeconds(0);
  }, [selectSessionCards]);


  const card = sessionCards[current];

  const handleFlip = useCallback(() => {
    if (!flipped && startTime) {
      const recallTime = Date.now() - startTime;
      setTimeToRecall(recallTime);
    }
    setFlipped(f => !f);
  }, [flipped, startTime]);
  
  const handleHintUsedInternal = useCallback(() => {
    setHintUsedForCurrentCard(true);
    if (onHint) {
        onHint();
    }
  }, [onHint]);

  const handleToggleFavoriteCurrentCard = useCallback(() => {
    if (card && onFavoriteToggle) {
      onFavoriteToggle(card.id);
    }
  }, [card, onFavoriteToggle]);

  const handleToggleView = useCallback(() => {
    setShowSideBySide(prev => !prev);
  }, []);
  
  // Maps SM-2 quality (0-5) to a display rating (1-4) for UI feedback
  const mapQualityToDisplayRating = (quality: number): number => {
    if (quality <= 1) return 1; // Again (SM-2 quality 0 or 1)
    if (quality === 2) return 2; // Hard (SM-2 quality 2)
    if (quality === 3 || quality === 4) return 3; // Good (SM-2 quality 3 or 4)
    if (quality === 5) return 4; // Easy (SM-2 quality 5)
    return 1; // Default
  };

  const handleRate = useCallback((sm2Quality: number) => {
    const displayRating = mapQualityToDisplayRating(sm2Quality);
    setPressedRating(displayRating);
    setLastRatingForCurrentCard(displayRating);

    if (!card) return;

    const msToAnswer = timeToRecall || 0;
    const reviewDate = new Date().toISOString();

    // Create a new review history entry
    const newReviewEntry = {
      date: reviewDate,
      rating: sm2Quality, // Use the 0-5 SM-2 quality rating here
      msToAnswer,
      intervalBeforeReview: card.scheduling.interval,
      interval: 0, // This will be updated by calculateNextSchedule
      // daysOverdue: calculated if needed, or handled by adjustForOverdue if called separately
    };

    // Get the updated scheduling data from the consolidated SM-2 function
    const updatedScheduling = calculateNextSchedule(
      card.scheduling, 
      sm2Quality, 
      hintUsedForCurrentCard
    );

    const updatedCard: Card = {
      ...card,
      scheduling: updatedScheduling,
      reviewHistory: [
        ...(card.reviewHistory || []),
        { ...newReviewEntry, interval: updatedScheduling.interval }, // Store the new interval
      ],
      modified: reviewDate,
      // Update best recall time if applicable
      bestRecallTimeMs: (sm2Quality >=3 && (card.bestRecallTimeMs === undefined || msToAnswer < card.bestRecallTimeMs)) 
                        ? msToAnswer 
                        : card.bestRecallTimeMs,
    };

    const newSessionCards = [...sessionCards];
    newSessionCards[current] = updatedCard;
    setSessionCards(newSessionCards);

    setSessionStats(prevStats => ({
        ...prevStats,
        cardsStudied: prevStats.cardsStudied + 1,
        correct: sm2Quality >=3 ? prevStats.correct + 1 : prevStats.correct, // Base correctness on SM-2 quality
        totalTimeMs: prevStats.totalTimeMs + msToAnswer,
        avgTimeMs: (prevStats.totalTimeMs + msToAnswer) / (prevStats.cardsStudied + 1)
    }));

    if (current < sessionCards.length - 1) {
      setCurrent(c => c + 1);
      setFlipped(false);
    } else {
      setCompleted(true);
      if (sessionCards.length > 0) {
        localStorage.setItem('lastStudiedDeckId', sessionCards[0].deckId);
      }
      if (onSessionComplete) {
        onSessionComplete(newSessionCards);
      }
    }
  }, [card, current, sessionCards, onSessionComplete, timeToRecall, hintUsedForCurrentCard]);

  // Expose controls to parent component
  useEffect(() => {
    if (exportControls) {
      exportControls({
        flipCard: handleFlip,
        rateCard: handleRate,
        toggleFavorite: handleToggleFavoriteCurrentCard,
        showHint: handleHintUsedInternal,
        restartSession: internalRestartSession,
        toggleView: handleToggleView
      });
    }
  }, [exportControls, handleFlip, handleRate, handleToggleFavoriteCurrentCard, handleHintUsedInternal, internalRestartSession, handleToggleView]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown, flipped, showSideBySide, completed]);

  const formatMsToSeconds = (ms: number): string => {
    return (ms / 1000).toFixed(1) + 's';
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (completed) {
    return (
      <div className="study-session-complete">
        <h2>Session Complete!</h2>
        <p>You studied {sessionStats.cardsStudied} cards.</p>
        <p>Correct: {sessionStats.correct} ({sessionStats.cardsStudied > 0 ? Math.round((sessionStats.correct / sessionStats.cardsStudied) * 100) : 0}%)</p>
        <p>Total Time: {formatTime(elapsedSeconds)}</p>
        <p>Avg Time/Card: {sessionStats.cardsStudied > 0 ? (sessionStats.avgTimeMs / 1000).toFixed(1) : 0}s</p>
        <button onClick={internalRestartSession} className="cta">Study Again</button>
        <button onClick={() => { if(onSessionComplete) onSessionComplete(sessionCards); /* Typically parent navigates away */ }} >Back to Decks</button>
        <button onClick={() => setShowSessionStats(!showSessionStats)}>Toggle Detailed Stats</button>
        {showSessionStats && (
          <div className="detailed-session-stats">
            <h4>Cards Reviewed:</h4>
            <ul>
              {sessionCards.map(sc => (
                <li key={sc.id}>{sc.front.substring(0,30)}... - Last rating: {sc.reviewHistory.length > 0 ? sc.reviewHistory[sc.reviewHistory.length-1].rating : 'N/A'}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }
  
  const currentCardStyling = card.cardType === 'cloze' ? {fontSize: '1.3rem', alignItems: 'flex-start'} : {};

  const renderRatingButtons = () => {
    const ratingsOptions = [
      { label: "Again", sm2Quality: 0, displayRating: 1, className: "btn-again" },
      { label: "Hard", sm2Quality: 2, displayRating: 2, className: "btn-hard" },
      { label: "Good", sm2Quality: 3, displayRating: 3, className: "btn-good" }, // Could also map to sm2Quality: 4
      { label: "Easy", sm2Quality: 5, displayRating: 4, className: "btn-easy" },
    ];

    return (
      <div className="rating-buttons">
        {ratingsOptions.map(r => (
          <button 
            key={r.displayRating} 
            onClick={() => handleRate(r.sm2Quality)} 
            className={`${r.className} ${pressedRating === r.displayRating ? 'pressed' : ''}`}
          >
            {r.label}
          </button>
        ))}
      </div>
    );
  };

  const renderConfidenceScale = () => {
    if (!lastRatingForCurrentCard) return null;
    // Scale from 1 to 4, matching displayRatings that mapQualityToDisplayRating produces
    return (
      <div className="confidence-scale-container">
        <span className="confidence-label">Your Rating:</span>
        <div className="confidence-scale">
          {[1, 2, 3, 4].map(val => (
            <div 
              key={val} 
              className={`segment ${lastRatingForCurrentCard === val ? 'active' : (lastRatingForCurrentCard && lastRatingForCurrentCard > val) ? 'filled' : ''}`}
              title={`Rated: ${lastRatingForCurrentCard}`}
            ></div>
          ))}
        </div>
      </div>
    );
  };

  // Map Card to Flashcard type for Flashcard component
  const flashcardForDisplay = {
    id: card.id,
    front: card.front,
    back: card.back,
    mediaAttachments: card.mediaAttachments,
    tags: card.tags,
    deckId: card.deckId,
    created: card.created,
    modified: card.modified,
    reviewHistory: card.reviewHistory.map(r => ({
      date: r.date,
      rating: Math.max(1, Math.min(5, Math.round(r.rating))) as 1 | 2 | 3 | 4 | 5, // Cast to ReviewRating
      msToAnswer: r.msToAnswer,
      interval: r.interval
    })),
    scheduling: card.scheduling
  };

  // Inside the component, add the logic to use interleaving if enabled in settings
  useEffect(() => {
    // Get interleaving settings from localStorage
    const interleaveEnabled = localStorage.getItem('interleaving') === 'true';
    const interleaveDifficulty = localStorage.getItem('interleavingDifficulty') || 'medium';
    const interleaveTopicCount = parseInt(localStorage.getItem('interleavingTopicCount') || '3');
    
    // Only apply interleaving if enabled and we have cards to interleave
    if (interleaveEnabled && sessionCards.length > 3) {
      const adaptiveSettings: AdaptiveSettings = {
        interleaving: true,
        interleavingDifficulty: interleaveDifficulty as 'low' | 'medium' | 'high',
        interleavingTopicCount: interleaveTopicCount,
        adjustDifficulty: true,
        focusOnWeakAreas: true,
        customizeIntervals: false,
        intervalMultiplier: 1.0,
        prioritizeWeakCards: true,
        idealStudyTime: null,
        recommendedSessionLength: 20,
        initialEaseFactor: 2.5
      };
      
      // Reorder cards for interleaving practice
      const reorderedCards = reorderCardsForInterleaving(sessionCards, adaptiveSettings);
      setSessionCards(reorderedCards);
    }
  }, [sessionCards]); // Only run when the session cards are loaded

  return (
    <div className="study-session-container">
      <div className="session-header">
        <span>Card {current + 1} of {sessionCards.length}</span>
        <span>Session Time: {formatTime(elapsedSeconds)}</span>
        <span>Card Time: {formatTime(cardElapsedSeconds)}</span>
      </div>
      <div className="progress-bar-container">
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress}%` }} title={`Session Progress: ${progress.toFixed(0)}%`}></div>
        </div>
      </div>
      <Flashcard
        card={flashcardForDisplay}
        showAnswer={flipped}
        onFlip={handleFlip}
      />
      {!flipped ? (
        <div className="study-actions pre-flip">
          <button onClick={handleFlip} className="cta show-answer-btn">Show Answer</button>
          {onHint && (
            <button onClick={handleHintUsedInternal} className="standard hint-btn">Get a Hint</button>
          )}
        </div>
      ) : (
        <div className="study-actions post-flip rating-buttons">
          {renderRatingButtons()}
          {renderConfidenceScale()}
        </div>
      )}
      {personalBestMessage && (
        <div className="personal-best-toast animate-fade-in-out">
          {personalBestMessage}
        </div>
      )}
      <div className="study-session-footer-actions">
        <button onClick={handleToggleFavoriteCurrentCard} className="standard small-btn" title="Toggle Favorite">
          {card.favorite ? '❤️ Unfavorite' : '🤍 Favorite'}
        </button>
        <button onClick={handleEditCurrentCard} className="standard small-btn" title="Edit Card">✏️ Edit</button>
        {onArchiveToggle && (
          <button onClick={() => onArchiveToggle(card.id)} className="standard small-btn" title="Archive Card">
            {card.archived ? '⬆️ Unarchive' : '📦 Archive'}
          </button>
        )}
      </div>
    </div>
  );
};