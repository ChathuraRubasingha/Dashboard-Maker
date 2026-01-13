import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  ArrowRight,
  Download,
  Share2,
  Plus,
  Trash2,
  FileSpreadsheet,
  BarChart3,
  X,
  Check,
  ChevronDown,
  ChevronUp,
  Sparkles,
  CheckCircle2,
  Copy,
  Loader2,
  AlertCircle,
  FileText,
  Database,
  Settings,
  FileDown,
} from 'lucide-react'
import clsx from 'clsx'
import { v4 as uuidv4 } from 'uuid'
import { excelService } from '../services/excelService'
import { visualizationService } from '../services/visualizationService'
import type { ExcelDataSourceMapping, ColumnMapping, Visualization } from '../types'

// Step indicator component
function StepIndicator({
  currentStep,
  steps,
}: {
  currentStep: number
  steps: { title: string; icon: React.ReactNode }[]
}) {
  return (
    <div className="flex items-center justify-center mb-8">
      {steps.map((step, index) => (
        <div key={index} className="flex items-center">
          <div
            className={clsx(
              'flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-all',
              index === currentStep
                ? 'bg-green-600 text-white'
                : index < currentStep
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-400'
            )}
          >
            <span className="flex items-center justify-center w-6 h-6">
              {index < currentStep ? (
                <Check className="w-4 h-4" />
              ) : (
                step.icon
              )}
            </span>
            <span className="hidden sm:inline">{step.title}</span>
          </div>
          {index < steps.length - 1 && (
            <div
              className={clsx(
                'w-12 h-0.5 mx-2',
                index < currentStep ? 'bg-green-500' : 'bg-gray-200'
              )}
            />
          )}
        </div>
      ))}
    </div>
  )
}

export default function ExcelReportEditor() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { reportId } = useParams<{ reportId: string }>()
  const [searchParams] = useSearchParams()
  const templateIdParam = searchParams.get('template')

  const isNewReport = !reportId
  const templateId = templateIdParam ? parseInt(templateIdParam, 10) : null

  // Wizard state
  const [currentStep, setCurrentStep] = useState(0)
  const steps = [
    { title: 'Report Info', icon: <FileText className="w-4 h-4" /> },
    { title: 'Data Sources', icon: <Database className="w-4 h-4" /> },
    { title: 'Configure', icon: <Settings className="w-4 h-4" /> },
    { title: 'Generate', icon: <FileDown className="w-4 h-4" /> },
  ]

  // Report state
  const [reportName, setReportName] = useState('Untitled Report')
  const [reportDescription, setReportDescription] = useState('')
  const [dataSources, setDataSources] = useState<ExcelDataSourceMapping[]>([])
  const [expandedMapping, setExpandedMapping] = useState<string | null>(null)

  // UI state
  const [isGenerated, setIsGenerated] = useState(false)
  const [generatedReportId, setGeneratedReportId] = useState<number | null>(null)
  const [showShareModal, setShowShareModal] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)
  const [addingDataSourceId, setAddingDataSourceId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Fetch template
  const { data: template, isLoading: isTemplateLoading } = useQuery({
    queryKey: ['excel-template', templateId],
    queryFn: () => (templateId ? excelService.getTemplate(templateId) : null),
    enabled: !!templateId && isNewReport,
  })

  // Fetch existing report
  const { data: report, isLoading: isReportLoading } = useQuery({
    queryKey: ['excel-report', reportId],
    queryFn: () => (reportId ? excelService.getReport(parseInt(reportId, 10)) : null),
    enabled: !!reportId,
  })

  // Fetch visualizations
  const { data: visualizations = [], isLoading: isVisualizationsLoading } = useQuery({
    queryKey: ['visualizations'],
    queryFn: () => visualizationService.list(),
  })

  // Initialize from report
  useEffect(() => {
    if (report) {
      setReportName(report.name)
      setReportDescription(report.description || '')
      setDataSources(report.data_sources || [])
      setIsGenerated(true)
      setGeneratedReportId(report.id)
      // Skip to generate step if already configured
      if (report.data_sources && report.data_sources.length > 0) {
        setCurrentStep(3)
      }
    }
  }, [report])

  // Get sheets from template structure
  const sheets = template?.structure?.sheets || report?.structure?.sheets || []

  // Create/Generate report mutation
  const generateMutation = useMutation({
    mutationFn: async (data: {
      name: string
      description?: string
      template_id: number
      data_sources: ExcelDataSourceMapping[]
    }) => {
      if (isNewReport || !generatedReportId) {
        return excelService.createReport(data)
      } else {
        await excelService.updateReport(generatedReportId, data)
        return excelService.getReport(generatedReportId)
      }
    },
    onSuccess: (newReport) => {
      queryClient.invalidateQueries({ queryKey: ['excel-reports'] })
      queryClient.invalidateQueries({ queryKey: ['excel-report', String(newReport.id)] })
      setIsGenerated(true)
      setGeneratedReportId(newReport.id)
      setError(null)

      // Update URL if new report
      if (isNewReport) {
        navigate(`/excel-reports/${newReport.id}`, { replace: true })
      }
    },
    onError: (err: Error) => {
      setError(err.message || 'Failed to generate report')
    },
  })

  // Download mutation
  const downloadMutation = useMutation({
    mutationFn: () => excelService.downloadReport(generatedReportId!),
    onSuccess: (blob) => {
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${reportName.replace(/\s+/g, '_')}.xlsx`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    },
    onError: (err: Error) => {
      setError(err.message || 'Failed to download report')
    },
  })

  // Share mutation
  const shareMutation = useMutation({
    mutationFn: () => excelService.shareReport(generatedReportId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['excel-report', String(generatedReportId)] })
    },
  })

  const handleAddDataSource = async (vizId: number) => {
    setAddingDataSourceId(vizId)
    setError(null)

    try {
      const viz = visualizations.find((v: Visualization) => v.id === vizId)
      if (!viz) {
        throw new Error('Visualization not found')
      }

      // Get custom labels from visualization customization
      const customLabels = viz.customization?.custom_labels || {}

      // Get columns by executing the query
      let columns: ColumnMapping[] = []
      const result = await visualizationService.execute(vizId)

      if (result.rows && result.rows.length > 0) {
        const firstRow = result.rows[0]
        columns = Object.keys(firstRow).map((col, idx) => ({
          source_column: col,
          target_column: String.fromCharCode(65 + idx),
          // Use custom label if available, otherwise use the raw column name
          header_label: customLabels[col] || col,
        }))
      }

      if (columns.length === 0) {
        throw new Error('No columns found in visualization data')
      }

      const newMapping: ExcelDataSourceMapping = {
        id: uuidv4(),
        visualization_id: vizId,
        sheet_name: sheets[0]?.name || 'Sheet1',
        start_cell: 'A1',
        columns,
        include_header: true,
        auto_expand: true,
      }

      setDataSources([...dataSources, newMapping])
      setExpandedMapping(newMapping.id)
      setIsGenerated(false)
    } catch (e) {
      console.error('Failed to add data source:', e)
      setError(e instanceof Error ? e.message : 'Failed to add data source')
    } finally {
      setAddingDataSourceId(null)
    }
  }

  const handleRemoveDataSource = (id: string) => {
    setDataSources(dataSources.filter((ds) => ds.id !== id))
    setIsGenerated(false)
  }

  const handleUpdateDataSource = (id: string, updates: Partial<ExcelDataSourceMapping>) => {
    setDataSources(
      dataSources.map((ds) => (ds.id === id ? { ...ds, ...updates } : ds))
    )
    setIsGenerated(false)
  }

  const handleGenerateReport = async () => {
    const data = {
      name: reportName,
      description: reportDescription || undefined,
      template_id: templateId || report?.template_id,
      data_sources: dataSources,
    }
    generateMutation.mutate(data as any)
  }

  const handleCopyLink = () => {
    if (report?.share_token) {
      navigator.clipboard.writeText(
        `${window.location.origin}/shared/excel-report/${report.share_token}`
      )
      setLinkCopied(true)
      setTimeout(() => setLinkCopied(false), 2000)
    }
  }

  const canProceedToNext = () => {
    switch (currentStep) {
      case 0: // Report Info
        return reportName.trim().length > 0
      case 1: // Data Sources
        return dataSources.length > 0
      case 2: // Configure
        return dataSources.every((ds) => ds.columns.length > 0)
      default:
        return true
    }
  }

  const handleNext = () => {
    if (currentStep < steps.length - 1 && canProceedToNext()) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const isLoading = isTemplateLoading || isReportLoading
  const isGenerating = generateMutation.isPending

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-green-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Loading report...</p>
        </div>
      </div>
    )
  }

  if (!template && !report) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <FileSpreadsheet className="w-16 h-16 text-gray-300 mb-4" />
        <p className="text-gray-500 mb-4">Template not found</p>
        <button
          onClick={() => navigate('/excel-templates')}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          Go to Templates
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/reports')}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft className="w-5 h-5 text-gray-500" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg">
                <FileSpreadsheet className="w-5 h-5 text-white" />
              </div>
              {isNewReport ? 'Create Excel Report' : reportName}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Template: {template?.name || `Template #${report?.template_id}`}
            </p>
          </div>
        </div>
      </div>

      {/* Step Indicator */}
      <StepIndicator currentStep={currentStep} steps={steps} />

      {/* Error Message */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-red-700 flex-1">{error}</p>
          <button
            onClick={() => setError(null)}
            className="p-1 hover:bg-red-100 rounded"
          >
            <X className="w-4 h-4 text-red-500" />
          </button>
        </div>
      )}

      {/* Step Content */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        {/* Step 1: Report Info */}
        {currentStep === 0 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Report Information</h2>
              <p className="text-gray-500 mb-6">
                Give your report a name and optional description.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Report Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={reportName}
                onChange={(e) => setReportName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-lg"
                placeholder="Enter report name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description (optional)
              </label>
              <textarea
                value={reportDescription}
                onChange={(e) => setReportDescription(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                placeholder="Describe what this report contains..."
              />
            </div>
          </div>
        )}

        {/* Step 2: Data Sources */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Select Data Sources</h2>
              <p className="text-gray-500 mb-6">
                Choose which visualizations to include in your Excel report.
              </p>
            </div>

            {/* Selected Data Sources */}
            {dataSources.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-700 mb-3">
                  Selected ({dataSources.length})
                </h3>
                <div className="space-y-2">
                  {dataSources.map((ds) => {
                    const viz = visualizations.find((v: Visualization) => v.id === ds.visualization_id)
                    return (
                      <div
                        key={ds.id}
                        className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg"
                      >
                        <div className="p-2 bg-green-100 rounded-lg">
                          <BarChart3 className="w-4 h-4 text-green-600" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-green-900">{viz?.name || 'Unknown'}</p>
                          <p className="text-sm text-green-600">{ds.columns.length} columns</p>
                        </div>
                        <button
                          onClick={() => handleRemoveDataSource(ds.id)}
                          className="p-2 text-green-600 hover:text-red-500 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Available Visualizations */}
            {(() => {
              // Filter visualizations that can be used as data sources
              // A visualization is usable if it has:
              // 1. metabase_question_id (linked to Metabase question), OR
              // 2. mbql_query + database_id (stored MBQL query), OR
              // 3. native_query + database_id (stored SQL query)
              const usableVisualizations = visualizations.filter(
                (v: Visualization) =>
                  v.metabase_question_id != null ||
                  (v.query_type === 'mbql' && v.mbql_query && v.database_id) ||
                  (v.query_type === 'native' && v.native_query && v.database_id)
              )
              const unusableVisualizations = visualizations.filter(
                (v: Visualization) =>
                  v.metabase_question_id == null &&
                  !(v.query_type === 'mbql' && v.mbql_query && v.database_id) &&
                  !(v.query_type === 'native' && v.native_query && v.database_id)
              )

              return (
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-3">
                    Available Visualizations
                    {usableVisualizations.length > 0 && (
                      <span className="text-gray-400 font-normal ml-1">
                        ({usableVisualizations.length} available)
                      </span>
                    )}
                  </h3>
                  {isVisualizationsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
                    </div>
                  ) : usableVisualizations.length === 0 ? (
                    <div className="text-center py-8 bg-amber-50 border border-amber-200 rounded-lg">
                      <AlertCircle className="w-12 h-12 text-amber-400 mx-auto mb-4" />
                      <p className="text-amber-800 font-medium">No usable visualizations found</p>
                      <p className="text-sm text-amber-600 mt-2 max-w-md mx-auto">
                        Visualizations need to be linked to a Metabase question to be used as data sources.
                        {unusableVisualizations.length > 0 && (
                          <span className="block mt-2">
                            You have {unusableVisualizations.length} visualization{unusableVisualizations.length > 1 ? 's' : ''} without data connections.
                          </span>
                        )}
                      </p>
                      <button
                        onClick={() => navigate('/visualizations')}
                        className="mt-4 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors text-sm font-medium"
                      >
                        Go to Visualizations
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {usableVisualizations.map((viz: Visualization) => {
                          const isAdded = dataSources.some((ds) => ds.visualization_id === viz.id)
                          const isAdding = addingDataSourceId === viz.id

                          return (
                            <button
                              key={viz.id}
                              onClick={() => !isAdded && !isAdding && handleAddDataSource(viz.id)}
                              disabled={isAdded || isAdding}
                              className={clsx(
                                'flex items-center gap-3 p-4 rounded-lg border text-left transition-all',
                                isAdded
                                  ? 'bg-gray-50 border-gray-200 cursor-default opacity-50'
                                  : isAdding
                                    ? 'bg-gray-50 border-green-300 cursor-wait'
                                    : 'bg-white border-gray-200 hover:border-green-500 hover:bg-green-50'
                              )}
                            >
                              <div
                                className={clsx(
                                  'p-2 rounded-lg',
                                  isAdded || isAdding ? 'bg-gray-100' : 'bg-gray-100'
                                )}
                              >
                                <BarChart3 className="w-5 h-5 text-gray-500" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-gray-900 truncate">{viz.name}</p>
                                <p className="text-sm text-gray-500">{viz.visualization_type}</p>
                              </div>
                              {isAdding ? (
                                <Loader2 className="w-5 h-5 text-green-600 animate-spin" />
                              ) : isAdded ? (
                                <Check className="w-5 h-5 text-gray-400" />
                              ) : (
                                <Plus className="w-5 h-5 text-gray-400" />
                              )}
                            </button>
                          )
                        })}
                      </div>

                      {/* Show unusable visualizations with explanation */}
                      {unusableVisualizations.length > 0 && (
                        <div className="mt-6">
                          <h4 className="text-sm font-medium text-gray-500 mb-2 flex items-center gap-2">
                            <AlertCircle className="w-4 h-4" />
                            Not available ({unusableVisualizations.length})
                          </h4>
                          <p className="text-xs text-gray-400 mb-3">
                            These visualizations are not linked to a Metabase question and cannot be used as data sources.
                          </p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {unusableVisualizations.map((viz: Visualization) => (
                              <div
                                key={viz.id}
                                className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 bg-gray-50 opacity-60"
                              >
                                <div className="p-2 rounded-lg bg-gray-100">
                                  <BarChart3 className="w-4 h-4 text-gray-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-gray-500 truncate text-sm">{viz.name}</p>
                                  <p className="text-xs text-gray-400">No data source</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )
            })()}
          </div>
        )}

        {/* Step 3: Configure */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Configure Data Placement</h2>
              <p className="text-gray-500 mb-6">
                Specify where each data source should be placed in the Excel template.
              </p>
            </div>

            {dataSources.map((ds) => {
              const viz = visualizations.find((v: Visualization) => v.id === ds.visualization_id)
              const isExpanded = expandedMapping === ds.id

              return (
                <div
                  key={ds.id}
                  className="border border-gray-200 rounded-lg overflow-hidden"
                >
                  {/* Header */}
                  <div
                    className="flex items-center gap-4 px-4 py-3 bg-gray-50 cursor-pointer hover:bg-gray-100"
                    onClick={() => setExpandedMapping(isExpanded ? null : ds.id)}
                  >
                    <div className="p-2 bg-green-100 rounded-lg">
                      <BarChart3 className="w-4 h-4 text-green-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{viz?.name || 'Unknown'}</p>
                      <p className="text-sm text-gray-500">
                        Sheet: {ds.sheet_name} | Cell: {ds.start_cell} | {ds.columns.length} columns
                      </p>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </div>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className="p-4 space-y-4 border-t border-gray-200">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Sheet Name
                          </label>
                          <select
                            value={ds.sheet_name}
                            onChange={(e) =>
                              handleUpdateDataSource(ds.id, { sheet_name: e.target.value })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          >
                            {sheets.length > 0 ? (
                              sheets.map((sheet: { name: string }) => (
                                <option key={sheet.name} value={sheet.name}>
                                  {sheet.name}
                                </option>
                              ))
                            ) : (
                              <option value="Sheet1">Sheet1</option>
                            )}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Start Cell
                          </label>
                          <input
                            type="text"
                            value={ds.start_cell}
                            onChange={(e) =>
                              handleUpdateDataSource(ds.id, {
                                start_cell: e.target.value.toUpperCase(),
                              })
                            }
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                            placeholder="e.g., A1, B5"
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={ds.include_header}
                            onChange={(e) =>
                              handleUpdateDataSource(ds.id, { include_header: e.target.checked })
                            }
                            className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                          />
                          <span className="text-sm text-gray-700">Include header row</span>
                        </label>
                      </div>

                      {/* Columns preview */}
                      {ds.columns.length > 0 && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Columns ({ds.columns.length})
                          </label>
                          <div className="flex flex-wrap gap-2">
                            {ds.columns.map((col) => (
                              <span
                                key={col.source_column}
                                className="px-3 py-1 bg-gray-100 border border-gray-200 rounded-full text-sm text-gray-700"
                                title={col.source_column !== col.header_label ? `Raw: ${col.source_column}` : undefined}
                              >
                                {col.header_label || col.source_column}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Step 4: Generate */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Generate & Download</h2>
              <p className="text-gray-500 mb-6">
                Review your configuration and generate the Excel report.
              </p>
            </div>

            {/* Summary */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Report Name:</span>
                <span className="font-medium text-gray-900">{reportName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Template:</span>
                <span className="font-medium text-gray-900">
                  {template?.name || `Template #${report?.template_id}`}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Data Sources:</span>
                <span className="font-medium text-gray-900">{dataSources.length}</span>
              </div>
              {dataSources.map((ds) => {
                const viz = visualizations.find((v: Visualization) => v.id === ds.visualization_id)
                return (
                  <div key={ds.id} className="flex items-center justify-between pl-4 text-sm">
                    <span className="text-gray-500">• {viz?.name || 'Unknown'}</span>
                    <span className="text-gray-500">
                      {ds.sheet_name}:{ds.start_cell}
                    </span>
                  </div>
                )
              })}
            </div>

            {/* Generate Button */}
            {!isGenerated ? (
              <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl p-6 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <Sparkles className="w-5 h-5" />
                      Ready to Generate
                    </h3>
                    <p className="text-green-100 text-sm mt-1">
                      Click the button to create your Excel report with live data.
                    </p>
                  </div>
                  <button
                    onClick={handleGenerateReport}
                    disabled={isGenerating}
                    className="flex items-center gap-2 px-6 py-3 bg-white text-green-600 font-semibold rounded-xl hover:bg-green-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5" />
                        Generate Report
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Success Message */}
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-full">
                    <CheckCircle2 className="w-6 h-6 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-green-900">Report Generated Successfully!</h4>
                    <p className="text-sm text-green-700">
                      Your Excel report is ready. You can now download or share it.
                    </p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => downloadMutation.mutate()}
                    disabled={downloadMutation.isPending}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700 transition-all disabled:opacity-50"
                  >
                    {downloadMutation.isPending ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Download className="w-5 h-5" />
                    )}
                    Download Excel
                  </button>
                  <button
                    onClick={() => setShowShareModal(true)}
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-all"
                  >
                    <Share2 className="w-5 h-5" />
                    Share
                  </button>
                </div>

                {/* Regenerate hint */}
                <p className="text-sm text-gray-500 text-center">
                  Made changes?{' '}
                  <button
                    onClick={handleGenerateReport}
                    disabled={isGenerating}
                    className="text-green-600 hover:underline font-medium"
                  >
                    Regenerate report
                  </button>
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between">
        <button
          onClick={handleBack}
          disabled={currentStep === 0}
          className={clsx(
            'flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all',
            currentStep === 0
              ? 'text-gray-300 cursor-not-allowed'
              : 'text-gray-700 hover:bg-gray-100'
          )}
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        {currentStep < 3 && (
          <button
            onClick={handleNext}
            disabled={!canProceedToNext()}
            className={clsx(
              'flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-all',
              canProceedToNext()
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            )}
          >
            Next
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Share Modal */}
      {showShareModal && generatedReportId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Share Report</h2>
              <button
                onClick={() => setShowShareModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {report?.share_token ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <Check className="w-5 h-5 text-green-600" />
                  <span className="text-green-800">This report is shared publicly</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={`${window.location.origin}/shared/excel-report/${report.share_token}`}
                    className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                  />
                  <button
                    onClick={handleCopyLink}
                    className={clsx(
                      'p-2 rounded-lg transition-all',
                      linkCopied ? 'bg-green-100 text-green-600' : 'bg-gray-100 hover:bg-gray-200'
                    )}
                  >
                    {linkCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                {linkCopied && (
                  <p className="text-sm text-green-600 text-center">Link copied to clipboard!</p>
                )}
              </div>
            ) : (
              <div className="text-center py-4">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Share2 className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-600 mb-4">Create a public link to share this report with anyone</p>
                <button
                  onClick={() => shareMutation.mutate()}
                  disabled={shareMutation.isPending}
                  className="px-6 py-2.5 bg-green-600 text-white font-medium rounded-xl hover:bg-green-700 transition-all disabled:opacity-50"
                >
                  {shareMutation.isPending ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Creating...
                    </span>
                  ) : (
                    'Create Share Link'
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
