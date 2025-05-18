import React, { useEffect, useState } from 'react';
import { useData } from '../contexts/DataContext';
import '../styles/ForecastChart.css';

interface DayForecast {
  date: Date;
  count: number;
}

const ForecastChart: React.FC = () => {
  const { cards } = useData();
  const [forecast, setForecast] = useState<DayForecast[]>([]);
  const [maxCount, setMaxCount] = useState(0);
  
  useEffect(() => {
    // Generate forecast for next 7 days
    const next7Days: DayForecast[] = [];
    let highestCount = 0;
    
    for (let i = 0; i < 7; i++) {
      const forecastDate = new Date();
      forecastDate.setDate(forecastDate.getDate() + i);
      forecastDate.setHours(23, 59, 59, 999);
      
      // Count cards due on this day
      const dueCount = cards.filter(card => {
        const dueDate = new Date(card.scheduling.dueDate);
        return (
          dueDate.getDate() === forecastDate.getDate() &&
          dueDate.getMonth() === forecastDate.getMonth() &&
          dueDate.getFullYear() === forecastDate.getFullYear()
        );
      }).length;
      
      next7Days.push({
        date: forecastDate,
        count: dueCount
      });
      
      if (dueCount > highestCount) {
        highestCount = dueCount;
      }
    }
    
    setForecast(next7Days);
    setMaxCount(Math.max(10, highestCount)); // Minimum scale of 10 for visual purposes
  }, [cards]);
  
  const getDayName = (date: Date): string => {
    return date.toLocaleDateString('en-US', { weekday: 'short' });
  };
  
  const formatDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };
  
  const getBarHeight = (count: number): string => {
    return `${Math.max(5, (count / maxCount) * 100)}%`;
  };
  
  const getBarColor = (count: number): string => {
    // Color gradient based on number of cards
    if (count === 0) return 'var(--border-color)';
    if (count < 5) return 'var(--success-color)';
    if (count < 15) return 'var(--info-color)';
    if (count < 30) return 'var(--warning-color)';
    return 'var(--danger-color)';
  };
  
  const isToday = (date: Date): boolean => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  return (
    <div className="forecast-chart">
      <div className="chart-container">
        {forecast.map((day, index) => (
          <div 
            key={index} 
            className={`chart-bar-container ${isToday(day.date) ? 'today' : ''}`}
            title={`${day.count} cards due on ${formatDate(day.date)}`}
          >
            <div className="chart-bar-wrapper">
              <div 
                className="chart-bar" 
                style={{ 
                  height: getBarHeight(day.count),
                  backgroundColor: getBarColor(day.count)
                }}
              >
                {day.count > 0 && (
                  <span className="bar-value">{day.count}</span>
                )}
              </div>
            </div>
            <div className="chart-label">
              <div className="day-name">{getDayName(day.date)}</div>
              <div className="day-date">{day.date.getDate()}</div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="forecast-total">
        <span className="total-label">Total due: </span>
        <span className="total-value">
          {forecast.reduce((sum, day) => sum + day.count, 0)} cards
        </span>
      </div>
    </div>
  );
};

export default ForecastChart; 