import { Card } from '../models/Card';
import { FilteredDeck, FilterCondition, isFilteredDeck } from '../models/Deck';

function checkCondition(value: any, condition: FilterCondition, criterionValue: any): boolean {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (condition) {
    // String/Array conditions
    case 'includes': // For tags (array) or text fields (string)
      if (Array.isArray(value)) return Array.isArray(criterionValue) ? criterionValue.some(cv => value.includes(cv)) : value.includes(criterionValue);
      if (typeof value === 'string' && typeof criterionValue === 'string') return value.toLowerCase().includes(criterionValue.toLowerCase());
      return false;
    case 'not_includes':
      if (Array.isArray(value)) return Array.isArray(criterionValue) ? !criterionValue.some(cv => value.includes(cv)) : !value.includes(criterionValue);
      if (typeof value === 'string' && typeof criterionValue === 'string') return !value.toLowerCase().includes(criterionValue.toLowerCase());
      return true; // or false if value must exist
    case 'equals': // for deckId (string), cardType (string)
      return value === criterionValue;
    case 'not_equals':
      return value !== criterionValue;
    case 'startsWith':
      return typeof value === 'string' && typeof criterionValue === 'string' && value.toLowerCase().startsWith(criterionValue.toLowerCase());

    // Date conditions
    case 'before': // dueDate, created, modified
      return new Date(value) < new Date(criterionValue);
    case 'after':
      return new Date(value) > new Date(criterionValue);
    case 'last_n_days': // dueDate (e.g., due in last N days, including today)
      const targetPastDate = new Date(today);
      targetPastDate.setDate(today.getDate() - (Number(criterionValue) -1)); // -1 to include today if N=1
      return new Date(value) >= targetPastDate && new Date(value) <= today;
    case 'next_n_days': // dueDate (e.g., due in next N days, including today)
      const targetFutureDate = new Date(today);
      targetFutureDate.setDate(today.getDate() + Number(criterionValue));
      return new Date(value) >= today && new Date(value) < targetFutureDate; // < targetFutureDate to exclude day N+1
    case 'is_due': // dueDate (due on or before today)
      return new Date(value) <= today;

    // Learning stage
    case 'is_learning': return value === 'learning';
    case 'is_reviewing': return value === 'review';
    case 'is_relearning': return value === 'relearning';

    // Numeric conditions (easeFactor, interval, reviewHistory.length)
    case 'lt': return Number(value) < Number(criterionValue);
    case 'lte': return Number(value) <= Number(criterionValue);
    case 'gt': return Number(value) > Number(criterionValue);
    case 'gte': return Number(value) >= Number(criterionValue);
    
    // Media attachments
    case 'has_images': return Array.isArray(value) && value.length > 0;
    case 'no_images': return !Array.isArray(value) || value.length === 0;

    // Boolean status
    case 'is_favorite': return value === true;
    case 'is_not_favorite': return value !== true;
    case 'is_archived': return value === true;
    case 'is_not_archived': return value !== true;

    default:
      return false;
  }
}

export function getCardsForFilteredDeck(deck: FilteredDeck, allCards: Card[]): Card[] {
  if (!deck.filters || deck.filters.length === 0) {
    return [];
  }

  // Determine if there's an explicit filter for the 'archived' status.
  const hasArchivedFilter = deck.filters.some(f => f.field === 'archived');

  return allCards.filter(card => {
    // If there's no explicit 'archived' filter, then exclude archived cards by default.
    // If there IS an 'archived' filter, the `checkCondition` for it will handle inclusion/exclusion.
    if (!hasArchivedFilter && card.archived) {
      return false;
    }

    // Card must match ALL criteria (AND logic)
    return deck.filters.every(criterion => {
      let cardValue: any;
      switch (criterion.field) {
        case 'tags': cardValue = card.tags || []; break;
        case 'deckId': cardValue = card.deckId; break;
        case 'front': cardValue = card.front; break;
        case 'back': cardValue = card.back; break;
        case 'dueDate': cardValue = card.scheduling.dueDate; break;
        case 'createdDate': cardValue = card.created; break;
        case 'modifiedDate': cardValue = card.modified; break;
        case 'learningStage': cardValue = card.scheduling.learningStage; break;
        case 'easeFactor': cardValue = card.scheduling.easeFactor; break;
        case 'interval': cardValue = card.scheduling.interval; break;
        case 'reviewCount': cardValue = card.reviewHistory.length; break;
        case 'mediaAttachments': cardValue = card.mediaAttachments || []; break;
        case 'favorite': cardValue = card.favorite; break;
        case 'archived': cardValue = card.archived; break;
        case 'cardType': cardValue = card.cardType || 'basic'; break;
        default:
          // Should not happen if FilterCriterion.field is typed correctly
          return false;
      }
      return checkCondition(cardValue, criterion.condition, criterion.value);
    });
  });
} 