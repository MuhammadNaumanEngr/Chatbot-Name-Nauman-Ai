import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useRef } from 'react'

export function KeyboardShortcutsModal({ isOpen, onClose }) {
  const modalRef = useRef(null)
  const isMac = navigator.platform.includes('Mac') || navigator.userAgent.includes('Mac')
  const mod = isMac ? '⌘' : 'Ctrl'

  const shortcuts = [
    { keys: [mod, 'K'], action: 'Search conversations', category: 'Navigation' },
    { keys: [mod, 'N'], action: 'New conversation', category: 'Navigation' },
    { keys: [mod, '['], action: 'Previous conversation', category: 'Navigation' },
    { keys: [mod, ']'], action: 'Next conversation', category: 'Navigation' },
    { keys: [mod, 'B'], action: 'Toggle sidebar', category: 'Navigation' },
    { keys: [mod, ','], action: 'Open settings', category: 'Navigation' },
    { keys: [mod, 'Enter'], action: 'Send message', category: 'Messaging' },
    { keys: [mod, '/'], action: 'Focus input', category: 'Messaging' },
    { keys: [mod, 'Z'], action: 'Undo (in input)', category: 'Messaging' },
    { keys: ['↑'], action: 'Edit last message (empty input)', category: 'Messaging' },
    { keys: ['R'], action: 'Regenerate response', category: 'Messaging' },
    { keys: ['Esc'], action: 'Close modal/panel', category: 'General' },
    { keys: ['?'], action: 'Show shortcuts help', category: 'General' },
  ]

  const categories = [...new Set(shortcuts.map(s => s.category))]

  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            ref={modalRef}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="bg-gray-850 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h2 className="text-lg font-semibold text-gray-100">Keyboard Shortcuts</h2>
              </div>
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-gray-200 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 max-h-[60vh] overflow-y-auto">
              {categories.map(category => (
                <div key={category} className="mb-6 last:mb-0">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">{category}</h3>
                  <div className="space-y-2">
                    {shortcuts.filter(s => s.category === category).map((shortcut, i) => (
                      <div key={i} className="flex items-center justify-between py-2">
                        <span className="text-sm text-gray-300">{shortcut.action}</span>
                        <div className="flex gap-1">
                          {shortcut.keys.map((key, j) => (
                            <kbd key={j} className="px-2.5 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-xs text-gray-200 font-mono">
                              {key}
                            </kbd>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="px-6 py-4 border-t border-gray-700 bg-gray-900/50">
              <p className="text-xs text-gray-500 text-center">
                Press <kbd className="px-1.5 py-0.5 bg-gray-800 rounded text-gray-400">Esc</kbd> to close
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}