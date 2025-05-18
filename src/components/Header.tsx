import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import '../styles/Header.css';

const Header: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { darkMode, setDarkMode } = useTheme();
  const [showSettings, setShowSettings] = useState(false);

  const isHome = location.pathname === '/';

  return (
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
        <nav className="main-nav">
          <Link 
            to="/" 
            className={location.pathname === '/' ? 'active' : ''}
            title="Go to Dashboard"
          >
            Dashboard
          </Link>
          <Link 
            to="/analytics" 
            className={location.pathname === '/analytics' ? 'active' : ''}
            title="View Statistics"
          >
            Statistics
          </Link>
        </nav>
        <div className="header-actions">
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
      </div>
    </header>
  );
};

export default Header;
