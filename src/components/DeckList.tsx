import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { Deck, DeckCommon } from '../models/Deck';
import { Card as AppCard } from '../models/Card';
import CircularProgressBar from './CircularProgressBar';
import '../styles/DeckList.css';

interface DeckWithChildren extends DeckCommon {
  parentId?: string;
  cardIds?: string[];
  filters?: any[];
  children: DeckWithChildren[];
  level: number;
}

interface DeckListItemProps {
  deck: DeckWithChildren;
  onSelectDeck: (deckId: string) => void;
  getCardsByDeckId: (deckId: string) => AppCard[];
  calculateDueCards: (deckId: string) => number;
  handleNewCard: (deckId: string, e: React.MouseEvent) => void;
  handleChallengeMode: (deckId: string, e: React.MouseEvent) => void;
  handleCreateSubdeck: (parentId: string) => void;
}

const DeckListItem: React.FC<DeckListItemProps> = ({
  deck,
  onSelectDeck,
  getCardsByDeckId,
  calculateDueCards,
  handleNewCard,
  handleChallengeMode,
  handleCreateSubdeck,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const toggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  return (
    <>
      <div 
        key={deck.id} 
        className={`deck-card level-${deck.level} ${deck.children.length > 0 ? 'has-children' : ''}`}
        style={{ marginLeft: `${deck.level * 24}px` }}
        onClick={() => onSelectDeck(deck.id)}
      >
        <div className="deck-content-wrapper">
          {deck.children.length > 0 && (
            <button 
              className={`expand-collapse-button ${isExpanded ? 'expanded' : 'collapsed'}`}
              onClick={toggleExpand}
              aria-label={isExpanded ? 'Collapse' : 'Expand'}
            >
              {isExpanded ? '▼' : '▶'}
            </button>
          )}
          <div className="deck-icon">{deck.icon || '📚'}</div>
          <div className="deck-details">
            <h3 className="deck-name">{deck.name}</h3>
            <p className="deck-description">{deck.description || 'No description'}</p>
            <div className="deck-stats">
              <span className="deck-stat">
                <i className="stat-icon cards-icon">🃏</i>
                {getCardsByDeckId(deck.id).length} cards
              </span>
              <span className="deck-stat">
                <i className="stat-icon due-icon">⏰</i>
                {calculateDueCards(deck.id)} due
              </span>
            </div>
          </div>
        </div>
        <div className="deck-actions">
          <CircularProgressBar 
            percentage={Math.round((deck.mastery || 0) * 100)} 
            size={55} 
          />
          <button 
            className="challenge-button btn-icon-only" 
            onClick={(e) => handleChallengeMode(deck.id, e)}
            aria-label="Challenge Mode"
            title="Challenge Mode"
          >
            🏆
          </button>
          <button 
            className="add-card-button btn-icon-only" 
            onClick={(e) => handleNewCard(deck.id, e)}
            aria-label="Add new card"
            title="Add New Card"
          >
            +
          </button>
          <button
            className="create-subdeck-button btn-icon-only"
            onClick={e => { e.stopPropagation(); handleCreateSubdeck(deck.id); }}
            aria-label="Create Subdeck"
            title="Create Subdeck"
          >
            ➕
          </button>
        </div>
      </div>
      {isExpanded && deck.children && deck.children.length > 0 && (
        <div className="deck-children">
          {deck.children.map(childDeck => (
            <DeckListItem
              key={childDeck.id}
              deck={childDeck}
              onSelectDeck={onSelectDeck}
              getCardsByDeckId={getCardsByDeckId}
              calculateDueCards={calculateDueCards}
              handleNewCard={handleNewCard}
              handleChallengeMode={handleChallengeMode}
              handleCreateSubdeck={handleCreateSubdeck}
            />
          ))}
        </div>
      )}
    </>
  );
};

interface DeckListProps {
  decks?: Deck[];
  onSelectDeck: (deckId: string) => void;
}

const DeckList: React.FC<DeckListProps> = ({ onSelectDeck, decks: propDecks }) => {
  const { decks: contextDecks, getCardsByDeckId } = useData();
  const navigate = useNavigate();
  
  const decksToRender = propDecks || contextDecks;

  const buildDeckTree = (deckList: Deck[], parentId: string | null = null, level = 0): DeckWithChildren[] => {
    return deckList
      .filter(deck => (deck.parentId || null) === parentId)
      .map(deck => {
        const commonDeckPart: DeckCommon = deck;
        return {
          ...commonDeckPart,
          type: deck.type,
          cardIds: (deck as any).cardIds,
          filters: (deck as any).filters,
          level,
          children: buildDeckTree(deckList, deck.id, level + 1)
        };
      });
  };

  const deckTree = buildDeckTree(decksToRender);
  
  const handleNewCard = (deckId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/deck/${deckId}/new-card`);
  };
  
  const handleChallengeMode = (deckId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/challenge/${deckId}`);
  };
  
  const handleCreateSubdeck = (parentId: string) => {
    navigate(`/deck/new?parentId=${parentId}`);
  };
  
  const calculateDueCards = (deckId: string) => {
    const cards = getCardsByDeckId(deckId);
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    
    return cards.filter((card: AppCard) => 
      new Date(card.scheduling.dueDate) <= today
    ).length;
  };

  if (!decksToRender || decksToRender.length === 0) {
    return (
      <div className="empty-decks-message">
        <p>You don't have any decks yet.</p>
        <p>Create your first deck to get started!</p>
      </div>
    );
  }

  const renderDeckTree = (deckTree: DeckWithChildren[]) =>
    deckTree.map(deck => (
      <DeckListItem
        key={deck.id}
        deck={deck}
        onSelectDeck={onSelectDeck}
        getCardsByDeckId={getCardsByDeckId}
        calculateDueCards={calculateDueCards}
        handleNewCard={handleNewCard}
        handleChallengeMode={handleChallengeMode}
        handleCreateSubdeck={handleCreateSubdeck}
      />
    ));

  return (
    <div className="deck-list">
      {renderDeckTree(deckTree)}
    </div>
  );
};

export default DeckList; 