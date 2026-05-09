// Keyboard shortcuts custom hook
import { useEffect, useCallback } from 'react';

export function useKeyboardShortcuts({
  onNewConversation,
  onSearch,
  onPrevConversation,
  onNextConversation,
  onClosePanel,
  onFocusInput,
  onSendMessage,
  onToggleSidebar,
  onNewFolder,
  onOpenSettings,
  onOpenMemory,
  onOpenShortcutsHelp,
  onRegenerate,
  onCopyLastMessage,
  onEditLastMessage,
  onUndoLastSent,
  inputRef
}) {
  const isMac = navigator.platform.includes('Mac') || navigator.userAgent.includes('Mac');
  const modKey = isMac ? 'metaKey' : 'ctrlKey';

  const isInInput = useCallback(() => {
    const active = document.activeElement;
    if (!active) return false;
    const tag = active.tagName.toLowerCase();
    return tag === 'input' || tag === 'textarea' || active.isContentEditable;
  }, []);

  const handleKeyDown = useCallback((e) => {
    // Check if we're in an input
    const inInput = isInInput();

    // Always allow Escape to close panels (even in input)
    if (e.key === 'Escape') {
      e.preventDefault();
      onClosePanel?.();
      return;
    }

    // Navigation shortcuts - work almost everywhere
    if (e.ctrlKey || e.metaKey) {
      switch (e.key.toLowerCase()) {
        case 'k':
          e.preventDefault();
          onSearch?.();
          return;

        case 'shift+n':
          e.preventDefault();
          onNewConversation?.();
          return;

        case '[':
          e.preventDefault();
          onPrevConversation?.();
          return;

        case ']':
          e.preventDefault();
          onNextConversation?.();
          return;

        case 'enter':
          e.preventDefault();
          onSendMessage?.();
          return;

        case '/':
          if (!inInput) {
            e.preventDefault();
            onFocusInput?.();
          }
          return;

        case 'b':
          e.preventDefault();
          onToggleSidebar?.();
          return;

        case 'shift+f':
          e.preventDefault();
          onNewFolder?.();
          return;

        case ',':
          e.preventDefault();
          onOpenSettings?.();
          return;

        case 'shift+m':
          e.preventDefault();
          onOpenMemory?.();
          return;

        case 'z':
          if (inInput) {
            e.preventDefault();
            onUndoLastSent?.();
          }
          return;
      }
    }

    // ? key - open shortcuts help (not in input)
    if (e.key === '?' && !inInput) {
      e.preventDefault();
      onOpenShortcutsHelp?.();
      return;
    }

    // R key - regenerate (not in input)
    if (e.key === 'r' && !inInput && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      onRegenerate?.();
      return;
    }

    // Ctrl+C without selection - copy last AI message
    if ((e.ctrlKey || e.metaKey) && e.key === 'c' && !inInput) {
      const selection = window.getSelection();
      if (!selection || selection.toString().length === 0) {
        onCopyLastMessage?.();
      }
      return;
    }

    // Arrow Up in empty input - edit last message
    if (e.key === 'ArrowUp' && inInput && !e.ctrlKey && !e.metaKey && !e.altKey) {
      const target = e.target;
      if (target.value === '' || target.selectionStart === 0) {
        e.preventDefault();
        onEditLastMessage?.();
      }
    }
  }, [
    isInInput, onClosePanel, onSearch, onNewConversation, onPrevConversation,
    onNextConversation, onSendMessage, onFocusInput, onToggleSidebar, onNewFolder,
    onOpenSettings, onOpenMemory, onOpenShortcutsHelp, onRegenerate, onCopyLastMessage,
    onEditLastMessage, onUndoLastSent
  ]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

export default useKeyboardShortcuts;