import { MobileMenuButton } from './MobileMenuButton.jsx'
import { ModelSelector } from './ModelSelector.jsx'
import { ToolsToggle } from './ToolsToggle.jsx'
import { PersonaButton } from './PersonaButton.jsx'
import { ThemeToggle } from './ThemeToggle.jsx'

export function Header({ currentConversation, activePersona, currentModel, models, onModelSelect, toolsEnabled, onToolsToggle, onOpenPersona }) {
  return (
    <header className="h-14 border-b border-gray-800 flex items-center justify-between px-4 gap-2">
      <div className="flex items-center gap-2">
        <MobileMenuButton onClick={() => {}} />
        <h1 className="font-medium text-gray-200 truncate">
          {currentConversation?.title && currentConversation.title !== 'New Conversation' ? currentConversation.title : (currentConversation?.messages?.[0]?.content?.slice(0, 40) || 'Select a conversation')}
        </h1>
      </div>
      <div className="flex items-center gap-2">
        <ThemeToggle />
        {activePersona && currentConversation && (
          <div className="hidden sm:flex items-center gap-1 px-2 py-1 bg-gray-800/50 rounded-md text-xs text-gray-400">
            <span>{activePersona.icon}</span>
            <span>{activePersona.name}</span>
          </div>
        )}
        <ModelSelector currentModel={currentConversation?.model || currentModel} onSelect={onModelSelect} models={models} />
        <ToolsToggle enabled={toolsEnabled} onToggle={onToolsToggle} />
        <PersonaButton activePrompt={activePersona} onClick={onOpenPersona} />
      </div>
    </header>
  )
}