import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface UseKeyboardShortcutsProps {
  onOpenSearch?: () => void;
  onOpenHelp?: () => void;
  onOpenGuide?: () => void;
  onNew?: () => void;
  onSave?: () => void;
  onEscape?: () => void;
}

export function useKeyboardShortcuts({
  onOpenSearch,
  onOpenHelp,
  onOpenGuide,
  onNew,
  onSave,
  onEscape
}: UseKeyboardShortcutsProps = {}) {
  const navigate = useNavigate();

  useEffect(() => {
    let isGPressed = false;
    let gPressTimeout: NodeJS.Timeout;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        event.target instanceof HTMLSelectElement ||
        (event.target as HTMLElement)?.contentEditable === 'true'
      ) {
        return;
      }

      const { key, ctrlKey, metaKey, shiftKey } = event;
      const isModifierPressed = ctrlKey || metaKey;

      // Handle G key for navigation shortcuts
      if (key.toLowerCase() === 'g' && !isModifierPressed) {
        event.preventDefault();
        isGPressed = true;
        
        // Reset G press after 2 seconds
        clearTimeout(gPressTimeout);
        gPressTimeout = setTimeout(() => {
          isGPressed = false;
        }, 2000);
        return;
      }

      // Navigation shortcuts (G + key)
      if (isGPressed && !isModifierPressed) {
        event.preventDefault();
        isGPressed = false;
        clearTimeout(gPressTimeout);

        switch (key.toLowerCase()) {
          case 'd':
            navigate('/');
            break;
          case 'o':
            navigate('/ordrar');
            break;
          case 'k':
            navigate('/kunder');
            break;
          case 'f':
            navigate('/offerter');
            break;
          case 'c':
            navigate('/kalender');
            break;
          case 'i':
            navigate('/fakturor');
            break;
          case 't':
            navigate('/team');
            break;
          case 'a':
            navigate('/analys');
            break;
          case 's':
            navigate('/installningar');
            break;
        }
        return;
      }

      // Other shortcuts
      switch (key) {
        case 'Escape':
          event.preventDefault();
          onEscape?.();
          break;
        
        case '/':
          if (!isModifierPressed) {
            event.preventDefault();
            // Focus search field if available
            const searchInput = document.querySelector('input[type="search"], input[placeholder*="Sök"]') as HTMLInputElement;
            if (searchInput) {
              searchInput.focus();
            }
          }
          break;
        
        case '?':
          if (!isModifierPressed && !shiftKey) {
            event.preventDefault();
            onOpenHelp?.();
          } else if (isModifierPressed) {
            event.preventDefault();
            onOpenGuide?.();
          }
          break;
        
        case 'k':
          if (isModifierPressed) {
            event.preventDefault();
            onOpenSearch?.();
          }
          break;
        
        case 'n':
          if (!isModifierPressed) {
            event.preventDefault();
            onNew?.();
          }
          break;
        
        case 's':
          if (isModifierPressed) {
            event.preventDefault();
            onSave?.();
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      clearTimeout(gPressTimeout);
    };
  }, [navigate, onOpenSearch, onOpenHelp, onOpenGuide, onNew, onSave, onEscape]);
}

export default useKeyboardShortcuts;