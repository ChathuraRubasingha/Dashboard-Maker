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
} from 'lucide-react'
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
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-gray-500">Loading visualization...</span>
        </div>
      </div>
    )
  }

  if (error || !visualization) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <div className="text-red-500 text-lg">
          {error instanceof Error ? error.message : 'Visualization not found'}
        </div>
        <button
          onClick={() => navigate('/visualizations')}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
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
    <div className="min-h-screen -m-4 lg:-m-6 flex flex-col bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white border-b border-gray-200 px-4 lg:px-6">
        <div className="flex items-center justify-between h-14">
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
              className="p-2 hover:bg-gray-100 rounded-lg"
              title="Back to visualization"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">Edit Visualization</h1>
              <p className="text-xs text-gray-500">
                {visualization.is_query_locked
                  ? 'Query is locked. You can only edit appearance settings.'
                  : 'Edit appearance settings for this visualization'}
              </p>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-3">
            {/* Success message */}
            {saveSuccess && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-sm">
                <Check className="w-4 h-4" />
                Saved successfully
              </div>
            )}

            {/* Unsaved changes indicator */}
            {hasUnsavedChanges && !saveSuccess && (
              <span className="text-sm text-amber-600 flex items-center gap-1">
                <AlertTriangle className="w-4 h-4" />
                Unsaved changes
              </span>
            )}

            {/* Refresh */}
            <button
              onClick={executeQuery}
              disabled={isExecuting}
              className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 disabled:opacity-50"
              title="Refresh data"
            >
              <RefreshCw className={`w-5 h-5 ${isExecuting ? 'animate-spin' : ''}`} />
            </button>

            {/* Toggle Query View */}
            <button
              onClick={() => setShowQuery(!showQuery)}
              className={`p-2 rounded-lg transition-colors ${
                showQuery ? 'bg-gray-800 text-white' : 'hover:bg-gray-100 text-gray-600'
              }`}
              title={showQuery ? 'Hide query' : 'Show query'}
            >
              {showQuery ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>

            {/* Save Button */}
            <button
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending || !hasUnsavedChanges}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saveMutation.isPending ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {saveMutation.isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>

      {/* Query Preview Panel (Read-Only) */}
      {showQuery && (
        <div className="bg-gray-900 border-b border-gray-700">
          <div className="px-6 py-3">
            <div className="flex items-center gap-2 mb-2">
              <Lock className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-medium text-amber-400 uppercase tracking-wider">
                Query (Read-Only - Locked)
              </span>
            </div>
            {visualization.mbql_query && (
              <pre className="text-sm text-green-400 overflow-x-auto font-mono max-h-32 overflow-y-auto">
                {JSON.stringify(visualization.mbql_query, null, 2)}
              </pre>
            )}
            {visualization.native_query && (
              <pre className="text-sm text-green-400 overflow-x-auto font-mono max-h-32 overflow-y-auto">
                {visualization.native_query}
              </pre>
            )}
          </div>
        </div>
      )}

      {/* Error Banner */}
      {(executeError || saveMutation.error) && (
        <div className="mx-6 mt-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center gap-3">
          <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-sm">
            {executeError || (saveMutation.error instanceof Error ? saveMutation.error.message : 'Save failed')}
          </span>
          <button
            onClick={() => setExecuteError(null)}
            className="ml-auto p-1 hover:bg-red-100 rounded"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden p-4 lg:p-6 gap-6">
        {/* Left Panel: Settings */}
        <div className="w-80 flex-shrink-0 space-y-4 overflow-y-auto">
          {/* Basic Info */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="font-semibold text-gray-900 mb-4">Basic Info</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value)
                    handleChange()
                  }}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
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
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>
            </div>
          </div>

          {/* Visualization Type */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="font-semibold text-gray-900 mb-4">Visualization Type</h3>
            <div className="grid grid-cols-3 gap-2">
              {(['table', 'bar', 'line', 'area', 'pie'] as VisualizationType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => {
                    setViewType(type)
                    handleChange()
                  }}
                  className={`px-3 py-2 text-sm font-medium rounded-lg border transition-colors capitalize ${
                    viewType === type
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Customization */}
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">Appearance</h3>
              <p className="text-xs text-gray-500 mt-0.5">Colors, labels, and display options</p>
            </div>
            <CustomizationPanel
              customization={localCustomization}
              visualizationType={viewType}
              onChange={handleCustomizationChange}
            />
          </div>
        </div>

        {/* Right Panel: Preview */}
        <div className="flex-1 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Preview</h3>
            {queryResult && (
              <span className="text-sm text-gray-500">
                {queryResult.row_count} row{queryResult.row_count !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          <div className="flex-1 p-4">
            {isExecuting ? (
              <div className="flex flex-col items-center justify-center h-full">
                <div className="w-12 h-12 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
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
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <p>No data available</p>
                <button
                  onClick={executeQuery}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
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
