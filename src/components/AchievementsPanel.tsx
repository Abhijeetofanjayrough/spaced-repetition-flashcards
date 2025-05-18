import React, { useState, useEffect } from 'react';
import { Achievement, AchievementTier } from '../models/Achievement';
import './AchievementsPanel.css';

interface AchievementsPanelProps {
  achievements: Achievement[];
  onClose?: () => void;
}

// Define colors for different tiers
const getTierColor = (tier: AchievementTier): string => {
  switch (tier) {
    case 'bronze': return '#CD7F32';
    case 'silver': return '#C0C0C0';
    case 'gold': return '#FFD700';
    case 'platinum': return '#E5E4E2';
    default: return '#CD7F32';
  }
};

// Define tier order for sorting
const tierOrder: { [key in AchievementTier]: number } = {
  platinum: 0,
  gold: 1,
  silver: 2,
  bronze: 3
};

export const AchievementsPanel: React.FC<AchievementsPanelProps> = ({ achievements, onClose }) => {
  const [filter, setFilter] = useState<'all' | 'unlocked' | 'locked'>('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'streak' | 'retention' | 'quantity' | 'mastery' | 'dedication'>('all');
  const [showNewUnlocks, setShowNewUnlocks] = useState(false);
  const [newUnlocks, setNewUnlocks] = useState<Achievement[]>([]);

  // Check for newly unlocked achievements (last 24 hours)
  useEffect(() => {
    const last24Hours = new Date();
    last24Hours.setHours(last24Hours.getHours() - 24);
    
    const recentUnlocks = achievements.filter(achievement => 
      achievement.isUnlocked && 
      achievement.unlockDate && 
      new Date(achievement.unlockDate) >= last24Hours
    );
    
    if (recentUnlocks.length > 0) {
      setNewUnlocks(recentUnlocks);
      setShowNewUnlocks(true);
    }
  }, [achievements]);

  // Filter achievements based on selected filters
  const filteredAchievements = achievements.filter(achievement => {
    // Apply unlocked/locked filter
    if (filter === 'unlocked' && !achievement.isUnlocked) return false;
    if (filter === 'locked' && achievement.isUnlocked) return false;
    
    // Apply category filter
    if (categoryFilter !== 'all' && achievement.category !== categoryFilter) return false;
    
    return true;
  });

  // Sort achievements by tier (platinum first, then gold, etc.)
  const sortedAchievements = [...filteredAchievements].sort((a, b) => {
    // Sort by tier first
    const tierDiff = tierOrder[a.tier] - tierOrder[b.tier];
    if (tierDiff !== 0) return tierDiff;
    
    // If same tier, sort by unlocked status
    if (a.isUnlocked !== b.isUnlocked) return a.isUnlocked ? -1 : 1;
    
    // If both locked or both unlocked, sort by name
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="achievements-panel">
      <div className="achievements-header">
        <h2>Achievements</h2>
        {onClose && (
          <button className="close-button" onClick={onClose}>×</button>
        )}
      </div>
      
      {/* New unlocks notification */}
      {showNewUnlocks && (
        <div className="new-unlocks-container">
          <div className="new-unlocks-header">
            <h3>New Achievements Unlocked! 🎉</h3>
            <button onClick={() => setShowNewUnlocks(false)}>Dismiss</button>
          </div>
          <div className="new-unlocks-list">
            {newUnlocks.map(achievement => (
              <div 
                key={achievement.id} 
                className="new-unlock-item"
                style={{ borderColor: getTierColor(achievement.tier) }}
              >
                <span className="achievement-icon">{achievement.icon}</span>
                <div className="achievement-details">
                  <h4>{achievement.name}</h4>
                  <p>{achievement.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Filters */}
      <div className="achievements-filters">
        <div className="filter-section">
          <label>Status:</label>
          <div className="filter-buttons">
            <button 
              className={filter === 'all' ? 'active' : ''}
              onClick={() => setFilter('all')}
            >
              All
            </button>
            <button 
              className={filter === 'unlocked' ? 'active' : ''}
              onClick={() => setFilter('unlocked')}
            >
              Unlocked
            </button>
            <button 
              className={filter === 'locked' ? 'active' : ''}
              onClick={() => setFilter('locked')}
            >
              Locked
            </button>
          </div>
        </div>
        
        <div className="filter-section">
          <label>Category:</label>
          <div className="filter-buttons">
            <button 
              className={categoryFilter === 'all' ? 'active' : ''}
              onClick={() => setCategoryFilter('all')}
            >
              All
            </button>
            <button 
              className={categoryFilter === 'streak' ? 'active' : ''}
              onClick={() => setCategoryFilter('streak')}
            >
              Streak
            </button>
            <button 
              className={categoryFilter === 'retention' ? 'active' : ''}
              onClick={() => setCategoryFilter('retention')}
            >
              Retention
            </button>
            <button 
              className={categoryFilter === 'quantity' ? 'active' : ''}
              onClick={() => setCategoryFilter('quantity')}
            >
              Quantity
            </button>
            <button 
              className={categoryFilter === 'mastery' ? 'active' : ''}
              onClick={() => setCategoryFilter('mastery')}
            >
              Mastery
            </button>
            <button 
              className={categoryFilter === 'dedication' ? 'active' : ''}
              onClick={() => setCategoryFilter('dedication')}
            >
              Time
            </button>
          </div>
        </div>
      </div>
      
      {/* Achievements grid */}
      <div className="achievements-grid">
        {sortedAchievements.map(achievement => (
          <div 
            key={achievement.id}
            className={`achievement-card ${achievement.isUnlocked ? 'unlocked' : 'locked'}`}
            style={{ 
              borderColor: achievement.isUnlocked ? getTierColor(achievement.tier) : 'var(--neutral-divider)',
              backgroundColor: achievement.isUnlocked ? `${getTierColor(achievement.tier)}10` : 'transparent'
            }}
          >
            <div className="achievement-icon-container">
              <span className="achievement-icon">{achievement.icon}</span>
              <div className={`achievement-tier ${achievement.tier}`}>
                {achievement.tier.charAt(0).toUpperCase()}
              </div>
            </div>
            
            <div className="achievement-info">
              <h3>{achievement.name}</h3>
              <p>{achievement.description}</p>
              
              {/* Show progress for locked achievements with progress tracking */}
              {!achievement.isUnlocked && achievement.maxProgress && achievement.progress !== undefined && (
                <div className="achievement-progress">
                  <div className="progress-bar">
                    <div 
                      className="progress-fill"
                      style={{ width: `${Math.min(100, (achievement.progress / achievement.maxProgress) * 100)}%` }}
                      title={`Progress: ${achievement.progress} / ${achievement.maxProgress}`}
                    ></div>
                  </div>
                  <div className="progress-text">
                    {achievement.progress} / {achievement.maxProgress}
                  </div>
                </div>
              )}
              
              {/* Show unlock date for unlocked achievements */}
              {achievement.isUnlocked && achievement.unlockDate && (
                <div className="achievement-unlock-date">
                  Unlocked: {new Date(achievement.unlockDate).toLocaleDateString()}
                </div>
              )}
            </div>
          </div>
        ))}
        
        {sortedAchievements.length === 0 && (
          <div className="no-achievements">
            No achievements match the selected filters.
          </div>
        )}
      </div>
    </div>
  );
};