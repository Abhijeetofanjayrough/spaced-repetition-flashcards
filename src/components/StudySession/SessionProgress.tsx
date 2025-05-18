import React from 'react';
import styles from './SessionProgress.module.css';

interface SessionProgressProps {
  currentIndex: number; // 0-indexed current card
  totalCards: number;
  onEditCard?: () => void; 
  onReportIssue?: () => void; 
}

const SessionProgress: React.FC<SessionProgressProps> = ({
  currentIndex,
  totalCards,
  onEditCard,
  onReportIssue,
}) => {
  if (totalCards === 0) {
    // Don't render if there are no cards, or session is not yet loaded
    return null; 
  }

  return (
    <div className={styles.progressContainer}>
      <span className={styles.progressText}>
        Card: {currentIndex + 1} / {totalCards}
      </span>
      <div className={styles.actionButtonsContainer}>
        {onEditCard && (
          <button 
            className={`${styles.button} ${styles.actionButton}`}
            onClick={onEditCard}
            title="Edit this card"
          >
            Edit Card
          </button>
        )}
        {onReportIssue && (
          <button
            className={`${styles.button} ${styles.actionButton} ${styles.reportButton}`}
            onClick={onReportIssue}
            title="Report an issue with this card"
          >
            Report Issue
          </button>
        )}
      </div>
    </div>
  );
};

export default SessionProgress; 