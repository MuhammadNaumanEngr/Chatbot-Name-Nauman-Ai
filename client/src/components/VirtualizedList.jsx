import { memo, useCallback, useMemo, useRef, useEffect, useState } from 'react'
import { FixedSizeList as List } from 'react-window'
import { motion } from 'framer-motion'

export const VirtualizedConversationList = memo(function VirtualizedConversationList({
  conversations,
  height,
  itemHeight = 72,
  onSelectConversation,
  onDeleteConversation,
  onRenameConversation,
  currentConversationId,
  isLoading
}) {
  const listRef = useRef(null)

  const ConversationItem = useCallback(({ index, style }) => {
    const conv = conversations[index]
    if (!conv) return null

    return (
      <ConversationItemRow
        key={conv.conversationId}
        conversation={conv}
        index={index}
        style={style}
        isActive={currentConversationId === conv.conversationId}
        onSelect={() => onSelectConversation(conv)}
        onDelete={() => onDeleteConversation(conv)}
        onRename={onRenameConversation}
      />
    )
  }, [conversations, currentConversationId, onSelectConversation, onDeleteConversation, onRenameConversation])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!conversations || conversations.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-800 flex items-center justify-center">
          <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </div>
        <p className="text-sm text-gray-500">No conversations yet</p>
        <p className="text-xs text-gray-600 mt-1">Start a new chat to begin</p>
      </div>
    )
  }

  return (
    <List
      ref={listRef}
      height={height || 400}
      itemCount={conversations.length}
      itemSize={itemHeight}
      width="100%"
      className="scrollbar-thin"
    >
      {ConversationItem}
    </List>
  )
})

// Individual row component
function ConversationItemRow({ conversation, index, style, isActive, onSelect, onDelete, onRename }) {
  if (!conversation?.conversationId) return null
  const [isEditing, setIsEditing] = useState(false)
  const [editedTitle, setEditedTitle] = useState(conversation?.title || 'New Conversation')

  const date = new Date(conversation.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  const handleRename = useCallback(() => {
    if (editedTitle.trim() && editedTitle !== conversation.title) {
      onRename?.(conversation.conversationId, editedTitle.trim())
    }
    setIsEditing(false)
  }, [editedTitle, conversation.title, conversation.conversationId, onRename])

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter') handleRename()
    if (e.key === 'Escape') {
      setEditedTitle(conversation.title || 'New Conversation')
      setIsEditing(false)
    }
  }, [handleRename, conversation.title])

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03, type: 'spring', stiffness: 300, damping: 25 }}
      style={style}
      layout
      onClick={onSelect}
      className={`group relative px-3 py-3 rounded-lg cursor-pointer transition-all duration-200 mx-2 mb-1 ${
        isActive ? 'bg-gray-700' : 'hover:bg-gray-800'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {conversation.isPinned && (
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
                title="Double-click to rename"
              >
                {conversation.title || 'New Conversation'}
              </p>
            )}
            <p className="text-xs text-gray-500 mt-0.5">{date}</p>
          </div>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => { e.stopPropagation(); setIsEditing(true) }}
            className="p-1.5 rounded-md hover:bg-gray-600 text-gray-400 hover:text-gray-200 transition-all"
            title="Rename"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete() }}
            className="p-1.5 rounded-md hover:bg-red-500/20 hover:text-red-400 transition-all"
            title="Delete"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </motion.div>
  )
}