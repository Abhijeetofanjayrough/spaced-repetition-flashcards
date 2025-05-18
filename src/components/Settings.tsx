// eslint-disable-next-line @typescript-eslint/no-unused-vars
// eslint-disable-next-line @typescript-eslint/no-unused-vars
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useData } from '../contexts/DataContext';
import { db } from '../db';
import '../styles/Settings.css';
import { saveAs } from 'file-saver';
import Papa from 'papaparse';

interface StudyPreferences {
  newCardsPerDay: number;
  reviewsPerDay: number;
  showTimer: boolean;
  autoPlayAudio: boolean;
  defaultCardType: 'basic' | 'cloze' | 'multi';
  sessionLength: number;
  interleaveTopics: boolean;
  focusedMode: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const Settings: React.FC = () => {
// eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { darkMode, setDarkMode } = useTheme();
// eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { cards, decks, refreshData } = useData();
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importStatus, setImportStatus] = useState<string>('');
  const [exportProgress, setExportProgress] = useState<string>('');
  
  const [preferences, setPreferences] = useState<StudyPreferences>(() => ({
    newCardsPerDay: parseInt(localStorage.getItem('newCardsPerDay') || '10'),
    reviewsPerDay: parseInt(localStorage.getItem('reviewsPerDay') || '100'),
    showTimer: localStorage.getItem('showTimer') === 'true',
    autoPlayAudio: localStorage.getItem('autoPlayAudio') === 'true',
    defaultCardType: (localStorage.getItem('defaultCardType') || 'basic') as 'basic' | 'cloze' | 'multi',
    sessionLength: parseInt(localStorage.getItem('sessionLength') || '20'),
    interleaveTopics: localStorage.getItem('interleaveTopics') === 'true',
    focusedMode: localStorage.getItem('focusedMode') === 'true' // Added for focused study sessions
  }));

  const handlePreferenceChange = (key: keyof StudyPreferences, value: any) => {
    setPreferences(prev => {
      const newPrefs = { ...prev, [key]: value };
      localStorage.setItem(key, value.toString());
      return newPrefs;
    });
  };

  const handleDataExport = async () => {
    try {
      setExportProgress('Preparing export...');
      
      // Get all cards and decks from the database
      const allCards = await db.getAllCards();
      const allDecks = await db.getAllDecks();
      const allAchievements = await db.getAllAchievements();
      
      const exportData = {
        timestamp: new Date().toISOString(),
        version: '1.0',
        cards: allCards,
        decks: allDecks,
        achievements: allAchievements,
        preferences: preferences
      };
      
      setExportProgress('Creating file...');
      const dataStr = JSON.stringify(exportData, null, 2);
      const blob = new Blob([dataStr], {type: 'application/json'});
      
      const exportFileDefaultName = `flashcards-backup-${new Date().toISOString().slice(0, 10)}.json`;
      
      setExportProgress('Downloading...');
      saveAs(blob, exportFileDefaultName);
      
      setExportProgress('Export complete!');
      setTimeout(() => setExportProgress(''), 3000);
    } catch (error) {
      console.error('Export failed:', error);
      setExportProgress('Export failed. Please try again.');
    }
  };
  
  const handleCSVExport = async () => {
    try {
      setExportProgress('Preparing CSV export...');
      
      // Get all cards
      const allCards = await db.getAllCards();
      
      // Transform cards to CSV format
      const csvData = allCards.map(card => ({
        front: card.front.replace(/<[^>]*>/g, ' '),  // Basic HTML stripping
        back: card.back.replace(/<[^>]*>/g, ' '),
        tags: card.tags ? card.tags.join(',') : '',
        deckId: card.deckId,
        template: card.cardType || 'basic',
        created: card.created,
        easeFactor: card.scheduling.easeFactor,
        interval: card.scheduling.interval,
        stage: card.scheduling.learningStage
      }));
      
      setExportProgress('Creating CSV...');
      const csv = Papa.unparse(csvData);
      const blob = new Blob([csv], {type: 'text/csv;charset=utf-8'});
      
      const exportFileName = `flashcards-export-${new Date().toISOString().slice(0, 10)}.csv`;
      
      setExportProgress('Downloading...');
      saveAs(blob, exportFileName);
      
      setExportProgress('CSV export complete!');
      setTimeout(() => setExportProgress(''), 3000);
    } catch (error) {
      console.error('CSV export failed:', error);
      setExportProgress('CSV export failed. Please try again.');
    }
  };
  
  const handleDataImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      setImportStatus('No file selected');
      return;
    }
    
    setImportFile(file);
    setImportStatus('File selected: ' + file.name);
  };
  
  const processImport = async () => {
    if (!importFile) {
      setImportStatus('No file selected');
      return;
    }
    
    try {
      setImportStatus('Reading file...');
      
      const fileReader = new FileReader();
      fileReader.onload = async (e) => {
        try {
          const fileContent = e.target?.result;
          if (typeof fileContent !== 'string') {
            throw new Error('Invalid file format');
          }
          
          const importData = JSON.parse(fileContent);
          
          // Validate the import data has the expected structure
          if (!importData.cards || !importData.decks) {
            throw new Error('Invalid backup file format');
          }
          
          setImportStatus('Importing data...');
          
          // Import decks first
          await db.decks.bulkPut(importData.decks);
          
          // Then import cards
          await db.cards.bulkPut(importData.cards);
          
          // Import achievements if available
          if (importData.achievements) {
            await db.achievements.bulkPut(importData.achievements);
          }
          
          // Import preferences if available
          if (importData.preferences) {
            Object.entries(importData.preferences).forEach(([key, value]) => {
              localStorage.setItem(key, String(value));
            });
          }
          
          setImportStatus(`Import complete! Imported ${importData.cards.length} cards and ${importData.decks.length} decks.`);
          refreshData(); // Refresh the UI after import
          
        } catch (error) {
          console.error('Error processing import:', error);
          setImportStatus(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      };
      
      fileReader.readAsText(importFile);
      
    } catch (error) {
      console.error('Import failed:', error);
      setImportStatus('Import failed. Please try again.');
    }
  };
  
  const handleResetAllData = async () => {
    if (window.confirm('Are you sure? This will permanently delete all your cards, decks, and progress.')) {
      try {
        // Delete all data from IndexedDB
        await db.cards.clear();
        await db.decks.clear();
        await db.achievements.clear();
        
        // Clear localStorage
        localStorage.clear();
        
        // Refresh the app
        window.location.href = '/';
      } catch (error) {
        console.error('Reset failed:', error);
        alert('Reset failed. Please try again.');
      }
    }
  };

  return (
    <div className="settings-container">
      <h1>Settings</h1>
      
      <section className="settings-section">
        <h2>Appearance</h2>
        <div className="setting-item">
          <label className="setting-label">Theme</label>
          <div className="theme-toggle">
            <button 
              className={`theme-btn ${!darkMode ? 'active' : ''}`}
              onClick={() => setDarkMode(false)}
            >
              Light
            </button>
            <button 
              className={`theme-btn ${darkMode ? 'active' : ''}`}
              onClick={() => setDarkMode(true)}
            >
              Dark
            </button>
          </div>
        </div>
      </section>
      
      <section className="settings-section">
        <h2>Study Preferences</h2>
        
        <div className="setting-item">
          <label className="setting-label">New Cards per Day</label>
          <input 
            type="number" 
            min="1" 
            max="100"
            value={preferences.newCardsPerDay}
            onChange={(e) => handlePreferenceChange('newCardsPerDay', parseInt(e.target.value))}
          />
        </div>
        
        <div className="setting-item">
          <label className="setting-label">Reviews per Day</label>
          <input 
            type="number" 
            min="10" 
            max="500"
            value={preferences.reviewsPerDay}
            onChange={(e) => handlePreferenceChange('reviewsPerDay', parseInt(e.target.value))}
          />
        </div>
        
        <div className="setting-item">
          <label className="setting-label">Session Length (minutes)</label>
          <input 
            type="number" 
            min="5" 
            max="120"
            value={preferences.sessionLength}
            onChange={(e) => handlePreferenceChange('sessionLength', parseInt(e.target.value))}
          />
        </div>
        
        <div className="setting-item">
          <label className="setting-label">Default Card Type</label>
          <select 
            value={preferences.defaultCardType}
            onChange={(e) => handlePreferenceChange('defaultCardType', e.target.value)}
          >
            <option value="basic">Basic</option>
            <option value="cloze">Cloze</option>
            <option value="multi">Multi-Choice</option>
          </select>
        </div>

        <div className="setting-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={preferences.showTimer}
              onChange={(e) => handlePreferenceChange('showTimer', e.target.checked)}
            />
            Show Timer
            <div className="setting-description">Display a timer during review sessions</div>
          </label>
        </div>
        
        <div className="setting-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={preferences.autoPlayAudio}
              onChange={(e) => handlePreferenceChange('autoPlayAudio', e.target.checked)}
            />
            Auto-play Audio
            <div className="setting-description">Automatically play audio files in cards</div>
          </label>
        </div>
        
        <div className="setting-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={preferences.interleaveTopics}
              onChange={(e) => handlePreferenceChange('interleaveTopics', e.target.checked)}
            />
            Interleave Topics
            <div className="setting-description">Mix different topics together during study for better retention</div>
          </label>
        </div>

        <div className="setting-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={preferences.focusedMode}
              onChange={(e) => handlePreferenceChange('focusedMode', e.target.checked)}
            />
            Focused Mode
            <div className="setting-description">Minimize distractions during study sessions (e.g., hide header)</div>
          </label>
        </div>
      </section>

      <section className="settings-section">
        <h2>Data Management</h2>
        
        <div className="settings-subsection">
          <h3>Export Data</h3>
          <p>Download your flashcards and study progress.</p>
          <div className="data-actions">
            <button className="btn-primary" onClick={handleDataExport}>
              Export Full Backup (JSON)
            </button>
            <button className="btn-secondary" onClick={handleCSVExport}>
              Export Cards as CSV
            </button>
          </div>
          {exportProgress && <div className="status-message">{exportProgress}</div>}
        </div>
        
        <div className="settings-subsection">
          <h3>Import Data</h3>
          <p>Import a backup file or CSV.</p>
          <div className="import-area">
            <input 
              type="file" 
              id="import-file" 
              accept=".json"
              onChange={handleDataImport}
              className="file-input"
            />
            <label htmlFor="import-file" className="file-label">
              Choose Backup File
            </label>
            <button 
              className="btn-primary"
              onClick={processImport}
              disabled={!importFile}
            >
              Import
            </button>
          </div>
          {importStatus && <div className="status-message">{importStatus}</div>}
        </div>
        
        <div className="settings-subsection">
          <h3>Demo Data</h3>
          <p>Load sample flashcard decks for demonstration purposes.</p>
          <div className="data-actions">
            <button 
              className="btn-secondary"
              onClick={async () => {
                try {
                  const { seedMockData } = await import('../data/seedData');
                  const result = await seedMockData();
                  if (result) {
                    alert('Sample data loaded successfully! Refreshing page...');
                    window.location.reload();
                  } else {
                    alert('Database already has content. Please reset data first if you want to load sample data.');
                  }
                } catch (error) {
                  console.error('Error loading sample data:', error);
                  alert('Failed to load sample data.');
                }
              }}
            >
              Load Sample Data
            </button>
          </div>
        </div>
        
        <div className="settings-subsection danger-zone">
          <h3>Danger Zone</h3>
          <p>Permanently delete all your data.</p>
          <button className="btn-danger" onClick={handleResetAllData}>
            Reset All Data
          </button>
        </div>
      </section>
    </div>
  );
};

export default Settings;
