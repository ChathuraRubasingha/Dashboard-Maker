import { useState, useEffect } from 'react'
import {
  X,
  Table2,
  BarChart3,
  LineChart,
  PieChart,
  AreaChart,
  Code2,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  Rows3,
  Columns,
} from 'lucide-react'
import clsx from 'clsx'
import type { QueryResult } from '../../types/queryBuilder'
import type { VisualizationType, VisualizationCreate } from '../../types'
import { visualizationService } from '../../services/visualizationService'
import ChartRenderer from '../ChartRenderer'
import SaveVisualizationModal, { SaveVisualizationData } from './SaveVisualizationModal'

interface ResultsModalProps {
  isOpen: boolean
  onClose: () => void
  queryResult: QueryResult | null
  isExecuting: boolean
  error: string | null
  mbqlPreview: object | null
  databaseId: number | null
}

type ViewMode = 'table' | 'chart'
type ChartType = 'bar' | 'line' | 'pie' | 'area'

const chartIcons = {
  bar: BarChart3,
  line: LineChart,
  pie: PieChart,
  area: AreaChart,
}

export default function ResultsModal({
  isOpen,
  onClose,
  queryResult,
  isExecuting,
  error,
  mbqlPreview,
  databaseId,
}: ResultsModalProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('table')
  const [chartType, setChartType] = useState<ChartType>('bar')
  const [showMBQL, setShowMBQL] = useState(false)
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null)

  // Handle escape key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isSaveModalOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose, isSaveModalOpen])

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  // Clear success message after 3 seconds
  useEffect(() => {
    if (saveSuccess) {
      const timer = setTimeout(() => setSaveSuccess(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [saveSuccess])

  const handleSaveVisualization = async (data: SaveVisualizationData) => {
    if (!mbqlPreview || !databaseId) {
      throw new Error('No query to save')
    }

    setIsSaving(true)
    try {
      // Determine the current view type
      const vizType: VisualizationType = viewMode === 'table' ? 'table' : data.visualization_type

      const createData: VisualizationCreate = {
        name: data.name,
        description: data.description || undefined,
        database_id: databaseId,
        query_type: 'mbql',
        mbql_query: mbqlPreview,
        visualization_type: vizType,
        visualization_settings: {},
      }

      await visualizationService.create(createData)
      setSaveSuccess(`Visualization "${data.name}" saved successfully!`)
      setIsSaveModalOpen(false)
    } finally {
      setIsSaving(false)
    }
  }

  if (!isOpen) return null

  const columns = queryResult?.data?.cols || []
  const currentChartType = viewMode === 'table' ? 'table' : chartType

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-[95vw] h-[90vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-amber-50 to-orange-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-2.5 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl shadow-lg shadow-amber-500/25">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Query Results</h2>
                <p className="text-xs text-gray-500">View and save your query output</p>
              </div>

              {/* View mode toggle */}
              {queryResult && (
                <div className="flex items-center gap-1 ml-4 bg-white rounded-xl p-1 shadow-sm border border-gray-200">
                  <button
                    onClick={() => setViewMode('table')}
                    className={clsx(
                      'flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all',
                      viewMode === 'table'
                        ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-sm'
                        : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                    )}
                  >
                    <Table2 className="w-4 h-4" />
                    Table
                  </button>
                  <button
                    onClick={() => setViewMode('chart')}
                    className={clsx(
                      'flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all',
                      viewMode === 'chart'
                        ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-sm'
                        : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
                    )}
                  >
                    <BarChart3 className="w-4 h-4" />
                    Chart
                  </button>
                </div>
              )}

              {/* Chart type selector */}
              {viewMode === 'chart' && (
                <div className="flex items-center gap-1 bg-white rounded-xl p-1 shadow-sm border border-gray-200">
                  {(Object.keys(chartIcons) as ChartType[]).map((type) => {
                    const Icon = chartIcons[type]
                    return (
                      <button
                        key={type}
                        onClick={() => setChartType(type)}
                        className={clsx(
                          'p-2 rounded-lg transition-all',
                          chartType === type
                            ? 'bg-amber-100 text-amber-700'
                            : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                        )}
                        title={`${type.charAt(0).toUpperCase() + type.slice(1)} Chart`}
                      >
                        <Icon className="w-4 h-4" />
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              {/* Success message */}
              {saveSuccess && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-sm border border-emerald-200">
                  <CheckCircle2 className="w-4 h-4" />
                  {saveSuccess}
                </div>
              )}

              {/* Show query button */}
              <button
                onClick={() => setShowMBQL(!showMBQL)}
                className={clsx(
                  'flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-xl border transition-all',
                  showMBQL
                    ? 'bg-gray-900 text-white border-gray-900'
                    : 'text-gray-600 hover:text-gray-800 border-gray-200 hover:border-gray-300 bg-white'
                )}
              >
                <Code2 className="w-4 h-4" />
                {showMBQL ? 'Hide' : 'Show'} Query
              </button>

              {/* Save button */}
              <button
                onClick={() => setIsSaveModalOpen(true)}
                disabled={!queryResult || isExecuting}
                className="inline-flex items-center gap-2 px-5 py-2 text-sm font-medium bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-xl hover:from-emerald-600 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/25 transition-all hover:shadow-xl"
              >
                <Save className="w-4 h-4" />
                Save Visualization
              </button>

              <div className="w-px h-8 bg-gray-200" />

              {/* Close button */}
              <button
                onClick={onClose}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* MBQL Preview */}
        {showMBQL && mbqlPreview && (
          <div className="px-6 py-4 bg-gray-900 border-b border-gray-800">
            <div className="flex items-center gap-2 mb-2">
              <Code2 className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-medium text-amber-400">MBQL Query</span>
            </div>
            <pre className="text-sm text-emerald-400 overflow-x-auto font-mono bg-gray-950 rounded-xl p-4">
              {JSON.stringify(mbqlPreview, null, 2)}
            </pre>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-auto p-6 bg-gray-50/50">
          {/* Error state */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-5 rounded-2xl">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-red-100 rounded-xl">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <span className="font-semibold text-lg">Query Error</span>
              </div>
              <p className="text-sm ml-11">{error}</p>
            </div>
          )}

          {/* Empty state */}
          {!queryResult && !error && !isExecuting && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-24 h-24 mb-6 rounded-2xl bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center">
                <BarChart3 className="w-12 h-12 text-amber-500" />
              </div>
              <p className="text-xl text-gray-700 font-semibold mb-2">No results yet</p>
              <p className="text-gray-500 max-w-md">
                Build your query by adding tables and selecting columns, then click "Run Query" to see results
              </p>
            </div>
          )}

          {/* Loading state */}
          {isExecuting && (
            <div className="flex flex-col items-center justify-center h-full">
              <div className="relative">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center">
                  <Loader2 className="w-10 h-10 text-amber-500 animate-spin" />
                </div>
              </div>
              <p className="text-lg text-gray-700 font-medium mt-6">Executing query...</p>
              <p className="text-sm text-gray-500 mt-1">This may take a moment</p>
            </div>
          )}

          {/* Table view */}
          {queryResult && !isExecuting && viewMode === 'table' && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                    <tr>
                      {columns.map((col, idx) => (
                        <th
                          key={`${col.name}-${idx}`}
                          className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-b border-gray-200"
                        >
                          {col.display_name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {queryResult.data.rows.map((row, rowIndex) => (
                      <tr key={rowIndex} className="hover:bg-amber-50/50 transition-colors">
                        {row.map((cell, cellIndex) => (
                          <td
                            key={cellIndex}
                            className="px-6 py-4 text-sm text-gray-700 whitespace-nowrap"
                          >
                            {cell === null ? (
                              <span className="text-gray-400 italic">null</span>
                            ) : (
                              String(cell)
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm text-gray-600">
                  <Rows3 className="w-4 h-4 text-gray-400" />
                  <span className="font-semibold">{queryResult.row_count}</span> row{queryResult.row_count !== 1 ? 's' : ''}
                </span>
                {queryResult.row_count > 0 && (
                  <span className="flex items-center gap-2 text-sm text-gray-500">
                    <Columns className="w-4 h-4 text-gray-400" />
                    {columns.length} column{columns.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Chart view */}
          {queryResult && !isExecuting && viewMode === 'chart' && queryResult.data.rows.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 h-full min-h-[500px]">
              <ChartRenderer
                type={chartType}
                data={queryResult}
              />
            </div>
          )}

          {/* Empty chart state */}
          {queryResult && !isExecuting && viewMode === 'chart' && queryResult.data.rows.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-20 h-20 mb-4 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center">
                <BarChart3 className="w-10 h-10 text-gray-300" />
              </div>
              <p className="text-gray-600 font-medium">No data to visualize</p>
              <p className="text-sm text-gray-500">Your query returned no rows</p>
            </div>
          )}
        </div>
      </div>

      {/* Save Visualization Modal */}
      <SaveVisualizationModal
        isOpen={isSaveModalOpen}
        onClose={() => setIsSaveModalOpen(false)}
        onSave={handleSaveVisualization}
        currentChartType={currentChartType}
        isSaving={isSaving}
      />
    </div>
  )
}
