export function MobileMenuButton({ onClick }) {
  return (
    <button onClick={onClick} className="md:hidden p-2 rounded-lg hover:bg-gray-800 text-gray-400">
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
    </button>
  )
}