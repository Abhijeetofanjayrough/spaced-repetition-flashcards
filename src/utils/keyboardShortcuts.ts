// Keyboard shortcut utilities for the application

export interface KeyboardShortcut {
  key: string;         // The key to press (e.g., 'a', 'Enter', 'ArrowRight')
  description: string; // Description of what the shortcut does
  action: () => void;  // Function to execute when shortcut is triggered
  ctrlKey?: boolean;   // Whether Ctrl key (Cmd on Mac) must be pressed
  altKey?: boolean;    // Whether Alt key (Option on Mac) must be pressed
  shiftKey?: boolean;  // Whether Shift key must be pressed
  global?: boolean;    // Whether shortcut works anywhere in the app
}

export interface ShortcutGroup {
  name: string;               // Group name (e.g., "Navigation", "Study")
  shortcuts: KeyboardShortcut[]; // List of shortcuts in this group
}

// Handler for keyboard shortcuts
export const setupKeyboardShortcuts = (
  shortcutGroups: ShortcutGroup[],
  isActive: boolean = true
) => {
  const handleKeyDown = (event: KeyboardEvent) => {
    // Skip if shortcuts are not active
    if (!isActive) return;
    
    // Skip if user is typing in an input, textarea or contenteditable element
    const activeElement = document.activeElement;
    if (
      activeElement &&
      (activeElement.tagName === 'INPUT' ||
       activeElement.tagName === 'TEXTAREA' ||
       (activeElement as HTMLElement).isContentEditable)
    ) {
      return;
    }
    
    // Check all shortcut groups
    for (const group of shortcutGroups) {
      for (const shortcut of group.shortcuts) {
        // Check if this shortcut matches the event
        if (
          event.key.toLowerCase() === shortcut.key.toLowerCase() &&
          (shortcut.ctrlKey === undefined || event.ctrlKey === shortcut.ctrlKey) &&
          (shortcut.altKey === undefined || event.altKey === shortcut.altKey) &&
          (shortcut.shiftKey === undefined || event.shiftKey === shortcut.shiftKey)
        ) {
          // Prevent default browser behavior
          event.preventDefault();
          
          // Execute the shortcut action
          shortcut.action();
          
          // Stop after first matching shortcut
          break;
        }
      }
    }
  };
  
  // Add event listener for keydown
  document.addEventListener('keydown', handleKeyDown);
  
  // Return a cleanup function that removes the event listener
  return () => {
    document.removeEventListener('keydown', handleKeyDown);
  };
};

// Helper to generate shortcut hints for display in UI
export const getShortcutHint = (shortcut: KeyboardShortcut): string => {
  const parts: string[] = [];
  
  if (shortcut.ctrlKey) {
    parts.push(navigator.platform.indexOf('Mac') >= 0 ? '⌘' : 'Ctrl');
  }
  
  if (shortcut.altKey) {
    parts.push(navigator.platform.indexOf('Mac') >= 0 ? '⌥' : 'Alt');
  }
  
  if (shortcut.shiftKey) {
    parts.push('Shift');
  }
  
  // Format special keys more nicely
  let key = shortcut.key;
  switch (key) {
    case ' ':
      key = 'Space';
      break;
    case 'ArrowRight':
      key = '→';
      break;
    case 'ArrowLeft':
      key = '←';
      break;
    case 'ArrowUp':
      key = '↑';
      break;
    case 'ArrowDown':
      key = '↓';
      break;
    case 'Enter':
      key = '↵';
      break;
    case 'Escape':
      key = 'Esc';
      break;
    default:
      // For single letter keys, capitalize them
      if (key.length === 1) {
        key = key.toUpperCase();
      }
  }
  
  parts.push(key);
  
  return parts.join('+');
};

// Predefined common shortcut groups for reuse
export const getNavigationShortcuts = (
  onDashboard: () => void,
  onStudy: () => void,
  onEdit: () => void,
  onHelp: () => void
): ShortcutGroup => ({
  name: 'Navigation',
  shortcuts: [
    {
      key: 'd',
      description: 'Go to Dashboard',
      action: onDashboard,
      ctrlKey: true,
      global: true
    },
    {
      key: 's',
      description: 'Start Studying',
      action: onStudy,
      ctrlKey: true,
      global: true
    },
    {
      key: 'n',
      description: 'New Card',
      action: onEdit,
      ctrlKey: true,
      global: true
    },
    {
      key: '?',
      description: 'Show Help',
      action: onHelp,
      global: true
    },
    {
      key: 'Escape',
      description: 'Close Modal / Cancel',
      action: () => {
        // Find a visible modal and target its close button
        const modal = document.querySelector('.modal-overlay:not([style*="display: none"])');
        if (modal) {
          const closeButton = modal.querySelector('.close-button, [data-action="close"], button:last-child');
          if (closeButton && closeButton instanceof HTMLElement) {
            closeButton.click();
          }
        }
      },
      global: true
    }
  ]
});

export const getStudySessionShortcuts = (
  onFlip: () => void,
  onRate1: () => void,
  onRate2: () => void,
  onRate3: () => void,
  onRate4: () => void,
  onFavorite: () => void,
  onHint: () => void,
  onToggleView: () => void
): ShortcutGroup => ({
  name: 'Study Session',
  shortcuts: [
    {
      key: ' ',
      description: 'Flip Card / Mark as Good',
      action: onFlip
    },
    {
      key: '1',
      description: 'Rate: Again',
      action: onRate1
    },
    {
      key: '2',
      description: 'Rate: Hard',
      action: onRate2
    },
    {
      key: '3',
      description: 'Rate: Good',
      action: onRate3
    },
    {
      key: '4',
      description: 'Rate: Easy',
      action: onRate4
    },
    {
      key: 'f',
      description: 'Toggle Favorite',
      action: onFavorite
    },
    {
      key: 'h',
      description: 'Show Hint',
      action: onHint
    },
    {
      key: 'v',
      description: 'Toggle View Mode',
      action: onToggleView
    }
  ]
}); 