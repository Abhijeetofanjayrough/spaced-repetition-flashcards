import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ChallengeMode from '../components/ChallengeMode';
import { ChallengeResults } from '../components/ChallengeMode';
import { useData } from '../contexts/DataContext';
import { Card } from '../models/Card';
import { Deck } from '../models/Deck';
import './ChallengeModePage.css';

const ChallengeModePage: React.FC = () => {
  const { deckId } = useParams<{ deckId: string }>();
  const navigate = useNavigate();
  const { cards, decks, getCardsByDeckId, getDeckById } = useData();
  const [selectedCards, setSelectedCards] = useState<Card[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deck, setDeck] = useState<Deck | null>(null);
  const [challengeHistory, setChallengeHistory] = useState<ChallengeResults[]>([]);

  useEffect(() => {
    // Load challenge history from localStorage
    const history = localStorage.getItem('challengeHistory');
    if (history) {
      setChallengeHistory(JSON.parse(history));
    }

    // Load cards for the selected deck
    if (deckId) {
      const deckCards = getCardsByDeckId(deckId);
      // For challenge mode, only use cards that have been studied at least once
      const studiedCards = deckCards.filter((card: Card) => card.reviewHistory && card.reviewHistory.length > 0);
      
      if (studiedCards.length < 5) {
        // Not enough cards studied, use all cards instead
        setSelectedCards(deckCards.slice(0, 20));
      } else {
        setSelectedCards(studiedCards.slice(0, 20));
      }
      
      const foundDeck = getDeckById(deckId);
      if (foundDeck) {
        setDeck(foundDeck);
      }
    } else {
      // If no deck selected, get a mix of cards from all decks
      const studiedCards = cards.filter((card: Card) => card.reviewHistory && card.reviewHistory.length > 0);
      
      if (studiedCards.length < 5) {
        // Not enough cards studied, use random cards instead
        const randomCards = [...cards].sort(() => Math.random() - 0.5).slice(0, 20);
        setSelectedCards(randomCards);
      } else {
        // Random selection of studied cards
        const randomStudiedCards = [...studiedCards].sort(() => Math.random() - 0.5).slice(0, 20);
        setSelectedCards(randomStudiedCards);
      }
    }
    
    setIsLoading(false);
  }, [deckId, cards, decks, getCardsByDeckId, getDeckById]);

  const handleChallengeComplete = (results: ChallengeResults) => {
    // Save challenge results to history
    const updatedHistory = [...challengeHistory, results];
    setChallengeHistory(updatedHistory);
    localStorage.setItem('challengeHistory', JSON.stringify(updatedHistory));
    
    // Could also update user stats or show additional UI here
  };

  const handleExit = () => {
    navigate(deckId ? `/deck/${deckId}` : '/');
  };

  if (isLoading) {
    return (
      <div className="challenge-loading">
        <div className="spinner"></div>
        <p>Preparing challenge...</p>
      </div>
    );
  }

  if (selectedCards.length === 0) {
    return (
      <div className="challenge-empty">
        <h2>Not enough cards available</h2>
        <p>You need to create and study some cards before using Challenge Mode.</p>
        <button onClick={handleExit} className="return-button">
          Return to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="challenge-page">
      <ChallengeMode 
        cards={selectedCards}
        onComplete={handleChallengeComplete}
        onExit={handleExit}
      />
    </div>
  );
};

export default ChallengeModePage; 