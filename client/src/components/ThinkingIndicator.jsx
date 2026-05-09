import { motion } from 'framer-motion'

export function ThinkingIndicator({ tool, input }) {
  const labels = {
    web_search: `Searching the web for: "${input?.query || ''}"`,
    calculate: `Calculating: ${input?.expression || ''}`,
    get_current_datetime: `Getting time for: ${input?.timezone || 'UTC'}`,
    generate_image_prompt: `Generating image prompt: ${input?.description || ''}`,
    summarize_url: `Summarizing: ${input?.url || ''}`
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-2 px-3 py-2 bg-blue-500/10 rounded-lg border border-blue-500/30 mb-3">
      <motion.div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
      <span className="text-sm text-blue-300">{labels[tool] || `Using ${tool}...`}</span>
    </motion.div>
  )
}