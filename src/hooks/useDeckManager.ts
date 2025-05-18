import { useState, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Deck, RegularDeck, FilteredDeck, isRegularDeck, FilterCriterion, DeckCommon } from '../models/Deck';
import { db } from '../db';

export function useDeckManager() {
  const [decks, setDecks] = useState<Deck[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDecks = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const loadedDecks = await db.getAllDecks();
      setDecks(loadedDecks);
    } catch (err) {
      console.error('Failed to load decks', err);
      setError('Failed to load decks. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createDeck = useCallback(
    async (
      name: string,
      type: 'regular' | 'filtered',
      description?: string,
      parentId?: string,
      filters?: FilterCriterion[]
    ): Promise<Deck> => {
      const now = new Date().toISOString();
      const commonData: Omit<DeckCommon, 'id' | 'type'> = {
        name,
        description,
        parentId,
        created: now,
        modified: now,
        mastery: 0,
        completionRate: 0,
      };

      let newDeck: Deck;

      if (type === 'regular') {
        newDeck = {
          id: uuidv4(),
          ...commonData,
          type: 'regular',
          cardIds: [],
        } as RegularDeck;
      } else { // type === 'filtered'
        newDeck = {
          id: uuidv4(),
          ...commonData,
          type: 'filtered',
          filters: filters || [],
        } as FilteredDeck;
      }

      try {
        await db.addDeck(newDeck);
        setDecks(prev => [...prev, newDeck]);
        return newDeck;
      } catch (err) {
        console.error('Failed to create deck', err);
        setError('Failed to create deck. Please try again.');
        throw err;
      }
    },
    []
  );

  const updateDeck = useCallback(async (deckToUpdate: Deck): Promise<Deck> => {
    const updatedDeckData: Deck = {
      ...deckToUpdate,
      modified: new Date().toISOString(),
    };

    try {
      const { id, ...changes } = updatedDeckData;
      await db.updateDeck(id, changes);
      setDecks(prev => prev.map(d => (d.id === id ? updatedDeckData : d)));
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
