import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useDeckManager } from '../hooks/useDeckManager';
import { db } from '../db';
import { Deck, FilterCriterion, isFilteredDeck, isRegularDeck } from '../models/Deck';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
// eslint-disable-next-line @typescript-eslint/no-unused-vars
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Flashcard as CardType } from '../models/types';
import { Card as AppCard } from '../models/Card';
import { CardEditor } from './CardEditor';
import { FilteredDeckEditor } from './FilteredDeckEditor';
import '../styles/DeckManagement.css';

const DeckManagement: React.FC = () => {
  const { deckId = 'new' } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const isNewDeck = deckId === 'new';
  
  const { createDeck, updateDeck: updateDeckHook, decks: allDecksFromHook } = useDeckManager();
  const [currentDeck, setCurrentDeck] = useState<Deck | null>(null);
  const [deckName, setDeckName] = useState('');
  const [deckDescription, setDeckDescription] = useState('');
  const [selectedParentId, setSelectedParentId] = useState<string | undefined>(undefined);
  const [deckType, setDeckType] = useState<'regular' | 'filtered'>('regular');
  const [filters, setFilters] = useState<FilterCriterion[]>([]);
  const [availableParentDecks, setAvailableParentDecks] = useState<Deck[]>([]);
  const [cardsInCurrentDeck, setCardsInCurrentDeck] = useState<AppCard[]>([]);
  const [allSystemCards, setAllSystemCards] = useState<AppCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCardEditor, setShowCardEditor] = useState(false);
  const [showFilteredDeckEditor, setShowFilteredDeckEditor] = useState(false);
  const [editingCard, setEditingCard] = useState<AppCard | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadDeckAndCardData() {
      setIsLoading(true);
      try {
        const systemCards = await db.getAllCards();
        setAllSystemCards(systemCards);

        const allDecks = await db.getAllDecks();
        setAvailableParentDecks(allDecks.filter(d => d.id !== deckId));

        if (isNewDeck) {
          // Pre-fill parentId from query string if present
          const params = new URLSearchParams(location.search);
          const parentIdFromQuery = params.get('parentId');
          if (parentIdFromQuery) setSelectedParentId(parentIdFromQuery);
          setShowFilteredDeckEditor(deckType === 'filtered');
          setIsLoading(false);
          return;
        }
        
        const loadedDeck = await db.getDeck(deckId);
        if (!loadedDeck) {
          setError('Deck not found');
          setIsLoading(false);
          return;
        }
        
        setCurrentDeck(loadedDeck);
        setDeckName(loadedDeck.name);
        setDeckDescription(loadedDeck.description || '');
        setSelectedParentId(loadedDeck.parentId);
        setDeckType(loadedDeck.type);

        if (isRegularDeck(loadedDeck)) {
          const currentDeckCards = await db.getCardsByDeck(deckId);
          setCardsInCurrentDeck(currentDeckCards);
        } else if (isFilteredDeck(loadedDeck)) {
          setFilters(loadedDeck.filters || []);
          setShowFilteredDeckEditor(true); 
        }
      } catch (err) {
        console.error('Failed to load data', err);
        setError('Failed to load data');
      } finally {
        setIsLoading(false);
      }
    }
    
    loadDeckAndCardData();
  }, [deckId, isNewDeck, deckType, location]);

  const handleSaveDeck = async () => {
    if (!deckName.trim()) {
      setError('Deck name is required');
      return;
    }
    
    try {
      if (isNewDeck) {
        const newDeck = await createDeck(deckName, deckType, deckDescription, selectedParentId, deckType === 'filtered' ? filters : undefined);
        navigate(`/deck/${newDeck.id}`);
      } else if (currentDeck) {
        const deckDataToUpdate: Partial<Deck> = {
          name: deckName,
          description: deckDescription,
          parentId: selectedParentId,
          modified: new Date().toISOString(),
          type: deckType, // type should not change for existing decks easily, but included for completeness
        };
        if (isFilteredDeck(currentDeck)) {
          (deckDataToUpdate as Partial<any>).filters = filters; // Type assertion might be needed or better type handling
        }
        // For regular decks, cardIds are managed separately, not directly in this save action.
        
        await updateDeckHook(deckDataToUpdate as Deck); // Hook expects full deck, db.updateDeck is more flexible
                                                   // Consider using db.updateDeck directly for more flexibility if hook is restrictive
        
        const updatedDeck = await db.getDeck(currentDeck.id);
        if (updatedDeck) {
          setCurrentDeck(updatedDeck);
        }
      }
      setError(null);
    } catch (err) {
      console.error('Failed to save deck', err);
      setError('Failed to save deck');
    }
  };

  const handleFilteredDeckSave = async (filteredDeckData: { id?: string; name: string; filters: FilterCriterion[] }) => {
    if (!currentDeck && !isNewDeck) return; // Should not happen if editor is shown

    setDeckName(filteredDeckData.name); // Update local state for name
    setFilters(filteredDeckData.filters); // Update local state for filters

    if (isNewDeck) {
      // For new filtered deck, createDeck will handle it with current states: deckName, deckType='filtered', filters
      // No separate save needed here, rely on main save button. Or call handleSaveDeck directly.
      // For now, we assume main save button is clicked after editor closes or provides data.
      console.log("New filtered deck config ready, use main save button.");
      setShowFilteredDeckEditor(false); // Close editor, main save will pick up name/filters
    } else if (currentDeck && isFilteredDeck(currentDeck)) {
      const updatedFilteredDeckData: Partial<any/*FilteredDeck*/> = {
        name: filteredDeckData.name,
        filters: filteredDeckData.filters,
        modified: new Date().toISOString(),
      };
      try {
        await db.updateDeck(currentDeck.id, updatedFilteredDeckData);
        const reloadedDeck = await db.getDeck(currentDeck.id);
        if (reloadedDeck) setCurrentDeck(reloadedDeck);
        setShowFilteredDeckEditor(false);
      } catch(err) {
        console.error("Failed to save filtered deck changes", err);
        setError("Failed to save filtered deck changes.");
      }
    }
  };

  const handleRefreshCardsInCurrentDeck = async () => {
    if (isNewDeck || !deckId) return;
    if (currentDeck && isRegularDeck(currentDeck)){
        try {
          const refreshedCards = await db.getCardsByDeck(deckId);
          setCardsInCurrentDeck(refreshedCards);
          const systemCards = await db.getAllCards();
          setAllSystemCards(systemCards);
        } catch (err) {
          console.error('Failed to refresh cards', err);
        }
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
        <h2>{isNewDeck ? 'Create New Deck' : `Edit ${currentDeck?.type === 'filtered' ? 'Filtered' : ''} Deck`}</h2>
        
        {error && <div className="error-message">{error}</div>}

        {isNewDeck && (
          <div className="form-group">
            <label>Deck Type:</label>
            <div className="deck-type-selector">
              <label>
                <input 
                  type="radio" 
                  name="deckType" 
                  value="regular" 
                  checked={deckType === 'regular'} 
                  onChange={(e) => { setDeckType(e.target.value as 'regular' | 'filtered'); setShowFilteredDeckEditor(false); }}
                /> Regular
              </label>
              <label>
                <input 
                  type="radio" 
                  name="deckType" 
                  value="filtered" 
                  checked={deckType === 'filtered'} 
                  onChange={(e) => { setDeckType(e.target.value as 'regular' | 'filtered'); setShowFilteredDeckEditor(true); }}
                /> Filtered
              </label>
            </div>
          </div>
        )}
        
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
        
        <div className="form-group">
          <label htmlFor="parentDeck">Parent Deck (optional):</label>
          <select
            id="parentDeck"
            value={selectedParentId || ''}
            onChange={(e) => setSelectedParentId(e.target.value || undefined)}
            className="parent-deck-select"
          >
            <option value="">None (Root Deck)</option>
            {availableParentDecks.map(parent => (
              <option key={parent.id} value={parent.id}>
                {parent.name} {/* TODO: Indicate parent hierarchy for better UX */}
              </option>
            ))}
          </select>
        </div>
        
        {/* Show FilteredDeckEditor if type is filtered and either new or editor is toggled */}
        {(deckType === 'filtered' && (isNewDeck || showFilteredDeckEditor && currentDeck && isFilteredDeck(currentDeck))) && (
          <div className="form-group">
             <label>Filters:</label>
             <FilteredDeckEditor 
                onSave={handleFilteredDeckSave} 
                onCancel={() => setShowFilteredDeckEditor(false)} 
                existingDeck={currentDeck && isFilteredDeck(currentDeck) ? currentDeck : undefined} 
                allDecks={allDecksFromHook} // Pass all decks for source deck filter
             />
          </div>
        )}

        <button className="save-deck-button" onClick={handleSaveDeck}>
          {isNewDeck ? 'Create Deck' : 'Save Changes'}
        </button>
      </div>

      {/* Card Management Section - only for REGULAR decks and when NOT new */}
      {!isNewDeck && currentDeck && isRegularDeck(currentDeck) && !showFilteredDeckEditor && (
        <div className="cards-management">
          <div className="cards-header">
            <h2>Cards in this Deck</h2>
            <button 
              className="add-card-button"
              onClick={handleAddNewCard}
            >
              Add New Card
            </button>
          </div>
          
          {showCardEditor && (
            <CardEditor
              currentDeckId={deckId}
              initialCard={editingCard || { deckId: deckId } as AppCard}
              allCards={allSystemCards}
              onSave={handleSaveCard}
              onCancel={() => {setShowCardEditor(false); setEditingCard(null);}}
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
