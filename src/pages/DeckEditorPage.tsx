import React from 'react';
import { useParams } from 'react-router-dom';

const DeckEditorPage: React.FC = () => {
  const { deckId } = useParams<{ deckId?: string }>();
  return <div><h1>{deckId ? 'Edit Deck' : 'Create Deck'}</h1><p>Deck ID: {deckId}</p></div>;
};

export default DeckEditorPage; 