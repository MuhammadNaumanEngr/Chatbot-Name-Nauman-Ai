import { useState, useEffect, useRef, Suspense } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import { apiClient, setLogoutCallback, setRateLimitToastCallback } from './utils/apiClient.js'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts.js'

// Contexts
import { AuthContext, useAuth } from './contexts/AuthContext.js'
import { ToastContext, useToast } from './contexts/ToastContext.js'

// Components (no lazy loading for now - static imports)
import { AgentPanel } from './components/AgentPanel.jsx'
import { SettingsPanel } from './components/SettingsPanel.jsx'
import { TemplateModal } from './components/TemplateModal.jsx'
import { PersonaModal } from './components/PersonaModal.jsx'
import { KeyboardShortcutsModal } from './components/KeyboardShortcutsModal.jsx'
import { ExportModal } from './components/ExportModal.jsx'
import { StatsDashboard } from './components/StatsDashboard.jsx'
import { FolderPanel } from './components/FolderPanel.jsx'
import { SystemPromptEditor } from './components/SystemPromptEditor.jsx'
import { MessageEditor } from './components/MessageEditor.jsx'

// Always-loaded components (lightweight, already separated)
import { TypingIndicator } from './components/TypingIndicator.jsx'
import { MessageBubble } from './components/MessageBubble.jsx'
import { WelcomeScreen } from './components/WelcomeScreen.jsx'
import { AuthScreen } from './components/AuthScreen.jsx'
import { SidebarContent } from './components/SidebarContent.jsx'
import { MessageSkeleton, SidebarSkeleton } from './components/Skeleton.jsx'
import { MobileSidebarOverlay } from './components/MobileSidebarOverlay.jsx'
import { Header } from './components/Header.jsx'
import { InputBar } from './components/InputBar.jsx'
import { QueuedMessage } from './components/QueuedMessage.jsx'

// Loading fallback component
function ComponentLoader() {
  return (
    <div className="flex items-center justify-center py-8">
      <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

// ─── Auth Context ────────────────────────────────────────────────────────────
function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    checkSession()
  }, [])

  useEffect(() => {
    setLogoutCallback(() => {
      setUser(null)
    })
  }, [])

  const checkSession = async () => {
    try {
      const data = await apiClient('/auth/me')
      setUser(data.user)
    } catch (err) {
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }

  const login = async (email, password) => {
    const data = await apiClient('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    })
    setUser(data.user)
    return data.user
  }

  const register = async (email, password, displayName) => {
    const data = await apiClient('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, displayName })
    })
    setUser(data.user)
    return data.user
  }

  const loginAsGuest = async () => {
    const data = await apiClient('/auth/guest', { method: 'POST' })
    setUser(data.user)
    return data.user
  }

  const logout = async () => {
    try {
      await apiClient('/auth/logout', { method: 'POST' })
    } catch (err) { /* ignore */ }
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, login, register, loginAsGuest, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  )
}

// ─── Toast Context ────────────────────────────────────────────────────────────
function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const [countdown, setCountdown] = useState(null)
  const countdownRef = useRef(null)

  const addToast = (message, type = 'error', requestId = null) => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, message, type, requestId }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 6000)
  }

  const showRateLimitToast = (seconds) => {
    if (seconds <= 0) {
      if (countdownRef.current) clearInterval(countdownRef.current)
      setCountdown(null)
      return
    }
    setCountdown(seconds)
    countdownRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownRef.current)
          setCountdown(null)
          return null
        }
        return prev - 1
      })
    }, 1000)
  }

  setRateLimitToastCallback(showRateLimitToast)

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 space-y-2">
        {countdown !== null && (
          <div className="px-4 py-3 rounded-lg bg-yellow-600/90 backdrop-blur shadow-lg flex items-center gap-3 animate-slide-in">
            <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span className="text-sm font-medium">Rate limited. Try again in {countdown}s</span>
          </div>
        )}
        {toasts.map(toast => (
          <div key={toast.id} className={`px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-slide-in ${
            toast.type === 'error' ? 'bg-red-600' : 'bg-green-600'
          }`}>
            {toast.type === 'error' ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            )}
            <span className="text-sm font-medium">{toast.message}</span>
            {toast.requestId && <span className="text-xs opacity-75">ID: {toast.requestId}</span>}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

// ─── Main App ─────────────────────────────────────────────────────────────────
function AppContent() {
  const { user, login, register, loginAsGuest, logout } = useAuth()
  const { addToast } = useToast()
  const [conversations, setConversations] = useState([])
  const [currentConversation, setCurrentConversation] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const [isLoadingChats, setIsLoadingChats] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [models, setModels] = useState([])
  const [selectedModel, setSelectedModel] = useState(localStorage.getItem('lastModel') || 'MiniMax-M2.7')
  const [systemPrompts, setSystemPrompts] = useState([])
  const [showPersonaModal, setShowPersonaModal] = useState(false)
  const [activePersona, setActivePersona] = useState(null)
  const [previousPersonaId, setPreviousPersonaId] = useState(null)
  const [isConnected, setIsConnected] = useState(true)
  const [messageQueue, setMessageQueue] = useState([])
  const [streamInterrupted, setStreamInterrupted] = useState(false)
  const [lastStreamError, setLastStreamError] = useState(null)
  const [toolsEnabled, setToolsEnabled] = useState(true)
  const [currentToolCalls, setCurrentToolCalls] = useState([])
  const [thinkingTool, setThinkingTool] = useState(null)
  const [thinkingInput, setThinkingInput] = useState(null)
  const [agents, setAgents] = useState([])
  const [showAgentPanel, setShowAgentPanel] = useState(false)
  const [templates, setTemplates] = useState([])
  const [showTemplateModal, setShowTemplateModal] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [showSettings, setShowSettings] = useState(false)
  const [showShortcutsModal, setShowShortcutsModal] = useState(false)
  const [showExportModal, setShowExportModal] = useState(false)
  const [showStatsDashboard, setShowStatsDashboard] = useState(false)
  const [showFolderPanel, setShowFolderPanel] = useState(false)
  const [showSystemPromptEditor, setShowSystemPromptEditor] = useState(false)
  const [editingMessage, setEditingMessage] = useState(null)
  const [folders, setFolders] = useState([])
  const messagesEndRef = useRef(null)
  const messagesScrollRef = useRef(null)
  const inputRef = useRef(null)
  const healthCheckIntervalRef = useRef(null)
  const [speakQueue, setSpeakQueue] = useState([])
  const [showScrollButton, setShowScrollButton] = useState(false)
  const [newMessageCount, setNewMessageCount] = useState(0)

  useEffect(() => {
    const saved = sessionStorage.getItem('messageQueue')
    if (saved) setMessageQueue(JSON.parse(saved))
  }, [])

  useEffect(() => { sessionStorage.setItem('messageQueue', JSON.stringify(messageQueue)) }, [messageQueue])

  useEffect(() => {
    if (user) {
      fetchConversations()
      fetchModels()
      fetchSystemPrompts()
      fetchAgents()
      fetchTemplates()
      startHealthCheck()
    }
    return () => { if (healthCheckIntervalRef.current) clearInterval(healthCheckIntervalRef.current) }
  }, [user])

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }) }, [messages, streamingContent])

  useEffect(() => {
    const scrollEl = messagesScrollRef.current
    if (!scrollEl) return
    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = scrollEl
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100
      setShowScrollButton(!isNearBottom)
      if (isNearBottom) setNewMessageCount(0)
    }
    scrollEl.addEventListener('scroll', handleScroll, { passive: true })
    return () => scrollEl.removeEventListener('scroll', handleScroll)
  }, [])

  // Track new messages when not at bottom
  useEffect(() => {
    if (messages.length === 0) return
    const scrollEl = messagesScrollRef.current
    if (!scrollEl) return
    const { scrollTop, scrollHeight, clientHeight } = scrollEl
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100
    if (!isNearBottom && !isStreaming) setNewMessageCount(c => c + 1)
  }, [messages.length])


  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); setIsSearching(false); return }
    setIsSearching(true)
    const timeoutId = setTimeout(async () => {
      try {
        const data = await apiClient(`/conversations/search?q=${encodeURIComponent(searchQuery)}`)
        setSearchResults(data)
      } catch (err) { console.error('Search error:', err) }
      finally { setIsSearching(false) }
    }, 300)
    return () => clearTimeout(timeoutId)
  }, [searchQuery])

  const startHealthCheck = () => {
    healthCheckIntervalRef.current = setInterval(async () => {
      try {
        const res = await fetch('/api/health')
        if (res.ok) setIsConnected(true)
        else setIsConnected(false)
      } catch { setIsConnected(false) }
    }, 30000)
  }

  const fetchModels = async () => {
    try { const data = await apiClient('/models'); setModels(data) }
    catch { setModels([{ id: 'MiniMax-M2.7', name: 'M2.7', description: 'Default model' }]) }
  }

  const fetchSystemPrompts = async () => {
    try {
      const data = await apiClient('/system-prompts')
      setSystemPrompts(data)
      const defaultPrompt = data.find(p => p.isDefault) || data[0]
      if (defaultPrompt) setActivePersona(defaultPrompt)
    } catch (err) { console.error('Failed to fetch system prompts:', err) }
  }

  const fetchAgents = async () => {
    try { const data = await apiClient('/agents'); setAgents(data) }
    catch { setAgents([]) }
  }

  const fetchTemplates = async () => {
    try { const data = await apiClient('/templates'); setTemplates(data) }
    catch { setTemplates([]) }
  }

  
  const createConversation = async (model = selectedModel, systemPromptId = activePersona?._id || null) => {
    try {
      const conv = await apiClient('/conversations', {
        method: 'POST',
        body: JSON.stringify({ model, systemPromptId, toolsEnabled })
      })
      setConversations(prev => [conv, ...prev])
      setCurrentConversation(conv)
      setMessages([])
      setMobileMenuOpen(false)
      localStorage.setItem('lastModel', model)
      setToolsEnabled(conv.toolsEnabled !== false)
      inputRef.current?.focus()
    } catch (err) {
      console.error('Create conversation error:', err)
      addToast(err.message || 'Failed to create conversation', 'error', err.requestId)
    }
  }

  const handleModelSelect = async (modelId) => {
    if (!currentConversation?.conversationId) { setSelectedModel(modelId); localStorage.setItem('lastModel', modelId); return }
    try {
      const updatedConv = await apiClient(`/conversations/${currentConversation.conversationId}/model`, {
        method: 'PATCH', body: JSON.stringify({ model: modelId })
      })
      setCurrentConversation(updatedConv)
      setConversations(prev => prev.map(c => c.conversationId === currentConversation.conversationId ? { ...c, model: modelId } : c))
      addToast(`Switched to ${models.find(m => m.id === modelId)?.name || modelId}`, 'success')
    } catch (err) { addToast('Failed to switch model', 'error', err.requestId) }
  }

  const handleToolsToggle = async () => {
    const newValue = !toolsEnabled
    setToolsEnabled(newValue)
    if (currentConversation?.conversationId) {
      try {
        await apiClient(`/conversations/${currentConversation.conversationId}/tools-toggle`, {
          method: 'PATCH', body: JSON.stringify({ toolsEnabled: newValue })
        })
      } catch (err) { /* silent */ }
    }
  }

  const handlePersonaSelect = async (promptId) => {
    if (!currentConversation?.conversationId) {
      const prompt = systemPrompts.find(p => p._id === promptId)
      setActivePersona(prompt || null)
      setShowPersonaModal(false)
      return
    }
    setPreviousPersonaId(currentConversation.systemPromptId)
    try {
      const updatedConv = await apiClient(`/conversations/${currentConversation.conversationId}/system-prompt`, {
        method: 'PATCH', body: JSON.stringify({ systemPromptId: promptId })
      })
      setCurrentConversation(updatedConv)
      const prompt = systemPrompts.find(p => p._id === promptId)
      setActivePersona(prompt || null)
      setShowPersonaModal(false)
      addToast(`Switched to ${prompt?.name || 'Default'} persona`, 'success')
    } catch (err) { addToast('Failed to switch persona', 'error', err.requestId) }
  }

  const handleCreateSystemPrompt = async ({ name, content, icon }) => {
    try {
      const newPrompt = await apiClient('/system-prompts', { method: 'POST', body: JSON.stringify({ name, content, icon }) })
      setSystemPrompts(prev => [...prev, newPrompt])
      addToast('Persona created', 'success')
      return newPrompt
    } catch (err) { addToast('Failed to create persona', 'error', err.requestId) }
  }

  const handleUpdateSystemPrompt = async (id, { name, content, icon }) => {
    try {
      const updatedPrompt = await apiClient(`/system-prompts/${id}`, { method: 'PATCH', body: JSON.stringify({ name, content, icon }) })
      setSystemPrompts(prev => prev.map(p => p._id === id ? updatedPrompt : p))
      if (activePersona?._id === id) setActivePersona(updatedPrompt)
      addToast('Persona updated', 'success')
    } catch (err) { addToast('Failed to update persona', 'error', err.requestId) }
  }

  const handleDeleteSystemPrompt = async (id) => {
    try {
      await apiClient(`/system-prompts/${id}`, { method: 'DELETE' })
      setSystemPrompts(prev => prev.filter(p => p._id !== id))
      if (activePersona?._id === id) setActivePersona(systemPrompts.find(p => p.isDefault) || null)
      addToast('Persona deleted', 'success')
    } catch (err) { addToast('Failed to delete persona', 'error', err.requestId) }
  }

  const selectConversation = (conv) => {
    if (!conv?.conversationId) return
    if (conv.messages) {
      setCurrentConversation(conv)
      setMessages(conv.messages.map(m => ({ role: m.role, content: m.content })))
      if (conv.model) { setSelectedModel(conv.model); localStorage.setItem('lastModel', conv.model) }
      if (conv.systemPromptId) { const prompt = systemPrompts.find(p => p._id === conv.systemPromptId); setActivePersona(prompt || null) }
      if (conv.toolsEnabled !== undefined) setToolsEnabled(conv.toolsEnabled)
    } else {
      apiClient(`/conversations/${conv.conversationId}`).then(fullConv => {
        setCurrentConversation(fullConv)
        setMessages(fullConv.messages.map(m => ({ role: m.role, content: m.content })))
        if (fullConv.model) { setSelectedModel(fullConv.model); localStorage.setItem('lastModel', fullConv.model) }
        if (fullConv.systemPromptId) { const prompt = systemPrompts.find(p => p._id === fullConv.systemPromptId); setActivePersona(prompt || null) }
        if (fullConv.toolsEnabled !== undefined) setToolsEnabled(fullConv.toolsEnabled)
      })
    }
    setMobileMenuOpen(false)
  }

  const deleteConversation = async (conv) => {
    if (!conv?.conversationId) return
    const prev = conversations
    setConversations(prev => prev.filter(c => c.conversationId !== conv.conversationId))
    if (currentConversation?.conversationId === conv.conversationId) { setCurrentConversation(null); setMessages([]) }
    try { await apiClient(`/conversations/${conv.conversationId}`, { method: 'DELETE' }) }
    catch (err) { setConversations(prev); addToast('Failed to delete conversation', 'error', err.requestId) }
  }

  const renameConversation = async (conversationId, newTitle) => {
    try {
      await apiClient(`/conversations/${conversationId}/title`, { method: 'PATCH', body: JSON.stringify({ title: newTitle }) })
      setConversations(prev => prev.map(c => c.conversationId === conversationId ? { ...c, title: newTitle } : c))
      if (currentConversation?.conversationId === conversationId) {
        setCurrentConversation(prev => prev ? { ...prev, title: newTitle } : prev)
      }
    } catch (err) { addToast('Failed to rename conversation', 'error', err.requestId) }
  }

  const generateTitle = async (userMessage) => {
    if (!currentConversation?.conversationId) return
    try {
      const data = await apiClient(`/conversations/${currentConversation.conversationId}/title`, {
        method: 'POST', body: JSON.stringify({ firstMessage: userMessage })
      })
      const title = data.title || 'New Conversation'
      setConversations(prev => prev.map(c => c.conversationId === currentConversation.conversationId ? { ...c, title } : c))
      setCurrentConversation(prev => prev ? { ...prev, title } : prev)
    } catch (err) { /* silent fail */ }
  }

  const sendMessage = async (initialInput = input, fromQueue = false) => {
    const userContent = initialInput.trim()
    if (!userContent || isLoading) return

    if (!currentConversation?.conversationId) await createConversation()
    if (!currentConversation?.conversationId) return // safety check

    setInput('')
    setIsLoading(true)
    setIsStreaming(false)
    setStreamingContent('')
    setStreamInterrupted(false)
    setLastStreamError(null)
    setCurrentToolCalls([])
    setThinkingTool(null)
    setThinkingInput(null)

    if (!fromQueue) setMessages(prev => [...prev, { role: 'user', content: userContent }])
    else setMessageQueue(prev => prev.filter(m => m !== userContent))

    try {
      const response = await fetch(`/api/conversations/${currentConversation.conversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: userContent }),
        credentials: 'include'
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to send')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let fullContent = ''

      setIsStreaming(true)

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              if (data.error) {
                setLastStreamError(data.message || 'Stream error')
                setIsStreaming(false)
                reader.cancel()
                break
              }
              if (data.type === 'tool_call') {
                setCurrentToolCalls(prev => [...prev, { tool: data.tool, input: data.input }])
                setThinkingTool(data.tool)
                setThinkingInput(data.input)
              } else if (data.type === 'tool_result') {
                setThinkingTool(null)
                setThinkingInput(null)
                setCurrentToolCalls(prev => prev.map(tc => tc.tool === data.tool ? { ...tc, result: data.result } : tc))
              } else if (data.text) {
                fullContent += data.text
                setStreamingContent(fullContent)
              }
              if (data.done) {
                setIsStreaming(false)
                if (data.title) {
                  console.log('Title update from SSE:', data.title)
                  setConversations(prev => prev.map(c => c.conversationId === currentConversation?.conversationId ? { ...c, title: data.title } : c))
                  setCurrentConversation(prev => prev ? { ...prev, title: data.title } : prev)
                }
                // Force refresh conversations list after a short delay to get fresh data from server
                setTimeout(() => {
                  fetchConversations()
                }, 1000)
              }
              if (data.type === 'title_update' && data.title) {
                console.log('Title update SSE event:', data.title)
                setConversations(prev => prev.map(c => c.conversationId === currentConversation?.conversationId ? { ...c, title: data.title } : c))
                setCurrentConversation(prev => prev ? { ...prev, title: data.title } : prev)
              }
            } catch (e) { /* skip invalid JSON */ }
          }
        }
      }

      if (fullContent) setMessages(prev => [...prev, { role: 'assistant', content: fullContent, toolCalls: [...currentToolCalls] }])
      else if (currentToolCalls.length > 0 && fullContent) setMessages(prev => [...prev, { role: 'assistant', content: fullContent, toolCalls: [...currentToolCalls] }])

    } catch (err) {
      addToast(err.message || 'Failed to get AI response.', 'error')
      if (!messageQueue.includes(userContent)) setMessageQueue(prev => [...prev, userContent])
      setIsStreaming(false)
    }

    setIsLoading(false)
    inputRef.current?.focus()
  }

  const retryQueuedMessage = (content) => sendMessage(content, true)
  const removeFromQueue = (content) => setMessageQueue(prev => prev.filter(m => m !== content))

  const continueInterruptedStream = () => {
    if (streamingContent) setMessages(prev => [...prev, { role: 'assistant', content: streamingContent }])
    setStreamInterrupted(false); setLastStreamError(null); setStreamingContent('')
    sendMessage('Please continue your previous response from where you left off.')
  }

  const regenerateLastResponse = async () => {
    const lastUserIndex = messages.findLastIndex(m => m.role === 'user')
    if (lastUserIndex !== -1) {
      setMessages(prev => prev.slice(0, lastUserIndex + 1))
      const lastUserMsg = messages[lastUserIndex].content
      setTimeout(() => sendMessage(lastUserMsg), 0)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
    // Slash command for templates
    if (e.key === '/' && input.trim() === '') {
      e.preventDefault()
      setShowTemplateModal(true)
    }
  }
  const handlePromptSelect = (prompt) => {
    sendMessage(prompt)
  }
  const handleContinue = () => {
    if (streamingContent) setMessages(prev => [...prev, { role: 'assistant', content: streamingContent }])
    setStreamInterrupted(false); setStreamingContent('')
    sendMessage('Please continue your previous response from where you left off.')
  }

  // Export conversation handler
  const handleExportConversation = async (format) => {
    if (!currentConversation?.conversationId) return
    const response = await fetch(`/api/export/${currentConversation.conversationId}?format=${format}`, {
      credentials: 'include'
    })
    if (!response.ok) throw new Error('Export failed')

    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${currentConversation.title || 'conversation'}.${format === 'markdown' ? 'md' : format === 'plain' ? 'txt' : 'html'}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    addToast('Conversation exported', 'success')
  }

  // Folder handlers
  const handleCreateFolder = async (name) => {
    try {
      const newFolder = await apiClient('/folders', {
        method: 'POST',
        body: JSON.stringify({ name })
      })
      setFolders(prev => [...prev, newFolder])
      addToast('Folder created', 'success')
      return newFolder
    } catch (err) {
      addToast('Failed to create folder', 'error')
    }
  }

  const handleDeleteFolder = async (folderId) => {
    try {
      await apiClient(`/folders/${folderId}`, { method: 'DELETE' })
      setFolders(prev => prev.filter(f => f._id !== folderId))
      addToast('Folder deleted', 'success')
    } catch (err) {
      addToast('Failed to delete folder', 'error')
    }
  }

  const handleSelectFolder = (folder) => {
    // Filter conversations by folder
    fetchConversations(folder._id)
  }

  const fetchConversations = async (folderId = null) => {
    try {
      const endpoint = folderId ? `/conversations?folderId=${folderId}` : '/conversations'
      const data = await apiClient(endpoint)
      setConversations(data)
    } catch (err) { addToast('Failed to load conversations') }
    finally { setIsLoadingChats(false) }
  }

  // Message editing handlers
  const handleSaveEditedMessage = async (newContent) => {
    if (!editingMessage) return
    if (!currentConversation?.conversationId) return
    const messageIndex = messages.findIndex(m => m === editingMessage)
    if (messageIndex === -1) return

    try {
      await apiClient(`/conversations/${currentConversation.conversationId}/messages/${messageIndex}`, {
        method: 'PATCH',
        body: JSON.stringify({ content: newContent })
      })
      // Update local state - remove messages after edited one
      setMessages(prev => prev.slice(0, messageIndex + 1))
      setEditingMessage(null)
      // Regenerate AI response
      setTimeout(() => sendMessage(newContent, true), 100)
    } catch (err) {
      addToast('Failed to edit message', 'error')
    }
  }

  const handleUseTemplate = async (filledTemplate, tpl, variableValues) => {
    if (!tpl) {
      // No variables, use directly
      setInput(prev => prev + (prev ? '\n\n' : '') + filledTemplate)
    } else {
      // Fill variables
      try {
        const result = await apiClient(`/templates/${tpl._id}/use`, {
          method: 'POST',
          body: JSON.stringify({ variables: variableValues })
        })
        setInput(prev => prev + (prev ? '\n\n' : '') + result.filledTemplate)
      } catch (err) {
        addToast('Failed to fill template', 'error')
      }
    }
    setShowTemplateModal(false)
  }

  const handleCreateTemplate = async ({ name, description, template, variables }) => {
    try {
      const newTpl = await apiClient('/templates', {
        method: 'POST',
        body: JSON.stringify({ name, description, template, variables, category: 'General', isPublic: false })
      })
      setTemplates(prev => [...prev, newTpl])
      addToast('Template created', 'success')
    } catch (err) {
      addToast('Failed to create template', 'error')
    }
  }

  // Keyboard shortcuts (all functions must be defined before this)
  useKeyboardShortcuts({
    onNewConversation: createConversation,
    onSearch: () => document.querySelector('input[placeholder*="Search"]')?.focus(),
    onPrevConversation: () => { /* TODO: navigate to prev conversation */ },
    onNextConversation: () => { /* TODO: navigate to next conversation */ },
    onClosePanel: () => { setShowSettings(false); setShowAgentPanel(false); setShowTemplateModal(false); setShowPersonaModal(false) },
    onFocusInput: () => inputRef.current?.focus(),
    onSendMessage: sendMessage,
    onToggleSidebar: () => setMobileMenuOpen(prev => !prev),
    onNewFolder: () => { /* TODO: new folder */ },
    onOpenSettings: () => setShowSettings(true),
    onOpenMemory: () => { /* TODO: memory panel */ },
    onOpenShortcutsHelp: () => setShowShortcutsModal(true),
    onRegenerate: regenerateLastResponse,
    onCopyLastMessage: () => { /* handled by keyboard handler directly */ },
    onEditLastMessage: () => { /* handled by keyboard handler directly */ },
    onUndoLastSent: () => { /* handled by keyboard handler directly */ },
    inputRef
  })

  if (!user) return <AuthScreen onLogin={login} onRegister={register} onGuest={loginAsGuest} />

  return (
    <div className="flex h-screen bg-gray-900 text-gray-100">
      <Suspense fallback={<ComponentLoader />}>
        <AgentPanel isOpen={showAgentPanel} onClose={() => setShowAgentPanel(false)} agents={agents} onRunAgent={() => {}} onCreateAgent={() => {}} onDeleteAgent={() => {}} />
        <TemplateModal isOpen={showTemplateModal} onClose={() => setShowTemplateModal(false)} templates={templates}
          onUseTemplate={handleUseTemplate} onCreateTemplate={handleCreateTemplate} onDeleteTemplate={() => {}} />
        <PersonaModal isOpen={showPersonaModal} onClose={() => setShowPersonaModal(false)} prompts={systemPrompts}
          onSelect={handlePersonaSelect} onCreate={handleCreateSystemPrompt} onUpdate={handleUpdateSystemPrompt} onDelete={handleDeleteSystemPrompt} />
        <SettingsPanel isOpen={showSettings} onClose={() => setShowSettings(false)} />
        <KeyboardShortcutsModal isOpen={showShortcutsModal} onClose={() => setShowShortcutsModal(false)} />
        <ExportModal isOpen={showExportModal} onClose={() => setShowExportModal(false)} conversation={currentConversation} onExport={handleExportConversation} />
        <StatsDashboard isOpen={showStatsDashboard} onClose={() => setShowStatsDashboard(false)} user={user} />
        <FolderPanel isOpen={showFolderPanel} onClose={() => setShowFolderPanel(false)} folders={folders} onFolderCreate={handleCreateFolder} onFolderDelete={handleDeleteFolder} onFolderSelect={handleSelectFolder} />
        <SystemPromptEditor isOpen={showSystemPromptEditor} onClose={() => setShowSystemPromptEditor(false)} existingPrompts={systemPrompts} onSave={handleCreateSystemPrompt} onDelete={handleDeleteSystemPrompt} />
        {editingMessage && <MessageEditor message={editingMessage} onSave={handleSaveEditedMessage} onCancel={() => setEditingMessage(null)} />}
      </Suspense>

      <MobileSidebarOverlay isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)}>
        <SidebarContent conversations={conversations} searchQuery={searchQuery} setSearchQuery={setSearchQuery} searchResults={searchResults}
          isSearching={isSearching} currentConversation={currentConversation} onSelectConversation={selectConversation} onDeleteConversation={deleteConversation}
          onCreateConversation={() => createConversation()} onRenameConversation={renameConversation} isLoadingChats={isLoadingChats} user={user} onLogout={logout} isConnected={isConnected} onOpenAgents={() => setShowAgentPanel(true)} />
      </MobileSidebarOverlay>

      <aside className="hidden md:flex w-72 bg-gray-850 border-r border-gray-800 flex-col">
        <SidebarContent conversations={conversations} searchQuery={searchQuery} setSearchQuery={setSearchQuery} searchResults={searchResults}
          isSearching={isSearching} currentConversation={currentConversation} onSelectConversation={selectConversation} onDeleteConversation={deleteConversation}
          onCreateConversation={() => createConversation()} onRenameConversation={renameConversation} isLoadingChats={isLoadingChats} user={user} onLogout={logout} isConnected={isConnected} onOpenAgents={() => setShowAgentPanel(true)} />
      </aside>

      <main className="relative flex-1 flex flex-col">
        {user?.isGuest && (
          <div className="bg-yellow-500/10 border-b border-yellow-500/30 px-4 py-2 flex items-center gap-2">
            <svg className="w-4 h-4 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <span className="text-sm text-yellow-200">You're using a guest account. Sign up to save your chats permanently.</span>
          </div>
        )}

        <Header
          currentConversation={currentConversation}
          activePersona={activePersona}
          currentModel={currentConversation?.model || selectedModel}
          models={models}
          onModelSelect={handleModelSelect}
          toolsEnabled={toolsEnabled}
          onToolsToggle={handleToolsToggle}
          onOpenPersona={() => setShowPersonaModal(true)}
        />

        <div ref={messagesScrollRef} className="flex-1 overflow-y-auto">
          {!currentConversation && messages.length === 0 && !isLoading ? (
            <WelcomeScreen onSelectPrompt={handlePromptSelect} models={models} onModelSelect={setSelectedModel} selectedModel={selectedModel}
              onOpenPersona={() => setShowPersonaModal(true)} activePersona={activePersona} />
          ) : isLoadingChats ? (
            <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">{[...Array(3)].map((_, i) => <MessageSkeleton key={i} />)}</div>
          ) : messages.length === 0 && !isLoading && !isStreaming ? (
            <WelcomeScreen onSelectPrompt={handlePromptSelect} models={models} onModelSelect={setSelectedModel} selectedModel={selectedModel}
              onOpenPersona={() => setShowPersonaModal(true)} activePersona={activePersona} />
          ) : (
            <div className="max-w-3xl mx-auto px-4 py-6">
              {previousPersonaId && messages.length === 1 && (
                <div className="flex items-center gap-3 mb-6 text-sm text-gray-500">
                  <div className="flex-1 h-px bg-gray-700" /><span>Persona changed</span><div className="flex-1 h-px bg-gray-700" />
                </div>
              )}

              {messageQueue.length > 0 && (
                <div className="mb-4 space-y-2">
                  {messageQueue.map((content, i) => (
                    <QueuedMessage key={i} content={content} onRetry={() => retryQueuedMessage(content)} onRemove={() => removeFromQueue(content)} />
                  ))}
                </div>
              )}

              {messages.map((msg, i) => (
                <MessageBubble key={i} message={msg} onCopy={() => addToast('Copied to clipboard', 'success')} onRegenerate={regenerateLastResponse}
                  isLast={i === messages.length - 1 && msg.role === 'assistant' && !isStreaming}
                  onContinue={streamInterrupted && i === messages.length ? handleContinue : null}
                  toolCalls={msg.toolCalls} />
              ))}

              {isStreaming && streamingContent && (
                <MessageBubble message={{ role: 'assistant', content: streamingContent }} isStreaming />
              )}

              {streamInterrupted && lastStreamError && (
                <div className="flex items-center gap-3 mb-4 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
                  <svg className="w-5 h-5 text-yellow-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                  <span className="text-sm text-yellow-200 flex-1">Response interrupted. Continue?</span>
                  <button onClick={handleContinue} className="px-3 py-1.5 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-300 text-sm font-medium rounded-lg transition-colors">Continue</button>
                </div>
              )}

              {isLoading && <TypingIndicator />}
              <div ref={messagesEndRef} />

              <AnimatePresence>
                {showScrollButton && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.8, y: 10 }}
                    transition={{ duration: 0.2 }}
                    className="absolute bottom-24 right-6 z-10">
                    <div className="flex flex-col items-end gap-2">
                      {newMessageCount > 0 && !isStreaming && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="bg-blue-600 text-white text-xs font-medium px-3 py-1.5 rounded-full shadow-lg">
                          {newMessageCount} new {newMessageCount === 1 ? 'message' : 'messages'}
                        </motion.div>
                      )}
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => { messagesScrollRef.current?.scrollTo({ top: messagesScrollRef.current.scrollHeight, behavior: 'smooth' }); setShowScrollButton(false); setNewMessageCount(0) }}
                        className="p-3 bg-gray-800 hover:bg-gray-700 rounded-full shadow-lg border border-gray-700 text-gray-300">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
                      </motion.button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-800">
          <InputBar
            input={input}
            setInput={setInput}
            onKeyDown={handleKeyDown}
            onSend={() => sendMessage()}
            disabled={isLoadingChats}
            showTemplateModal={showTemplateModal}
            setShowTemplateModal={setShowTemplateModal}
            maxLength={32000}
          />
        </div>
      </main>

      <style>{`
        @keyframes slide-in { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        .animate-slide-in { animation: slide-in 0.3s ease-out; }
        @keyframes slide-in-right { from { transform: translateX(-100%); } to { transform: translateX(0); } }
        .animate-slide-in-right { animation: slide-in-right 0.3s ease-out; }
        mark { background-color: #fef08a; color: #1f2937; padding: 0 2px; border-radius: 2px; }
        .line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
      `}</style>
    </div>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ToastProvider>
          <AppContent />
        </ToastProvider>
      </AuthProvider>
    </ErrorBoundary>
  )
}