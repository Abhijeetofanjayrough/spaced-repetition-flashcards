import React, { useState } from 'react';
import { useData } from '../contexts/DataContext';
import './CreateDeckForm.css'; // We'll create this CSS file next

interface CreateDeckFormProps {
  onDeckCreated: (deckId: string) => void; // Callback after deck is created
}

const CreateDeckForm: React.FC<CreateDeckFormProps> = ({ onDeckCreated }) => {
  const { addRegularDeck } = useData();
  const [deckName, setDeckName] = useState('');
  const [deckDescription, setDeckDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!deckName.trim()) {
      setError('Deck name is required.');
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      const newDeck = await addRegularDeck(deckName.trim(), deckDescription.trim());
      setDeckName('');
      setDeckDescription('');
      onDeckCreated(newDeck.id);
    } catch (err) {
      console.error('Failed to create deck:', err);
      setError('Failed to create deck. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="create-deck-form-container">
      <h3>Create New Deck</h3>
      <form onSubmit={handleSubmit} className="create-deck-form">
        <div className="form-group">
          <label htmlFor="deckName">Deck Name:</label>
          <input
            type="text"
            id="deckName"
            value={deckName}
            onChange={(e) => setDeckName(e.target.value)}
            placeholder="Enter deck name (e.g., French Vocabulary)"
            required
            disabled={isSubmitting}
          />
        </div>
        <div className="form-group">
          <label htmlFor="deckDescription">Description (Optional):</label>
          <textarea
            id="deckDescription"
            value={deckDescription}
            onChange={(e) => setDeckDescription(e.target.value)}
            placeholder="Briefly describe the deck's content"
            rows={3}
            disabled={isSubmitting}
          />
        </div>
        {error && <p className="error-message">{error}</p>}
        <button type="submit" className="btn-primary" disabled={isSubmitting}>
          {isSubmitting ? 'Creating...' : 'Create Deck'}
        </button>
      </form>
    </div>
  );
};

export default CreateDeckForm; 