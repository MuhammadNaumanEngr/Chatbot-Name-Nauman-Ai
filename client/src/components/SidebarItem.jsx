import { memo, useState } from 'react'
import { motion } from 'framer-motion'

export const SidebarItem = memo(function SidebarItem({ conversation, isActive, onSelect, onDelete, onRename, isPinned = false, index = 0 }) {
  const [isEditing, setIsEditing] = useState(false)
  const displayTitle = conversation?.title?.trim() || 'New Conversation'
  const [editedTitle, setEditedTitle] = useState(displayTitle)

  if (!conversation?.conversationId) return null

  const date = new Date(conversation.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  const handleRename = () => {
    if (editedTitle.trim() && editedTitle !== conversation.title) {
      onRename?.(conversation.conversationId, editedTitle.trim())
    }
    setIsEditing(false)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleRename()
    if (e.key === 'Escape') {
      setEditedTitle(displayTitle)
      setIsEditing(false)
    }
  }

  return (
    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05, type: 'spring', stiffness: 300, damping: 25 }}
      layout onClick={onSelect}
      className={`group relative px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-200 mb-1 ${
        isActive
          ? 'bg-gray-700 border-l-2 border-blue-500'
          : 'hover:bg-gray-800'
      }`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {isPinned && (
            <svg className="w-3 h-3 text-yellow-500 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
              <path d="M16 4v4l2 2v2l-4-1v5l2 2v2l-4-1v3l4 4 4-4v-3l-4 1v-2l2-2v-5l-4 1v-2l2-2V4z"/>
            </svg>
          )}
          <div className="flex-1 min-w-0">
            {isEditing ? (
              <input
                type="text"
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                onBlur={handleRename}
                onKeyDown={handleKeyDown}
                className="w-full bg-gray-700 text-sm text-gray-100 px-2 py-1 rounded outline-none focus:ring-1 focus:ring-blue-500"
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <p
                className="text-sm text-gray-100 truncate cursor-text"
                onDoubleClick={(e) => { e.stopPropagation(); setIsEditing(true) }}
                title={displayTitle}
              >
                {displayTitle}
              </p>
            )}
            <p className="text-xs text-gray-500 mt-0.5">{date}</p>
          </div>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <motion.button whileTap={{ scale: 0.9 }} onClick={(e) => { e.stopPropagation(); setIsEditing(true) }}
            className="p-1.5 rounded-md hover:bg-gray-600 text-gray-400 hover:text-gray-200 transition-all" title="Rename">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </motion.button>
          <motion.button whileTap={{ scale: 0.9 }} onClick={(e) => { e.stopPropagation(); onDelete() }}
            className="p-1.5 rounded-md hover:bg-red-500/20 hover:text-red-400 transition-all" title="Delete">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
          </motion.button>
        </div>
      </div>
    </motion.div>
  )
})