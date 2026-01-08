import { useState } from 'react'
import type { QueryResult } from '../../types/queryBuilder'
import ChartRenderer from '../ChartRenderer'

interface ResultsPanelProps {
  queryResult: QueryResult | null
  isExecuting: boolean
  error: string | null
  mbqlPreview: object | null
  onExecute: () => void
}

type ViewMode = 'table' | 'chart'
type ChartType = 'bar' | 'line' | 'pie' | 'area'

export default function ResultsPanel({
  queryResult,
  isExecuting,
  error,
  mbqlPreview,
  onExecute,
}: ResultsPanelProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('table')
  const [chartType, setChartType] = useState<ChartType>('bar')
  const [showMBQL, setShowMBQL] = useState(false)

  // Transform results for ChartRenderer
  const columns = queryResult?.data?.cols || []

  // Find suitable columns for chart axes

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h3 className="text-sm font-semibold text-gray-700">Results</h3>

          {queryResult && (
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
              <button
                onClick={() => setViewMode('table')}
                className={`px-3 py-1 text-xs rounded ${
                  viewMode === 'table'
                    ? 'bg-white text-gray-800 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Table
              </button>
              <button
                onClick={() => setViewMode('chart')}
                className={`px-3 py-1 text-xs rounded ${
                  viewMode === 'chart'
                    ? 'bg-white text-gray-800 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Chart
              </button>
            </div>
          )}

          {viewMode === 'chart' && (
            <select
              value={chartType}
              onChange={(e) => setChartType(e.target.value as ChartType)}
              className="px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="bar">Bar Chart</option>
              <option value="line">Line Chart</option>
              <option value="area">Area Chart</option>
              <option value="pie">Pie Chart</option>
            </select>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowMBQL(!showMBQL)}
            className="px-2 py-1 text-xs text-gray-600 hover:text-gray-800 border border-gray-200 rounded"
          >
            {showMBQL ? 'Hide' : 'Show'} Query
          </button>
          <button
            onClick={onExecute}
            disabled={isExecuting}
            className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            {isExecuting ? (
              <>
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Running...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Run Query
              </>
            )}
          </button>
        </div>
      </div>

      {/* MBQL Preview */}
      {showMBQL && mbqlPreview && (
        <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
          <pre className="text-xs text-gray-600 overflow-x-auto">
            {JSON.stringify(mbqlPreview, null, 2)}
          </pre>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {error && (
          <div className="bg-red-50 text-red-600 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-medium">Query Error</span>
            </div>
            <p className="text-sm">{error}</p>
          </div>
        )}

        {!queryResult && !error && !isExecuting && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 mb-4 rounded-full bg-gray-100 flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <p className="text-gray-600 mb-1">No results yet</p>
            <p className="text-sm text-gray-500">
              Add tables and columns, then click "Run Query"
            </p>
          </div>
        )}

        {isExecuting && (
          <div className="flex flex-col items-center justify-center h-full">
            <svg className="animate-spin w-8 h-8 text-blue-500 mb-3" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="text-gray-600">Executing query...</p>
          </div>
        )}

        {queryResult && !isExecuting && viewMode === 'table' && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {columns.map((col) => (
                    <th
                      key={col.name}
                      className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      {col.display_name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {queryResult.data.rows.map((row, rowIndex) => (
                  <tr key={rowIndex} className="hover:bg-gray-50">
                    {row.map((cell, cellIndex) => (
                      <td
                        key={cellIndex}
                        className="px-4 py-2 text-sm text-gray-700 whitespace-nowrap"
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
            <div className="mt-3 text-xs text-gray-500">
              Showing {queryResult.row_count} row{queryResult.row_count !== 1 ? 's' : ''}
            </div>
          </div>
        )}

        {queryResult && !isExecuting && viewMode === 'chart' && queryResult.data.rows.length > 0 && (
          <div className="h-full min-h-[300px]">
            <ChartRenderer
              type={chartType}
              data={queryResult}
              
              
              
            />
          </div>
        )}
      </div>
    </div>
  )
}
