import React from 'react';
import { useParams } from 'react-router-dom';

const CardEditorPage: React.FC = () => {
  const { cardId } = useParams<{ cardId?: string }>();
  return <div><h1>{cardId ? 'Edit Card' : 'Create Card'}</h1><p>Card ID: {cardId}</p></div>;
};

export default CardEditorPage; 