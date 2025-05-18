import React from 'react';
import '../styles/FlashcardComponent.css';

interface FlashcardProps {
  frontContent: React.ReactNode;
  backContent: React.ReactNode;
  isFlipped: boolean;
  onFlip: () => void;
  height?: string; // e.g., '200px' or 'auto'
  width?: string; // e.g., '300px' or '100%'
}

const FlashcardComponent: React.FC<FlashcardProps> = ({
  frontContent,
  backContent,
  isFlipped,
  onFlip,
  height = '250px', 
  width = '400px' 
}) => {
  return (
    <div 
      className="flashcard-container"
      onClick={onFlip}
      style={{ height, width }}
      role="button"
      tabIndex={0}
      onKeyPress={(e) => e.key === ' ' || e.key === 'Enter' ? onFlip() : null}
      aria-pressed={isFlipped}
      aria-label={isFlipped ? "Showing back of card" : "Showing front of card"}
    >
      <div className={`flashcard-inner ${isFlipped ? 'is-flipped' : ''}`}>
        <div className="flashcard-face flashcard-front">
          {frontContent}
        </div>
        <div className="flashcard-face flashcard-back">
          {backContent}
        </div>
      </div>
    </div>
  );
};

export default FlashcardComponent; 