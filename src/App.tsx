import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ReviewProvider } from './contexts/ReviewContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { StorageProvider } from './contexts/StorageContext';
import { DataProvider } from './contexts/DataContext';
import { initializeAndMigrateData } from './db'; // Import initialization function
import Dashboard from './components/Dashboard';
import ReviewSession from './components/ReviewSession';
import DeckManagement from './components/DeckManagement';
import Header from './components/Header';
import Analytics from './components/Analytics';
import Settings from './components/Settings';
import RandomMixSession from './components/RandomMixSession';
import './styles/global.css';
import './styles/App.css';

const App: React.FC = () => {
  // Check for user's preferred theme
  const [darkMode, setDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    return savedTheme ? savedTheme === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // Initialize DB on app start
  useEffect(() => {
    initializeAndMigrateData().catch(err => {
      console.error("Failed to initialize database:", err);
      // Optionally, set an error state to inform the user
    });
  }, []); // Empty dependency array ensures this runs only once on mount

  useEffect(() => {
    // Apply theme class to document
    document.documentElement.classList.toggle('dark-theme', darkMode);
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  return (
    <ThemeProvider value={{ darkMode, setDarkMode }}>
      <DataProvider>
        <StorageProvider>
          <ReviewProvider>
            <Router>
              <div className="app-container">
                <Header />
                <main className="main-content">
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/study/:deckId" element={<ReviewSession />} />
                    <Route path="/study/random" element={<RandomMixSession />} />
                    <Route path="/deck/new" element={<DeckManagement />} />
                    <Route path="/deck/:deckId" element={<DeckManagement />} />
                    <Route path="/analytics" element={<Analytics />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </main>
              </div>
            </Router>
          </ReviewProvider>
        </StorageProvider>
      </DataProvider>
    </ThemeProvider>
  );
};

export default App;
