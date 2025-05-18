import React from 'react';
import './CircularProgressBar.css';

interface CircularProgressBarProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  baseColor?: string; // If provided, overrides CSS default
  progressColor?: string;
  gradientId?: string;
  innerText?: string;
  textColor?: string; // If provided, overrides CSS default for text
}

const CircularProgressBar: React.FC<CircularProgressBarProps> = ({
  percentage,
  size = 60,
  strokeWidth = 6,
  baseColor, // REMOVE DEFAULT HERE, CSS will handle it unless overridden
  progressColor = '#4caf50',
  gradientId,
  innerText,
  textColor
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  const baseCircleStyle: React.CSSProperties = {};
  if (baseColor) {
    baseCircleStyle.stroke = baseColor; // Apply prop if it exists
  }

  const textStyle: React.CSSProperties = {};
  if (textColor) {
    textStyle.fill = textColor; // Apply prop if it exists
  }

  return (
    <svg
      className="circular-progress-bar"
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
    >
      {gradientId && (
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={progressColor} /> 
            <stop offset="100%" stopColor={progressColor} />
            {/* TODO: Add gradient stops if progressColor is a gradient definition object */}
          </linearGradient>
        </defs>
      )}
      <circle
        className="progress-bar-base"
        style={baseCircleStyle} // APPLY CONDITIONAL STYLE
        strokeWidth={strokeWidth}
        r={radius}
        cx={size / 2}
        cy={size / 2}
      />
      <circle
        className="progress-bar-progress"
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        stroke={gradientId ? `url(#${gradientId})` : progressColor}
        r={radius}
        cx={size / 2}
        cy={size / 2}
        transform={`rotate(-90 ${size/2} ${size/2})`}
      />
      {innerText && (
        <text 
          className="progress-bar-text"
          style={textStyle} // APPLY CONDITIONAL STYLE
          x="50%" 
          y="50%" 
          dy=".3em" 
          textAnchor="middle"
          fontSize={(size * 0.2).toString() + 'px'} // Dynamic font size based on overall size
        >
          {innerText}
        </text>
      )}
    </svg>
  );
};

export default CircularProgressBar; 