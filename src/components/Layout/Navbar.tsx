import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import './Navbar.css';

const Navbar: React.FC = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const { darkMode, setDarkMode } = useTheme();
  const [helpOpen, setHelpOpen] = useState(false);
  
  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };
  
  const toggleTheme = () => {
    setDarkMode(prev => !prev);
  };
  
  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  useEffect(() => {
    if (!localStorage.getItem('onboardingSeen')) {
      setHelpOpen(true);
    }
  }, []);

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <Link to="/" className="navbar-logo">
          FlashLearner
        </Link>
        <button className="menu-toggle" onClick={toggleMenu}>
          <span className="menu-icon"></span>
        </button>
      </div>
      
      <div className={`navbar-menu ${menuOpen ? 'open' : ''}`}>
        <Link to="/" className={`nav-link ${isActive('/') ? 'active' : ''}`}>
          Dashboard
        </Link>
        
        <div className="nav-dropdown">
          <span className="dropdown-trigger">Study</span>
          <div className="dropdown-content">
            <Link to="/study/random" className="dropdown-item">Random Mix</Link>
            <Link to="/challenge" className="dropdown-item">Challenge Mode</Link>
            <Link to="/practice" className="dropdown-item">Practice Mode</Link>
          </div>
        </div>
        
        <Link to="/create-deck" className={`nav-link ${isActive('/create-deck') ? 'active' : ''}`}>
          Create Deck
        </Link>
        
        <Link to="/create-card" className={`nav-link ${isActive('/create-card') ? 'active' : ''}`}>
          Create Card
        </Link>
        
        <Link to="/knowledge-graph" className={`nav-link ${isActive('/knowledge-graph') ? 'active' : ''}`}>
          Knowledge Graph
        </Link>
        
        <button onClick={toggleTheme} className="theme-toggle">
          {darkMode ? '☀️' : '🌙'}
        </button>
        
        <button onClick={() => setHelpOpen(true)} className="help-btn" title="Help & Onboarding" aria-label="Help & Onboarding">
          ?
        </button>
      </div>
      
      {helpOpen && (
        <div className="help-modal-overlay" onClick={() => {
          setHelpOpen(false);
          localStorage.setItem('onboardingSeen', 'true');
        }}>
          <div className="help-modal" onClick={e => e.stopPropagation()}>
            <button className="close-help" onClick={() => {
              setHelpOpen(false);
              localStorage.setItem('onboardingSeen', 'true');
            }} aria-label="Close Help">×</button>
            <h2>Welcome to FlashLearner!</h2>
            <p>This app uses spaced repetition to help you learn efficiently. Here's how to get started:</p>
            <ul>
              <li><b>Create decks</b> for different subjects or topics.</li>
              <li><b>Add cards</b> with questions and answers, images, or math.</li>
              <li><b>Study</b> using the dashboard or study modes. The app schedules reviews for optimal memory.</li>
              <li><b>Use filters</b> to create dynamic decks (e.g., all cards due this week, or tagged 'biology').</li>
              <li><b>Try AI Assist</b> to generate cards from your notes.</li>
              <li>Check your <b>progress</b> and <b>streaks</b> on the dashboard.</li>
            </ul>
            <p>Need more help? Visit the <a href="https://github.com/your-repo" target="_blank" rel="noopener noreferrer">project README</a>.</p>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar; 