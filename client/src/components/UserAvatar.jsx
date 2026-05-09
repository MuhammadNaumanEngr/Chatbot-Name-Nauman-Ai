export function UserAvatar({ user, onLogout }) {
  const initials = user?.displayName?.slice(0, 2).toUpperCase() || '??'
  return (
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: user?.avatarColor || '#666' }}>{initials}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-200 truncate">{user?.displayName || 'Guest'}</p>
        {user?.isGuest && <p className="text-xs text-gray-500">Guest</p>}
      </div>
      <button onClick={onLogout} className="p-1.5 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-gray-200" title="Logout">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
      </button>
    </div>
  )
}