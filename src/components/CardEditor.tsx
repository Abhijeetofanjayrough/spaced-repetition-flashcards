import React, { useState, useRef, useEffect } from 'react';
import { Card } from '../models/Card';
import { getInitialScheduling } from '../spacedRepetition'; // Import getInitialScheduling
import Papa from 'papaparse';
import ReactCrop, {
  centerCrop,
  makeAspectCrop,
  Crop,
  PixelCrop,
} from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import './CardEditor.css';

// MathJax/KaTeX support
import { InlineMath } from 'react-katex';
import 'katex/dist/katex.min.css';

// Code syntax highlighting
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

// Optionally import KaTeX for math rendering
let katex: any = null;
try {
  // @ts-ignore
  katex = require('katex');
} catch {}

export type CardEditorProps = {
  onSave: (card: Card) => void;
  initialCard?: Partial<Card>;
  allCards: Card[];
  currentDeckId: string; // Added prop for current deck ID
};

const templateHelpText = {
  basic: 'Traditional flashcard with front (question) and back (answer)',
  cloze: 'Text with hidden words/phrases. Use [...] to mark words to hide',
  occlusion: 'Hide parts of an image. Perfect for diagrams and maps',
  multi: 'Multiple choice question with one correct answer'
};

const templateExamples = {
  basic: {
    front: 'What is the capital of France?',
    back: 'Paris'
  },
  cloze: {
    text: 'The [mitochondria] is the powerhouse of the [cell].',
    note: 'Use square brackets [] to mark words that will be hidden. Use [hint::word] for hints.'
  },
  occlusion: {
    note: 'Upload an image and click to draw rectangles over areas to hide'
  },
  multi: {
    question: 'Which planet is closest to the Sun?',
    options: ['Mercury', 'Venus', 'Earth', 'Mars']
  }
};

export const CardEditor: React.FC<CardEditorProps> = ({ onSave, initialCard, allCards, currentDeckId }) => {
  const [front, setFront] = useState(initialCard?.front || '');
  const [back, setBack] = useState(initialCard?.back || '');
  const [tags, setTags] = useState(initialCard?.tags?.join(', ') || '');
  const [template, setTemplate] = useState<'basic' | 'cloze' | 'occlusion' | 'multi'>('basic');
  const [clozeText, setClozeText] = useState('');
  const [importSummary, setImportSummary] = useState<string | null>(null);
  const [occlusionImage, setOcclusionImage] = useState<string | null>(null);
  const [occlusions, setOcclusions] = useState<{ x: number; y: number; w: number; h: number }[]>([]);
  const [multiQuestion, setMultiQuestion] = useState('');
  const [multiOptions, setMultiOptions] = useState<string[]>(['', '']);
  const [multiCorrect, setMultiCorrect] = useState<number>(0);
  const [relatedIds, setRelatedIds] = useState<string[]>(initialCard?.relatedIds || []);
  const [mathInput, setMathInput] = useState('');
  const [showMathEditor, setShowMathEditor] = useState(false);
  const [codeInput, setCodeInput] = useState('');
  const [codeLang, setCodeLang] = useState('javascript');
  const [showCodeEditor, setShowCodeEditor] = useState(false);
  const [activeEditorForMedia, setActiveEditorForMedia] = useState<'front' | 'back' | null>(null);

  // AI Assisted Card Generation (Placeholder)
  const handleAiAssist = () => {
    console.log("AI-assisted card generation triggered. Deck ID:", currentDeckId);
    alert("AI-assisted card generation feature coming soon!");
    // Future implementation: API call to an AI service, parse response, and populate card fields.
  };

  // New state for prerequisite tracking
  const [prerequisiteCardIds, setPrerequisiteCardIds] = useState<string[]>(initialCard?.prerequisiteCardIds || []);
  const [prerequisiteForIds, setPrerequisiteForIds] = useState<string[]>(initialCard?.prerequisiteForIds || []);

  // State for image cropper
  const imgRef = useRef<HTMLImageElement>(null);
  const [croppingImageSrc, setCroppingImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [isCropperModalOpen, setIsCropperModalOpen] = useState(false);
  const [editingFieldForImage, setEditingFieldForImage] = useState<'front' | 'back' | null>(null);
  const aspect = undefined; // Or 16 / 9, 1 / 1 etc.

  // Get all cards for relationship selection (now using props.allCards)
  const currentCardId = initialCard?.id;

  // Refs for rich text editors
  const frontEditorRef = useRef<HTMLDivElement>(null);
  const backEditorRef = useRef<HTMLDivElement>(null);

  // ADDED: Ref for cloze editor
  const clozeEditorRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // Initialize editors with content if editing a card
    if (initialCard?.front && frontEditorRef.current) {
      frontEditorRef.current.innerHTML = initialCard.front;
    }
    if (initialCard?.back && backEditorRef.current) {
      backEditorRef.current.innerHTML = initialCard.back;
    }
    
    // Set correct template based on card type
    if (initialCard?.cardType === 'cloze') {
      setTemplate('cloze');
      setClozeText(initialCard.front || '');
    }
    // Initialize prerequisite states
    if (initialCard?.prerequisiteCardIds) {
      setPrerequisiteCardIds(initialCard.prerequisiteCardIds);
    }
    if (initialCard?.prerequisiteForIds) {
      setPrerequisiteForIds(initialCard.prerequisiteForIds);
    }
  }, [initialCard]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    let cardFront = '';
    let cardBack = '';
    let typeOfCard: 'basic' | 'cloze' = 'basic'; // Default to basic

    // Determine front/back content based on template
    if (template === 'basic') {
      cardFront = document.getElementById('front-editor')?.innerHTML || front;
      cardBack = document.getElementById('back-editor')?.innerHTML || back;
      typeOfCard = 'basic';
    } else if (template === 'cloze') {
      // For cloze, front stores the raw cloze text.
      // Back is for additional notes, using the standard back editor.
      cardFront = clozeText; 
      cardBack = document.getElementById('back-editor')?.innerHTML || back; // Use standard back editor for notes
      typeOfCard = 'cloze';
    } else if (template === 'occlusion' && occlusionImage && occlusions.length) {
      const canvasWidth = 400; // The width of the canvas used for drawing occlusions
      const canvasHeight = 300; // The height of the canvas used for drawing occlusions

      occlusions.forEach((occ, idx) => {
        const occXPercent = (occ.x / canvasWidth) * 100;
        const occYPercent = (occ.y / canvasHeight) * 100;
        const occWPercent = (occ.w / canvasWidth) * 100;
        const occHPercent = (occ.h / canvasHeight) * 100;

        // Ensure the image itself maintains aspect ratio; the outer div controls size.
        // The occlusion box is positioned absolutely within this relative container.
        const frontHtml = `<div style='position:relative; display:inline-block; width:100%; line-height: 0;'>` + // line-height:0 to prevent extra space under img
                          `<img src='${occlusionImage}' style='max-width:100%; height:auto; display:block;'/>` + // responsive image
                          `<div style='position:absolute;left:${occXPercent}%;top:${occYPercent}%;width:${occWPercent}%;height:${occHPercent}%;background:var(--occlusion-box-bg);opacity:0.9;border-radius:3px;'></div>` + // percentage-based occlusion
                          `</div>`;
        
        const backHtml = `<div style='position:relative; display:inline-block; width:100%; line-height: 0;'>` +
                         `<img src='${occlusionImage}' style='max-width:100%; height:auto; display:block;'/>` +
                         `</div>`;
        
        // Note: Duplicate check for occlusion cards is not implemented here due to multiple card generation.
        onSave({
          id: Math.random().toString(36).slice(2), // Occlusion cards are always new
          front: frontHtml,
          back: backHtml,
          tags: tags.split(',').map(t => t.trim()).filter(Boolean),
          deckId: currentDeckId, // Use currentDeckId prop
          created: new Date().toISOString(),
          modified: new Date().toISOString(),
          reviewHistory: [],
          relatedIds: [], // Typically new cards, no pre-existing relations
          scheduling: getInitialScheduling(), // Use getInitialScheduling for new occlusion cards
          cardType: 'basic', // Occlusion cards are a special type of basic card with HTML content
        } as Card);
      });
      // Reset specific occlusion fields and common fields
      setOcclusionImage(null);
      setOcclusions([]);
      setFront(''); setBack(''); setTags(''); setRelatedIds([]);
      return; // Return after handling occlusion cards
    } else if (template === 'multi') {
      cardFront = `<div>${multiQuestion}</div><ol type='A' style='margin-top:12px;'>${multiOptions.map(opt => `<li>${opt}</li>`).join('')}</ol>`;
      cardBack = `<div>Correct: <b>${String.fromCharCode(65 + multiCorrect)}</b><br/>${multiOptions[multiCorrect]}</div>`;
    } else {
        // Fallback or error if template is unknown, though UI shouldn't allow this.
        console.error("Unknown template type in handleSubmit:", template);
        return;
    }

    // --- Duplicate Check (for basic, cloze, multi) ---
    const normalize = (html: string) => (html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
    const normFront = normalize(cardFront);
    const normBack = normalize(cardBack);

    const potentialDuplicate = allCards.find(existingCard => {
      // If initialCard has an ID (i.e., we're in an edit-like scenario), don't compare to itself.
      if (currentCardId && existingCard.id === currentCardId) return false;
      return normalize(existingCard.front) === normFront && normalize(existingCard.back) === normBack;
    });

    if (potentialDuplicate) {
      if (!window.confirm(`This card appears to be a duplicate of an existing card.\nFront: ${potentialDuplicate.front.replace(/<[^>]+>/g, ' ').substring(0,70)}...\nBack: ${potentialDuplicate.back.replace(/<[^>]+>/g, ' ').substring(0,70)}...\n\nSave anyway?`)) {
        return; // Don't save
      }
    }
    // --- End Duplicate Check ---

    const cardData: Card = {
      id: currentCardId || Math.random().toString(36).slice(2), // Use initialCard.id if editing, else new
      front: cardFront,
      back: cardBack,
      cardType: typeOfCard, // Set the card type
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      deckId: initialCard?.deckId || currentDeckId, // Use currentDeckId for new cards
      created: initialCard?.created || new Date().toISOString(), // Preserve if editing
      modified: new Date().toISOString(), // Always update modified timestamp
      reviewHistory: initialCard?.reviewHistory || [], // Preserve if editing
      relatedIds: relatedIds, // Use current state of relatedIds
      scheduling: initialCard?.scheduling || getInitialScheduling(), // Use getInitialScheduling for new cards
      // Preserve other fields if editing / passed in initialCard
      hasReportedIssue: initialCard?.hasReportedIssue,
      issueNotes: initialCard?.issueNotes,
      favorite: initialCard?.favorite,
      archived: initialCard?.archived,
      mediaAttachments: initialCard?.mediaAttachments, // Preserve if field exists
      // Add prerequisite fields
      prerequisiteCardIds: prerequisiteCardIds,
      prerequisiteForIds: prerequisiteForIds,
    };
    
    onSave(cardData);

    // Reset form fields only if we are not "editing" (i.e. initialCard.id was not present)
    if (!currentCardId) {
    setFront('');
    setBack('');
        // Reset contentEditable divs for basic template
        const frontEditor = document.getElementById('front-editor');
        if (frontEditor) frontEditor.innerHTML = '';
        const backEditor = document.getElementById('back-editor');
        if (backEditor) backEditor.innerHTML = '';
        
    setTags('');
        setClozeText('');
        setMultiQuestion('');
        setMultiOptions(['', '']);
        setMultiCorrect(0);
        setRelatedIds([]);
        // Reset prerequisite states for new card
        setPrerequisiteCardIds([]);
        setPrerequisiteForIds([]);
        // Occlusion fields are reset within their own block if that template was used.
    }
    // For an "edit" scenario (if currentCardId was present), we might want to navigate away or give different feedback.
    // Currently, onSave in App.tsx always navigates to dashboard.
  };

  // Batch import handler
  const handleImportCSV = (file: File) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results: any) => {
        let count = 0;
        for (const row of results.data) {
          if (!row.front || !row.back) continue; // Basic check, for cloze only front might be enough if back is auto-gen
          
          const detectedTemplateType = row.template?.toLowerCase() === 'cloze' ? 'cloze' : 'basic';
          let importedFront = row.front;
          let importedBack = row.back; // Standard back for basic, or notes for cloze
          let importedCardType: 'basic' | 'cloze' = 'basic';

          if (detectedTemplateType === 'cloze') {
            // Front is the raw cloze text itself.
            // Back from CSV is treated as additional notes for cloze.
            importedFront = row.front; // Contains [...] or [hint::...] syntax
            importedCardType = 'cloze';
            // importedBack remains row.back (for notes)
          } else {
            // Basic card
            importedCardType = 'basic';
          }

          onSave({
            id: Math.random().toString(36).slice(2),
            front: importedFront,
            back: importedBack,
            cardType: importedCardType, // Set card type
            tags: row.tags ? row.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : [],
            deckId: initialCard?.deckId || 'default', // Use selected deckId for imported cards
            created: new Date().toISOString(),
            modified: new Date().toISOString(),
            reviewHistory: [],
            scheduling: getInitialScheduling(), // Use getInitialScheduling for new cards
          } as Card);
          count++;
        }
        setImportSummary(`${count} card${count === 1 ? '' : 's'} imported.`);
      },
      error: (error: Error) => {
        console.error('Error parsing CSV:', error);
        setImportSummary(`Error: ${error.message}`);
      }
    });
  };

  function insertImageAtCursor(div: HTMLDivElement, dataUrl: string) {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      if (div.contains(range.commonAncestorContainer)) {
        const img = document.createElement('img');
        img.src = dataUrl;
        img.style.maxWidth = '100%';
        
        range.deleteContents();
        range.insertNode(img);

        // Move cursor after the inserted image
        range.setStartAfter(img);
        range.setEndAfter(img);
        sel.removeAllRanges();
        sel.addRange(range);
      } else {
        // No selection in the editor, append to end
        const img = document.createElement('img');
        img.src = dataUrl;
        img.style.maxWidth = '100%';
        div.appendChild(img);
      }
    } else {
      // Fallback: append to end
      const img = document.createElement('img');
      img.src = dataUrl;
      img.style.maxWidth = '100%';
      div.appendChild(img);
    }
  }

  function insertHtmlAtCursor(div: HTMLDivElement, html: string) {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      if (div.contains(range.commonAncestorContainer)) {
        const temp = document.createElement('div');
        temp.innerHTML = html;
        const fragment = document.createDocumentFragment();
        while (temp.firstChild) {
          fragment.appendChild(temp.firstChild);
        }
        
        range.deleteContents();
        range.insertNode(fragment);

        // Move cursor to the end of the inserted content
        range.collapse(false);
        sel.removeAllRanges();
        sel.addRange(range);
      } else {
        // No selection in the editor, append to end
        div.insertAdjacentHTML('beforeend', html);
      }
    } else {
      // Fallback: append to end
      div.insertAdjacentHTML('beforeend', html);
    }
  }

  const handleImageUploadRequest = (field: 'front' | 'back') => {
    setEditingFieldForImage(field);
    
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.onchange = (domEvent: Event) => {
      onSelectFileForCropper(domEvent.target as HTMLInputElement);
    };
    fileInput.click();
  };

  const onSelectFileForCropper = (inputElement: HTMLInputElement) => {
    if (inputElement.files && inputElement.files.length > 0) {
      const reader = new FileReader();
      reader.addEventListener('load', () =>
        setCroppingImageSrc(reader.result?.toString() || null),
      );
      reader.readAsDataURL(inputElement.files[0]);
      setIsCropperModalOpen(true);
    }
  };

  function onImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    if (aspect) {
      const { width, height } = e.currentTarget;
      setCrop(centerAspectCrop(width, height, aspect));
    }
  }

  const handleConfirmCrop = async () => {
    if (completedCrop && imgRef.current && croppingImageSrc) {
      // const croppedDataUrl = await getCroppedImg(croppingImageSrc, completedCrop); // We don't need the cropped image dataURL itself for occlusion

      if (editingFieldForImage === 'front') {
        // insertImageAtCursor(frontEditorRef.current!, croppedDataUrl!);
        // For occlusion, we don't insert into editor directly, but save the crop coordinates
      } else if (editingFieldForImage === 'back') {
        // insertImageAtCursor(backEditorRef.current!, croppedDataUrl!);
      } else { // This means we are cropping for an occlusion
        if (occlusionImage) { // Ensure we are in occlusion mode
          const naturalWidth = imgRef.current.naturalWidth;
          const naturalHeight = imgRef.current.naturalHeight;

          // Convert pixel crop to be relative to natural image dimensions if necessary
          // completedCrop is already in pixels of the displayed image.
          // If the displayed image is scaled, we might need to adjust.
          // For simplicity, assume completedCrop is in terms of the original image pixels if imgRef.current is the original.
          // Or, if ReactCrop handles scaling, completedCrop might be for the displayed size.
          // Let's assume completedCrop is in pixels of the previewed image. We need to scale it to the natural image size if there's a difference.
          // For now, let's use completedCrop as is, assuming it's relative to the image displayed in the cropper.
          // The handleSubmit logic for occlusion seems to expect percentage-based occlusions or coordinates relative to a fixed canvas.
          // For consistency, let's store pixel values relative to the natural image size.
          
          const scaleX = naturalWidth / imgRef.current.width;
          const scaleY = naturalHeight / imgRef.current.height;

          const newOcclusion = {
            x: completedCrop.x * scaleX,
            y: completedCrop.y * scaleY,
            w: completedCrop.width * scaleX,
            h: completedCrop.height * scaleY,
          };
          setOcclusions(prev => [...prev, newOcclusion]);
        }
      }
    }
    setIsCropperModalOpen(false);
    setCroppingImageSrc(null);
    setCompletedCrop(undefined);
    setCrop(undefined);
  };

  function centerAspectCrop(
    mediaWidth: number,
    mediaHeight: number,
    aspect: number,
  ) {
    return centerCrop(
      makeAspectCrop(
        {
          unit: '%',
          width: 90,
        },
        aspect,
        mediaWidth,
        mediaHeight,
      ),
      mediaWidth,
      mediaHeight,
    );
  }

  async function getCroppedImg(
    imageSrc: string,
    pixelCrop: PixelCrop
  ): Promise<string | null> {
    const image = new Image();
    image.src = imageSrc;
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      return null;
    }
    
    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;
    
    // Draw the cropped image on the canvas
    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      pixelCrop.width,
      pixelCrop.height
    );
    
    // Convert canvas to an image data URL
    return canvas.toDataURL('image/jpeg');
  }

  // Format toolbar functions
  const applyFormat = (command: string, value: string = '', editorRef?: React.RefObject<HTMLDivElement | null>) => {
    const activeEditor = editorRef?.current || (activeEditorForMedia === 'front' ? frontEditorRef.current : backEditorRef.current);
    if (activeEditor) {
      activeEditor.focus(); // Ensure the editor has focus before executing command
      document.execCommand(command, false, value);
    }
  };

  const insertMathEquation = () => {
    if (!mathInput.trim()) return;
    const editorDiv = activeEditorForMedia === 'front' ? frontEditorRef.current : backEditorRef.current;
    if (editorDiv) {
      // Simple insertion, assumes KaTeX will pick it up later. Could wrap with $$ for block.
      insertHtmlAtCursor(editorDiv, ` ${mathInput} `); // Add spaces for easier parsing later
    }
    setMathInput('');
    setShowMathEditor(false);
  };

  const handleInsertCodeBlock = () => {
    if (!codeInput.trim()) return;
    const editorDiv = activeEditorForMedia === 'front' ? frontEditorRef.current : backEditorRef.current;
    if (editorDiv) {
      // Insert as a pre-formatted block. For contentEditable, <pre> is good.
      // The actual highlighting will be done at render time.
      // We store it in a way that's distinguishable.
      const codeHtml = `<pre><code class="language-${codeLang}">${codeInput.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>`;
      insertHtmlAtCursor(editorDiv, codeHtml);
    }
    setCodeInput('');
    setShowCodeEditor(false);
  };

  // Utils for cloze cards
  const createClozeFromSelection = (index = 1, editorRef?: React.RefObject<HTMLTextAreaElement | null>) => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim()) {
      const text = selection.toString();
      // Use editorRef if provided and valid, otherwise fallback to document.activeElement
      const targetElement = editorRef?.current || (document.activeElement as HTMLElement | HTMLTextAreaElement);

      if (targetElement && (targetElement instanceof HTMLTextAreaElement || (targetElement as HTMLElement).isContentEditable)) {
        const currentText = targetElement instanceof HTMLTextAreaElement ? targetElement.value : (targetElement as HTMLElement).innerHTML;
        let selectionStart: number, selectionEnd: number;

        if (targetElement instanceof HTMLTextAreaElement) {
          selectionStart = targetElement.selectionStart;
          selectionEnd = targetElement.selectionEnd;
        } else { // contentEditable div
          const range = selection.getRangeAt(0);
          const preSelectionRange = range.cloneRange();
          preSelectionRange.selectNodeContents(targetElement);
          preSelectionRange.setEnd(range.startContainer, range.startOffset);
          selectionStart = preSelectionRange.toString().length;
          selectionEnd = selectionStart + text.length;
        }

        const clozeReplacement = `[c${index}::${text}]`; // Default to [c1::text]
        const newText = currentText.substring(0, selectionStart) + clozeReplacement + currentText.substring(selectionEnd);

        if (targetElement instanceof HTMLTextAreaElement) {
          targetElement.value = newText;
          // Manually trigger state update if the textarea is controlled by React state
          if (targetElement === clozeEditorRef.current) {
            setClozeText(newText);
          }
        } else { // contentEditable div
          (targetElement as HTMLElement).innerHTML = newText;
          // Manually trigger state update if the div is controlled by React state
          // This part is tricky if the contentEditable div directly updates state via onInput.
          // For front/back editors, onInput should handle it.
        }
        // Move cursor after the inserted cloze
        if (selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          range.setStart(range.startContainer, selectionStart + clozeReplacement.length);
          range.collapse(true);
          selection.removeAllRanges();
          selection.addRange(range);
        }
      } else {
        console.warn('Cloze creation: No active editable element or valid ref provided.');
      }
    } else {
      // If no text selected, maybe insert a placeholder cloze?
      // For now, do nothing or show a message.
      console.warn('Cloze creation: No text selected.');
    }
  };

  const renderBasicTemplateControls = () => (
    <div className="basic-controls toolbar">
      <button type="button" onClick={() => applyFormat('bold', '', activeEditorForMedia === 'front' ? frontEditorRef : backEditorRef)} title="Bold"><b>B</b></button>
      <button type="button" onClick={() => applyFormat('italic', '', activeEditorForMedia === 'front' ? frontEditorRef : backEditorRef)} title="Italic"><i>I</i></button>
      <button type="button" onClick={() => applyFormat('underline', '', activeEditorForMedia === 'front' ? frontEditorRef : backEditorRef)} title="Underline"><u>U</u></button>
      <button type="button" onClick={() => applyFormat('insertOrderedList', '', activeEditorForMedia === 'front' ? frontEditorRef : backEditorRef)} title="Ordered List">OL</button>
      <button type="button" onClick={() => applyFormat('insertUnorderedList', '', activeEditorForMedia === 'front' ? frontEditorRef : backEditorRef)} title="Unordered List">UL</button>
      <button type="button" onClick={() => { setActiveEditorForMedia(activeEditorForMedia); setShowCodeEditor(true); }} title="Insert Code Block">{'</>'}</button>
      <button type="button" onClick={() => { setActiveEditorForMedia(activeEditorForMedia); setShowMathEditor(true); }} title="Insert Math Equation">∫fx</button>
      {/* Add more controls as needed */}
    </div>
  );

  return (
    <div className="card-editor">
      <h2>{initialCard?.id ? 'Edit Card' : 'Create New Card'}</h2>
      
      <div className="template-selector">
        <label>Card Type:</label>
        <div className="template-options">
          <button 
            type="button" 
            className={`template-option ${template === 'basic' ? 'selected' : ''}`}
            onClick={() => setTemplate('basic')}
            title={templateHelpText.basic}
          >
            <span className="template-icon">🗂️</span>
            <span className="template-name">Basic</span>
          </button>
          <button 
            type="button" 
            className={`template-option ${template === 'cloze' ? 'selected' : ''}`}
            onClick={() => setTemplate('cloze')}
            title={templateHelpText.cloze}
          >
            <span className="template-icon">📝</span>
            <span className="template-name">Cloze</span>
          </button>
          <button 
            type="button" 
            className={`template-option ${template === 'occlusion' ? 'selected' : ''}`}
            onClick={() => setTemplate('occlusion')}
            title={templateHelpText.occlusion}
          >
            <span className="template-icon">🖼️</span>
            <span className="template-name">Image Occlusion</span>
          </button>
          <button 
            type="button" 
            className={`template-option ${template === 'multi' ? 'selected' : ''}`}
            onClick={() => setTemplate('multi')}
            title={templateHelpText.multi}
          >
            <span className="template-icon">📋</span>
            <span className="template-name">Multiple Choice</span>
          </button>
        </div>
      </div>
      
      <form onSubmit={handleSubmit}>
        {template === 'basic' && (
          <>
            <div className="editor-container">
              <label htmlFor="front-editor">Front:</label>
              {renderBasicTemplateControls()}
              <div 
                id="front-editor" 
                className="rich-text-editor" 
                contentEditable 
                suppressContentEditableWarning 
                onFocus={() => setActiveEditorForMedia('front')}
                dangerouslySetInnerHTML={{ __html: initialCard?.front || front }}
                onInput={(e) => setFront((e.target as HTMLDivElement).innerHTML)}
              />
            </div>
            
            <div className="editor-container">
              <label htmlFor="back-editor">Back / Cloze Notes:</label>
              {renderBasicTemplateControls()}
              <div 
                id="back-editor" 
                className="rich-text-editor" 
                contentEditable 
                suppressContentEditableWarning 
                onFocus={() => setActiveEditorForMedia('back')}
                dangerouslySetInnerHTML={{ __html: initialCard?.back || back }}
                onInput={(e) => setBack((e.target as HTMLDivElement).innerHTML)}
              />
            </div>
          </>
        )}
        
        {template === 'cloze' && (
          <>
            <div className="card-field">
              <label>Cloze Text:</label>
              <div className="cloze-toolbar">
                <button type="button" onClick={() => createClozeFromSelection(1, clozeEditorRef)}>Make Cloze - c1</button>
                <button type="button" onClick={() => createClozeFromSelection(2, clozeEditorRef)}>Make Cloze - c2</button>
                <span className="cloze-help">Select text, then click button to create cloze deletion</span>
              </div>
              <textarea 
                ref={clozeEditorRef} 
                value={clozeText} 
                onChange={e => setClozeText(e.target.value)} 
                rows={6}
                placeholder="Enter text with cloze deletions like: The capital of France is [Paris] or [c1::Paris::City]."
              ></textarea>
              
              <div className="cloze-preview">
                <h4>Preview:</h4>
                <div className="cloze-front">
                  <strong>Front: </strong>
                  <span dangerouslySetInnerHTML={{ 
                    __html: clozeText.replace(/\[(c\d*::)?(.*?)(::(.*?))?\]/g, (_match, _clozeNumPart, mainText, _hintPart, hint) => {
                      return hint ? `[${hint}]` : `[...]`;
                    })
                  }}></span>
                </div>
                <div className="cloze-back">
                  <strong>Back: </strong>
                  <span dangerouslySetInnerHTML={{ 
                    __html: clozeText.replace(/\[(c\d*::)?(.*?)(::(.*?))?\]/g, (_match, _clozeNumPart, mainText) => {
                      return `<strong style="color: var(--primary-brand-blue); background-color: var(--primary-brand-blue-transparent); padding: 0.1em 0.3em; border-radius: 3px;">${mainText}</strong>`;
                    })
                  }}></span>
                </div>
              </div>
            </div>
            
            <div className="card-field">
              <label>Additional Notes:</label>
              <div 
                id="back-editor"
                className="content-editable"
                contentEditable={true}
                onInput={(e) => setBack(e.currentTarget.innerHTML)}
                dangerouslySetInnerHTML={{ __html: back }}
              ></div>
            </div>
          </>
        )}
        
        {template === 'multi' && (
          <>
            <div className="form-group">
              <label htmlFor="multi-question">Question:</label>
              <input 
                type="text" 
                id="multi-question" 
                value={multiQuestion} 
                onChange={e => setMultiQuestion(e.target.value)} 
                placeholder="What is 2+2?"
              />
            </div>
            {multiOptions.map((option, index) => (
              <div className="form-group multi-option-group" key={index}>
                <label htmlFor={`multi-option-${index}`}>Option {String.fromCharCode(65 + index)}:</label>
                <input 
                  type="text" 
                  id={`multi-option-${index}`} 
                  value={option} 
                  onChange={e => {
                    const newOptions = [...multiOptions];
                    newOptions[index] = e.target.value;
                    setMultiOptions(newOptions);
                  }}
                  placeholder={`Option ${String.fromCharCode(65 + index)}`}
                />
                <input 
                  type="radio" 
                  name="correct-option" 
                  id={`correct-option-${index}`} 
                  checked={multiCorrect === index} 
                  onChange={() => setMultiCorrect(index)} 
                />
                <label htmlFor={`correct-option-${index}`} className="radio-label">Correct</label>
                {multiOptions.length > 2 && (
                  <button type="button" className="remove-option-btn" onClick={() => {
                    const newOptions = multiOptions.filter((_, i) => i !== index);
                    setMultiOptions(newOptions);
                    // Adjust multiCorrect if the removed option was the correct one
                    if (multiCorrect === index) {
                      setMultiCorrect(0); 
                    } else if (multiCorrect > index) {
                      setMultiCorrect(multiCorrect - 1);
                    }
                  }}>Remove</button>
                )}
              </div>
            ))}
            <button type="button" className="add-option-btn" onClick={() => setMultiOptions([...multiOptions, ''])}>
              Add Option
            </button>
          </>
        )}

        {/* Placeholder for Image Occlusion UI */}
        {template === 'occlusion' && (
          <div className="form-group">
            <label htmlFor="occlusion-image-upload">Upload Image for Occlusion:</label>
            <input 
              type="file" 
              id="occlusion-image-upload"
              accept="image/*" 
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  const file = e.target.files[0];
                  const reader = new FileReader();
                  reader.onloadend = () => {
                    setOcclusionImage(reader.result as string);
                    setCroppingImageSrc(reader.result as string); // Use the general image cropper
                    setOcclusions([]); // Reset occlusions when new image is uploaded
                    setIsCropperModalOpen(true); // Open cropper modal to define first occlusion
                    setEditingFieldForImage(null); // Indicate this is for occlusion, not front/back
                  };
                  reader.readAsDataURL(file);
                }
              }}
            />

            {occlusionImage && !isCropperModalOpen && (
              <div className="occlusion-preview-container">
                <img 
                  src={occlusionImage} 
                  alt="Occlusion base" 
                  style={{ maxWidth: '100%', maxHeight: '300px', position: 'relative' }} 
                  ref={imgRef} // imgRef is used by ReactCrop logic
                />
                {occlusions.map((occ, index) => (
                  <div 
                    key={index} 
                    style={{ 
                      position: 'absolute', 
                      border: '2px dashed red', 
                      left: `${(occ.x / (imgRef.current?.naturalWidth || 1)) * 100}%`, 
                      top: `${(occ.y / (imgRef.current?.naturalHeight || 1)) * 100}%`, 
                      width: `${(occ.w / (imgRef.current?.naturalWidth || 1)) * 100}%`, 
                      height: `${(occ.h / (imgRef.current?.naturalHeight || 1)) * 100}%`,
                      boxSizing: 'border-box',
                    }} 
                    title={`Occlusion ${index + 1}`}
                  ></div>
                ))}
              </div>
            )}
            
            {occlusionImage && !isCropperModalOpen && (
              <button type="button" onClick={() => {
                if (!occlusionImage) {
                  alert("Please upload an image first.");
                  return;
                }
                setCroppingImageSrc(occlusionImage);
                setIsCropperModalOpen(true); // Open cropper to define another occlusion
                setEditingFieldForImage(null); // Indicate this is for occlusion
              }}>
                Add Occlusion Box
              </button>
            )}

            {occlusions.length > 0 && !isCropperModalOpen && (
              <div>
                <h4>Defined Occlusions: {occlusions.length}</h4>
                <button type="button" onClick={() => setOcclusions([])}>Reset Occlusions</button>
              </div>
            )}
          </div>
        )}

        {/* All templates have Tags */}
        <div className="card-field">
          <label htmlFor="tags">Tags:</label>
          <input
            type="text"
            id="tags"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="comma, separated, tags"
          />
        </div>

        {/* Related Cards Selection */}
        <div className="card-field">
          <label>Related Cards:</label>
          <select 
            multiple 
            value={relatedIds}
            onChange={(e) => {
              const options = Array.from(e.target.selectedOptions);
              const values = options.map(option => option.value);
              setRelatedIds(values);
            }}
            className="related-cards-select"
          >
            {allCards
              .filter(c => c.id !== currentCardId) // Don't show current card
              .map(card => (
                <option key={card.id} value={card.id}>
                  {(card.front || '').replace(/<[^>]+>/g, '').substring(0, 50)}
                </option>
              ))
            }
          </select>
          <div className="selection-help">Hold Ctrl/Cmd to select multiple cards</div>
        </div>

        {/* Prerequisite Cards Selection */}
        <div className="card-field">
          <label>Prerequisites for this card (depends on):</label>
          <select 
            multiple 
            value={prerequisiteCardIds}
            onChange={(e) => {
              const options = Array.from(e.target.selectedOptions);
              const values = options.map(option => option.value);
              setPrerequisiteCardIds(values);
            }}
            className="related-cards-select"
          >
            {allCards
              .filter(c => c.id !== currentCardId) // Don't show current card
              .map(card => (
                <option key={card.id} value={card.id}>
                  {(card.front || '').replace(/<[^>]+>/g, '').substring(0, 50)}
                </option>
              ))
            }
          </select>
          <div className="selection-help">Hold Ctrl/Cmd to select multiple cards</div>
        </div>

        {/* This card is a prerequisite for Selection */}
        <div className="card-field">
          <label>This card is a prerequisite for (needed by):</label>
          <select 
            multiple 
            value={prerequisiteForIds}
            onChange={(e) => {
              const options = Array.from(e.target.selectedOptions);
              const values = options.map(option => option.value);
              setPrerequisiteForIds(values);
            }}
            className="related-cards-select"
          >
            {allCards
              .filter(c => c.id !== currentCardId) // Don't show current card
              .map(card => (
                <option key={card.id} value={card.id}>
                  {(card.front || '').replace(/<[^>]+>/g, '').substring(0, 50)}
                </option>
              ))
            }
          </select>
          <div className="selection-help">Hold Ctrl/Cmd to select multiple cards</div>
        </div>

        <div className="form-buttons">
          <button type="submit" className="primary-button">
            {initialCard?.id ? 'Update Card' : 'Create Card'}
          </button>
          <button type="button" className="secondary-button" onClick={handleAiAssist} style={{marginLeft: '10px'}}>
            ✨ AI Assist
          </button>
        </div>
      </form>
      
      {/* Batch Import Section */}
      <div className="batch-import">
        <h3>Batch Import</h3>
        <p>Import multiple cards from a CSV file. Expected columns: <code>front</code>, <code>back</code>, <code>tags</code> (optional, comma-separated), <code>template</code> (optional: "basic" or "cloze"). For cloze cards, the "front" column should contain the text with cloze deletions (e.g., "The capital is [Paris]."), and the "back" column can contain additional notes.</p>
        <input 
          type="file" 
          accept=".csv" 
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              handleImportCSV(e.target.files[0]);
            }
          }}
        />
        {importSummary && <div className="import-summary">{importSummary}</div>}
      </div>
      
      {/* Image Cropper Modal */}
      {isCropperModalOpen && croppingImageSrc && (
        <div className="modal image-cropper-modal">
          <div className="modal-content">
            <h3>Crop Image</h3>
            <ReactCrop
              crop={crop}
              onChange={(_, percentCrop) => setCrop(percentCrop)}
              onComplete={(c) => setCompletedCrop(c)}
              aspect={aspect}
            >
              <img
                ref={imgRef}
                alt="Crop me"
                src={croppingImageSrc}
                onLoad={onImageLoad}
                style={{ maxHeight: '70vh' }}
              />
            </ReactCrop>
            <div className="modal-buttons">
              <button 
                onClick={() => {
                  setIsCropperModalOpen(false);
                  setCroppingImageSrc(null);
                }}
              >
                Cancel
              </button>
              <button onClick={handleConfirmCrop}>Confirm Crop</button>
            </div>
          </div>
        </div>
      )}
      
      {/* Math Editor Modal/Section */}
      {showMathEditor && (
        <div className="inline-editor-modal">
          <h3>Insert Math Equation (LaTeX)</h3>
          <textarea 
            value={mathInput} 
            onChange={e => setMathInput(e.target.value)} 
            placeholder="e.g., \\sum_{i=0}^n i^2 = \\frac{(n^2+n)(2n+1)}{6}"
            rows={3}
          />
          <div className="math-preview">
            Preview: {mathInput.trim() ? <InlineMath math={mathInput} /> : "Type LaTeX above"}
          </div>
          <div className="modal-actions">
            <button type="button" onClick={insertMathEquation}>Insert Math</button>
            <button type="button" onClick={() => setShowMathEditor(false)} className="cancel">Cancel</button>
          </div>
        </div>
      )}
      
      {/* Code Editor Modal/Section */}
      {showCodeEditor && (
        <div className="inline-editor-modal">
          <h3>Insert Code Block</h3>
          <select value={codeLang} onChange={e => setCodeLang(e.target.value)} style={{marginBottom: '8px'}}>
            <option value="javascript">JavaScript</option>
            <option value="python">Python</option>
            <option value="java">Java</option>
            <option value="csharp">C#</option>
            <option value="cpp">C++</option>
            <option value="html">HTML</option>
            <option value="css">CSS</option>
            <option value="sql">SQL</option>
            <option value="markdown">Markdown</option>
            <option value="json">JSON</option>
            <option value="typescript">TypeScript</option>
            <option value="shell">Shell/Bash</option>
            <option value="text">Plain Text</option>
            {/* Add more languages as needed */}
          </select>
          <textarea 
            value={codeInput} 
            onChange={e => setCodeInput(e.target.value)} 
            placeholder="Enter your code here..."
            rows={6}
          />
          <div className="code-preview" style={{marginTop: '8px', background: '#2d2d2d', padding: '10px', borderRadius: '4px', maxHeight: '150px', overflowY: 'auto'}}>
            {codeInput.trim() && (
              <SyntaxHighlighter language={codeLang} style={vscDarkPlus} customStyle={{margin: 0}} >
                {codeInput}
              </SyntaxHighlighter>
            )}
          </div>
          <div className="modal-actions">
            <button type="button" onClick={handleInsertCodeBlock}>Insert Code</button>
            <button type="button" onClick={() => setShowCodeEditor(false)} className="cancel">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
};
