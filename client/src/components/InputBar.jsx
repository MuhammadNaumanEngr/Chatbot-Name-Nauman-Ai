import { useRef, useState, useEffect, memo } from 'react'
import { motion } from 'framer-motion'

export const InputBar = memo(function InputBar({
  input,
  setInput,
  onKeyDown,
  onSend,
  disabled,
  showTemplateModal,
  setShowTemplateModal,
  maxLength = 32000
}) {
  const inputRef = useRef(null)
  const [charCount, setCharCount] = useState(0)
  const [isRecording, setIsRecording] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [isFocused, setIsFocused] = useState(false)

  // Common emojis for quick access
  const quickEmojis = ['😊', '😂', '❤️', '👍', '🎉', '🔥', '💡', '✨', '🤔', '👏', '🙌', '💯']

  useEffect(() => {
    setCharCount(input.length)
  }, [input])

  // Auto-focus when disabled becomes false (i.e., when a conversation starts)
  useEffect(() => {
    if (!disabled && inputRef.current) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        inputRef.current?.focus()
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [disabled])

  // Focus on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      inputRef.current?.focus()
    }, 100)
    return () => clearTimeout(timer)
  }, [])

  // Voice input using Web Speech API
  const startVoiceInput = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Voice input is not supported in your browser')
      return
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    const recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = true

    recognition.onstart = () => setIsRecording(true)
    recognition.onend = () => setIsRecording(false)
    recognition.onerror = () => setIsRecording(false)

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map(result => result[0].transcript)
        .join('')
      setInput(prev => prev + transcript)
    }

    recognition.start()
  }

  const insertEmoji = (emoji) => {
    setInput(prev => prev + emoji)
    setShowEmojiPicker(false)
    inputRef.current?.focus()
  }

  // Handle slash commands
  const handleInputChange = (e) => {
    const value = e.target.value
    setInput(value)

    // Auto-show template modal when user types "/"
    if (value === '/' && !showTemplateModal) {
      setShowTemplateModal(true)
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <motion.div
        whileFocus={{ scale: 1.005 }}
        className={`relative bg-gray-800/80 backdrop-blur-sm rounded-2xl border transition-all duration-200 ${
          isFocused ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-gray-700'
        }`}
      >
        {/* Top toolbar */}
        <div className="flex items-center px-3 pt-2 gap-1 border-b border-gray-700/50">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowTemplateModal(true)}
            className="p-1.5 rounded-md hover:bg-gray-700 text-gray-400 hover:text-gray-200 transition-colors"
            title="Templates"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={startVoiceInput}
            className={`p-1.5 rounded-md transition-colors ${
              isRecording
                ? 'bg-red-500/20 text-red-400 animate-pulse'
                : 'hover:bg-gray-700 text-gray-400 hover:text-gray-200'
            }`}
            title="Voice input"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </motion.button>

          {/* Emoji picker button */}
          <div className="relative">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="p-1.5 rounded-md hover:bg-gray-700 text-gray-400 hover:text-gray-200 transition-colors"
              title="Emoji"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </motion.button>

            {/* Emoji picker dropdown */}
            {showEmojiPicker && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute bottom-full left-0 mb-2 p-3 bg-gray-800 border border-gray-700 rounded-xl shadow-xl z-20"
              >
                <div className="grid grid-cols-6 gap-2">
                  {quickEmojis.map((emoji, i) => (
                    <motion.button
                      key={i}
                      whileHover={{ scale: 1.2 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => insertEmoji(emoji)}
                      className="p-1 hover:bg-gray-700 rounded-lg transition-colors text-lg"
                    >
                      {emoji}
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}
          </div>

          <div className="flex-1" />

          {/* Character/token counter */}
          <span className={`text-xs px-2 py-1 rounded-md ${
            charCount > maxLength * 0.9
              ? 'text-red-400 bg-red-500/20'
              : charCount > maxLength * 0.7
              ? 'text-yellow-400 bg-yellow-500/20'
              : 'text-gray-500'
          }`}>
            {charCount.toLocaleString()} / {maxLength.toLocaleString()}
          </span>
        </div>

        {/* Main textarea */}
        <div className="relative">
          <textarea
            ref={inputRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={onKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder="Type / for templates, or ask Nauman AI..."
            rows={1}
            autoFocus
            className="w-full bg-transparent px-4 py-3 pr-14 text-gray-100 placeholder-gray-500 resize-none focus:outline-none max-h-40"
            style={{ minHeight: '48px' }}
            disabled={disabled}
          />

          {/* Send button */}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: input.trim() && !disabled ? 0.9 : 1 }}
            onClick={onSend}
            disabled={!input.trim() || disabled}
            className={`absolute right-3 bottom-3 p-2 rounded-lg transition-all ${
              input.trim() && !disabled
                ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white shadow-lg shadow-purple-500/25'
                : 'bg-gray-700 text-gray-500'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </motion.button>
        </div>

        {/* Bottom hint */}
        <div className="px-4 pb-2 flex items-center gap-4 text-xs text-gray-500">
          <span>Enter to send</span>
          <span>Shift+Enter for new line</span>
          {input.length > 0 && (
            <button
              onClick={() => setInput('')}
              className="hover:text-gray-300 transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      </motion.div>

      {/* Recording indicator */}
      {isRecording && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-center gap-2 mt-2 text-red-400 text-sm"
        >
          <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse" />
          <span>Listening...</span>
        </motion.div>
      )}
    </div>
  )
})