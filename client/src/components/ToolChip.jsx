import { motion } from 'framer-motion'

export function ToolChip({ tool, result }) {
  const toolConfig = {
    web_search: { icon: '🔍', color: 'bg-blue-500/20 border-blue-500/40 text-blue-300', label: (r) => `🔍 "${r.query}" → ${r.count || 0} results` },
    calculate: { icon: '🧮', color: 'bg-purple-500/20 border-purple-500/40 text-purple-300', label: (r) => `🧮 ${r.expression} = ${r.result}` },
    get_current_datetime: { icon: '🕐', color: 'bg-gray-500/20 border-gray-500/40 text-gray-300', label: (r) => `🕐 ${r.timezone}: ${r.date} ${r.time}` },
    generate_image_prompt: { icon: '🎨', color: 'bg-pink-500/20 border-pink-500/40 text-pink-300', label: (r) => `🎨 ${r.style} prompt generated` },
    summarize_url: { icon: '📄', color: 'bg-green-500/20 border-green-500/40 text-green-300', label: (r) => `📄 ${new URL(r.url).hostname} summarized` }
  }

  const config = toolConfig[tool] || { icon: '🔧', color: 'bg-gray-500/20 border-gray-500/40 text-gray-300', label: () => tool }
  const displayLabel = typeof result === 'object' && result !== null ? config.label(result) : String(result || '')

  return (
    <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 500, damping: 25 }}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs ${config.color} mb-2`}>
      <span>{config.icon}</span>
      <span className="max-w-xs truncate">{displayLabel}</span>
    </motion.div>
  )
}