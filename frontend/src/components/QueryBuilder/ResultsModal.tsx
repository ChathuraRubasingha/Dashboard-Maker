import { useState, useEffect } from 'react'
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
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-[95vw] h-[90vh] bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
          <div className="flex items-center gap-6">
            <h2 className="text-lg font-semibold text-gray-800">Query Results</h2>

            {queryResult && (
              <div className="flex items-center gap-2 bg-white rounded-lg p-1 shadow-sm border border-gray-200">
                <button
                  onClick={() => setViewMode('table')}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    viewMode === 'table'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Table
                  </span>
                </button>
                <button
                  onClick={() => setViewMode('chart')}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    viewMode === 'chart'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    Chart
                  </span>
                </button>
              </div>
            )}

            {viewMode === 'chart' && (
              <select
                value={chartType}
                onChange={(e) => setChartType(e.target.value as ChartType)}
                className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="bar">Bar Chart</option>
                <option value="line">Line Chart</option>
                <option value="area">Area Chart</option>
                <option value="pie">Pie Chart</option>
              </select>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Success message */}
            {saveSuccess && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-sm">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {saveSuccess}
              </div>
            )}

            <button
              onClick={() => setShowMBQL(!showMBQL)}
              className={`px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${
                showMBQL
                  ? 'bg-gray-800 text-white border-gray-800'
                  : 'text-gray-600 hover:text-gray-800 border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
                {showMBQL ? 'Hide' : 'Show'} Query
              </span>
            </button>

            <button
              onClick={() => setIsSaveModalOpen(true)}
              disabled={!queryResult || isExecuting}
              className="px-5 py-2 text-sm font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
              Save Visualization
            </button>

            <div className="w-px h-8 bg-gray-200" />

            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* MBQL Preview */}
        {showMBQL && mbqlPreview && (
          <div className="px-6 py-3 bg-gray-900 border-b border-gray-700">
            <pre className="text-sm text-green-400 overflow-x-auto font-mono">
              {JSON.stringify(mbqlPreview, null, 2)}
            </pre>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-auto p-6 bg-gray-50">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-5 rounded-xl">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-red-100 rounded-lg">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <span className="font-semibold text-lg">Query Error</span>
              </div>
              <p className="text-sm ml-11">{error}</p>
            </div>
          )}

          {!queryResult && !error && !isExecuting && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-24 h-24 mb-6 rounded-full bg-gray-200 flex items-center justify-center">
                <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <p className="text-xl text-gray-700 font-medium mb-2">No results yet</p>
              <p className="text-gray-500 max-w-md">
                Build your query by adding tables and selecting columns from the canvas, then click "Run Query" to see results
              </p>
            </div>
          )}

          {isExecuting && (
            <div className="flex flex-col items-center justify-center h-full">
              <div className="relative">
                <svg className="animate-spin w-16 h-16 text-blue-500" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              </div>
              <p className="text-lg text-gray-600 mt-4">Executing query...</p>
              <p className="text-sm text-gray-400 mt-1">This may take a moment</p>
            </div>
          )}

          {queryResult && !isExecuting && viewMode === 'table' && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
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
                      <tr key={rowIndex} className="hover:bg-blue-50/50 transition-colors">
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
                <span className="text-sm text-gray-600">
                  Showing <span className="font-semibold">{queryResult.row_count}</span> row{queryResult.row_count !== 1 ? 's' : ''}
                </span>
                {queryResult.row_count > 0 && (
                  <span className="text-sm text-gray-500">
                    {columns.length} column{columns.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>
          )}

          {queryResult && !isExecuting && viewMode === 'chart' && queryResult.data.rows.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 h-full min-h-[500px]">
              <ChartRenderer
                type={chartType}
                data={queryResult}
              />
            </div>
          )}

          {queryResult && !isExecuting && viewMode === 'chart' && queryResult.data.rows.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-20 h-20 mb-4 rounded-full bg-gray-200 flex items-center justify-center">
                <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
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
