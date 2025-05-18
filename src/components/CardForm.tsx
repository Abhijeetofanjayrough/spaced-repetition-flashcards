import React, { useState } from 'react';
import { Flashcard } from '../models/types';
import { useData } from '../contexts/DataContext';
import '../styles/CardForm.css';

interface CardFormProps {
  deckId: string;
  existingCard?: Flashcard;
  onSave: () => void;
}

const CardForm: React.FC<CardFormProps> = ({ deckId, existingCard, onSave }) => {
  const { addCardToDeck, updateCard } = useData();
  const [front, setFront] = useState(existingCard?.front || '');
  const [back, setBack] = useState(existingCard?.back || '');
  const [tags, setTags] = useState(existingCard?.tags?.join(', ') || '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!front.trim() || !back.trim()) {
      setError('Both front and back content are required');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      const tagArray = tags
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);
      
      if (existingCard) {
        // Update existing card
        await updateCard({
          ...existingCard,
          front,
          back,
          tags: tagArray,
          modified: new Date().toISOString()
        });
      } else {
        // Create new card
        await addCardToDeck(deckId, front, back, 'basic');
        
        // Reset form if creating a new card
        setFront('');
        setBack('');
        setTags('');
      }
      
      onSave();
    } catch (err) {
      console.error('Failed to save card', err);
      setError('Failed to save the card. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form className="card-form" onSubmit={handleSubmit}>
      {error && <div className="error-message">{error}</div>}
      
      <div className="form-group">
        <label htmlFor="front">Front Side:</label>
        <textarea
          id="front"
          value={front}
          onChange={(e) => setFront(e.target.value)}
          placeholder="Question or prompt"
          rows={4}
          required
        />
      </div>
      
      <div className="form-group">
        <label htmlFor="back">Back Side:</label>
        <textarea
          id="back"
          value={back}
          onChange={(e) => setBack(e.target.value)}
          placeholder="Answer or explanation"
          rows={4}
          required
        />
      </div>
      
      <div className="form-group">
        <label htmlFor="tags">Tags (comma separated):</label>
        <input
          id="tags"
          type="text"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="e.g. important, chapter1, difficult"
        />
      </div>
      
      <div className="form-actions">
        <button 
          type="submit" 
          className="save-button"
          disabled={isLoading}
        >
          {isLoading ? 'Saving...' : existingCard ? 'Update Card' : 'Create Card'}
        </button>
      </div>
    </form>
  );
};

export default CardForm;
