import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { MoreVertical, Maximize2, Minimize2, RefreshCw, Trash2, Settings, ExternalLink } from 'lucide-react'
import clsx from 'clsx'
import type { DashboardCard as DashboardCardType, QueryResult, VisualizationType } from '../types'
import { metabaseService } from '../services/metabaseService'
import { visualizationService } from '../services/visualizationService'
import ChartRenderer from './ChartRenderer'

interface Props {
  card: DashboardCardType
  isEditing: boolean
  onRemove?: () => void
  onSettings?: () => void
}

export default function DashboardCard({ card, isEditing, onRemove, onSettings }: Props) {
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<QueryResult | null>(null)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  // For local visualizations
  const [visualization, setVisualization] = useState<any>(null)
  const [viewType, setViewType] = useState<VisualizationType>('table')
  const [customColors, setCustomColors] = useState<string[]>([
    '#509EE3', '#88BF4D', '#A989C5', '#EF8C8C',
    '#F9D45C', '#F2A86F', '#98D9D9', '#7172AD'
  ])

  // Determine if this card uses a local visualization or Metabase question
  const isLocalVisualization = !!card.visualization_id
  const isMetabaseQuestion = !!card.metabase_question_id

  // Fetch data for the card
  const fetchData = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      if (isLocalVisualization && card.visualization_id) {
        // Fetch local visualization
        const viz = await visualizationService.get(card.visualization_id)
        setVisualization(viz)
        setViewType(viz.visualization_type)

        // Set custom colors from customization
        if (viz.customization?.custom_colors) {
          setCustomColors(viz.customization.custom_colors)
        }

        // Execute the visualization's query
        let result: QueryResult

        if (viz.query_type === 'mbql' && viz.mbql_query) {
          const storedQuery = viz.mbql_query as unknown as {
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
              database: viz.database_id!,
              type: 'query',
              query: viz.mbql_query,
            })
          }
        } else if (viz.query_type === 'native' && viz.native_query) {
          result = await metabaseService.executeNativeQuery(
            viz.database_id!,
            viz.native_query
          )
        } else {
          throw new Error('Invalid query configuration')
        }

        setData(result)
      } else if (isMetabaseQuestion && card.metabase_question_id) {
        // Fetch Metabase question
        const result = await metabaseService.executeQuestion(card.metabase_question_id)
        setData(result)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
      console.error('Error fetching card data:', err)
    } finally {
      setIsLoading(false)
    }
  }, [card.visualization_id, card.metabase_question_id, isLocalVisualization, isMetabaseQuestion])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleNavigate = () => {
    if (isLocalVisualization && card.visualization_id) {
      navigate(`/visualizations/${card.visualization_id}`)
    }
  }

  const cardStyle = card.custom_styling || {
    border_radius: 8,
    border_color: '#e2e8f0',
    border_width: 1,
    shadow: 'sm',
    background_color: '#ffffff',
    padding: 16,
  }

  const shadowClasses = {
    none: '',
    sm: 'shadow-sm',
    md: 'shadow-md',
    lg: 'shadow-lg',
  }

  // Get display title
  const getTitle = () => {
    if (card.title_override) return card.title_override
    if (visualization) return visualization.name
    if (card.metabase_question_id) return `Question ${card.metabase_question_id}`
    return 'Untitled'
  }

  // Customization from visualization
  const customization = visualization?.customization || {}

  // Fullscreen modal
  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-8">
        <div className="bg-white rounded-xl w-full h-full max-w-7xl max-h-[90vh] flex flex-col">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{getTitle()}</h2>
              {visualization?.description && (
                <p className="text-sm text-gray-500">{visualization.description}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={fetchData}
                disabled={isLoading}
                className="p-2 hover:bg-gray-100 rounded-lg"
                title="Refresh"
              >
                <RefreshCw className={clsx('w-5 h-5 text-gray-600', isLoading && 'animate-spin')} />
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
            {data && (
              <ChartRenderer
                type={viewType}
                data={data}
                colors={customColors}
                showLegend={customization.show_legend !== false}
                showGrid={customization.show_grid !== false}
                xAxisLabel={customization.x_axis_label || undefined}
                yAxisLabel={customization.y_axis_label || undefined}
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
        isEditing && 'cursor-move'
      )}
      style={{
        borderRadius: cardStyle.border_radius,
        borderWidth: cardStyle.border_width,
        borderColor: cardStyle.border_color,
        borderStyle: 'solid',
        backgroundColor: cardStyle.background_color,
      }}
    >
      {/* Header */}
      {card.show_title && (
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h3 className="text-sm font-medium text-gray-900 truncate">
            {getTitle()}
          </h3>
          <div className="relative flex items-center gap-1">
            <button
              onClick={() => fetchData()}
              className="p-1 rounded hover:bg-gray-100"
              title="Refresh"
            >
              <RefreshCw className={clsx('w-4 h-4 text-gray-500', isLoading && 'animate-spin')} />
            </button>
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-1 rounded hover:bg-gray-100"
            >
              <MoreVertical className="w-4 h-4 text-gray-500" />
            </button>

            {/* Dropdown menu */}
            {isMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setIsMenuOpen(false)}
                />
                <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                  <button
                    onClick={() => {
                      setIsFullscreen(true)
                      setIsMenuOpen(false)
                    }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <Maximize2 className="w-4 h-4" />
                    Fullscreen
                  </button>
                  {isLocalVisualization && (
                    <button
                      onClick={() => {
                        handleNavigate()
                        setIsMenuOpen(false)
                      }}
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Open Full View
                    </button>
                  )}
                  {isEditing && (
                    <>
                      <button
                        onClick={() => {
                          onSettings?.()
                          setIsMenuOpen(false)
                        }}
                        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        <Settings className="w-4 h-4" />
                        Settings
                      </button>
                      <button
                        onClick={() => {
                          onRemove?.()
                          setIsMenuOpen(false)
                        }}
                        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                        Remove
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-auto" style={{ padding: cardStyle.padding }}>
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <p className="text-sm text-red-600">{error}</p>
            <button
              onClick={fetchData}
              className="mt-2 text-sm text-blue-600 hover:underline"
            >
              Try again
            </button>
          </div>
        ) : data ? (
          <ChartRenderer
            type={viewType}
            data={data}
            colors={customColors}
            showLegend={customization.show_legend !== false}
            showGrid={customization.show_grid !== false}
            xAxisLabel={customization.x_axis_label || undefined}
            yAxisLabel={customization.y_axis_label || undefined}
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-gray-500">No data</p>
          </div>
        )}
      </div>
    </div>
  )
}
