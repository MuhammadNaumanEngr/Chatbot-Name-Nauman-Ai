import { motion } from 'framer-motion'

export function SidebarSkeleton() {
  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-2">
      {[...Array(5)].map((_, i) => (
        <motion.div key={i} initial={{ opacity: 0.5 }} animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.1 }}
          className="h-14 bg-gray-800 rounded-lg shimmer" />
      ))}
    </div>
  )
}

export function MessageSkeleton() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      className="flex justify-start mb-4">
      <div className="flex items-end gap-2 max-w-2xl w-full">
        <motion.div initial={{ opacity: 0.5 }} animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="w-8 h-8 rounded-full bg-gray-700 flex-shrink-0 shimmer" />
        <div className="flex-1 px-4 py-3 bg-gray-800 rounded-2xl space-y-2">
          <motion.div initial={{ opacity: 0.5 }} animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: 0.1 }}
            className="h-4 bg-gray-700 rounded w-3/4 shimmer" />
          <motion.div initial={{ opacity: 0.5 }} animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
            className="h-4 bg-gray-700 rounded w-1/2 shimmer" />
        </div>
      </div>
    </motion.div>
  )
}