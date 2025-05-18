import { Flashcard, ReviewRating } from '../models/types';
import { Card, ReviewHistory } from '../models/Card';

type CardScheduling = {
  interval: number;
  easeFactor: number;
  dueDate: string;
  learningStage: 'learning' | 'review' | 'relearning';
  currentStep?: number;
};

const MIN_EASE_FACTOR = 1.3;
const DEFAULT_EASE_FACTOR = 2.5;
const MINIMUM_EASE_FACTOR = 1.3;
const FIRST_INTERVAL = 1; // days
const SECOND_INTERVAL = 6; // days

export interface SM2UpdateResult {
  newEaseFactor: number;
  nextInterval: number;
  isLearning: boolean; // True if the card is still in the initial learning phase
}

export function calculateNextInterval(
  card: Flashcard, 
  rating: ReviewRating
): { interval: number; easeFactor: number; dueDate: string; learningStage: 'learning' | 'review' | 'relearning' } {
  const { interval, easeFactor, learningStage } = card.scheduling;
  
  // Calculate new ease factor
  let newEaseFactor = easeFactor + (0.1 - (5 - rating) * 0.08 + (5 - rating) * 0.02);
  newEaseFactor = Math.max(MIN_EASE_FACTOR, newEaseFactor);

  let newInterval: number;
  let newLearningStage = learningStage;

  if (rating < 3) {
    // If user couldn't recall or found it difficult, reset interval
    newInterval = FIRST_INTERVAL;
    newLearningStage = 'relearning';
  } else {
    if (learningStage === 'learning' && rating >= 4 && card.reviewHistory.length >= 3) {
      // Graduate to review if performance is good and card has been reviewed enough times
      newLearningStage = 'review';
    } else if (learningStage === 'relearning' && rating >= 4) {
      // Return to review mode if performance improves
      newLearningStage = 'review';
    }

    if (newLearningStage === 'review') {
      // Normal review card: apply standard SM-2 formula
      newInterval = Math.round(interval * newEaseFactor);
    } else {
      // Learning or relearning card: use smaller increments
      newInterval = rating === 5 ? 3 : rating === 4 ? 2 : 1;
    }
  }

  // Calculate new due date
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + newInterval);
  
  return {
    interval: newInterval,
    easeFactor: newEaseFactor,
    dueDate: dueDate.toISOString(),
    learningStage: newLearningStage
  };
}

// Function to handle overdue cards
export function handleOverdueCard(card: Flashcard): number {
  const now = new Date();
  const dueDate = new Date(card.scheduling.dueDate);
  
  // Calculate days overdue
  const daysOverdue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 3600 * 24));
  
  if (daysOverdue > 14) {
    // Apply partial interval reset for very overdue cards
    return Math.max(1, Math.floor(card.scheduling.interval * 0.5));
  }
  
  return card.scheduling.interval;
}

// Function to create scheduling for a new card
export function createInitialCardScheduling(): { 
  interval: number; 
  easeFactor: number; 
  dueDate: string; 
  learningStage: 'learning' 
} {
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + FIRST_INTERVAL);
  
  return {
    interval: FIRST_INTERVAL,
    easeFactor: DEFAULT_EASE_FACTOR,
    dueDate: dueDate.toISOString(),
    learningStage: 'learning'
  };
}

/**
 * Updates a card's scheduling information based on the SM-2 algorithm.
 * @param card The card to update.
 * @param quality The quality of recall (1-5, where 5 is perfect recall).
 * @returns Updated scheduling parameters.
 */
export const updateCardSM2 = (
  currentEaseFactor: number,
  currentInterval: number,
  timesReviewed: number, // How many times this card has been successfully reviewed
  quality: ReviewHistory['rating']
): SM2UpdateResult => {
  if (quality < 3) {
    // If recall quality is low, reset interval and don't change EF much
    // (or reset EF slightly if it's a lapse during learning)
    return {
      newEaseFactor: Math.max(MINIMUM_EASE_FACTOR, currentEaseFactor - 0.20), // Penalize EF slightly
      nextInterval: FIRST_INTERVAL, // Reset to first interval
      isLearning: true, // Card goes back to learning
    };
  }

  // Calculate new Ease Factor
  // Plan: EF' = EF + (0.1 - (5 - q) * 0.08 + (5 - q) * 0.02)
  let newEaseFactor = currentEaseFactor + (0.1 - (5 - quality) * 0.08 + (5 - quality) * 0.02);
  if (newEaseFactor < MINIMUM_EASE_FACTOR) {
    newEaseFactor = MINIMUM_EASE_FACTOR;
  }

  let nextInterval: number;
  let isLearning = false;

  if (timesReviewed === 0) { // First successful review
    nextInterval = FIRST_INTERVAL;
    isLearning = true;
  } else if (timesReviewed === 1) { // Second successful review
    nextInterval = SECOND_INTERVAL;
    isLearning = true;
  } else { // Subsequent reviews
    nextInterval = Math.round(currentInterval * newEaseFactor);
    isLearning = false; // Graduated from initial learning steps
  }
  
  // Ensure interval doesn't get excessively large too quickly, cap at e.g. 10 years
  const MAX_INTERVAL = 3650; // Max interval of 10 years
  if (nextInterval > MAX_INTERVAL) {
    nextInterval = MAX_INTERVAL;
  }

  return { newEaseFactor, nextInterval, isLearning };
};

/**
 * Calculates the due date for the next review.
 * @param intervalInDays The interval in days.
 * @returns The next due date as an ISO string.
 */
export const calculateNextDueDate = (intervalInDays: number): string => {
  const today = new Date();
  const nextDueDate = new Date(today.setDate(today.getDate() + intervalInDays));
  return nextDueDate.toISOString();
};

/**
 * Processes a review for a card and updates its scheduling.
 * @param card The card being reviewed.
 * @param quality The quality of recall (1-5).
 * @param msToAnswer Optional time to answer.
 * @returns The updated card.
 */
export const reviewCard = (
  card: Card,
  quality: ReviewHistory['rating'],
  msToAnswer?: number
): Card => {
  const now = new Date().toISOString();
  
  const newReviewRecord: ReviewHistory = {
    date: now,
    rating: quality,
    interval: card.scheduling.interval,
    msToAnswer: msToAnswer || 0,
  };

  const updatedReviewHistory = [...card.reviewHistory, newReviewRecord];
  
  // Determine how many times the card has been successfully reviewed (q >= 3)
  // For simplicity here, we'll use reviewHistory length. 
  // A more accurate count would be "consecutive successful reviews" or similar for graduation.
  // The plan states "successfully recalling 3+ times" for graduation.
  // Let's count successful reviews (rating >=3)
  const successfulReviewsCount = updatedReviewHistory.filter(r => r.rating >= 3).length;

  const { newEaseFactor, nextInterval, isLearning } = updateCardSM2(
    card.scheduling.easeFactor,
    card.scheduling.interval,
    // Pass the count of reviews where quality >= 3 BEFORE this current review
    successfulReviewsCount -1, // if this is the first review (quality>=3), then count is 0.
    quality
  );

  const updatedScheduling: CardScheduling = {
    easeFactor: newEaseFactor,
    interval: nextInterval,
    dueDate: calculateNextDueDate(nextInterval),
    learningStage: isLearning ? 'learning' : 'review',
  };
  
  // Handle graduation logic as per plan: "Cards move from learning to review after successfully recalling 3+ times"
  // The isLearning flag from updateCardSM2 handles initial steps.
  // If not learning, and successfulReviewsCount >= 3, it's definitely 'review'.
  // If quality < 3, it might go to 'relearning'.
  if (quality < 3) {
      updatedScheduling.learningStage = 'relearning'; // or back to 'learning' if interval reset
      if (nextInterval === FIRST_INTERVAL) { // if interval was reset due to bad recall
        updatedScheduling.learningStage = 'learning';
      }
  } else if (!isLearning && successfulReviewsCount >= 3) {
    updatedScheduling.learningStage = 'review';
  } else if (isLearning) {
     updatedScheduling.learningStage = 'learning';
  }

  return {
    ...card,
    reviewHistory: updatedReviewHistory,
    scheduling: updatedScheduling,
    modified: now,
  };
};
