// Card model for spaced repetition
export type ReviewHistory = {
  date: string; // ISO string
  rating: number; // 0-5
  msToAnswer: number;
  intervalBeforeReview?: number; // The interval of the card *before* this review was conducted (I(n))
  interval: number; // The interval of the card *after* this review (I(n+1))
  daysOverdue?: number; // How many days past due the review was conducted, can be negative if early
  easeFactor?: number; // Ease factor after this review
  learningStageBeforeReview?: 'learning' | 'review' | 'relearning'; // Learning stage before this review
  learningStage?: 'learning' | 'review' | 'relearning'; // Learning stage after this review
  timeTaken?: number; // Alias for msToAnswer or more specific study time for this instance
};

export type Card = {
  id: string;
  front: string;
  back: string;
  cardType?: 'basic' | 'cloze'; // Added: Type of card, defaults to basic
  mediaAttachments?: string[];
  tags?: string[];
  deckId: string;
  created: string;
  modified: string;
  reviewHistory: ReviewHistory[];
  favorite?: boolean;
  archived?: boolean;
  relatedIds?: string[]; // Related card IDs for knowledge graph
  relatedCardIds?: string[]; // Alternative property name for related cards
  scheduling: {
    interval: number; // in days. Represents the interval for the current step in learning/relearning, or the review interval.
    easeFactor: number;
    dueDate: string; // ISO string
    learningStage: 'learning' | 'review' | 'relearning';
    currentStep?: number; // Index for LEARNING_STEPS or RELEARNING_STEPS. Undefined if in 'review' stage (unless just lapsed).
  };
  // Fields for reporting issues
  hasReportedIssue?: boolean;
  issueNotes?: string;
  reports?: CardReport[]; // ADD THIS FIELD
  bestRecallTimeMs?: number; // For Challenge Mode: best time for a successful recall
  
  // For Prerequisite Tracking
  prerequisiteForIds?: string[];   // IDs of cards for which THIS card is a prerequisite
  prerequisiteCardIds?: string[]; // IDs of cards that are prerequisites FOR this card
};

export interface CardReport {
  date: string;
  text: string;
}

// Optionally, add more fields for future features (e.g., archived, favorite, etc.)
// export type Card = { ... } // already defined
