import React from 'react';
import { Deck } from '../models/Deck';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface DeckListProps {
  decks: Deck[];
  selectedDeckId?: string | null;
  onSelectDeck: (deckId: string) => void;
  onReorderDecks: (reorderedDecks: Deck[]) => void;
  onEditDeck?: (deck: Deck) => void;
  onDeleteDeck?: (deckId: string) => void;
  onCreateSubDeck?: (parentId: string) => void;
}

interface DeckListItemProps {
  deck: Deck;
  allDecks: Deck[];
  level: number;
  selectedDeckId?: string | null;
  onSelectDeck: (deckId: string) => void;
  isDraggable?: boolean;
  id?: string;
  isExpanded: boolean;
  onToggleExpand: (deckId: string) => void;
  expandedDeckIds: Set<string>;
  onEditDeck?: (deck: Deck) => void;
  onDeleteDeck?: (deckId: string) => void;
  onCreateSubDeck?: (parentId: string) => void;
}

// Original DeckListItem, remains largely the same but won't handle D&D attributes itself directly
const DeckListItemDisplay: React.FC<DeckListItemProps> = ({
  deck, 
  allDecks, 
  level, 
  selectedDeckId, 
  onSelectDeck,
  isExpanded,
  onToggleExpand,
  onEditDeck,
  onDeleteDeck,
  onCreateSubDeck,
  expandedDeckIds
}) => {
  const childDecks = allDecks.filter(d => d.parentId === deck.id);
  const isSelected = deck.id === selectedDeckId;

  const itemStyle: React.CSSProperties = {
    paddingLeft: `${level * 20 + (childDecks.length > 0 ? 0 : 20)}px`, // Indent further if no expand icon
    paddingTop: '8px',
    paddingBottom: '8px',
    cursor: 'pointer',
    fontWeight: isSelected ? 'bold' : 'normal',
    backgroundColor: isSelected ? 'var(--selected-item-bg)' : 'transparent',
    borderBottom: '1px solid var(--neutral-divider)',
    listStyleType: 'none',
    // Remove touchAction: 'none' if it was added by dnd-kit; CSS.Transform handles it
  };

  const deckNameStyle: React.CSSProperties = {
    color: deck.color || (isSelected ? 'var(--primary-brand-blue)' : 'var(--neutral-text)'),
  };

  return (
    <>
      {/* The LI will be the draggable element if this item is a root item */}
      <li style={itemStyle} title={deck.description || deck.name}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {childDecks.length > 0 && (
            <button 
              onClick={(e) => { e.stopPropagation(); onToggleExpand(deck.id); }}
              style={{
                background: 'none', border: 'none', cursor: 'pointer', 
                marginRight: '8px', padding: '0 4px', fontSize: '1em',
                color: 'var(--neutral-text-secondary)', minWidth: '20px' 
              }}
              title={isExpanded ? "Collapse" : "Expand"}
            >
              {isExpanded ? '▼' : '▶'}
            </button>
          )}
          <span onClick={() => onSelectDeck(deck.id)} style={{...deckNameStyle, flexGrow: 1, cursor: 'pointer'}}>
            {deck.icon} {deck.name}
          </span>
          {/* Action buttons - shown on hover or permanently? For now, basic */}
          {onEditDeck && deck.id !== 'default' && (
            <button title="Edit Deck" className="deck-action-btn" onClick={(e) => { e.stopPropagation(); onEditDeck(deck); }}>✏️</button>
          )}
          {onCreateSubDeck && deck.type === 'regular' && (
             <button title="Add Sub-Deck" className="deck-action-btn" onClick={(e) => { e.stopPropagation(); onCreateSubDeck(deck.id); }}>➕</button>
          )}
          {onDeleteDeck && deck.id !== 'default' && (
            <button title="Delete Deck" className="deck-action-btn delete" onClick={(e) => { e.stopPropagation(); onDeleteDeck(deck.id); }}>🗑️</button>
          )}
        </div>
      </li>
      {/* Child decks are rendered recursively but are not individually sortable in this setup */}
      {isExpanded && childDecks.length > 0 && (
        childDecks.map(child => (
          <DeckListItemDisplay 
            key={child.id} 
            deck={child} 
            allDecks={allDecks} 
            level={level + 1} 
            selectedDeckId={selectedDeckId} 
            onSelectDeck={onSelectDeck}
            isDraggable={false} // Children are not draggable in this iteration
            isExpanded={expandedDeckIds.has(child.id)} // Correctly use the passed prop
            onToggleExpand={onToggleExpand}
            expandedDeckIds={expandedDeckIds}
            onEditDeck={onEditDeck}
            onDeleteDeck={onDeleteDeck}
            onCreateSubDeck={onCreateSubDeck}
          />
        ))
      )}
    </>
  );
};

// New Sortable Item Wrapper for root decks
const SortableDeckItem: React.FC<DeckListItemProps & { id: string; expandedDeckIds: Set<string> }> = (props) => {
  const { deck, allDecks, level, selectedDeckId, onSelectDeck, id, isExpanded, onToggleExpand, expandedDeckIds, onEditDeck, onDeleteDeck, onCreateSubDeck } = props;
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    // zIndex: isDragging ? 100 : 'auto', // Optional: lift item when dragging
    // border: isDragging ? '1px dashed var(--primary-brand-blue)' : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <DeckListItemDisplay {...props} isExpanded={expandedDeckIds.has(deck.id)} />
    </div>
  );
};

export const DeckList: React.FC<DeckListProps> = ({ 
  decks, 
  selectedDeckId, 
  onSelectDeck, 
  onReorderDecks,
  onEditDeck,
  onDeleteDeck,
  onCreateSubDeck 
}) => {
  const [expandedDeckIds, setExpandedDeckIds] = React.useState<Set<string>>(new Set());

  const toggleExpand = (deckId: string) => {
    setExpandedDeckIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(deckId)) {
        newSet.delete(deckId);
      } else {
        newSet.add(deckId);
      }
      return newSet;
    });
  };

  const rootDecks = decks.filter(d => !d.parentId);
  // For dnd-kit, we need a stable list of IDs for the SortableContext
  const rootDeckIds = React.useMemo(() => rootDecks.map(d => d.id), [rootDecks]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = rootDeckIds.indexOf(active.id as string);
      const newIndex = rootDeckIds.indexOf(over.id as string);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        const reorderedRootDecks = arrayMove(rootDecks, oldIndex, newIndex);
        // Construct the full new deck list: reordered root decks + all child decks
        const childDecks = decks.filter(d => d.parentId);
        onReorderDecks([...reorderedRootDecks, ...childDecks]);
      }
    }
  }

  if (decks.length === 0) {
    return <p style={{padding: '10px', color: 'var(--neutral-text-secondary)'}}>No decks available. Create one to get started!</p>;
  }

  return (
    <DndContext 
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext 
        items={rootDeckIds}
        strategy={verticalListSortingStrategy}
      >
        <ul style={{ margin: 0, padding: 0, border: '1px solid var(--neutral-divider)', borderRadius: '4px', overflow: 'hidden' }}>
          {rootDecks.map(deck => (
            <SortableDeckItem
              key={deck.id}
              id={deck.id} // crucial for useSortable
              deck={deck}
              allDecks={decks} // Pass all decks to find children for display
              level={0}
              selectedDeckId={selectedDeckId}
              onSelectDeck={onSelectDeck}
              isDraggable={true} // Root items are draggable
              isExpanded={expandedDeckIds.has(deck.id)} // Pass expanded state
              onToggleExpand={toggleExpand} // Pass toggle function
              expandedDeckIds={expandedDeckIds} // Pass the set for SortableDeckItem to use
              // Pass action handlers
              onEditDeck={onEditDeck}
              onDeleteDeck={onDeleteDeck}
              onCreateSubDeck={onCreateSubDeck}
            />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
};

export default DeckList; 