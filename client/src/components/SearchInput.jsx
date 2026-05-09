export function SearchInput({ value, onChange, onClear }) {
  return (
    <div className="relative px-1 pb-2">
      <div className="flex items-center gap-2 bg-gray-800 rounded-lg px-3 py-2 border border-gray-700 focus-within:border-blue-500 transition-colors">
        <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder="Search conversations..."
          className="flex-1 bg-transparent text-sm text-gray-100 placeholder-gray-500 focus:outline-none" onKeyDown={(e) => { if (e.key === 'Escape') onClear() }} />
        {value && <button onClick={onClear} className="text-gray-400 hover:text-gray-200"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>}
      </div>
    </div>
  )
}