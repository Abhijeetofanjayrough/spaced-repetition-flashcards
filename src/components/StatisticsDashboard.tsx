import React from 'react';
import { useData } from '../contexts/DataContext';
import './StatisticsDashboard.css';

const StatisticsDashboard: React.FC = () => {
  const {
    cards,
    decks,
    isLoading,
    getUpcomingReviewLoad,
    getRetentionRate,
    getTotalStudyTime,
    calculateDeckMastery,
    calculateDeckCompletionRate,
    getAllDueCards,
  } = useData();

  if (isLoading) {
    return <p>Loading statistics...</p>;
  }

  const upcomingLoad = getUpcomingReviewLoad(7); // 7-day forecast
  const retentionRate = getRetentionRate(7); // 7-day retention
  const weeklyStudyTimeMs = getTotalStudyTime('weekly');
  const dailyStudyTimeMs = getTotalStudyTime('daily');
  const totalDueCards = getAllDueCards().length;

  const formatTimeMs = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  };

  return (
    <div className="statistics-dashboard-container">
      <h2>Your Study Statistics</h2>

      <div className="stats-grid">
        <div className="stat-card">
          <h4>Total Cards</h4>
          <p className="stat-value">{cards.length}</p>
        </div>
        <div className="stat-card">
          <h4>Total Decks</h4>
          <p className="stat-value">{decks.length}</p>
        </div>
        <div className="stat-card">
          <h4>Cards Due Today</h4>
          <p className="stat-value">{totalDueCards}</p>
        </div>
        <div className="stat-card">
          <h4>Retention Rate (Last 7d)</h4>
          <p className="stat-value">{retentionRate.toFixed(1)}%</p>
        </div>
        <div className="stat-card">
          <h4>Study Time (Today)</h4>
          <p className="stat-value">{formatTimeMs(dailyStudyTimeMs)}</p>
        </div>
        <div className="stat-card">
          <h4>Study Time (This Week)</h4>
          <p className="stat-value">{formatTimeMs(weeklyStudyTimeMs)}</p>
        </div>
      </div>

      <div className="stats-section">
        <h3>Upcoming Review Load (Next 7 Days)</h3>
        {upcomingLoad.length > 0 ? (
          <ul className="upcoming-load-list">
            {upcomingLoad.map((count, index) => (
              <li key={index}>
                Day {index + 1}: <strong>{count}</strong> cards
              </li>
            ))}
          </ul>
        ) : (
          <p>No upcoming reviews scheduled.</p>
        )}
      </div>

      {decks.filter(d => d.type === 'regular').length > 0 && (
        <div className="stats-section">
          <h3>Deck Specific Stats</h3>
          <table className="deck-stats-table">
            <thead>
              <tr>
                <th>Deck Name</th>
                <th>Cards</th>
                <th>Mastery</th>
                <th>Completion</th>
                <th>Due Now</th>
              </tr>
            </thead>
            <tbody>
              {decks.filter(d => d.type === 'regular').map(deck => {
                const deckCards = cards.filter(c => c.deckId === deck.id).length;
                const mastery = calculateDeckMastery(deck.id);
                const completion = calculateDeckCompletionRate(deck.id);
                const dueInDeck = cards.filter(c => c.deckId === deck.id && new Date(c.scheduling.dueDate) <= new Date()).length;
                return (
                  <tr key={deck.id}>
                    <td>{deck.name}</td>
                    <td>{deckCards}</td>
                    <td>{mastery.toFixed(1)}%</td>
                    <td>{completion.toFixed(1)}%</td>
                    <td>{dueInDeck}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default StatisticsDashboard; 