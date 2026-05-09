import { motion } from 'framer-motion'

export function TypingIndicator() {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="flex items-center space-x-1 px-4 py-3 bg-gray-800 rounded-2xl w-fit max-w-md">
      <div className="w-2 h-2 bg-gray-400 rounded-full typing-dot-1" />
      <div className="w-2 h-2 bg-gray-400 rounded-full typing-dot-2" />
      <div className="w-2 h-2 bg-gray-400 rounded-full typing-dot-3" />
    </motion.div>
  )
}