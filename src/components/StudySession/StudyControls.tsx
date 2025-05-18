import React from 'react';
import styles from './StudyControls.module.css';

interface StudyControlsProps {
  showRatingButtons: boolean;
  onShowAnswer: () => void;
  onRate: (quality: 1 | 2 | 3 | 4 | 5) => void;
  onHint?: () => void;
  isProcessing?: boolean;
}

// Feedback Colors from your design plan
const feedbackColors = {
  mainAction: 'var(--primary-brand, #3A7BDE)', // For Show Answer
  again: 'var(--feedback-again, #F44336)',
  hard: 'var(--feedback-hard, #FFC107)',
  good: 'var(--feedback-good, #2196F3)',
  easy: 'var(--feedback-easy, #4CAF50)',
};

const StudyControls: React.FC<StudyControlsProps> = ({
  showRatingButtons,
  onShowAnswer,
  onRate,
  onHint,
  isProcessing = false,
}) => {
  if (!showRatingButtons) {
    return (
      <div className={styles.controlsContainer}>
        <button
          className={`${styles.button} ${styles.showAnswerButton}`}
          style={{ backgroundColor: feedbackColors.mainAction }}
          onClick={onShowAnswer}
          disabled={isProcessing}
        >
          Show Answer
        </button>
        {onHint && (
          <button
            className={`${styles.button} ${styles.hintButton}`}
            style={{ backgroundColor: 'var(--accent, #FF7750)', color: 'white', marginLeft: 12 }}
            onClick={onHint}
            disabled={isProcessing}
          >
            Hint
          </button>
        )}
      </div>
    );
  }

  // Rating mapping: Again (2), Hard (3), Good (4), Easy (5)
  // This aligns with SM-2 where rating < 3 is often a lapse.
  return (
    <div className={styles.controlsContainer}>
      <div className={styles.confidenceScale}>
        <button
          className={`${styles.button} ${styles.ratingButton} ${styles.again}`}
          style={{ backgroundColor: feedbackColors.again, color: 'var(--button-text-light, white)' }}
          onClick={() => onRate(2)}
          disabled={isProcessing}
          aria-label="Again - Completely forgot 😵"
        >
          <span role="img" aria-label="Again">😵</span>
          <div>Again</div>
          <small>Forgot</small>
        </button>
        <button
          className={`${styles.button} ${styles.ratingButton} ${styles.hard}`}
          style={{ backgroundColor: feedbackColors.hard, color: 'var(--button-text-dark, black)' }}
          onClick={() => onRate(3)}
          disabled={isProcessing}
          aria-label="Hard - Remembered with difficulty 😬"
        >
          <span role="img" aria-label="Hard">😬</span>
          <div>Hard</div>
          <small>Struggled</small>
        </button>
        <button
          className={`${styles.button} ${styles.ratingButton} ${styles.good}`}
          style={{ backgroundColor: feedbackColors.good, color: 'var(--button-text-light, white)' }}
          onClick={() => onRate(4)}
          disabled={isProcessing}
          aria-label="Good - Recalled after a moment 🙂"
        >
          <span role="img" aria-label="Good">🙂</span>
          <div>Good</div>
          <small>Recalled</small>
        </button>
        <button
          className={`${styles.button} ${styles.ratingButton} ${styles.easy}`}
          style={{ backgroundColor: feedbackColors.easy, color: 'var(--button-text-light, white)' }}
          onClick={() => onRate(5)}
          disabled={isProcessing}
          aria-label="Easy - Instantly knew 😎"
        >
          <span role="img" aria-label="Easy">😎</span>
          <div>Easy</div>
          <small>Instant</small>
        </button>
      </div>
    </div>
  );
};

export default StudyControls; 