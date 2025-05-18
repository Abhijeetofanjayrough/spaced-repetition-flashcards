import React, { useState, useEffect } from 'react';
import { Deck, RegularDeck, FilteredDeck, isRegularDeck, FilterCriterion, FilterCondition } from '../models/Deck';

interface DeckEditorModalProps {
  deckToEdit: Deck | null;
  allDecks: Deck[]; // For parent selection, excluding self and descendants
  onClose: () => void;
  onSaveDeck: (deckData: Deck) => void;
  // onDeleteDeck?: (deckId: string) => void; // Optional: for future delete functionality
}

export const DeckEditorModal: React.FC<DeckEditorModalProps> = ({
  deckToEdit,
  allDecks,
  onClose,
  onSaveDeck,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [parentId, setParentId] = useState<string | undefined>(undefined);
  const [isFiltered, setIsFiltered] = useState(false);
  const [filters, setFilters] = useState<FilterCriterion[]>([]);

  useEffect(() => {
    if (deckToEdit) {
      setName(deckToEdit.name);
      setDescription(deckToEdit.description || '');
      setParentId(deckToEdit.parentId);
      if (deckToEdit.type === 'filtered') {
        setIsFiltered(true);
        setFilters((deckToEdit as FilteredDeck).filters || []);
      } else {
        setIsFiltered(false);
      }
    } else {
      // Defaults for new deck
      setName('');
      setDescription('');
      setParentId(undefined);
      setIsFiltered(false);
      setFilters([]);
    }
  }, [deckToEdit]);

  // Prevent selecting self or descendants as parent
  const getValidParentDecks = () => {
    if (!deckToEdit) return allDecks; // All decks are valid for a new deck
    
    const descendantIds = new Set<string>();
    const getDescendants = (deckId: string) => {
      descendantIds.add(deckId);
      allDecks
        .filter(d => d.parentId === deckId)
        .forEach(child => getDescendants(child.id));
    };
    getDescendants(deckToEdit.id);

    return allDecks.filter(d => !descendantIds.has(d.id));
  };

  const validParentDecks = getValidParentDecks();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Deck name cannot be empty.'); // Basic validation
      return;
    }

    const now = new Date().toISOString();
    let savedDeckData: Deck;

    if (isFiltered) { // Basic structure for filtered deck - UI for filters needed later
        savedDeckData = {
            ...(deckToEdit || {}),
            id: deckToEdit ? deckToEdit.id : `deck_\${Date.now()}`,
            type: 'filtered',
            name: name.trim(),
            description: description.trim(),
            parentId: parentId === '' ? undefined : parentId,
            filters: filters, // Actual filter editing UI will modify this
            created: deckToEdit ? deckToEdit.created : now,
            modified: now,
        } as FilteredDeck;
    } else {
        savedDeckData = {
            ...(deckToEdit || {}),
            id: deckToEdit ? deckToEdit.id : `deck_\${Date.now()}`,
            type: 'regular',
            name: name.trim(),
            description: description.trim(),
            parentId: parentId === '' ? undefined : parentId,
            created: deckToEdit ? deckToEdit.created : now,
            modified: now,
        } as RegularDeck;
    }
    onSaveDeck(savedDeckData);
  };

  // Handler to add a new filter criterion
  const handleAddFilter = () => {
    setFilters([...filters, {
      // Default new filter - user will modify
      field: 'tags', 
      condition: 'includes',
      value: ''
    }]);
  };

  // Handler to update a filter criterion at a given index
  const handleUpdateFilter = (index: number, updatedCriterion: FilterCriterion) => {
    const newFilters = [...filters];
    newFilters[index] = updatedCriterion;
    setFilters(newFilters);
  };

  // Handler to remove a filter criterion at a given index
  const handleRemoveFilter = (index: number) => {
    setFilters(filters.filter((_, i) => i !== index));
  };

  return (
    <div className="modal-overlay" style={styles.overlay}>
      <div className="modal-content" style={styles.modal}>
        <h2 style={styles.header}>{deckToEdit ? 'Edit Deck' : 'Create New Deck'}</h2>
        <form onSubmit={handleSubmit}>
          <div style={styles.formGroup}>
            <label htmlFor="deckName" style={styles.label}>Name:</label>
            <input
              type="text"
              id="deckName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              style={styles.input}
            />
          </div>
          <div style={styles.formGroup}>
            <label htmlFor="deckDescription" style={styles.label}>Description (Optional):</label>
            <textarea
              id="deckDescription"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              style={styles.textarea}
            />
          </div>
          <div style={styles.formGroup}>
            <label htmlFor="deckParent" style={styles.label}>Parent Deck (Optional):</label>
            <select 
              id="deckParent" 
              value={parentId || ''} 
              onChange={(e) => setParentId(e.target.value || undefined)}
              style={styles.select}
            >
              <option value="">-- No Parent (Top Level) --</option>
              {validParentDecks.map(deck => (
                <option key={deck.id} value={deck.id}>
                  {deck.name}
                </option>
              ))}
            </select>
          </div>

          <div style={styles.formGroup}>
            <label style={{ ...styles.label, display: 'flex', alignItems: 'center' }}>
              <input 
                type="checkbox" 
                checked={isFiltered}
                onChange={(e) => setIsFiltered(e.target.checked)}
                style={{ marginRight: '8px' }}
              />
              Is this a Filtered Deck?
            </label>
          </div>

          {isFiltered && (
            <div className="filters-section" style={styles.filtersSection}>
              <h4 style={styles.filtersHeader}>Define Filter Criteria (Cards must match ALL criteria)</h4>
              {filters.map((filter, index) => (
                <div key={index} style={styles.filterRow}>
                  {/* Field Selector */}
                  <select 
                    value={filter.field} 
                    onChange={(e) => handleUpdateFilter(index, { ...filter, field: e.target.value as FilterCriterion['field'], value: '' /* Reset value on field change */ })} 
                    style={styles.filterSelect}
                  >
                    <option value="tags">Tags</option>
                    <option value="deckId">Deck ID</option>
                    <option value="front">Front Text</option>
                    <option value="back">Back Text</option>
                    <option value="dueDate">Due Date</option>
                    <option value="createdDate">Created Date</option>
                    <option value="modifiedDate">Modified Date</option>
                    <option value="learningStage">Learning Stage</option>
                    <option value="easeFactor">Ease Factor</option>
                    <option value="interval">Interval (days)</option>
                    <option value="reviewCount">Review Count</option>
                    <option value="mediaAttachments">Media Attachments</option>
                    <option value="favorite">Favorite Status</option>
                    <option value="archived">Archived Status</option>
                    <option value="cardType">Card Type</option>
                  </select>

                  {/* Condition Selector - This will need to be dynamic based on field type */}
                  <select 
                    value={filter.condition} 
                    onChange={(e) => handleUpdateFilter(index, { ...filter, condition: e.target.value as FilterCondition })} 
                    style={styles.filterSelect}
                  >
                    {/* General Conditions */}
                    <optgroup label="General">
                      <option value="includes">Includes</option>
                      <option value="not_includes">Not Includes</option>
                      <option value="equals">Equals</option>
                      <option value="not_equals">Not Equals</option>
                      <option value="startsWith">Starts With</option>
                    </optgroup>
                    {/* Date Conditions */}
                    { (filter.field === 'dueDate' || filter.field === 'createdDate' || filter.field === 'modifiedDate') &&
                      <optgroup label="Date">
                        <option value="before">Before (YYYY-MM-DD)</option>
                        <option value="after">After (YYYY-MM-DD)</option>
                        <option value="last_n_days">In Last N Days</option>
                        <option value="next_n_days">In Next N Days</option>
                        <option value="is_due">Is Due</option>
                      </optgroup>
                    }
                    {/* Learning Stage Conditions */}
                    { filter.field === 'learningStage' &&
                      <optgroup label="Stage">
                        <option value="is_learning">Learning</option>
                        <option value="is_reviewing">Reviewing</option>
                        <option value="is_relearning">Relearning</option>
                      </optgroup>
                    }
                    {/* Numeric Conditions */}
                    { (filter.field === 'easeFactor' || filter.field === 'interval' || filter.field === 'reviewCount') && 
                      <optgroup label="Numeric">
                        <option value="lt">Less Than (&lt;)</option>
                        <option value="lte">Less Than or Equal (&lt;=)</option>
                        <option value="gt">Greater Than (&gt;)</option>
                        <option value="gte">Greater Than or Equal (&gt;=)</option>
                      </optgroup>
                    }
                    {/* Media/Boolean Conditions */}
                    { (filter.field === 'mediaAttachments') && 
                      <optgroup label="Media">
                        <option value="has_images">Has Images</option>
                        <option value="no_images">No Images</option>
                      </optgroup>
                    }
                    { (filter.field === 'favorite' || filter.field === 'archived') &&
                       <optgroup label="Status">
                         <option value={filter.field === 'favorite' ? 'is_favorite' : 'is_archived'}>Is True</option>
                         <option value={filter.field === 'favorite' ? 'is_not_favorite' : 'is_not_archived'}>Is False</option>
                       </optgroup>
                    }
                  </select>

                  {/* Value Input - This will also need to be dynamic */}
                  { !(filter.condition === 'is_due' || filter.condition === 'has_images' || filter.condition === 'no_images' || 
                      filter.condition === 'is_favorite' || filter.condition === 'is_not_favorite' || 
                      filter.condition === 'is_archived' || filter.condition === 'is_not_archived' ||
                      filter.condition === 'is_learning' || filter.condition === 'is_reviewing' || filter.condition === 'is_relearning') &&
                    <input 
                      type={(filter.field === 'easeFactor' || filter.field === 'interval' || filter.field === 'reviewCount' || filter.condition === 'last_n_days' || filter.condition === 'next_n_days') ? 'number' : (filter.condition === 'before' || filter.condition === 'after') ? 'date' : 'text'}
                      value={filter.value || ''} 
                      placeholder={ (filter.field === 'tags' || (filter.field === 'deckId' && filter.condition === 'includes')) ? 'comma,separated,values' : 'Enter value'}
                      onChange={(e) => handleUpdateFilter(index, { ...filter, value: e.target.value })} 
                      style={styles.filterInput}
                    />
                  }
                  { (filter.field === 'cardType' && (filter.condition === 'equals' || filter.condition === 'not_equals')) &&
                      <select 
                        value={filter.value || 'basic'} 
                        onChange={(e) => handleUpdateFilter(index, { ...filter, value: e.target.value as 'basic' | 'cloze'})} 
                        style={styles.filterSelect}
                      >
                        <option value="basic">Basic</option>
                        <option value="cloze">Cloze</option>
                      </select>
                  }

                  <button type="button" onClick={() => handleRemoveFilter(index)} style={styles.filterRemoveButton}>Remove</button>
                </div>
              ))}
              <button type="button" onClick={handleAddFilter} style={{...styles.button, ...styles.addButton, marginTop: '10px'}}>
                Add Filter Criterion
              </button>
            </div>
          )}

          <div style={styles.actions}>
            <button type="submit" style={{...styles.button, ...styles.saveButton}}>
              {deckToEdit ? 'Save Changes' : 'Create Deck'}
            </button>
            <button type="button" onClick={onClose} style={{...styles.button, ...styles.cancelButton}}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'var(--modal-overlay-bg)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    background: 'var(--neutral-card-face)',
    padding: '25px',
    borderRadius: '8px',
    boxShadow: '0 5px 15px rgba(0,0,0,0.2)',
    width: '90%',
    maxWidth: '500px',
    maxHeight: '90vh',
    overflowY: 'auto',
  },
  header: {
    marginTop: 0,
    marginBottom: '20px',
    fontSize: '1.5em',
    color: 'var(--neutral-text)',
  },
  formGroup: {
    marginBottom: '15px',
  },
  label: {
    display: 'block',
    marginBottom: '5px',
    fontWeight: 'bold',
    color: 'var(--neutral-label-text)',
  },
  input: {
    width: 'calc(100% - 20px)',
    padding: '10px',
    border: '1px solid var(--neutral-divider)',
    borderRadius: '4px',
    fontSize: '1em',
  },
  textarea: {
    width: 'calc(100% - 20px)',
    padding: '10px',
    border: '1px solid var(--neutral-divider)',
    borderRadius: '4px',
    fontSize: '1em',
    minHeight: '60px',
  },
  select: {
    width: '100%',
    padding: '10px',
    border: '1px solid var(--neutral-divider)',
    borderRadius: '4px',
    fontSize: '1em',
    background: 'var(--neutral-input-bg)',
  },
  actions: {
    marginTop: '25px',
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
  },
  button: {
    padding: '10px 18px',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '1em',
    fontWeight: '500',
  },
  saveButton: {
    backgroundColor: 'var(--primary-brand-blue)',
    color: 'white',
  },
  cancelButton: {
    backgroundColor: 'var(--neutral-button-hover-bg)',
    color: 'var(--neutral-text)',
    border: '1px solid var(--neutral-divider)',
  },
  filtersSection: { 
    border: '1px solid var(--neutral-divider)', 
    padding: '15px', 
    borderRadius: '4px', 
    marginTop: '15px', 
    background: 'var(--neutral-input-bg)' 
  },
  filtersHeader: { 
    marginTop: 0, 
    marginBottom: '10px', 
    fontSize: '1em', 
    color: 'var(--neutral-text)' 
  },
  filterRow: { display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap' },
  filterSelect: { 
    padding: '8px', 
    border: '1px solid var(--neutral-divider)', 
    borderRadius: '4px', 
    fontSize: '0.9em', 
    minWidth: '150px', 
    flex: 1 
  },
  filterInput: { 
    padding: '8px', 
    border: '1px solid var(--neutral-divider)', 
    borderRadius: '4px', 
    fontSize: '0.9em', 
    flex: 2, 
    minWidth: '150px' 
  },
  filterRemoveButton: { 
    padding: '8px 12px', 
    background: 'var(--feedback-again)', 
    color: 'white', 
    border: 'none', 
    borderRadius: '4px', 
    cursor: 'pointer', 
    fontSize: '0.85em' 
  },
  addButton: { 
    backgroundColor: 'var(--primary-secondary-green)', 
    color: 'white' 
  },
};

export default DeckEditorModal; 