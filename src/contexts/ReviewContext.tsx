import React, { createContext, useContext, useState, useReducer } from 'react';
import { useStorage, CardType } from './StorageContext';

interface ReviewState {
  currentCard: CardType | null;
  cardsQueue: CardType[];
  reviewedCards: CardType[];
  isRevealed: boolean;
  sessionStartTime: Date | null;
  sessionProgress: {
    total: number;
    completed: number;
    correct: number;
  };
  isSessionComplete: boolean;
}

type ReviewAction = 
  | { type: 'START_SESSION'; payload: { cards: CardType[] } }
  | { type: 'NEXT_CARD' }
  | { type: 'REVEAL_CARD' }
  | { type: 'RATE_CARD'; payload: { rating: number } }
  | { type: 'END_SESSION' };

interface ReviewContextType {
  state: ReviewState;
  startSession: (deckId: string, newCardsLimit?: number, reviewLimit?: number) => Promise<void>;
  revealCard: () => void;
  rateCard: (rating: number) => Promise<void>;
  endSession: () => void;
}

const initialState: ReviewState = {
  currentCard: null,
  cardsQueue: [],
  reviewedCards: [],
  isRevealed: false,
  sessionStartTime: null,
  sessionProgress: {
    total: 0,
    completed: 0,
    correct: 0,
  },
  isSessionComplete: false,
};

const reviewReducer = (state: ReviewState, action: ReviewAction): ReviewState => {
  switch (action.type) {
    case 'START_SESSION':
      return {
        ...initialState,
        cardsQueue: action.payload.cards.slice(1),
        currentCard: action.payload.cards[0] || null,
        sessionStartTime: new Date(),
        sessionProgress: {
          total: action.payload.cards.length,
          completed: 0,
          correct: 0,
        },
      };
      
    case 'REVEAL_CARD':
      return {
        ...state,
        isRevealed: true,
      };
      
    case 'RATE_CARD':
      return {
        ...state,
        reviewedCards: [...state.reviewedCards, state.currentCard!],
        sessionProgress: {
          ...state.sessionProgress,
          completed: state.sessionProgress.completed + 1,
          correct: action.payload.rating >= 3 
            ? state.sessionProgress.correct + 1 
            : state.sessionProgress.correct,
        },
      };
      
    case 'NEXT_CARD':
      if (state.cardsQueue.length === 0) {
        return {
          ...state,
          currentCard: null,
          isRevealed: false,
          isSessionComplete: true,
        };
      }
      return {
        ...state,
        currentCard: state.cardsQueue[0],
        cardsQueue: state.cardsQueue.slice(1),
        isRevealed: false,
      };
      
    case 'END_SESSION':
      return {
        ...initialState,
        isSessionComplete: true,
      };
      
    default:
      return state;
  }
};

const ReviewContext = createContext<ReviewContextType | undefined>(undefined);

export const ReviewProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { db, applySpacedRepetition } = useStorage();
  const [state, dispatch] = useReducer(reviewReducer, initialState);
  
  // Start a new review session
  const startSession = async (
    deckId: string, 
    newCardsLimit = 10, 
    reviewLimit = 50
  ) => {
    try {
      // Get cards due for review from this deck
      const now = new Date();
      const dueCards = await db.cards
        .where('deckId')
        .equals(deckId)
        .and(card => new Date(card.scheduling.dueDate) <= now)
        .limit(reviewLimit)
        .toArray();
      
      // Get new cards (ones with no review history)
      const newCards = await db.cards
        .where('deckId')
        .equals(deckId)
        .and(card => card.reviewHistory.length === 0)
        .limit(newCardsLimit)
        .toArray();
      
      // Mix cards: 70% review, 30% new cards
      const allCards = [...dueCards, ...newCards];
      
      // Shuffle the cards to randomize order
      const shuffledCards = allCards.sort(() => Math.random() - 0.5);
      
      if (shuffledCards.length > 0) {
        // Update deck's lastStudied field
        const deck = await db.decks.get(deckId);
        if (deck) {
          deck.lastStudied = new Date().toISOString();
          await db.decks.put(deck);
        }
        
        dispatch({ 
          type: 'START_SESSION', 
          payload: { cards: shuffledCards } 
        });
      } else {
        // Handle no cards scenario
        dispatch({ 
          type: 'START_SESSION', 
          payload: { cards: [] } 
        });
      }
    } catch (error) {
      console.error('Failed to start review session:', error);
    }
  };
  
  // Reveal the current card's answer
  const revealCard = () => {
    dispatch({ type: 'REVEAL_CARD' });
  };
  
  // Rate current card and move to next
  const rateCard = async (rating: number) => {
    if (!state.currentCard) return;
    
    try {
      // Apply spaced repetition algorithm
      const updatedCard = await applySpacedRepetition(state.currentCard, rating);
      
      // Update reviewed card state
      dispatch({ 
        type: 'RATE_CARD', 
        payload: { rating } 
      });
      
      // Move to next card
      dispatch({ type: 'NEXT_CARD' });
    } catch (error) {
      console.error('Failed to rate card:', error);
    }
  };
  
  // End current session
  const endSession = () => {
    dispatch({ type: 'END_SESSION' });
  };
  
  return (
    <ReviewContext.Provider
      value={{
        state,
        startSession,
        revealCard,
        rateCard,
        endSession,
      }}
    >
      {children}
    </ReviewContext.Provider>
  );
};

export const useReview = (): ReviewContextType => {
  const context = useContext(ReviewContext);
  if (context === undefined) {
    throw new Error('useReview must be used within a ReviewProvider');
  }
  return context;
};
