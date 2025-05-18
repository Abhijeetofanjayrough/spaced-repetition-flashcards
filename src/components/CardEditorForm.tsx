import React, { useState, useRef, useEffect } from 'react';
import { Card } from '../models/Card';
import { Deck } from '../models/Deck';
import './CardEditorForm.css';
import { getInitialScheduling } from '../spacedRepetition';
import ReactCrop, { Crop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import KaTeX from 'katex';
import 'katex/dist/katex.min.css';
import { Light as SyntaxHighlighter } from 'react-syntax-highlighter';
import js from 'react-syntax-highlighter/dist/esm/languages/hljs/javascript';
import python from 'react-syntax-highlighter/dist/esm/languages/hljs/python';
import css from 'react-syntax-highlighter/dist/esm/languages/hljs/css';
import docco from 'react-syntax-highlighter/dist/esm/styles/hljs/docco';
import Papa from 'papaparse';
import Modal from 'react-modal';
import { v4 as uuidv4 } from 'uuid';

// Register languages for syntax highlighting
SyntaxHighlighter.registerLanguage('javascript', js);
SyntaxHighlighter.registerLanguage('python', python);
SyntaxHighlighter.registerLanguage('css', css);

interface CardEditorFormProps {
  onSaveCard: (card: Card) => void;
  onSaveMultipleCards?: (cards: Card[]) => void;
  initialCard?: Card;
  deckId: string;
  cards: Card[];
  decks: Deck[];
}

const CardEditorForm: React.FC<CardEditorFormProps> = ({
  onSaveCard, 
  onSaveMultipleCards,
  initialCard,
  deckId,
  cards,
  decks
}) => {
  // Basic card state
  const [front, setFront] = useState(initialCard?.front || '');
  const [back, setBack] = useState(initialCard?.back || '');
  const [tags, setTags] = useState(initialCard?.tags?.join(', ') || '');
  const [cardType, setCardType] = useState<'basic' | 'cloze' | 'image-occlusion' | 'multi-choice'>(
    initialCard?.cardType === 'cloze' ? 'cloze' : 'basic'
  );
  
  // Reference for rich text editors
  const frontEditorRef = useRef<HTMLDivElement>(null);
  const backEditorRef = useRef<HTMLDivElement>(null);
  
  // Cloze deletion state
  const [clozeText, setClozeText] = useState('');
  
  // Image occlusion state
  const [occlusionImage, setOcclusionImage] = useState<string | null>(null);
  const [occlusions, setOcclusions] = useState<{id: string, x: number, y: number, width: number, height: number}[]>([]);
  const [currentOcclusion, setCurrentOcclusion] = useState<Crop | null>(null);
  const [occlusionImageWidth, setOcclusionImageWidth] = useState(0);
  const [occlusionImageHeight, setOcclusionImageHeight] = useState(0);
  
  // Multiple choice state
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState<string[]>(['', '', '', '']);
  const [correctOption, setCorrectOption] = useState(0);
  
  // Batch import state
  const [showBatchImport, setShowBatchImport] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importText, setImportText] = useState('');
  const [importPreview, setImportPreview] = useState<any[]>([]);
  const [importFormat, setImportFormat] = useState<'csv' | 'txt' | 'json'>('csv');
  const [importStatus, setImportStatus] = useState('');
  
  // Advanced features
  const [showMathEditor, setShowMathEditor] = useState(false);
  const [mathExpression, setMathExpression] = useState('');
  const [showCodeEditor, setShowCodeEditor] = useState(false);
  const [codeSnippet, setCodeSnippet] = useState('');
  const [codeLanguage, setCodeLanguage] = useState('javascript');
  const [activeEditor, setActiveEditor] = useState<'front' | 'back'>('front');
  
  // AI assistance
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiResults, setAiResults] = useState<{front: string, back: string}[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  
  // Prerequisite tracking
  const [prerequisites, setPrerequisites] = useState<string[]>(initialCard?.prerequisiteCardIds || []);
  const [isPrerequisiteFor, setIsPrerequisiteFor] = useState<string[]>(initialCard?.prerequisiteForIds || []);
  
  // Create a new card
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    
    let cardFront = front;
    let cardBack = back;
    
    // Handle different card types
    if (cardType === 'cloze') {
      // Convert cloze text to HTML
      const clozeRegex = /\{\{(.*?)\}\}/g;
      let match;
      let processedCloze = clozeText;
      
      while ((match = clozeRegex.exec(clozeText)) !== null) {
        const fullMatch = match[0];
        const innerText = match[1];
        
        processedCloze = processedCloze.replace(
          fullMatch, 
          `<span class="cloze-deletion">${innerText}</span>`
        );
      }
      
      cardFront = processedCloze;
      cardBack = back || clozeText; // Use back text or original text if back is empty
    } else if (cardType === 'image-occlusion' && occlusionImage) {
      if (occlusions.length === 0) {
        alert('Please add at least one occlusion area');
        return;
      }
      
      // Create separate cards for each occlusion
      for (const occlusion of occlusions) {
        const frontHtml = `
          <div class="occlusion-container">
            <img src="${occlusionImage}" style="max-width: 100%;" />
            <div class="occlusion-overlay" style="
              position: absolute;
              left: ${(occlusion.x / occlusionImageWidth) * 100}%;
              top: ${(occlusion.y / occlusionImageHeight) * 100}%;
              width: ${(occlusion.width / occlusionImageWidth) * 100}%;
              height: ${(occlusion.height / occlusionImageHeight) * 100}%;
              background-color: rgba(0, 0, 0, 0.8);
              z-index: 10;
            "></div>
          </div>
        `;
        
        const backHtml = `
          <div class="occlusion-container">
            <img src="${occlusionImage}" style="max-width: 100%;" />
          </div>
          <div class="occlusion-answer">${back}</div>
        `;
        
        const occlusionCard: Card = {
          id: uuidv4(),
          front: frontHtml,
          back: backHtml,
          cardType: 'basic',
          tags: tags.split(',').map(t => t.trim()).filter(Boolean),
          deckId,
          created: new Date().toISOString(),
          modified: new Date().toISOString(),
          reviewHistory: [],
          scheduling: getInitialScheduling(),
          prerequisiteCardIds: prerequisites,
          prerequisiteForIds: isPrerequisiteFor
        };
        
        onSaveCard(occlusionCard);
      }
      
      // Reset form after saving multiple occlusion cards
      resetForm();
      return;
    } else if (cardType === 'multi-choice') {
      cardFront = `
        <div class="multi-choice-question">${question}</div>
        <ol class="multi-choice-options" type="A">
          ${options.map(option => `<li>${option}</li>`).join('')}
        </ol>
      `;
      
      cardBack = `
        <div class="multi-choice-answer">
          Correct answer: <strong>${String.fromCharCode(65 + correctOption)}</strong>
          <div class="multi-choice-explanation">${options[correctOption]}</div>
        </div>
      `;
    }
    
    // Create the card
    const newCard: Card = {
      id: initialCard?.id || uuidv4(),
      front: cardFront,
      back: cardBack,
      cardType: cardType === 'basic' || cardType === 'multi-choice' || cardType === 'image-occlusion' ? 'basic' : 'cloze',
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      deckId,
      created: initialCard?.created || new Date().toISOString(),
      modified: new Date().toISOString(),
      reviewHistory: initialCard?.reviewHistory || [],
      scheduling: initialCard?.scheduling || getInitialScheduling(),
      favorite: initialCard?.favorite || false,
      archived: initialCard?.archived || false,
      prerequisiteCardIds: prerequisites,
      prerequisiteForIds: isPrerequisiteFor
    };
    
    onSaveCard(newCard);
    
    if (!initialCard) {
      resetForm();
    }
  };
  
  // Reset form to initial state
  const resetForm = () => {
    setFront('');
    setBack('');
    setTags('');
    setCardType('basic');
    setClozeText('');
    setOcclusionImage(null);
    setOcclusions([]);
    setQuestion('');
    setOptions(['', '', '', '']);
    setCorrectOption(0);
    setPrerequisites([]);
    setIsPrerequisiteFor([]);
  };
  
  // Handle file selection for image occlusion
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setOcclusionImage(event.target.result as string);
        
        // Get image dimensions
        const img = new Image();
        img.onload = () => {
          setOcclusionImageWidth(img.width);
          setOcclusionImageHeight(img.height);
        };
        img.src = event.target.result as string;
      }
    };
    reader.readAsDataURL(file);
  };
  
  // Add a new occlusion
  const addOcclusion = () => {
    if (currentOcclusion && occlusionImage) {
      setOcclusions([
        ...occlusions,
        {
          id: uuidv4(),
          x: currentOcclusion.x,
          y: currentOcclusion.y,
          width: currentOcclusion.width,
          height: currentOcclusion.height
        }
      ]);
      setCurrentOcclusion(null);
    }
  };
  
  // Remove an occlusion
  const removeOcclusion = (id: string) => {
    setOcclusions(occlusions.filter(o => o.id !== id));
  };
  
  // Handle math expression input
  const insertMathExpression = () => {
    try {
      const html = KaTeX.renderToString(mathExpression, {
        throwOnError: true,
        displayMode: true
      });
      
      const editor = activeEditor === 'front' ? frontEditorRef.current : backEditorRef.current;
      if (editor) {
        const range = window.getSelection()?.getRangeAt(0);
        if (range) {
          const mathElement = document.createElement('div');
          mathElement.className = 'math-expression';
          mathElement.innerHTML = html;
          range.deleteContents();
          range.insertNode(mathElement);
        }
      }
      
      setShowMathEditor(false);
    } catch (error) {
      alert('Invalid math expression');
    }
  };
  
  // Handle code snippet input
  const insertCodeSnippet = () => {
    const editor = activeEditor === 'front' ? frontEditorRef.current : backEditorRef.current;
    if (editor) {
      const range = window.getSelection()?.getRangeAt(0);
      if (range) {
        const codeElement = document.createElement('div');
        codeElement.className = 'code-snippet';
        codeElement.setAttribute('data-language', codeLanguage);
        
        const pre = document.createElement('pre');
        const code = document.createElement('code');
        code.className = `language-${codeLanguage}`;
        code.textContent = codeSnippet;
        
        pre.appendChild(code);
        codeElement.appendChild(pre);
        
        range.deleteContents();
        range.insertNode(codeElement);
      }
    }
    
    setShowCodeEditor(false);
  };
  
  // Handle batch import
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setImportFile(file);
    
    // Determine format based on file extension
    if (file.name.endsWith('.csv')) {
      setImportFormat('csv');
    } else if (file.name.endsWith('.txt')) {
      setImportFormat('txt');
    } else if (file.name.endsWith('.json')) {
      setImportFormat('json');
    }
    
    // Read file content
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        const content = event.target.result as string;
        setImportText(content);
        
        // Generate preview
        if (file.name.endsWith('.csv')) {
          Papa.parse(content, {
            header: true,
            preview: 3,
            complete: (results) => {
              setImportPreview(results.data);
            }
          });
        } else if (file.name.endsWith('.txt')) {
          const lines = content.split('\n\n').slice(0, 3).map(pair => {
            const [q, a] = pair.split('\n');
            return { front: q, back: a };
          });
          setImportPreview(lines);
        } else if (file.name.endsWith('.json')) {
          try {
            const json = JSON.parse(content);
            setImportPreview(json.slice(0, 3));
          } catch (e) {
            console.error('Invalid JSON file');
            setImportPreview([]);
          }
        }
      }
    };
    reader.readAsText(file);
  };
  
  // Process batch import
  const processBatchImport = () => {
    if (!importFile || !importText) {
      setImportStatus('No file selected');
      return;
    }
    
    try {
      let cards: Card[] = [];
      
      if (importFormat === 'csv') {
        Papa.parse(importText, {
          header: true,
          complete: (results) => {
            cards = results.data
              .filter((row: any) => row.front || row.question)
              .map((row: any) => {
                const front = row.front || row.question || '';
                const back = row.back || row.answer || '';
                const cardTags = row.tags ? row.tags.split(',').map((t: string) => t.trim()) : [];
                const type = row.type === 'cloze' ? 'cloze' : 'basic';
                
                return {
                  id: uuidv4(),
                  front,
                  back,
                  cardType: type as 'basic' | 'cloze',
                  tags: cardTags,
                  deckId,
                  created: new Date().toISOString(),
                  modified: new Date().toISOString(),
                  reviewHistory: [],
                  scheduling: getInitialScheduling()
                } as Card;
              });
            
            if (cards.length > 0 && onSaveMultipleCards) {
              onSaveMultipleCards(cards);
              setImportStatus(`Imported ${cards.length} cards successfully`);
              setShowBatchImport(false);
            } else {
              setImportStatus('No valid cards found in import file');
            }
          },
          error: (error: any) => {
            setImportStatus(`Error: ${error.message}`);
          }
        });
      } else if (importFormat === 'txt') {
        const pairs = importText.split('\n\n');
        cards = pairs
          .map((pair): Card | null => {
            const lines = pair.split('\n');
            if (lines.length < 2) return null;
            
            return {
              id: uuidv4(),
              front: lines[0],
              back: lines.slice(1).join('\n'),
              cardType: 'basic',
              tags: [],
              deckId,
              created: new Date().toISOString(),
              modified: new Date().toISOString(),
              reviewHistory: [],
              scheduling: getInitialScheduling()
            };
          })
          .filter((card): card is Card => card !== null);
        
        if (cards.length > 0 && onSaveMultipleCards) {
          onSaveMultipleCards(cards);
          setImportStatus(`Imported ${cards.length} cards successfully`);
          setShowBatchImport(false);
        } else {
          setImportStatus('No valid cards found in import file');
        }
      } else if (importFormat === 'json') {
        try {
          const jsonData = JSON.parse(importText);
          
          if (Array.isArray(jsonData)) {
            cards = jsonData.map(item => ({
              id: uuidv4(),
              front: item.front || item.question || '',
              back: item.back || item.answer || '',
              cardType: item.type === 'cloze' ? 'cloze' : 'basic',
              tags: Array.isArray(item.tags) ? item.tags : [],
              deckId,
              created: new Date().toISOString(),
              modified: new Date().toISOString(),
              reviewHistory: [],
              scheduling: getInitialScheduling()
            }));
            
            if (cards.length > 0 && onSaveMultipleCards) {
              onSaveMultipleCards(cards);
              setImportStatus(`Imported ${cards.length} cards successfully`);
              setShowBatchImport(false);
            } else {
              setImportStatus('No valid cards found in import file');
            }
          } else {
            setImportStatus('Invalid JSON format. Expected an array of cards.');
          }
        } catch (e) {
          setImportStatus('Invalid JSON file');
        }
      }
    } catch (error) {
      setImportStatus(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };
  
  // AI-assisted card generation
  const generateCardsWithAI = async () => {
    if (!aiPrompt.trim()) {
      return;
    }
    
    setAiLoading(true);
    
    try {
      const response = await fetch('/api/gemini-proxy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: `Generate 5-10 high-quality flashcards from this text: "${aiPrompt}"
                  Return ONLY a JSON array like this:
                  [
                    {"front": "Question text", "back": "Answer text"},
                    ...more cards...
                  ]
                  Make the cards concise but comprehensive. Use HTML formatting if helpful.`,
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate cards');
      }
      
      const data = await response.json();
      let cards: {front: string, back: string}[] = [];
      
      try {
        // Try to extract valid JSON from the response
        const jsonMatch = data.text.match(/\[[\s\S]*?\{[\s\S]*?\}[\s\S]*?\]/);
        if (jsonMatch) {
          cards = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('Invalid response format');
        }
      } catch (e) {
        throw new Error('Failed to parse AI response');
      }
      
      setAiResults(cards);
    } catch (error) {
      alert(`Error: ${error instanceof Error ? error.message : 'Failed to generate cards'}`);
    } finally {
      setAiLoading(false);
    }
  };
  
  // Create cards from AI results
  const createCardsFromAIResults = () => {
    if (!aiResults.length || !onSaveMultipleCards) return;
    
    const cards: Card[] = aiResults.map(result => ({
      id: uuidv4(),
      front: result.front,
      back: result.back,
      cardType: 'basic',
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      deckId,
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
      reviewHistory: [],
      scheduling: getInitialScheduling()
    }));
    
    onSaveMultipleCards(cards);
    setShowAIModal(false);
    setAiPrompt('');
    setAiResults([]);
  };
  
  // Add a new option for multiple choice
  const addOption = () => {
    setOptions([...options, '']);
  };
  
  // Remove an option from multiple choice
  const removeOption = (index: number) => {
    if (options.length <= 2) {
      alert('Multiple choice cards need at least 2 options');
      return;
    }
    
    const newOptions = [...options];
    newOptions.splice(index, 1);
    
    // Adjust correct answer index if needed
    if (correctOption === index) {
      setCorrectOption(0);
    } else if (correctOption > index) {
      setCorrectOption(correctOption - 1);
    }
    
    setOptions(newOptions);
  };
  
  return (
    <div className="card-editor-form">
      <div className="card-type-selector">
        <button 
          className={cardType === 'basic' ? 'active' : ''} 
          onClick={() => setCardType('basic')}
        >
          Basic
        </button>
        <button 
          className={cardType === 'cloze' ? 'active' : ''} 
          onClick={() => setCardType('cloze')}
        >
          Cloze
        </button>
        <button 
          className={cardType === 'image-occlusion' ? 'active' : ''} 
          onClick={() => setCardType('image-occlusion')}
        >
          Image Occlusion
        </button>
        <button 
          className={cardType === 'multi-choice' ? 'active' : ''} 
          onClick={() => setCardType('multi-choice')}
        >
          Multiple Choice
        </button>
      </div>
      
      <form onSubmit={handleSave}>
        {/* Basic Card Form */}
        {cardType === 'basic' && (
          <div className="card-form-fields">
            <div className="form-group">
              <label htmlFor="front">Front (Question)</label>
              <div
                ref={frontEditorRef}
                className="rich-text-editor"
                contentEditable
                dangerouslySetInnerHTML={{ __html: front }}
                onInput={(e) => setFront(e.currentTarget.innerHTML)}
                onFocus={() => setActiveEditor('front')}
              ></div>
              <div className="editor-toolbar">
                <button type="button" onClick={() => setShowMathEditor(true)}>Math</button>
                <button type="button" onClick={() => setShowCodeEditor(true)}>Code</button>
              </div>
            </div>
            
            <div className="form-group">
              <label htmlFor="back">Back (Answer)</label>
              <div
                ref={backEditorRef}
                className="rich-text-editor"
                contentEditable
                dangerouslySetInnerHTML={{ __html: back }}
                onInput={(e) => setBack(e.currentTarget.innerHTML)}
                onFocus={() => setActiveEditor('back')}
              ></div>
              <div className="editor-toolbar">
                <button type="button" onClick={() => setShowMathEditor(true)}>Math</button>
                <button type="button" onClick={() => setShowCodeEditor(true)}>Code</button>
              </div>
            </div>
          </div>
        )}
        
        {/* Cloze Card Form */}
        {cardType === 'cloze' && (
          <div className="card-form-fields">
            <div className="form-group">
              <label htmlFor="clozeText">Text with Cloze Deletions</label>
              <p className="help-text">
                Use double curly braces to mark cloze deletions: {'{{word}}'}
              </p>
              <textarea
                id="clozeText"
                value={clozeText}
                onChange={(e) => setClozeText(e.target.value)}
                rows={5}
                placeholder="The capital of France is {{Paris}}."
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="back">Additional Notes (Optional)</label>
              <div
                ref={backEditorRef}
                className="rich-text-editor"
                contentEditable
                dangerouslySetInnerHTML={{ __html: back }}
                onInput={(e) => setBack(e.currentTarget.innerHTML)}
                onFocus={() => setActiveEditor('back')}
              ></div>
            </div>
          </div>
        )}
        
        {/* Image Occlusion Form */}
        {cardType === 'image-occlusion' && (
          <div className="card-form-fields">
            <div className="form-group">
              <label>Image for Occlusion</label>
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleImageUpload} 
              />
              
              {occlusionImage && (
                <div className="occlusion-editor">
                  <ReactCrop
                    crop={currentOcclusion || undefined}
                    onChange={(c) => setCurrentOcclusion(c)}
                    aspect={undefined}
                  >
                    <img 
                      src={occlusionImage} 
                      alt="Occlusion" 
                      style={{ maxWidth: '100%' }} 
                    />
                  </ReactCrop>
                  
                  <button 
                    type="button" 
                    onClick={addOcclusion}
                    disabled={!currentOcclusion}
                  >
                    Add Occlusion
                  </button>
                  
                  {occlusions.length > 0 && (
                    <div className="occlusion-list">
                      <h4>Occlusions ({occlusions.length})</h4>
                      <ul>
                        {occlusions.map((o, index) => (
                          <li key={o.id}>
                            Occlusion {index + 1} 
                            <button 
                              type="button" 
                              onClick={() => removeOcclusion(o.id)}
                            >
                              Remove
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <div className="form-group">
              <label htmlFor="back">Occlusion Answer/Notes</label>
              <textarea
                id="back"
                value={back}
                onChange={(e) => setBack(e.target.value)}
                rows={3}
                placeholder="What is the occluded part?"
              />
            </div>
          </div>
        )}
        
        {/* Multiple Choice Form */}
        {cardType === 'multi-choice' && (
          <div className="card-form-fields">
            <div className="form-group">
              <label htmlFor="question">Question</label>
              <textarea
                id="question"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                rows={3}
                placeholder="What is the capital of France?"
              />
            </div>
            
            <div className="form-group">
              <label>Options</label>
              {options.map((option, index) => (
                <div key={index} className="option-row">
                  <input
                    type="radio"
                    name="correctOption"
                    checked={correctOption === index}
                    onChange={() => setCorrectOption(index)}
                  />
                  <input
                    type="text"
                    value={option}
                    onChange={(e) => {
                      const newOptions = [...options];
                      newOptions[index] = e.target.value;
                      setOptions(newOptions);
                    }}
                    placeholder={`Option ${String.fromCharCode(65 + index)}`}
                  />
                  <button 
                    type="button" 
                    onClick={() => removeOption(index)}
                  >
                    Remove
                  </button>
                </div>
              ))}
              
              <button 
                type="button" 
                onClick={addOption}
              >
                Add Option
              </button>
            </div>
          </div>
        )}
        
        {/* Common fields for all card types */}
        <div className="form-group">
          <label htmlFor="tags">Tags (comma separated)</label>
          <input
            type="text"
            id="tags"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="history, europe, capitals"
          />
        </div>
        
        {/* Prerequisites */}
        <div className="form-group">
          <label>Prerequisites for this card</label>
          <select
            multiple
            value={prerequisites}
            onChange={(e) => {
              const selected = Array.from(e.target.selectedOptions).map(o => o.value);
              setPrerequisites(selected);
            }}
          >
            {cards
              .filter(c => c.id !== initialCard?.id)
              .map(card => (
                <option key={card.id} value={card.id}>
                  {card.front.replace(/<[^>]+>/g, '').substring(0, 40)}...
                </option>
              ))}
          </select>
          <p className="help-text">Hold Ctrl/Cmd to select multiple</p>
        </div>
        
        <div className="form-actions">
          <button type="submit" className="primary-button">
            {initialCard ? 'Update Card' : 'Create Card'}
          </button>
          
          <button 
            type="button" 
            className="secondary-button"
            onClick={() => setShowBatchImport(true)}
          >
            Batch Import
          </button>
          
          <button 
            type="button" 
            className="ai-button"
            onClick={() => setShowAIModal(true)}
          >
            AI Generate
          </button>
        </div>
      </form>
      
      {/* Math Editor Modal */}
      <Modal
        isOpen={showMathEditor}
        onRequestClose={() => setShowMathEditor(false)}
        contentLabel="Math Expression Editor"
        className="editor-modal"
        ariaHideApp={false}
      >
        <h2>Math Expression Editor</h2>
        <textarea
          value={mathExpression}
          onChange={(e) => setMathExpression(e.target.value)}
          rows={5}
          placeholder="Enter LaTeX expression, e.g. \frac{1}{2} \cdot \pi r^2"
        />
        <div className="modal-preview">
          <h3>Preview</h3>
          <div className="math-preview">
            {mathExpression && (
              <div dangerouslySetInnerHTML={{ 
                __html: KaTeX.renderToString(mathExpression, { 
                  throwOnError: false, 
                  displayMode: true 
                }) 
              }} />
            )}
          </div>
        </div>
        <div className="modal-actions">
          <button onClick={insertMathExpression}>Insert</button>
          <button onClick={() => setShowMathEditor(false)}>Cancel</button>
        </div>
      </Modal>
      
      {/* Code Editor Modal */}
      <Modal
        isOpen={showCodeEditor}
        onRequestClose={() => setShowCodeEditor(false)}
        contentLabel="Code Snippet Editor"
        className="editor-modal"
        ariaHideApp={false}
      >
        <h2>Code Snippet Editor</h2>
        <div className="language-selector">
          <label>Language:</label>
          <select 
            value={codeLanguage}
            onChange={(e) => setCodeLanguage(e.target.value)}
          >
            <option value="javascript">JavaScript</option>
            <option value="python">Python</option>
            <option value="css">CSS</option>
            <option value="html">HTML</option>
          </select>
        </div>
        <textarea
          value={codeSnippet}
          onChange={(e) => setCodeSnippet(e.target.value)}
          rows={8}
          placeholder="Enter code here..."
        />
        <div className="modal-preview">
          <h3>Preview</h3>
          <SyntaxHighlighter language={codeLanguage} style={docco}>
            {codeSnippet}
          </SyntaxHighlighter>
        </div>
        <div className="modal-actions">
          <button onClick={insertCodeSnippet}>Insert</button>
          <button onClick={() => setShowCodeEditor(false)}>Cancel</button>
        </div>
      </Modal>
      
      {/* Batch Import Modal */}
      <Modal
        isOpen={showBatchImport}
        onRequestClose={() => setShowBatchImport(false)}
        contentLabel="Batch Import Cards"
        className="import-modal"
        ariaHideApp={false}
      >
        <h2>Batch Import Cards</h2>
        <div className="import-instructions">
          <p>Upload a file with multiple cards. Supported formats:</p>
          <ul>
            <li><strong>CSV</strong>: columns should include front, back, tags (optional)</li>
            <li><strong>TXT</strong>: each card separated by blank line, question and answer on separate lines</li>
            <li><strong>JSON</strong>: array of objects with front/back properties</li>
          </ul>
        </div>
        <input
          type="file"
          accept=".csv,.txt,.json"
          onChange={handleFileSelect}
        />
        
        {importPreview.length > 0 && (
          <div className="import-preview">
            <h3>Preview</h3>
            <div className="preview-cards">
              {importPreview.map((item, index) => (
                <div key={index} className="preview-card">
                  <div className="preview-front">{item.front || item.question || 'N/A'}</div>
                  <div className="preview-back">{item.back || item.answer || 'N/A'}</div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {importStatus && <div className="import-status">{importStatus}</div>}
        
        <div className="modal-actions">
          <button 
            onClick={processBatchImport}
            disabled={!importFile}
          >
            Import Cards
          </button>
          <button onClick={() => setShowBatchImport(false)}>Cancel</button>
        </div>
      </Modal>
      
      {/* AI Generation Modal */}
      <Modal
        isOpen={showAIModal}
        onRequestClose={() => setShowAIModal(false)}
        contentLabel="AI Card Generation"
        className="ai-modal"
        ariaHideApp={false}
      >
        <h2>AI Card Generation</h2>
        <div className="ai-instructions">
          <p>Enter a topic or text, and AI will generate flashcards for you.</p>
        </div>
        <textarea
          value={aiPrompt}
          onChange={(e) => setAiPrompt(e.target.value)}
          rows={6}
          placeholder="Enter a topic or paste text to generate cards from..."
        />
        <button 
          onClick={generateCardsWithAI}
          disabled={aiLoading || !aiPrompt.trim()}
        >
          {aiLoading ? 'Generating...' : 'Generate Cards'}
        </button>
        
        {aiResults.length > 0 && (
          <div className="ai-results">
            <h3>Generated Cards ({aiResults.length})</h3>
            <div className="ai-cards">
              {aiResults.map((card, index) => (
                <div key={index} className="ai-card">
                  <div className="ai-card-front">{card.front}</div>
                  <div className="ai-card-back">{card.back}</div>
                </div>
              ))}
            </div>
            <button onClick={createCardsFromAIResults}>
              Create All Cards
            </button>
          </div>
        )}
        
        <button onClick={() => setShowAIModal(false)}>Cancel</button>
      </Modal>
    </div>
  );
};

export default CardEditorForm; 