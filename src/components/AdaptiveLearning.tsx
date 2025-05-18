import React, { useEffect, useState } from 'react';
import { Card } from '../models/Card';
import { Deck } from '../models/Deck';
import './AdaptiveLearning.css';

type AdaptiveLearningProps = {
  cards: Card[];
  decks: Deck[];
  onUpdateSettings?: (settings: AdaptiveSettings) => void;
};

export type AdaptiveSettings = {
  adjustDifficulty: boolean;
  focusOnWeakAreas: boolean;
  customizeIntervals: boolean;
  intervalMultiplier: number;
  prioritizeWeakCards: boolean;
  idealStudyTime: string | null;
  recommendedSessionLength: number;
  initialEaseFactor: number;
  interleaving: boolean;
  interleavingDifficulty: 'low' | 'medium' | 'high'; // Control interleaving intensity
  interleavingTopicCount: number; // Number of topics to interleave
};

// Helper function to reorder cards for optimal interleaving
export const reorderCardsForInterleaving = (
  cards: Card[], 
  settings: AdaptiveSettings,
  weakTagsData?: Array<{ tag: string; performance: number; count: number }>
): Card[] => {
  if (!settings.interleaving || cards.length < 4) {
    return [...cards]; // Return a copy of the original array
  }
  
  // Group cards by tags
  const tagGroups: { [tag: string]: Card[] } = {};
  const cardsWithoutTags: Card[] = [];
  
  cards.forEach(card => {
    if (!card.tags || card.tags.length === 0) {
      cardsWithoutTags.push(card);
      return;
    }
    
    // Use primary tag (first tag) for grouping
    const primaryTag = card.tags[0];
    if (!tagGroups[primaryTag]) {
      tagGroups[primaryTag] = [];
    }
    tagGroups[primaryTag].push(card);
  });
  
  // Calculate how many topics we want based on settings
  const tagKeys = Object.keys(tagGroups);
  const topicsToUse = Math.min(
    tagKeys.length,
    settings.interleavingTopicCount > 0 ? settings.interleavingTopicCount : 3
  );
  
  // Select the most relevant topics
  let selectedTags = tagKeys;
  if (topicsToUse < tagKeys.length) {
    // If we have weak tags data, prioritize those
    if (weakTagsData && weakTagsData.length > 0) {
      const weakTagNames = weakTagsData.map(t => t.tag);
      const prioritizedTags = tagKeys.sort((a, b) => {
        const aIsWeak = weakTagNames.includes(a);
        const bIsWeak = weakTagNames.includes(b);
        if (aIsWeak && !bIsWeak) return -1;
        if (!aIsWeak && bIsWeak) return 1;
        return 0;
      });
      selectedTags = prioritizedTags.slice(0, topicsToUse);
    } else {
      // Otherwise, prioritize topics with more cards
      selectedTags = tagKeys
        .sort((a, b) => tagGroups[b].length - tagGroups[a].length)
        .slice(0, topicsToUse);
    }
  }
  
  // Determine interleaving pattern based on difficulty level
  let interleavePattern: number[] = [1]; // Default: just alternate 1 card at a time
  switch (settings.interleavingDifficulty) {
    case 'low':
      interleavePattern = [3, 2]; // 3 cards from topic A, then 2 from topic B, etc.
      break;
    case 'medium':
      interleavePattern = [2, 1]; // 2 cards from topic A, then 1 from topic B, etc.
      break;
    case 'high':
      interleavePattern = [1]; // 1 card from each topic in rotation (maximum challenge)
      break;
  }
  
  // Create the interleaved sequence
  const interleavedCards: Card[] = [];
  let remainingGroups = selectedTags.map(tag => [...tagGroups[tag]]);
  let patternIndex = 0;
  
  // Continue until we've exhausted all selected tag groups
  while (remainingGroups.some(group => group.length > 0)) {
    // Get current group and pattern count
    const groupIndex = patternIndex % remainingGroups.length;
    const currentGroup = remainingGroups[groupIndex];
    const patternCount = interleavePattern[patternIndex % interleavePattern.length];
    
    // Add cards from current group according to pattern
    if (currentGroup.length > 0) {
      const cardsToAdd = currentGroup.splice(0, Math.min(patternCount, currentGroup.length));
      interleavedCards.push(...cardsToAdd);
    }
    
    // Filter out empty groups
    remainingGroups = remainingGroups.filter(group => group.length > 0);
    if (remainingGroups.length === 0) break;
    
    patternIndex++;
  }
  
  // Add any cards without tags at the end
  interleavedCards.push(...cardsWithoutTags);
  
  return interleavedCards;
};

export const AdaptiveLearning: React.FC<AdaptiveLearningProps> = ({ 
  cards, 
  decks, 
  onUpdateSettings 
}) => {
  const [adaptiveSettings, setAdaptiveSettings] = useState<AdaptiveSettings>({
    adjustDifficulty: true,
    focusOnWeakAreas: true,
    customizeIntervals: false,
    intervalMultiplier: 1.0,
    prioritizeWeakCards: true,
    idealStudyTime: null,
    recommendedSessionLength: 20,
    initialEaseFactor: 2.5,
    interleaving: true,
    interleavingDifficulty: 'medium',
    interleavingTopicCount: 3
  });
  
  const [studyHabits, setStudyHabits] = useState<{ hour: number; performance: number; count: number }[]>([]);
  const [weakTags, setWeakTags] = useState<{ tag: string; performance: number; count: number }[]>([]);
  const [timeAnalysis, setTimeAnalysis] = useState<{ optimal: number; actual: number }>({ optimal: 0, actual: 0 });
  const [showPersonalizedHelp, setShowPersonalizedHelp] = useState(false);
  const [interleavedExample, setInterleavedExample] = useState<{tag: string; count: number}[]>([]);
  
  // Calculate adaptive parameters based on user data
  useEffect(() => {
    if (!cards.length) return;
    
    // Calculate optimal study time
    const hourPerformance: { [hour: number]: { sum: number; count: number } } = {};
    
    cards.forEach(card => {
      card.reviewHistory.forEach(review => {
        const reviewDate = new Date(review.date);
        const hour = reviewDate.getHours();
        
        if (!hourPerformance[hour]) {
          hourPerformance[hour] = { sum: 0, count: 0 };
        }
        
        hourPerformance[hour].sum += review.rating;
        hourPerformance[hour].count++;
      });
    });
    
    // Convert to array for sorting and filtering
    const hourPerformanceArray = Object.entries(hourPerformance)
      .map(([hour, data]) => ({
        hour: parseInt(hour),
        performance: data.count > 5 ? data.sum / data.count : 0,
        count: data.count
      }))
      .filter(item => item.count > 5) // Only consider hours with sufficient data
      .sort((a, b) => b.performance - a.performance);
    
    setStudyHabits(hourPerformanceArray);
    
    // Set ideal study time based on best performance
    if (hourPerformanceArray.length > 0) {
      const bestHour = hourPerformanceArray[0].hour;
      const formattedHour = `${bestHour % 12 || 12}${bestHour < 12 ? 'am' : 'pm'}`;
      setAdaptiveSettings(prev => ({ ...prev, idealStudyTime: formattedHour }));
    }
    
    // Calculate ideal initial ease factor based on overall performance
    let allRatings: number[] = [];
    cards.forEach(card => {
      card.reviewHistory.forEach(review => {
        allRatings.push(review.rating);
      });
    });
    
    if (allRatings.length > 20) {
      const avgRating = allRatings.reduce((sum, rating) => sum + rating, 0) / allRatings.length;
      let recommendedEaseFactor = 2.5; // Default
      
      if (avgRating < 2.5) recommendedEaseFactor = 2.1;
      else if (avgRating < 3.0) recommendedEaseFactor = 2.3;
      else if (avgRating > 4.0) recommendedEaseFactor = 2.7;
      
      setAdaptiveSettings(prev => ({ ...prev, initialEaseFactor: parseFloat(recommendedEaseFactor.toFixed(1)) }));
    }
    
    // Analyze tag performance
    const tagPerformance: { [tag: string]: { sum: number; count: number } } = {};
    
    cards.forEach(card => {
      if (!card.tags || card.tags.length === 0) return;
      
      const cardTags = card.tags;
      const ratings = card.reviewHistory.map(r => r.rating);
      if (ratings.length === 0) return;
      
      const avgRating = ratings.reduce((sum, r) => sum + r, 0) / ratings.length;
      
      cardTags.forEach(tag => {
        if (!tagPerformance[tag]) {
          tagPerformance[tag] = { sum: 0, count: 0 };
        }
        
        tagPerformance[tag].sum += avgRating;
        tagPerformance[tag].count++;
      });
    });
    
    // Convert to array and sort by performance
    const tagPerformanceArray = Object.entries(tagPerformance)
      .map(([tag, data]) => ({
        tag,
        performance: data.count > 3 ? data.sum / data.count : 0,
        count: data.count
      }))
      .filter(item => item.count > 3) // Only consider tags with sufficient data
      .sort((a, b) => a.performance - b.performance); // Sort worst to best
    
    setWeakTags(tagPerformanceArray.slice(0, 5)); // Get 5 weakest tags
    
    // Calculate time efficiency
    let totalActualTime = 0;
    let totalOptimalTime = 0;
    
    cards.forEach(card => {
      card.reviewHistory.forEach(review => {
        if (review.msToAnswer) {
          totalActualTime += review.msToAnswer;
          
          // Calculate optimal time based on card complexity and review stage
          const cardTextLength = (card.front + card.back).replace(/<[^>]+>/g, '').length;
          const complexityFactor = Math.min(1.5, Math.max(0.5, cardTextLength / 500));
          const baseTime = card.scheduling.learningStage === 'learning' ? 8000 : 5000;
          totalOptimalTime += baseTime * complexityFactor;
        }
      });
    });
    
    if (totalActualTime > 0 && totalOptimalTime > 0) {
      setTimeAnalysis({
        actual: totalActualTime,
        optimal: totalOptimalTime
      });
    }
    
    // Calculate recommended session length based on user attention span
    if (cards.some(c => c.reviewHistory.length > 0)) {
      const timesBetweenReviews: number[] = [];
      
      // Group reviews by session
      const sessions: { date: Date; count: number }[] = [];
      
      cards.forEach(card => {
        card.reviewHistory.forEach(review => {
          const reviewDate = new Date(review.date);
          const existingSession = sessions.find(s => 
            Math.abs(s.date.getTime() - reviewDate.getTime()) < 30 * 60 * 1000 // Within 30 minutes
          );
          
          if (existingSession) {
            existingSession.count++;
          } else {
            sessions.push({ date: reviewDate, count: 1 });
          }
        });
      });
      
      // Find the most common session length
      const sessionCounts = sessions.map(s => s.count);
      const avgSessionLength = sessionCounts.length > 0 
        ? Math.round(sessionCounts.reduce((sum, count) => sum + count, 0) / sessionCounts.length)
        : 20;
      
      // Set recommended session length (with some bounds)
      const recommendedLength = Math.min(50, Math.max(10, avgSessionLength));
      setAdaptiveSettings(prev => ({ ...prev, recommendedSessionLength: recommendedLength }));
    }
    
    // Generate an interleaving example for the UI
    const generateInterleavedExample = () => {
      // Get top 4 tags with most cards
      const tagCounts: {[tag: string]: number} = {};
      cards.forEach(card => {
        if (card.tags && card.tags.length > 0) {
          const tag = card.tags[0];
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        }
      });
      
      const topTags = Object.entries(tagCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4)
        .map(([tag]) => tag);
      
      if (topTags.length < 2) return []; // Not enough tags for a meaningful example
      
      // Create a simplified example of interleaving
      const example: {tag: string; count: number}[] = [];
      const patternSize = adaptiveSettings.interleavingDifficulty === 'low' ? 3 : 
                          adaptiveSettings.interleavingDifficulty === 'medium' ? 2 : 1;
      
      // Create a pattern
      for (let i = 0; i < 8; i++) {
        const tagIndex = Math.floor(i / patternSize) % topTags.length;
        example.push({
          tag: topTags[tagIndex],
          count: 1
        });
      }
      
      // Consolidate consecutive same tags
      const consolidated: {tag: string; count: number}[] = [];
      let current: {tag: string; count: number} | null = null;
      
      example.forEach(item => {
        if (!current || current.tag !== item.tag) {
          if (current) consolidated.push(current);
          current = { ...item };
        } else {
          current.count += item.count;
        }
      });
      
      if (current) consolidated.push(current);
      return consolidated;
    };
    
    setInterleavedExample(generateInterleavedExample());
    
  }, [cards, adaptiveSettings.interleavingDifficulty]);
  
  // Apply settings changes
  const handleSettingChange = (field: keyof AdaptiveSettings, value: any) => {
    setAdaptiveSettings(prev => {
      const updated = { ...prev, [field]: value };
      
      // If we're updating interleaving difficulty, regenerate the example
      if (field === 'interleavingDifficulty' || field === 'interleavingTopicCount') {
        // The example will be regenerated in the effect
      }
      
      // Notify parent component of changes
      if (onUpdateSettings) {
        onUpdateSettings(updated);
      }
      
      return updated;
    });
  };
  
  // Convert time in ms to minutes and seconds
  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / (1000 * 60));
    const seconds = Math.floor((ms % (1000 * 60)) / 1000);
    return `${minutes}m ${seconds}s`;
  };
  
  const renderInterleavingSettings = () => (
    <div className="adaptive-settings-section">
      <h3>Interleaving Practice Settings</h3>
      <div className="interleaving-explanation">
        <p>Interleaving is a proven learning technique that mixes different topics together, 
        forcing your brain to differentiate between concepts and enhancing long-term retention.</p>
      </div>
      
      <div className="setting-item">
        <label className="toggle-switch">
          <input
            type="checkbox"
            checked={adaptiveSettings.interleaving}
            onChange={(e) => handleSettingChange('interleaving', e.target.checked)}
          />
          <span className="toggle-slider"></span>
        </label>
        <div className="setting-text">
          <div className="setting-name">Enable Interleaving</div>
          <div className="setting-description">Mix different topics during study sessions</div>
        </div>
      </div>
      
      {adaptiveSettings.interleaving && (
        <>
          <div className="setting-item">
            <div className="setting-text">
              <div className="setting-name">Interleaving Difficulty</div>
              <div className="setting-description">Higher difficulty means more frequent topic switching</div>
            </div>
            <select
              className="select-control"
              value={adaptiveSettings.interleavingDifficulty}
              onChange={(e) => handleSettingChange('interleavingDifficulty', e.target.value)}
            >
              <option value="low">Low (Gentle Mixing)</option>
              <option value="medium">Medium (Balanced)</option>
              <option value="high">High (Frequent Switches)</option>
            </select>
          </div>
          
          <div className="setting-item">
            <div className="setting-text">
              <div className="setting-name">Number of Topics</div>
              <div className="setting-description">How many different topics to mix together</div>
            </div>
            <input
              type="range"
              min="2"
              max="5"
              value={adaptiveSettings.interleavingTopicCount}
              onChange={(e) => handleSettingChange('interleavingTopicCount', parseInt(e.target.value))}
              className="range-control"
            />
            <div className="range-value">{adaptiveSettings.interleavingTopicCount}</div>
          </div>
          
          {interleavedExample.length > 0 && (
            <div className="interleaving-example">
              <h4>Example Pattern:</h4>
              <div className="example-pattern">
                {interleavedExample.map((item, index) => (
                  <div className="example-segment" key={index}>
                    <div 
                      className="example-tag"
                      style={{ 
                        backgroundColor: `var(--${['primary', 'secondary', 'accent', 'good'][interleavedExample.findIndex(x => x.tag === item.tag) % 4]}-color)` 
                      }}
                    >
                      {item.tag.substring(0, 8)}{item.tag.length > 8 ? '...' : ''}
                    </div>
                    <div className="example-count">×{item.count}</div>
                  </div>
                ))}
              </div>
              <div className="example-note">
                This is how your cards will be ordered during study.
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
  
  return (
    <div className="adaptive-learning-container">
      <h2>Adaptive Learning</h2>
      <p className="adaptive-description">
        Our AI analyzes your study patterns and performance to optimize your learning experience.
      </p>
      
      <div className="adaptive-insights">
        <div className="insight-section">
          <h3>Performance Insights</h3>
          
          {studyHabits.length > 0 ? (
            <div className="insight-card">
              <h4>Optimal Study Time</h4>
              <div className="optimal-time-display">
                <span className="time-badge">{adaptiveSettings.idealStudyTime || 'Insufficient data'}</span>
              </div>
              <p className="insight-explanation">
                Based on your review ratings, you perform best during this time of day.
              </p>
              
              <div className="hour-performance-chart">
                {studyHabits.slice(0, 3).map((hourData) => (
                  <div key={hourData.hour} className="hour-bar-container">
                    <div className="hour-label">{`${hourData.hour % 12 || 12}${hourData.hour < 12 ? 'am' : 'pm'}`}</div>
                    <div className="hour-bar-wrapper">
                      <div 
                        className="hour-bar" 
                        style={{ 
                          width: `${(hourData.performance / 5) * 100}%`,
                          backgroundColor: hourData.hour === (adaptiveSettings.idealStudyTime ? 
                            parseInt(adaptiveSettings.idealStudyTime) : -1) ? 
                            'var(--primary-brand-blue)' : 'var(--neutral-divider)'
                        }}
                      ></div>
                    </div>
                    <div className="hour-value">{hourData.performance.toFixed(1)}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="insight-card insufficient-data">
              <h4>Optimal Study Time</h4>
              <p>Insufficient data. Continue reviewing cards to generate insights.</p>
            </div>
          )}
          
          {weakTags.length > 0 ? (
            <div className="insight-card">
              <h4>Areas Needing Focus</h4>
              <div className="weak-tags-list">
                {weakTags.map((tagData) => (
                  <div key={tagData.tag} className="weak-tag-item">
                    <span className="weak-tag-name">{tagData.tag}</span>
                    <div className="weak-tag-bar-wrapper">
                      <div 
                        className="weak-tag-bar" 
                        style={{ 
                          width: `${(tagData.performance / 5) * 100}%`,
                          backgroundColor: `hsl(${Math.max(0, tagData.performance / 5) * 120}, 80%, 50%)`
                        }}
                      ></div>
                    </div>
                    <span className="weak-tag-value">{tagData.performance.toFixed(1)}</span>
                  </div>
                ))}
              </div>
              <p className="insight-explanation">
                These topics have the lowest average ratings. Consider focusing on them.
              </p>
            </div>
          ) : (
            <div className="insight-card insufficient-data">
              <h4>Areas Needing Focus</h4>
              <p>Add tags to your cards and continue reviewing to identify challenging topics.</p>
            </div>
          )}
          
          {timeAnalysis.actual > 0 ? (
            <div className="insight-card">
              <h4>Time Efficiency</h4>
              <div className="time-efficiency">
                <div className="time-comparison">
                  <div className="time-item">
                    <span className="time-label">Your Average:</span>
                    <span className="time-value">{formatTime(timeAnalysis.actual / cards.filter(c => c.reviewHistory.length > 0).length)}</span>
                  </div>
                  <div className="time-item">
                    <span className="time-label">Optimal:</span>
                    <span className="time-value">{formatTime(timeAnalysis.optimal / cards.filter(c => c.reviewHistory.length > 0).length)}</span>
                  </div>
                </div>
                <div className="efficiency-bar-wrapper">
                  <div 
                    className="efficiency-bar" 
                    style={{ 
                      width: `${Math.min(100, (timeAnalysis.optimal / timeAnalysis.actual) * 100)}%`,
                      backgroundColor: `hsl(${Math.min(120, Math.max(0, (timeAnalysis.optimal / timeAnalysis.actual) * 120))}, 80%, 50%)`
                    }}
                  ></div>
                </div>
                <div className="efficiency-value">
                  {Math.round((timeAnalysis.optimal / timeAnalysis.actual) * 100)}% Efficient
                </div>
              </div>
            </div>
          ) : (
            <div className="insight-card insufficient-data">
              <h4>Time Efficiency</h4>
              <p>Continue reviewing cards to analyze your review speed efficiency.</p>
            </div>
          )}
        </div>
        
        <div className="settings-section">
          <h3>Learning Settings</h3>
          
          <div className="settings-card">
            <h4>Adaptive Algorithm Parameters</h4>
            
            <div className="setting-item">
              <label htmlFor="session-length">Recommended Session Length:</label>
              <div className="setting-control">
                <input 
                  type="range" 
                  id="session-length" 
                  min="5" 
                  max="50" 
                  step="5"
                  value={adaptiveSettings.recommendedSessionLength} 
                  onChange={(e) => handleSettingChange('recommendedSessionLength', parseInt(e.target.value))} 
                />
                <span className="setting-value">{adaptiveSettings.recommendedSessionLength} cards</span>
              </div>
            </div>
            
            <div className="setting-item">
              <label htmlFor="ease-factor">Initial Ease Factor:</label>
              <div className="setting-control">
                <input 
                  type="range" 
                  id="ease-factor" 
                  min="1.3" 
                  max="3.0" 
                  step="0.1"
                  value={adaptiveSettings.initialEaseFactor} 
                  onChange={(e) => handleSettingChange('initialEaseFactor', parseFloat(e.target.value))} 
                />
                <span className="setting-value">{adaptiveSettings.initialEaseFactor.toFixed(1)}</span>
              </div>
              <div className="setting-explanation">
                Lower values make cards appear more frequently.
              </div>
            </div>
            
            <div className="setting-item checkbox-setting">
              <input 
                type="checkbox" 
                id="interleaving" 
                checked={adaptiveSettings.interleaving} 
                onChange={(e) => handleSettingChange('interleaving', e.target.checked)} 
              />
              <label htmlFor="interleaving">Use interleaving (mix related topics)</label>
            </div>
            
            <div className="setting-item checkbox-setting">
              <input 
                type="checkbox" 
                id="prioritize-weak" 
                checked={adaptiveSettings.prioritizeWeakCards} 
                onChange={(e) => handleSettingChange('prioritizeWeakCards', e.target.checked)} 
              />
              <label htmlFor="prioritize-weak">Prioritize weak cards</label>
            </div>
          </div>
          
          <div className="settings-card">
            <h4>Personalized Help</h4>
            <button 
              className="toggle-help-button"
              onClick={() => setShowPersonalizedHelp(!showPersonalizedHelp)}
            >
              {showPersonalizedHelp ? 'Hide Recommendations' : 'Show Recommendations'}
            </button>
            
            {showPersonalizedHelp && (
              <div className="personalized-recommendations">
                <ul className="recommendations-list">
                  {weakTags.length > 0 && (
                    <li>Focus on studying cards tagged with <strong>{weakTags[0].tag}</strong> and <strong>{weakTags[1]?.tag || ''}</strong></li>
                  )}
                  {adaptiveSettings.idealStudyTime && (
                    <li>Try studying around <strong>{adaptiveSettings.idealStudyTime}</strong> when you perform best</li>
                  )}
                  {timeAnalysis.actual > timeAnalysis.optimal * 1.5 && (
                    <li>Consider spending less time on individual cards to improve efficiency</li>
                  )}
                  <li>Aim for <strong>{adaptiveSettings.recommendedSessionLength} cards</strong> per study session for optimal results</li>
                  {adaptiveSettings.initialEaseFactor !== 2.5 && (
                    <li>Your optimal ease factor setting is <strong>{adaptiveSettings.initialEaseFactor.toFixed(1)}</strong> based on your performance</li>
                  )}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {renderInterleavingSettings()}
    </div>
  );
}; 