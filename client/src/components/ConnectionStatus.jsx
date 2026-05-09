export function ConnectionStatus({ isConnected }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
      <span className="text-gray-400">{isConnected ? 'Connected' : 'Offline'}</span>
    </div>
  )
}