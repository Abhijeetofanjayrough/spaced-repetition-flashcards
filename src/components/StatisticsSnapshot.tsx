import React, { useEffect, useState } from 'react';
import { useData } from '../contexts/DataContext';
import CircularProgressBar from './CircularProgressBar';
import '../styles/StatisticsSnapshot.css';

const StatisticsSnapshot: React.FC = () => {
  const { cards } = useData();
  const [retentionRate, setRetentionRate] = useState(0);
  const [studyTime, setStudyTime] = useState(0);
  const [completedReviews, setCompletedReviews] = useState(0);
  
  useEffect(() => {
    // Calculate retention rate (percentage of cards rated 3 or higher in past 7 days)
    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 7);
    
    let totalRatings = 0;
    let goodRatings = 0;
    
    cards.forEach(card => {
      const recentReviews = card.reviewHistory.filter(review => 
        new Date(review.date) >= sevenDaysAgo
      );
      
      recentReviews.forEach(review => {
        totalRatings++;
        if (review.rating >= 3) {
          goodRatings++;
        }
      });
    });
    
    setRetentionRate(totalRatings > 0 ? Math.round((goodRatings / totalRatings) * 100) : 0);
    
    // Calculate total study time in minutes (from review times in past 7 days)
    const totalTimeMs = cards.reduce((total, card) => {
      const recentReviews = card.reviewHistory.filter(review => 
        new Date(review.date) >= sevenDaysAgo
      );
      
      const cardTime = recentReviews.reduce((sum, review) => sum + (review.msToAnswer || 0), 0);
      return total + cardTime;
    }, 0);
    
    setStudyTime(Math.round(totalTimeMs / (1000 * 60))); // Convert ms to minutes
    
    // Calculate total completed reviews in past 7 days
    const totalReviews = cards.reduce((total, card) => {
      const recentReviews = card.reviewHistory.filter(review => 
        new Date(review.date) >= sevenDaysAgo
      );
      return total + recentReviews.length;
    }, 0);
    
    setCompletedReviews(totalReviews);
  }, [cards]);

  return (
    <div className="statistics-snapshot">
      <div className="stat-item retention-stat">
        <div className="stat-header">
          <h3>Retention Rate</h3>
          <span className="stat-period">7-day average</span>
        </div>
        <div className="stat-content">
          <CircularProgressBar 
            percentage={retentionRate} 
            size={80}
          />
          <div className="stat-details">
            <div className="stat-value">{retentionRate}%</div>
            <div className="stat-description">of cards remembered</div>
          </div>
        </div>
      </div>
      
      <div className="stat-item study-time-stat">
        <div className="stat-header">
          <h3>Study Time</h3>
          <span className="stat-period">Past 7 days</span>
        </div>
        <div className="stat-content">
          <div className="time-icon">⏱️</div>
          <div className="stat-details">
            <div className="stat-value">{studyTime} mins</div>
            <div className="stat-description">
              {studyTime < 60 ? 'Keep going!' : 
               studyTime < 120 ? 'Good progress!' : 
               'Excellent effort!'}
            </div>
          </div>
        </div>
      </div>
      
      <div className="stat-item reviews-stat">
        <div className="stat-header">
          <h3>Completed Reviews</h3>
          <span className="stat-period">Past 7 days</span>
        </div>
        <div className="stat-content">
          <div className="reviews-icon">✓</div>
          <div className="stat-details">
            <div className="stat-value">{completedReviews}</div>
            <div className="stat-description">cards reviewed</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatisticsSnapshot; 