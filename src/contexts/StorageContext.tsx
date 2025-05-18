import React, { createContext, useContext, useEffect, useState } from 'react';
import Dexie from 'dexie';

// Define our database
class FlashcardDatabase extends Dexie {
  decks: Dexie.Table<DeckType, string>;
  cards: Dexie.Table<CardType, string>;

  constructor() {
    super('FlashcardDB');
    this.version(1).stores({
      decks: 'id, name, created, lastStudied, parent',
      cards: 'id, deckId, front, back, created, *tags, dueDate'
    });
    this.decks = this.table('decks');
    this.cards = this.table('cards');
  }
}

// Define types
export interface CardType {
  id: string;
  front: string;
  back: string;
  mediaAttachments?: string[];
  tags: string[];
  deckId: string;
  created: string;
  modified: string;
  reviewHistory: ReviewHistoryItem[];
  scheduling: {
    interval: number;
    easeFactor: number;
    dueDate: string;
    learningStage: 'learning' | 'review' | 'relearning';
  };
}

export interface ReviewHistoryItem {
  date: string;
  rating: number;
  msToAnswer: number;
  interval: number;
}

export interface DeckType {
  id: string;
  name: string;
  description?: string;
  created: string;
  lastStudied?: string;
  parent?: string;
  tags?: string[];
  completionRate?: number;
  masteryLevel?: number;
}

// Create database instance
const db = new FlashcardDatabase();

// Context type definition
interface StorageContextType {
  db: FlashcardDatabase;
  isLoaded: boolean;
  getCardsDueToday: () => Promise<CardType[]>;
  getCardsForDeck: (deckId: string) => Promise<CardType[]>;
  getCardsDueForDeck: (deckId: string) => Promise<CardType[]>;
  getDeckWithStats: (deckId: string) => Promise<DeckType & { cardCount: number, dueCount: number }>;
  applySpacedRepetition: (card: CardType, rating: number) => Promise<CardType>;
  saveCard: (card: CardType) => Promise<string>;
  saveDeck: (deck: DeckType) => Promise<string>;
  deleteDeck: (deckId: string) => Promise<void>;
  deleteCard: (cardId: string) => Promise<void>;
  getDueCardCount: () => Promise<number>;
  getAllDecks: () => Promise<DeckType[]>;
}

const StorageContext = createContext<StorageContextType | undefined>(undefined);

export const StorageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  
  // Initialize the database
  useEffect(() => {
    const initDB = async () => {
      try {
        await db.open();
        
        // Add sample data if database is empty
        const deckCount = await db.decks.count();
        
        if (deckCount === 0) {
          console.log("Adding sample data...");
          await addSampleData();
        }
        
        setIsLoaded(true);
      } catch (error) {
        console.error('Failed to open database:', error);
      }
    };

    initDB();
    return () => {
      db.close();
    };
  }, []);
  
  // Add sample data for first-time users
  const addSampleData = async () => {
    try {
      const now = new Date();
      
      // Create sample deck
      const sampleDeckId = crypto.randomUUID();
      await db.decks.add({
        id: sampleDeckId,
        name: "Sample Geography Deck",
        description: "A sample deck with geography questions",
        created: now.toISOString(),
        tags: ["sample", "geography"]
      });
      
      // Create sample cards
      const sampleCards = [
        {
          id: crypto.randomUUID(),
          front: "What is the capital of France?",
          back: "Paris",
          tags: ["europe", "capitals"],
          deckId: sampleDeckId,
          created: now.toISOString(),
          modified: now.toISOString(),
          reviewHistory: [],
          scheduling: {
            interval: 1,
            easeFactor: 2.5,
            dueDate: now.toISOString(),
            learningStage: "learning" as const
          }
        },
        {
          id: crypto.randomUUID(),
          front: "What is the capital of Japan?",
          back: "Tokyo",
          tags: ["asia", "capitals"],
          deckId: sampleDeckId,
          created: now.toISOString(),
          modified: now.toISOString(),
          reviewHistory: [],
          scheduling: {
            interval: 1,
            easeFactor: 2.5,
            dueDate: now.toISOString(),
            learningStage: "learning" as const
          }
        },
        {
          id: crypto.randomUUID(),
          front: "What is the largest ocean?",
          back: "Pacific Ocean",
          tags: ["oceans", "nature"],
          deckId: sampleDeckId,
          created: now.toISOString(),
          modified: now.toISOString(),
          reviewHistory: [],
          scheduling: {
            interval: 1,
            easeFactor: 2.5,
            dueDate: now.toISOString(),
            learningStage: "learning" as const
          }
        }
      ];
      
      await db.cards.bulkAdd(sampleCards);
    } catch (error) {
      console.error("Failed to add sample data:", error);
    }
  };

  // SM-2 spaced repetition algorithm implementation
  const applySpacedRepetition = async (card: CardType, rating: number): Promise<CardType> => {
    const now = new Date();
    // Default to 3 seconds if we don't have actual timing data
    const msToAnswer = 3000; 

    // Clone card to avoid direct mutation
    const updatedCard = {...card};
    
    // Get current scheduling info
    let { interval, easeFactor, learningStage } = updatedCard.scheduling;
    
    // Update ease factor based on quality of recall (clamped between 1.3 and 2.5)
    // SM-2 formula: EF' = EF + (0.1 - (5 - q) * 0.08 + (5 - q) * 0.02)
    easeFactor = Math.max(1.3, Math.min(2.5, 
      easeFactor + (0.1 - (5 - rating) * 0.08 + (5 - rating) * 0.02)
    ));
    
    // Calculate new interval based on rating and learning stage
    if (rating < 3) {
      // Failed recall - reset interval but not completely
      if (learningStage === 'learning') {
        interval = 1; // Reset new cards to 1 day
      } else {
        // For review/relearning cards, reduce interval but don't reset completely
        interval = Math.max(1, Math.floor(interval * 0.4));
      }
      learningStage = 'relearning';
    } else {
      // Successful recall - increase interval based on learning stage
      if (learningStage === 'learning') {
        // Learning cards use fixed progression
        interval = rating >= 4 ? 3 : 1;
        
        // Graduate after enough correct answers
        if (updatedCard.reviewHistory.filter(r => r.rating >= 3).length >= 2) {
          learningStage = 'review';
        }
      } else if (learningStage === 'relearning') {
        // Relearning cards use slightly reduced progression
        interval = Math.max(1, Math.floor(interval * easeFactor * 0.7));
        
        // Graduate after enough correct answers
        if (rating >= 4) {
          learningStage = 'review';
        }
      } else {
        // Review cards use full SM-2 progression
        interval = Math.round(interval * easeFactor);
      }
    }
    
    // Handle overdue cards (more than 14 days)
    const dueDate = new Date(updatedCard.scheduling.dueDate);
    const daysOverdue = Math.max(0, Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 3600 * 24)) - 14);
    
    if (daysOverdue > 0 && rating >= 3) {
      // Reduce interval for cards that were significantly overdue but still remembered
      interval = Math.max(1, Math.floor(interval * (0.9 - daysOverdue * 0.01)));
    }
    
    // Calculate new due date
    const newDueDate = new Date(now);
    newDueDate.setDate(newDueDate.getDate() + interval);
    
    // Update card scheduling data
    updatedCard.scheduling = {
      interval,
      easeFactor,
      dueDate: newDueDate.toISOString(),
      learningStage
    };
    
    // Add review to history
    updatedCard.reviewHistory.push({
      date: now.toISOString(),
      rating,
      msToAnswer,
      interval
    });
    
    updatedCard.modified = now.toISOString();
    
    // Save to database
    await db.cards.put(updatedCard);
    return updatedCard;
  };

  // Get all cards due today
  const getCardsDueToday = async (): Promise<CardType[]> => {
    const now = new Date();
    
    return await db.cards
      .where('scheduling.dueDate')
      .belowOrEqual(now.toISOString())
      .toArray();
  };
  
  // Get due card count for today
  const getDueCardCount = async (): Promise<number> => {
    const now = new Date();
    
    return await db.cards
      .where('scheduling.dueDate')
      .belowOrEqual(now.toISOString())
      .count();
  };
  
  // Get all cards for a specific deck
  const getCardsForDeck = async (deckId: string): Promise<CardType[]> => {
    return await db.cards
      .where('deckId')
      .equals(deckId)
      .toArray();
  };
  
  // Get due cards for a specific deck
  const getCardsDueForDeck = async (deckId: string): Promise<CardType[]> => {
    const now = new Date();
    
    return await db.cards
      .where('deckId')
      .equals(deckId)
      .and(card => new Date(card.scheduling.dueDate) <= now)
      .toArray();
  };
  
  // Get a deck with associated stats
  const getDeckWithStats = async (deckId: string): Promise<DeckType & { cardCount: number, dueCount: number }> => {
    const deck = await db.decks.get(deckId);
    
    if (!deck) {
      throw new Error(`Deck with id ${deckId} not found`);
    }
    
    const now = new Date();
    const allCards = await db.cards.where('deckId').equals(deckId).toArray();
    const dueCards = allCards.filter(card => new Date(card.scheduling.dueDate) <= now);
    
    return {
      ...deck,
      cardCount: allCards.length,
      dueCount: dueCards.length
    };
  };
  
  // Save/update a card
  const saveCard = async (card: CardType): Promise<string> => {
    const now = new Date();
    
    if (!card.id) {
      // New card
      card.id = crypto.randomUUID();
      card.created = now.toISOString();
      
      // Initialize scheduling for new cards
      card.scheduling = card.scheduling || {
        interval: 1,
        easeFactor: 2.5,
        dueDate: now.toISOString(),
        learningStage: 'learning'
      };
      
      // Initialize empty review history
      card.reviewHistory = card.reviewHistory || [];
      card.tags = card.tags || [];
    }
    
    card.modified = now.toISOString();
    
    await db.cards.put(card);
    return card.id;
  };
  
  // Save/update a deck
  const saveDeck = async (deck: DeckType): Promise<string> => {
    const now = new Date();
    
    if (!deck.id) {
      // New deck
      deck.id = crypto.randomUUID();
      deck.created = now.toISOString();
    }
    
    await db.decks.put(deck);
    return deck.id;
  };
  
  // Delete a deck and all its cards
  const deleteDeck = async (deckId: string): Promise<void> => {
    // Delete all cards in the deck
    await db.cards.where('deckId').equals(deckId).delete();
    
    // Delete the deck
    await db.decks.delete(deckId);
  };
  
  // Delete a card
  const deleteCard = async (cardId: string): Promise<void> => {
    await db.cards.delete(cardId);
  };
  
  // Get all decks
  const getAllDecks = async (): Promise<DeckType[]> => {
    return await db.decks.toArray();
  };

  const value = {
    db,
    isLoaded,
    getCardsDueToday,
    getCardsForDeck,
    getCardsDueForDeck,
    getDeckWithStats,
    applySpacedRepetition,
    saveCard,
    saveDeck,
    deleteDeck,
    deleteCard,
    getDueCardCount,
    getAllDecks
  };

  return <StorageContext.Provider value={value}>{children}</StorageContext.Provider>;
};

export const useStorage = (): StorageContextType => {
  const context = useContext(StorageContext);
  if (context === undefined) {
    throw new Error('useStorage must be used within a StorageProvider');
  }
  return context;
};
