import { useQuery } from '@tanstack/react-query'
import { Settings, Download } from 'lucide-react'
import { useState } from 'react'
import { visualizationService } from '../../services/visualizationService'
import { metabaseService } from '../../services/metabaseService'
import type { TableBlockConfig } from '../../types'

interface TableBlockProps {
  config: TableBlockConfig
  isEditing: boolean
  onUpdate: (config: TableBlockConfig) => void
}

export default function TableBlock({ config, isEditing, onUpdate }: TableBlockProps) {
  const [showSettings, setShowSettings] = useState(false)

  // Fetch visualization
  const { data: visualization, isLoading: isLoadingViz } = useQuery({
    queryKey: ['visualization', config.visualization_id],
    queryFn: () => visualizationService.get(config.visualization_id),
    enabled: !!config.visualization_id,
  })

  // Execute query
  const { data: queryResult, isLoading: isLoadingQuery, error: queryError } = useQuery({
    queryKey: ['visualization-query', config.visualization_id, visualization?.database_id],
    queryFn: async () => {
      if (!visualization) return null

      try {
        // Handle MBQL query
        if (visualization.query_type === 'mbql' && visualization.mbql_query) {
          // Check if mbql_query contains the full dataset query structure
          const storedQuery = visualization.mbql_query as unknown as {
            database?: number
            type?: string
            query?: object
          }

          if (storedQuery.database && storedQuery.query) {
            // Full dataset query object stored
            return await metabaseService.executeQuery({
              database: storedQuery.database,
              type: 'query',
              query: storedQuery.query as any,
            })
          } else {
            // Just the MBQL query object
            return await metabaseService.executeQuery({
              database: visualization.database_id!,
              type: 'query',
              query: visualization.mbql_query,
            })
          }
        }

        // Handle native query
        if (visualization.query_type === 'native' && visualization.native_query) {
          return await metabaseService.executeNativeQuery(
            visualization.database_id!,
            visualization.native_query
          )
        }

        return null
      } catch (err) {
        console.error('TableBlock: Query execution failed', err)
        throw err
      }
    },
    enabled: !!visualization && !!(visualization.native_query || visualization.mbql_query),
  })

  const isLoading = isLoadingViz || isLoadingQuery

  // Get rows to display (limit for preview)
  const displayRows = queryResult?.data.rows.slice(0, config.max_preview_rows) || []
  const totalRows = queryResult?.data.rows.length || 0
  const hasMoreRows = totalRows > config.max_preview_rows

  // Download as CSV
  const handleDownloadCSV = () => {
    if (!queryResult) return

    const headers = queryResult.data.cols.map((c) => c.display_name)
    const rows = queryResult.data.rows

    const csvContent = [
      headers.join(','),
      ...rows.map((row) =>
        row
          .map((cell) => {
            const cellStr = String(cell ?? '')
            // Escape quotes and wrap in quotes if contains comma
            if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
              return `"${cellStr.replace(/"/g, '""')}"`
            }
            return cellStr
          })
          .join(',')
      ),
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `${visualization?.name || 'data'}.csv`
    link.click()
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      {config.show_title && visualization && (
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-medium text-gray-900">{visualization.name}</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadCSV}
              disabled={!queryResult}
              className="flex items-center gap-1 px-2 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded disabled:opacity-50"
              title="Download CSV"
            >
              <Download className="w-4 h-4" />
              CSV
            </button>
            {isEditing && (
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="p-1.5 hover:bg-gray-100 rounded"
              >
                <Settings className="w-4 h-4 text-gray-400" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Settings panel */}
      {showSettings && isEditing && (
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 space-y-3">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={config.show_title}
              onChange={(e) => onUpdate({ ...config, show_title: e.target.checked })}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Show title</span>
          </label>
          <div>
            <label className="block text-sm text-gray-700 mb-1">Preview rows</label>
            <select
              value={config.max_preview_rows}
              onChange={(e) => onUpdate({ ...config, max_preview_rows: Number(e.target.value) })}
              className="w-full px-3 py-1.5 border rounded-lg text-sm"
            >
              <option value={25}>25 rows</option>
              <option value={50}>50 rows</option>
              <option value={100}>100 rows</option>
              <option value={200}>200 rows</option>
            </select>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        {isLoading ? (
          <div className="h-48 flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !visualization ? (
          <div className="h-48 flex items-center justify-center text-gray-500">
            Visualization not found
          </div>
        ) : queryError ? (
          <div className="h-48 flex flex-col items-center justify-center text-red-500 px-4 text-center">
            <p className="font-medium">Failed to load data</p>
            <p className="text-sm mt-1">{queryError instanceof Error ? queryError.message : 'Unknown error'}</p>
          </div>
        ) : !queryResult || queryResult.data.rows.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-gray-500">
            No data available
          </div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  {queryResult.data.cols.map((col, i) => (
                    <th
                      key={i}
                      className="px-4 py-2 text-left font-medium text-gray-700 whitespace-nowrap"
                    >
                      {col.display_name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayRows.map((row, rowIndex) => (
                  <tr
                    key={rowIndex}
                    className="border-b border-gray-100 hover:bg-gray-50"
                  >
                    {row.map((cell, cellIndex) => (
                      <td
                        key={cellIndex}
                        className="px-4 py-2 text-gray-600 whitespace-nowrap"
                      >
                        {formatCell(cell, queryResult.data.cols[cellIndex]?.base_type)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {hasMoreRows && (
              <div className="px-4 py-2 text-sm text-gray-500 bg-gray-50 border-t">
                Showing {config.max_preview_rows} of {totalRows} rows.
                Download CSV for complete data.
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function formatCell(value: unknown, baseType?: string): string {
  if (value === null || value === undefined) return '-'

  if (baseType?.includes('Float') || baseType?.includes('Decimal')) {
    return typeof value === 'number' ? value.toLocaleString() : String(value)
  }

  if (baseType?.includes('Integer') || baseType?.includes('BigInteger')) {
    return typeof value === 'number' ? value.toLocaleString() : String(value)
  }

  if (baseType?.includes('Date') || baseType?.includes('DateTime')) {
    try {
      return new Date(String(value)).toLocaleDateString()
    } catch {
      return String(value)
    }
  }

  return String(value)
}
