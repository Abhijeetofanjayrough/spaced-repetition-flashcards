import React from 'react';
import styles from './CardView.module.css'; // We will create this CSS module next
import './CardView.css';

interface CardViewProps {
  card: {
    id: string;
    front: string;
    back: string;
    mediaAttachments?: string[];
    cardType?: 'basic' | 'cloze'; // For potential future rendering differences
    scheduling: {
      dueDate: string;
      learningStage: string;
    };
    reviewHistory: { rating: number }[];
  } | null;
  showFront: boolean; // Controls which side is visible
  onFlip?: () => void; // Callback when card is clicked to flip
  isLoading?: boolean;
}

const CardView: React.FC<CardViewProps> = ({
  card,
  showFront,
  onFlip,
  isLoading,
}) => {
  if (isLoading || !card) {
    return (
      // cardScene is still used for consistent sizing and centering if needed
      <div className={`${styles.cardScene} ${styles.loadingContainer}`}>
        <div className={styles.cardFacePlaceholder}>
          <p>Loading Card...</p> 
          {/* You can add a spinner component here */}
        </div>
      </div>
    );
  }

  // Calculate overdue days
  const dueDate = new Date(card.scheduling.dueDate);
  const now = new Date();
  const daysOverdue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 3600 * 24));
  const isOverdue = daysOverdue > 0;
  const isVeryOverdue = daysOverdue > 14;
  // Graduation logic: about to graduate if in learning and 2+ successful recalls
  const successfulRecalls = card.reviewHistory.filter(r => r.rating >= 3).length;
  const aboutToGraduate = card.scheduling.learningStage === 'learning' && successfulRecalls >= 2;

  // Helper to render card content (text and media)
  const renderCardContent = (isFrontSide: boolean) => {
    const contentText = isFrontSide ? card.front : card.back;
    // TODO: Implement Markdown/Rich Text rendering if card content supports it.
    // TODO: Implement specific rendering logic for card.cardType === 'cloze'.
    return (
      <div className={styles.contentArea}>
        <div className={styles.cardText}>{contentText}</div>
        {isFrontSide && card.mediaAttachments && card.mediaAttachments.length > 0 && (
          <div className={styles.mediaContainer}>
            {card.mediaAttachments.map(url => (
              <img
                key={url}
                src={url}
                alt="media attachment"
                className={styles.mediaAttachment}
              />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="card-view">
      <div className="card-badges">
        <span className={`badge stage-badge ${card.scheduling.learningStage}`}>{card.scheduling.learningStage.charAt(0).toUpperCase() + card.scheduling.learningStage.slice(1)}</span>
        {isOverdue && (
          <span className={`badge overdue-badge${isVeryOverdue ? ' very-overdue' : ''}`}>{isVeryOverdue ? 'Very Overdue' : 'Overdue'}</span>
        )}
        {aboutToGraduate && <span className="badge graduation-badge">🎓 Graduation Soon</span>}
      </div>
      {/* cardScene is the container that sets up the 3D perspective for the flip. */}
      <div 
        className={styles.cardScene} 
        onClick={onFlip} 
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onFlip?.(); }}
        role="button" 
        tabIndex={0} 
        aria-pressed={!showFront} // True when back is shown (card is "pressed" or flipped)
        aria-label={showFront ? `Card front: ${card.front.substring(0, 50)}... Press to flip.` : `Card back: ${card.back.substring(0,50)}... Press to flip.`}
      >
        {/* cardAnimator is the element that actually performs the 3D rotation. */}
        <div className={`${styles.cardAnimator} ${!showFront ? styles.isFlipped : ''}`}>
          {/* Front face of the card */}
          <div className={`${styles.cardFace} ${styles.cardFaceFront}`}>
            {renderCardContent(true)}
          </div>
          {/* Back face of the card. It's rotated 180deg initially by its own transform. */}
          <div className={`${styles.cardFace} ${styles.cardFaceBack}`}>
            {renderCardContent(false)}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CardView; 