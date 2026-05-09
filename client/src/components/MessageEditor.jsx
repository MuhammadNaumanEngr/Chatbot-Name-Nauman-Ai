import { motion } from 'framer-motion'
import { useState, useRef, useEffect } from 'react'

export function MessageEditor({ message, onSave, onCancel }) {
  const [content, setContent] = useState(message.content)
  const [isSaving, setIsSaving] = useState(false)
  const textareaRef = useRef(null)

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px'
    }
  }, [content])

  const handleSave = async () => {
    if (!content.trim() || content === message.content) {
      onCancel()
      return
    }
    setIsSaving(true)
    try {
      await onSave(content.trim())
    } finally {
      setIsSaving(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      onCancel()
    }
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      handleSave()
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="mb-4 p-4 bg-blue-500/10 border border-blue-500/30 rounded-2xl"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          <span className="text-sm text-blue-400 font-medium">Edit Message</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <kbd className="px-1.5 py-0.5 bg-gray-800 rounded text-gray-400">Ctrl+Enter</kbd>
          <span>to save</span>
        </div>
      </div>

      <textarea
        ref={textareaRef}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-blue-500 resize-none"
        rows={3}
        autoFocus
      />

      {message.editHistory && message.editHistory.length > 0 && (
        <div className="mt-3 text-xs text-gray-500">
          Previously edited {message.editHistory.length} time(s)
        </div>
      )}

      <div className="flex items-center justify-end gap-2 mt-3">
        <button
          onClick={onCancel}
          className="px-3 py-1.5 text-sm text-gray-400 hover:text-gray-200 transition-colors"
        >
          Cancel
        </button>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleSave}
          disabled={isSaving || !content.trim() || content === message.content}
          className="px-4 py-1.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm font-medium rounded-lg hover:from-blue-500 hover:to-purple-500 transition-all disabled:opacity-50"
        >
          {isSaving ? 'Saving...' : 'Save & Regenerate'}
        </motion.button>
      </div>
    </motion.div>
  )
}