import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDeckManager } from '../hooks/useDeckManager';
import { db } from '../db';
import { Deck } from '../models/Deck';
import { Flashcard as CardType } from '../models/types';
import { Card as AppCard } from '../models/Card';
import { CardEditor } from './CardEditor';
import '../styles/DeckManagement.css';

const DeckManagement: React.FC = () => {
  const { deckId = 'new' } = useParams();
  const navigate = useNavigate();
  const isNewDeck = deckId === 'new';
  
  const { createDeck, updateDeck } = useDeckManager();
  const [deck, setDeck] = useState<Deck | null>(null);
  const [deckName, setDeckName] = useState('');
  const [deckDescription, setDeckDescription] = useState('');
  const [cardsInCurrentDeck, setCardsInCurrentDeck] = useState<AppCard[]>([]);
  const [allSystemCards, setAllSystemCards] = useState<AppCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCardEditor, setShowCardEditor] = useState(false);
  const [editingCard, setEditingCard] = useState<AppCard | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadDeckAndCardData() {
      setIsLoading(true);
      try {
        const systemCards = await db.getAllCards();
        setAllSystemCards(systemCards);

        if (isNewDeck) {
          setIsLoading(false);
          return;
        }
        
        const loadedDeck = await db.getDeck(deckId);
        if (!loadedDeck) {
          setError('Deck not found');
          setIsLoading(false);
          return;
        }
        
        setDeck(loadedDeck);
        setDeckName(loadedDeck.name);
        setDeckDescription(loadedDeck.description || '');
        
        const currentDeckCards = await db.getCardsByDeck(deckId);
        setCardsInCurrentDeck(currentDeckCards);
      } catch (err) {
        console.error('Failed to load data', err);
        setError('Failed to load data');
      } finally {
        setIsLoading(false);
      }
    }
    
    loadDeckAndCardData();
  }, [deckId, isNewDeck]);

  const handleSaveDeck = async () => {
    if (!deckName.trim()) {
      setError('Deck name is required');
      return;
    }
    
    try {
      if (isNewDeck) {
        const newDeck = await createDeck(deckName, deckDescription);
        navigate(`/deck/${newDeck.id}`);
      } else if (deck) {
        await updateDeck({
          ...deck,
          name: deckName,
          description: deckDescription
        });
      }
      setError(null);
    } catch (err) {
      console.error('Failed to save deck', err);
      setError('Failed to save deck');
    }
  };

  const handleRefreshCardsInCurrentDeck = async () => {
    if (isNewDeck || !deckId) return;
    try {
      const refreshedCards = await db.getCardsByDeck(deckId);
      setCardsInCurrentDeck(refreshedCards);
      const systemCards = await db.getAllCards();
      setAllSystemCards(systemCards);
    } catch (err) {
      console.error('Failed to refresh cards', err);
    }
  };

  const handleSaveCard = async (cardToSave: AppCard) => {
    try {
      if (editingCard) {
        await db.updateCard(editingCard.id, cardToSave);
      } else {
        await db.addCard(cardToSave);
      }
      setEditingCard(null);
      setShowCardEditor(false);
      handleRefreshCardsInCurrentDeck();
    } catch (err) {
      console.error('Failed to save card', err);
      setError('Failed to save card. Check console for details.');
    }
  };

  const handleDeleteCard = async (cardId: string) => {
    try {
      await db.deleteCard(cardId);
      setCardsInCurrentDeck(cardsInCurrentDeck.filter(card => card.id !== cardId));
      const systemCards = await db.getAllCards();
      setAllSystemCards(systemCards);
    } catch (err) {
      console.error('Failed to delete card', err);
    }
  };

  const handleAddNewCard = () => {
    setEditingCard(null);
    setShowCardEditor(true);
  };

  const handleEditCard = (card: AppCard) => {
    setEditingCard(card);
    setShowCardEditor(true);
  };

  if (isLoading) {
    return <div className="deck-management-loading">Loading...</div>;
  }

  return (
    <div className="deck-management">
      <div className="deck-form">
        <h2>{isNewDeck ? 'Create New Deck' : 'Edit Deck'}</h2>
        
        {error && <div className="error-message">{error}</div>}
        
        <div className="form-group">
          <label htmlFor="deckName">Deck Name:</label>
          <input
            id="deckName"
            type="text"
            value={deckName}
            onChange={(e) => setDeckName(e.target.value)}
            placeholder="Enter deck name"
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="deckDescription">Description (optional):</label>
          <textarea
            id="deckDescription"
            value={deckDescription}
            onChange={(e) => setDeckDescription(e.target.value)}
            placeholder="Enter deck description"
            rows={3}
          />
        </div>
        
        <button className="save-deck-button" onClick={handleSaveDeck}>
          {isNewDeck ? 'Create Deck' : 'Save Changes'}
        </button>
      </div>

      {!isNewDeck && (
        <div className="cards-management">
          <div className="cards-header">
            <h2>Cards in this Deck</h2>
            <button 
              className="add-card-button"
              onClick={handleAddNewCard}
            >
              {showCardEditor && !editingCard ? 'Cancel' : 'Add New Card'}
            </button>
          </div>
          
          {showCardEditor && (
            <CardEditor
              currentDeckId={deckId}
              initialCard={editingCard || { deckId: deckId }}
              allCards={allSystemCards}
              onSave={handleSaveCard}
            />
          )}
          
          {cardsInCurrentDeck.length === 0 && !showCardEditor ? (
            <div className="no-cards">
              <p>No cards in this deck yet. Add your first card!</p>
            </div>
          ) : (
            <div className="cards-list">
              {cardsInCurrentDeck.map(card => (
                <div key={card.id} className="card-item">
                  <div className="card-content">
                    <div className="card-front">{card.front.length > 100 ? card.front.substring(0,100)+'...': card.front}</div>
                    <div className="card-back">{card.back.length > 100 ? card.back.substring(0,100)+'...': card.back}</div>
                  </div>
                  <div className="card-actions">
                    <button 
                      className="edit-card" 
                      onClick={() => handleEditCard(card)}
                    >
                      Edit
                    </button>
                    <button 
                      className="delete-card"
                      onClick={() => handleDeleteCard(card.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DeckManagement;
