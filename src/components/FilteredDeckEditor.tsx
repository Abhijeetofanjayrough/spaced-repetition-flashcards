import React, { useState } from 'react';
import { FilteredDeck, FilterCriterion, FilterCondition, DeckCommon } from '../models/Deck';
import { Card } from '../models/Card';

interface FilteredDeckEditorProps {
  onSave: (deckData: { id?: string; name: string; filters: FilterCriterion[] }) => void;
  onCancel: () => void;
  existingDeck?: FilteredDeck;
  allDecks?: DeckCommon[];
}

const availableFields: Array<{ value: FilterCriterion['field']; label: string; conditions: FilterCondition[]; valueType?: 'text' | 'number' | 'date' | 'tags' | 'deckId' | 'learningStage' | 'cardType' }> = [
  { value: 'tags', label: 'Tags', conditions: ['includes', 'not_includes'], valueType: 'tags' },
  { value: 'deckId', label: 'Source Deck', conditions: ['equals', 'not_equals'], valueType: 'deckId' },
  { value: 'front', label: 'Front Contains', conditions: ['startsWith', 'includes'], valueType: 'text' },
  { value: 'back', label: 'Back Contains', conditions: ['startsWith', 'includes'], valueType: 'text' },
  { value: 'dueDate', label: 'Due Date', conditions: ['before', 'after', 'last_n_days', 'next_n_days', 'is_due'], valueType: 'date' },
  { value: 'createdDate', label: 'Created Date', conditions: ['before', 'after', 'last_n_days'], valueType: 'date' },
  { value: 'modifiedDate', label: 'Modified Date', conditions: ['before', 'after', 'last_n_days'], valueType: 'date' },
  { value: 'learningStage', label: 'Learning Stage', conditions: ['is_learning', 'is_reviewing', 'is_relearning'], valueType: 'learningStage' },
  { value: 'easeFactor', label: 'Ease Factor', conditions: ['lt', 'lte', 'gt', 'gte'], valueType: 'number' },
  { value: 'interval', label: 'Interval (days)', conditions: ['lt', 'lte', 'gt', 'gte'], valueType: 'number' },
  { value: 'reviewCount', label: 'Review Count', conditions: ['lt', 'lte', 'gt', 'gte'], valueType: 'number' },
  { value: 'mediaAttachments', label: 'Media Present', conditions: ['has_images', 'no_images'] },
  { value: 'favorite', label: 'Favorite', conditions: ['is_favorite', 'is_not_favorite'] },
  { value: 'archived', label: 'Archived', conditions: ['is_archived', 'is_not_archived'] },
  { value: 'cardType', label: 'Card Type', conditions: ['equals'], valueType: 'cardType'},
];

const learningStageOptions: Array<{value: Card['scheduling']['learningStage'], label: string}> = [
    {value: 'learning', label: 'Learning'},
    {value: 'review', label: 'Review'},
    {value: 'relearning', label: 'Relearning'},
];

const cardTypeOptions: Array<{value: Card['cardType'], label: string}> = [
    {value: 'basic', label: 'Basic'},
    {value: 'cloze', label: 'Cloze'},
];

export const FilteredDeckEditor: React.FC<FilteredDeckEditorProps> = ({ onSave, onCancel, existingDeck, allDecks }) => {
  const [name, setName] = useState(existingDeck?.name || '');
  const [filters, setFilters] = useState<FilterCriterion[]>(existingDeck?.filters || [{ field: 'tags', condition: 'includes', value: '' }]);

  const handleAddFilter = () => {
    setFilters([...filters, { field: 'tags', condition: 'includes', value: '' }]);
  };

  const handleRemoveFilter = (index: number) => {
    setFilters(filters.filter((_, i) => i !== index));
  };

  const handleFilterChange = (index: number, part: Partial<FilterCriterion>) => {
    const newFilters = [...filters];
    newFilters[index] = { ...newFilters[index], ...part };
    if (part.field || part.condition) {
        const fieldDefinition = availableFields.find(f => f.value === newFilters[index].field);
        const condition = newFilters[index].condition;
        
        // Reset value based on new field/condition requirements
        if (fieldDefinition?.valueType === 'number' && condition !== 'last_n_days' && condition !== 'next_n_days') {
            newFilters[index].value = 0;
        } else if (fieldDefinition?.valueType === 'tags' || fieldDefinition?.valueType === 'text' || fieldDefinition?.valueType === 'deckId') {
            newFilters[index].value = '';
        } else if (fieldDefinition?.valueType === 'date' && (condition === 'before' || condition === 'after')) {
            newFilters[index].value = new Date().toISOString().split('T')[0]; // Default to today for date type
        } else if (fieldDefinition?.valueType === 'date' && (condition === 'last_n_days' || condition === 'next_n_days')) {
            newFilters[index].value = 7; // Default to 7 days for N_days conditions
        } else if (fieldDefinition?.valueType === 'learningStage') {
            newFilters[index].value = learningStageOptions[0].value;
        } else if (fieldDefinition?.valueType === 'cardType') {
            newFilters[index].value = cardTypeOptions[0].value;
        } else {
             // Conditions that don't need a value input field
            if (condition === 'is_due' || condition === 'has_images' || condition === 'no_images' || 
                condition === 'is_favorite' || condition === 'is_not_favorite' || 
                condition === 'is_archived' || condition === 'is_not_archived' ||
                condition === 'is_learning' || condition === 'is_reviewing' || condition === 'is_relearning') {
                delete newFilters[index].value;
            } else {
                 newFilters[index].value = ''; // Default reset for other types
            }
        }
    }
    setFilters(newFilters);
  };

  const handleSubmit = () => {
    if (!name.trim()) {
      alert('Filtered deck name cannot be empty.');
      return;
    }
    const finalFilters = filters.filter(f => {
        const fieldDef = availableFields.find(fd => fd.value === f.field);
        const valueRequired = !(f.condition === 'is_due' || 
                                f.condition === 'has_images' || 
                                f.condition === 'no_images' || 
                                f.condition === 'is_favorite' || 
                                f.condition === 'is_not_favorite' ||
                                f.condition === 'is_archived' ||
                                f.condition === 'is_not_archived' ||
                                f.condition === 'is_learning' || 
                                f.condition === 'is_reviewing' || 
                                f.condition === 'is_relearning');
        if (valueRequired && (f.value === undefined || (typeof f.value === 'string' && !f.value.trim()) )) {
            // Allow 0 for number types if that is a valid desired value
            if(fieldDef?.valueType === 'number' && f.value === 0) return true;
            return false; 
        }
        return true;
    });

    if (finalFilters.length === 0) {
        alert('Please define at least one valid filter criterion with a non-empty value where required.');
        return;
    }
    onSave({ id: existingDeck?.id, name, filters: finalFilters });
  };

  const getConditionsForField = (field: FilterCriterion['field']) => {
    return availableFields.find(f => f.value === field)?.conditions || [];
  };

  const getValueTypeForField = (field: FilterCriterion['field']) => {
    return availableFields.find(f => f.value === field)?.valueType;
  };

  const styleRoot: React.CSSProperties = { padding: '20px', background: 'var(--neutral-card-face)', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', width: '90vw', maxWidth: '600px', margin: '20px auto' };
  const styleGroup: React.CSSProperties = { marginBottom: '15px' };
  const styleLabel: React.CSSProperties = { display: 'block', marginBottom: '5px', fontWeight: '500', color: 'var(--neutral-label-text)' };
  const styleInput: React.CSSProperties = { width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--neutral-divider)', boxSizing: 'border-box' };
  const styleSelect = { ...styleInput } as React.CSSProperties;
  const styleButton: React.CSSProperties = { padding: '10px 15px', marginRight: '10px', borderRadius: '4px', border: 'none', cursor: 'pointer' };

  return (
    <div style={styleRoot}>
      <h3 style={{ marginTop: 0, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: 8 }}>
        {existingDeck ? 'Edit' : 'Create'} Filtered Deck
        <span
          title="Filtered decks are dynamic collections. Cards are included if they match ALL filter criteria below. Use filters like tags, due date, learning stage, etc. to create custom study sets."
          style={{ cursor: 'help', fontSize: '1.2em', color: 'var(--primary, #3A7BDE)' }}
        >
          ❓
        </span>
      </h3>
      <div style={{ color: 'var(--text-secondary, #888)', fontSize: '0.95em', marginBottom: 12 }}>
        <b>Tip:</b> Filtered decks update automatically. For example, create a deck for all cards tagged 'biology' due in the next 7 days.
      </div>
      <div style={styleGroup}>
        <label htmlFor="filteredDeckName" style={styleLabel}>Name:</label>
        <input id="filteredDeckName" type="text" value={name} onChange={e => setName(e.target.value)} style={styleInput} placeholder="e.g., Leech Cards, Due This Week"/>
      </div>

      <h4 style={{ marginBottom: '10px' }}>Filters:</h4>
      {filters.map((filter, index) => (
        <div key={index} style={{ ...styleGroup, padding: '15px', border: '1px solid var(--neutral-divider)', borderRadius: '4px', background: 'var(--neutral-input-bg)' }}>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
            <div style={{ flex: 1 }}>
              <label style={styleLabel}>Field:</label>
              <select value={filter.field} onChange={e => handleFilterChange(index, { field: e.target.value as FilterCriterion['field'] })} style={styleSelect}>
                {availableFields.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={styleLabel}>Condition:</label>
              <select value={filter.condition} onChange={e => handleFilterChange(index, { condition: e.target.value as FilterCondition })} style={styleSelect} disabled={getConditionsForField(filter.field).length === 0}>
                {getConditionsForField(filter.field).map(c => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}
              </select>
            </div>
          </div>
          
          { !(availableFields.find(f => f.value === filter.field)?.conditions.includes(filter.condition) && 
               (filter.condition === 'is_due' || filter.condition === 'has_images' || filter.condition === 'no_images' || 
                filter.condition === 'is_favorite' || filter.condition === 'is_not_favorite' || 
                filter.condition === 'is_archived' || filter.condition === 'is_not_archived' || 
                filter.condition === 'is_learning' || filter.condition === 'is_reviewing' || filter.condition === 'is_relearning')) && (
            <div style={{ marginBottom: '10px' }}>
              <label style={styleLabel}>Value:</label>
              {getValueTypeForField(filter.field) === 'number' ? (
                <input type="number" value={filter.value === undefined ? '' : filter.value} onChange={e => handleFilterChange(index, { value: e.target.value === '' ? undefined : parseInt(e.target.value,10) })} style={styleInput} />
              ) : getValueTypeForField(filter.field) === 'date' && (filter.condition === 'before' || filter.condition === 'after') ? (
                 <input type="date" value={typeof filter.value === 'string' ? filter.value : ''} onChange={e => handleFilterChange(index, { value: e.target.value })} style={styleInput} />
              ) : (getValueTypeForField(filter.field) === 'date' && (filter.condition === 'last_n_days' || filter.condition === 'next_n_days')) ? (
                 <input type="number" placeholder="Enter days (e.g., 7)" value={filter.value === undefined ? '' : filter.value} onChange={e => handleFilterChange(index, { value: e.target.value === '' ? undefined : parseInt(e.target.value,10) })} style={styleInput} />
              ) : getValueTypeForField(filter.field) === 'learningStage' ? (
                 <select value={filter.value || ''} onChange={e => handleFilterChange(index, { value: e.target.value as Card['scheduling']['learningStage']})} style={styleSelect}>
                    <option value="">Select Stage</option>
                    {learningStageOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                 </select>
              ) : getValueTypeForField(filter.field) === 'cardType' ? (
                <select value={filter.value || ''} onChange={e => handleFilterChange(index, { value: e.target.value as Card['cardType']})} style={styleSelect}>
                   <option value="">Select Type</option>
                   {cardTypeOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
              ) : getValueTypeForField(filter.field) === 'deckId' && allDecks ? (
                <select value={filter.value || ''} onChange={e => handleFilterChange(index, { value: e.target.value })} style={styleSelect}>
                  <option value="">Select Deck</option>
                  {allDecks.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              ) : (
                <input type="text" value={filter.value || ''} onChange={e => handleFilterChange(index, { value: e.target.value })} style={styleInput} placeholder={filter.field === 'tags' ? 'comma,separated,tags' : 'Enter value'}/>
              )}
            </div>
          )}
          <button onClick={() => handleRemoveFilter(index)} style={{ ...styleButton, background: 'var(--feedback-again)', color: 'white', fontSize:'12px', padding:'5px 10px', marginTop: 6 }}>Remove Filter</button>
        </div>
      ))}
      <button onClick={handleAddFilter} style={{ ...styleButton, background: 'var(--accent, #42B883)', color: 'white', fontWeight: 600, fontSize: '1em', marginTop:'10px', marginBottom: 16 }}>+ Add Filter</button>
      
      <div style={{ marginTop: '25px', borderTop: '1px solid var(--neutral-divider)', paddingTop: '15px', display: 'flex', flexWrap: 'wrap', gap: 12 }}>
        <button onClick={handleSubmit} style={{ ...styleButton, background: 'var(--primary, #3A7BDE)', color: 'white', fontWeight: 600, fontSize: '1em' }}>Save Filtered Deck</button>
        <button onClick={onCancel} style={{ ...styleButton, background: 'var(--neutral-button-hover-bg)', color: 'var(--neutral-text)', border: '1px solid var(--neutral-divider)' }}>Cancel</button>
      </div>
    </div>
  );
}; 