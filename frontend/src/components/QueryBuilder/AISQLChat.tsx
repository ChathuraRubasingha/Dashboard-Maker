import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import {
  Sparkles,
  Send,
  X,
  Loader2,
  Copy,
  Check,
  Play,
  AlertCircle,
  Lightbulb,
  ChevronDown,
  ChevronUp,
  Wand2,
  Table,
  Download,
} from 'lucide-react'
import { aiSqlService, type GenerateSQLResponse } from '../../services/aiSqlService'
import { metabaseService } from '../../services/metabaseService'
import clsx from 'clsx'

interface QueryResult {
  data: {
    rows: unknown[][]
    cols: Array<{ name: string; display_name: string; base_type: string }>
  }
  row_count: number
}

interface Message {
  id: string
  type: 'user' | 'assistant' | 'error' | 'result'
  content: string
  sql?: string
  result?: QueryResult
  isExecuting?: boolean
  timestamp: Date
}

interface AISQLChatProps {
  databaseId: number | null
  onSQLGenerated?: (sql: string) => void
}

export default function AISQLChat({
  databaseId,
  onSQLGenerated,
}: AISQLChatProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [executingMessageId, setExecutingMessageId] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Check Ollama status
  const { data: ollamaStatus, isLoading: isCheckingStatus } = useQuery({
    queryKey: ['ollama-status'],
    queryFn: () => aiSqlService.checkStatus(),
    staleTime: 30000,
    refetchOnWindowFocus: false,
  })

  // Get query suggestions
  const { data: suggestions, isLoading: isLoadingSuggestions } = useQuery({
    queryKey: ['ai-suggestions', databaseId],
    queryFn: () => aiSqlService.suggestQueries({ database_id: databaseId!, count: 5 }),
    enabled: !!databaseId && isOpen && ollamaStatus?.available,
    staleTime: 60000,
  })

  // Generate SQL mutation
  const generateMutation = useMutation({
    mutationFn: (query: string) =>
      aiSqlService.generateSQL({ query, database_id: databaseId! }),
    onSuccess: (data: GenerateSQLResponse) => {
      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        type: data.error ? 'error' : 'assistant',
        content: data.explanation,
        sql: data.sql || undefined,
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, assistantMessage])

      if (data.sql && onSQLGenerated) {
        onSQLGenerated(data.sql)
      }
    },
    onError: (error: Error) => {
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        type: 'error',
        content: error.message || 'Failed to generate SQL',
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, errorMessage])
    },
  })

  // Execute SQL mutation
  const executeMutation = useMutation({
    mutationFn: async (sql: string) => {
      const result = await metabaseService.executeNativeQuery(databaseId!, sql)
      return result as QueryResult
    },
    onSuccess: (data: QueryResult, _variables, context) => {
      // Add result message
      const resultMessage: Message = {
        id: crypto.randomUUID(),
        type: 'result',
        content: `Query executed successfully. ${data.row_count || data.data?.rows?.length || 0} rows returned.`,
        result: data,
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, resultMessage])
      setExecutingMessageId(null)
    },
    onError: (error: Error) => {
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        type: 'error',
        content: `Query execution failed: ${error.message}`,
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, errorMessage])
      setExecutingMessageId(null)
    },
  })

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen])

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!input.trim() || !databaseId || generateMutation.isPending) return

    const userMessage: Message = {
      id: crypto.randomUUID(),
      type: 'user',
      content: input.trim(),
      timestamp: new Date(),
    }
    setMessages(prev => [...prev, userMessage])
    generateMutation.mutate(input.trim())
    setInput('')
  }

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion)
    inputRef.current?.focus()
  }

  const handleCopySQL = async (sql: string, messageId: string) => {
    await navigator.clipboard.writeText(sql)
    setCopiedId(messageId)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleExecuteSQL = (sql: string, messageId: string) => {
    if (!databaseId || executeMutation.isPending) return
    setExecutingMessageId(messageId)
    executeMutation.mutate(sql)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleExportCSV = (result: QueryResult) => {
    if (!result?.data?.rows || !result?.data?.cols) return

    const headers = result.data.cols.map(col => col.display_name || col.name)
    const rows = result.data.rows.map(row =>
      row.map(cell => {
        if (cell === null || cell === undefined) return ''
        const str = String(cell)
        // Escape quotes and wrap in quotes if contains comma
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`
        }
        return str
      }).join(',')
    )

    const csv = [headers.join(','), ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `query_result_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Floating button when closed
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 p-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-full shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/40 hover:-translate-y-1 transition-all z-50"
        title="AI SQL Assistant"
      >
        <Wand2 className="w-6 h-6" />
      </button>
    )
  }

  const isOllamaAvailable = ollamaStatus?.available && ollamaStatus?.model_available

  return (
    <div
      className={clsx(
        'fixed bottom-6 right-6 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden z-50 transition-all duration-300 flex flex-col',
        isExpanded ? 'w-[600px] h-[700px]' : 'w-[450px] h-[550px]'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-white/20 rounded-lg">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold">AI SQL Assistant</h3>
            <p className="text-xs text-white/80">
              {isCheckingStatus
                ? 'Checking...'
                : isOllamaAvailable
                  ? `Using ${ollamaStatus.model}`
                  : 'Ollama not available'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
          >
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Status warning */}
      {!isOllamaAvailable && !isCheckingStatus && (
        <div className="px-4 py-3 bg-amber-50 border-b border-amber-200 flex-shrink-0">
          <div className="flex items-start gap-2 text-amber-800">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium">Ollama not available</p>
              <p className="text-amber-700 text-xs mt-0.5">
                {ollamaStatus?.error || 'Make sure Ollama is running with: ollama serve'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Database warning */}
      {!databaseId && (
        <div className="px-4 py-3 bg-blue-50 border-b border-blue-200 flex-shrink-0">
          <div className="flex items-start gap-2 text-blue-800">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <p className="text-sm">Add a table to the canvas first to enable AI assistance.</p>
          </div>
        </div>
      )}

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Welcome message */}
        {messages.length === 0 && (
          <div className="text-center py-6">
            <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-2xl flex items-center justify-center">
              <Wand2 className="w-8 h-8 text-purple-600" />
            </div>
            <h4 className="font-medium text-gray-900 mb-2">Ask me anything about your data</h4>
            <p className="text-sm text-gray-500 mb-4">
              Describe what you want to query in plain English. I'll generate the SQL and you can run it instantly.
            </p>

            {/* Suggestions */}
            {isLoadingSuggestions ? (
              <div className="flex items-center justify-center gap-2 text-gray-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Loading suggestions...</span>
              </div>
            ) : suggestions?.suggestions && suggestions.suggestions.length > 0 ? (
              <div className="text-left">
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                  <Lightbulb className="w-4 h-4" />
                  <span>Try asking:</span>
                </div>
                <div className="space-y-2">
                  {suggestions.suggestions.slice(0, 3).map((suggestion, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="block w-full text-left px-3 py-2 text-sm bg-gray-50 hover:bg-purple-50 text-gray-700 hover:text-purple-700 rounded-lg transition-colors"
                    >
                      "{suggestion}"
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        )}

        {/* Messages */}
        {messages.map(message => (
          <div
            key={message.id}
            className={clsx(
              'max-w-[95%]',
              message.type === 'user' ? 'ml-auto' : 'mr-auto'
            )}
          >
            {message.type === 'user' ? (
              <div className="bg-purple-600 text-white px-4 py-2 rounded-2xl rounded-br-md">
                <p className="text-sm">{message.content}</p>
              </div>
            ) : message.type === 'error' ? (
              <div className="bg-red-50 border border-red-200 px-4 py-3 rounded-2xl rounded-bl-md">
                <div className="flex items-start gap-2 text-red-700">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <p className="text-sm">{message.content}</p>
                </div>
              </div>
            ) : message.type === 'result' ? (
              <div className="bg-emerald-50 border border-emerald-200 px-4 py-3 rounded-2xl rounded-bl-md space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-emerald-700">
                    <Table className="w-4 h-4" />
                    <p className="text-sm font-medium">{message.content}</p>
                  </div>
                  {message.result && (
                    <button
                      onClick={() => handleExportCSV(message.result!)}
                      className="flex items-center gap-1 px-2 py-1 text-xs text-emerald-700 hover:bg-emerald-100 rounded transition-colors"
                    >
                      <Download className="w-3 h-3" />
                      CSV
                    </button>
                  )}
                </div>

                {/* Results table */}
                {message.result?.data?.rows && message.result.data.rows.length > 0 && (
                  <div className="bg-white rounded-lg border border-emerald-200 overflow-hidden">
                    <div className="overflow-x-auto max-h-[200px] overflow-y-auto">
                      <table className="w-full text-xs">
                        <thead className="bg-emerald-100 sticky top-0">
                          <tr>
                            {message.result.data.cols.map((col, idx) => (
                              <th key={idx} className="px-3 py-2 text-left font-medium text-emerald-800 whitespace-nowrap">
                                {col.display_name || col.name}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {message.result.data.rows.slice(0, 10).map((row, rowIdx) => (
                            <tr key={rowIdx} className="border-t border-emerald-100 hover:bg-emerald-50">
                              {row.map((cell, cellIdx) => (
                                <td key={cellIdx} className="px-3 py-2 text-gray-700 whitespace-nowrap">
                                  {cell === null ? <span className="text-gray-400 italic">null</span> : String(cell)}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {message.result.data.rows.length > 10 && (
                      <div className="px-3 py-2 text-xs text-emerald-600 bg-emerald-50 border-t border-emerald-200">
                        Showing 10 of {message.result.data.rows.length} rows. Export CSV for full data.
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-gray-100 px-4 py-3 rounded-2xl rounded-bl-md space-y-3">
                <p className="text-sm text-gray-700">{message.content}</p>

                {message.sql && (
                  <div className="bg-gray-900 rounded-lg overflow-hidden">
                    <div className="flex items-center justify-between px-3 py-2 bg-gray-800">
                      <span className="text-xs text-gray-400 font-mono">SQL</span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleCopySQL(message.sql!, message.id)}
                          className="p-1.5 hover:bg-gray-700 rounded transition-colors"
                          title="Copy SQL"
                        >
                          {copiedId === message.id ? (
                            <Check className="w-3.5 h-3.5 text-green-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5 text-gray-400" />
                          )}
                        </button>
                      </div>
                    </div>
                    <pre className="p-3 text-xs text-gray-300 overflow-x-auto">
                      <code>{message.sql}</code>
                    </pre>
                    {/* Run Query Button */}
                    <div className="px-3 py-2 bg-gray-800 border-t border-gray-700">
                      <button
                        onClick={() => handleExecuteSQL(message.sql!, message.id)}
                        disabled={executeMutation.isPending}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-800 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
                      >
                        {executingMessageId === message.id ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Running...
                          </>
                        ) : (
                          <>
                            <Play className="w-4 h-4" />
                            Run Query
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {/* Loading indicator */}
        {generateMutation.isPending && (
          <div className="flex items-center gap-2 text-gray-500">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Generating SQL...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="p-4 border-t border-gray-200 bg-gray-50 flex-shrink-0">
        <form onSubmit={handleSubmit} className="flex items-end gap-2">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                !databaseId
                  ? 'Add a table first...'
                  : !isOllamaAvailable
                    ? 'Ollama not available...'
                    : 'Ask a question about your data...'
              }
              disabled={!databaseId || !isOllamaAvailable || generateMutation.isPending}
              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500"
              rows={1}
              style={{ minHeight: '44px', maxHeight: '120px' }}
            />
          </div>
          <button
            type="submit"
            disabled={!input.trim() || !databaseId || !isOllamaAvailable || generateMutation.isPending}
            className="p-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {generateMutation.isPending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </form>
        <p className="text-xs text-gray-400 mt-2 text-center">
          Press Enter to send • Shift+Enter for new line
        </p>
      </div>
    </div>
  )
}
