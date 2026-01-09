import { useState, useEffect, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { RefreshCw, Maximize2, Minimize2, MoreVertical, ExternalLink, Trash2 } from 'lucide-react'
import clsx from 'clsx'
import { visualizationService } from '../services/visualizationService'
import { metabaseService } from '../services/metabaseService'
import ChartRenderer from './ChartRenderer'
import type { QueryResult, VisualizationType } from '../types'

interface VisualizationCardProps {
  visualizationId: number
  showTitle?: boolean
  showDescription?: boolean
  height?: string | number
  isEditing?: boolean
  onRemove?: () => void
  onNavigate?: () => void
  className?: string
  // Card styling overrides
  titleOverride?: string
  customStyling?: {
    border_radius?: number
    border_color?: string
    border_width?: number
    shadow?: 'none' | 'sm' | 'md' | 'lg'
    background_color?: string
    padding?: number
  }
}

export default function VisualizationCard({
  visualizationId,
  showTitle = true,
  showDescription = false,
  height = '100%',
  isEditing = false,
  onRemove,
  onNavigate,
  className,
  titleOverride,
  customStyling,
}: VisualizationCardProps) {
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null)
  const [isExecuting, setIsExecuting] = useState(false)
  const [executeError, setExecuteError] = useState<string | null>(null)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Fetch visualization metadata
  const { data: visualization, isLoading, error } = useQuery({
    queryKey: ['visualization', visualizationId],
    queryFn: () => visualizationService.get(visualizationId),
    enabled: !!visualizationId,
  })

  // Execute query when visualization loads
  const executeQuery = useCallback(async () => {
    if (!visualization) return

    setIsExecuting(true)
    setExecuteError(null)

    try {
      let result: QueryResult

      if (visualization.query_type === 'mbql' && visualization.mbql_query) {
        const storedQuery = visualization.mbql_query as unknown as {
          database?: number
          type?: string
          query?: object
        }

        if (storedQuery.database && storedQuery.query) {
          result = await metabaseService.executeQuery({
            database: storedQuery.database,
            type: 'query',
            query: storedQuery.query as any,
          })
        } else {
          result = await metabaseService.executeQuery({
            database: visualization.database_id!,
            type: 'query',
            query: visualization.mbql_query,
          })
        }
      } else if (visualization.query_type === 'native' && visualization.native_query) {
        result = await metabaseService.executeNativeQuery(
          visualization.database_id!,
          visualization.native_query
        )
      } else {
        throw new Error('Invalid query configuration')
      }

      setQueryResult(result)
    } catch (err) {
      setExecuteError(err instanceof Error ? err.message : 'Failed to execute query')
    } finally {
      setIsExecuting(false)
    }
  }, [visualization])

  // Execute query when visualization loads
  useEffect(() => {
    if (visualization && !queryResult && !isExecuting) {
      executeQuery()
    }
  }, [visualization, queryResult, isExecuting, executeQuery])

  // Styling
  const cardStyle = customStyling || {
    border_radius: 8,
    border_color: '#e2e8f0',
    border_width: 1,
    shadow: 'sm' as const,
    background_color: '#ffffff',
    padding: 16,
  }

  const shadowClasses = {
    none: '',
    sm: 'shadow-sm',
    md: 'shadow-md',
    lg: 'shadow-lg',
  }

  // Get customization from visualization
  const customization = visualization?.customization || {}
  const customColors = customization.custom_colors || [
    '#509EE3', '#88BF4D', '#A989C5', '#EF8C8C',
    '#F9D45C', '#F2A86F', '#98D9D9', '#7172AD'
  ]
  const viewType: VisualizationType = visualization?.visualization_type || 'table'

  // Fullscreen modal
  if (isFullscreen && visualization) {
    return (
      <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-8">
        <div className="bg-white rounded-xl w-full h-full max-w-7xl max-h-[90vh] flex flex-col">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {titleOverride || visualization.name}
              </h2>
              {showDescription && visualization.description && (
                <p className="text-sm text-gray-500">{visualization.description}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={executeQuery}
                disabled={isExecuting}
                className="p-2 hover:bg-gray-100 rounded-lg"
                title="Refresh"
              >
                <RefreshCw className={clsx('w-5 h-5 text-gray-600', isExecuting && 'animate-spin')} />
              </button>
              <button
                onClick={() => setIsFullscreen(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
                title="Exit fullscreen"
              >
                <Minimize2 className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>
          <div className="flex-1 p-6 overflow-hidden">
            {queryResult && (
              <ChartRenderer
                type={viewType}
                data={queryResult}
                colors={customColors}
                showLegend={customization.show_legend !== false}
                showGrid={customization.show_grid !== false}
                xAxisLabel={customization.x_axis_label || undefined}
                yAxisLabel={customization.y_axis_label || undefined}
                customLabels={customization.custom_labels || {}}
              />
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className={clsx(
        'h-full flex flex-col overflow-hidden',
        shadowClasses[cardStyle.shadow as keyof typeof shadowClasses] || 'shadow-sm',
        isEditing && 'cursor-move',
        className
      )}
      style={{
        height,
        borderRadius: cardStyle.border_radius,
        borderWidth: cardStyle.border_width,
        borderColor: cardStyle.border_color,
        borderStyle: 'solid',
        backgroundColor: cardStyle.background_color,
      }}
    >
      {/* Header */}
      {showTitle && (
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-gray-900 truncate">
              {isLoading ? 'Loading...' : titleOverride || visualization?.name || 'Visualization'}
            </h3>
            {showDescription && visualization?.description && (
              <p className="text-xs text-gray-500 truncate mt-0.5">{visualization.description}</p>
            )}
          </div>
          <div className="relative flex items-center gap-1 shrink-0 ml-2">
            <button
              onClick={(e) => {
                e.stopPropagation()
                executeQuery()
              }}
              disabled={isExecuting}
              className="p-1 rounded hover:bg-gray-100"
              title="Refresh"
            >
              <RefreshCw className={clsx('w-4 h-4 text-gray-500', isExecuting && 'animate-spin')} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                setIsMenuOpen(!isMenuOpen)
              }}
              className="p-1 rounded hover:bg-gray-100"
            >
              <MoreVertical className="w-4 h-4 text-gray-500" />
            </button>

            {/* Dropdown menu */}
            {isMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={(e) => {
                    e.stopPropagation()
                    setIsMenuOpen(false)
                  }}
                />
                <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setIsFullscreen(true)
                      setIsMenuOpen(false)
                    }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <Maximize2 className="w-4 h-4" />
                    Fullscreen
                  </button>
                  {onNavigate && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onNavigate()
                        setIsMenuOpen(false)
                      }}
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Open Full View
                    </button>
                  )}
                  {isEditing && onRemove && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onRemove()
                        setIsMenuOpen(false)
                      }}
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                      Remove
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-hidden" style={{ padding: cardStyle.padding }}>
        {isLoading || isExecuting ? (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-gray-500 mt-2">
              {isLoading ? 'Loading...' : 'Executing query...'}
            </span>
          </div>
        ) : error || executeError ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <p className="text-sm text-red-600">
              {error instanceof Error ? error.message : executeError || 'Failed to load'}
            </p>
            <button
              onClick={executeQuery}
              className="mt-2 text-sm text-blue-600 hover:underline"
            >
              Try again
            </button>
          </div>
        ) : queryResult ? (
          <div className="h-full">
            <ChartRenderer
              type={viewType}
              data={queryResult}
              colors={customColors}
              showLegend={customization.show_legend !== false}
              showGrid={customization.show_grid !== false}
              xAxisLabel={customization.x_axis_label || undefined}
              yAxisLabel={customization.y_axis_label || undefined}
              customLabels={customization.custom_labels || {}}
            />
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-gray-500">No data</p>
          </div>
        )}
      </div>
    </div>
  )
}
