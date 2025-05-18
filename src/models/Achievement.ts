// Achievement model for gamification elements

export type AchievementTier = 'bronze' | 'silver' | 'gold' | 'platinum';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string; // Emoji or icon class name
  tier: AchievementTier;
  isUnlocked: boolean;
  progress?: number; // Current progress (e.g., 7 out of 10 days)
  maxProgress?: number; // Total required for completion (e.g., 10 days)
  unlockDate?: string; // ISO date when unlocked
  category: 'streak' | 'retention' | 'quantity' | 'mastery' | 'dedication';
}

// Define achievement templates
export const ACHIEVEMENT_TEMPLATES: Omit<Achievement, 'isUnlocked' | 'unlockDate' | 'progress'>[] = [
  // Streak achievements
  {
    id: 'streak_bronze',
    name: '3-Day Streak',
    description: 'Study at least one card for 3 consecutive days',
    icon: '🔥',
    tier: 'bronze',
    category: 'streak',
    maxProgress: 3
  },
  {
    id: 'streak_silver',
    name: '7-Day Streak',
    description: 'Study at least one card for 7 consecutive days',
    icon: '🔥',
    tier: 'silver',
    category: 'streak',
    maxProgress: 7
  },
  {
    id: 'streak_gold',
    name: '30-Day Streak',
    description: 'Study at least one card for 30 consecutive days',
    icon: '🔥',
    tier: 'gold',
    category: 'streak',
    maxProgress: 30
  },
  {
    id: 'streak_platinum',
    name: '100-Day Streak',
    description: 'Study at least one card for 100 consecutive days',
    icon: '🔥',
    tier: 'platinum',
    category: 'streak',
    maxProgress: 100
  },
  
  // Retention achievements
  {
    id: 'retention_bronze',
    name: 'Basic Retention',
    description: 'Achieve 70% retention rate over 7 days',
    icon: '🧠',
    tier: 'bronze',
    category: 'retention',
    maxProgress: 70
  },
  {
    id: 'retention_silver',
    name: 'Solid Retention',
    description: 'Achieve 80% retention rate over 14 days',
    icon: '🧠',
    tier: 'silver',
    category: 'retention',
    maxProgress: 80
  },
  {
    id: 'retention_gold',
    name: 'Excellent Retention',
    description: 'Achieve 90% retention rate over 30 days',
    icon: '🧠',
    tier: 'gold',
    category: 'retention',
    maxProgress: 90
  },
  {
    id: 'retention_platinum',
    name: 'Perfect Retention',
    description: 'Achieve 95% retention rate over 30 days with 100+ reviews',
    icon: '🧠',
    tier: 'platinum',
    category: 'retention',
    maxProgress: 95
  },
  
  // Quantity achievements
  {
    id: 'cards_bronze',
    name: 'Card Collector',
    description: 'Create 10 cards',
    icon: '🃏',
    tier: 'bronze',
    category: 'quantity',
    maxProgress: 10
  },
  {
    id: 'cards_silver',
    name: 'Card Enthusiast',
    description: 'Create 50 cards',
    icon: '🃏',
    tier: 'silver',
    category: 'quantity',
    maxProgress: 50
  },
  {
    id: 'cards_gold',
    name: 'Card Master',
    description: 'Create 200 cards',
    icon: '🃏',
    tier: 'gold',
    category: 'quantity',
    maxProgress: 200
  },
  {
    id: 'cards_platinum',
    name: 'Card Virtuoso',
    description: 'Create 1000 cards',
    icon: '🃏',
    tier: 'platinum',
    category: 'quantity',
    maxProgress: 1000
  },
  
  // Mastery achievements
  {
    id: 'mastery_bronze',
    name: 'Beginner Mastery',
    description: 'Get 5 cards to review stage',
    icon: '🎓',
    tier: 'bronze',
    category: 'mastery',
    maxProgress: 5
  },
  {
    id: 'mastery_silver',
    name: 'Intermediate Mastery',
    description: 'Get 25 cards to review stage',
    icon: '🎓',
    tier: 'silver',
    category: 'mastery',
    maxProgress: 25
  },
  {
    id: 'mastery_gold',
    name: 'Advanced Mastery',
    description: 'Get 100 cards to review stage',
    icon: '🎓',
    tier: 'gold',
    category: 'mastery',
    maxProgress: 100
  },
  {
    id: 'mastery_platinum',
    name: 'Complete Mastery',
    description: 'Get 500 cards to review stage',
    icon: '🎓',
    tier: 'platinum',
    category: 'mastery',
    maxProgress: 500
  },
  
  // Dedication (time spent) achievements
  {
    id: 'time_bronze',
    name: 'Dedicated Learner',
    description: 'Study for a total of 1 hour',
    icon: '⏱️',
    tier: 'bronze',
    category: 'dedication',
    maxProgress: 60 // 60 minutes
  },
  {
    id: 'time_silver',
    name: 'Committed Student',
    description: 'Study for a total of 5 hours',
    icon: '⏱️',
    tier: 'silver',
    category: 'dedication',
    maxProgress: 300 // 5 hours in minutes
  },
  {
    id: 'time_gold',
    name: 'Learning Champion',
    description: 'Study for a total of 20 hours',
    icon: '⏱️',
    tier: 'gold',
    category: 'dedication',
    maxProgress: 1200 // 20 hours in minutes
  },
  {
    id: 'time_platinum',
    name: 'Learning Legend',
    description: 'Study for a total of 100 hours',
    icon: '⏱️',
    tier: 'platinum',
    category: 'dedication',
    maxProgress: 6000 // 100 hours in minutes
  }
];

// Helper function to initialize achievements
export function initializeAchievements(): Achievement[] {
  return ACHIEVEMENT_TEMPLATES.map(template => ({
    ...template,
    isUnlocked: false,
    progress: 0
  }));
}

// Helper to check and update achievements based on user data
export function updateAchievements(
  achievements: Achievement[],
  streak: number,
  retentionRate: number,
  cardCount: number,
  reviewStageCount: number,
  totalStudyMinutes: number
): Achievement[] {
  return achievements.map(achievement => {
    // Skip already unlocked achievements
    if (achievement.isUnlocked) return achievement;
    
    let progress = 0;
    let isUnlocked = false;
    
    switch (achievement.category) {
      case 'streak':
        progress = streak;
        isUnlocked = streak >= (achievement.maxProgress || 0);
        break;
      case 'retention':
        progress = retentionRate;
        isUnlocked = retentionRate >= (achievement.maxProgress || 0);
        break;
      case 'quantity':
        progress = cardCount;
        isUnlocked = cardCount >= (achievement.maxProgress || 0);
        break;
      case 'mastery':
        progress = reviewStageCount;
        isUnlocked = reviewStageCount >= (achievement.maxProgress || 0);
        break;
      case 'dedication':
        progress = totalStudyMinutes;
        isUnlocked = totalStudyMinutes >= (achievement.maxProgress || 0);
        break;
    }
    
    return {
      ...achievement,
      progress,
      isUnlocked,
      unlockDate: isUnlocked && !achievement.unlockDate ? new Date().toISOString() : achievement.unlockDate
    };
  });
} 