export type ReviewRating = 1 | 2 | 3 | 4 | 5;
export type LearningStage = 'learning' | 'review' | 'relearning';

export interface ReviewEntry {
  date: string; // ISO date string
  rating: ReviewRating;
  msToAnswer: number;
  interval: number;
}

export interface CardScheduling {
  interval: number;
  easeFactor: number;
  dueDate: string; // ISO date string
  learningStage: LearningStage;
}

export interface Flashcard {
  id: string;
  front: string;
  back: string;
  mediaAttachments?: string[];
  tags?: string[];
  deckId: string;
  created: string; // ISO date string
  modified: string; // ISO date string
  reviewHistory: ReviewEntry[];
  scheduling: CardScheduling;
}

export interface Deck {
  id: string;
  name: string;
  description?: string;
  parentDeckId?: string; // For hierarchical deck organization
  created: string; // ISO date string
  modified: string; // ISO date string
  lastStudied?: string; // ISO date string
  completionRate?: number;
  masteryLevel?: number;
}
