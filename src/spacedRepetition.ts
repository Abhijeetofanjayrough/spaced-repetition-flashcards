/**
 * Implementation of the SuperMemo SM-2 spaced repetition algorithm
 * Based on: https://www.supermemo.com/en/archives1990-2015/english/ol/sm2
 */

// Types
export type LearningStage = 'learning' | 'review' | 'relearning';

// Learning steps in minutes (for new cards / relearning)
// These are examples; they can be configured.
// 1 min, 10 mins, 1 day (1440 mins)
export const LEARNING_STEPS_MINUTES = [1, 10, 1440]; 
// For relearning, perhaps shorter steps or fewer steps
export const RELEARNING_STEPS_MINUTES = [10, 1440]; // 10 mins, 1 day

export interface SchedulingData {
  interval: number;      // in days
  easeFactor: number;    // multiplier for interval
  dueDate: string;       // ISO date string
  learningStage: LearningStage;
  currentStep?: number; // Current step in LEARNING_STEPS or RELEARNING_STEPS
}

export interface ReviewData {
  date: string;          // ISO date string
  rating: number;        // 1-5 quality rating
  msToAnswer: number;    // milliseconds taken to answer
  interval: number;      // interval at time of review
}

/**
 * Calculates the next scheduling data based on current data and user rating
 * @param currentScheduling Current scheduling data
 * @param rating User quality rating (1-5)
 * @param hintUsed Optional boolean indicating if a hint was used for this review
 * @returns Updated scheduling data
 */
export function calculateNextSchedule(
  currentScheduling: SchedulingData,
  rating: number,
  hintUsed?: boolean 
): SchedulingData {
  // Extract current values
  let { interval, easeFactor, learningStage, currentStep } = currentScheduling;
  const MIN_EF = 1.3; // Renamed from newEaseFactor for clarity before assignment

  // Adjust quality for EF calculation if hint was used
  // Penalty applies if recall was good (>=3) but hint was needed.
  let qualityForEfCalc = rating;
  if (hintUsed && rating >= 3 && rating < 5) { // Don't penalize if quality is already low or perfect despite hint
    qualityForEfCalc = Math.max(0, rating - 1); // Reduce quality by 1 for EF calculation
  }
  
  // Calculate new ease factor based on hint-adjusted quality
  // Formula: EF' = EF + (0.1 - (5-q) * 0.08 + (5-q) * 0.02)
  const qualityFactor = 5 - qualityForEfCalc;
  let newEaseFactor = easeFactor + (0.1 - qualityFactor * 0.08 + qualityFactor * 0.02);
  
  // Maintain minimum ease factor
  newEaseFactor = Math.max(MIN_EF, newEaseFactor);
  
  // Determine new interval and learning stage
  let newInterval: number;
  let newLearningStage: LearningStage = learningStage;
  let nextStep: number | undefined = currentStep;

  if (rating < 3) { // Failed recall
    newLearningStage = 'relearning';
    nextStep = 0;
    newInterval = RELEARNING_STEPS_MINUTES[0] / 1440; // days
    // Ease factor is not reduced as drastically on lapse as in some SM-2 variants,
    // but it will be affected by the low quality rating in the EF calculation.
    // The interval resets to the first relearning step.
  } else { // Successful recall (rating >= 3)
    if (learningStage === 'learning') {
      if (nextStep === undefined) nextStep = 0;
      else nextStep++;

      if (nextStep >= LEARNING_STEPS_MINUTES.length) {
        newLearningStage = 'review';
        newInterval = 1; // Graduate to review, initial interval 1 day
        nextStep = undefined; // Clear step
      } else {
        newInterval = LEARNING_STEPS_MINUTES[nextStep] / 1440; // days
      }
    } else if (learningStage === 'relearning') {
      if (nextStep === undefined) nextStep = 0;
      else nextStep++;

      if (nextStep >= RELEARNING_STEPS_MINUTES.length) {
        newLearningStage = 'review';
        // Successfully relearned. Graduate back to review.
        // Interval could be I(n) * EF or a fraction of previous interval.
        // Let's use a more conservative interval after relearning.
        newInterval = Math.max(1, Math.floor(interval * 0.5 * newEaseFactor)); // Or simply 1 day like after learning.
                                                                            // Using a calculation based on EF but reduced.
        nextStep = undefined; // Clear step
      } else {
        newInterval = RELEARNING_STEPS_MINUTES[nextStep] / 1440; // days
      }
    } else { // learningStage === 'review'
      // Standard SM-2 formula: I(n+1) = I(n) * EF
      // On first successful review (interval might be 1 day from graduation), make a jump.
      if (interval <= 1) { // If interval is 1 day (e.g. just graduated)
        newInterval = Math.round(1 * newEaseFactor); // Could also be a fixed value like 3-6 days
        if (newInterval <=1 && rating >=4) newInterval = 3; // Ensure a jump if EF is low but rating is good
        else if (newInterval <=1) newInterval = 1;

      } else {
        newInterval = Math.round(interval * newEaseFactor);
      }
      nextStep = undefined; // No steps in review stage
    }
  }
  
  // Calculate new due date
  const now = new Date();
  const dueDate = new Date(now);
  dueDate.setDate(now.getDate() + newInterval);
  
  return {
    interval: newInterval,
    easeFactor: newEaseFactor,
    dueDate: dueDate.toISOString(),
    learningStage: newLearningStage,
    currentStep: nextStep
  };
}

/**
 * Handle overdue cards by partially resetting the interval
 * @param schedulingData Current scheduling data
 * @param daysOverdue Number of days overdue
 * @returns Adjusted scheduling data
 */
export function adjustForOverdue(
  schedulingData: SchedulingData,
  daysOverdue: number
): SchedulingData {
  if (daysOverdue <= 0) return schedulingData;
  
  // Clone to avoid modifying original
  const adjusted = { ...schedulingData };
  
  // Only adjust if significantly overdue (more than 14 days)
  if (daysOverdue > 14) {
    // Reduce interval proportionally to how overdue the card is
    // More overdue = more penalty
    const overdueFactor = Math.min(0.75, (14 / daysOverdue)); // Maximum 75% penalty
    adjusted.interval = Math.max(1, Math.round(adjusted.interval * overdueFactor));
    
    // Slightly reduce ease factor
    adjusted.easeFactor = Math.max(1.3, adjusted.easeFactor - 0.1);
  }
  
  return adjusted;
}

/**
 * Calculate initial scheduling for a new card
 * @returns Initial scheduling data
 */
export function getInitialScheduling(): SchedulingData {
  // New cards start with 1 day interval and standard ease factor
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  
  return {
    interval: 1,
    easeFactor: 2.5,
    dueDate: tomorrow.toISOString(),
    learningStage: 'learning',
    currentStep: 0 // Start at the first learning step
  };
}

/**
 * Prioritize cards for review
 * @param cards Array of cards with scheduling data
 * @param newCardLimit Maximum number of new cards to include
 * @param reviewCardLimit Maximum number of review cards to include
 * @returns Sorted array of card IDs for review
 */
export function prioritizeCards(
  cards: Array<{ id: string, scheduling: SchedulingData }>,
  newCardLimit: number = 10,
  reviewCardLimit: number = 50
): string[] {
  const now = new Date();
  
  // Separate cards by type
  const dueCards = cards.filter(card => 
    new Date(card.scheduling.dueDate) <= now && 
    card.scheduling.learningStage !== 'learning'
  );
  
  const newCards = cards.filter(card => 
    card.scheduling.learningStage === 'learning'
  );
  
  // Sort due cards by how overdue they are (oldest first)
  const sortedDueCards = dueCards.sort((a, b) => 
    new Date(a.scheduling.dueDate).getTime() - 
    new Date(b.scheduling.dueDate).getTime()
  );
  
  // Sort new cards (by ease factor as secondary sort)
  const sortedNewCards = newCards.sort((a, b) => 
    a.scheduling.easeFactor - b.scheduling.easeFactor
  );
  
  // Take limits into account
  const selectedDueCards = sortedDueCards.slice(0, reviewCardLimit);
  const selectedNewCards = sortedNewCards.slice(0, newCardLimit);
  
  // Combine with 70% review cards, 30% new cards distribution
  // If we have enough cards of both types
  const totalCards = [...selectedDueCards, ...selectedNewCards];
  
  // Final sorting: Learning stage cards first, then relearning, then review
  return totalCards
    .sort((a, b) => {
      // Primary sort by learning stage (learning first)
      const stageOrder: Record<LearningStage, number> = {
        learning: 0,
        relearning: 1,
        review: 2
      };
      
      const aOrder = stageOrder[a.scheduling.learningStage];
      const bOrder = stageOrder[b.scheduling.learningStage];
      
      if (aOrder !== bOrder) return aOrder - bOrder;
      
      // Secondary sort by due date
      return new Date(a.scheduling.dueDate).getTime() - 
             new Date(b.scheduling.dueDate).getTime();
    })
    .map(card => card.id);
}
