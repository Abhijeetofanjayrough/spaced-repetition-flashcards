import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { db } from '../db'; // Use the unified AppDB instance
import { Card as AppCard } from '../models/Card'; // Official Card model
import { Deck as AppDeck, RegularDeck, isRegularDeck, defaultDeck as appDefaultDeck } from '../models/Deck'; // Official Deck model
import { reviewCard as processCardReviewSM2, calculateNextDueDate } from '../services/sm2'; // SM2 logic
import { v4 as uuidv4 } from 'uuid';

interface DataContextType {
  decks: AppDeck[];
  cards: AppCard[];
  isLoading: boolean;
  getDeckById: (deckId: string) => AppDeck | undefined;
  getRegularDeckById: (deckId: string) => RegularDeck | undefined;
  getCardsByDeckId: (deckId: string) => AppCard[];
  getCardById: (cardId: string) => AppCard | undefined;
  addRegularDeck: (name: string, description?: string) => Promise<RegularDeck>;
  updateDeck: (deck: AppDeck) => Promise<void>; // Can update any deck type
  deleteDeck: (deckId: string) => Promise<void>;
  addCardToDeck: (deckId: string, front: string, back: string, cardType?: 'basic' | 'cloze') => Promise<AppCard>;
  updateCard: (card: AppCard) => Promise<void>;
  deleteCard: (cardId: string) => Promise<void>;
  reviewCard: (cardId: string, quality: 1 | 2 | 3 | 4 | 5) => Promise<AppCard | undefined>;
  getDueCardsForDeck: (deckId: string) => AppCard[];
  getAllDueCards: () => AppCard[];
  refreshData: () => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};

interface DataProviderProps {
  children: ReactNode;
}

export const DataProvider: React.FC<DataProviderProps> = ({ children }) => {
  const [decks, setDecks] = useState<AppDeck[]>([]);
  const [cards, setCards] = useState<AppCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAllData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [allDecks, allCards] = await Promise.all([
        db.getAllDecks(),
        db.getAllCards(),
      ]);
      // Ensure default deck exists if none are present
      if (allDecks.length === 0 && !allDecks.find(d => d.id === appDefaultDeck.id)) {
        await db.addDeck(appDefaultDeck);
        setDecks([appDefaultDeck, ...allDecks]);
      } else if (allDecks.length > 0 && !allDecks.find(d => d.id === appDefaultDeck.id)) {
        // This case might be rare, if defaultDeck is always added by initializeAndMigrateData
        // However, ensure it for safety if db might be empty but not "brand new"
        const hasDefault = await db.getDeck(appDefaultDeck.id);
        if (!hasDefault) {
            await db.addDeck(appDefaultDeck);
            allDecks.push(appDefaultDeck); // Add to current list
        }
        setDecks(allDecks);
      } else {
        setDecks(allDecks);
      }
      setCards(allCards);
    } catch (error) {
      console.error("Failed to load data from DB", error);
      setDecks([]);
      setCards([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const getDeckById = (deckId: string) => decks.find(d => d.id === deckId);
  const getRegularDeckById = (deckId: string) => decks.find(d => d.id === deckId && isRegularDeck(d)) as RegularDeck | undefined;
  const getCardsByDeckId = (deckId: string) => cards.filter(c => c.deckId === deckId);
  const getCardById = (cardId: string) => cards.find(c => c.id === cardId);

  const addRegularDeck = async (name: string, description?: string) => {
    const now = new Date().toISOString();
    const newDeck: RegularDeck = {
      id: uuidv4(),
      name,
      description,
      type: 'regular',
      created: now,
      modified: now,
      cardIds: [],
      mastery: 0,
      completionRate: 0,
    };
    await db.addDeck(newDeck);
    await fetchAllData(); // Re-fetch to update state
    return newDeck;
  };

  const updateDeck = async (updatedDeck: AppDeck) => {
    await db.updateDeck(updatedDeck.id, updatedDeck);
    await fetchAllData(); // Re-fetch
  };

  const deleteDeck = async (deckId: string) => {
    await db.deleteDeck(deckId); // This also deletes associated cards in AppDB
    await fetchAllData(); // Re-fetch
  };

  const addCardToDeck = async (deckId: string, front: string, back: string, cardType: 'basic' | 'cloze' = 'basic') => {
    const deck = getRegularDeckById(deckId);
    if (!deck) throw new Error('Regular Deck not found to add card to');

    const now = new Date().toISOString();
    const newCard: AppCard = {
      id: uuidv4(),
      front,
      back,
      deckId,
      cardType,
      created: now,
      modified: now,
      reviewHistory: [],
      scheduling: {
        interval: 0, 
        easeFactor: 2.5, 
        dueDate: now, // Due immediately
        learningStage: 'learning',
      },
      tags: [],
    };
    await db.addCard(newCard);
    
    // Update deck's cardIds array if it's a RegularDeck
    // AppDB schema for RegularDeck has cardIds optional. db.updateDeck expects Partial<Deck>
    if (isRegularDeck(deck)) {
        const updatedDeckData: Partial<RegularDeck> = {
            cardIds: [...(deck.cardIds || []), newCard.id]
        };
        await db.updateDeck(deck.id, updatedDeckData); 
    }
    await fetchAllData(); // Re-fetch
    return newCard;
  };

  const updateCard = async (updatedCard: AppCard) => {
    await db.updateCard(updatedCard.id, updatedCard);
    await fetchAllData(); // Re-fetch
  };

  const deleteCard = async (cardId: string) => {
    const cardToDelete = getCardById(cardId);
    if (cardToDelete) {
        await db.deleteCard(cardId);
        // Remove cardId from its deck if it's a RegularDeck
        const deck = getRegularDeckById(cardToDelete.deckId);
        if (deck && deck.cardIds) {
            const updatedDeckData: Partial<RegularDeck> = {
                cardIds: deck.cardIds.filter(id => id !== cardId)
            };
            await db.updateDeck(deck.id, updatedDeckData);
        }
    }
    await fetchAllData(); // Re-fetch
  };

  const reviewCard = async (cardId: string, quality: 1 | 2 | 3 | 4 | 5) => {
    const card = getCardById(cardId);
    if (!card) return undefined;

    const successfulReviewsCount = card.reviewHistory.filter(r => r.rating >= 3).length;

    // Explicitly type the result from SM2 service
    const sm2Result: { newEaseFactor: number; nextInterval: number; isLearning: boolean } = processCardReviewSM2(
      card.scheduling.easeFactor,
      card.scheduling.interval,
      successfulReviewsCount, 
      quality
    );

    const learningStageUpdate: 'learning' | 'review' | 'relearning' = sm2Result.isLearning ? 'learning' : (quality < 3 ? 'relearning' : 'review');

    // Explicitly type the updatedScheduling object
    const updatedScheduling: AppCard['scheduling'] = {
      ...card.scheduling,
      easeFactor: sm2Result.newEaseFactor,
      interval: sm2Result.nextInterval,
      dueDate: calculateNextDueDate(sm2Result.nextInterval),
      learningStage: learningStageUpdate,
    };
    
    // This logic for currentStep might need to be adjusted based on AppCard['scheduling'] definition
    if (quality < 3 && updatedScheduling.learningStage === 'relearning') {
        updatedScheduling.currentStep = 0; 
    } else if (updatedScheduling.learningStage === 'learning' && card.scheduling.currentStep !== undefined) {
        updatedScheduling.currentStep = (card.scheduling.currentStep || 0) + 1;
    } else if (updatedScheduling.learningStage === 'review') {
        delete updatedScheduling.currentStep; 
    }

    const updatedCard: AppCard = {
      ...card,
      scheduling: updatedScheduling,
      reviewHistory: [
        ...card.reviewHistory,
        {
          date: new Date().toISOString(),
          rating: quality,
          msToAnswer: 0, // Placeholder, can be added if tracked
          interval: sm2Result.nextInterval, 
          intervalBeforeReview: card.scheduling.interval,
        },
      ],
      modified: new Date().toISOString(),
    };

    await db.updateCard(updatedCard.id, updatedCard);
    await fetchAllData(); // Re-fetch
    return updatedCard;
  };
  
  const getDueCardsForDeck = (deckId: string) => {
    const now = new Date().toISOString();
    return getCardsByDeckId(deckId).filter(card => new Date(card.scheduling.dueDate) <= new Date(now));
  };

  const getAllDueCards = () => {
    const now = new Date().toISOString();
    return cards.filter(card => new Date(card.scheduling.dueDate) <= new Date(now));
  };

  return (
    <DataContext.Provider value={{
      decks, cards, isLoading, getDeckById, getRegularDeckById, getCardsByDeckId, getCardById, 
      addRegularDeck, updateDeck, deleteDeck, addCardToDeck, updateCard, deleteCard,
      reviewCard, getDueCardsForDeck, getAllDueCards, refreshData: fetchAllData
    }}>
      {children}
    </DataContext.Provider>
  );
}; 