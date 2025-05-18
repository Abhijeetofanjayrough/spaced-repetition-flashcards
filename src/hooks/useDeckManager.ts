import { useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Deck, RegularDeck, isRegularDeck } from '../models/Deck';
import { db } from '../db';

export function useDeckManager() {
  const [decks, setDecks] = useState<RegularDeck[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDecks = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const loadedDecks = await db.getAllDecks();
      setDecks(loadedDecks.filter(isRegularDeck));
    } catch (err) {
      console.error('Failed to load decks', err);
      setError('Failed to load decks. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createDeck = useCallback(async (name: string, description?: string, parentDeckId?: string): Promise<RegularDeck> => {
    const now = new Date().toISOString();
    const newDeckData: Omit<RegularDeck, 'id' | 'mastery' | 'completionRate'> & Partial<Pick<RegularDeck, 'mastery' | 'completionRate'>> = {
      name,
      description,
      parentId,
      type: 'regular',
      created: now,
      modified: now,
      cardIds: [],
      mastery: 0,
      completionRate: 0,
    };
    const newDeck: RegularDeck = {
      id: uuidv4(),
      ...newDeckData,
    };

    try {
      await db.addDeck(newDeck);
      setDecks(prev => [...prev, newDeck]);
      return newDeck;
    } catch (err) {
      console.error('Failed to create deck', err);
      setError('Failed to create deck. Please try again.');
      throw err;
    }
  }, []);

  const updateDeck = useCallback(async (deckToUpdate: RegularDeck): Promise<RegularDeck> => {
    const updatedDeckData: RegularDeck = {
      ...deckToUpdate,
      modified: new Date().toISOString()
    };

    try {
      const { id, ...changes } = updatedDeckData;
      await db.updateDeck(id, changes);
      setDecks(prev => prev.map(d => d.id === id ? updatedDeckData : d));
      return updatedDeckData;
    } catch (err) {
      console.error('Failed to update deck', err);
      setError('Failed to update deck. Please try again.');
      throw err;
    }
  }, []);

  const deleteDeckLocal = useCallback(async (id: string): Promise<void> => {
    try {
      await db.deleteDeck(id);
      setDecks(prev => prev.filter(d => d.id !== id));
    } catch (err) {
      console.error('Failed to delete deck', err);
      setError('Failed to delete deck. Please try again.');
      throw err;
    }
  }, []);

  return {
    decks,
    isLoading,
    error,
    loadDecks,
    createDeck,
    updateDeck,
    deleteDeck: deleteDeckLocal,
  };
}
