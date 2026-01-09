import { useQuery } from '@tanstack/react-query'
import { Settings } from 'lucide-react'
import { useState } from 'react'
import { visualizationService } from '../../services/visualizationService'
import { metabaseService } from '../../services/metabaseService'
import ChartRenderer from '../ChartRenderer'
import type { VisualizationBlockConfig } from '../../types'

interface VisualizationBlockProps {
  config: VisualizationBlockConfig
  isEditing: boolean
  onUpdate: (config: VisualizationBlockConfig) => void
}

export default function VisualizationBlock({
  config,
  isEditing,
  onUpdate,
}: VisualizationBlockProps) {
  const [showSettings, setShowSettings] = useState(false)

  // Fetch visualization
  const { data: visualization, isLoading: isLoadingViz } = useQuery({
    queryKey: ['visualization', config.visualization_id],
    queryFn: () => visualizationService.get(config.visualization_id),
    enabled: !!config.visualization_id,
  })

  // Execute query - include visualization data in queryKey to ensure refetch when it changes
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

        console.log('VisualizationBlock: No valid query found', { visualization })
        return null
      } catch (err) {
        console.error('VisualizationBlock: Query execution failed', err)
        throw err
      }
    },
    enabled: !!visualization && !!(visualization.native_query || visualization.mbql_query),
  })

  const isLoading = isLoadingViz || isLoadingQuery

  // Debug logging
  if (queryError) {
    console.error('VisualizationBlock query error:', queryError)
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      {config.show_title && visualization && (
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="font-medium text-gray-900">{visualization.name}</h3>
            {config.show_description && visualization.description && (
              <p className="text-sm text-gray-500 mt-0.5">{visualization.description}</p>
            )}
          </div>
          {isEditing && (
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-1.5 hover:bg-gray-100 rounded"
            >
              <Settings className="w-4 h-4 text-gray-400" />
            </button>
          )}
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
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={config.show_description}
              onChange={(e) => onUpdate({ ...config, show_description: e.target.checked })}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Show description</span>
          </label>
          <div>
            <label className="block text-sm text-gray-700 mb-1">Height</label>
            <select
              value={config.height}
              onChange={(e) => onUpdate({ ...config, height: Number(e.target.value) })}
              className="w-full px-3 py-1.5 border rounded-lg text-sm"
            >
              <option value={200}>Small (200px)</option>
              <option value={300}>Medium (300px)</option>
              <option value={400}>Large (400px)</option>
              <option value={500}>Extra Large (500px)</option>
            </select>
          </div>
        </div>
      )}

      {/* Chart area */}
      <div style={{ height: config.height }} className="p-4">
        {isLoading ? (
          <div className="h-full flex items-center justify-center">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !visualization ? (
          <div className="h-full flex items-center justify-center text-gray-500">
            Visualization not found
          </div>
        ) : queryError ? (
          <div className="h-full flex flex-col items-center justify-center text-red-500 px-4 text-center">
            <p className="font-medium">Failed to load data</p>
            <p className="text-sm mt-1">{queryError instanceof Error ? queryError.message : 'Unknown error'}</p>
          </div>
        ) : !queryResult ? (
          <div className="h-full flex items-center justify-center text-gray-500">
            No data available
          </div>
        ) : (
          <ChartRenderer
            type={visualization.visualization_type}
            data={queryResult}
            colors={visualization.customization?.custom_colors}
            showLegend={visualization.customization?.show_legend ?? true}
            showGrid={visualization.customization?.show_grid ?? true}
            xAxisLabel={visualization.customization?.x_axis_label ?? undefined}
            yAxisLabel={visualization.customization?.y_axis_label ?? undefined}
          />
        )}
      </div>
    </div>
  )
}
