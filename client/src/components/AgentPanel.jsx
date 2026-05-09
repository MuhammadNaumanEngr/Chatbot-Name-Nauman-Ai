import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import ReactMarkdown from 'react-markdown'

export function AgentPanel({ isOpen, onClose, agents, onRunAgent, onCreateAgent, onDeleteAgent }) {
  const [selectedAgent, setSelectedAgent] = useState(null)
  const [taskInput, setTaskInput] = useState('')
  const [isRunning, setIsRunning] = useState(false)
  const [runSteps, setRunSteps] = useState([])
  const [finalAnswer, setFinalAnswer] = useState(null)
  const [currentRunId, setCurrentRunId] = useState(null)
  const modalRef = useRef(null)

  useEffect(() => {
    if (!isOpen) { setSelectedAgent(null); setTaskInput(''); setRunSteps([]); setFinalAnswer(null); setIsRunning(false) }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e) => { if (e.key === 'Escape') onClose() }
    const handleClickOutside = (e) => { if (modalRef.current && !modalRef.current.contains(e.target)) onClose() }
    document.addEventListener('keydown', handleKeyDown)
    setTimeout(() => document.addEventListener('mousedown', handleClickOutside), 0)
    return () => { document.removeEventListener('keydown', handleKeyDown); document.removeEventListener('mousedown', handleClickOutside) }
  }, [isOpen, onClose])

  const handleRunAgent = async () => {
    if (!selectedAgent || !taskInput.trim() || isRunning) return
    setIsRunning(true)
    setRunSteps([])
    setFinalAnswer(null)

    try {
      const response = await fetch(`/api/agents/${selectedAgent._id}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task: taskInput }),
        credentials: 'include'
      })

      if (!response.ok) throw new Error('Failed to start agent')

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let fullStepText = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              if (data.type === 'step') {
                fullStepText += data.partial || ''
                setRunSteps(prev => {
                  const updated = [...prev]
                  const lastStep = updated[updated.length - 1]
                  if (lastStep && lastStep.iteration === data.iteration && !lastStep.complete) {
                    lastStep.thought += data.partial || ''
                  } else {
                    updated.push({ iteration: data.iteration, thought: data.partial || '', complete: false })
                  }
                  return updated
                })
              }
              if (data.type === 'tool_call') {
                setRunSteps(prev => [...prev, {
                  iteration: data.iteration,
                  thought: '',
                  action: data.tool,
                  actionInput: data.input,
                  toolResult: null,
                  toolResultPending: true
                }])
              }
              if (data.type === 'tool_result') {
                setRunSteps(prev => prev.map(s =>
                  s.iteration === data.iteration && s.toolResultPending
                    ? { ...s, toolResult: data.result, toolResultPending: false }
                    : s
                ))
              }
              if (data.type === 'final_answer') {
                setFinalAnswer(data.answer)
              }
              if (data.type === 'done') {
                setIsRunning(false)
              }
            } catch (e) { /* skip */ }
          }
        }
      }
    } catch (err) {
      console.error('Agent run error:', err)
      setIsRunning(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div ref={modalRef} className="bg-gray-850 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-gray-100">AI Agents</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-700 text-gray-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Agent list */}
          <div className="w-48 border-r border-gray-700 p-3 overflow-y-auto">
            <p className="text-xs text-gray-500 uppercase font-semibold mb-2 px-2">Agents</p>
            {agents.map(agent => (
              <button key={agent._id} onClick={() => { setSelectedAgent(agent); setRunSteps([]); setFinalAnswer(null) }}
                className={`w-full flex items-center gap-2 px-2 py-2 rounded-lg text-left text-sm mb-1 transition-colors ${selectedAgent?._id === agent._id ? 'bg-blue-600/20 border border-blue-500/50 text-blue-300' : 'text-gray-300 hover:bg-gray-800'}`}>
                <span>{agent.name.includes('Research') ? '🔍' : agent.name.includes('Math') ? '🧮' : '📰'}</span>
                <span className="truncate">{agent.name}</span>
              </button>
            ))}
          </div>

          {/* Task area */}
          <div className="flex-1 flex flex-col">
            {!selectedAgent ? (
              <div className="flex-1 flex items-center justify-center text-gray-500">
                <p className="text-sm">Select an agent to get started</p>
              </div>
            ) : (
              <div className="flex-1 flex flex-col p-4">
                <div className="mb-3">
                  <h3 className="text-sm font-medium text-gray-200 mb-1">{selectedAgent.name}</h3>
                  <p className="text-xs text-gray-500">{selectedAgent.description}</p>
                </div>

                {!isRunning && runSteps.length === 0 && !finalAnswer && (
                  <div className="mb-4">
                    <textarea value={taskInput} onChange={e => setTaskInput(e.target.value)} placeholder="Describe the task for this agent..."
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
                      rows={3} />
                    <button onClick={handleRunAgent} disabled={!taskInput.trim()}
                      className="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:text-gray-400 text-white font-medium rounded-lg transition-colors">
                      Run Agent
                    </button>
                  </div>
                )}

                {isRunning && (
                  <div className="mb-4 flex items-center gap-2 text-sm text-blue-300">
                    <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                    Agent is running...
                  </div>
                )}

                {/* Steps log */}
                {runSteps.length > 0 && (
                  <div className="flex-1 overflow-y-auto space-y-3 mb-4">
                    {runSteps.map((step, i) => (
                      <div key={i} className="bg-gray-800 rounded-lg p-3 border border-gray-700">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-medium text-gray-500">Step {step.iteration}</span>
                          {step.action && <span className="text-xs px-2 py-0.5 bg-purple-500/20 text-purple-300 rounded-full">⚡ {step.action}</span>}
                        </div>
                        {step.thought && <p className="text-sm text-gray-300 mb-2">{step.thought}</p>}
                        {step.toolResult && (
                          <div className="text-xs text-gray-400 bg-gray-900 rounded p-2 mt-2">
                            Result: {typeof step.toolResult === 'object' ? JSON.stringify(step.toolResult).slice(0, 100) : step.toolResult}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {finalAnswer && (
                  <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                    <p className="text-xs font-medium text-green-400 mb-2">Final Answer</p>
                    <div className="text-sm text-gray-200 prose prose-invert prose-sm max-w-none">
                      <ReactMarkdown>{finalAnswer}</ReactMarkdown>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}