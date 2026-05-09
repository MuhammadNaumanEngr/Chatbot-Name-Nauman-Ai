import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { themeManager, accentPresets, fontSizes, codeThemes } from '../utils/theme.js'

export function SettingsPanel({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('appearance')
  const modalRef = useRef(null)

  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e) => { if (e.key === 'Escape') onClose() }
    const handleClickOutside = (e) => { if (modalRef.current && !modalRef.current.contains(e.target)) onClose() }
    document.addEventListener('keydown', handleKeyDown)
    setTimeout(() => document.addEventListener('mousedown', handleClickOutside), 0)
    return () => { document.removeEventListener('keydown', handleKeyDown); document.removeEventListener('mousedown', handleClickOutside) }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const tabs = [
    { id: 'appearance', label: 'Appearance', icon: '🎨' },
    { id: 'shortcuts', label: 'Shortcuts', icon: '⌨️' },
    { id: 'about', label: 'About', icon: 'ℹ️' }
  ]

  const isMac = navigator.platform.includes('Mac') || navigator.userAgent.includes('Mac')
  const mod = isMac ? '⌘' : 'Ctrl'

  const shortcuts = [
    { keys: [`${mod}+K`], action: 'Open search' },
    { keys: [`${mod}+Shift+N`], action: 'New conversation' },
    { keys: [`${mod}+[`], action: 'Previous conversation' },
    { keys: [`${mod}+]`], action: 'Next conversation' },
    { keys: [`${mod}+Enter`], action: 'Send message' },
    { keys: [`${mod}+/`], action: 'Focus input' },
    { keys: [`${mod}+B`], action: 'Toggle sidebar' },
    { keys: [`${mod}+Shift+F`], action: 'New folder' },
    { keys: [`${mod}+,`], action: 'Settings' },
    { keys: [`${mod}+Shift+M`], action: 'Memory' },
    { keys: [`${mod}+Z`], action: 'Undo (in input)' },
    { keys: [`?`], action: 'Show shortcuts (not in input)' },
    { keys: [`R`], action: 'Regenerate response (not in input)' },
    { keys: [`↑`], action: 'Edit last message (in empty input)' },
    { keys: [`Esc`], action: 'Close panel/modal' }
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <motion.div
        ref={modalRef}
        initial={{ opacity: 0, x: 100 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 100 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="bg-gray-850 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-gray-100">Settings</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-700 text-gray-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="flex border-b border-gray-700">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${activeTab === tab.id ? 'text-blue-400 border-blue-400' : 'text-gray-400 border-transparent hover:text-gray-200'}`}>
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'appearance' && (
            <div className="space-y-8">
              {/* Theme */}
              <div>
                <h3 className="text-sm font-semibold text-gray-300 mb-4">Theme</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {['dark', 'light', 'midnight', 'forest', 'sunset'].map(themeName => (
                    <button key={themeName} onClick={() => themeManager.applyTheme(themeName)}
                      className={`p-3 rounded-xl border-2 transition-all ${themeManager.getTheme() === themeName ? 'border-blue-500 bg-gray-800' : 'border-gray-700 hover:border-gray-600'}`}>
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-full h-12 rounded-lg" style={{
                          background: themeName === 'dark' ? '#111827' : themeName === 'light' ? '#ffffff' : themeName === 'midnight' ? '#0f172a' : themeName === 'forest' ? '#0f1f14' : '#1c1410'
                        }} />
                        <span className="text-xs text-gray-300 capitalize">{themeName}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Accent Color */}
              <div>
                <h3 className="text-sm font-semibold text-gray-300 mb-4">Accent Color</h3>
                <div className="flex flex-wrap gap-3">
                  {accentPresets.map(preset => (
                    <button key={preset.name} onClick={() => themeManager.applyAccent(preset.color)}
                      className={`w-10 h-10 rounded-full transition-transform ${themeManager.getAccent() === preset.color ? 'ring-2 ring-offset-2 ring-offset-gray-850 scale-110' : 'hover:scale-105'}`}
                      style={{ background: preset.color, '--ring-color': preset.color }}
                      title={preset.name} />
                  ))}
                </div>
              </div>

              {/* Font Size */}
              <div>
                <h3 className="text-sm font-semibold text-gray-300 mb-4">Font Size</h3>
                <div className="flex gap-2">
                  {Object.entries(fontSizes).map(([key, size]) => (
                    <button key={key} onClick={() => themeManager.applyFontSize(key)}
                      className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${themeManager.getFontSize() === key ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}>
                      {key.charAt(0).toUpperCase() + key.slice(1)}
                      <span className="block text-xs text-gray-400 mt-1">{size}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Code Theme */}
              <div>
                <h3 className="text-sm font-semibold text-gray-300 mb-4">Code Theme</h3>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(codeThemes).map(([key, name]) => (
                    <button key={key} onClick={() => themeManager.applyCodeTheme(key)}
                      className={`py-2 px-3 rounded-lg text-sm transition-colors ${themeManager.getCodeTheme() === key ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}>
                      {name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'shortcuts' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-400 mb-4">Keyboard shortcuts for quick navigation. Press <kbd className="px-2 py-1 bg-gray-800 rounded text-xs">?</kbd> when not typing to see all shortcuts.</p>
              <div className="space-y-2">
                {shortcuts.map((shortcut, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0">
                    <span className="text-sm text-gray-300">{shortcut.action}</span>
                    <div className="flex gap-1">
                      {shortcut.keys.map((key, j) => (
                        <kbd key={j} className="px-2 py-1 bg-gray-800 border border-gray-700 rounded text-xs text-gray-200 font-mono">{key}</kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'about' && (
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gray-800 flex items-center justify-center">
                  <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-200">Nauman AI</h3>
                  <p className="text-sm text-gray-400">Version 1.0.0</p>
                </div>
              </div>
              <p className="text-sm text-gray-400">Nauman AI - Personal AI Assistant built with React, Vite, Express, and MongoDB.</p>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="p-4 bg-gray-800 rounded-xl">
                  <p className="text-gray-400 mb-1">Frontend</p>
                  <p className="text-gray-200">React 18 + Vite</p>
                </div>
                <div className="p-4 bg-gray-800 rounded-xl">
                  <p className="text-gray-400 mb-1">Backend</p>
                  <p className="text-gray-200">Express + MongoDB</p>
                </div>
                <div className="p-4 bg-gray-800 rounded-xl">
                  <p className="text-gray-400 mb-1">AI Model</p>
                  <p className="text-gray-200">MiniMax-M2.7</p>
                </div>
                <div className="p-4 bg-gray-800 rounded-xl">
                  <p className="text-gray-400 mb-1">Features</p>
                  <p className="text-gray-200">Voice, Agents, Tools</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}