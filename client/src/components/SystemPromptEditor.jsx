import { motion, AnimatePresence } from 'framer-motion'
import { useState, useRef, useEffect } from 'react'

export function SystemPromptEditor({ isOpen, onClose, existingPrompts = [], onSave, onDelete }) {
  const [prompts, setPrompts] = useState(existingPrompts)
  const [editingPrompt, setEditingPrompt] = useState(null)
  const [newPrompt, setNewPrompt] = useState({ name: '', content: '', icon: '🤖' })
  const [isCreating, setIsCreating] = useState(false)
  const textareaRef = useRef(null)

  useEffect(() => {
    setPrompts(existingPrompts)
  }, [existingPrompts, isOpen])

  useEffect(() => {
    if (editingPrompt && textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [editingPrompt])

  const handleCreatePrompt = async () => {
    if (!newPrompt.name.trim() || !newPrompt.content.trim()) return
    setIsCreating(true)
    try {
      const created = await onSave(newPrompt)
      setPrompts(prev => [...prev, created])
      setNewPrompt({ name: '', content: '', icon: '🤖' })
      setIsCreating(false)
    } catch (err) {
      setIsCreating(false)
    }
  }

  const handleUpdatePrompt = async () => {
    if (!editingPrompt) return
    try {
      await onSave(editingPrompt)
      setPrompts(prev => prev.map(p => p._id === editingPrompt._id ? editingPrompt : p))
      setEditingPrompt(null)
    } catch (err) {
      // Error handling
    }
  }

  const handleDeletePrompt = async (promptId) => {
    try {
      await onDelete(promptId)
      setPrompts(prev => prev.filter(p => p._id !== promptId))
    } catch (err) {
      // Error handling
    }
  }

  const handleExportPrompts = () => {
    const data = JSON.stringify(prompts, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'personas.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImportPrompts = (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const imported = JSON.parse(e.target.result)
        for (const prompt of imported) {
          if (prompt.name && prompt.content) {
            await onSave(prompt)
            setPrompts(prev => {
              const exists = prev.find(p => p.name === prompt.name)
              if (exists) return prev
              return [...prev, { ...prompt, _id: Date.now().toString() }]
            })
          }
        }
      } catch (err) {
        console.error('Failed to import prompts:', err)
      }
    }
    reader.readAsText(file)
  }

  if (!isOpen) return null

  const icons = ['🤖', '💻', '✍️', '🔍', '🎨', '📊', '💡', '🔧', '📚', '🎯']

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          className="bg-gray-850 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-3xl mx-4 overflow-hidden max-h-[85vh] flex flex-col"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-100">System Prompt Editor</h2>
                <p className="text-sm text-gray-400">Create and manage personas</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportPrompts}
                className="p-2 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-gray-200 transition-colors"
                title="Export personas"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
              </button>
              <label className="p-2 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-gray-200 transition-colors cursor-pointer" title="Import personas">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <input type="file" accept=".json" onChange={handleImportPrompts} className="hidden" />
              </label>
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-gray-200 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {/* Create new prompt */}
            {!editingPrompt && (
              <div className="mb-8 p-4 bg-gray-800/50 rounded-xl border border-gray-700">
                <h3 className="text-sm font-semibold text-gray-300 mb-4">Create New Persona</h3>
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <div className="flex flex-col items-center gap-2">
                      <span className="text-3xl">{newPrompt.icon}</span>
                      <div className="flex flex-wrap gap-1">
                        {icons.map(icon => (
                          <button
                            key={icon}
                            onClick={() => setNewPrompt(p => ({ ...p, icon }))}
                            className={`p-1 rounded hover:bg-gray-700 ${newPrompt.icon === icon ? 'bg-gray-700 ring-1 ring-blue-500' : ''}`}
                          >
                            {icon}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="flex-1 space-y-4">
                      <input
                        type="text"
                        value={newPrompt.name}
                        onChange={(e) => setNewPrompt(p => ({ ...p, name: e.target.value }))}
                        placeholder="Persona name (e.g., Code Assistant)"
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-blue-500"
                      />
                      <textarea
                        value={newPrompt.content}
                        onChange={(e) => setNewPrompt(p => ({ ...p, content: e.target.value }))}
                        placeholder="You are a helpful coding assistant. You excel at explaining complex programming concepts clearly..."
                        rows={4}
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
                      />
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleCreatePrompt}
                        disabled={!newPrompt.name.trim() || !newPrompt.content.trim() || isCreating}
                        className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm font-medium rounded-lg hover:from-blue-500 hover:to-purple-500 transition-all disabled:opacity-50"
                      >
                        Create Persona
                      </motion.button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Edit existing prompt */}
            {editingPrompt && (
              <div className="mb-8 p-4 bg-gray-800/50 rounded-xl border border-blue-500/50">
                <h3 className="text-sm font-semibold text-gray-300 mb-4">Editing: {editingPrompt.name}</h3>
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <div className="flex flex-col items-center gap-2">
                      <span className="text-3xl">{editingPrompt.icon}</span>
                      <div className="flex flex-wrap gap-1">
                        {icons.map(icon => (
                          <button
                            key={icon}
                            onClick={() => setEditingPrompt(p => ({ ...p, icon }))}
                            className={`p-1 rounded hover:bg-gray-700 ${editingPrompt.icon === icon ? 'bg-gray-700 ring-1 ring-blue-500' : ''}`}
                          >
                            {icon}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="flex-1 space-y-4">
                      <input
                        type="text"
                        value={editingPrompt.name}
                        onChange={(e) => setEditingPrompt(p => ({ ...p, name: e.target.value }))}
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-blue-500"
                      />
                      <textarea
                        ref={textareaRef}
                        value={editingPrompt.content}
                        onChange={(e) => setEditingPrompt(p => ({ ...p, content: e.target.value }))}
                        rows={4}
                        className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-blue-500 resize-none"
                      />
                      <div className="flex gap-2">
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={handleUpdatePrompt}
                          className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white text-sm font-medium rounded-lg hover:from-blue-500 hover:to-purple-500 transition-all"
                        >
                          Save Changes
                        </motion.button>
                        <button
                          onClick={() => setEditingPrompt(null)}
                          className="px-4 py-2 bg-gray-700 text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-600 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Existing prompts */}
            <div>
              <h3 className="text-sm font-semibold text-gray-300 mb-4">Existing Personas ({prompts.length})</h3>
              <div className="space-y-3">
                {prompts.map(prompt => (
                  <div
                    key={prompt._id}
                    className="p-4 bg-gray-800/50 rounded-xl border border-gray-700 hover:border-gray-600 transition-colors group"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <span className="text-2xl">{prompt.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-gray-200">{prompt.name}</h4>
                            {prompt.isDefault && (
                              <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded-full">Default</span>
                            )}
                          </div>
                          <p className="text-sm text-gray-400 mt-1 line-clamp-2">{prompt.content}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => setEditingPrompt({ ...prompt })}
                          className="p-1.5 rounded-md hover:bg-gray-700 text-gray-400 hover:text-gray-200"
                          title="Edit"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                        {!prompt.isDefault && (
                          <button
                            onClick={() => handleDeletePrompt(prompt._id)}
                            className="p-1.5 rounded-md hover:bg-red-500/20 text-gray-400 hover:text-red-400"
                            title="Delete"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {prompts.length === 0 && !editingPrompt && (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-800 flex items-center justify-center">
                      <span className="text-3xl">🤖</span>
                    </div>
                    <p className="text-gray-500">No personas yet</p>
                    <p className="text-xs text-gray-600 mt-1">Create your first persona above</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}