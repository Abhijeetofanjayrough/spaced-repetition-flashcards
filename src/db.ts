import Dexie, { Table } from 'dexie';
import { Card, CardReport } from './models/Card'; // Removed ReviewHistory
import { Deck, defaultDeck } from './models/Deck'; // Removed RegularDeck, FilteredDeck, DeckCommon, FilterCriterion
import { sampleDeck, sampleDecks } from './data/sampleDeck';
import { Achievement, initializeAchievements } from './models/Achievement';

// Define a type that encompasses all possible deck structures if Dexie needs a single type per table.
// However, Dexie can handle objects with varying shapes. For simplicity, we can use the base Deck type.
// If specific indexing on subtype fields is needed, a more complex setup might be required,
// or those fields would need to be on the base Deck type (possibly optional).

export class AppDB extends Dexie {
  cards!: Table<Card, string>; // string is the type of the primary key (id)
  decks!: Table<Deck, string>; // string is the type of the primary key (id)
  achievements!: Table<Achievement, string>; // string is the type of the primary key (id)

  constructor() {
    super('SpacedRepetitionFlashcardsDB'); // Database name
    this.version(1).stores({
      cards: 'id, deckId, scheduling.dueDate, *tags, archived, favorite, scheduling.learningStage', // Primary key 'id', and indexes
      decks: 'id, parentId, name, type', // Primary key 'id', and indexes
    });
    
    // Add achievements table in version 2
    this.version(2).stores({
      cards: 'id, deckId, scheduling.dueDate, *tags, archived, favorite, scheduling.learningStage', // Re-declare cards if it wasn't touched by a higher version, or if its definition needs to be stable across versions where other tables change.
      // It's generally good practice to redeclare all stores in each version block or ensure they are additive.
      // If version 1 only had cards and decks, and version 2 adds achievements,
      // and version 3 only modifies cards, it might look like this:
      // Version 1: cards, decks
      // Version 2: cards, decks, achievements (adds achievements)
      // Version 3: cards (modified), decks, achievements (carries over definitions)
      // For simplicity and safety here, let's assume cards and decks carry over, and achievements is added.
      // Dexie handles this by taking the union of all version.stores() up to the current version.
      // So, we just need to declare the new table or modified table.
      // However, if we are MODIFYING an existing table (cards), we need a new version for it.
      // The previous 'cards' definition from v1 will be upgraded.
      achievements: 'id, category, tier, isUnlocked' // Primary key 'id', with indexes
    });
    
    // Add prerequisite fields to cards table in version 3
    this.version(3).stores({
      cards: 'id, deckId, scheduling.dueDate, *tags, archived, favorite, scheduling.learningStage, *prerequisiteCardIds, *prerequisiteForIds',
      // decks and achievements carry over from previous versions
    });

    // Future versions and migrations would go here, e.g.:
    // this.version(4).stores({...}).upgrade(tx => {...});
  }

  // --- Card Operations ---
  async addCard(card: Card): Promise<string> {
    return this.cards.add(card);
  }

  async getCard(id: string): Promise<Card | undefined> {
    return this.cards.get(id);
  }

  async updateCard(id: string, changes: Partial<Card>): Promise<number> {
    return this.cards.update(id, changes);
  }
  
  async bulkUpdateCards(updates: {key: string, changes: Partial<Card>}[]): Promise<number> {
    const keysToUpdate = updates.map(u => u.key);
    const cardsToUpdate = await this.cards.bulkGet(keysToUpdate);
    const finalUpdates: Card[] = [];

    cardsToUpdate.forEach((card, index) => {
      if (card) { // card might be undefined if key not found
        const changeSet = updates[index].changes;
        finalUpdates.push({ ...card, ...changeSet });
      }
    });
    
    // Dexie's bulkPut can handle both add and update.
    // We use it here assuming we want to overwrite existing cards with the merged changes.
    if (finalUpdates.length > 0) {
      await this.cards.bulkPut(finalUpdates);
      return finalUpdates.length; // Return count of successfully prepared updates
    }
    return 0;
  }


  async deleteCard(id: string): Promise<void> {
    return this.cards.delete(id);
  }

  async getAllCards(): Promise<Card[]> {
    return this.cards.toArray();
  }

  async getCardsByDeck(deckId: string): Promise<Card[]> {
    return this.cards.where('deckId').equals(deckId).toArray();
  }

  // --- Deck Operations ---
  async addDeck(deck: Deck): Promise<string> {
    return this.decks.add(deck);
  }

  async getDeck(id: string): Promise<Deck | undefined> {
    return this.decks.get(id);
  }

  async updateDeck(id: string, changes: Partial<Deck>): Promise<number> {
    return this.decks.update(id, changes);
  }
  
  async bulkUpdateDecks(updates: Deck[]): Promise<number> {
    await this.decks.bulkPut(updates);
    return updates.length;
  }

  async deleteDeck(id: string): Promise<void> {
    // Also delete associated cards
    await this.cards.where('deckId').equals(id).delete();
    return this.decks.delete(id);
  }

  async getAllDecks(): Promise<Deck[]> {
    return this.decks.toArray();
  }

  // --- Achievement Operations ---
  async getAllAchievements(): Promise<Achievement[]> {
    return this.achievements.toArray();
  }
  
  async updateAchievement(id: string, changes: Partial<Achievement>): Promise<number> {
    return this.achievements.update(id, changes);
  }
  
  async bulkUpdateAchievements(achievements: Achievement[]): Promise<number> {
    await this.achievements.bulkPut(achievements);
    return achievements.length;
  }
  
  async getAchievementsByCategory(category: string): Promise<Achievement[]> {
    return this.achievements.where('category').equals(category).toArray();
  }
  
  async getUnlockedAchievements(): Promise<Achievement[]> {
    return this.achievements.where('isUnlocked').equals(1).toArray();
  }
}

export const db = new AppDB();

// Utility to handle initial data population / migration from localStorage if needed
export async function initializeAndMigrateData() {
  try {
    const dbExists = await Dexie.exists('SpacedRepetitionFlashcardsDB');
    const hasPopulatedFlag = localStorage.getItem('dbPopulated_v3'); // Updated version flag
    
    let dbVersion = 0;
    if (dbExists) {
      // Check current DB version
      const tempDb = new Dexie('SpacedRepetitionFlashcardsDB');
      await tempDb.open();
      dbVersion = tempDb.verno;
      await tempDb.close();
    }

    if (!dbExists || !hasPopulatedFlag || dbVersion < 3) {
      console.log('Database does not exist, not populated, or needs upgrade. Checking localStorage for migration...');
      
      const localCardsData = localStorage.getItem('flashcards');
      const localDecksData = localStorage.getItem('flashcardDecks');

      if (localCardsData && localDecksData) {
        console.log('Found data in localStorage. Migrating to IndexedDB...');
        const cardsToMigrate: Card[] = JSON.parse(localCardsData);
        const decksToMigrate: Deck[] = JSON.parse(localDecksData);

        if (cardsToMigrate.length > 0) {
          await db.cards.bulkPut(cardsToMigrate);
          console.log(`${cardsToMigrate.length} cards migrated.`);
        }
        if (decksToMigrate.length > 0) {
          await db.decks.bulkPut(decksToMigrate);
          console.log(`${decksToMigrate.length} decks migrated.`);
        }
        
        // Initialize achievements
        if (dbVersion < 2) {
          try {
            const initialAchievements = initializeAchievements();
            await db.open(); // Ensure the schema is upgraded
            await db.achievements.bulkPut(initialAchievements);
            console.log('Achievements initialized.');
          } catch (e) {
            console.error('Error initializing achievements:', e);
          }
        }
        
        localStorage.setItem('dbPopulated_v3', 'true');
        // Optionally, clear localStorage after successful migration if desired
        // localStorage.removeItem('flashcards');
        // localStorage.removeItem('flashcardDecks');
        // localStorage.removeItem('lastStudiedDeckId'); // etc.
        console.log('Migration complete. DB populated flag set.');
      } else {
        console.log('No data in localStorage to migrate. Using sample data or starting fresh.');
        // Here, you could add sample data if localStorage is empty AND db is new.
        // For now, we assume sampleDeck and sampleDecks from App.tsx will be used if db is empty.
        // Set the flag even if no migration occurred, to prevent re-checking localStorage.
        localStorage.setItem('dbPopulated_v3', 'true');
        
        // Initialize achievements if DB version < 2
        if (dbVersion < 2) {
          try {
            const initialAchievements = initializeAchievements();
            await db.open(); // Ensure the schema is upgraded
            await db.achievements.bulkPut(initialAchievements);
            console.log('Achievements initialized.');
          } catch (e) {
            console.error('Error initializing achievements:', e);
          }
        }
      }
    } else {
      console.log('Database already exists and is marked as populated.');
    }

    const currentDecks = await db.getAllDecks();
    const hasDefault = currentDecks.some(d => d.id === 'default');
    if (!hasDefault) {
      await db.decks.put(defaultDeck);
      await db.decks.bulkPut([...currentDecks, defaultDeck]);
    }
  } catch (error) {
    console.error("Error during database initialization or migration:", error);
    // Handle error, maybe by trying to delete and recreate the DB, or notifying user.
  }
} 