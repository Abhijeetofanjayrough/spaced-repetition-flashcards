import React, { useState, useEffect, useRef } from 'react';
import { Card } from '../models/Card';
import Flashcard from './Flashcard';
import './ChallengeMode.css';
import { useNavigate } from 'react-router-dom';
import Confetti from 'react-confetti';

interface ChallengeModeProps {
  cards: Card[];
  onComplete: (results: ChallengeResults) => void;
  onExit: () => void;
}

export interface ChallengeResults {
  totalCards: number;
  correctAnswers: number;
  totalTimeMs: number;
  averageTimePerCardMs: number;
  bestTimeMs: number;
  worstTimeMs: number;
  startTime: string;
  endTime: string;
  streakLongest: number;
}

// Achievement data
const ACHIEVEMENTS = {
  SPEED_DEMON: { title: 'Speed Demon', description: 'Answer 5 cards in under 10 seconds each' },
  PERFECT_RECALL: { title: 'Perfect Recall', description: 'Get 100% accuracy on a challenge' },
  STREAK_MASTER: { title: 'Streak Master', description: 'Get a streak of 10 correct answers' },
  CHALLENGE_COMPLETE: { title: 'Challenge Champion', description: 'Complete a challenge with at least 80% accuracy' }
};

const ChallengeMode: React.FC<ChallengeModeProps> = ({ cards, onComplete, onExit }) => {
  const navigate = useNavigate();
  const [shuffledCards, setShuffledCards] = useState<Card[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [endTime, setEndTime] = useState<Date | null>(null);
  const [currentCardStartTime, setCurrentCardStartTime] = useState<number>(0);
  const [cardTimes, setCardTimes] = useState<number[]>([]);
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [isStarting, setIsStarting] = useState(true);
  const [achievements, setAchievements] = useState<string[]>([]);
  const [showAchievement, setShowAchievement] = useState<string | null>(null);

  // Initialize challenge
  useEffect(() => {
    // Shuffle cards
    const shuffled = [...cards].sort(() => Math.random() - 0.5);
    setShuffledCards(shuffled);
    
    // Start countdown
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          setIsStarting(false);
          setStartTime(new Date());
          setCurrentCardStartTime(Date.now());
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [cards]);

  // Handle showing answer
  const handleShowAnswer = () => {
    setShowAnswer(true);
    
    // Record time for this card
    const timeToAnswer = Date.now() - currentCardStartTime;
    setCardTimes(prev => [...prev, timeToAnswer]);
  };

  // Handle user's answer (correct or incorrect)
  const handleAnswerRating = (correct: boolean) => {
    // Update stats
    if (correct) {
      setCorrectAnswers(prev => prev + 1);
      setCurrentStreak(prev => prev + 1);
      
      // Update longest streak
      if (currentStreak + 1 > longestStreak) {
        setLongestStreak(currentStreak + 1);
        
        // Check for streak achievement
        if (currentStreak + 1 >= 10 && !achievements.includes('STREAK_MASTER')) {
          const newAchievements = [...achievements, 'STREAK_MASTER'];
          setAchievements(newAchievements);
          setShowAchievement('STREAK_MASTER');
          setTimeout(() => setShowAchievement(null), 3000);
        }
      }
    } else {
      // Reset streak on wrong answer
      setCurrentStreak(0);
    }
    
    // Move to next card or complete challenge
    if (currentCardIndex < shuffledCards.length - 1) {
      setCurrentCardIndex(currentCardIndex + 1);
      setShowAnswer(false);
      setCurrentCardStartTime(Date.now());
    } else {
      // Challenge complete
      completeChallenge();
    }
  };
  
  // Complete the challenge and calculate results
  const completeChallenge = () => {
    const end = new Date();
    setEndTime(end);
    setIsComplete(true);
    
    // Calculate results
    const totalTimeMs = end.getTime() - (startTime?.getTime() || 0);
    const bestTimeMs = Math.min(...cardTimes);
    const worstTimeMs = Math.max(...cardTimes);
    const averageTimePerCardMs = totalTimeMs / shuffledCards.length;
    const accuracy = (correctAnswers / shuffledCards.length) * 100;
    
    // Check for achievements
    const newAchievements = [...achievements];
    
    // Speed Demon achievement
    const fastCards = cardTimes.filter(time => time < 10000).length;
    if (fastCards >= 5 && !newAchievements.includes('SPEED_DEMON')) {
      newAchievements.push('SPEED_DEMON');
    }
    
    // Perfect Recall achievement
    if (accuracy === 100 && !newAchievements.includes('PERFECT_RECALL')) {
      newAchievements.push('PERFECT_RECALL');
    }
    
    // Challenge Champion achievement
    if (accuracy >= 80 && !newAchievements.includes('CHALLENGE_COMPLETE')) {
      newAchievements.push('CHALLENGE_COMPLETE');
    }
    
    setAchievements(newAchievements);
    setShowConfetti(true);
    
    // Send results to parent component
    onComplete({
      totalCards: shuffledCards.length,
      correctAnswers,
      totalTimeMs,
      averageTimePerCardMs,
      bestTimeMs,
      worstTimeMs,
      startTime: startTime?.toISOString() || new Date().toISOString(),
      endTime: end.toISOString(),
      streakLongest: longestStreak
    });
    
    // Hide confetti after 5 seconds
    setTimeout(() => setShowConfetti(false), 5000);
  };
  
  // Format time for display
  const formatTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    const seconds = Math.floor(ms / 1000);
    const remainingMs = ms % 1000;
    return seconds < 60 
      ? `${seconds}.${Math.floor(remainingMs / 100)}s`
      : `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
  };

  // If still counting down
  if (isStarting) {
    return (
      <div className="challenge-container">
        <div className="challenge-countdown">
          <h2>Challenge Mode</h2>
          <p>Get ready! Answer as many cards correctly as you can.</p>
          <div className="countdown-number">{countdown}</div>
        </div>
      </div>
    );
  }
  
  // If challenge is complete
  if (isComplete && endTime && startTime) {
    const accuracy = (correctAnswers / shuffledCards.length) * 100;
    const totalTime = endTime.getTime() - startTime.getTime();
    
    return (
      <div className="challenge-container">
        {showConfetti && <Confetti />}
        <div className="challenge-complete">
          <h2>Challenge Complete!</h2>
          
          <div className="challenge-results">
            <div className="challenge-result-item">
              <div className="result-value">{shuffledCards.length}</div>
              <div className="result-label">Total Cards</div>
            </div>
            
            <div className="challenge-result-item">
              <div className="result-value">{correctAnswers}</div>
              <div className="result-label">Correct Answers</div>
            </div>
            
            <div className="challenge-result-item">
              <div className="result-value">{accuracy.toFixed(1)}%</div>
              <div className="result-label">Accuracy</div>
            </div>
            
            <div className="challenge-result-item">
              <div className="result-value">{formatTime(totalTime)}</div>
              <div className="result-label">Total Time</div>
            </div>
            
            <div className="challenge-result-item">
              <div className="result-value">{formatTime(totalTime / shuffledCards.length)}</div>
              <div className="result-label">Avg. Time/Card</div>
            </div>
            
            <div className="challenge-result-item">
              <div className="result-value">{longestStreak}</div>
              <div className="result-label">Longest Streak</div>
            </div>
          </div>
          
          <div className="challenge-message">
            {accuracy >= 90 ? "Outstanding performance! Your recall is exceptional!" :
             accuracy >= 75 ? "Great job! Your knowledge is solid." :
             accuracy >= 60 ? "Good effort! Keep practicing to improve." :
             "Keep studying these cards to build stronger recall."}
          </div>
          
          {achievements.length > 0 && (
            <div className="challenge-achievements">
              <h3>Achievements Earned</h3>
              <div className="achievement-list">
                {achievements.map(a => (
                  <div key={a} className="achievement-item">
                    <div className="achievement-icon">🏆</div>
                    <div className="achievement-name">{ACHIEVEMENTS[a as keyof typeof ACHIEVEMENTS].title}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <div className="challenge-complete-actions">
            <button 
              className="challenge-restart" 
              onClick={() => window.location.reload()}
            >
              Try Again
            </button>
            <button 
              className="challenge-home"
              onClick={onExit}
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  // Main challenge interface
  return (
    <div className="challenge-container">
      {/* Show achievement notification if earned */}
      {showAchievement && (
        <div className="challenge-achievement">
          <div className="achievement-icon">🏆</div>
          <div className="achievement-content">
            <div className="achievement-title">Achievement Unlocked!</div>
            <div className="achievement-description">
              {ACHIEVEMENTS[showAchievement as keyof typeof ACHIEVEMENTS].title}: {ACHIEVEMENTS[showAchievement as keyof typeof ACHIEVEMENTS].description}
            </div>
          </div>
        </div>
      )}
      
      <div className="challenge-header">
        <div className="challenge-progress">
          <div className="challenge-progress-text">
            {currentCardIndex + 1} / {shuffledCards.length}
          </div>
          <div className="challenge-progress-bar">
            <div 
              className="challenge-progress-fill" 
              style={{ width: `${((currentCardIndex + 1) / shuffledCards.length) * 100}%` }}
            ></div>
          </div>
        </div>
        
        <div className="challenge-stats">
          <div className="challenge-stat">
            <div className="challenge-stat-label">Streak</div>
            <div className="challenge-stat-value">{currentStreak}</div>
          </div>
          <div className="challenge-stat">
            <div className="challenge-stat-label">Correct</div>
            <div className="challenge-stat-value">{correctAnswers}</div>
          </div>
        </div>
      </div>
      
      <div className="challenge-card">
        <div className={`challenge-card-inner ${showAnswer ? 'flipped' : ''}`}>
          <div className="challenge-card-front">
            <div className="challenge-card-content" onClick={!showAnswer ? handleShowAnswer : undefined}>
              <div dangerouslySetInnerHTML={{ __html: shuffledCards[currentCardIndex]?.front || '' }} />
            </div>
          </div>
          <div className="challenge-card-back">
            <div className="challenge-card-content">
              <div dangerouslySetInnerHTML={{ __html: shuffledCards[currentCardIndex]?.back || '' }} />
            </div>
          </div>
        </div>
      </div>
      
      {!showAnswer ? (
        <div className="challenge-actions">
          <button className="challenge-button" onClick={handleShowAnswer}>
            Show Answer
          </button>
        </div>
      ) : (
        <div className="challenge-rating">
          <p>Did you get it right?</p>
          <div className="challenge-buttons">
            <button 
              className="challenge-button correct"
              onClick={() => handleAnswerRating(true)}
            >
              Correct ✓
            </button>
            <button 
              className="challenge-button incorrect"
              onClick={() => handleAnswerRating(false)}
            >
              Incorrect ✗
            </button>
          </div>
        </div>
      )}
      
      <div className="challenge-actions">
        <button className="challenge-exit" onClick={onExit}>
          Exit Challenge
        </button>
      </div>
    </div>
  );
};

export default ChallengeMode; 