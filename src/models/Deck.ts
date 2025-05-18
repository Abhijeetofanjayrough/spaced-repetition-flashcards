// Deck model for organizing flashcards
// import { Card } from './Card';

export type DeckCommon = {
  id: string;
  type: 'regular' | 'filtered';
  name: string;
  created: string; // ISO string
  modified: string; // ISO string
  description?: string;
  color?: string; // Hex color code
  icon?: string; // Emoji or SVG string
  mastery: number; // Calculated: 0-1, e.g., average ease factor or other metric
  completionRate: number; // Calculated: 0-1, e.g., percentage of cards in review stage
  lastStudied?: string; // ISO string
  parentId?: string; // For nested decks
  // UI properties
  avgScore?: number; // Average review score for cards in this deck
  totalStudyTimeMs?: number; // Total time spent studying this deck in ms
};

export type RegularDeck = DeckCommon & {
  type: 'regular';
  cardIds?: string[]; // IDs of cards associated with this deck
};

export type FilteredDeck = DeckCommon & {
  type: 'filtered';
  filters: FilterCriterion[];
  // cardIds are dynamically determined, not stored
};

export type FilterCondition = 
  | 'includes' | 'not_includes' // for tags, deckId (array value)
  | 'equals' | 'not_equals' // for deckId (single value)
  | 'startsWith' // for front/back text
  | 'before' | 'after' // for dueDate, created, modified
  | 'last_n_days' // for dueDate (e.g., due in last 7 days)
  | 'next_n_days' // for dueDate (e.g., due in next 7 days)
  | 'is_due' // for dueDate (due on or before today)
  | 'is_learning' | 'is_reviewing' | 'is_relearning' // for learningStage
  | 'lt' | 'lte' | 'gt' | 'gte' // for easeFactor, interval, reviewHistory.length
  | 'has_images' | 'no_images' // for mediaAttachments
  | 'is_favorite' | 'is_not_favorite'
  | 'is_archived' | 'is_not_archived';

export interface FilterCriterion {
  field: 'tags' | 'deckId' | 'front' | 'back' | 'dueDate' | 'createdDate' | 'modifiedDate' | 'learningStage' | 'easeFactor' | 'interval' | 'reviewCount' | 'mediaAttachments' | 'favorite' | 'archived' | 'cardType';
  condition: FilterCondition;
  value?: any; // string for tags/text, string[] for deckIds, number for date ranges/numeric, 'basic'|'cloze' for cardType
}

export type Deck = RegularDeck | FilteredDeck;

export const defaultDeck: RegularDeck = {
  id: 'default',
  type: 'regular',
  name: 'Default Deck',
  created: new Date().toISOString(),
  modified: new Date().toISOString(),
  description: 'Default deck for your cards',
  color: '#3A7BDE',
  icon: '📚',
  mastery: 0,
  completionRate: 0,
  // No parentId for the default top-level deck
};

// Function to check if a deck is a regular deck
export function isRegularDeck(deck: Deck): deck is RegularDeck {
  return deck.type === 'regular';
}

// Function to check if a deck is a filtered deck
export function isFilteredDeck(deck: Deck): deck is FilteredDeck {
  return deck.type === 'filtered';
}
