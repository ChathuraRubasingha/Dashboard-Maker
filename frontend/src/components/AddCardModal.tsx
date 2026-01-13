import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { X, Search, BarChart3, Table, LineChart, PieChart, AreaChart, Lock } from 'lucide-react'
import clsx from 'clsx'
import { metabaseService } from '../services/metabaseService'
import { visualizationService } from '../services/visualizationService'
import type { MetabaseQuestion, Visualization } from '../types'

interface Props {
  isOpen: boolean
  onClose: () => void
  onAdd?: (questionId: number) => void  // Legacy: Metabase questions only
  onAddMetabaseQuestion?: (questionId: number) => void
  onAddVisualization?: (visualizationId: number) => void
}

type TabType = 'visualizations' | 'metabase'

const chartIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  table: Table,
  bar: BarChart3,
  line: LineChart,
  pie: PieChart,
  area: AreaChart,
}

export default function AddCardModal({
  isOpen,
  onClose,
  onAdd,
  onAddMetabaseQuestion,
  onAddVisualization
}: Props) {
  // Support both old API (onAdd) and new API (onAddMetabaseQuestion)
  const handleAddMetabase = onAddMetabaseQuestion || onAdd

  const [activeTab, setActiveTab] = useState<TabType>('visualizations')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedVisualization, setSelectedVisualization] = useState<number | null>(null)
  const [selectedQuestion, setSelectedQuestion] = useState<number | null>(null)

  // Fetch local visualizations
  const { data: visualizations = [], isLoading: isLoadingVisualizations } = useQuery({
    queryKey: ['visualizations'],
    queryFn: () => visualizationService.list(),
    enabled: isOpen && activeTab === 'visualizations',
  })

  // Fetch Metabase questions
  const [questions, setQuestions] = useState<MetabaseQuestion[]>([])
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false)

  useEffect(() => {
    if (isOpen && activeTab === 'metabase') {
      fetchQuestions()
    }
  }, [isOpen, activeTab])

  const fetchQuestions = async () => {
    setIsLoadingQuestions(true)
    try {
      const data = await metabaseService.listQuestions()
      setQuestions(data)
    } catch (error) {
      console.error('Failed to fetch questions:', error)
    } finally {
      setIsLoadingQuestions(false)
    }
  }

  // Reset selection when tab changes
  useEffect(() => {
    setSelectedVisualization(null)
    setSelectedQuestion(null)
    setSearchQuery('')
  }, [activeTab])

  // Filter visualizations
  const filteredVisualizations = visualizations.filter((v: Visualization) =>
    !v.is_archived && v.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Filter questions
  const filteredQuestions = questions.filter((q) =>
    q.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleAdd = () => {
    if (activeTab === 'visualizations' && selectedVisualization && onAddVisualization) {
      onAddVisualization(selectedVisualization)
      handleClose()
    } else if (activeTab === 'metabase' && selectedQuestion && handleAddMetabase) {
      handleAddMetabase(selectedQuestion)
      handleClose()
    }
  }

  const handleClose = () => {
    onClose()
    setSelectedVisualization(null)
    setSelectedQuestion(null)
    setSearchQuery('')
  }

  if (!isOpen) return null

  const isLoading = activeTab === 'visualizations' ? isLoadingVisualizations : isLoadingQuestions
  const showMetabaseTab = handleAddMetabase !== undefined

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Add Card to Dashboard</h2>
          <button onClick={handleClose} className="p-1 rounded-lg hover:bg-gray-100">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-6 pt-4 border-b border-gray-200">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab('visualizations')}
              className={clsx(
                'pb-3 text-sm font-medium border-b-2 transition-colors',
                activeTab === 'visualizations'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              )}
            >
              My Visualizations
            </button>
            {showMetabaseTab && (
              <button
                onClick={() => setActiveTab('metabase')}
                className={clsx(
                  'pb-3 text-sm font-medium border-b-2 transition-colors',
                  activeTab === 'metabase'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                )}
              >
                Metabase Questions
              </button>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder={activeTab === 'visualizations' ? 'Search visualizations...' : 'Search questions...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Content List */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : activeTab === 'visualizations' ? (
            // Visualizations List
            filteredVisualizations.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                {searchQuery ? 'No visualizations found' : 'No visualizations available. Create one first!'}
              </div>
            ) : (
              <div className="grid gap-3">
                {filteredVisualizations.map((viz: Visualization) => {
                  const Icon = chartIcons[viz.visualization_type] || BarChart3
                  const isSelected = selectedVisualization === viz.id
                  return (
                    <button
                      key={viz.id}
                      onClick={() => setSelectedVisualization(viz.id)}
                      className={clsx(
                        'flex items-center gap-4 p-4 rounded-lg border transition-colors text-left',
                        isSelected
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      )}
                    >
                      <div
                        className={clsx(
                          'flex items-center justify-center w-10 h-10 rounded-lg',
                          isSelected ? 'bg-blue-100' : 'bg-gray-100'
                        )}
                      >
                        <Icon
                          className={clsx(
                            'w-5 h-5',
                            isSelected ? 'text-blue-600' : 'text-gray-600'
                          )}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-gray-900 truncate">{viz.name}</p>
                          {viz.is_query_locked && (
                            <Lock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          )}
                        </div>
                        {viz.description && (
                          <p className="text-sm text-gray-500 truncate">{viz.description}</p>
                        )}
                      </div>
                      <span className="text-xs text-gray-400 capitalize shrink-0">
                        {viz.visualization_type}
                      </span>
                    </button>
                  )
                })}
              </div>
            )
          ) : (
            // Metabase Questions List
            filteredQuestions.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                {searchQuery ? 'No questions found' : 'No questions available'}
              </div>
            ) : (
              <div className="grid gap-3">
                {filteredQuestions.map((question) => {
                  const Icon = chartIcons[question.display] || BarChart3
                  const isSelected = selectedQuestion === question.id
                  return (
                    <button
                      key={question.id}
                      onClick={() => setSelectedQuestion(question.id)}
                      className={clsx(
                        'flex items-center gap-4 p-4 rounded-lg border transition-colors text-left',
                        isSelected
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      )}
                    >
                      <div
                        className={clsx(
                          'flex items-center justify-center w-10 h-10 rounded-lg',
                          isSelected ? 'bg-blue-100' : 'bg-gray-100'
                        )}
                      >
                        <Icon
                          className={clsx(
                            'w-5 h-5',
                            isSelected ? 'text-blue-600' : 'text-gray-600'
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
            )
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleAdd}
            disabled={
              (activeTab === 'visualizations' && (!selectedVisualization || !onAddVisualization)) ||
              (activeTab === 'metabase' && !selectedQuestion)
            }
            className={clsx(
              'px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors',
              ((activeTab === 'visualizations' && selectedVisualization && onAddVisualization) ||
               (activeTab === 'metabase' && selectedQuestion))
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
