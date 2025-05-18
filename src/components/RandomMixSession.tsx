import React, { useEffect, useState } from 'react';
import { db } from '../db';
import { Card } from '../models/Card';
import { StudySession } from './StudySession';

const RandomMixSession: React.FC = () => {
  const [cards, setCards] = useState<Card[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Replace useNavigate with direct navigation
  const navigateTo = (path: string) => {
    window.location.href = path;
  };

  useEffect(() => {
    const fetchCards = async () => {
      setIsLoading(true);
      const allCards = await db.getAllCards();
      const now = new Date();
      const dueReviewCards = allCards.filter(card =>
        card.scheduling.learningStage !== 'learning' &&
        new Date(card.scheduling.dueDate) <= now &&
        !card.archived
      );
      const newCards = allCards.filter(card =>
        card.scheduling.learningStage === 'learning' &&
        !card.archived
      );
      // 70% review, 30% new
      const maxSession = 20;
      const reviewCount = Math.floor(maxSession * 0.7);
      const newCount = maxSession - reviewCount;
      const selectedReview = dueReviewCards.sort(() => Math.random() - 0.5).slice(0, reviewCount);
      const selectedNew = newCards.sort(() => Math.random() - 0.5).slice(0, newCount);
      const sessionCards = [...selectedReview, ...selectedNew].sort(() => Math.random() - 0.5);
      setCards(sessionCards);
      setIsLoading(false);
    };
    fetchCards();
  }, []);

  if (isLoading) {
    return <div className="review-session"><div className="loading">Loading cards...</div></div>;
  }

  if (cards.length === 0) {
    return (
      <div className="review-session">
        <div className="session-complete">
          <h2>No cards due for review!</h2>
          <button className="btn-primary" onClick={() => navigateTo('/')}>Back to Dashboard</button>
        </div>
      </div>
    );
  }

  return <StudySession cards={cards} onSessionComplete={() => navigateTo('/')} />;
};

export default RandomMixSession; 