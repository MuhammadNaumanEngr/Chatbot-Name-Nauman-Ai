import { useState, memo } from 'react'
import ReactMarkdown from 'react-markdown'
import { motion } from 'framer-motion'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { ToolUseIndicator } from './ToolUseIndicator.jsx'

export const MessageBubble = memo(function MessageBubble({
  message,
  onCopy,
  onRegenerate,
  onThumbsUp,
  onThumbsDown,
  isStreaming = false,
  isLast = false,
  onContinue,
  toolCalls
}) {
  const [copied, setCopied] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [showCodeBlock, setShowCodeBlock] = useState(null)
  const [thumbsReaction, setThumbsReaction] = useState(null)
  const isUser = message.role === 'user'

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    onCopy?.()
  }

  const handleCopyCode = (code) => {
    navigator.clipboard.writeText(code)
  }

  const handleSpeak = () => {
    if (isPlaying) {
      window.speechSynthesis.cancel()
      setIsPlaying(false)
      return
    }
    const utterance = new SpeechSynthesisUtterance(message.content)
    utterance.onend = () => setIsPlaying(false)
    utterance.onerror = () => setIsPlaying(false)
    window.speechSynthesis.speak(utterance)
    setIsPlaying(true)
  }

  const handleThumbsUp = () => {
    const newValue = thumbsReaction === 'up' ? null : 'up'
    setThumbsReaction(newValue)
    onThumbsUp?.(message, newValue)
  }

  const handleThumbsDown = () => {
    const newValue = thumbsReaction === 'down' ? null : 'down'
    setThumbsReaction(newValue)
    onThumbsDown?.(message, newValue)
  }

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const formatDate = (date) => {
    const d = new Date(date)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (d.toDateString() === today.toDateString()) return 'Today'
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  // Custom markdown components for code blocks
  const markdownComponents = {
    code({ node, inline, className, children, ...props }) {
      const match = /language-(\w+)/.exec(className || '')
      const language = match ? match[1] : ''
      const codeString = String(children).replace(/\n$/, '')

      if (!inline && match) {
        return (
          <div className="code-block-wrapper group relative my-4">
            <div className="flex items-center justify-between px-4 py-2 bg-gray-900 rounded-t-lg border-b border-gray-700">
              <span className="text-xs text-gray-400 font-mono">{language}</span>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleCopyCode(codeString)}
                className="flex items-center gap-1.5 px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded text-xs text-gray-300 transition-colors"
              >
                {copied ? (
                  <>
                    <svg className="w-3.5 h-3.5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Copied
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Copy
                  </>
                )}
              </motion.button>
            </div>
            <SyntaxHighlighter
              style={oneDark}
              language={language}
              PreTag="div"
              customStyle={{
                margin: 0,
                borderRadius: '0 0 0.5rem 0.5rem',
                fontSize: '0.875rem'
              }}
              {...props}
            >
              {codeString}
            </SyntaxHighlighter>
          </div>
        )
      }

      return (
        <code className="bg-gray-800 text-pink-400 px-1.5 py-0.5 rounded text-sm font-mono" {...props}>
          {children}
        </code>
      )
    },
    table({ children }) {
      return (
        <div className="overflow-x-auto my-4">
          <table className="min-w-full border border-gray-700 rounded-lg overflow-hidden">
            {children}
          </table>
        </div>
      )
    },
    th({ children }) {
      return (
        <th className="px-4 py-2 bg-gray-800 text-left text-sm font-semibold text-gray-200 border-b border-gray-700">
          {children}
        </th>
      )
    },
    td({ children }) {
      return (
        <td className="px-4 py-2 text-sm text-gray-300 border-b border-gray-700">
          {children}
        </td>
      )
    }
  }

  return (
    <motion.div
      initial={isUser ? { opacity: 0, x: 50 } : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4 group`}
    >
      <div className={`flex ${isUser ? 'flex-row-reverse' : 'flex-row'} items-end gap-2 max-w-2xl w-full`}>
        {/* Avatar */}
        {!isUser && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center flex-shrink-0 shadow-lg"
          >
            <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2a10 10 0 0 0-3.16 19.5 1 1 0 0 0 .36.98l.36.3 5.18 4.2a1 1 0 0 0 1.44 0l5.18-4.2a1 1 0 0 0 .36-.98A10 10 0 0 0 12 2z"/>
            </svg>
          </motion.div>
        )}

        <div className="relative">
          {/* Tool calls indicator */}
          {toolCalls && toolCalls.length > 0 && !isUser && <ToolUseIndicator toolCalls={toolCalls} />}

          {/* Message bubble */}
          <motion.div
            initial={isUser ? { scale: 0.95 } : { opacity: 0.8 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`px-4 py-3 rounded-2xl ${
              isUser
                ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/20'
                : 'bg-gray-800 text-gray-100 shadow-lg'
            }`}
            style={{ borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px' }}
          >
            <div className="prose prose-invert prose-sm max-w-none">
              <ReactMarkdown components={markdownComponents}>{message.content}</ReactMarkdown>
            </div>
          </motion.div>

          {/* Timestamp (visible on hover) */}
          <div className="absolute -bottom-5 left-0 text-xs text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity duration-200 px-1">
            {formatTime(message.createdAt || Date.now())} · {formatDate(message.createdAt || Date.now())}
          </div>

          {/* Action buttons (visible on hover for AI messages) */}
          {!isUser && (
            <motion.div
              initial={{ opacity: 0 }}
              whileHover={{ opacity: 1 }}
              className="absolute -bottom-8 right-0 flex gap-1 items-center"
            >
              {/* Reaction buttons */}
              <motion.button
                whileTap={{ scale: 0.92 }}
                onClick={handleThumbsUp}
                className={`p-1.5 rounded-md transition-all ${
                  thumbsReaction === 'up'
                    ? 'bg-green-500/30 text-green-400'
                    : 'bg-gray-700 hover:bg-gray-600 text-gray-400 hover:text-gray-200'
                }`}
                title="Helpful"
              >
                <svg className="w-4 h-4" fill={thumbsReaction === 'up' ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                </svg>
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.92 }}
                onClick={handleThumbsDown}
                className={`p-1.5 rounded-md transition-all ${
                  thumbsReaction === 'down'
                    ? 'bg-red-500/30 text-red-400'
                    : 'bg-gray-700 hover:bg-gray-600 text-gray-400 hover:text-gray-200'
                }`}
                title="Not helpful"
              >
                <svg className="w-4 h-4" fill={thumbsReaction === 'down' ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" />
                </svg>
              </motion.button>

              {/* Copy button */}
              <motion.button
                whileTap={{ scale: 0.92 }}
                onClick={handleCopy}
                className="p-1.5 rounded-md bg-gray-700 hover:bg-gray-600 text-gray-400 hover:text-gray-200"
                title="Copy"
              >
                {copied ? (
                  <motion.svg
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    className="w-4 h-4 text-green-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </motion.svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                )}
              </motion.button>

              {/* Read aloud button */}
              <motion.button
                whileTap={{ scale: 0.92 }}
                onClick={handleSpeak}
                className={`p-1.5 rounded-md transition-all ${
                  isPlaying
                    ? 'bg-blue-500/30 text-blue-400'
                    : 'bg-gray-700 hover:bg-gray-600 text-gray-400 hover:text-gray-200'
                }`}
                title={isPlaying ? 'Stop' : 'Read aloud'}
              >
                {isPlaying ? (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 6h12v12H6z"/></svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  </svg>
                )}
              </motion.button>

              {/* Regenerate button */}
              {isLast && onRegenerate && !isStreaming && (
                <motion.button
                  whileTap={{ scale: 0.92 }}
                  onClick={onRegenerate}
                  className="p-1.5 rounded-md bg-gray-700 hover:bg-gray-600 text-gray-400 hover:text-gray-200"
                  title="Regenerate"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </motion.button>
              )}

              {/* Continue button */}
              {onContinue && (
                <motion.button
                  whileTap={{ scale: 0.92 }}
                  onClick={onContinue}
                  className="p-1.5 rounded-md bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400"
                  title="Continue"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                  </svg>
                </motion.button>
              )}
            </motion.div>
          )}

          {/* User avatar */}
          {isUser && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center flex-shrink-0 shadow-lg"
            >
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
              </svg>
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  )
})