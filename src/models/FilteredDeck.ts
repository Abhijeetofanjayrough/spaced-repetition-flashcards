import { Card } from './Card';

export type FilterCriteria = {
  tags?: string[]; // Cards matching ANY of these tags
  due?: 'today' | 'next7days' | 'overdue' | 'customDays' | 'none';
  customDueDays?: number; // If due === 'customDays'
  learningStages?: ('learning' | 'review' | 'relearning')[]; // Cards in ANY of these stages
  deckSources?: string[]; // Source cards from these specific deck IDs. If empty/undefined, all decks.
  searchText?: string; // Case-insensitive search in front/back content
  isFavorite?: boolean; // true: only favorite, false: only non-favorite, undefined: no filter
  // Future: difficulty (based on EF), specific fields (front/back contains X), etc.
};

export type FilteredDeck = {
  id: string;
  type: 'filtered'; // To distinguish from regular Decks
  name: string;
  created: string;
  modified: string;
  filterCriteria: FilterCriteria;
};

// Example of creating a filtered deck (not stored here, just for illustration)
// const exampleFilteredDeck: FilteredDeck = {
//   id: 'fd-123',
//   type: 'filtered',
//   name: 'Hard Geography Questions Due Soon',
//   created: new Date().toISOString(),
//   modified: new Date().toISOString(),
//   filterCriteria: {
//     tags: ['geography'],
//     due: 'next7days',
//     // difficulty: 'hard', // (example for future extension)
//   }
// }; 