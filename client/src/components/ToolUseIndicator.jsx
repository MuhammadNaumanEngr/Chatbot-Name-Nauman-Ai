import { motion } from 'framer-motion'

export function ToolUseIndicator({ toolCalls }) {
  if (!toolCalls || toolCalls.length === 0) return null

  return (
    <motion.div className="mb-3 space-y-2"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      {toolCalls.map((call, i) => (
        <motion.div key={i} initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
          transition={{ delay: i * 0.1 }}
          className="flex items-center gap-2 px-3 py-2 bg-gray-800/50 rounded-lg border border-gray-700">
          <div className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center">
            <span className="text-xs">⚡</span>
          </div>
          <span className="text-sm text-gray-300">
            Using <span className="text-blue-400 font-medium">{call.tool}</span>
            {call.input && Object.keys(call.input).length > 0 && (
              <span className="text-gray-500"> — {JSON.stringify(call.input).slice(0, 50)}</span>
            )}
          </span>
        </motion.div>
      ))}
    </motion.div>
  )
}