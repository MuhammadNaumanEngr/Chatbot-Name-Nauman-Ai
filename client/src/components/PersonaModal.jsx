import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'

export function PersonaModal({ isOpen, onClose, prompts, onSelect, onCreate, onUpdate, onDelete }) {
  const [mode, setMode] = useState('select')
  const [editingPrompt, setEditingPrompt] = useState(null)
  const [formName, setFormName] = useState('')
  const [formContent, setFormContent] = useState('')
  const [formIcon, setFormIcon] = useState('💬')
  const modalRef = useRef(null)

  useEffect(() => {
    if (!isOpen) { setMode('select'); setEditingPrompt(null); setFormName(''); setFormContent(''); setFormIcon('💬') }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e) => { if (e.key === 'Escape') onClose() }
    const handleClickOutside = (e) => { if (modalRef.current && !modalRef.current.contains(e.target)) onClose() }
    document.addEventListener('keydown', handleKeyDown)
    setTimeout(() => document.addEventListener('mousedown', handleClickOutside), 0)
    return () => { document.removeEventListener('keydown', handleKeyDown); document.removeEventListener('mousedown', handleClickOutside) }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const handleCreate = async () => {
    if (!formName.trim() || !formContent.trim()) return
    await onCreate({ name: formName.trim(), content: formContent.trim(), icon: formIcon })
    setMode('select'); setFormName(''); setFormContent(''); setFormIcon('💬')
  }

  const handleUpdate = async () => {
    if (!editingPrompt || !formName.trim() || !formContent.trim()) return
    await onUpdate(editingPrompt._id, { name: formName.trim(), content: formContent.trim(), icon: formIcon })
    setMode('manage'); setEditingPrompt(null)
  }

  const handleEdit = (prompt) => {
    setEditingPrompt(prompt); setFormName(prompt.name); setFormContent(prompt.content); setFormIcon(prompt.icon || '💬'); setMode('edit')
  }

  const handleDelete = async (promptId) => {
    if (confirm('Delete this persona?')) await onDelete(promptId)
  }

  const ICONS = ['💬', '🤖', '💻', '✍️', '🔍', '🧠', '📚', '🌟', '🎯', '💡', '🔮', '⚡']

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div ref={modalRef} className="bg-gray-850 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-gray-100">
            {mode === 'select' && 'Select Persona'}
            {mode === 'manage' && 'Manage Personas'}
            {mode === 'create' && 'Create Persona'}
            {mode === 'edit' && 'Edit Persona'}
          </h2>
          <button onClick={mode === 'select' ? onClose : () => setMode('select')} className="p-1 rounded-lg hover:bg-gray-700 text-gray-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="p-6 max-h-96 overflow-y-auto">
          {mode === 'select' && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                {prompts.map(prompt => (
                  <button key={prompt._id} onClick={() => { onSelect(prompt._id); onClose() }}
                    className="flex items-start gap-3 p-4 bg-gray-800 hover:bg-gray-750 rounded-xl text-left transition-colors border border-gray-700 hover:border-gray-600">
                    <span className="text-2xl">{prompt.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-100">{prompt.name}</p>
                      <p className="text-xs text-gray-400 mt-1 line-clamp-2">{prompt.content}</p>
                    </div>
                  </button>
                ))}
              </div>
              <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-xl border border-dashed border-gray-600">
                <div className="flex items-center gap-3"><span className="text-2xl">✨</span><span className="text-sm text-gray-300">Create custom persona</span></div>
                <button onClick={() => setMode('create')} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors">Create</button>
              </div>
              <button onClick={() => setMode('manage')} className="w-full mt-4 py-2 text-sm text-gray-400 hover:text-gray-200 transition-colors">Manage Personas →</button>
            </>
          )}
          {mode === 'manage' && (
            <>
              <div className="space-y-2 mb-4">
                {prompts.map(prompt => (
                  <div key={prompt._id} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg border border-gray-700">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{prompt.icon}</span>
                      <div><p className="text-sm font-medium text-gray-100">{prompt.name}</p><p className="text-xs text-gray-500 truncate max-w-xs">{prompt.content}</p></div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleEdit(prompt)} className="p-2 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-gray-200"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button>
                      {!prompt.isDefault && <button onClick={() => handleDelete(prompt._id)} className="p-2 rounded-lg hover:bg-red-500/20 text-gray-400 hover:text-red-400"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>}
                    </div>
                  </div>
                ))}
              </div>
              <button onClick={() => setMode('create')} className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors">Create New Persona</button>
            </>
          )}
          {(mode === 'create' || mode === 'edit') && (
            <div className="space-y-4">
              <div><label className="block text-sm text-gray-400 mb-2">Icon</label>
                <div className="flex flex-wrap gap-2">
                  {ICONS.map(icon => (
                    <button key={icon} onClick={() => setFormIcon(icon)}
                      className={`w-10 h-10 rounded-lg text-xl flex items-center justify-center transition-colors ${formIcon === icon ? 'bg-blue-600 ring-2 ring-blue-400' : 'bg-gray-800 hover:bg-gray-700'}`}>
                      {icon}
                    </button>
                  ))}
                </div>
              </div>
              <div><label className="block text-sm text-gray-400 mb-2">Name</label>
                <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="My Custom Persona"
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:border-blue-500" />
              </div>
              <div><label className="block text-sm text-gray-400 mb-2">System Prompt</label>
                <textarea value={formContent} onChange={(e) => setFormContent(e.target.value)} placeholder="You are a..." rows={4}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none" />
              </div>
              <div className="flex gap-3">
                <button onClick={() => setMode('manage')} className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 font-medium rounded-lg transition-colors">Cancel</button>
                <button onClick={mode === 'create' ? handleCreate : handleUpdate} disabled={!formName.trim() || !formContent.trim()}
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:text-gray-400 text-white font-medium rounded-lg transition-colors">
                  {mode === 'create' ? 'Create' : 'Save'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}