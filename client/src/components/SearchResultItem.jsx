import { memo } from 'react'

export const SearchResultItem = memo(function SearchResultItem({ result, isActive, onSelect }) {
  return (
    <div onClick={onSelect}
      className={`px-3 py-3 rounded-lg cursor-pointer transition-all duration-200 mb-1 ${isActive ? 'bg-gray-700' : 'hover:bg-gray-800'}`}>
      <div className="flex items-center justify-between">
        {result.titleHighlight ? (
          <p className="text-sm text-gray-100 truncate flex-1 pr-2" dangerouslySetInnerHTML={{ __html: result.titleHighlight }} />
        ) : (
          <p className="text-sm text-gray-100 truncate flex-1 pr-2">{result.title || 'New Conversation'}</p>
        )}
      </div>
      {result.messageSnippet && <p className="text-xs text-gray-400 mt-1 line-clamp-2" dangerouslySetInnerHTML={{ __html: result.messageSnippet }} />}
      <p className="text-xs text-gray-500 mt-1">{new Date(result.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
    </div>
  )
})