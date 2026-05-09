import { memo, useMemo } from 'react'
import { apiClient } from '../utils/apiClient.js'
import { SearchInput } from './SearchInput.jsx'
import { SearchResultItem } from './SearchResultItem.jsx'
import { SidebarItem } from './SidebarItem.jsx'
import { SidebarSkeleton } from './Skeleton.jsx'
import { ConnectionStatus } from './ConnectionStatus.jsx'
import { UserAvatar } from './UserAvatar.jsx'
import { motion } from 'framer-motion'

export const SidebarContent = memo(function SidebarContent({
  conversations,
  searchQuery,
  setSearchQuery,
  searchResults,
  isSearching,
  currentConversation,
  onSelectConversation,
  onDeleteConversation,
  onCreateConversation,
  onRenameConversation,
  isLoadingChats,
  user,
  onLogout,
  isConnected,
  onOpenAgents
}) {
  const handleClearSearch = () => setSearchQuery('')

  // Group conversations by date
  const groupedConversations = useMemo(() => {
    if (searchQuery) return null

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    const lastWeek = new Date(today)
    lastWeek.setDate(lastWeek.getDate() - 7)

    const groups = {
      pinned: [],
      today: [],
      yesterday: [],
      lastWeek: [],
      older: []
    }

    conversations.forEach(conv => {
      const convDate = new Date(conv.updatedAt || conv.createdAt)
      convDate.setHours(0, 0, 0, 0)

      if (conv.isPinned) {
        groups.pinned.push(conv)
      } else if (convDate.getTime() === today.getTime()) {
        groups.today.push(conv)
      } else if (convDate.getTime() === yesterday.getTime()) {
        groups.yesterday.push(conv)
      } else if (convDate > lastWeek) {
        groups.lastWeek.push(conv)
      } else {
        groups.older.push(conv)
      }
    })

    return groups
  }, [conversations, searchQuery])

  const handleRename = (conversationId, newTitle) => {
    onRenameConversation?.(conversationId, newTitle)
  }

  return (
    <div className="flex flex-col h-full bg-gray-850">
      {/* 1. LOGO SECTION - top */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-700/50">
        {/* Logo Circle */}
        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-lg bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg flex-shrink-0">
          N
        </div>

        {/* App Name */}
        <div>
          <h1 className="text-white font-semibold text-base leading-tight">
            Nauman AI
          </h1>
          <p className="text-gray-500 text-xs">
            Personal Assistant
          </p>
        </div>
      </div>

      {/* 2. NEW CHAT BUTTON - below logo */}
      <div className="px-3 pt-3 pb-2">
        <button
          onClick={onCreateConversation}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white transition-all duration-200 shadow-md hover:shadow-blue-500/25"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Chat
        </button>
      </div>

      {/* 3. SEARCH BAR */}
      <div className="px-3 pb-2">
        <SearchInput value={searchQuery} onChange={setSearchQuery} onClear={handleClearSearch} />
      </div>

      {/* 4. CONVERSATION LIST - scrollable */}
      <div className="flex-1 overflow-y-auto px-2">
        {searchQuery ? (
          // Search results
          <>
            <p className="text-xs text-gray-500 uppercase font-semibold mb-3 px-2 flex items-center gap-2">
              {isSearching ? (
                <>
                  <div className="w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
                  Searching...
                </>
              ) : (
                <>Results ({searchResults.length})</>
              )}
            </p>
            {searchResults.length === 0 && !isSearching ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-800 flex items-center justify-center">
                  <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <p className="text-sm text-gray-500">No conversations found</p>
              </div>
            ) : (
              searchResults.map((result, i) => (
                <SearchResultItem
                  key={result.conversationId}
                  result={result}
                  isActive={currentConversation?.conversationId === result.conversationId}
                  onSelect={() => {
                    apiClient(`/conversations/${result.conversationId}`).then(fullConv => {
                      onSelectConversation(fullConv)
                      setSearchQuery('')
                    })
                  }}
                />
              ))
            )}
          </>
        ) : (
          // Grouped conversations
          <>
            {!isLoadingChats && groupedConversations && (
              <>
                {groupedConversations.pinned.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs text-gray-500 uppercase font-semibold mb-2 px-2 flex items-center gap-2">
                      <svg className="w-3 h-3 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M16 4v4l2 2v2l-4-1v5l2 2v2l-4-1v3l4 4 4-4v-3l-4 1v-2l2-2v-5l-4 1v-2l2-2V4z"/>
                      </svg>
                      Pinned
                    </p>
                    {groupedConversations.pinned.map((conv, i) => (
                      <SidebarItem
                        key={conv.conversationId}
                        conversation={conv}
                        index={i}
                        isActive={currentConversation?.conversationId === conv.conversationId}
                        isPinned
                        onSelect={() => onSelectConversation(conv)}
                        onDelete={() => onDeleteConversation(conv)}
                        onRename={handleRename}
                      />
                    ))}
                  </div>
                )}

                {groupedConversations.today.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs text-gray-500 uppercase font-semibold mb-2 px-2">Today</p>
                    {groupedConversations.today.map((conv, i) => (
                      <SidebarItem
                        key={conv.conversationId}
                        conversation={conv}
                        index={i}
                        isActive={currentConversation?.conversationId === conv.conversationId}
                        onSelect={() => onSelectConversation(conv)}
                        onDelete={() => onDeleteConversation(conv)}
                        onRename={handleRename}
                      />
                    ))}
                  </div>
                )}

                {groupedConversations.yesterday.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs text-gray-500 uppercase font-semibold mb-2 px-2">Yesterday</p>
                    {groupedConversations.yesterday.map((conv, i) => (
                      <SidebarItem
                        key={conv.conversationId}
                        conversation={conv}
                        index={i}
                        isActive={currentConversation?.conversationId === conv.conversationId}
                        onSelect={() => onSelectConversation(conv)}
                        onDelete={() => onDeleteConversation(conv)}
                        onRename={handleRename}
                      />
                    ))}
                  </div>
                )}

                {groupedConversations.lastWeek.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs text-gray-500 uppercase font-semibold mb-2 px-2">Last 7 Days</p>
                    {groupedConversations.lastWeek.map((conv, i) => (
                      <SidebarItem
                        key={conv.conversationId}
                        conversation={conv}
                        index={i}
                        isActive={currentConversation?.conversationId === conv.conversationId}
                        onSelect={() => onSelectConversation(conv)}
                        onDelete={() => onDeleteConversation(conv)}
                        onRename={handleRename}
                      />
                    ))}
                  </div>
                )}

                {groupedConversations.older.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs text-gray-500 uppercase font-semibold mb-2 px-2">Older</p>
                    {groupedConversations.older.map((conv, i) => (
                      <SidebarItem
                        key={conv.conversationId}
                        conversation={conv}
                        index={i}
                        isActive={currentConversation?.conversationId === conv.conversationId}
                        onSelect={() => onSelectConversation(conv)}
                        onDelete={() => onDeleteConversation(conv)}
                        onRename={handleRename}
                      />
                    ))}
                  </div>
                )}

                {conversations.length === 0 && (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-800 flex items-center justify-center">
                      <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                    </div>
                    <p className="text-sm text-gray-500 mb-2">No conversations yet</p>
                    <p className="text-xs text-gray-600">Start a new chat to begin</p>
                  </div>
                )}
              </>
            )}

            {isLoadingChats && (
              <SidebarSkeleton />
            )}
          </>
        )}
      </div>

      {/* 5. BOTTOM SECTION - user profile and actions */}
      <div className="p-3 border-t border-gray-700/50 space-y-2">
        <button
          onClick={onOpenAgents}
          className="w-full flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm text-gray-300 transition-colors"
        >
          <span>🤖</span>
          <span>Agents</span>
        </button>
        <ConnectionStatus isConnected={isConnected} />
        <UserAvatar user={user} onLogout={onLogout} />
      </div>
    </div>
  )
})