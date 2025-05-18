import React, { useState } from 'react';
import './FeedbackForm.css';

interface FeedbackFormProps {
  onSubmit: (feedback: FeedbackData) => void;
  onClose: () => void;
}

export interface FeedbackData {
  rating: number;
  usability: number;
  features: number;
  designAppeal: number;
  comments: string;
  email?: string;
}

const FeedbackForm: React.FC<FeedbackFormProps> = ({ onSubmit, onClose }) => {
  const [feedback, setFeedback] = useState<FeedbackData>({
    rating: 0,
    usability: 0,
    features: 0,
    designAppeal: 0,
    comments: '',
    email: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFeedback(prev => ({
      ...prev,
      [name]: name === 'comments' || name === 'email' ? value : parseInt(value, 10)
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(feedback);
  };

  const renderRatingOptions = (name: keyof FeedbackData, label: string) => {
    return (
      <div className="rating-group">
        <label>{label}</label>
        <div className="rating-options">
          {[1, 2, 3, 4, 5].map(value => (
            <label key={value} className="rating-option">
              <input
                type="radio"
                name={name}
                value={value}
                checked={feedback[name] === value}
                onChange={handleChange}
              />
              <span>{value}</span>
            </label>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="feedback-form-container">
      <div className="feedback-form-content">
        <h2>Share Your Feedback</h2>
        <p>Help us improve your experience with the Spaced Repetition Flashcards app!</p>
        
        <form onSubmit={handleSubmit}>
          {renderRatingOptions('rating', 'Overall Experience (1-5)')}
          {renderRatingOptions('usability', 'Ease of Use (1-5)')}
          {renderRatingOptions('features', 'Feature Completeness (1-5)')}
          {renderRatingOptions('designAppeal', 'Visual Design (1-5)')}
          
          <div className="form-group">
            <label htmlFor="comments">Comments or Suggestions</label>
            <textarea
              id="comments"
              name="comments"
              rows={4}
              value={feedback.comments}
              onChange={handleChange}
              placeholder="Share your thoughts, suggestions, or report any issues..."
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="email">Email (optional)</label>
            <input
              type="email"
              id="email"
              name="email"
              value={feedback.email || ''}
              onChange={handleChange}
              placeholder="For follow-up questions (we'll never share your email)"
            />
          </div>
          
          <div className="form-actions">
            <button type="button" className="cancel-button" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="submit-button">
              Submit Feedback
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FeedbackForm; 