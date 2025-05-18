import React, { useState, useEffect, useMemo } from 'react';
import katex from 'katex';
import 'katex/dist/katex.min.css'; // Import KaTeX CSS
import './Flashcard.css';

// Utility function to render KaTeX expressions within an HTML string
const renderLatexInHtml = (htmlString: string): string => {
  if (!htmlString) return '';

  // Process block mode LaTeX (e.g., $$...$$)
  let processedHtml = htmlString.replace(/\\$\$(.*?)\\$\$/g, (match, latexExp) => {
    try {
      return katex.renderToString(latexExp, { displayMode: true, throwOnError: false });
    } catch (e) {
      console.error('KaTeX rendering error (block):', e);
      return match; // Return original string on error
    }
  });

  // Corrected regex for inline LaTeX \\(...\\) using /\\((.*?)\\)/g for regex literal
  processedHtml = processedHtml.replace(/\\((.*?)\\)/g, (match, latexExp) => {
    try {
      return katex.renderToString(latexExp, { displayMode: false, throwOnError: false });
    } catch (e) {
      console.error('KaTeX rendering error (inline):', e);
      return match; // Return original string on error
    }
  });

  return processedHtml;
};

interface FlashcardProps {
  front: string;
  back: string;
  isFlipped?: boolean;
  onFlip?: () => void;
  frontFooter?: React.ReactNode;
  backFooter?: React.ReactNode;
  className?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
}

const Flashcard: React.FC<FlashcardProps> = ({
  front,
  back,
  isFlipped = false,
  onFlip,
  frontFooter,
  backFooter,
  className = '',
  difficulty,
}) => {
  const [flipped, setFlipped] = useState(isFlipped);
  const [animation, setAnimation] = useState('');

  useEffect(() => {
    setFlipped(isFlipped);
  }, [isFlipped]);

  const handleClick = () => {
    if (onFlip) {
      onFlip();
    } else {
      setFlipped(!flipped);
    }

    // Add animation when flipping
    setAnimation('animate-flip');
    setTimeout(() => setAnimation(''), 700); // Reset animation after it completes
  };

  // Memoize processed HTML to avoid re-rendering KaTeX on every render unless content changes
  const processedFront = useMemo(() => renderLatexInHtml(front), [front]);
  const processedBack = useMemo(() => renderLatexInHtml(back), [back]);

  // Determine difficulty class if provided
  let difficultyClass = '';
  if (difficulty) {
    difficultyClass = `flashcard-${difficulty}`;
  }

  return (
    <div 
      className={`flashcard-container ${className}`}
      onClick={handleClick}
    >
      <div className={`flashcard ${flipped ? 'flipped' : ''} ${animation} ${difficultyClass}`}>
        <div className="flashcard-inner">
          <div className="flashcard-face flashcard-front">
            <div className="flashcard-content" dangerouslySetInnerHTML={{ __html: processedFront }} />
            {frontFooter && <div className="flashcard-footer">{frontFooter}</div>}
          </div>
          <div className="flashcard-face flashcard-back">
            <div className="flashcard-content" dangerouslySetInnerHTML={{ __html: processedBack }} />
            {backFooter && <div className="flashcard-footer">{backFooter}</div>}
          </div>
        </div>
        
        <div className="flashcard-indicator">
          <div className="flashcard-flip-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 2v6h-6"></path>
              <path d="M3 12a9 9 0 0 1 15-6.7L21 8"></path>
              <path d="M3 22v-6h6"></path>
              <path d="M21 12a9 9 0 0 1-15 6.7L3 16"></path>
            </svg>
          </div>
          <span className="flashcard-flip-text">Click to flip</span>
        </div>
      </div>
    </div>
  );
};

export default Flashcard;
