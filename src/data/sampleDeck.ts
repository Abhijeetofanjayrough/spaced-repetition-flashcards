import { Card } from '../models/Card';
import { Deck, defaultDeck } from '../models/Deck';

const sampleDeck: Card[] = [
  {
    id: '1',
    front: 'What is the capital of France?',
    back: 'Paris',
    deckId: 'default',
    created: '2025-05-17T10:30:00Z',
    modified: '2025-05-17T10:30:00Z',
    reviewHistory: [],
    scheduling: {
      interval: 1,
      easeFactor: 2.5,
      dueDate: '2025-05-18T10:30:00Z',
      learningStage: 'learning',
    },
  },
  {
    id: 'cloze1',
    front: 'The chemical symbol for Oxygen is {{O}} and for Hydrogen is {{H}}.',
    back: 'Oxygen is essential for respiration, and Hydrogen is the most abundant element.',
    cardType: 'cloze',
    deckId: 'default',
    created: '2025-05-20T10:00:00Z',
    modified: '2025-05-20T10:00:00Z',
    reviewHistory: [],
    scheduling: {
      interval: 1,
      easeFactor: 2.5,
      dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      learningStage: 'learning',
    },
  },
  {
    id: 'multi1',
    front: '<div>Which of the following is a primary color?</div><ol type="A" style="margin-top:8px; padding-left: 20px;"><li>Green</li><li>Orange</li><li>Blue</li><li>Violet</li></ol>',
    back: '<div>Correct: <b>C</b><br/>Blue</div>',
    deckId: 'default',
    created: '2025-05-22T10:00:00Z',
    modified: '2025-05-22T10:00:00Z',
    reviewHistory: [],
    scheduling: {
      interval: 1,
      easeFactor: 2.5,
      dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      learningStage: 'learning',
    },
  }
];

const sampleDecks: Deck[] = [
  {
    ...defaultDeck,
  },
];

export { sampleDeck, sampleDecks };
