import React, { useState } from 'react';
import { Card } from '../models/Card';
import './RetrievalPractice.css';

interface RetrievalPracticeProps {
  card: Card;
  onComplete: (success: boolean, type: string) => void;
}

/**
 * RetrievalPractice component offers different ways to practice recall:
 * 1. Explanation mode: explain the concept in your own words
 * 2. Application mode: apply the concept to a real-world scenario
 * 3. Connection mode: connect this concept to other related concepts
 */
const RetrievalPractice: React.FC<RetrievalPracticeProps> = ({ card, onComplete }) => {
  const [practiceType, setPracticeType] = useState<'explain' | 'apply' | 'connect' | null>(null);
  const [response, setResponse] = useState('');
  const [feedback, setFeedback] = useState<'success' | 'failure' | null>(null);
  
  // Generate a prompt based on practice type
  const getPrompt = () => {
    const cardContent = stripHtml(card.front);
    
    switch (practiceType) {
      case 'explain':
        return `Explain "${cardContent}" in your own words:`;
      case 'apply':
        return `Apply the concept of "${cardContent}" to a real-world example:`;
      case 'connect':
        return `Connect "${cardContent}" to other concepts you've learned:`;
      default:
        return 'Select a practice type to continue';
    }
  };
  
  // Helper to strip HTML from card content
  const stripHtml = (html: string) => {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return doc.body.textContent || '';
  };
  
  // Handle selection of practice type
  const handleSelectType = (type: 'explain' | 'apply' | 'connect') => {
    setPracticeType(type);
    setResponse('');
    setFeedback(null);
  };
  
  // Handle self-assessment of practice
  const handleSelfAssess = (success: boolean) => {
    setFeedback(success ? 'success' : 'failure');
    
    // Report back to parent component
    if (practiceType) {
      onComplete(success, practiceType);
    }
  };
  
  // Handle changing practice type
  const handleChangePracticeType = () => {
    setPracticeType(null);
    setResponse('');
    setFeedback(null);
  };
  
  return (
    <div className="retrieval-practice">
      <h3>Active Recall Practice</h3>
      
      {!practiceType ? (
        <div className="practice-type-selection">
          <p>Choose a way to strengthen your recall:</p>
          
          <div className="practice-options">
            <button 
              className="practice-option explain"
              onClick={() => handleSelectType('explain')}
            >
              <div className="option-icon">💬</div>
              <div className="option-name">Explain</div>
              <div className="option-description">Explain the concept in your own words</div>
            </button>
            
            <button 
              className="practice-option apply"
              onClick={() => handleSelectType('apply')}
            >
              <div className="option-icon">🔨</div>
              <div className="option-name">Apply</div>
              <div className="option-description">Apply the concept to a real situation</div>
            </button>
            
            <button 
              className="practice-option connect"
              onClick={() => handleSelectType('connect')}
            >
              <div className="option-icon">🔗</div>
              <div className="option-name">Connect</div>
              <div className="option-description">Connect this to other concepts</div>
            </button>
          </div>
        </div>
      ) : (
        <div className="practice-response-area">
          <div className="practice-prompt">{getPrompt()}</div>
          
          <textarea
            className="practice-response-input"
            value={response}
            onChange={(e) => setResponse(e.target.value)}
            placeholder="Type your response here..."
            disabled={feedback !== null}
            rows={5}
          />
          
          {feedback === null ? (
            <div className="practice-actions">
              <button 
                className="self-assess-button incorrect"
                onClick={() => handleSelfAssess(false)}
                disabled={response.trim().length < 10}
              >
                I struggled with this
              </button>
              
              <button 
                className="self-assess-button correct"
                onClick={() => handleSelfAssess(true)}
                disabled={response.trim().length < 10}
              >
                I knew this well
              </button>
            </div>
          ) : (
            <div className={`practice-feedback ${feedback}`}>
              <div className="feedback-icon">
                {feedback === 'success' ? '✅' : '❗'}
              </div>
              <div className="feedback-message">
                {feedback === 'success' 
                  ? 'Great job! This active recall will strengthen your memory.' 
                  : 'That\'s okay! Struggling actually helps build stronger memory paths.'}
              </div>
              <button 
                className="change-practice-button"
                onClick={handleChangePracticeType}
              >
                Try another practice type
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RetrievalPractice; 