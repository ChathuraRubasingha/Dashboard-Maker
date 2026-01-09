import { useQuery } from '@tanstack/react-query'
import { Settings, Download, Edit2 } from 'lucide-react'
import { useState } from 'react'
import clsx from 'clsx'
import { visualizationService } from '../../services/visualizationService'
import { metabaseService } from '../../services/metabaseService'
import type { TableBlockConfig, QueryResultColumn } from '../../types'

interface TableBlockProps {
  config: TableBlockConfig
  isEditing: boolean
  onUpdate: (config: TableBlockConfig) => void
}

export default function TableBlock({ config, isEditing, onUpdate }: TableBlockProps) {
  const [showSettings, setShowSettings] = useState(false)
  const [showColumnLabelEditor, setShowColumnLabelEditor] = useState(false)

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
        if (visualization.query_type === 'mbql' && visualization.mbql_query) {
          const storedQuery = visualization.mbql_query as unknown as {
            database?: number
            type?: string
            query?: object
          }

          if (storedQuery.database && storedQuery.query) {
            return await metabaseService.executeQuery({
              database: storedQuery.database,
              type: 'query',
              query: storedQuery.query as any,
            })
          } else {
            return await metabaseService.executeQuery({
              database: visualization.database_id!,
              type: 'query',
              query: visualization.mbql_query,
            })
          }
        }

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
  const columns = queryResult?.data.cols || []
  const rows = queryResult?.data.rows || []

  // Get column display name (custom or original)
  // Priority: report-level override > visualization customization > original display name
  const getColumnLabel = (col: QueryResultColumn) => {
    return (
      config.custom_column_labels?.[col.name] ||
      visualization?.customization?.custom_labels?.[col.name] ||
      col.display_name
    )
  }

  // Download as CSV with custom headers
  const handleDownloadCSV = () => {
    if (!queryResult) return

    const headers = columns.map((c) => getColumnLabel(c))

    const csvContent = [
      headers.join(','),
      ...rows.map((row) =>
        row
          .map((cell) => {
            const cellStr = String(cell ?? '')
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
                className={clsx(
                  'p-1.5 rounded transition-colors',
                  showSettings ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100 text-gray-400'
                )}
              >
                <Settings className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Settings panel */}
      {showSettings && isEditing && (
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 space-y-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={config.show_title}
              onChange={(e) => onUpdate({ ...config, show_title: e.target.checked })}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Show title</span>
          </label>

          {/* Column Label Editor */}
          <div>
            <button
              onClick={() => setShowColumnLabelEditor(!showColumnLabelEditor)}
              className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
            >
              <Edit2 className="w-4 h-4" />
              {showColumnLabelEditor ? 'Hide' : 'Edit'} Column Labels
            </button>

            {showColumnLabelEditor && columns.length > 0 && (
              <div className="mt-3 border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="px-3 py-2 text-left text-gray-600">Original</th>
                      <th className="px-3 py-2 text-left text-gray-600">Custom Label</th>
                    </tr>
                  </thead>
                  <tbody>
                    {columns.map((col) => (
                      <tr key={col.name} className="border-t border-gray-100">
                        <td className="px-3 py-2 text-gray-500">{col.display_name}</td>
                        <td className="px-3 py-2">
                          <input
                            type="text"
                            value={config.custom_column_labels?.[col.name] || ''}
                            onChange={(e) => {
                              const newLabels = { ...config.custom_column_labels }
                              if (e.target.value.trim()) {
                                newLabels[col.name] = e.target.value
                              } else {
                                delete newLabels[col.name]
                              }
                              onUpdate({ ...config, custom_column_labels: newLabels })
                            }}
                            placeholder={col.display_name}
                            className="w-full px-2 py-1 border rounded text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
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
            <p className="text-sm mt-1">
              {queryError instanceof Error ? queryError.message : 'Unknown error'}
            </p>
          </div>
        ) : !queryResult || rows.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-gray-500">
            No data available
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {columns.map((col) => (
                  <th
                    key={col.name}
                    className="px-4 py-2 text-left font-medium text-gray-700 whitespace-nowrap"
                  >
                    {getColumnLabel(col)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr key={rowIndex} className="border-b border-gray-100 hover:bg-gray-50">
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex} className="px-4 py-2 text-gray-600 whitespace-nowrap">
                      {formatCell(cell, columns[cellIndex]?.base_type)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
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
