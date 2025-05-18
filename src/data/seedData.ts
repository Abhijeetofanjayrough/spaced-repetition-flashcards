import { db } from '../db';
import { mockDecks, mockCards, mockUserActivity } from './mockData';

/**
 * Seeds the database with mock data if it doesn't already have content
 * @returns Promise that resolves when seeding is complete
 */
export const seedMockData = async () => {
  try {
    // Check if we already have data to avoid duplicate seeding
    const existingDecks = await db.getAllDecks();
    
    if (existingDecks.length <= 1) { // Only default deck or empty
      console.log('Seeding database with mock data...');
      
      // Add all decks first
      for (const deck of mockDecks) {
        await db.addDeck(deck);
      }
      
      // Then add all cards
      for (const card of mockCards) {
        await db.addCard(card);
      }
      
      // Add user activity data
      for (const activity of mockUserActivity) {
        await db.addActivityLog(activity);
      }
      
      console.log('Mock data seeding complete');
      return true;
    } else {
      console.log('Database already has content, skipping mock data seeding');
      return false;
    }
  } catch (error) {
    console.error('Error seeding mock data:', error);
    return false;
  }
}; 