import React, { useState } from 'react';
import FeedbackForm, { FeedbackData } from './FeedbackForm';
import './FeedbackModal.css';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const FeedbackModal: React.FC<FeedbackModalProps> = ({ isOpen, onClose }) => {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmitFeedback = async (feedback: FeedbackData) => {
    try {
      // Here you would typically send the feedback to your server
      // For now, we'll just log it and simulate a successful submission
      console.log('Feedback submitted:', feedback);
      
      // Simulate an API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Show thank you message
      setSubmitted(true);
      
      // Close the modal after a delay
      setTimeout(() => {
        setSubmitted(false);
        onClose();
      }, 3000);
    } catch (error) {
      console.error('Error submitting feedback:', error);
      // You could add error handling here
    }
  };

  if (!isOpen) return null;

  return (
    <div className="feedback-modal-overlay">
      {submitted ? (
        <div className="feedback-thank-you">
          <div className="thank-you-content">
            <h2>Thank You for Your Feedback!</h2>
            <p>Your input helps us improve the app for everyone.</p>
            <div className="checkmark-animation">✓</div>
          </div>
        </div>
      ) : (
        <FeedbackForm onSubmit={handleSubmitFeedback} onClose={onClose} />
      )}
    </div>
  );
};

export default FeedbackModal; 