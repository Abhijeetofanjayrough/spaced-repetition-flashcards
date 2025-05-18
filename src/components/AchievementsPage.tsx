import React, { useEffect, useState } from 'react';
import { Achievement, AchievementTier, updateAchievements } from '../models/Achievement';
import { AchievementsPanel } from './AchievementsPanel';
import { Card } from '../models/Card';
import Confetti from 'react-confetti';
import useWindowSize from '../hooks/useWindowSize';
import './AchievementsPage.css';

interface AchievementsPageProps {
  achievements: Achievement[];
  cards: Card[];
  streak: number;
  onUpdateAchievements: (updatedAchievements: Achievement[]) => void;
  onNavigateBack: () => void;
  newlyUnlockedIds?: string[];
}

export const AchievementsPage: React.FC<AchievementsPageProps> = ({
  achievements,
  cards,
  streak,
  onUpdateAchievements,
  onNavigateBack,
  newlyUnlockedIds = []
}) => {
  const [stats, setStats] = useState({
    totalCards: 0,
    reviewStageCards: 0,
    retentionRate: 0,
    totalStudyMinutes: 0
  });

  const { width, height } = useWindowSize();
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (newlyUnlockedIds && newlyUnlockedIds.length > 0) {
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 6000);
      return () => clearTimeout(timer);
    }
  }, [newlyUnlockedIds]);

  // Calculate stats for achievement progress
  useEffect(() => {
    // Filter out archived cards for stats
    const activeCards = cards.filter(card => !card.archived);
    
    // Total cards
    const totalCards = activeCards.length;
    
    // Review stage cards
    const reviewStageCards = activeCards.filter(
      card => card.scheduling.learningStage === 'review'
    ).length;
    
    // Retention rate (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    let totalReviews = 0;
    let successfulReviews = 0;
    
    activeCards.forEach(card => {
      card.reviewHistory.forEach(review => {
        const reviewDate = new Date(review.date);
        if (reviewDate >= sevenDaysAgo) {
          totalReviews++;
          if (review.rating >= 3) { // Successful recall
            successfulReviews++;
          }
        }
      });
    });
    
    const retentionRate = totalReviews > 0 
      ? Math.round((successfulReviews / totalReviews) * 100) 
      : 0;
    
    // Total study time
    let totalTimeMs = 0;
    activeCards.forEach(card => {
      card.reviewHistory.forEach(review => {
        if (review.msToAnswer) {
          totalTimeMs += review.msToAnswer;
        }
      });
    });
    
    const totalStudyMinutes = Math.round(totalTimeMs / (1000 * 60));
    
    setStats({
      totalCards,
      reviewStageCards,
      retentionRate,
      totalStudyMinutes
    });
    
    // Update achievements based on current stats
    const updatedAchievements = updateAchievements(
      achievements,
      streak,
      retentionRate,
      totalCards,
      reviewStageCards,
      totalStudyMinutes
    );
    
    // Check if there were any changes
    if (JSON.stringify(updatedAchievements) !== JSON.stringify(achievements)) {
      onUpdateAchievements(updatedAchievements);
    }
  }, [achievements, cards, streak, onUpdateAchievements]);

  // Calculate progress for achievement tiers
  const calculateProgress = () => {
    const progress = {
      bronze: 0,
      silver: 0,
      gold: 0,
      platinum: 0
    };
    
    const tierCounts = {
      bronze: 0,
      silver: 0,
      gold: 0,
      platinum: 0
    };
    
    achievements.forEach(achievement => {
      tierCounts[achievement.tier]++;
      if (achievement.isUnlocked) {
        progress[achievement.tier]++;
      }
    });
    
    return {
      bronze: {
        count: progress.bronze,
        total: tierCounts.bronze,
        percentage: tierCounts.bronze > 0 ? Math.round((progress.bronze / tierCounts.bronze) * 100) : 0
      },
      silver: {
        count: progress.silver,
        total: tierCounts.silver,
        percentage: tierCounts.silver > 0 ? Math.round((progress.silver / tierCounts.silver) * 100) : 0
      },
      gold: {
        count: progress.gold,
        total: tierCounts.gold,
        percentage: tierCounts.gold > 0 ? Math.round((progress.gold / tierCounts.gold) * 100) : 0
      },
      platinum: {
        count: progress.platinum,
        total: tierCounts.platinum,
        percentage: tierCounts.platinum > 0 ? Math.round((progress.platinum / tierCounts.platinum) * 100) : 0
      }
    };
  };
  
  const tierProgress = calculateProgress();
  
  // Count total achievements unlocked
  const totalUnlocked = achievements.filter(a => a.isUnlocked).length;
  const totalAchievements = achievements.length;
  const overallPercentage = totalAchievements > 0 
    ? Math.round((totalUnlocked / totalAchievements) * 100) 
    : 0;

  return (
    <div className="achievements-page">
      {showConfetti && newlyUnlockedIds && newlyUnlockedIds.length > 0 && (
        <Confetti
          width={width}
          height={height}
          recycle={false}
          numberOfPieces={300}
          gravity={0.15}
          initialVelocityX={{ min: -10, max: 10 }}
          initialVelocityY={{ min: -15, max: 5 }}
          onConfettiComplete={() => setShowConfetti(false)}
        />
      )}
      <div className="achievements-page-header">
        <button className="back-button" onClick={onNavigateBack}>
          ← Back
        </button>
        <h1>Achievements</h1>
      </div>
      
      <div className="achievements-summary">
        <div className="achievement-progress-overview">
          <div className="progress-header">
            <h2>Achievement Progress</h2>
            <div className="overall-progress">
              <span className="progress-text">{totalUnlocked} / {totalAchievements} unlocked</span>
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${overallPercentage}%` }}
                  title={`Overall Achievement Progress: ${overallPercentage}%`}
                ></div>
              </div>
              <span className="percentage">{overallPercentage}%</span>
            </div>
          </div>
          
          <div className="tier-progress-grid">
            <div className="tier-progress bronze">
              <div className="tier-badge">B</div>
              <div className="tier-info">
                <span className="tier-name">Bronze</span>
                <div className="tier-bar">
                  <div 
                    className="tier-fill" 
                    style={{ width: `${tierProgress.bronze.percentage}%` }}
                  ></div>
                </div>
                <span className="tier-count">{tierProgress.bronze.count}/{tierProgress.bronze.total}</span>
              </div>
            </div>
            
            <div className="tier-progress silver">
              <div className="tier-badge">S</div>
              <div className="tier-info">
                <span className="tier-name">Silver</span>
                <div className="tier-bar">
                  <div 
                    className="tier-fill" 
                    style={{ width: `${tierProgress.silver.percentage}%` }}
                  ></div>
                </div>
                <span className="tier-count">{tierProgress.silver.count}/{tierProgress.silver.total}</span>
              </div>
            </div>
            
            <div className="tier-progress gold">
              <div className="tier-badge">G</div>
              <div className="tier-info">
                <span className="tier-name">Gold</span>
                <div className="tier-bar">
                  <div 
                    className="tier-fill" 
                    style={{ width: `${tierProgress.gold.percentage}%` }}
                  ></div>
                </div>
                <span className="tier-count">{tierProgress.gold.count}/{tierProgress.gold.total}</span>
              </div>
            </div>
            
            <div className="tier-progress platinum">
              <div className="tier-badge">P</div>
              <div className="tier-info">
                <span className="tier-name">Platinum</span>
                <div className="tier-bar">
                  <div 
                    className="tier-fill" 
                    style={{ width: `${tierProgress.platinum.percentage}%` }}
                  ></div>
                </div>
                <span className="tier-count">{tierProgress.platinum.count}/{tierProgress.platinum.total}</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="achievement-stats">
          <h3>Your Stats</h3>
          <div className="stats-grid">
            <div className="stat-item">
              <div className="stat-icon">🔥</div>
              <div className="stat-info">
                <span className="stat-label">Streak</span>
                <span className="stat-value">{streak} days</span>
              </div>
            </div>
            
            <div className="stat-item">
              <div className="stat-icon">🧠</div>
              <div className="stat-info">
                <span className="stat-label">Retention Rate</span>
                <span className="stat-value">{stats.retentionRate}%</span>
              </div>
            </div>
            
            <div className="stat-item">
              <div className="stat-icon">🃏</div>
              <div className="stat-info">
                <span className="stat-label">Cards Created</span>
                <span className="stat-value">{stats.totalCards}</span>
              </div>
            </div>
            
            <div className="stat-item">
              <div className="stat-icon">🎓</div>
              <div className="stat-info">
                <span className="stat-label">Cards Mastered</span>
                <span className="stat-value">{stats.reviewStageCards}</span>
              </div>
            </div>
            
            <div className="stat-item">
              <div className="stat-icon">⏱️</div>
              <div className="stat-info">
                <span className="stat-label">Study Time</span>
                <span className="stat-value">{stats.totalStudyMinutes} minutes</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <AchievementsPanel achievements={achievements} />
    </div>
  );
};