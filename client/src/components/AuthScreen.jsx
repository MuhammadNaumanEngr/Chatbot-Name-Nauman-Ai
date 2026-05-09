import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useToast } from '../contexts/ToastContext.js'
import { FormError } from './FormError.jsx'

export function AuthScreen({ onLogin, onRegister, onGuest }) {
  const [tab, setTab] = useState('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [errors, setErrors] = useState([])
  const [isLoading, setIsLoading] = useState(false)
  const { addToast } = useToast()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrors([])
    setIsLoading(true)
    try {
      if (tab === 'signin') await onLogin(email, password)
      else await onRegister(email, password, displayName)
    } catch (err) {
      if (err.status === 409) setErrors([{ field: 'email', message: 'An account with this email already exists' }])
      else if (err.status === 400 && err.message.includes('password')) setErrors([{ field: 'password', message: err.message }])
      else addToast(err.message, 'error', err.requestId)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className="w-full max-w-md">
        <div className="bg-gray-850 border border-gray-700 rounded-2xl p-8 shadow-2xl">
          <div className="text-center mb-8">
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 400, delay: 0.1 }}
              className="w-16 h-16 rounded-2xl bg-gray-800 flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </motion.div>
            <h1 className="text-2xl font-semibold text-gray-200">Welcome to Nauman AI</h1>
            <p className="text-gray-500 mt-1">Sign in to continue</p>
          </div>
          <div className="flex gap-2 mb-6">
            <motion.button whileTap={{ scale: 0.98 }} onClick={() => { setTab('signin'); setErrors([]) }}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${tab === 'signin' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-gray-200'}`}>
              Sign In
            </motion.button>
            <motion.button whileTap={{ scale: 0.98 }} onClick={() => { setTab('signup'); setErrors([]) }}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${tab === 'signup' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-gray-200'}`}>
              Create Account
            </motion.button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <AnimatePresence mode="wait">
              {tab === 'signup' && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}>
                  <label className="block text-sm text-gray-400 mb-1">Display Name</label>
                  <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Your name"
                    autoComplete="name"
                    className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:border-blue-500 focus-transition" required />
                  <FormError errors={errors} field="displayName" />
                </motion.div>
              )}
            </AnimatePresence>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com"
                autoComplete="email"
                className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:border-blue-500 focus-transition" required />
              <FormError errors={errors} field="email" />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••"
                autoComplete={tab === 'signin' ? 'current-password' : 'new-password'}
                className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:border-blue-500 focus-transition" required />
              {tab === 'signup' && <p className="text-xs text-gray-500 mt-1">At least 8 characters with one uppercase letter</p>}
              <FormError errors={errors} field="password" />
            </div>
            <motion.button type="submit" disabled={isLoading} whileTap={{ scale: 0.98 }}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:text-gray-400 text-white font-medium rounded-lg transition-colors">
              {isLoading ? <span className="flex items-center justify-center gap-2"><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Please wait...</span> : (tab === 'signin' ? 'Sign In' : 'Create Account')}
            </motion.button>
          </form>
          <div className="mt-6 pt-6 border-t border-gray-700">
            <motion.button whileTap={{ scale: 0.98 }} onClick={onGuest} disabled={isLoading}
              className="w-full py-2.5 bg-gray-800 hover:bg-gray-700 disabled:bg-gray-750 disabled:text-gray-500 text-gray-300 font-medium rounded-lg transition-colors border border-gray-700">
              Continue as Guest
            </motion.button>
            <p className="text-xs text-gray-500 text-center mt-3">Guest accounts allow chatting without registration. Your chats won't be saved after logout.</p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}