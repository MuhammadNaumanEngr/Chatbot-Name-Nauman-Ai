export function PersonaButton({ activePrompt, onClick }) {
  return (
    <button onClick={onClick} className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm text-gray-300 transition-colors border border-gray-700">
      <span>{activePrompt?.icon || '💬'}</span>
      <span className="font-medium text-white">{activePrompt?.name || 'Default'}</span>
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </button>
  )
}