import { useState, useEffect, useRef } from 'react'

export function TemplateModal({ isOpen, onClose, templates, onUseTemplate, onCreateTemplate, onDeleteTemplate }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState('All')
  const [selectedTpl, setSelectedTpl] = useState(null)
  const [variableValues, setVariableValues] = useState({})
  const [isCreating, setIsCreating] = useState(false)
  const [createName, setCreateName] = useState('')
  const [createDesc, setCreateDesc] = useState('')
  const [createTemplate, setCreateTemplate] = useState('')
  const [createVars, setCreateVars] = useState([])
  const modalRef = useRef(null)

  const categories = ['All', 'Writing', 'Coding', 'Research', 'My Templates']
  const mostUsed = [...templates].sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0)).slice(0, 5)

  useEffect(() => {
    if (!isOpen) { setSelectedTpl(null); setVariableValues({}); setIsCreating(false); setSearchQuery(''); setActiveCategory('All') }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e) => { if (e.key === 'Escape') onClose() }
    const handleClickOutside = (e) => { if (modalRef.current && !modalRef.current.contains(e.target)) onClose() }
    document.addEventListener('keydown', handleKeyDown)
    setTimeout(() => document.addEventListener('mousedown', handleClickOutside), 0)
    return () => { document.removeEventListener('keydown', handleKeyDown); document.removeEventListener('mousedown', handleClickOutside) }
  }, [isOpen, onClose])

  // Extract variables from template string
  const extractVars = (templateStr) => {
    const matches = templateStr.match(/\{\{(\w+)\}\}/g) || []
    return matches.map(m => m.replace(/\{\{|\}\}/g, '')).filter((v, i, a) => a.indexOf(v) === i)
  }

  // Auto-detect variables when template changes
  useEffect(() => {
    if (createTemplate) {
      const detected = extractVars(createTemplate)
      setCreateVars(detected.map(v => ({ name: v, description: '', defaultValue: '', type: 'text', options: [] })))
    }
  }, [createTemplate])

  const filteredTemplates = templates.filter(tpl => {
    const matchesSearch = !searchQuery || tpl.name.toLowerCase().includes(searchQuery.toLowerCase()) || tpl.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = activeCategory === 'All' || (activeCategory === 'My Templates' ? !tpl.isPublic : tpl.category === activeCategory)
    return matchesSearch && matchesCategory
  })

  const handleSelectTemplate = (tpl) => {
    setSelectedTpl(tpl)
    const defaults = {}
    tpl.variables?.forEach(v => { defaults[v.name] = v.defaultValue || '' })
    setVariableValues(defaults)
  }

  const handleUseTemplate = () => {
    if (!selectedTpl) return
    if (!selectedTpl.variables || selectedTpl.variables.length === 0) {
      onUseTemplate(selectedTpl.template)
    } else {
      onUseTemplate(null, selectedTpl, variableValues)
    }
    setSelectedTpl(null)
    setVariableValues({})
  }

  const handleCreateTemplate = async () => {
    if (!createName.trim() || !createTemplate.trim()) return
    await onCreateTemplate({ name: createName, description: createDesc, template: createTemplate, variables: createVars, category: 'General', isPublic: false })
    setIsCreating(false)
    setCreateName('')
    setCreateDesc('')
    setCreateTemplate('')
    setCreateVars([])
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div ref={modalRef} className="bg-gray-850 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-gray-100">Prompt Templates</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-700 text-gray-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {!selectedTpl && !isCreating && (
          <>
            <div className="p-4 border-b border-gray-700">
              <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search templates..."
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:border-blue-500" />
              <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
                {categories.map(cat => (
                  <button key={cat} onClick={() => setActiveCategory(cat)}
                    className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${activeCategory === cat ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-gray-200'}`}>
                    {cat}
                  </button>
                ))}
              </div>
            </div>
            {searchQuery === '' && mostUsed.length > 0 && (
              <div className="px-4 pt-4">
                <p className="text-xs text-gray-500 uppercase font-semibold mb-2">Recently Used</p>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {mostUsed.map(tpl => (
                    <button key={tpl._id} onClick={() => handleSelectTemplate(tpl)}
                      className="flex-shrink-0 px-3 py-2 bg-gray-800 hover:bg-gray-750 rounded-lg text-left border border-gray-700 hover:border-gray-600 transition-colors">
                      <p className="text-sm font-medium text-gray-200">{tpl.name}</p>
                      <p className="text-xs text-gray-500">{tpl.variables?.length || 0} vars</p>
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="flex-1 overflow-y-auto p-4">
              {filteredTemplates.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">No templates found</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {filteredTemplates.map(tpl => (
                    <div key={tpl._id} className="bg-gray-800 rounded-lg p-3 border border-gray-700 hover:border-gray-600 transition-colors">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="text-sm font-medium text-gray-200">{tpl.name}</p>
                          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{tpl.description}</p>
                        </div>
                        <span className="text-xs px-1.5 py-0.5 bg-gray-700 text-gray-400 rounded">{tpl.variables?.length || 0} vars</span>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-gray-500">{tpl.usageCount || 0} uses</span>
                        <button onClick={() => handleSelectTemplate(tpl)}
                          className="px-2 py-1 text-xs bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 rounded transition-colors">
                          Use
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="p-4 border-t border-gray-700">
              <button onClick={() => setIsCreating(true)}
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors">
                + New Template
              </button>
            </div>
          </>
        )}

        {selectedTpl && !isCreating && (
          <div className="flex-1 overflow-y-auto p-4">
            <button onClick={() => setSelectedTpl(null)} className="text-sm text-blue-400 hover:text-blue-300 mb-3">← Back</button>
            <h3 className="text-md font-semibold text-gray-200 mb-1">{selectedTpl.name}</h3>
            <p className="text-xs text-gray-500 mb-4">{selectedTpl.description}</p>

            <div className="space-y-3">
              {selectedTpl.variables?.map((v, i) => (
                <div key={i}>
                  <label className="block text-sm text-gray-400 mb-1">{v.name}{v.description && <span className="text-gray-500"> — {v.description}</span>}</label>
                  {v.type === 'select' ? (
                    <select value={variableValues[v.name] || ''} onChange={e => setVariableValues(prev => ({ ...prev, [v.name]: e.target.value }))}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 focus:outline-none focus:border-blue-500">
                      <option value="">Select...</option>
                      {v.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  ) : (
                    <input type="text" value={variableValues[v.name] || ''} onChange={e => setVariableValues(prev => ({ ...prev, [v.name]: e.target.value }))}
                      placeholder={v.defaultValue || `Enter ${v.name}`}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:border-blue-500" />
                  )}
                </div>
              ))}
            </div>
            <button onClick={handleUseTemplate}
              className="w-full mt-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors">
              Insert Template
            </button>
          </div>
        )}

        {isCreating && (
          <div className="flex-1 overflow-y-auto p-4">
            <button onClick={() => setIsCreating(false)} className="text-sm text-blue-400 hover:text-blue-300 mb-3">← Back</button>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Name</label>
                <input type="text" value={createName} onChange={e => setCreateName(e.target.value)} placeholder="Template name"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Description</label>
                <input type="text" value={createDesc} onChange={e => setCreateDesc(e.target.value)} placeholder="What is this template for?"
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Template (use {'{{variableName}}'} for variables)</label>
                <textarea value={createTemplate} onChange={e => setCreateTemplate(e.target.value)} rows={4} placeholder="Write a {{tone}} email to {{recipient}}..."
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none" />
                {createVars.length > 0 && (
                  <div className="mt-2 space-y-2">
                    <p className="text-xs text-gray-500">Detected variables: {createVars.join(', ')}</p>
                    {createVars.map((v, i) => (
                      <div key={i} className="flex gap-2">
                        <input type="text" value={v} disabled className="flex-1 px-2 py-1 bg-gray-900 border border-gray-700 rounded text-xs text-gray-400" />
                        <input type="text" placeholder="default" className="w-24 px-2 py-1 bg-gray-800 border border-gray-700 rounded text-xs text-gray-100 focus:outline-none" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <button onClick={handleCreateTemplate} disabled={!createName.trim() || !createTemplate.trim()}
              className="w-full mt-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:text-gray-400 text-white font-medium rounded-lg transition-colors">
              Create Template
            </button>
          </div>
        )}
      </div>
    </div>
  )
}