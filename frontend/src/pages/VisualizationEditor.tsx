import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  Save,
  RefreshCw,
  Lock,
  Eye,
  EyeOff,
  AlertTriangle,
  Check,
  BarChart3,
  Clock,
  Palette,
  X,
} from 'lucide-react'
import clsx from 'clsx'
import { visualizationService } from '../services/visualizationService'
import { metabaseService } from '../services/metabaseService'
import ChartRenderer from '../components/ChartRenderer'
import CustomizationPanel from '../components/CustomizationPanel'
import type { VisualizationType, VisualizationCustomization, QueryResult } from '../types'

export default function VisualizationEditor() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [queryResult, setQueryResult] = useState<QueryResult | null>(null)
  const [isExecuting, setIsExecuting] = useState(false)
  const [executeError, setExecuteError] = useState<string | null>(null)
  const [showQuery, setShowQuery] = useState(true)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  // Editable fields
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [viewType, setViewType] = useState<VisualizationType>('table')
  const [localCustomization, setLocalCustomization] = useState<Partial<VisualizationCustomization>>({})

  // Fetch visualization
  const { data: visualization, isLoading, error } = useQuery({
    queryKey: ['visualization', id],
    queryFn: () => visualizationService.get(Number(id)),
    enabled: !!id,
  })

  // Initialize local state when visualization loads
  useEffect(() => {
    if (visualization) {
      setName(visualization.name)
      setDescription(visualization.description || '')
      setViewType(visualization.visualization_type)
      setLocalCustomization(visualization.customization || {})
    }
  }, [visualization])

  // Execute query when visualization loads
  useEffect(() => {
    if (visualization && !queryResult && !isExecuting) {
      executeQuery()
    }
  }, [visualization])

  // Clear success message after delay
  useEffect(() => {
    if (saveSuccess) {
      const timer = setTimeout(() => setSaveSuccess(false), 3000)
      return () => clearTimeout(timer)
    }
  }, [saveSuccess])

  // Execute the saved query
  const executeQuery = useCallback(async () => {
    if (!visualization) return

    setIsExecuting(true)
    setExecuteError(null)

    try {
      let result: QueryResult

      if (visualization.query_type === 'mbql' && visualization.mbql_query) {
        // The mbql_query is stored as the full dataset query object
        // It may have { database, type, query } structure already
        const storedQuery = visualization.mbql_query as unknown as { database?: number; type?: string; query?: object }

        if (storedQuery.database && storedQuery.query) {
          // Full query object format - send as is
          result = await metabaseService.executeQuery({
            database: storedQuery.database,
            type: 'query',
            query: storedQuery.query as any,
          })
        } else {
          // Just the MBQL query part
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

  // Save all changes
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!visualization) throw new Error('No visualization')

      // Update main visualization (name, description, type)
      await visualizationService.update(visualization.id, {
        name,
        description: description || undefined,
        visualization_type: viewType,
      })

      // Update customization
      await visualizationService.updateCustomization(visualization.id, localCustomization)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visualization', id] })
      queryClient.invalidateQueries({ queryKey: ['visualizations'] })
      setHasUnsavedChanges(false)
      setSaveSuccess(true)
    },
  })

  const handleChange = () => {
    setHasUnsavedChanges(true)
    setSaveSuccess(false)
  }

  const handleCustomizationChange = (updates: Partial<VisualizationCustomization>) => {
    setLocalCustomization(updates)
    handleChange()
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <div className="w-12 h-12 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-500 text-sm mt-4">Loading visualization...</p>
      </div>
    )
  }

  if (error || !visualization) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <div className="w-20 h-20 bg-red-100 rounded-2xl flex items-center justify-center mb-2">
          <X className="w-10 h-10 text-red-500" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900">Visualization not found</h2>
        <p className="text-gray-500">
          {error instanceof Error ? error.message : "The visualization you're looking for doesn't exist."}
        </p>
        <button
          onClick={() => navigate('/visualizations')}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white font-medium rounded-xl hover:bg-emerald-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Visualizations
        </button>
      </div>
    )
  }

  const customColors = localCustomization.custom_colors || [
    '#509EE3', '#88BF4D', '#A989C5', '#EF8C8C',
    '#F9D45C', '#F2A86F', '#98D9D9', '#7172AD'
  ]

  return (
    <div className="h-screen -m-4 lg:-m-6 flex flex-col bg-gray-50 overflow-hidden">
      {/* Modern Header */}
      <div className="flex-shrink-0 z-30 bg-white/80 backdrop-blur-xl border-b border-gray-200/80">
        <div className="flex items-center justify-between h-16 px-4 lg:px-6">
          {/* Left: Back + Title */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                if (hasUnsavedChanges) {
                  if (confirm('You have unsaved changes. Are you sure you want to leave?')) {
                    navigate(`/visualizations/${id}`)
                  }
                } else {
                  navigate(`/visualizations/${id}`)
                }
              }}
              className="p-2.5 hover:bg-gray-100 rounded-xl transition-colors group"
              title="Back to visualization"
            >
              <ArrowLeft className="w-5 h-5 text-gray-500 group-hover:text-gray-700" />
            </button>

            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl">
                <Palette className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">Edit Visualization</h1>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Clock className="w-3 h-3" />
                  <span>
                    {visualization.is_query_locked
                      ? 'Query locked - Editing appearance only'
                      : 'Edit appearance settings'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-3">
            {/* Success message */}
            {saveSuccess && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-sm">
                <Check className="w-4 h-4" />
                Saved successfully
              </div>
            )}

            {/* Unsaved changes indicator */}
            {hasUnsavedChanges && !saveSuccess && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 border border-amber-200 text-amber-700 text-xs font-medium rounded-lg">
                <AlertTriangle className="w-3.5 h-3.5" />
                Unsaved changes
              </div>
            )}

            {/* Refresh */}
            <button
              onClick={executeQuery}
              disabled={isExecuting}
              className="p-2.5 hover:bg-gray-100 rounded-xl text-gray-600 disabled:opacity-50 transition-colors"
              title="Refresh data"
            >
              <RefreshCw className={clsx('w-5 h-5', isExecuting && 'animate-spin')} />
            </button>

            {/* Toggle Query View */}
            <button
              onClick={() => setShowQuery(!showQuery)}
              className={clsx(
                'p-2.5 rounded-xl transition-colors',
                showQuery ? 'bg-gray-800 text-white' : 'hover:bg-gray-100 text-gray-600'
              )}
              title={showQuery ? 'Hide query' : 'Show query'}
            >
              {showQuery ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>

            {/* Save Button */}
            <button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending || !hasUnsavedChanges}
              className={clsx(
                'flex items-center gap-2 px-5 py-2.5 font-medium rounded-xl transition-all',
                hasUnsavedChanges && !saveMutation.isPending
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:from-emerald-600 hover:to-teal-700 shadow-lg shadow-emerald-500/25'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              )}
            >
              {saveMutation.isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Query Preview Panel (Read-Only) */}
      {showQuery && (
        <div className="flex-shrink-0 bg-gray-900 border-b border-gray-700">
          <div className="px-6 py-4">
            <div className="flex items-center gap-2 mb-3">
              <Lock className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-medium text-amber-400 uppercase tracking-wider">
                Query (Read-Only - Locked)
              </span>
            </div>
            {visualization.mbql_query && (
              <pre className="text-sm text-emerald-400 overflow-x-auto font-mono max-h-32 overflow-y-auto bg-gray-800/50 rounded-xl p-4">
                {JSON.stringify(visualization.mbql_query, null, 2)}
              </pre>
            )}
            {visualization.native_query && (
              <pre className="text-sm text-emerald-400 overflow-x-auto font-mono max-h-32 overflow-y-auto bg-gray-800/50 rounded-xl p-4">
                {visualization.native_query}
              </pre>
            )}
          </div>
        </div>
      )}

      {/* Error Banner */}
      {(executeError || saveMutation.error) && (
        <div className="flex-shrink-0 mx-6 mt-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-3">
          <X className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm">
            {executeError || (saveMutation.error instanceof Error ? saveMutation.error.message : 'Save failed')}
          </span>
          <button
            onClick={() => setExecuteError(null)}
            className="ml-auto p-1.5 hover:bg-red-100 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex min-h-0 p-4 lg:p-6 gap-6 overflow-hidden">
        {/* Left Panel: Settings - Only this panel scrolls */}
        <div className="w-80 flex-shrink-0 overflow-y-auto">
          <div className="space-y-4">
          {/* Basic Info */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Basic Info</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value)
                    handleChange()
                  }}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent focus:bg-white transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => {
                    setDescription(e.target.value)
                    handleChange()
                  }}
                  placeholder="Add a description..."
                  rows={3}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent focus:bg-white transition-all resize-none"
                />
              </div>
            </div>
          </div>

          {/* Visualization Type */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Visualization Type</h3>
            <div className="grid grid-cols-3 gap-2">
              {(['table', 'bar', 'line', 'area', 'pie'] as VisualizationType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => {
                    setViewType(type)
                    handleChange()
                  }}
                  className={clsx(
                    'px-3 py-2.5 text-sm font-medium rounded-xl border transition-all capitalize',
                    viewType === type
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  )}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Customization */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">Appearance</h3>
              <p className="text-xs text-gray-500 mt-0.5">Colors, labels, and display options</p>
            </div>
            <CustomizationPanel
              customization={localCustomization}
              visualizationType={viewType}
              onChange={handleCustomizationChange}
              columns={queryResult?.data?.cols || []}
            />
          </div>
          </div>
        </div>

        {/* Right Panel: Preview */}
        <div className="flex-1 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 rounded-xl">
                <BarChart3 className="w-5 h-5 text-emerald-600" />
              </div>
              <h3 className="font-semibold text-gray-900">Preview</h3>
            </div>
            {queryResult && (
              <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-lg">
                {queryResult.row_count} row{queryResult.row_count !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          <div className="flex-1 p-5">
            {isExecuting ? (
              <div className="flex flex-col items-center justify-center h-full">
                <div className="w-12 h-12 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mb-4" />
                <span className="text-gray-500">Executing query...</span>
              </div>
            ) : queryResult ? (
              <div className="h-full">
                <ChartRenderer
                  type={viewType}
                  data={queryResult}
                  colors={customColors}
                  showLegend={localCustomization.show_legend !== false}
                  showGrid={localCustomization.show_grid !== false}
                  xAxisLabel={localCustomization.x_axis_label || undefined}
                  yAxisLabel={localCustomization.y_axis_label || undefined}
                  customLabels={localCustomization.custom_labels || {}}
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
                  <BarChart3 className="w-8 h-8 text-gray-400" />
                </div>
                <p className="font-medium text-gray-900 mb-2">No data available</p>
                <p className="text-sm text-gray-500 mb-4">Run the query to see your data</p>
                <button
                  onClick={executeQuery}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-medium rounded-xl hover:from-emerald-600 hover:to-teal-700 transition-all shadow-lg shadow-emerald-500/25"
                >
                  <RefreshCw className="w-4 h-4" />
                  Run Query
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
