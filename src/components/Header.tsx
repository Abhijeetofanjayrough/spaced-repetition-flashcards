import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import FeedbackModal from './FeedbackModal';
import '../styles/Header.css';

const Header: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { darkMode, setDarkMode } = useTheme();
  const [showSettings, setShowSettings] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  const isHome = location.pathname === '/';

  const handleFeedbackClick = () => {
    setShowFeedbackModal(true);
    // Close settings dropdown if open
    if (showSettings) {
      setShowSettings(false);
    }
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Close menu when route changes
  useEffect(() => {
    setIsMenuOpen(false);
  }, [location]);

  return (
    <>
      <header className="app-header">
        <div className="header-content">
          {!isHome ? (
            <button className="back-btn" onClick={() => navigate(-1)} title="Back">
              <span className="back-arrow">←</span>
            </button>
          ) : (
            <Link to="/" className="logo">
              <span className="logo-text">SpacedCards</span>
            </Link>
          )}
          <button className="menu-toggle" onClick={toggleMenu}>
            <span className="menu-icon">{isMenuOpen ? '✕' : '☰'}</span>
          </button>
          <nav className={`main-nav ${isMenuOpen ? 'open' : ''}`}>
            <ul className="nav-links">
              <li>
                <Link 
                  to="/" 
                  className={location.pathname === '/' ? 'active' : ''}
                  title="Go to Dashboard"
                >
                  Dashboard
                </Link>
              </li>
              <li>
                <Link 
                  to="/challenge" 
                  className={location.pathname.includes('/challenge') ? 'active' : ''}
                  title="Challenge Mode"
                >
                  Challenge
                </Link>
              </li>
              <li>
                <Link 
                  to="/practice" 
                  className={location.pathname.includes('/practice') ? 'active' : ''}
                  title="Practice Active Recall"
                >
                  Practice
                </Link>
              </li>
              <li>
                <Link 
                  to="/analytics" 
                  className={location.pathname === '/analytics' ? 'active' : ''}
                  title="View Statistics"
                >
                  Statistics
                </Link>
              </li>
            </ul>
          </nav>
          <div className="header-actions">
            <button 
              className="feedback-btn"
              onClick={handleFeedbackClick}
              title="Provide feedback"
            >
              💬
            </button>
            <button 
              className="theme-toggle"
              onClick={() => setDarkMode(prev => !prev)}
              title={`Switch to ${darkMode ? 'light' : 'dark'} mode`}
            >
              {darkMode ? '🌞' : '🌙'}
            </button>
            <button 
              className="settings-btn"
              onClick={() => setShowSettings(!showSettings)}
              title="Settings"
            >
              ⚙️
            </button>
            {showSettings && (
              <div className="settings-dropdown">
                <Link to="/settings" className="settings-item">
                  App Settings
                </Link>
                <Link to="/help" className="settings-item">
                  Help & Tutorial
                </Link>
                <Link to="/achievements" className="settings-item">
                  Achievements
                </Link>
              </div>
            )}
          </div>
          {isOffline && (
            <div className="offline-indicator">
              <span className="offline-icon">📶</span>
              <span className="offline-text">Offline Mode</span>
            </div>
          )}
        </div>
      </header>
      
      <FeedbackModal 
        isOpen={showFeedbackModal}
        onClose={() => setShowFeedbackModal(false)}
      />
    </>
  );
};

export default Header;
