import React from 'react';
import { Flashcard as FlashcardType } from '../models/types';
import '../styles/FlashCard.css';

interface FlashCardProps {
  card: FlashcardType;
  showAnswer: boolean;
  onFlip: () => void;
}

const FlashCard: React.FC<FlashCardProps> = ({ card, showAnswer, onFlip }) => {
  return (
    <div 
      className={`flashcard ${showAnswer ? 'flipped' : ''}`} 
      onClick={onFlip}
    >
      <div className="flashcard-inner">
        <div className="flashcard-front">
          <div className="content">
            {card.front}
          </div>
          <div className="hint-text">Click to flip</div>
        </div>
        
        <div className="flashcard-back">
          <div className="content">
            {card.back}
          </div>
          <div className="hint-text">Click to flip back</div>
        </div>
      </div>
    </div>
  );
};

export default FlashCard;
