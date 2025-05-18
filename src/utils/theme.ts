/**
 * Visual Design System for Spaced Repetition Flashcards
 */

export const colors = {
  // Primary Colors
  primary: '#3A7BDE', // Main Brand: Blue - Trust, knowledge
  secondary: '#42B883', // Secondary: Green - Progress, success
  accent: '#FF7750', // Accent: Coral - Attention, energy
  
  // Feedback Colors
  easy: '#4CAF50', // Green
  good: '#2196F3', // Blue
  hard: '#FFC107', // Amber
  again: '#F44336', // Red
  
  // Neutrals (Light mode)
  background: '#F8F9FA',
  cardFace: '#FFFFFF',
  text: '#212121',
  textSecondary: '#757575',
  divider: '#E0E0E0',
  
  // Neutrals (Dark mode - for future implementation)
  backgroundDark: '#121212',
  cardFaceDark: '#1E1E1E',
  textDark: '#E0E0E0',
  textSecondaryDark: '#ABABAB',
  dividerDark: '#333333',
  
  // Other UI Colors
  hover: 'rgba(58, 123, 222, 0.08)',
  selected: 'rgba(58, 123, 222, 0.16)',
  disabled: '#E0E0E0',
  shadow: 'rgba(0, 0, 0, 0.08)',
};

export const typography = {
  // Font Families 
  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', sans-serif",
  
  // Font sizes and line heights
  heading: {
    h1: { fontSize: '24px', lineHeight: 1.25, fontWeight: 700 },
    h2: { fontSize: '20px', lineHeight: 1.35, fontWeight: 600 },
    h3: { fontSize: '18px', lineHeight: 1.45, fontWeight: 600 },
  },
  body: { 
    regular: { fontSize: '16px', lineHeight: 1.5, fontWeight: 400 },
    medium: { fontSize: '16px', lineHeight: 1.5, fontWeight: 500 },
    small: { fontSize: '14px', lineHeight: 1.5, fontWeight: 400 },
    xs: { fontSize: '12px', lineHeight: 1.5, fontWeight: 400 },
  }
};

export const animation = {
  // Card transitions
  cardFlip: '0.6s cubic-bezier(0.4, 0.2, 0.2, 1)',
  buttonHover: '0.15s ease-in-out',
  fadeIn: '0.3s ease-in-out',
  
  // Key frame definitions (if needed)
  keyframes: {
    pulse: `
      @keyframes pulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.05); }
        100% { transform: scale(1); }
      }
    `,
  }
};

export const spacing = {
  xs: '4px',
  sm: '8px',
  md: '16px',
  lg: '24px',
  xl: '32px',
  xxl: '48px',
};

export const borders = {
  radius: {
    small: '4px',
    medium: '8px',
    large: '16px',
    circle: '50%',
  },
  width: {
    thin: '1px',
    medium: '2px',
    thick: '3px',
  }
};

export const shadows = {
  small: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)',
  medium: '0 3px 6px rgba(0,0,0,0.15), 0 2px 4px rgba(0,0,0,0.12)',
  large: '0 10px 20px rgba(0,0,0,0.15), 0 3px 6px rgba(0,0,0,0.10)',
  card: '0 2px 12px rgba(58,123,222,0.10)',
};

// Common component styles
export const componentStyles = {
  button: {
    primary: {
      background: colors.primary,
      color: 'white',
      border: 'none',
      borderRadius: borders.radius.medium,
      padding: `${spacing.sm} ${spacing.md}`,
      fontWeight: 600,
      cursor: 'pointer',
      transition: animation.buttonHover,
    },
    secondary: {
      background: colors.secondary,
      color: 'white',
      border: 'none',
      borderRadius: borders.radius.medium,
      padding: `${spacing.sm} ${spacing.md}`,
      fontWeight: 600,
      cursor: 'pointer',
      transition: animation.buttonHover,
    },
    accent: {
      background: colors.accent,
      color: 'white',
      border: 'none',
      borderRadius: borders.radius.medium,
      padding: `${spacing.sm} ${spacing.md}`,
      fontWeight: 600,
      cursor: 'pointer',
      transition: animation.buttonHover,
    },
    rating: {
      again: { background: colors.again, color: 'white' },
      hard: { background: colors.hard, color: 'black' },
      good: { background: colors.good, color: 'white' },
      easy: { background: colors.easy, color: 'white' },
    },
  },
  card: {
    container: {
      background: colors.cardFace,
      borderRadius: borders.radius.large,
      boxShadow: shadows.card,
      padding: spacing.md,
      margin: `${spacing.md} 0`,
    },
    header: {
      fontWeight: 600,
      fontSize: typography.heading.h3.fontSize,
      marginBottom: spacing.sm,
    },
  },
  panel: {
    padding: spacing.md,
    background: colors.background,
    border: `${borders.width.thin} solid ${colors.divider}`,
    borderRadius: borders.radius.medium,
    margin: `${spacing.md} 0`,
  }
};

export default {
  colors,
  typography,
  animation,
  spacing,
  borders,
  shadows,
  componentStyles,
}; 