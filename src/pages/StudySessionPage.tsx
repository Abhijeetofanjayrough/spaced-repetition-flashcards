import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { Card as AppCard } from '../models/Card';

// Import the child components
import CardView from '../components/StudySession/CardView';
import StudyControls from '../components/StudySession/StudyControls';
import SessionProgress from '../components/StudySession/SessionProgress';

import styles from './StudySessionPage.module.css'; // CSS Module for page-specific layout

const StudySessionPage: React.FC = () => {
  const { deckId: deckIdFromParams } = useParams<{ deckId?: string }>();
  const navigate = useNavigate();
  const { getStudySessionQueue, reviewCard, isLoading: dataLoading } = useData();

  const [sessionQueue, setSessionQueue] = useState<AppCard[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState<number>(0);
  const [showFront, setShowFront] = useState<boolean>(true);
  const [cardRevealTime, setCardRevealTime] = useState<number | null>(null);
  const [hintUsed, setHintUsed] = useState<boolean>(false); // Placeholder for now
  const [isLoadingSession, setIsLoadingSession] = useState<boolean>(true);
  const [sessionFinished, setSessionFinished] = useState<boolean>(false);
  const [isProcessingReview, setIsProcessingReview] = useState<boolean>(false);

  const deckIdForQueue = deckIdFromParams === 'random' || deckIdFromParams === undefined ? null : deckIdFromParams;
  const SESSION_SIZE = 30; // This could be a user setting later

  const currentCard = useMemo<AppCard | null>(() => {
    return sessionQueue.length > 0 && currentCardIndex < sessionQueue.length
      ? sessionQueue[currentCardIndex]
      : null;
  }, [sessionQueue, currentCardIndex]);

  useEffect(() => {
    if (!dataLoading) {
      setIsLoadingSession(true);
      const queue = getStudySessionQueue(deckIdForQueue, SESSION_SIZE);
      setSessionQueue(queue);
      setCurrentCardIndex(0);
      setShowFront(true);
      setCardRevealTime(null);
      setHintUsed(false);
      setIsLoadingSession(false);
      setSessionFinished(false);
      if (queue.length === 0) {
        setSessionFinished(true);
      }
    }
  }, [deckIdForQueue, getStudySessionQueue, dataLoading, SESSION_SIZE]);

  const handleShowAnswer = useCallback(() => {
    if (showFront) {
      setShowFront(false);
      setCardRevealTime(Date.now());
    }
  }, [showFront]);

  const handleRateCard = async (quality: 1 | 2 | 3 | 4 | 5) => {
    if (!currentCard || isProcessingReview) return;

    setIsProcessingReview(true);
    const msToAnswer = cardRevealTime ? Date.now() - cardRevealTime : 0;
    
    try {
      await reviewCard(currentCard.id, quality, hintUsed, msToAnswer);
    } catch (error) {
      console.error("Failed to review card:", error);
      // TODO: Show an error message to the user via a toast or notification
    }

    if (currentCardIndex < sessionQueue.length - 1) {
      setCurrentCardIndex(prevIndex => prevIndex + 1);
      setShowFront(true);
      setCardRevealTime(null);
      setHintUsed(false);
    } else {
      setSessionFinished(true);
    }
    setIsProcessingReview(false);
  };
  
  const handleEditCurrentCard = () => {
    if (currentCard) {
      navigate(`/edit-card/${currentCard.id}`, { state: { fromStudySession: true, deckId: deckIdForQueue }});
    }
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (sessionFinished || isLoadingSession || !currentCard) return;

      if (event.key === ' ' || event.key === 'Enter') {
        if (showFront) {
          handleShowAnswer();
          event.preventDefault();
        }
      }
      if (!showFront && !isProcessingReview) {
        if (event.key === '1') handleRateCard(2);
        else if (event.key === '2') handleRateCard(3);
        else if (event.key === '3') handleRateCard(4);
        else if (event.key === '4') handleRateCard(5);
        if (['1', '2', '3', '4'].includes(event.key)) event.preventDefault();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [showFront, handleShowAnswer, handleRateCard, sessionFinished, isLoadingSession, currentCard, isProcessingReview]);

  if (isLoadingSession || dataLoading) {
    return (
      <div className={styles.pageContainer}>
        <p className={styles.loadingText}>Loading study session...</p>
      </div>
    );
  }

  if (sessionFinished) {
    return (
      <div className={`${styles.pageContainer} ${styles.sessionFinishedContainer}`}>
        <h2>Study Session Complete!</h2>
        <p>You've reviewed all available cards for this session.</p>
        <button onClick={() => navigate('/')} className={styles.finishButton}>Back to Dashboard</button>
      </div>
    );
  }
  
  if (!currentCard && !isLoadingSession) {
    return (
        <div className={`${styles.pageContainer} ${styles.sessionFinishedContainer}`}>
            <p>No cards available for this study session, or session is still loading.</p>
            <button onClick={() => navigate('/')} className={styles.finishButton}>Back to Dashboard</button>
        </div>
    );
  }

  return (
    <div className={styles.pageContainer}>
      {currentCard && (
        <>
          <SessionProgress 
              currentIndex={currentCardIndex} 
              totalCards={sessionQueue.length}
              onEditCard={handleEditCurrentCard} 
          />
          <CardView 
            card={currentCard} 
            showFront={showFront} 
            onFlip={handleShowAnswer} 
            isLoading={isProcessingReview || isLoadingSession}
          />
          <StudyControls 
            showRatingButtons={!showFront} 
            onShowAnswer={handleShowAnswer} 
            onRate={handleRateCard} 
            isProcessing={isProcessingReview}
          />
        </>
      )}
      {!currentCard && !isLoadingSession && !sessionFinished && (
        <div className={`${styles.pageContainer} ${styles.sessionFinishedContainer}`}>
          <p>Error loading card. Please try refreshing.</p>
          <button onClick={() => navigate('/')} className={styles.finishButton}>Back to Dashboard</button>
        </div>
      )}
    </div>
  );
};

export default StudySessionPage; 