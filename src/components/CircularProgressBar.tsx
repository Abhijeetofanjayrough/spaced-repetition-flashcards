import React, { useEffect, useState } from 'react';
import '../styles/CircularProgressBar.css';

interface CircularProgressBarProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  circleColor?: string;
  progressColor?: string;
  textColor?: string;
  showPercentage?: boolean;
  text?: string;
  animated?: boolean;
}

const CircularProgressBar: React.FC<CircularProgressBarProps> = ({
  percentage,
  size = 70,
  strokeWidth = 6,
  circleColor = 'var(--border-color)',
  progressColor = 'var(--primary-color)',
  textColor = 'var(--text-color)',
  showPercentage = true,
  text,
  animated = true
}) => {
  const [animatedPercentage, setAnimatedPercentage] = useState(0);
  
  // Calculate the properties for the SVG
  const center = size / 2;
  const radius = center - strokeWidth / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (circumference * Math.min(100, Math.max(0, animatedPercentage))) / 100;
  
  useEffect(() => {
    if (animated) {
      // Animate the percentage from 0 to the target value
      const timer = setTimeout(() => {
        if (animatedPercentage < percentage) {
          setAnimatedPercentage(prev => Math.min(percentage, prev + 1));
        } else if (animatedPercentage > percentage) {
          setAnimatedPercentage(prev => Math.max(percentage, prev - 1));
        }
      }, 10);
      return () => clearTimeout(timer);
    } else {
      setAnimatedPercentage(percentage);
    }
  }, [percentage, animatedPercentage, animated]);
  
  // Generate a gradient for the progress arc
  const progressGradient = 
    percentage < 30 ? 'var(--danger-color)' : 
    percentage < 60 ? 'var(--warning-color)' : 
    percentage < 80 ? 'var(--info-color)' : 
    'var(--success-color)';
  
  return (
    <div className="circular-progress" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Background circle */}
        <circle
          className="circular-progress-background"
          cx={center}
          cy={center}
          r={radius}
          stroke={circleColor}
          strokeWidth={strokeWidth}
        />
        
        {/* Progress circle */}
        <circle
          className="circular-progress-value"
          cx={center}
          cy={center}
          r={radius}
          stroke={progressColor || progressGradient}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
        />
      </svg>
      
      {(showPercentage || text) && (
        <div 
          className="circular-progress-text" 
          style={{ color: textColor, fontSize: `${size / 5}px` }}
        >
          {text || `${Math.round(animatedPercentage)}%`}
        </div>
      )}
    </div>
  );
};

export default CircularProgressBar; 