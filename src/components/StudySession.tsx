import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, ReviewHistory } from '../models/Card';
import Flashcard from './Flashcard';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
// eslint-disable-next-line @typescript-eslint/no-unused-vars
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { calculateNextSchedule, getInitialScheduling, SchedulingData } from '../spacedRepetition';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import ReportCardModal from './ReportCardModal';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import './StudySession.css';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { reorderCardsForInterleaving, AdaptiveSettings } from './AdaptiveLearning';
import { useNavigate, useParams } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
// import { useReview } from '../contexts/ReviewContext'; // Removed as recordReview is not used
import CircularProgressBar from './CircularProgressBar';
import Confetti from 'react-confetti';
import FocusMode from './FocusMode';
import RetrievalPractice from './RetrievalPractice';

export type StudySessionControls = {
  flipCard: () => void;
  rateCard: (rating: number) => void;
  toggleFavorite: () => void;
  showHint: () => void;
  restartSession: () => void;
  toggleView: () => void;
};

export type StudySessionProps = {
  deckId?: string;
  randomMode?: boolean;
};

// Define constants for learning/relearning if not already in SM2.ts or a central place
// For now, SM2.ts has LEARNING_STEPS and RELEARNING_STEPS

export const StudySession: React.FC<StudySessionProps> = ({ deckId: propDeckId, randomMode = false }) => {
  const { deckId: paramDeckId } = useParams<{ deckId: string }>();
  const effectiveDeckId = propDeckId || paramDeckId;
  
  const { 
    cards, 
    decks, 
    getCardsByDeckId,
    reviewCard,
    updateCard
  } = useData();
  
  // const { recordReview } = useReview(); // Removed
  const navigate = useNavigate();
  
  const [sessionCards, setSessionCards] = useState<Card[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [sessionComplete, setSessionComplete] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [sessionStats, setSessionStats] = useState({
    totalCards: 0,
    cardsReviewed: 0,
    correctCards: 0, // rating >= 3
    averageRating: 0,
    totalTimeMs: 0
  });
  
  // Timer state
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const startTimeRef = useRef<number>(0);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Confidence scale state
  const [confidence, setConfidence] = useState<number>(0);
  const [showConfidenceScale, setShowConfidenceScale] = useState(false);
  
  const timerRef = useRef<number | null>(null);
  const cardTimerRef = useRef<number | null>(null);
  const [lastRatingForCurrentCard, setLastRatingForCurrentCard] = useState<number | null>(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [cardForReporting, setCardForReporting] = useState<Card | null>(null);
  
  // Focus mode state
  const [focusModeActive, setFocusModeActive] = useState(false);

  // New state for retrieval practice
  const [showRetrievalPractice, setShowRetrievalPractice] = useState(false);
  const [retrievalPracticeStats, setRetrievalPracticeStats] = useState<{
    attempts: number;
    successful: number;
    types: { explain: number; apply: number; connect: number };
  }>({
    attempts: 0,
    successful: 0,
    types: { explain: 0, apply: 0, connect: 0 }
  });

  const [isProcessingReview, setIsProcessingReview] = useState<boolean>(false);
  const [cardRevealTime, setCardRevealTime] = useState<number | null>(null);
  const [hintUsed, setHintUsed] = useState(false);
  const [showHint, setShowHint] = useState(false);

  // Format time helper function
  const formatTime = (ms: number, includeMs: boolean = false): string => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    
    if (includeMs && ms < 1000) {
      return `${ms}ms`;
    }
    
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Placeholder for handleKeyDown to resolve linter error
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Future keyboard shortcut implementation
  }, []);

  const selectSessionCards = useCallback(() => {
    const now = new Date();
    
    if (effectiveDeckId) {
      const deckCards = getCardsByDeckId(effectiveDeckId);
      const activeCards = deckCards.filter(c => !c.archived);
      // Rest of the function remains the same...
      
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
    } else {
      // Random mode - select cards from all decks
      const activeCards = cards.filter(c => !c.archived);
      const shuffledCards = [...activeCards].sort(() => Math.random() - 0.5).slice(0, 20);
      return shuffledCards;
    }
  }, [cards, effectiveDeckId, getCardsByDeckId]);

  useEffect(() => {
    setSessionCards(selectSessionCards());
    setCurrentCardIndex(0);
    setSessionComplete(false);
    setShowAnswer(false);
    setConfidence(0);
    setSessionStats({
      totalCards: sessionCards.length,
      cardsReviewed: 0,
      correctCards: 0,
      averageRating: 0,
      totalTimeMs: 0
    });
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    timerRef.current = window.setInterval(() => {
      setElapsedTime(prev => prev + 1);
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
    if (!sessionComplete) {
        startTimeRef.current = Date.now();
        setShowAnswer(false);
        setConfidence(0);
        setLastRatingForCurrentCard(null);
        
        if (cardTimerRef.current) {
          clearInterval(cardTimerRef.current);
        }
        cardTimerRef.current = window.setInterval(() => {
          setElapsedTime(Date.now() - startTimeRef.current);
        }, 100);
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
  }, [currentCardIndex, sessionComplete]);

  const internalRestartSession = useCallback(() => {
    setSessionCards(selectSessionCards());
    setCurrentCardIndex(0);
    setSessionComplete(false);
    setShowAnswer(false);
    setConfidence(0);
    setSessionStats({
      totalCards: sessionCards.length,
      cardsReviewed: 0,
      correctCards: 0,
      averageRating: 0,
      totalTimeMs: 0
    });
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    timerRef.current = window.setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);
  }, [selectSessionCards]);

  const card = sessionCards[currentCardIndex];

  const handleShowAnswer = () => {
    setShowAnswer(true);
    setShowHint(false);
  };
  
  const handleConfidenceChange = (value: number) => {
    setConfidence(value);
  };

  const handleShowHint = () => {
    setShowHint(true);
    setHintUsed(true);
  };

  const handleRating = async (rating: 1 | 2 | 3 | 4 | 5) => {
    if (!sessionCards[currentCardIndex] || isProcessingReview) return;

    const cardToReview = sessionCards[currentCardIndex];
    setIsProcessingReview(true);

    const msToAnswer = Date.now() - (cardRevealTime || Date.now());
    
    try {
      const updatedCard = await reviewCard(cardToReview.id, rating, hintUsed, msToAnswer);
      
      if (updatedCard) {
        const updatedSessionCards = sessionCards.map(card => card.id === updatedCard.id ? updatedCard : card);
        setSessionCards(updatedSessionCards);
      }

    } catch (error) {
      console.error("Error processing card review:", error);
      // Handle error appropriately (e.g., show toast notification)
    }

    setSessionStats(prev => ({
      ...prev,
      cardsReviewed: prev.cardsReviewed + 1,
      correctCards: rating >= 3 ? prev.correctCards + 1 : prev.correctCards,
      averageRating: (prev.averageRating * prev.cardsReviewed + rating) / (prev.cardsReviewed + 1),
      totalTimeMs: prev.totalTimeMs + msToAnswer
    }));
    
    setShowConfidenceScale(false);
    advanceToNextCard(); 
  };

  const handleRetrievalPracticeComplete = (success: boolean, type: string) => {
    setRetrievalPracticeStats(prev => ({
      attempts: prev.attempts + 1,
      successful: prev.successful + (success ? 1 : 0),
      types: {
        ...prev.types,
        [type]: (prev.types as any)[type] + 1
      }
    }));
    
    setTimeout(() => {
      setShowRetrievalPractice(false);
      advanceToNextCard();
    }, 1500);
  };
  
  const advanceToNextCard = () => {
    if (currentCardIndex < sessionCards.length - 1) {
      setCurrentCardIndex(prevIndex => prevIndex + 1);
      setShowAnswer(false);
      setCardRevealTime(null);
      setConfidence(0); 
    } else {
      setSessionComplete(true);
      setShowConfetti(true);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
    setIsProcessingReview(false);
  };

  const handleReturnHome = () => {
    navigate('/');
  };

  const handleRestartSession = () => {
    setCurrentCardIndex(0);
    setShowAnswer(false);
    setSessionComplete(false);
    setShowConfidenceScale(false);
    setConfidence(0);
    setSessionStats({
      totalCards: sessionCards.length,
      cardsReviewed: 0,
      correctCards: 0,
      averageRating: 0,
      totalTimeMs: 0
    });
    setRetrievalPracticeStats({
      attempts: 0,
      successful: 0,
      types: { explain: 0, apply: 0, connect: 0 }
    });
    if (timerRef.current) {
      timerRef.current = window.setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    }
  };

  const handleFocusModeComplete = () => {
    const completionSound = new Audio('/sounds/success.mp3');
    completionSound.play().catch(error => {
      console.error('Error playing completion sound:', error);
    });
    
    if (Notification.permission === 'granted') {
      new Notification('Focus Session Complete', {
        body: 'Well done! Take a short break or continue studying.',
        icon: '/logo192.png'
      });
    }
  };

  const handleReportCard = (card: Card) => {
    setCardForReporting(card);
    setIsReportModalOpen(true);
  };
  
  const handleReportSubmit = (text: string) => {
    if (!cardForReporting) return;
    const updatedCard = {
      ...cardForReporting,
      hasReportedIssue: true,
      issueNotes: text,
      modified: new Date().toISOString(),
    };
    updateCard(updatedCard);
    setIsReportModalOpen(false);
  };
  
  const handleToggleFavorite = (card: Card) => {
    if (!card) return;
    const updatedCard = {
      ...card,
      favorite: !card.favorite,
      modified: new Date().toISOString(),
    };
    updateCard(updatedCard);

    // Update card in the session cards array
    setSessionCards(prevCards => 
      prevCards.map(c => c.id === card.id ? updatedCard : c)
    );
  };

  if (sessionCards.length === 0) {
    return (
      <div className="study-session-container">
        <div className="no-cards-message">
          <h2>No cards to review</h2>
          <p>There are no cards due for review in this deck right now.</p>
          <p>You're all caught up! Check back later or create more cards.</p>
          <button className="return-button" onClick={handleReturnHome}>
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }
  
  if (sessionComplete) {
    const accuracyPercentage = Math.round((sessionStats.correctCards / sessionStats.cardsReviewed) * 100);
    const averageTimePerCard = Math.round(sessionStats.totalTimeMs / sessionStats.cardsReviewed / 1000);
    
    return (
      <div className="study-session-container">
        {showConfetti && <Confetti />}
        <div className="session-complete">
          <h2>Session Complete!</h2>
          
          <div className="session-stats">
            <div className="stat-item">
              <div className="stat-value">{sessionStats.cardsReviewed}</div>
              <div className="stat-label">Cards Reviewed</div>
            </div>
            
            <div className="stat-item">
              <CircularProgressBar 
                percentage={accuracyPercentage} 
                size={80} 
                progressColor={
                  accuracyPercentage >= 80 ? 'var(--success-color)' : 
                  accuracyPercentage >= 60 ? 'var(--info-color)' : 
                  accuracyPercentage >= 40 ? 'var(--warning-color)' : 
                  'var(--danger-color)'
                }
              />
              <div className="stat-label">Accuracy</div>
            </div>
            
            <div className="stat-item">
              <div className="stat-value">{averageTimePerCard}s</div>
              <div className="stat-label">Avg. Time</div>
            </div>
          </div>
          
          <div className="session-complete-message">
            {accuracyPercentage >= 80 ? 
              "Excellent work! Your retention is very strong." : 
              accuracyPercentage >= 60 ? 
                "Good job! Keep practicing for better retention." : 
                "Keep practicing! Your retention will improve over time."}
          </div>
          
          <div className="session-actions">
            <button className="restart-button" onClick={handleRestartSession}>
              Study Again
            </button>
            <button className="return-button" onClick={handleReturnHome}>
              Return Home
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="study-session-container">
      <div className="session-header">
        <div className="progress-indicator">
          <div className="progress-text">
            {currentCardIndex + 1} / {sessionCards.length}
          </div>
          <div className="progress-bar">
            <div 
              className="progress-bar-fill" 
              style={{ width: `${((currentCardIndex + 1) / sessionCards.length) * 100}%` }}
            ></div>
          </div>
        </div>
        
        {isTimerRunning && (
          <div className="timer">
            {formatTime(elapsedTime)}
          </div>
        )}
      </div>
      
      <div className="card-container">
        <Flashcard 
          front={sessionCards[currentCardIndex]?.front || ''}
          back={sessionCards[currentCardIndex]?.back || ''}
          isFlipped={showAnswer}
          onFlip={showAnswer ? undefined : handleShowAnswer}
        />
        <div className="card-actions-bar" style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: 16 }}>
          <button
            className="btn btn-outline"
            onClick={() => navigate(`/edit-card/${sessionCards[currentCardIndex]?.id}`)}
            aria-label="Edit this card"
          >
            ✏️ Edit
          </button>
          <button
            className="btn btn-outline"
            onClick={() => handleReportCard(sessionCards[currentCardIndex])}
            aria-label="Report an issue with this card"
          >
            🚩 Report
          </button>
        </div>
      </div>
      
      {showConfidenceScale && (
        <div className="confidence-scale-container">
          <div className="confidence-prompt">
            <p>How well did you remember it?</p>
          </div>
          
          <div className="confidence-scale">
            <button 
              className={`rating-button again ${confidence === 1 ? 'selected' : ''}`}
              onClick={() => {
                handleConfidenceChange(1);
                handleRating(1);
              }}
            >
              <div className="rating-number">1</div>
              <div className="rating-text">Again</div>
              <div className="rating-description">Completely forgot</div>
            </button>
            
            <button 
              className={`rating-button hard ${confidence === 2 ? 'selected' : ''}`}
              onClick={() => {
                handleConfidenceChange(2);
                handleRating(2);
              }}
            >
              <div className="rating-number">2</div>
              <div className="rating-text">Hard</div>
              <div className="rating-description">Remembered with difficulty</div>
            </button>
            
            <button 
              className={`rating-button good ${confidence === 3 ? 'selected' : ''}`}
              onClick={() => {
                handleConfidenceChange(3);
                handleRating(3);
              }}
            >
              <div className="rating-number">3</div>
              <div className="rating-text">Good</div>
              <div className="rating-description">Recalled after a moment</div>
            </button>
            
            <button 
              className={`rating-button easy ${confidence === 4 ? 'selected' : ''}`}
              onClick={() => {
                handleConfidenceChange(4);
                handleRating(4);
              }}
            >
              <div className="rating-number">4</div>
              <div className="rating-text">Easy</div>
              <div className="rating-description">Recalled easily</div>
            </button>
            
            <button 
              className={`rating-button perfect ${confidence === 5 ? 'selected' : ''}`}
              onClick={() => {
                handleConfidenceChange(5);
                handleRating(5);
              }}
            >
              <div className="rating-number">5</div>
              <div className="rating-text">Perfect</div>
              <div className="rating-description">Perfect recall</div>
            </button>
          </div>
        </div>
      )}
      
      <div className="session-actions">
        <button className="exit-button" onClick={handleReturnHome}>
          Exit Session
        </button>
      </div>
      
      <FocusMode 
        isActive={focusModeActive}
        onToggle={setFocusModeActive}
        onComplete={handleFocusModeComplete}
      />
      
      {isReportModalOpen && cardForReporting && (
        <ReportCardModal 
          isOpen={isReportModalOpen}
          onRequestClose={() => setIsReportModalOpen(false)}
          onSubmitReport={handleReportSubmit}
          cardFront={cardForReporting.front}
        />
      )}
      
      {!showRetrievalPractice ? (
        <>
          <div className="session-header">
            <div className="session-progress">
              <div className="progress-text">
                {currentCardIndex + 1} / {sessionCards.length}
              </div>
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${((currentCardIndex + 1) / sessionCards.length) * 100}%` }}
                ></div>
              </div>
            </div>
            
            <div className="session-timer">
              {formatTime(elapsedTime)}
            </div>
          </div>
          
          {sessionCards.length > 0 && currentCardIndex < sessionCards.length && (
            <>
              {!showAnswer ? (
                <>
                  <Flashcard 
                    front={sessionCards[currentCardIndex]?.front || ''}
                    back={sessionCards[currentCardIndex]?.back || ''}
                    isFlipped={showAnswer}
                    onFlip={handleShowAnswer}
                  />
                  <div className="study-controls-placeholder"></div>
                  
                  {!showAnswer ? (
                    <div className="action-buttons">
                      <button 
                        className="show-answer-button" 
                        onClick={handleShowAnswer}
                      >
                        Show Answer
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="confidence-section">
                        <div className="confidence-label">
                          How well did you know this?
                        </div>
                        
                        <div className="rating-buttons">
                          <button 
                            className="rating-button again"
                            onClick={() => handleRating(1)}
                          >
                            Again <span className="rating-interval">(&lt; 1d)</span>
                          </button>
                          
                          <button 
                            className="rating-button hard"
                            onClick={() => handleRating(3)}
                          >
                            Hard
                          </button>
                          
                          <button 
                            className="rating-button good"
                            onClick={() => handleRating(4)}
                          >
                            Good
                          </button>
                          
                          <button 
                            className="rating-button easy"
                            onClick={() => handleRating(5)}
                          >
                            Easy
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </>
              ) : (
                <RetrievalPractice 
                  card={sessionCards[currentCardIndex]}
                  onComplete={handleRetrievalPracticeComplete}
                />
              )}
              
              <div className="session-actions">
                <button 
                  className="report-card-button"
                  onClick={() => handleReportCard(sessionCards[currentCardIndex])}
                >
                  Report Issue
                </button>
                
                <button 
                  className="toggle-favorite-button"
                  onClick={() => handleToggleFavorite(sessionCards[currentCardIndex])}
                >
                  {sessionCards[currentCardIndex].favorite ? '★ Favorited' : '☆ Favorite'}
                </button>
              </div>
            </>
          )}
        </>
      ) : (
        <div className="session-complete">
          {showConfetti && <Confetti />}
          
          <h2>Session Complete!</h2>
          
          <div className="session-stats">
            <div className="stat-item">
              <div className="stat-value">{sessionStats.cardsReviewed}</div>
              <div className="stat-label">Cards Reviewed</div>
            </div>
            
            <div className="stat-item">
              <div className="stat-value">
                {sessionStats.correctCards > 0 
                  ? Math.round((sessionStats.correctCards / sessionStats.cardsReviewed) * 100)
                  : 0}%
              </div>
              <div className="stat-label">Accuracy</div>
            </div>
            
            <div className="stat-item">
              <div className="stat-value">{formatTime(sessionStats.totalTimeMs, true)}</div>
              <div className="stat-label">Total Time</div>
            </div>
            
            {retrievalPracticeStats.attempts > 0 && (
              <div className="stat-item">
                <div className="stat-value">
                  {retrievalPracticeStats.attempts} ({retrievalPracticeStats.successful} successful)
                </div>
                <div className="stat-label">Retrieval Practices</div>
              </div>
            )}
          </div>
          
          <div className="complete-message">
            {(sessionStats.correctCards / sessionStats.cardsReviewed) >= 0.8
              ? "Excellent work! Your recall is strong."
              : (sessionStats.correctCards / sessionStats.cardsReviewed) >= 0.6
              ? "Good job! Keep practicing to improve further."
              : "Keep going! Consistent practice will improve your results."}
          </div>
          
          <div className="complete-actions">
            <button 
              className="restart-button" 
              onClick={handleRestartSession}
            >
              Study Again
            </button>
            
            <button 
              className="return-button" 
              onClick={handleReturnHome}
            >
              Return to Dashboard
            </button>
          </div>
        </div>
      )}
      
      {showHint && !showAnswer && (
        <div className="hint-reveal" style={{ margin: '16px 0', color: '#FF7750', fontWeight: 600 }}>
          Hint: {sessionCards[currentCardIndex]?.back?.split(' ').slice(0, 3).join(' ')}...
        </div>
      )}
    </div>
  );
};

export default StudySession;