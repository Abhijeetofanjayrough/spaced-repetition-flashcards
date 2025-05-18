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
import Modal from 'react-modal';
import { useMediaQuery } from 'react-responsive';

// MathJax/KaTeX support
import { InlineMath } from 'react-katex';
import 'katex/dist/katex.min.css';

// Code syntax highlighting
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

// Optionally import KaTeX for math rendering
// eslint-disable-next-line @typescript-eslint/no-unused-vars
// eslint-disable-next-line @typescript-eslint/no-unused-vars
let katex: any = null;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
try {
  // @ts-ignore
  katex = require('katex');
} catch {}

export type CardEditorProps = {
  onSave: (card: Card) => void;
  onCancel?: () => void;
  initialCard?: Partial<Card>;
  allCards: Card[];
  currentDeckId: string; // Added prop for current deck ID
};

const templateHelpText = {
  basic: 'Traditional flashcard with front (question) and back (answer)',
  cloze: 'Text with hidden words/phrases. Use [...] to mark words to hide',
  occlusion: 'Hide parts of an image. Perfect for diagrams and maps',
  multi: 'Multiple choice question with one correct answer'
// eslint-disable-next-line @typescript-eslint/no-unused-vars
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
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

export const CardEditor: React.FC<CardEditorProps> = ({ onSave, onCancel, initialCard, allCards, currentDeckId }) => {
  // Responsive design hooks
  const isMobile = useMediaQuery({ maxWidth: 767 });
  const isTablet = useMediaQuery({ minWidth: 768, maxWidth: 1023 });
  
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

  // AI Assisted Card Generation
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiInput, setAiInput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiSuggestions, setAiSuggestions] = useState<{ front: string; back: string }[]>([]);

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
      // Attempt to get the dimensions of the image container used for drawing occlusions
      // This assumes an element with id 'occlusion-image-container' or similar exists in the JSX
      // where the user draws the occlusions. The image itself might be inside this container.
      // It's better to use a React ref to the image or its direct interactive container if possible.
      let drawingCanvasWidth = 400; // Default fallback
      let drawingCanvasHeight = 300; // Default fallback

      const imageContainerForOcclusion = document.getElementById('occlusion-editor-image-display'); // Hypothetical ID
      if (imageContainerForOcclusion) {
        drawingCanvasWidth = imageContainerForOcclusion.clientWidth;
        drawingCanvasHeight = imageContainerForOcclusion.clientHeight;
        if (drawingCanvasWidth === 0 || drawingCanvasHeight === 0) {
            // Fallback if clientWidth/Height is 0 (e.g. display:none)
            // A more robust solution would use the naturalWidth/Height of the original image
            // and store occlusions relative to that, then scale with CSS.
            // For now, using a slightly more robust fallback if the element is found but has no size.
            const imgElement = imageContainerForOcclusion.querySelector('img');
            if (imgElement) {
                drawingCanvasWidth = imgElement.naturalWidth || 400;
                drawingCanvasHeight = imgElement.naturalHeight || 300;
            }
        }
      } else {
        console.warn('Occlusion image container not found, using default dimensions for percentage calculation. This may lead to misaligned occlusions.');
      }

      occlusions.forEach((occ, idx) => {
        // Ensure width/height are not zero to prevent division by zero
        const safeCanvasWidth = drawingCanvasWidth || 1; 
        const safeCanvasHeight = drawingCanvasHeight || 1;

        const occXPercent = (occ.x / safeCanvasWidth) * 100;
        const occYPercent = (occ.y / safeCanvasHeight) * 100;
        const occWPercent = (occ.w / safeCanvasWidth) * 100;
        const occHPercent = (occ.h / safeCanvasHeight) * 100;

        const frontHtml = `<div style='position:relative; display:inline-block; width:100%; line-height: 0;'>` +
                          `<img src='${occlusionImage}' style='max-width:100%; height:auto; display:block;'/>` +
                          `<div style='position:absolute;left:${occXPercent}%;top:${occYPercent}%;width:${occWPercent}%;height:${occHPercent}%;background:var(--occlusion-box-bg);opacity:0.9;border-radius:3px;'></div>` +
                          `</div>`;
        
        const backHtml = `<div style='position:relative; display:inline-block; width:100%; line-height: 0;'>` +
                         `<img src='${occlusionImage}' style='max-width:100%; height:auto; display:block;'/>` +
                         `</div>`;
        
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
          // Revised check: Ensure 'front' always exists.
          // 'back' is required for basic, optional for cloze (as notes).
          if (!row.front) {
            console.warn('Skipping CSV row due to missing "front":', row);
            continue;
          }
          
          const detectedTemplateType = row.template?.toLowerCase() === 'cloze' ? 'cloze' : 'basic';
          
          if (detectedTemplateType === 'basic' && !row.back) {
            console.warn('Skipping CSV row for basic card due to missing "back":', row);
            continue;
          }

          let importedFront = row.front;
          let importedBack = row.back || ''; // Default to empty string if back is missing (e.g. for cloze with no notes)
          let importedCardType: 'basic' | 'cloze' = 'basic';

          if (detectedTemplateType === 'cloze') {
            importedFront = row.front; 
            importedCardType = 'cloze';
            // importedBack (notes for cloze) is already set from row.back || ''
          } else {
            importedCardType = 'basic';
          }

          onSave({
            id: Math.random().toString(36).slice(2),
            front: importedFront,
            back: importedBack,
            cardType: importedCardType,
            tags: row.tags ? row.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : [],
            deckId: currentDeckId, // Use currentDeckId prop directly
            created: new Date().toISOString(),
            modified: new Date().toISOString(),
            reviewHistory: [],
            scheduling: getInitialScheduling(),
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
// eslint-disable-next-line @typescript-eslint/no-unused-vars

// eslint-disable-next-line @typescript-eslint/no-unused-vars
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
// eslint-disable-next-line @typescript-eslint/no-unused-vars
        // No selection in the editor, append to end
        div.insertAdjacentHTML('beforeend', html);
      }
    } else {
      // Fallback: append to end
      div.insertAdjacentHTML('beforeend', html);
    }
// eslint-disable-next-line @typescript-eslint/no-unused-vars
  }

// eslint-disable-next-line @typescript-eslint/no-unused-vars
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
      // Clear the input value to allow selecting the same file again if needed
      inputElement.value = ''; 
    }
  };

  function onImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    if (aspect) {
      const { width, height } = e.currentTarget;
      setCrop(centerAspectCrop(width, height, aspect));
    }
  }

  const handleConfirmCrop = async () => {
    if (completedCrop && croppingImageSrc) {
      const targetEditorRef = editingFieldForImage === 'front' 
        ? frontEditorRef.current 
        : editingFieldForImage === 'back' 
        ? backEditorRef.current 
        : null;

      if (targetEditorRef) { // Cropping for front or back editor fields
        const croppedDataUrl = await getCroppedImg(croppingImageSrc, completedCrop);
        if (croppedDataUrl) {
          insertImageAtCursor(targetEditorRef, croppedDataUrl);
        }
      } else { 
        // This branch implies cropping for occlusion or another purpose not directly inserting into front/back.
        // The existing occlusion logic is more complex and might not use this exact path for setting occlusions.
        // For now, ensure this primarily handles direct insertion to front/back fields.
        // If it was for occlusion, that logic should be separate or clearly delineated.
        // The previous read of handleSubmit for occlusion uses `occlusionImage` state directly.
        // This `handleConfirmCrop` might be intended for general image insertion.
        console.log("Crop confirmed, but not for front/back editor field. Occlusion logic might be separate.");
      }
    }
    // Reset cropping state whether successful or not for front/back, or if it was for another purpose
    setIsCropperModalOpen(false);
    setCroppingImageSrc(null);
    setCrop(undefined); // Reset crop tool state
    setCompletedCrop(undefined);
    setEditingFieldForImage(null); // Reset which field was being edited
  };

  function centerAspectCrop(
    mediaWidth: number,
    mediaHeight: number,
    aspect: number,
  ) {
    return centerCrop(
      makeAspectCrop(
        {
// eslint-disable-next-line @typescript-eslint/no-unused-vars
          unit: '%',
          width: 90,
        },
        aspect,
        mediaWidth,
        mediaHeight,
      ),
      mediaWidth,
// eslint-disable-next-line @typescript-eslint/no-unused-vars
      mediaHeight,
    );
  }

// eslint-disable-next-line @typescript-eslint/no-unused-vars
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
      activeEditor.focus();
      document.execCommand(command, false, value);
    }
  };

  const insertMathEquation = () => {
    if (!mathInput.trim()) return;
    const editorDiv = activeEditorForMedia === 'front' ? frontEditorRef.current : backEditorRef.current;
    if (editorDiv) {
      // Wrap with $$ for block display, assuming KaTeX rendering on display will handle this.
      // Ensure no nested $$ by sanitizing mathInput or by editor design.
      // For simplicity, just wrapping.
      const katexString = `$$${mathInput.trim()}$$`;
      insertHtmlAtCursor(editorDiv, katexString);
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

  // AI Assisted Card Generation
  const handleAiAssist = async () => {
    setIsAiModalOpen(true);
    setAiInput('');
    setAiSuggestions([]);
    setAiError(null);
  };

  const handleAiGenerate = async () => {
    setAiLoading(true);
    setAiError(null);
    setAiSuggestions([]);
    try {
      // Use backend proxy endpoint
      const endpoint = '/api/gemini';
      const prompt = `Generate flashcards as Q&A pairs from the following notes. Return as JSON array: [{"front": "Question", "back": "Answer"}, ...]\n\nNotes:\n${aiInput}`;
      const body = {
        contents: [{ parts: [{ text: prompt }] }]
      };
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await response.json();
      // Parse the model's response
      let text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      // Try to extract JSON array from the response
      let suggestions: { front: string; back: string }[] = [];
      try {
        const match = text.match(/\[.*\]/);
        if (match) {
          suggestions = JSON.parse(match[0]);
        }
      } catch (e) {
        setAiError('Could not parse AI response. Try rewording your notes.');
      }
      if (suggestions.length === 0) {
        setAiError('No flashcards generated. Try more detailed notes.');
      } else {
        setAiSuggestions(suggestions);
      }
    } catch (err) {
      setAiError('Failed to generate cards. Please try again.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleAddAiCard = (suggestion: { front: string; back: string }) => {
    onSave({
      id: Math.random().toString(36).slice(2),
      front: suggestion.front,
      back: suggestion.back,
      tags: [],
      deckId: currentDeckId,
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
      reviewHistory: [],
      relatedIds: [],
      scheduling: getInitialScheduling(),
      cardType: 'basic',
    } as Card);
  };

  // Toolbar button helper
  const ToolbarButton = ({ icon, label, onClick, disabled = false }: { icon: React.ReactNode, label: string, onClick: () => void, disabled?: boolean }) => (
    <button
      type="button"
      className="toolbar-btn"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      style={{ marginRight: 8 }}
    >
      {icon}
    </button>
  );

  // Formatting toolbar for rich text
  const renderToolbar = (editorRef: React.RefObject<HTMLDivElement | null>) => (
    <div className="editor-toolbar" style={{ display: 'flex', gap: 4, marginBottom: 8, flexWrap: 'wrap' }}>
      <ToolbarButton icon={<b>B</b>} label="Bold" onClick={() => applyFormat('bold', '', editorRef)} />
      <ToolbarButton icon={<i>I</i>} label="Italic" onClick={() => applyFormat('italic', '', editorRef)} />
      <ToolbarButton icon={<u>U</u>} label="Underline" onClick={() => applyFormat('underline', '', editorRef)} />
      <ToolbarButton icon={<span>•</span>} label="Bullet List" onClick={() => applyFormat('insertUnorderedList', '', editorRef)} />
      <ToolbarButton icon={<span>1.</span>} label="Numbered List" onClick={() => applyFormat('insertOrderedList', '', editorRef)} />
      <ToolbarButton icon={<span>🔗</span>} label="Insert Link" onClick={() => applyFormat('createLink', prompt('Enter URL:') || '', editorRef)} />
      <ToolbarButton icon={<span>🖼️</span>} label="Insert Image" onClick={() => handleImageUploadRequest(editorRef === frontEditorRef ? 'front' : 'back')} />
      <ToolbarButton icon={<span>💻</span>} label="Insert Code" onClick={() => setShowCodeEditor(true)} />
      <ToolbarButton icon={<span>∑</span>} label="Insert Math" onClick={() => setShowMathEditor(true)} />
      <span style={{ marginLeft: 'auto' }}></span>
      <span className="toolbar-help" title="Use the toolbar to format your card. Click ? for help.">?</span>
    </div>
  );

  return (
    <div className={`card-editor ${isMobile ? 'mobile-view' : ''} ${isTablet ? 'tablet-view' : ''}`}>
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
      
      <form className="card-editor-form" onSubmit={handleSubmit}>
        <div className="editor-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <button type="button" className="btn btn-secondary" onClick={() => document.getElementById('csv-import-input')?.click()} title="Import cards from CSV">📥 Import CSV</button>
            <input id="csv-import-input" type="file" accept=".csv" style={{ display: 'none' }} onChange={e => e.target.files && handleImportCSV(e.target.files[0])} />
            <button type="button" className="btn btn-accent" onClick={() => setIsAiModalOpen(true)} title="Generate cards with AI">✨ AI Assist</button>
          </div>
          <span className="editor-help" title="Create a new card. Use formatting, images, code, math, or import/AI for advanced options.">?</span>
        </div>
        {/* Front Editor */}
        <label htmlFor="front-editor" className="editor-label">Front</label>
        {renderToolbar(frontEditorRef)}
        <div
          id="front-editor"
          ref={frontEditorRef}
          className="editor-content"
          contentEditable
          data-placeholder="Enter the front of the card (question, prompt, etc.)"
          style={{ minHeight: 60, border: '1px solid #ddd', borderRadius: 6, padding: 8, marginBottom: 16 }}
          suppressContentEditableWarning
        >{front}</div>
        {/* Back Editor */}
        <label htmlFor="back-editor" className="editor-label">Back</label>
        {renderToolbar(backEditorRef)}
        <div
          id="back-editor"
          ref={backEditorRef}
          className="editor-content"
          contentEditable
          data-placeholder="Enter the back of the card (answer, explanation, etc.)"
          style={{ minHeight: 60, border: '1px solid #ddd', borderRadius: 6, padding: 8, marginBottom: 16 }}
          suppressContentEditableWarning
        >{back}</div>
        {/* ...rest of the form... */}
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

      <Modal
        isOpen={isAiModalOpen}
        onRequestClose={() => setIsAiModalOpen(false)}
        contentLabel="AI Card Generation"
        ariaHideApp={false}
        className="ai-modal"
        overlayClassName="ai-modal-overlay"
      >
        <h2>AI-Assisted Card Generation</h2>
        <textarea
          value={aiInput}
          onChange={e => setAiInput(e.target.value)}
          rows={6}
          placeholder="Paste your notes or topic here..."
          style={{ width: '100%', marginBottom: 12 }}
        />
        <button onClick={handleAiGenerate} disabled={aiLoading || !aiInput.trim()} className="primary-button">
          {aiLoading ? 'Generating...' : 'Generate Flashcards'}
        </button>
        <button onClick={() => setIsAiModalOpen(false)} className="secondary-button" style={{marginLeft: 8}}>Close</button>
        {aiError && <div style={{ color: 'red', marginTop: 8 }}>{aiError}</div>}
        {aiSuggestions.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <h4>Suggested Flashcards</h4>
            {aiSuggestions.map((s, idx) => (
              <div key={idx} className="ai-suggestion-card" style={{ border: '1px solid #ccc', borderRadius: 6, padding: 10, marginBottom: 8 }}>
                <div><strong>Q:</strong> {s.front}</div>
                <div><strong>A:</strong> {s.back}</div>
                <button onClick={() => handleAddAiCard(s)} className="primary-button" style={{ marginTop: 6 }}>Add to Deck</button>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
};
