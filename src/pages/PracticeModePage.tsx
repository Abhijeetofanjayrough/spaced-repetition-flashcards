import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import RetrievalPractice from '../components/RetrievalPractice';
import { Card } from '../models/Card';
import './PracticeModePage.css';

const PracticeModePage: React.FC = () => {
  const { deckId } = useParams<{ deckId: string }>();
  const navigate = useNavigate();
  const { cards, decks, getCardsByDeckId, getDeckById } = useData();
  
  const [selectedCards, setSelectedCards] = useState<Card[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [deck, setDeck] = useState<any | null>(null);
  const [practiceComplete, setPracticeComplete] = useState(false);
  const [practiceStats, setPracticeStats] = useState({
    totalCards: 0,
    completedCards: 0,
    successfulPractices: 0,
    practiceTypes: {
      explain: 0,
      apply: 0,
      connect: 0
    }
  });

  useEffect(() => {
    // Load cards for the selected deck or random cards
    setIsLoading(true);
    
    if (deckId) {
      const deckCards = getCardsByDeckId(deckId);
      // For practice mode, prefer cards that are in review stage
      const reviewCards = deckCards.filter(card => 
        card.scheduling?.learningStage === 'review' && 
        card.reviewHistory.length > 0
      );
      
      if (reviewCards.length < 5) {
        // Not enough review cards, use all cards instead
        setSelectedCards(deckCards.slice(0, 10));
      } else {
        setSelectedCards(reviewCards.slice(0, 10));
      }
      
      const foundDeck = getDeckById(deckId);
      if (foundDeck) {
        setDeck(foundDeck);
      }
    } else {
      // If no deck selected, get a mix of cards from all decks
      const reviewCards = cards.filter(card => 
        card.scheduling?.learningStage === 'review' && 
        card.reviewHistory.length > 0
      );
      
      if (reviewCards.length < 5) {
        // Not enough review cards, use random cards instead
        const randomCards = [...cards].sort(() => Math.random() - 0.5).slice(0, 10);
        setSelectedCards(randomCards);
      } else {
        // Random selection of review cards
        const randomReviewCards = [...reviewCards].sort(() => Math.random() - 0.5).slice(0, 10);
        setSelectedCards(randomReviewCards);
      }
    }
    
    setIsLoading(false);
  }, [deckId, cards, decks, getCardsByDeckId, getDeckById]);

  const handlePracticeComplete = (success: boolean, type: string) => {
    // Update practice statistics
    setPracticeStats(prev => ({
      ...prev,
      completedCards: prev.completedCards + 1,
      successfulPractices: prev.successfulPractices + (success ? 1 : 0),
      practiceTypes: {
        ...prev.practiceTypes,
        [type]: prev.practiceTypes[type as keyof typeof prev.practiceTypes] + 1
      }
    }));
    
    // Move to next card or complete session
    const nextIndex = currentCardIndex + 1;
    if (nextIndex < selectedCards.length) {
      setCurrentCardIndex(nextIndex);
    } else {
      // Practice session complete
      setPracticeComplete(true);
    }
  };

  const handleExit = () => {
    navigate(deckId ? `/deck/${deckId}` : '/');
  };
  
  const handleStartOver = () => {
    setCurrentCardIndex(0);
    setPracticeComplete(false);
    setPracticeStats({
      totalCards: selectedCards.length,
      completedCards: 0,
      successfulPractices: 0,
      practiceTypes: {
        explain: 0,
        apply: 0,
        connect: 0
      }
    });
  };

  if (isLoading) {
    return (
      <div className="practice-loading">
        <div className="spinner"></div>
        <p>Preparing practice session...</p>
      </div>
    );
  }

  if (selectedCards.length === 0) {
    return (
      <div className="practice-empty">
        <h2>Not enough cards available</h2>
        <p>You need to create and study some cards before using Practice Mode.</p>
        <button onClick={handleExit} className="return-button">
          Return to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="practice-page">
      <div className="practice-header">
        <h1>Active Recall Practice</h1>
        <p className="practice-description">
          Strengthen your memory by practicing different ways to recall information
        </p>
      </div>
      
      {!practiceComplete ? (
        <div className="practice-session">
          <div className="practice-progress">
            <div className="progress-text">Card {currentCardIndex + 1} of {selectedCards.length}</div>
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${((currentCardIndex + 1) / selectedCards.length) * 100}%` }}
              ></div>
            </div>
          </div>
          
          <RetrievalPractice 
            card={selectedCards[currentCardIndex]}
            onComplete={handlePracticeComplete}
          />
          
          <div className="practice-actions">
            <button className="exit-button" onClick={handleExit}>
              Exit Practice
            </button>
          </div>
        </div>
      ) : (
        <div className="practice-complete">
          <h2>Practice Complete!</h2>
          
          <div className="practice-results">
            <div className="result-item">
              <div className="result-value">{practiceStats.completedCards}</div>
              <div className="result-label">Cards Practiced</div>
            </div>
            
            <div className="result-item">
              <div className="result-value">{Math.round((practiceStats.successfulPractices / practiceStats.completedCards) * 100)}%</div>
              <div className="result-label">Success Rate</div>
            </div>
            
            <div className="result-item">
              <div className="result-value">{practiceStats.practiceTypes.explain}</div>
              <div className="result-label">Explanations</div>
            </div>
            
            <div className="result-item">
              <div className="result-value">{practiceStats.practiceTypes.apply}</div>
              <div className="result-label">Applications</div>
            </div>
            
            <div className="result-item">
              <div className="result-value">{practiceStats.practiceTypes.connect}</div>
              <div className="result-label">Connections</div>
            </div>
          </div>
          
          <div className="practice-message">
            {practiceStats.successfulPractices > (practiceStats.completedCards * 0.7)
              ? "Excellent work! Your active recall is strong."
              : practiceStats.successfulPractices > (practiceStats.completedCards * 0.5)
              ? "Good job! Keep practicing these techniques to improve."
              : "Keep practicing! Active recall takes time to master."}
          </div>
          
          <div className="practice-complete-actions">
            <button className="restart-button" onClick={handleStartOver}>
              Practice Again
            </button>
            <button className="return-button" onClick={handleExit}>
              Return to Dashboard
            </button>
          </div>
          
          <div className="practice-tips">
            <h3>Why Practice Active Recall?</h3>
            <p>
              Active recall is one of the most effective learning techniques. By forcing yourself to 
              retrieve information in different ways, you strengthen neural pathways and improve 
              long-term retention. The more you practice, the stronger your memory becomes!
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default PracticeModePage; 