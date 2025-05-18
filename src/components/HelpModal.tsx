import React, { useState } from 'react';
import { ShortcutGroup, getShortcutHint } from '../utils/keyboardShortcuts';
import './HelpModal.css';

interface HelpModalProps {
  shortcutGroups: ShortcutGroup[];
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ shortcutGroups, onClose }) => {
  const [activeTab, setActiveTab] = useState<'keyboard' | 'general' | 'spaced-repetition'>('keyboard');

  return (
    <div className="help-modal-overlay">
      <div className="help-modal-content">
        <div className="help-modal-header">
          <h2>Help & Shortcuts</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        
        <div className="help-tabs">
          <button 
            className={activeTab === 'keyboard' ? 'active' : ''} 
            onClick={() => setActiveTab('keyboard')}
          >
            Keyboard Shortcuts
          </button>
          <button 
            className={activeTab === 'general' ? 'active' : ''} 
            onClick={() => setActiveTab('general')}
          >
            General Help
          </button>
          <button 
            className={activeTab === 'spaced-repetition' ? 'active' : ''} 
            onClick={() => setActiveTab('spaced-repetition')}
          >
            Spaced Repetition
          </button>
        </div>
        
        <div className="help-content">
          {activeTab === 'keyboard' && (
            <div className="keyboard-shortcuts">
              {shortcutGroups.map((group, index) => (
                <div key={index} className="shortcut-group">
                  <h3>{group.name}</h3>
                  <table>
                    <thead>
                      <tr>
                        <th>Shortcut</th>
                        <th>Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.shortcuts.map((shortcut, idx) => (
                        <tr key={idx}>
                          <td className="shortcut-key">
                            <kbd>{getShortcutHint(shortcut)}</kbd>
                          </td>
                          <td>{shortcut.description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          )}
          
          {activeTab === 'general' && (
            <div className="general-help">
              <h3>Getting Started</h3>
              <p>
                Welcome to the Spaced Repetition Flashcards app! Here's how to get started:
              </p>
              
              <h4>Creating Cards</h4>
              <ol>
                <li>Click "Create Card" in the navigation bar</li>
                <li>Enter the front (question) and back (answer) of your card</li>
                <li>Add any tags to help organize your cards</li>
                <li>Select a deck for your card</li>
                <li>Click "Save Card" to add it to your collection</li>
              </ol>
              
              <h4>Studying</h4>
              <ol>
                <li>Select a deck from the Decks page</li>
                <li>Click "Study Selected Deck" to start studying</li>
                <li>View the front of the card and try to recall the answer</li>
                <li>Click to flip the card and see the answer</li>
                <li>Rate your recall from "Again" (didn't remember) to "Easy" (perfect recall)</li>
              </ol>
              
              <h4>Managing Decks</h4>
              <p>
                You can create regular decks for different subjects, or filtered decks
                based on specific criteria like tags, due date, or difficulty level.
              </p>
              
              <h4>Analytics</h4>
              <p>
                The Analytics page shows you detailed statistics about your learning progress, 
                retention rates, and study habits.
              </p>
              
              <h4>Achievements</h4>
              <p>
                Track your progress and earn achievements as you create cards,
                maintain streaks, and improve your knowledge retention.
              </p>
            </div>
          )}
          
          {activeTab === 'spaced-repetition' && (
            <div className="spaced-repetition-help">
              <h3>Understanding Spaced Repetition</h3>
              <p>
                Spaced repetition is a learning technique that incorporates increasing time intervals between
                reviews of previously learned material to exploit the psychological spacing effect.
              </p>
              
              <h4>How It Works</h4>
              <p>
                This app uses the SM-2 algorithm, which works as follows:
              </p>
              <ol>
                <li>
                  <strong>Rating System:</strong> After reviewing a card, you rate how well you recalled it
                  on a scale from 1 (complete blackout) to 4 (perfect recall).
                </li>
                <li>
                  <strong>Interval Calculation:</strong> Based on your rating, the app calculates when you should
                  see the card again:
                  <ul>
                    <li>"Again" (1): Card is reset to learning stage (short intervals)</li>
                    <li>"Hard" (2): Current interval is multiplied by 1.2</li>
                    <li>"Good" (3): Current interval is multiplied by the card's ease factor</li>
                    <li>"Easy" (4): Current interval is multiplied by the ease factor with a bonus</li>
                  </ul>
                </li>
                <li>
                  <strong>Ease Factor Adjustment:</strong> Each card has an "ease factor" that increases or
                  decreases based on your performance, making cards you find difficult appear more frequently.
                </li>
              </ol>
              
              <h4>Best Practices</h4>
              <ul>
                <li>Study consistently to maintain your knowledge</li>
                <li>Be honest with your self-assessment when rating cards</li>
                <li>Keep cards simple with one main concept per card</li>
                <li>Use tags to organize related concepts</li>
                <li>Review the Analytics page to understand your learning patterns</li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}; 