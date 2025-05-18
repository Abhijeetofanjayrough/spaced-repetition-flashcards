import React from 'react';
import { useNavigate } from 'react-router-dom';
import { StudySession } from './StudySession';
import { useData } from '../contexts/DataContext';

const RandomMixSession: React.FC = () => {
  const navigateTo = useNavigate();
  // const { cards } = useData(); // No longer directly passing cards

  // if (!cards || cards.length === 0) {
  //   return <p>Loading cards or no cards available for a random mix.</p>;
  // }

  // The StudySession component with randomMode will handle fetching/selecting random cards
  return <StudySession randomMode={true} />;
};

export default RandomMixSession; 