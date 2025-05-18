import React, { createContext, useContext, useEffect, useState } from 'react';

interface ThemeContextType {
  darkMode: boolean;
  setDarkMode: (value: boolean | ((prev: boolean) => boolean)) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{
  children: React.ReactNode;
  value?: ThemeContextType;
}> = ({ children, value }) => {
  // If value is provided, use it directly (for App.tsx implementation)
  // Otherwise create a new state management
  const [darkModeSetting, setDarkModeSetting] = useState<boolean>(false);
  
  const contextValue = value || {
    darkMode: darkModeSetting,
    setDarkMode: setDarkModeSetting
  };
  
  // If no value is provided, initialize from localStorage or system preference
  useEffect(() => {
    if (!value) {
      const savedPreference = localStorage.getItem('flashcard-theme');
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setDarkModeSetting(savedPreference ? savedPreference === 'dark' : prefersDark);
    }
  }, [value]);
  
  // Apply theme class and save preference when darkMode changes
  useEffect(() => {
    if (!value) { // Only manage DOM if we're not using the externally provided value
      document.documentElement.classList.toggle('dark-theme', darkModeSetting);
      localStorage.setItem('flashcard-theme', darkModeSetting ? 'dark' : 'light');
    }
  }, [darkModeSetting, value]);
  
  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
