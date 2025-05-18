import React, { useMemo, useEffect, useState } from 'react';
import { Card } from '../models/Card';
import { Deck, isRegularDeck } from '../models/Deck';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import ReactFlow, { Controls, Background, useNodesState, useEdgesState, MarkerType, Node, Edge } from 'reactflow';
import 'reactflow/dist/style.css';
import './AnalyticsDashboard.css'; // We'll create this later
import { useData } from '../contexts/DataContext'; // For total due cards
import MasteryChart from './MasteryChart';
import { db } from '../db'; // Import db directly

export interface AnalyticsDashboardProps {
  cards: Card[];
  decks: Deck[];
  // Add other necessary props, e.g., functions to calculate specific analytics if not done here
}

// Define the structure for retention data points
interface RetentionDataPoint {
  label: string;
  retention: number;
  reviews: number;
  successes: number;
}

interface HourStatDataPoint {
  hour: string; // e.g., "10 AM", "11 PM"
  reviews: number;
  avgRating?: number; // Optional: if we want to show average rating per hour
}

interface TimePerDifficultyDataPoint {
  difficulty: string;
  averageTime: number; // in seconds
  count: number;
}

interface TimePerSubjectDataPoint {
  subject: string; // Tag name
  totalTimeMinutes: number;
}

// Helper to define card difficulty/strength for node styling
const getCardStrength = (card: Card): 'strong' | 'medium' | 'weak' => {
  const { easeFactor, learningStage } = card.scheduling;
  if (learningStage === 'relearning' || easeFactor < 1.8) return 'weak';
  if (learningStage === 'learning' || easeFactor < 2.2) return 'medium';
  return 'strong';
};

// Tag Colors for Knowledge Graph
const TAG_COLORS = [
  '#E57373', '#81C784', '#64B5F6', '#FFD54F', '#BA68C8', 
  '#4DB6AC', '#FF8A65', '#90A4AE', '#A1887F', '#7986CB'
];

const getTagColor = (tagName: string, allTags: Map<string, string>): string => {
  if (!allTags.has(tagName)) {
    allTags.set(tagName, TAG_COLORS[allTags.size % TAG_COLORS.length]);
  }
  return allTags.get(tagName)!;
};

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ cards: propCards, decks }) => {
  const { getAllDueCards, isLoading } = useData();

  const totalCards = propCards.length;
  const totalDecks = decks.length;
  const totalDueToday = useMemo(() => getAllDueCards().length, [getAllDueCards, propCards]);

  // React Flow state for the knowledge graph
  const [graphNodes, setGraphNodes, onGraphNodesChange] = useNodesState<any>([]);
  const [graphEdges, setGraphEdges, onGraphEdgesChange] = useEdgesState<any>([]);
  const [tagColorMap, setTagColorMap] = useState<Map<string, string>>(new Map());

  // Stats state
  const [allCards, setAllCards] = useState<Card[]>([]);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  const [totalReviews, setTotalReviews] = useState(0);
  const [averageEaseFactor, setAverageEaseFactor] = useState(0);
  const [streakData, setStreakData] = useState({ current: 0, longest: 0 });
  const [learningStages, setLearningStages] = useState({
    learning: 0,
    review: 0,
    relearning: 0
  });

  useEffect(() => {
    const activeCards = propCards.filter(c => !c.archived);
    const currentTagColors = new Map<string, string>(); // To build map for current set of cards

    const nodes: Node[] = activeCards.map((card, i) => {
      const strength = getCardStrength(card);
      let strengthBackgroundColor = 'var(--neutral-card-face)';
      let strengthBorderColor = 'var(--primary-brand-blue)';
      let strengthTextColor = 'var(--neutral-text)';

      switch (strength) {
        case 'strong':
          strengthBackgroundColor = 'var(--feedback-easy)';
          strengthBorderColor = '#388E3C';
          strengthTextColor = '#fff';
          break;
        case 'medium':
          strengthBackgroundColor = 'var(--feedback-hard)';
          strengthBorderColor = '#FFA000';
          strengthTextColor = 'var(--neutral-text)';
          break;
        case 'weak':
          strengthBackgroundColor = 'var(--feedback-again)';
          strengthBorderColor = '#D32F2F';
          strengthTextColor = '#fff';
          break;
      }
      
      const xPos = (i % 10) * 180;
      const yPos = Math.floor(i / 10) * 120;

      const baseStyle: React.CSSProperties = {
        background: strengthBackgroundColor,
        color: strengthTextColor,
        border: `1px solid ${strengthBorderColor}`,
        borderRadius: 'var(--radius-sm)',
        fontSize: '10px',
        width: 150,
        padding: '8px',
        boxSizing: 'border-box', // Important for border-top to not expand overall size
      };

      let finalNodeStyle = { ...baseStyle };

      if (card.tags && card.tags.length > 0) {
        const primaryTag = card.tags[0];
        const tagSpecificColor = getTagColor(primaryTag, currentTagColors);
        finalNodeStyle = {
          ...baseStyle,
          borderTopWidth: '5px', // Make it slightly thicker to be more visible
          borderTopColor: tagSpecificColor,
        };
      }

      return {
        id: card.id,
        type: 'default',
        data: { label: card.front.replace(/<[^>]+>/g, '').substring(0, 30) + (card.front.length > 30 ? '...' : '') || `Card ${i + 1}` },
        position: { x: xPos, y: yPos },
        style: finalNodeStyle,
      };
    });

    const edges: Edge[] = activeCards.flatMap(card =>
      (card.relatedIds || [])
        .filter(relId => activeCards.some(c => c.id === relId)) // Ensure target node exists
        .map(relId => ({
          id: `e-${card.id}-${relId}`,
          source: card.id,
          target: relId,
          type: 'smoothstep',
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: 'var(--primary-brand-blue)',
          },
          style: { stroke: 'var(--primary-brand-blue)', strokeWidth: 1.5 },
        }))
    );
    setGraphNodes(nodes);
    setGraphEdges(edges);
    setTagColorMap(currentTagColors); // Save the generated map for the legend
  }, [propCards, setGraphNodes, setGraphEdges]);

  useEffect(() => {
    // Check for time range query parameter
    const rangeParam = getQueryParam('timeRange');
    if (rangeParam && ['7d', '30d', '90d', 'all'].includes(rangeParam as any)) {
      setTimeRange(rangeParam as '7d' | '30d' | '90d' | 'all');
    }
    
    const loadCards = async () => {
      try {
        // Use the db object directly since getAllCards isn't in the context
        const cards = await db.getAllCards();
        setAllCards(cards);
        
        // Calculate total review count
        let reviewCount = 0;
        cards.forEach((card: Card) => {
          reviewCount += card.reviewHistory.length;
        });
        setTotalReviews(reviewCount);
        
        // Calculate average ease factor
        const totalEase = cards.reduce((sum: number, card: Card) => sum + card.scheduling.easeFactor, 0);
        setAverageEaseFactor(cards.length > 0 ? totalEase / cards.length : 0);
        
        // Calculate learning stages distribution
        const stages = {
          learning: 0,
          review: 0,
          relearning: 0
        };
        
        cards.forEach((card: Card) => {
          const stage = card.scheduling.learningStage;
          if (stage === 'learning' || stage === 'review' || stage === 'relearning') {
            stages[stage]++;
          }
        });
        
        setLearningStages(stages);
        
        // Calculate streak data
        const streakInfo = calculateStreak(cards);
        setStreakData(streakInfo);
      } catch (error) {
        console.error('Error loading cards data:', error);
      }
    };
    
    loadCards();
  }, [propCards]);
  
  const calculateStreak = (cards: Card[]): { current: number; longest: number } => {
    // If there are no reviews at all, streak is 0
    if (cards.length === 0 || cards.every(card => card.reviewHistory.length === 0)) {
      return { current: 0, longest: 0 };
    }
    
    // Get all unique review dates
    const reviewDates = new Set<string>();
    cards.forEach(card => {
      card.reviewHistory.forEach(review => {
        // Just get the date part
        reviewDates.add(review.date.split('T')[0]);
      });
    });
    
    const sortedDates = Array.from(reviewDates).sort();
    
    // Calculate current streak
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    // Format dates as YYYY-MM-DD for comparison
    const todayStr = today.toISOString().split('T')[0];
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    // Check if studied today or yesterday
    let currentStreak = 0;
    if (reviewDates.has(todayStr)) {
      currentStreak = 1;
      
      // Count backwards from yesterday
      let checkDate = yesterday;
      let formattedDate = yesterdayStr;
      
      while (reviewDates.has(formattedDate)) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
        formattedDate = checkDate.toISOString().split('T')[0];
      }
    } else if (reviewDates.has(yesterdayStr)) {
      currentStreak = 1;
      
      // Count backwards from the day before yesterday
      let checkDate = new Date(yesterday);
      checkDate.setDate(checkDate.getDate() - 1);
      let formattedDate = checkDate.toISOString().split('T')[0];
      
      while (reviewDates.has(formattedDate)) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
        formattedDate = checkDate.toISOString().split('T')[0];
      }
    }
    
    // Calculate longest streak
    let longestStreak = 0;
    let currentRun = 1;
    
    for (let i = 1; i < sortedDates.length; i++) {
      const prevDate = new Date(sortedDates[i - 1]);
      const currDate = new Date(sortedDates[i]);
      
      const diffTime = currDate.getTime() - prevDate.getTime();
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) {
        // Consecutive day
        currentRun++;
      } else {
        // Streak broken
        longestStreak = Math.max(longestStreak, currentRun);
        currentRun = 1;
      }
    }
    
    // Check if the final run is the longest
    longestStreak = Math.max(longestStreak, currentRun);
    
    return { current: currentStreak, longest: longestStreak };
  };

  const studyEffectiveness = useMemo(() => {
    let relevantReviews = 0;
    let correctRelevantReviews = 0;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    propCards.forEach(card => {
      // Only consider cards that have progressed beyond initial learning or are being relearned
      // This is a proxy: ideally, we'd know the stage at the time of each review.
      // We consider a card mature if it's in review/relearning OR has history beyond a simple new card.
      const isPotentiallyMatureCard = card.scheduling.learningStage === 'review' || 
                                   card.scheduling.learningStage === 'relearning' || 
                                   card.reviewHistory.length > 1; // Simple heuristic

      if (isPotentiallyMatureCard) {
        card.reviewHistory.forEach(review => {
          const reviewDate = new Date(review.date);
          if (reviewDate >= thirtyDaysAgo) {
            relevantReviews++;
            if (review.rating >= 3) {
              correctRelevantReviews++;
            }
          }
        });
      }
    });

    return relevantReviews > 0 ? Math.round((correctRelevantReviews / relevantReviews) * 100) : 0;
  }, [propCards]);

  const retentionCurveData = useMemo<RetentionDataPoint[]>(() => {
    const intervalBuckets = [
      { label: '1d', min: 1, max: 1, reviews: 0, successes: 0 },
      { label: '2d', min: 2, max: 2, reviews: 0, successes: 0 },
      { label: '3-4d', min: 3, max: 4, reviews: 0, successes: 0 },
      { label: '5-7d', min: 5, max: 7, reviews: 0, successes: 0 },
      { label: '8-14d', min: 8, max: 14, reviews: 0, successes: 0 },
      { label: '15-30d', min: 15, max: 30, reviews: 0, successes: 0 },
      { label: '31-60d', min: 31, max: 60, reviews: 0, successes: 0 },
      { label: '61-90d', min: 61, max: 90, reviews: 0, successes: 0 },
      { label: '>90d', min: 91, max: Infinity, reviews: 0, successes: 0 },
    ];

    // Use all cards passed to the dashboard, filtering out archived ones for this global analytic
    const activeCards = propCards.filter(card => !card.archived);

    activeCards.forEach(card => {
      card.reviewHistory.forEach(review => {
        if (review.intervalBeforeReview !== undefined && review.intervalBeforeReview > 0) {
          const bucket = intervalBuckets.find(b => review.intervalBeforeReview! >= b.min && review.intervalBeforeReview! <= b.max);
          if (bucket) {
            bucket.reviews++;
            if (review.rating >= 3) { // Assuming rating >= 3 is a success
              bucket.successes++;
            }
          }
        }
      });
    });

    return intervalBuckets.map(b => ({
      label: b.label,
      retention: b.reviews > 0 ? Math.round((b.successes / b.reviews) * 100) : 0,
      reviews: b.reviews,
      successes: b.successes
    })).filter(b => b.reviews >= 1); // Show bucket if it has at least 1 review, (was >=5 in Dashboard)
  }, [propCards]);

  const studyTimeDistributionData = useMemo<HourStatDataPoint[]>(() => {
    const hourStats: { [hour: number]: { count: number; sumRating: number } } = {};
    for (let i = 0; i < 24; i++) {
      hourStats[i] = { count: 0, sumRating: 0 }; // Initialize all hours
    }

    const activeCards = propCards.filter(card => !card.archived);
    activeCards.forEach(card => {
      card.reviewHistory.forEach(r => {
        const reviewDate = new Date(r.date);
        const hour = reviewDate.getHours();
        hourStats[hour].count++;
        hourStats[hour].sumRating += r.rating;
      });
    });

    return Object.entries(hourStats).map(([h, stat]) => {
      const hourNum = parseInt(h);
      const ampm = hourNum >= 12 ? 'PM' : 'AM';
      const displayHour = hourNum % 12 === 0 ? 12 : hourNum % 12;
      return {
        hour: `${displayHour} ${ampm}`,
        reviews: stat.count,
        avgRating: stat.count > 0 ? parseFloat((stat.sumRating / stat.count).toFixed(2)) : 0,
      };
    });
  }, [propCards]);

  const timePerDifficultyData = useMemo<TimePerDifficultyDataPoint[]>(() => {
    const difficultyMap: { [rating: number]: { totalTime: number; count: number } } = {};
    const ratingLabels: { [rating: number]: string } = {
      0: 'Again',
      1: 'Hard',
      2: 'Medium-Hard',
      3: 'Good',
      4: 'Easy',
      5: 'Very Easy'
    };

    propCards.forEach(card => {
      card.reviewHistory.forEach(review => {
        if (review.msToAnswer !== undefined && review.rating !== undefined) {
          if (!difficultyMap[review.rating]) {
            difficultyMap[review.rating] = { totalTime: 0, count: 0 };
          }
          difficultyMap[review.rating].totalTime += review.msToAnswer;
          difficultyMap[review.rating].count++;
        }
      });
    });

    return Object.entries(difficultyMap).map(([ratingStr, data]) => {
      const rating = parseInt(ratingStr);
      return {
        difficulty: ratingLabels[rating] || `Rating ${rating}`,
        averageTime: data.count > 0 ? parseFloat(((data.totalTime / data.count) / 1000).toFixed(2)) : 0, // in seconds
        count: data.count,
      };
    }).sort((a,b) => {
        // Try to sort by a logical difficulty order if possible
        const order = ['Again', 'Hard', 'Medium-Hard', 'Good', 'Easy', 'Very Easy'];
        return order.indexOf(a.difficulty) - order.indexOf(b.difficulty);
    });
  }, [propCards]);

  const timePerSubjectData = useMemo<TimePerSubjectDataPoint[]>(() => {
    const tagTime: { [tag: string]: number } = {};
    propCards.forEach(card => {
      if (!card.archived && card.tags && card.tags.length > 0) {
        const totalTimeForCardMs = card.reviewHistory.reduce((sum, rh) => sum + (rh.msToAnswer || 0), 0);
        card.tags.forEach(tag => {
          tagTime[tag] = (tagTime[tag] || 0) + totalTimeForCardMs;
        });
      }
    });
    return Object.entries(tagTime).map(([tag, totalTimeMs]) => ({
      subject: tag,
      totalTimeMinutes: parseFloat((totalTimeMs / (1000 * 60)).toFixed(1)), // in minutes
    })).filter(data => data.totalTimeMinutes > 0).sort((a,b) => b.totalTimeMinutes - a.totalTimeMinutes);
  }, [propCards]);

  const PIE_CHART_COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#FF5733', '#33FF57', '#3357FF', '#FF33A1', '#A133FF'];

  const reviewForecastData = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const days: { date: string; label: string; dueCount: number }[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      days.push({
        date: d.toISOString().slice(0, 10),
        label: i === 0 ? 'Today' : d.toLocaleDateString(undefined, { weekday: 'short' }),
        dueCount: 0,
      });
    }
    const activeCards = propCards.filter(card => !card.archived);
    activeCards.forEach(card => {
      if (card.scheduling && card.scheduling.dueDate) {
        const due = new Date(card.scheduling.dueDate);
        due.setHours(0, 0, 0, 0);
        const diffDays = Math.floor((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays >= 0 && diffDays < 7) {
          days[diffDays].dueCount++;
        }
      }
    });
    return days;
  }, [propCards]);

  const streaksData = useMemo(() => {
    // Gather all review dates (YYYY-MM-DD) from all cards
    const reviewDaysSet = new Set<string>();
    propCards.forEach(card => {
      card.reviewHistory.forEach(r => {
        const d = new Date(r.date);
        d.setHours(0, 0, 0, 0);
        reviewDaysSet.add(d.toISOString().slice(0, 10));
      });
    });
    if (reviewDaysSet.size === 0) {
      return {
        currentStreak: 0,
        longestStreak: 0,
        last30Days: [],
        reviewDaysSet,
      };
    }
    // Build last 30 days array (oldest to newest)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const last30Days: { date: string; reviewed: boolean }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      last30Days.push({ date: dateStr, reviewed: reviewDaysSet.has(dateStr) });
    }
    // Calculate streaks
    let currentStreak = 0;
    let longestStreak = 0;
    let streak = 0;
    for (let i = 0; i < last30Days.length; i++) {
      if (last30Days[i].reviewed) {
        streak++;
        if (streak > longestStreak) longestStreak = streak;
      } else {
        streak = 0;
      }
    }
    // Current streak: count back from today
    for (let i = last30Days.length - 1; i >= 0; i--) {
      if (last30Days[i].reviewed) {
        currentStreak++;
      } else {
        break;
      }
    }
    return {
      currentStreak,
      longestStreak,
      last30Days,
      reviewDaysSet,
    };
  }, [propCards]);

  const weakSpotsData = useMemo(() => {
    const activeCards = propCards.filter(card => !card.archived);
    const weakCards = activeCards.filter(card => getCardStrength(card) === 'weak');
    // Optionally, sort by last reviewed or ease factor, and limit the count
    return weakCards.map(card => ({
      id: card.id,
      front: card.front.replace(/<[^>]+>/g, '').substring(0, 60) + (card.front.length > 60 ? '...' : ''), // Basic sanitize & truncate
      tags: card.tags || [],
      easeFactor: card.scheduling.easeFactor,
      lastReviewed: card.reviewHistory.length > 0 ? new Date(card.reviewHistory[card.reviewHistory.length - 1].date).toLocaleDateString() : 'Never',
    })).slice(0, 10); // Show top 10 weak cards for now
  }, [propCards]);

  // --- Gamification: Achievements --- 
  interface Achievement {
    id: string;
    name: string;
    description: string;
    icon: string; // Placeholder for icon, e.g., emoji or class name
    isUnlocked: boolean;
    unlockDate?: string; // ISO string
    tier?: 'bronze' | 'silver' | 'gold'; // Optional tier for advanced display
  }

  const achievementsList: Omit<Achievement, 'isUnlocked' | 'unlockDate'>[] = [
    {
      id: 'welcome',
      name: 'Welcome Explorer',
      description: 'Completed your first review session.',
      icon: '🧭',
      tier: 'bronze',
    },
    {
      id: 'streak7',
      name: 'Committed Learner',
      description: 'Maintained a 7-day study streak.',
      icon: '🔥',
      tier: 'bronze',
    },
    {
      id: 'streak15',
      name: 'Dedicated Scholar',
      description: 'Maintained a 15-day study streak.',
      icon: '🌟',
      tier: 'silver',
    },
    {
      id: 'mastered25',
      name: 'Knowledge Builder',
      description: 'Mastered 25 cards.',
      icon: '🧠',
      tier: 'silver',
    },
    {
      id: 'created50',
      name: 'Card Architect',
      description: 'Created 50 cards.',
      icon: '🛠️',
      tier: 'gold',
    },
    // Add more achievements here, e.g., for mastering 100 cards, 30-day streak, completing a deck
  ];

  const unlockedAchievementsData = useMemo<Achievement[]>(() => {
    const today = new Date().toISOString();
    const unlocked: Achievement[] = [];

    // Welcome Explorer: Has at least one review in history
    const hasAnyReview = propCards.some(c => c.reviewHistory.length > 0);
    if (hasAnyReview) {
      const achievement = achievementsList.find(a => a.id === 'welcome')!;
      unlocked.push({ ...achievement, isUnlocked: true, unlockDate: today });
    }

    // Streak Achievements (using streaksData)
    if (streaksData.longestStreak >= 7) {
      const achievement = achievementsList.find(a => a.id === 'streak7')!;
      unlocked.push({ ...achievement, isUnlocked: true, unlockDate: today });
    }
    if (streaksData.longestStreak >= 15) {
      const achievement = achievementsList.find(a => a.id === 'streak15')!;
      unlocked.push({ ...achievement, isUnlocked: true, unlockDate: today });
    }

    // Knowledge Builder: Mastered 25 cards
    const masteredCardsCount = propCards.filter(
      c => !c.archived && c.scheduling.learningStage === 'review' && c.scheduling.easeFactor >= 2.5
    ).length;
    if (masteredCardsCount >= 25) {
      const achievement = achievementsList.find(a => a.id === 'mastered25')!;
      unlocked.push({ ...achievement, isUnlocked: true, unlockDate: today });
    }

    // Card Architect: Created 50 cards
    if (propCards.length >= 50) {
      const achievement = achievementsList.find(a => a.id === 'created50')!;
      unlocked.push({ ...achievement, isUnlocked: true, unlockDate: today });
    }

    // Combine with all achievements, marking locked ones
    return achievementsList.map(ach => {
      const foundUnlocked = unlocked.find(uAch => uAch.id === ach.id);
      if (foundUnlocked) return foundUnlocked;
      return { ...ach, isUnlocked: false }; 
    });

  }, [propCards, streaksData, achievementsList]);

  // --- Data for Mastery Over Time Chart ---
  interface MasteryOverTimeDataPoint {
    date: string; // YYYY-MM-DD
    label: string; // e.g., "Mon", "10/15"
    reviewsOnMasteredCards: number;
  }

  const masteryOverTimeData = useMemo<MasteryOverTimeDataPoint[]>(() => {
    const N_DAYS = 30; // Look back N days
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dataPoints: MasteryOverTimeDataPoint[] = [];
    for (let i = N_DAYS - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      dataPoints.push({
        date: d.toISOString().slice(0, 10),
        label: d.toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' }),
        reviewsOnMasteredCards: 0,
      });
    }

    const currentlyMasteredCardIds = new Set(
      propCards
        .filter(c => !c.archived && c.scheduling.learningStage === 'review' && c.scheduling.easeFactor >= 2.5)
        .map(c => c.id)
    );

    if (currentlyMasteredCardIds.size === 0) {
      return dataPoints; // No mastered cards, so no reviews on them
    }

    propCards.forEach(card => {
      if (currentlyMasteredCardIds.has(card.id)) {
        card.reviewHistory.forEach(review => {
          const reviewDateStr = review.date.slice(0, 10);
          const point = dataPoints.find(p => p.date === reviewDateStr);
          if (point) {
            point.reviewsOnMasteredCards++;
          }
        });
      }
    });

    return dataPoints;
  }, [propCards]);

  // --- Data for 7-Day Avg Retention & Study Time --- 
  interface PerformanceSnapshotData {
    sevenDayRetentionRate: number;
    totalWeeklyStudyTimeMs: number;
    avgDailyStudyTimeMs: number; // Over the last 7 days
  }

  const performanceSnapshot = useMemo<PerformanceSnapshotData>(() => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0,0,0,0);

    let reviewsInLast7Days = 0;
    let successfulReviewsInLast7Days = 0;
    let totalStudyTimeMsInLast7Days = 0;
    // const dailyStudyTimeMsMap = new Map<string, number>(); // Not strictly needed for current avg calc

    propCards.forEach(card => {
      if (card.archived) return;
      card.reviewHistory.forEach(review => {
        const reviewDate = new Date(review.date);
        if (reviewDate >= sevenDaysAgo) {
          reviewsInLast7Days++;
          if (review.rating >= 3) {
            successfulReviewsInLast7Days++;
          }
          if (review.msToAnswer) {
            totalStudyTimeMsInLast7Days += review.msToAnswer;
            // const dateStr = reviewDate.toISOString().slice(0,10);
            // dailyStudyTimeMsMap.set(dateStr, (dailyStudyTimeMsMap.get(dateStr) || 0) + review.msToAnswer);
          }
        }
      });
    });

    const sevenDayRetentionRate = reviewsInLast7Days > 0 
      ? Math.round((successfulReviewsInLast7Days / reviewsInLast7Days) * 100) 
      : 0;
    
    const avgDailyStudyTimeMs = totalStudyTimeMsInLast7Days / 7;

    return {
      sevenDayRetentionRate,
      totalWeeklyStudyTimeMs: totalStudyTimeMsInLast7Days,
      avgDailyStudyTimeMs,
    };
  }, [propCards]);

  // Helper for getting query parameters
  const getQueryParam = (param: string): string | null => {
    const params = new URLSearchParams(window.location.search);
    return params.get(param);
  };

  if (isLoading) {
    return (
      <div className="analytics-dashboard loading">
        <div className="loading-spinner"></div>
        <p>Loading your analytics...</p>
      </div>
    );
  }

  return (
    <div className="analytics-dashboard">
      <h1>Analytics Dashboard</h1>
      
      <div className="stats-summary">
        <div className="stat-card">
          <div className="stat-value">{totalCards}</div>
          <div className="stat-label">Total Cards</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-value">{totalReviews}</div>
          <div className="stat-label">Total Reviews</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-value">{averageEaseFactor.toFixed(2)}</div>
          <div className="stat-label">Avg. Ease Factor</div>
        </div>
        
        <div className="stat-card">
          <div className="stat-value">{streakData.current}</div>
          <div className="stat-label">Current Streak</div>
          <div className="stat-secondary">Longest: {streakData.longest}</div>
        </div>
      </div>
      
      <div className="analytics-content">
        <div className="chart-section">
          <MasteryChart 
            cards={allCards} 
            timeRange={timeRange}
          />
        </div>
        
        <div className="chart-section">
          <div className="card-style">
            <h3 className="chart-title">Learning Stages Distribution</h3>
            <div className="stages-distribution">
              <div className="stage-item">
                <div className="stage-label">Learning</div>
                <div className="stage-bar-container">
                  <div 
                    className="stage-bar learning"
                    style={{ 
                      width: `${allCards.length ? (learningStages.learning / allCards.length) * 100 : 0}%` 
                    }}
                  ></div>
                </div>
                <div className="stage-value">{learningStages.learning}</div>
              </div>
              
              <div className="stage-item">
                <div className="stage-label">Review</div>
                <div className="stage-bar-container">
                  <div 
                    className="stage-bar review"
                    style={{ 
                      width: `${allCards.length ? (learningStages.review / allCards.length) * 100 : 0}%` 
                    }}
                  ></div>
                </div>
                <div className="stage-value">{learningStages.review}</div>
              </div>
              
              <div className="stage-item">
                <div className="stage-label">Relearning</div>
                <div className="stage-bar-container">
                  <div 
                    className="stage-bar relearning"
                    style={{ 
                      width: `${allCards.length ? (learningStages.relearning / allCards.length) * 100 : 0}%` 
                    }}
                  ></div>
                </div>
                <div className="stage-value">{learningStages.relearning}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="insight-cards">
        <div className="insight-card">
          <h3>Learning Insights</h3>
          <p>
            {allCards.length > 0 
              ? `You're currently studying ${allCards.length} cards. The average ease factor of ${averageEaseFactor.toFixed(2)} indicates ${averageEaseFactor > 2.5 ? 'good retention' : averageEaseFactor > 2.1 ? 'moderate difficulty' : 'challenging material'}.`
              : 'Start adding cards to see your learning insights.'}
          </p>
          {streakData.current > 0 && (
            <p>
              Your current streak is {streakData.current} day{streakData.current !== 1 ? 's' : ''}. Keep it going!
            </p>
          )}
        </div>
        
        <div className="insight-card">
          <h3>Recommendations</h3>
          <ul>
            {learningStages.learning > 0 && (
              <li>You have {learningStages.learning} new cards in learning mode. Focus on these to build your knowledge base.</li>
            )}
            {learningStages.relearning > 0 && (
              <li>Pay attention to the {learningStages.relearning} cards in relearning - these concepts need reinforcement.</li>
            )}
            {learningStages.review > 30 && (
              <li>You have a large number of cards in review. Consider increasing your daily review limit.</li>
            )}
            {averageEaseFactor < 2.0 && allCards.length > 10 && (
              <li>Your cards seem challenging (low ease factor). Try breaking complex topics into smaller cards.</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;