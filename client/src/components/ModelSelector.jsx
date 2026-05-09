import { useState, useEffect, useRef } from 'react'

export function ModelSelector({ currentModel, onSelect, models }) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setIsOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const currentModelInfo = models.find(m => m.id === currentModel) || models[0]

  return (
    <div className="relative" ref={dropdownRef}>
      <button onClick={() => setIsOpen(!isOpen)} className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm text-gray-300 transition-colors border border-gray-700">
        <span className="text-xs text-gray-500">Model:</span>
        <span className="font-medium text-white">{currentModelInfo?.name || 'M2.7'}</span>
        <svg className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && (
        <div className="absolute top-full mt-2 right-0 w-64 bg-gray-800 rounded-xl border border-gray-700 shadow-xl z-50 overflow-hidden">
          <div className="p-2">
            <p className="text-xs text-gray-500 uppercase px-2 py-1">Select Model</p>
            {models.map(model => (
              <button key={model.id} onClick={() => { onSelect(model.id); setIsOpen(false) }}
                className={`w-full flex flex-col items-start px-3 py-2 rounded-lg transition-colors ${model.id === currentModel ? 'bg-blue-600/20 border border-blue-500/50' : 'hover:bg-gray-700'}`}>
                <span className="font-medium text-white">{model.name}</span>
                <span className="text-xs text-gray-400">{model.description}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}