export function MobileSidebarOverlay({ isOpen, onClose, children }) {
  if (!isOpen) return null
  return (
    <div className="fixed inset-0 z-50 md:hidden">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <aside className="absolute left-0 top-0 bottom-0 w-72 bg-gray-850 border-r border-gray-800 flex flex-col animate-slide-in-right">{children}</aside>
    </div>
  )
}