import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { db } from '../db'; // Use the unified AppDB instance
import { Card as AppCard, ReviewHistory as AppReviewHistory } from '../models/Card'; // Official Card model
import { Deck as AppDeck, RegularDeck, FilteredDeck, isRegularDeck, isFilteredDeck, FilterCriterion, FilterCondition } from '../models/Deck'; // Official Deck model
import { calculateNextSchedule, SchedulingData, getInitialScheduling, adjustForOverdue, prioritizeCards } from '../spacedRepetition'; // New SM2 Import from detailed file
import { v4 as uuidv4 } from 'uuid';

const LAST_ACTIVE_DECK_ID_KEY = 'lastActiveDeckId';

// Interface for daily study activity
export interface UserActivity {
  date: string; // YYYY-MM-DD format, primary key
  cardsReviewedToday: number;
}

// Helper function to apply filters (to be implemented thoroughly)
const applyFiltersToCards = (allCards: AppCard[], filters: FilterCriterion[]): AppCard[] => {
  if (!filters || filters.length === 0) {
    return []; // Or allCards if filters are optional and empty means no filtering
  }

  return allCards.filter(card => {
    return filters.every(filter => {
      const { field, condition, value } = filter;
      // Access card.scheduling directly, its type is defined within AppCard

      switch (field) {
        case 'tags':
          const cardTags = card.tags || [];
          if (condition === 'includes') {
            const valuesToInclude = Array.isArray(value) ? value : [value];
            return valuesToInclude.some(v => cardTags.includes(v as string));
          }
          if (condition === 'not_includes') {
            const valuesToExclude = Array.isArray(value) ? value : [value];
            return !valuesToExclude.some(v => cardTags.includes(v as string));
          }
          break;
        case 'deckId': // Source Deck ID for filtering cards
          if (condition === 'equals') return card.deckId === value;
          if (condition === 'not_equals') return card.deckId !== value;
          break;
        case 'front':
        case 'back':
          const cardText = field === 'front' ? card.front : card.back;
          const textValue = (cardText || '').toLowerCase();
          const filterText = (value as string || '').toLowerCase();
          if (condition === 'includes') return textValue.includes(filterText);
          if (condition === 'startsWith') return textValue.startsWith(filterText);
          break;
        case 'dueDate':
        case 'createdDate':
        case 'modifiedDate':
          let dateFieldToCompare: string | undefined;
          if (field === 'dueDate') dateFieldToCompare = card.scheduling.dueDate;
          else if (field === 'createdDate') dateFieldToCompare = card.created;
          else dateFieldToCompare = card.modified; 

          if (!dateFieldToCompare) return false;
          const cardDate = new Date(dateFieldToCompare);
          const today = new Date();
          today.setHours(0,0,0,0);

          if (condition === 'is_due') return cardDate <= new Date(); // Due on or before today
          if (condition === 'before' && value) return cardDate < new Date(value as string);
          if (condition === 'after' && value) return cardDate > new Date(value as string);
          if (condition === 'last_n_days' && typeof value === 'number') {
            const targetDate = new Date(today);
            targetDate.setDate(today.getDate() - value);
            return cardDate >= targetDate && cardDate <= today; 
          }
          if (condition === 'next_n_days' && typeof value === 'number') {
            const targetDate = new Date(today);
            targetDate.setDate(today.getDate() + value);
            return cardDate > today && cardDate <= targetDate;
          }
          break;
        case 'learningStage':
          if (condition === 'is_learning') return card.scheduling.learningStage === 'learning';
          if (condition === 'is_reviewing') return card.scheduling.learningStage === 'review';
          if (condition === 'is_relearning') return card.scheduling.learningStage === 'relearning';
          // For 'equals' condition if we want to pass stage as value
          if (condition === 'equals' && value) return card.scheduling.learningStage === value;
          break;
        case 'easeFactor':
        case 'interval':
          const numericFieldValue = field === 'easeFactor' ? card.scheduling.easeFactor : card.scheduling.interval;
          if (typeof numericFieldValue !== 'number' || typeof value !== 'number') return false;
          if (condition === 'lt') return numericFieldValue < value;
          if (condition === 'lte') return numericFieldValue <= value;
          if (condition === 'gt') return numericFieldValue > value;
          if (condition === 'gte') return numericFieldValue >= value;
          break;
        case 'reviewCount':
          const reviewCount = card.reviewHistory?.length || 0;
          if (typeof value !== 'number') return false;
          if (condition === 'lt') return reviewCount < value;
          if (condition === 'lte') return reviewCount <= value;
          if (condition === 'gt') return reviewCount > value;
          if (condition === 'gte') return reviewCount >= value;
          break;
        case 'mediaAttachments':
          const hasMedia = card.mediaAttachments && card.mediaAttachments.length > 0;
          if (condition === 'has_images') return hasMedia;
          if (condition === 'no_images') return !hasMedia;
          break;
        case 'favorite':
          if (condition === 'is_favorite') return card.favorite === true;
          if (condition === 'is_not_favorite') return card.favorite !== true;
          break;
        case 'archived':
          // Assuming 'archived' is a boolean property on AppCard
          if (condition === 'is_archived') return card.archived === true; 
          if (condition === 'is_not_archived') return card.archived !== true;
          break;
        case 'cardType':
            if(condition === 'equals') return card.cardType === value;
            break;
        default:
          // If the field is not recognized, treat as not matching
          // console.warn(`Unknown filter field: ${field}`);
          return false;
      }
      return false; // Default for unhandled condition within a recognized field
    });
  });
};

interface DataContextType {
  decks: AppDeck[];
  cards: AppCard[];
  isLoading: boolean;
  getDeckById: (deckId: string) => AppDeck | undefined;
  getRegularDeckById: (deckId: string) => RegularDeck | undefined;
  getCardsByDeckId: (deckId: string) => AppCard[];
  getCardById: (cardId: string) => AppCard | undefined;
  addRegularDeck: (name: string, description?: string, parentId?: string) => Promise<RegularDeck>;
  addDeck: (name: string, type: 'regular' | 'filtered', description?: string, parentId?: string, filters?: FilterCriterion[]) => Promise<AppDeck>;
  updateDeck: (deck: AppDeck) => Promise<void>;
  deleteDeck: (deckId: string) => Promise<void>;
  addCardToDeck: (deckId: string, front: string, back: string, cardType?: 'basic' | 'cloze', mediaAttachments?: string[]) => Promise<AppCard>;
  updateCard: (card: AppCard) => Promise<void>;
  deleteCard: (cardId: string) => Promise<void>;
  reviewCard: (cardId: string, quality: 1 | 2 | 3 | 4 | 5, hintUsed?: boolean, msToAnswer?: number) => Promise<AppCard | undefined>;
  getDueCardsForDeck: (deckId: string) => AppCard[];
  getAllDueCards: () => AppCard[];
  getUpcomingReviewLoad: (days: number) => number[];
  getRetentionRate: (days: number) => number;
  getTotalStudyTime: (period: 'daily' | 'weekly') => number;
  calculateDeckMastery: (deckId: string) => number;
  calculateDeckCompletionRate: (deckId: string) => number;
  getStudySessionQueue: (deckId: string | null, sessionSize?: number) => AppCard[];
  refreshData: () => Promise<void>;
  getLastActiveDeckId: () => string | null;
  getStudyStreak: () => Promise<number>;
  getOverallStats: () => Promise<{ totalCardsReviewed: number; totalStudyDays: number }>;
  getStudyStats: () => { cardsToStudy: number; cardsLearned: number; currentStreak: number; retentionRate: number; studyTimeMinutes: number };
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
      // Try to seed mock data (if db is empty)
      try {
        const { seedMockData } = await import('../data/seedData');
        await seedMockData();
      } catch (seedError) {
        console.warn("Could not seed mock data:", seedError);
      }
      
      const [allDecks, allCards] = await Promise.all([
        db.getAllDecks(),
        db.getAllCards(),
      ]);
      if (allDecks.length === 0 && !allDecks.find(d => d.id === 'default')) {
        const defaultDeckData: RegularDeck = {
            id: 'default',
            type: 'regular',
            name: 'Default Deck',
            created: new Date().toISOString(),
            modified: new Date().toISOString(),
            description: 'Default deck for your cards',
            cardIds: [],
            mastery: 0,
            completionRate: 0,
            // lastStudied will be undefined initially
        };
        await db.addDeck(defaultDeckData);
        allDecks.push(defaultDeckData);
      }
      setDecks(allDecks);
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

  const getDeckById = (deckId: string): AppDeck | undefined => decks.find(d => d.id === deckId);
  const getRegularDeckById = (deckId: string): RegularDeck | undefined => decks.find(d => d.id === deckId && isRegularDeck(d)) as RegularDeck | undefined;
  
  const getCardsByDeckId = (deckId: string): AppCard[] => {
    const deck = getDeckById(deckId);
    if (!deck) return [];
    if (isRegularDeck(deck)) {
      return cards.filter(c => c.deckId === deckId);
    } else if (isFilteredDeck(deck)) {
      return applyFiltersToCards(cards, deck.filters);
    }
    return [];
  };

  const getCardById = (cardId: string): AppCard | undefined => cards.find(c => c.id === cardId);

  const addDeck = async (name: string, type: 'regular' | 'filtered', description?: string, parentId?: string, filtersToApply?: FilterCriterion[]): Promise<AppDeck> => {
    const now = new Date().toISOString();
    const commonData = {
      name,
      description,
      parentId,
      created: now,
      modified: now,
      mastery: 0,
      completionRate: 0,
      // lastStudied will be undefined initially
    };
    let newDeckToAdd: AppDeck;
    if (type === 'regular') {
      newDeckToAdd = { id: uuidv4(), ...commonData, type: 'regular', cardIds: [] } as RegularDeck;
    } else {
      newDeckToAdd = { id: uuidv4(), ...commonData, type: 'filtered', filters: filtersToApply || [] } as FilteredDeck;
    }
    await db.addDeck(newDeckToAdd);
    await fetchAllData(); 
    return newDeckToAdd;
  };
  
  const addRegularDeck = async (name: string, description?: string, parentId?:string) => {
    return addDeck(name, 'regular', description, parentId) as Promise<RegularDeck>; 
  };

  const updateDeck = async (updatedDeckData: AppDeck) => {
    const deckWithTimestamp = { ...updatedDeckData, modified: new Date().toISOString() };
    await db.updateDeck(deckWithTimestamp.id, deckWithTimestamp);
    await fetchAllData();
  };
  
  const deleteDeck = async (deckId: string) => {
    await db.deleteDeck(deckId); 
    await fetchAllData();
  };

  const addCardToDeck = async (deckId: string, front: string, back: string, cardType: 'basic' | 'cloze' = 'basic', mediaAttachments?: string[]) => {
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
      scheduling: getInitialScheduling(),
      tags: [],
      mediaAttachments: mediaAttachments || [],
    };
    await db.addCard(newCard);
    if (isRegularDeck(deck)) {
        const updatedDeckData: Partial<RegularDeck> = { cardIds: [...(deck.cardIds || []), newCard.id] };
        await db.updateDeck(deck.id, updatedDeckData); 
    }
    await fetchAllData(); 
    return newCard;
  };

  const updateCard = async (updatedCard: AppCard) => {
    await db.updateCard(updatedCard.id, updatedCard);
    await fetchAllData(); 
  };

  const deleteCard = async (cardId: string) => {
    const cardToDelete = getCardById(cardId);
    if (cardToDelete) {
        await db.deleteCard(cardId);
        const deck = getRegularDeckById(cardToDelete.deckId);
        if (deck && deck.cardIds) {
            const updatedDeckData: Partial<RegularDeck> = { cardIds: deck.cardIds.filter(id => id !== cardId) };
            await db.updateDeck(deck.id, updatedDeckData);
        }
    }
    await fetchAllData(); 
  };

  const requestBackgroundSync = () => {
    if ('serviceWorker' in navigator && 'SyncManager' in window) {
      navigator.serviceWorker.ready
        .then(registration => {
          // @ts-ignore
          return registration.sync.register('sync-review-data');
        })
        .catch(err => {
          console.error('Background sync registration failed:', err);
        });
    }
  };

  const syncPendingChanges = async () => {
    try {
      const pendingReviews = JSON.parse(localStorage.getItem('pendingReviews') || '[]');
      if (pendingReviews.length === 0) return;
      console.log(`Syncing ${pendingReviews.length} pending reviews`);
      for (const pendingReview of pendingReviews) {
        const { cardId, quality, msToAnswer, hintUsed } = pendingReview;
        // The reviewCard function will handle DB updates and deck lastStudied update
        await reviewCard(cardId, quality, hintUsed, msToAnswer);
      }
      localStorage.removeItem('pendingReviews');
      // fetchAllData is called within reviewCard, so might not be needed here again unless reviewCard was bypassed
      console.log('Sync completed successfully');
    } catch (error) {
      console.error('Error syncing pending changes:', error);
    }
  };

  useEffect(() => {
    const handleOnline = () => {
      console.log('App is online. Syncing pending changes...');
      syncPendingChanges();
    };
    const handleOffline = () => {
      console.log('App is offline. Changes will be saved locally.');
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [syncPendingChanges]);

  const logStudyActivity = async (cardsIncrement: number = 1) => {
    const today = new Date();
    const todayDateString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    try {
      let activityToday: UserActivity | undefined = await db.getActivityLogByDate(todayDateString); // Assumes db method exists
      if (activityToday) {
        activityToday.cardsReviewedToday += cardsIncrement;
        await db.updateActivityLog(todayDateString, activityToday); // Assumes db method exists
      } else {
        await db.addActivityLog({ date: todayDateString, cardsReviewedToday: cardsIncrement }); // Assumes db method exists
      }
    } catch (error) {
      console.error("Failed to log study activity:", error);
    }
  };

  const reviewCard = async (cardId: string, quality: 1 | 2 | 3 | 4 | 5, hintUsed?: boolean, msToAnswer: number = 0): Promise<AppCard | undefined> => {
    const card = getCardById(cardId);
    if (!card) return undefined;

    const now = new Date();
    const nowDateString = now.toISOString();
    let deckToUpdate: AppDeck | undefined = getDeckById(card.deckId);
    
    let currentScheduling = { ...card.scheduling }; // Clone to avoid direct mutation before calculation
    const dueDate = new Date(currentScheduling.dueDate);
    const todayDt = new Date(); 
    todayDt.setHours(0, 0, 0, 0);
    dueDate.setHours(0,0,0,0);
    
    let daysOverdue = 0;
    if (dueDate < todayDt) {
      daysOverdue = Math.floor((todayDt.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
    }

    if (daysOverdue > 0) {
      currentScheduling = adjustForOverdue(currentScheduling, daysOverdue);
    }
    
    let successfullyReviewed = false;
    let optimisticallyUpdatedCardState: AppCard | undefined = undefined;

    if (!navigator.onLine) {
      console.log('Offline mode: Storing review for later sync');
      const pendingReviews = JSON.parse(localStorage.getItem('pendingReviews') || '[]');
      pendingReviews.push({ cardId, quality, msToAnswer, hintUsed, timestamp: Date.parse(nowDateString) });
      localStorage.setItem('pendingReviews', JSON.stringify(pendingReviews));
      
      const updatedScheduling = calculateNextSchedule(currentScheduling, quality, hintUsed);
      const updatedReviewHistory: AppReviewHistory = { date: nowDateString, rating: quality, msToAnswer, interval: updatedScheduling.interval, };
      optimisticallyUpdatedCardState = {
        ...card,
        scheduling: updatedScheduling,
        reviewHistory: [...card.reviewHistory, updatedReviewHistory],
        modified: nowDateString,
      };
      // Apply optimistic update to local state immediately
      setCards(prevCards => prevCards.map(c => c.id === cardId ? optimisticallyUpdatedCardState! : c));
      if (deckToUpdate) {
        const updatedDeckWithLastStudied = { ...deckToUpdate, lastStudied: nowDateString, modified: nowDateString };
        setDecks(prevDecks => prevDecks.map(d => d.id === card.deckId ? updatedDeckWithLastStudied : d));
      }
      if (quality >=3) successfullyReviewed = true;
    } else {
      const updatedSchedulingOnline = calculateNextSchedule(currentScheduling, quality, hintUsed);
      const updatedReviewHistoryOnline: AppReviewHistory = { date: nowDateString, rating: quality, msToAnswer, interval: updatedSchedulingOnline.interval };
      const updatedCardData: AppCard = { ...card, scheduling: updatedSchedulingOnline, reviewHistory: [...card.reviewHistory, updatedReviewHistoryOnline], modified: nowDateString };
      await db.updateCard(cardId, updatedCardData);
      if (quality >= 3) successfullyReviewed = true;

      if (deckToUpdate) {
        const deckChanges: Partial<AppDeck> = { lastStudied: nowDateString, modified: nowDateString };
        await db.updateDeck(card.deckId, deckChanges);
      }
      // fetchAllData will update cards and decks state from DB
      // No need to call requestBackgroundSync if already online and successful? Or call it regardless?
      // Let's keep it for now, might be for other types of sync later.
      await fetchAllData(); 
      requestBackgroundSync(); 
    }
    
    if (successfullyReviewed) {
        await logStudyActivity(1);
    }
        
    if (!navigator.onLine) {
        return optimisticallyUpdatedCardState; 
    }
    return getCardById(cardId); // Return the card from the latest fetched data post-online update
  };

  const getDueCardsForDeck = (deckId: string) => {
    const targetDeckCards = getCardsByDeckId(deckId);
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    return targetDeckCards.filter(card => new Date(card.scheduling.dueDate) <= today);
  };

  const getAllDueCards = () => {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    return cards.filter(card => new Date(card.scheduling.dueDate) <= today);
  };

  const getUpcomingReviewLoad = (days: number = 7): number[] => {
    const loadByDay = new Array(days).fill(0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    cards.forEach(card => {
      const dueDate = new Date(card.scheduling.dueDate);
      dueDate.setHours(0,0,0,0);
      const diffTime = dueDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays >= 0 && diffDays < days) {
        loadByDay[diffDays]++;
      }
    });
    return loadByDay;
  };

  const getRetentionRate = (days: number = 7): number => {
    let successfulReviews = 0;
    let totalReviews = 0;
    const cutOffDate = new Date();
    cutOffDate.setDate(cutOffDate.getDate() - days);
    cards.forEach(card => {
      card.reviewHistory?.forEach(review => {
        if (new Date(review.date) >= cutOffDate) {
          totalReviews++;
          if (review.rating >= 3) { 
            successfulReviews++;
          }
        }
      });
    });
    return totalReviews > 0 ? (successfulReviews / totalReviews) : 0;
  };

  const getTotalStudyTime = (period: 'daily' | 'weekly' = 'weekly'): number => {
    let totalMs = 0;
    const now = new Date();
    const cutOffDate = new Date();
    if (period === 'daily') {
      cutOffDate.setHours(0, 0, 0, 0);
    } else { 
      cutOffDate.setDate(now.getDate() - now.getDay()); 
      cutOffDate.setHours(0, 0, 0, 0);
    }
    cards.forEach(card => {
      card.reviewHistory?.forEach(review => {
        if (new Date(review.date) >= cutOffDate && review.msToAnswer) {
          totalMs += review.msToAnswer;
        }
      });
    });
    return totalMs;
  };

  const calculateDeckMastery = (deckId: string): number => {
    const deckCards = getCardsByDeckId(deckId);
    if (deckCards.length === 0) return 0;
    const totalEase = deckCards.reduce((sum, card) => sum + (card.scheduling.easeFactor || 0), 0);
    const averageEase = totalEase / deckCards.length;
    const minEase = 1.3;
    const maxEase = 3.0; 
    const normalizedMastery = Math.max(0, Math.min(1, (averageEase - minEase) / (maxEase - minEase)));
    return normalizedMastery;
  };

  const calculateDeckCompletionRate = (deckId: string): number => {
    const deckCards = getCardsByDeckId(deckId);
    if (deckCards.length === 0) return 0;
    const reviewedCards = deckCards.filter(card => 
      card.scheduling.learningStage === 'review' || 
      (card.scheduling.learningStage === 'relearning' && card.scheduling.interval > 1)
    ).length;
    return reviewedCards / deckCards.length;
  };

  const setLastActiveDeckIdInternal = (deckId: string | null) => {
    try {
      if (deckId) {
        localStorage.setItem(LAST_ACTIVE_DECK_ID_KEY, deckId);
      } else {
        // If called with null (e.g. random mix session), we might not want to clear it,
        // or we might want to clear it. For "Continue", user expects the last *specific* deck.
        // Let's assume for now that starting a random mix doesn't change the "last specific deck".
        // If a specific deck session is started, it overrides.
        // If deckId is explicitly null for other reasons like "clear last deck", then removeItem.
        // For now, only set if deckId is a string.
      }
    } catch (error) {
      console.error("Error saving last active deck ID to localStorage:", error);
    }
  };

  const getLastActiveDeckId = (): string | null => {
    try {
      return localStorage.getItem(LAST_ACTIVE_DECK_ID_KEY);
    } catch (error) {
      console.error("Error reading last active deck ID from localStorage:", error);
      return null;
    }
  };

  const getStudySessionQueue = (deckId: string | null, sessionSize: number = 30): AppCard[] => {
    let relevantCards: AppCard[];

    if (deckId) {
      relevantCards = getCardsByDeckId(deckId);
      setLastActiveDeckIdInternal(deckId); // Set this deck as the last active one
    } else {
      relevantCards = cards; // For "Random Mix"
      // We are not changing lastActiveDeckId for random mix here
    }

    const activeCards = relevantCards.filter(card => !card.archived);
    const cardIdsForSession = prioritizeCards(activeCards, sessionSize);
    const sessionQueue = cardIdsForSession.map(id => activeCards.find(card => card.id === id)).filter(card => card !== undefined) as AppCard[];
    
    return sessionQueue;
  };

  const refreshData = async () => {
    await fetchAllData();
  };

  const getStudyStreak = async (): Promise<number> => {
    try {
      const logs: UserActivity[] = await db.getAllActivityLogs(); // Assumes db method exists
      if (!logs || logs.length === 0) return 0;

      logs.sort((a: UserActivity, b: UserActivity) => new Date(b.date).getTime() - new Date(a.date).getTime());

      let streak = 0;
      const today = new Date();
      today.setHours(0,0,0,0);

      let currentDateInStreak = new Date(today); // Clone today for modification
      let foundActivityForCurrentStreakDate = false;

      // First, check if there's activity for today
      const todayString = `${currentDateInStreak.getFullYear()}-${String(currentDateInStreak.getMonth() + 1).padStart(2, '0')}-${String(currentDateInStreak.getDate()).padStart(2, '0')}`;
      if (logs.find(log => log.date === todayString)) {
        streak++;
        foundActivityForCurrentStreakDate = true;
        currentDateInStreak.setDate(currentDateInStreak.getDate() - 1); // Move to check yesterday
      } else {
        // No activity today, so streak must be based on yesterday backwards
        currentDateInStreak.setDate(currentDateInStreak.getDate() - 1); // Start checking from yesterday
      }
      
      // Iterate through logs to find consecutive days backwards from `currentDateInStreak`
      for (const log of logs) {
        // Skip logs that are for dates after our `currentDateInStreak` (e.g. if we started from yesterday)
        if (new Date(log.date + 'T00:00:00') > currentDateInStreak) continue;

        const logDateString = `${currentDateInStreak.getFullYear()}-${String(currentDateInStreak.getMonth() + 1).padStart(2, '0')}-${String(currentDateInStreak.getDate()).padStart(2, '0')}`;
        if (log.date === logDateString) {
          // If we are checking for today (and didn't find it above) this condition handles it if today was not the first log element
          // Or, if we are checking for yesterday onwards
          if (!foundActivityForCurrentStreakDate && currentDateInStreak.getTime() === today.getTime()){ 
             // This case should have been handled by the initial today check, but as a safeguard:
             streak++; // counted today
             foundActivityForCurrentStreakDate = true;
          } else if (currentDateInStreak.getTime() < today.getTime()) {
             streak++; // counted a past day in streak
          }
          currentDateInStreak.setDate(currentDateInStreak.getDate() - 1); // Move to check for the day before
        } else {
          // If log.date is older than currentDateInStreak, it means a gap
          // (assuming logs are sorted, which they are)
          if (new Date(log.date + 'T00:00:00') < currentDateInStreak) {
            break;
          }
        }
      }
      return streak;
    } catch (error) {
      console.error("Failed to get study streak:", error);
      return 0;
    }
  };

  const getOverallStats = async (): Promise<{ totalCardsReviewed: number; totalStudyDays: number }> => {
    try {
      const logs: UserActivity[] = await db.getAllActivityLogs(); // Assumes db method exists
      if (!logs) return { totalCardsReviewed: 0, totalStudyDays: 0 };

      const totalCardsReviewed = logs.reduce((sum: number, log: UserActivity) => sum + log.cardsReviewedToday, 0);
      const totalStudyDays = logs.length;
      return { totalCardsReviewed, totalStudyDays };
    } catch (error) {
      console.error("Failed to get overall stats:", error);
      return { totalCardsReviewed: 0, totalStudyDays: 0 };
    }
  };
  
  return (
    <DataContext.Provider value={{
      decks, cards, isLoading, getDeckById, getCardsByDeckId, getCardById, addRegularDeck, addDeck, updateDeck, deleteDeck, 
      addCardToDeck, updateCard, deleteCard, reviewCard, getDueCardsForDeck, getAllDueCards,
      getUpcomingReviewLoad, getRetentionRate, getTotalStudyTime, calculateDeckMastery, getRegularDeckById,
      calculateDeckCompletionRate, getStudySessionQueue, refreshData,
      getLastActiveDeckId,
      getStudyStreak,
      getOverallStats,
      getStudyStats: () => {
        // Due cards today (cards to study)
        const cardsToStudy = cards.filter(card => {
          if (!card.scheduling?.dueDate) return false;
          const dueDate = new Date(card.scheduling.dueDate);
          const today = new Date();
          return dueDate <= today;
        }).length;
        
        // Cards in review or relearning stage with interval > 1
        const cardsLearned = cards.filter(card => 
          (card.scheduling?.learningStage === 'review' || 
           (card.scheduling?.learningStage === 'relearning' && card.scheduling?.interval > 1))
        ).length;
        
        // For streak, we'll use a cached value since it's an async function
        // In a real app, you'd want to handle this better with proper async state
        const streak = 0; // Default value
        
        // Calculate retention rate using the existing function
        const retentionRate = getRetentionRate(7);
        
        // Get study time in minutes
        const studyTimeMinutes = Math.round(getTotalStudyTime('weekly') / 60000);
        
        return {
          cardsToStudy,
          cardsLearned,
          currentStreak: streak,
          retentionRate,
          studyTimeMinutes
        };
      }
    }}>
      {children}
    </DataContext.Provider>
  );
}; 