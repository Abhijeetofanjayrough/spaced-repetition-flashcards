import React from 'react';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
// eslint-disable-next-line @typescript-eslint/no-unused-vars
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { useParams, Navigate, useNavigate } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import StudySession from './StudySession'; // Actual StudySession component
import { Card } from '../models/Card'; // Import Card type

// Wrapper component to fetch deck-specific cards and pass to StudySession
const StudySessionWrapper: React.FC = () => {
  const { deckId } = useParams<{ deckId: string }>();
  const { getCardsByDeckId, getDeckById, getCardById, isLoading, updateCard } = useData();
  const navigate = useNavigate(); // Initialize useNavigate

  if (isLoading) {
    return <p>Loading session...</p>;
  }

  if (!deckId) {
    // Should not happen if route is matched correctly
    return <p>No deck ID provided.</p>; 
  }

  const deck = getDeckById(deckId);
  if (!deck) {
    return <p>Deck not found.</p>;
    // Optionally, navigate to a 404 page or back to home
    // return <Navigate to="/" replace />;
  }

  const cardsForSession = getCardsByDeckId(deckId);

  if (cardsForSession.length === 0) {
    // Consider what to do if a deck has no cards. 
    // For now, show a message. Could navigate or offer to add cards.
    return (
      <div>
        <p>This deck has no cards to study.</p>
        {/* Link to add cards to this deck could go here */}
      </div>
    );
  }
  
  // The onSessionComplete prop for StudySession might need to interact with DataContext
  // to persist the updated card states after a session.
  const handleSessionComplete = (updatedCards: Card[]) => {
    // Persist updated scheduling data for each card
    updatedCards.forEach(card => {
      updateCard(card); // updateCard should handle persisting to DB and refreshing context
    });
    console.log('Session complete, cards updated.');
    // Navigation away from session can be handled by StudySession internal logic or here
  };
  
  // Define onReportCardRequest to pass to StudySession
  // This function will call the onReportCardRequest from DataContext if available or handle it directly.
  const handleReportCard = (cardToReport: Card, reportText: string) => {
    // This functionality would typically be passed up to App.tsx or handled by DataContext
    console.log(`Report for card ${cardToReport.id}: ${reportText}`);
    // Example: Call a function from useData if it exists, e.g., reportCard(cardToReport.id, reportText)
    // For now, just logging it.
  };

  const handleEditCardRequest = (cardToEdit: Card) => {
    if (deckId) {
      navigate(`/deck/${deckId}/edit-card/${cardToEdit.id}`);
    } else {
      // Fallback or error if deckId is somehow not available (should not happen here)
      console.error('Cannot edit card: current deckId is unknown.');
      navigate('/'); // Navigate home as a fallback
    }
  };

  const handleToggleFavorite = async (cardId: string) => {
    const card = getCardById(cardId);
    if (card) {
      const updatedCard = {
        ...card,
        favorite: !card.favorite,
        modified: new Date().toISOString(), // Update modified timestamp
      };
      await updateCard(updatedCard);
      // No navigation needed, StudySession UI should update based on new card prop from refreshed context data
    } else {
      console.warn(`Card with id ${cardId} not found for toggling favorite.`);
    }
  };

  const handleToggleArchive = async (cardId: string) => {
    const card = getCardById(cardId);
    if (card) {
      const updatedCard = {
        ...card,
        archived: !card.archived, // Toggle archived status
        modified: new Date().toISOString(), // Update modified timestamp
      };
      await updateCard(updatedCard);
      // If the card is archived, it might be removed from the current session's active list.
      // The StudySession component might need to re-filter or the parent (wrapper) might need to refresh cardsForSession.
      // For now, updateCard will refresh DataContext, and StudySession should ideally react to card changes.
    } else {
      console.warn(`Card with id ${cardId} not found for toggling archive status.`);
    }
  };

  return (
    <StudySession 
      deckId={deckId} 
      // cards={cardsForSession} 
      // onSessionComplete={handleSessionComplete} 
      // onReportCardRequest={handleReportCard}
      // onEditCardRequest={handleEditCardRequest}
      // onFavoriteToggle={handleToggleFavorite}
      // onArchiveToggle={handleToggleArchive} // Pass the archive toggle handler
    />
  );
};

export default StudySessionWrapper; 