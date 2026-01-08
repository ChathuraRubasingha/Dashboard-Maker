import { useState, useEffect } from 'react'
import { X, Search, BarChart3, Table, LineChart, PieChart } from 'lucide-react'
import clsx from 'clsx'
import { metabaseService } from '../services/metabaseService'
import type { MetabaseQuestion } from '../types'

interface Props {
  isOpen: boolean
  onClose: () => void
  onAdd: (questionId: number) => void
}

const chartIcons = {
  table: Table,
  bar: BarChart3,
  line: LineChart,
  pie: PieChart,
  area: LineChart,
}

export default function AddCardModal({ isOpen, onClose, onAdd }: Props) {
  const [questions, setQuestions] = useState<MetabaseQuestion[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedQuestion, setSelectedQuestion] = useState<number | null>(null)

  useEffect(() => {
    if (isOpen) {
      fetchQuestions()
    }
  }, [isOpen])

  const fetchQuestions = async () => {
    setIsLoading(true)
    try {
      const data = await metabaseService.listQuestions()
      setQuestions(data)
    } catch (error) {
      console.error('Failed to fetch questions:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const filteredQuestions = questions.filter((q) =>
    q.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleAdd = () => {
    if (selectedQuestion) {
      onAdd(selectedQuestion)
      onClose()
      setSelectedQuestion(null)
      setSearchQuery('')
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Add Visualization</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Search */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search questions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Question list */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredQuestions.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              {searchQuery ? 'No questions found' : 'No questions available'}
            </div>
          ) : (
            <div className="grid gap-3">
              {filteredQuestions.map((question) => {
                const Icon = chartIcons[question.display as keyof typeof chartIcons] || BarChart3
                return (
                  <button
                    key={question.id}
                    onClick={() => setSelectedQuestion(question.id)}
                    className={clsx(
                      'flex items-center gap-4 p-4 rounded-lg border transition-colors text-left',
                      selectedQuestion === question.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    )}
                  >
                    <div
                      className={clsx(
                        'flex items-center justify-center w-10 h-10 rounded-lg',
                        selectedQuestion === question.id ? 'bg-blue-100' : 'bg-gray-100'
                      )}
                    >
                      <Icon
                        className={clsx(
                          'w-5 h-5',
                          selectedQuestion === question.id ? 'text-blue-600' : 'text-gray-600'
                        )}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{question.name}</p>
                      {question.description && (
                        <p className="text-sm text-gray-500 truncate">{question.description}</p>
                      )}
                    </div>
                    <span className="text-xs text-gray-400 capitalize">{question.display}</span>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleAdd}
            disabled={!selectedQuestion}
            className={clsx(
              'px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors',
              selectedQuestion
                ? 'bg-blue-600 hover:bg-blue-700'
                : 'bg-gray-300 cursor-not-allowed'
            )}
          >
            Add to Dashboard
          </button>
        </div>
      </div>
    </div>
  )
}
