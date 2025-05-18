import React, { useEffect, useState } from 'react';
// import { useStorage } from '../contexts/StorageContext'; // db will be imported directly
import { db } from '../db'; // Use AppDB instance directly
import { Card } from '../models/Card';
import { Deck } from '../models/Deck';
import AnalyticsDashboard from './AnalyticsDashboard'; // Fix the import to use default export
import '../styles/Analytics.css'; // Keep general styling if needed

const Analytics: React.FC = () => {
  // const { db } = useStorage(); // Removed useStorage for db
  const [cards, setCards] = useState<Card[]>([]);
  const [decks, setDecks] = useState<Deck[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadAnalyticsData = async () => {
      setIsLoading(true);
      try {
        const allCards = await db.getAllCards(); 
        const allDecks = await db.getAllDecks();
        setCards(allCards);
        setDecks(allDecks);
        setError(null);
      } catch (err) {
        console.error('Error loading analytics data:', err);
        setError('Failed to load analytics data. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    loadAnalyticsData();
  }, []); // Removed db from dependency array as it's a stable import

  if (isLoading) {
    return <div className="analytics-container loading-analytics">Loading analytics data...</div>;
  }

  if (error) {
    return <div className="analytics-container error-analytics">{error}</div>;
  }
  
  if (cards.length === 0 && decks.length === 0 && !isLoading) {
    return (
      <div className="analytics-container empty-analytics">
        <h1>Learning Analytics</h1>
        <p>No data available yet. Start studying to see your progress!</p>
      </div>
    );
  }

  // The old stat calculation logic is removed as AnalyticsDashboard will handle its own presentation.
  // We just need to provide it with the raw data (cards and decks).

  return (
    <div className="analytics-container">
      {/* <h1>Learning Analytics</h1> // Title might be part of AnalyticsDashboard now */}
      <AnalyticsDashboard cards={cards} decks={decks} />
    </div>
  );
};

export default Analytics;
