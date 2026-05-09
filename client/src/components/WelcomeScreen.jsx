import { motion } from 'framer-motion'

const EXAMPLE_PROMPTS = [
  {
    icon: '💻',
    title: 'Write Code',
    description: 'Generate or debug any programming code',
    color: 'from-blue-500 to-cyan-500'
  },
  {
    icon: '🧠',
    title: 'Explain Concepts',
    description: 'Understand complex topics simply',
    color: 'from-purple-500 to-pink-500'
  },
  {
    icon: '✍️',
    title: 'Write & Edit',
    description: 'Draft emails, essays, and creative content',
    color: 'from-orange-500 to-amber-500'
  },
  {
    icon: '🔍',
    title: 'Analyze & Research',
    description: 'Deep dive into data and research',
    color: 'from-green-500 to-emerald-500'
  },
  {
    icon: '💡',
    title: 'Brainstorm',
    description: 'Generate creative ideas and solutions',
    color: 'from-yellow-500 to-orange-500'
  },
  {
    icon: '📊',
    title: 'Data Analysis',
    description: 'Process and visualize data',
    color: 'from-indigo-500 to-purple-500'
  }
]

export function WelcomeScreen({ onSelectPrompt, models, onModelSelect, selectedModel, onOpenPersona, activePersona }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col items-center justify-center h-full text-center px-4 py-12 animated-gradient">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25, delay: 0.1 }}
        className="w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center mb-8 shadow-2xl shadow-purple-500/25">
        <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      </motion.div>

      <motion.h2
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-3xl font-bold bg-gradient-to-r from-white via-gray-200 to-gray-300 bg-clip-text text-transparent mb-3">
        How can I help you today?
      </motion.h2>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-gray-400 max-w-md mb-8">
        Choose a category below or start typing to begin your conversation
      </motion.p>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="mb-8">
        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={onOpenPersona}
          className="flex items-center gap-3 px-5 py-3 bg-white/10 hover:bg-white/15 rounded-xl text-sm text-gray-200 transition-colors border border-white/10 backdrop-blur-sm">
          <span className="text-xl">{activePersona?.icon || '💬'}</span>
          <span className="font-medium">{activePersona?.name || 'Default Persona'}</span>
          <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
        </motion.button>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="mb-8">
        <p className="text-sm text-gray-400 mb-3">Select a model</p>
        <div className="flex flex-wrap gap-2 justify-center">
          {models.map(model => (
            <motion.button key={model.id} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={() => onModelSelect(model.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all backdrop-blur-sm ${
                model.id === selectedModel
                  ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg shadow-purple-500/25'
                  : 'bg-white/10 text-gray-300 hover:bg-white/15 border border-white/10'
              }`}>
              {model.name}
            </motion.button>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-2 text-center">{models.find(m => m.id === selectedModel)?.description}</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl w-full">
        {EXAMPLE_PROMPTS.map((prompt, i) => (
          <motion.button
            whileHover={{ scale: 1.03, y: -2 }}
            whileTap={{ scale: 0.98 }}
            key={i}
            onClick={() => onSelectPrompt(prompt.title)}
            className="flex items-start gap-4 p-5 bg-white/5 hover:bg-white/10 rounded-2xl text-left transition-all border border-white/5 hover:border-white/10 backdrop-blur-sm group"
            style={{ animationDelay: `${i * 0.1}s` }}>
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${prompt.color} flex items-center justify-center flex-shrink-0 shadow-lg group-hover:shadow-xl transition-shadow`}>
              <span className="text-2xl">{prompt.icon}</span>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-100 mb-1 group-hover:text-white transition-colors">{prompt.title}</h3>
              <p className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors">{prompt.description}</p>
            </div>
          </motion.button>
        ))}
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="text-xs text-gray-500 mt-8">
        Press <kbd className="px-2 py-1 bg-white/10 rounded text-gray-400 mx-1">/</kbd> for templates or start typing to chat
      </motion.p>
    </motion.div>
  )
}