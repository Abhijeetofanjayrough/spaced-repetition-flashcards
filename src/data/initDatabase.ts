import { db } from '../db';
import { seedMockData } from './seedData';

// Key to track if database has been initialized
const DB_INITIALIZED_KEY = 'db_initialized';

/**
 * Initializes the database with sample data if it's the first time running the app
 * This is called when the app starts up
 */
export const initializeDatabase = async () => {
  try {
    // Check if we've initialized before
    const initialized = localStorage.getItem(DB_INITIALIZED_KEY);
    
    if (!initialized) {
      console.log('First app run detected, checking if database needs initialization...');
      
      // Check if we have any existing decks
      const existingDecks = await db.getAllDecks();
      
      if (existingDecks.length <= 1) { // Only default deck or empty
        // Seed the database with mock data
        const seeded = await seedMockData();
        
        if (seeded) {
          console.log('Database initialized with mock data for first-time run');
        }
      }
      
      // Mark as initialized regardless of whether we added data
      localStorage.setItem(DB_INITIALIZED_KEY, 'true');
    }
  } catch (error) {
    console.error('Error initializing database:', error);
  }
}; 