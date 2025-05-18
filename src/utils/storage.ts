import Dexie, { Table } from 'dexie';

export interface StorageCard {
  id: string;
  [key: string]: any;
}
export interface StorageDeck {
  id: string;
  [key: string]: any;
}

export interface StorageFilteredDeck {
  id: string;
  [key: string]: any;
}

class FlashcardDB extends Dexie {
  cards!: Table<StorageCard, string>;
  decks!: Table<StorageDeck, string>;
  filteredDecks!: Table<StorageFilteredDeck, string>;

  constructor() {
    super('FlashcardDB');
    this.version(1).stores({
      cards: 'id',
      decks: 'id',
    });
    this.version(2).stores({
      cards: 'id',
      decks: 'id',
      filteredDecks: 'id'
    });
  }
}

const db = new FlashcardDB();

export async function saveToStorage(cards: StorageCard[], decks: StorageDeck[], filteredDecks: StorageFilteredDeck[]) {
  try {
    await db.transaction('rw', db.cards, db.decks, db.filteredDecks, async () => {
      await db.cards.clear();
      await db.decks.clear();
      await db.filteredDecks.clear();
      if (cards.length) await db.cards.bulkAdd(cards);
      if (decks.length) await db.decks.bulkAdd(decks);
      if (filteredDecks.length) await db.filteredDecks.bulkAdd(filteredDecks);
    });
  } catch (e) {
    console.error("Failed to save to IndexedDB:", e);
    // Fallback to localStorage
  localStorage.setItem('cards', JSON.stringify(cards));
  localStorage.setItem('decks', JSON.stringify(decks));
    localStorage.setItem('filteredDecks', JSON.stringify(filteredDecks));
  }
}

export async function loadFromStorage(): Promise<{ cards: StorageCard[]; decks: StorageDeck[]; filteredDecks: StorageFilteredDeck[] }> {
  try {
    const cards = await db.cards.toArray();
    const decks = await db.decks.toArray();
    const filteredDecks = await db.filteredDecks.toArray();

    if (cards.length || decks.length || filteredDecks.length) {
        return { cards, decks, filteredDecks };
    }

    // Fallback to localStorage if IndexedDB is empty
    const lsCards = JSON.parse(localStorage.getItem('cards') || '[]');
    const lsDecks = JSON.parse(localStorage.getItem('decks') || '[]');
    const lsFilteredDecks = JSON.parse(localStorage.getItem('filteredDecks') || '[]');
    return { cards: lsCards, decks: lsDecks, filteredDecks: lsFilteredDecks };

  } catch (e) {
    console.error("Failed to load from IndexedDB:", e);
  const cards = JSON.parse(localStorage.getItem('cards') || '[]');
  const decks = JSON.parse(localStorage.getItem('decks') || '[]');
    const filteredDecks = JSON.parse(localStorage.getItem('filteredDecks') || '[]');
    return { cards, decks, filteredDecks };
  }
}