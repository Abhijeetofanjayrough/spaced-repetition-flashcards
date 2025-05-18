import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card } from '../models/Card';
import './MasteryChart.css';

interface MasteryChartProps {
  cards: Card[];
  timeRange?: '7d' | '30d' | '90d' | 'all';
}

interface MasteryDataPoint {
  date: string;
  mastery: number;
  reviewCount: number;
  label: string;
}

const calculateMasteryScore = (cards: Card[], date: Date): number => {
  const totalCards = cards.length;
  if (totalCards === 0) return 0;
  
  let masterySum = 0;
  
  cards.forEach(card => {
    // Find the card's state at or before this date
    const relevantHistory = card.reviewHistory.filter(
      r => new Date(r.date) <= date
    );
    
    if (relevantHistory.length === 0) {
      // Card wasn't studied yet
      masterySum += 0;
    } else {
      // Get the most recent review before the date
// eslint-disable-next-line @typescript-eslint/no-unused-vars
// eslint-disable-next-line @typescript-eslint/no-unused-vars
// eslint-disable-next-line @typescript-eslint/no-unused-vars
      const lastReview = relevantHistory[relevantHistory.length - 1];
      
      // Calculate a mastery score based on ease factor and learning stage
      const easeFactor = card.scheduling.easeFactor;
      let stageMultiplier = 0;
      
      switch (card.scheduling.learningStage) {
        case 'learning':
          stageMultiplier = 0.3;
          break;
        case 'review':
          stageMultiplier = 1.0;
          break;
        case 'relearning':
          stageMultiplier = 0.5;
          break;
      }
      
      // Normalize ease factor between 0-1
      // 1.3 is minimum, 2.5 is default, 3.5+ is very easy
      const normalizedEF = Math.min(Math.max((easeFactor - 1.3) / 2.2, 0), 1);
      
      masterySum += normalizedEF * stageMultiplier;
    }
  });
  
  return (masterySum / totalCards) * 100;
};

export const MasteryChart: React.FC<MasteryChartProps> = ({ cards, timeRange = '30d' }) => {
  const masteryData = useMemo(() => {
    // Determine date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let startDate = new Date(today);
    switch (timeRange) {
      case '7d':
        startDate.setDate(today.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(today.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(today.getDate() - 90);
        break;
      case 'all':
        // Find the earliest review date
        let earliestDate = today;
        cards.forEach(card => {
          if (card.reviewHistory.length > 0) {
            const firstReviewDate = new Date(card.reviewHistory[0].date);
            if (firstReviewDate < earliestDate) {
              earliestDate = firstReviewDate;
            }
          }
        });
        startDate = earliestDate;
        break;
    }
    
    // Create array of dates between start and today
    const dayCount = Math.ceil((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // Determine interval based on day count
    let interval = 1; // Default to daily for short periods
    if (dayCount > 60) {
      interval = 7; // Weekly for long periods
    } else if (dayCount > 14) {
      interval = 2; // Every other day for medium periods
    }
    
    const dataPoints: MasteryDataPoint[] = [];
    
    // Generate data points at specified intervals
    for (let i = 0; i <= dayCount; i += interval) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i);
      
      // Count reviews on this day
      const dateString = currentDate.toISOString().split('T')[0];
      let reviewsOnDay = 0;
      
      cards.forEach(card => {
        reviewsOnDay += card.reviewHistory.filter(
          r => r.date.startsWith(dateString)
        ).length;
      });
      
      // Format date label
      const label = currentDate.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric'
      });
      
      dataPoints.push({
        date: dateString,
        mastery: calculateMasteryScore(cards, currentDate),
        reviewCount: reviewsOnDay,
        label
      });
    }
    
    return dataPoints;
  }, [cards, timeRange]);
  
  if (cards.length === 0) {
    return (
      <div className="mastery-chart-container empty-state">
        <p>No cards available to show mastery progression.</p>
      </div>
    );
  }
  
  return (
    <div className="mastery-chart-container">
      <h3 className="chart-title">Mastery Progression</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart
          data={masteryData}
          margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis 
            dataKey="label" 
            tick={{ fontSize: 12 }} 
            interval="preserveEnd"
          />
          <YAxis 
            domain={[0, 100]} 
            tickFormatter={(value) => `${value}%`}
            tick={{ fontSize: 12 }}
          />
          <Tooltip 
            formatter={(value: number) => [`${value.toFixed(1)}%`, 'Mastery']}
            labelFormatter={(label) => `Date: ${label}`}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="mastery"
            name="Mastery Score"
            stroke="var(--primary-color)"
            activeDot={{ r: 8 }}
            strokeWidth={2}
          />
        </LineChart>
      </ResponsiveContainer>
      <div className="mastery-chart-controls">
        <button 
          className={`chart-range-btn ${timeRange === '7d' ? 'active' : ''}`}
          onClick={() => window.location.href = '?timeRange=7d'}
        >
          7 Days
        </button>
        <button 
          className={`chart-range-btn ${timeRange === '30d' ? 'active' : ''}`}
          onClick={() => window.location.href = '?timeRange=30d'}
        >
          30 Days
        </button>
        <button 
          className={`chart-range-btn ${timeRange === '90d' ? 'active' : ''}`}
          onClick={() => window.location.href = '?timeRange=90d'}
        >
          90 Days
        </button>
        <button 
          className={`chart-range-btn ${timeRange === 'all' ? 'active' : ''}`}
          onClick={() => window.location.href = '?timeRange=all'}
        >
          All Time
        </button>
      </div>
    </div>
  );
};

export default MasteryChart; 