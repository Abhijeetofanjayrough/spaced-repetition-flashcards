import React, { useState, useEffect } from 'react';
import './FocusMode.css';

interface FocusModeProps {
  isActive: boolean;
  onToggle: (active: boolean) => void;
  duration?: number; // duration in minutes, default 25 (pomodoro)
  onComplete?: () => void;
}

const FocusMode: React.FC<FocusModeProps> = ({
  isActive,
  onToggle,
  duration = 25,
  onComplete
}) => {
  const [timeRemaining, setTimeRemaining] = useState(duration * 60); // convert to seconds
  const [isPaused, setIsPaused] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [customDuration, setCustomDuration] = useState(duration);
  const [backgroundNoise, setBackgroundNoise] = useState<'none' | 'white' | 'brown' | 'nature'>('none');
  const [volume, setVolume] = useState(50);
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);

  // Initialize audio based on backgroundNoise selection
  useEffect(() => {
    if (backgroundNoise === 'none') {
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
      }
      setAudio(null);
      return;
    }

    let audioSrc = '';
    switch (backgroundNoise) {
      case 'white':
        audioSrc = '/sounds/white-noise.mp3';
        break;
      case 'brown':
        audioSrc = '/sounds/brown-noise.mp3';
        break;
      case 'nature':
        audioSrc = '/sounds/nature-sounds.mp3';
        break;
    }

    const newAudio = new Audio(audioSrc);
    newAudio.loop = true;
    newAudio.volume = volume / 100;
    setAudio(newAudio);

    return () => {
      newAudio.pause();
      newAudio.currentTime = 0;
    };
  }, [backgroundNoise]);

  // Update audio volume when changed
  useEffect(() => {
    if (audio) {
      audio.volume = volume / 100;
    }
  }, [volume, audio]);

  // Timer countdown effect
  useEffect(() => {
    let timer: NodeJS.Timeout;

    if (isActive && !isPaused && timeRemaining > 0) {
      timer = setInterval(() => {
        setTimeRemaining(prev => prev - 1);
      }, 1000);
    } else if (timeRemaining === 0 && isActive) {
      // Timer completed
      if (onComplete) {
        onComplete();
      }
      
      // Play completion sound
      const completionSound = new Audio('/sounds/complete.mp3');
      completionSound.play();
      
      // Show notification if allowed
      if (Notification.permission === 'granted') {
        new Notification('Focus Session Complete!', {
          body: 'Great job! Take a short break before starting again.',
          icon: '/logo192.png'
        });
      }
    }

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isActive, isPaused, timeRemaining, onComplete]);

  // Play/pause background noise
  useEffect(() => {
    if (audio) {
      if (isActive && !isPaused) {
        audio.play().catch(error => {
          console.error('Error playing audio:', error);
        });
      } else {
        audio.pause();
      }
    }

    return () => {
      if (audio) {
        audio.pause();
      }
    };
  }, [isActive, isPaused, audio]);

  // Handle toggle focus mode
  const handleToggle = () => {
    if (!isActive) {
      // Starting new session
      setTimeRemaining(customDuration * 60);
      onToggle(true);
      setIsPaused(false);
      
      // Request notification permission if needed
      if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
        Notification.requestPermission();
      }
    } else {
      // Ending session
      onToggle(false);
      setIsPaused(false);
    }
  };

  // Format time for display (MM:SS)
  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Apply settings and start/restart timer
  const applySettings = () => {
    setTimeRemaining(customDuration * 60);
    setShowSettings(false);
    if (isActive) {
      setIsPaused(false);
    }
  };

  return (
    <div className={`focus-mode ${isActive ? 'active' : ''}`}>
      {isActive && (
        <div className="focus-overlay">
          <div className="focus-timer">
            <h2>Focus Mode</h2>
            <div className="timer-display">{formatTime(timeRemaining)}</div>
            
            <div className="focus-controls">
              <button 
                className="control-button"
                onClick={() => setIsPaused(!isPaused)}
              >
                {isPaused ? '▶️ Resume' : '⏸️ Pause'}
              </button>
              
              <button 
                className="control-button"
                onClick={() => setShowSettings(!showSettings)}
              >
                ⚙️ Settings
              </button>
              
              <button 
                className="control-button end-button"
                onClick={handleToggle}
              >
                🚫 End Focus Mode
              </button>
            </div>
            
            {showSettings && (
              <div className="focus-settings">
                <h3>Focus Settings</h3>
                
                <div className="setting-row">
                  <label>Duration (minutes):</label>
                  <input 
                    type="number" 
                    min="1" 
                    max="120" 
                    value={customDuration}
                    onChange={(e) => setCustomDuration(Math.max(1, Math.min(120, parseInt(e.target.value) || 25)))}
                  />
                </div>
                
                <div className="setting-row">
                  <label>Background sound:</label>
                  <select 
                    value={backgroundNoise}
                    onChange={(e) => setBackgroundNoise(e.target.value as 'none' | 'white' | 'brown' | 'nature')}
                  >
                    <option value="none">None</option>
                    <option value="white">White Noise</option>
                    <option value="brown">Brown Noise</option>
                    <option value="nature">Nature Sounds</option>
                  </select>
                </div>
                
                {backgroundNoise !== 'none' && (
                  <div className="setting-row">
                    <label>Volume: {volume}%</label>
                    <input 
                      type="range" 
                      min="0" 
                      max="100" 
                      value={volume}
                      onChange={(e) => setVolume(parseInt(e.target.value))}
                    />
                  </div>
                )}
                
                <button 
                  className="apply-button"
                  onClick={applySettings}
                >
                  Apply Settings
                </button>
              </div>
            )}
            
            <div className="focus-tips">
              <h4>Stay Focused</h4>
              <ul>
                <li>Keep working on your flashcards without distractions</li>
                <li>Take a short break when the timer ends</li>
                <li>Consider the Pomodoro technique (25 min focus, 5 min break)</li>
              </ul>
            </div>
          </div>
        </div>
      )}
      
      {!isActive && (
        <button 
          className="focus-toggle-button"
          onClick={handleToggle}
          title="Enter Focus Mode"
        >
          <span className="focus-icon">🎯</span>
          <span className="focus-text">Focus Mode</span>
        </button>
      )}
    </div>
  );
};

export default FocusMode; 