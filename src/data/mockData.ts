import { Card } from '../models/Card';
import { RegularDeck, FilteredDeck } from '../models/Deck';
import { v4 as uuidv4 } from 'uuid';
import { getInitialScheduling } from '../spacedRepetition';

// Helper to create dates relative to now
const daysFromNow = (days: number): string => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
};

// Create mock review history
const createMockReviewHistory = (count: number, startDays: number = 30) => {
  const history = [];
  for (let i = 0; i < count; i++) {
    const daysAgo = startDays - (i * 3);
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    
    history.push({
      date: date.toISOString(),
      rating: Math.floor(Math.random() * 3) + 3, // Ratings 3-5
      msToAnswer: Math.floor(Math.random() * 20000) + 1000, // 1-21 seconds
      interval: Math.floor(Math.random() * 10) + 1
    });
  }
  return history;
};

// Mock Decks
export const mockDecks: (RegularDeck | FilteredDeck)[] = [
  {
    id: 'default',
    type: 'regular',
    name: 'General Knowledge',
    description: 'A collection of general knowledge questions',
    created: daysFromNow(-30),
    modified: daysFromNow(-1),
    cardIds: [],
    mastery: 0.65,
    completionRate: 0.8,
    lastStudied: daysFromNow(-1)
  },
  {
    id: uuidv4(),
    type: 'regular',
    name: 'Computer Science',
    description: 'Programming concepts, algorithms, and computer science fundamentals',
    created: daysFromNow(-25),
    modified: daysFromNow(-2),
    cardIds: [],
    mastery: 0.58,
    completionRate: 0.75,
    lastStudied: daysFromNow(-2)
  },
  {
    id: uuidv4(),
    type: 'regular',
    name: 'Language Learning',
    description: 'Essential vocabulary and phrases for language learning',
    created: daysFromNow(-20),
    modified: daysFromNow(-3),
    cardIds: [],
    mastery: 0.42,
    completionRate: 0.6,
    lastStudied: daysFromNow(-3)
  },
  {
    id: uuidv4(),
    type: 'filtered',
    name: 'Due Today',
    description: 'Cards that need to be reviewed today',
    created: daysFromNow(-15),
    modified: daysFromNow(0),
    filters: [
      {
        field: 'dueDate',
        condition: 'is_due',
        value: null
      }
    ],
    mastery: 0,
    completionRate: 0,
    lastStudied: daysFromNow(-1)
  }
];

// Sample cards for General Knowledge
export const generalKnowledgeCards: Card[] = [
  {
    id: uuidv4(),
    front: 'What is the capital of France?',
    back: 'Paris',
    deckId: mockDecks[0].id,
    cardType: 'basic',
    created: daysFromNow(-30),
    modified: daysFromNow(-5),
    reviewHistory: createMockReviewHistory(5),
    scheduling: {
      ...getInitialScheduling(),
      interval: 7,
      easeFactor: 2.7,
      dueDate: daysFromNow(2),
      learningStage: 'review'
    },
    tags: ['geography', 'europe']
  },
  {
    id: uuidv4(),
    front: 'Who wrote "Romeo and Juliet"?',
    back: 'William Shakespeare',
    deckId: mockDecks[0].id,
    cardType: 'basic',
    created: daysFromNow(-29),
    modified: daysFromNow(-4),
    reviewHistory: createMockReviewHistory(4),
    scheduling: {
      ...getInitialScheduling(),
      interval: 5,
      easeFactor: 2.5,
      dueDate: daysFromNow(0), // Due today
      learningStage: 'review'
    },
    tags: ['literature', 'history']
  },
  {
    id: uuidv4(),
    front: 'What is the largest planet in our solar system?',
    back: 'Jupiter',
    deckId: mockDecks[0].id,
    cardType: 'basic',
    created: daysFromNow(-28),
    modified: daysFromNow(-3),
    reviewHistory: createMockReviewHistory(3),
    scheduling: {
      ...getInitialScheduling(),
      interval: 3,
      easeFactor: 2.3,
      dueDate: daysFromNow(-1), // Overdue
      learningStage: 'review'
    },
    tags: ['astronomy', 'science']
  },
  {
    id: uuidv4(),
    front: 'The element with the chemical symbol "Au" is {{gold}}.',
    back: 'Gold is a precious metal with the atomic number 79.',
    deckId: mockDecks[0].id,
    cardType: 'cloze',
    created: daysFromNow(-27),
    modified: daysFromNow(-2),
    reviewHistory: createMockReviewHistory(2),
    scheduling: {
      ...getInitialScheduling(),
      interval: 2,
      easeFactor: 2.2,
      dueDate: daysFromNow(1),
      learningStage: 'learning'
    },
    tags: ['chemistry', 'science']
  }
];

// Sample cards for Computer Science
export const computerScienceCards: Card[] = [
  {
    id: uuidv4(),
    front: 'What does "API" stand for?',
    back: 'Application Programming Interface',
    deckId: mockDecks[1].id,
    cardType: 'basic',
    created: daysFromNow(-25),
    modified: daysFromNow(-3),
    reviewHistory: createMockReviewHistory(3),
    scheduling: {
      ...getInitialScheduling(),
      interval: 4,
      easeFactor: 2.4,
      dueDate: daysFromNow(1),
      learningStage: 'review'
    },
    tags: ['programming', 'web development']
  },
  {
    id: uuidv4(),
    front: 'What is the time complexity of binary search?',
    back: 'O(log n)',
    deckId: mockDecks[1].id,
    cardType: 'basic',
    created: daysFromNow(-24),
    modified: daysFromNow(-2),
    reviewHistory: createMockReviewHistory(4),
    scheduling: {
      ...getInitialScheduling(),
      interval: 5,
      easeFactor: 2.5,
      dueDate: daysFromNow(0), // Due today
      learningStage: 'review'
    },
    tags: ['algorithms', 'data structures']
  },
  {
    id: uuidv4(),
    front: 'In JavaScript, {{const}} and {{let}} are used to declare variables.',
    back: 'const creates a constant reference, while let allows for reassignment.',
    deckId: mockDecks[1].id,
    cardType: 'cloze',
    created: daysFromNow(-23),
    modified: daysFromNow(-1),
    reviewHistory: createMockReviewHistory(2),
    scheduling: {
      ...getInitialScheduling(),
      interval: 2,
      easeFactor: 2.2,
      dueDate: daysFromNow(-1), // Overdue
      learningStage: 'learning'
    },
    tags: ['javascript', 'programming']
  }
];

// Sample cards for Language Learning
export const languageLearningCards: Card[] = [
  {
    id: uuidv4(),
    front: 'Bonjour',
    back: 'Hello (French)',
    deckId: mockDecks[2].id,
    cardType: 'basic',
    created: daysFromNow(-20),
    modified: daysFromNow(-2),
    reviewHistory: createMockReviewHistory(5),
    scheduling: {
      ...getInitialScheduling(),
      interval: 6,
      easeFactor: 2.6,
      dueDate: daysFromNow(3),
      learningStage: 'review'
    },
    tags: ['french', 'greetings']
  },
  {
    id: uuidv4(),
    front: 'Gracias',
    back: 'Thank you (Spanish)',
    deckId: mockDecks[2].id,
    cardType: 'basic',
    created: daysFromNow(-19),
    modified: daysFromNow(-1),
    reviewHistory: createMockReviewHistory(4),
    scheduling: {
      ...getInitialScheduling(),
      interval: 5,
      easeFactor: 2.5,
      dueDate: daysFromNow(0), // Due today
      learningStage: 'review'
    },
    tags: ['spanish', 'greetings']
  },
  {
    id: uuidv4(),
    front: 'Der {{Apfel}} ist rot.',
    back: 'Apfel means "apple" in German. The sentence translates to "The apple is red."',
    deckId: mockDecks[2].id,
    cardType: 'cloze',
    created: daysFromNow(-18),
    modified: daysFromNow(0),
    reviewHistory: createMockReviewHistory(2),
    scheduling: {
      ...getInitialScheduling(),
      interval: 1,
      easeFactor: 2.1,
      dueDate: daysFromNow(-2), // Overdue
      learningStage: 'learning'
    },
    tags: ['german', 'vocabulary']
  }
];

// All mock cards
export const mockCards: Card[] = [
  ...generalKnowledgeCards,
  ...computerScienceCards,
  ...languageLearningCards
];

// Update the cardIds in the decks
(mockDecks[0] as RegularDeck).cardIds = generalKnowledgeCards.map(card => card.id);
(mockDecks[1] as RegularDeck).cardIds = computerScienceCards.map(card => card.id);
(mockDecks[2] as RegularDeck).cardIds = languageLearningCards.map(card => card.id);

// Sample user activity data
export const mockUserActivity = [
  { date: daysFromNow(-7), cardsReviewedToday: 15 },
  { date: daysFromNow(-6), cardsReviewedToday: 12 },
  { date: daysFromNow(-5), cardsReviewedToday: 20 },
  { date: daysFromNow(-4), cardsReviewedToday: 18 },
  { date: daysFromNow(-3), cardsReviewedToday: 22 },
  { date: daysFromNow(-2), cardsReviewedToday: 17 },
  { date: daysFromNow(-1), cardsReviewedToday: 14 }
]; 