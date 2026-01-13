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
  Sparkles,
  CheckCircle2,
  Copy,
  Loader2,
  AlertCircle,
  FileText,
  Database,
  Settings,
  Table,
  Columns,
  MapPin,
  Globe,
  Lock,
  Zap,
  Info,
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
  onStepClick,
}: {
  currentStep: number
  steps: { title: string; icon: React.ReactNode; description: string }[]
  onStepClick?: (step: number) => void
}) {
  return (
    <div className="flex items-center justify-between max-w-3xl mx-auto mb-10">
      {steps.map((step, index) => (
        <div key={index} className="flex items-center flex-1">
          <button
            onClick={() => onStepClick?.(index)}
            disabled={index > currentStep}
            className={clsx(
              'flex flex-col items-center gap-2 transition-all group',
              index <= currentStep ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'
            )}
          >
            <div
              className={clsx(
                'w-14 h-14 rounded-2xl flex items-center justify-center transition-all shadow-sm',
                index === currentStep
                  ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-200'
                  : index < currentStep
                    ? 'bg-emerald-100 text-emerald-600'
                    : 'bg-gray-100 text-gray-400'
              )}
            >
              {index < currentStep ? (
                <CheckCircle2 className="w-6 h-6" />
              ) : (
                step.icon
              )}
            </div>
            <div className="text-center">
              <p
                className={clsx(
                  'font-medium text-sm',
                  index === currentStep ? 'text-emerald-600' : index < currentStep ? 'text-gray-700' : 'text-gray-400'
                )}
              >
                {step.title}
              </p>
              <p className="text-xs text-gray-400 hidden sm:block">{step.description}</p>
            </div>
          </button>
          {index < steps.length - 1 && (
            <div
              className={clsx(
                'flex-1 h-0.5 mx-4 rounded-full transition-colors',
                index < currentStep ? 'bg-emerald-400' : 'bg-gray-200'
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
    { title: 'Report Info', icon: <FileText className="w-6 h-6" />, description: 'Name & description' },
    { title: 'Data Sources', icon: <Database className="w-6 h-6" />, description: 'Select visualizations' },
    { title: 'Configure', icon: <Settings className="w-6 h-6" />, description: 'Map to cells' },
    { title: 'Generate', icon: <Zap className="w-6 h-6" />, description: 'Download & share' },
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
  const [vizSearchQuery, setVizSearchQuery] = useState('')

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
      case 0:
        return reportName.trim().length > 0
      case 1:
        return dataSources.length > 0
      case 2:
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

  const handleStepClick = (step: number) => {
    if (step < currentStep) {
      setCurrentStep(step)
    }
  }

  // Filter visualizations
  const usableVisualizations = visualizations.filter(
    (v: Visualization) =>
      v.metabase_question_id != null ||
      (v.query_type === 'mbql' && v.mbql_query && v.database_id) ||
      (v.query_type === 'native' && v.native_query && v.database_id)
  )

  const filteredVisualizations = usableVisualizations.filter(
    (v: Visualization) =>
      v.name.toLowerCase().includes(vizSearchQuery.toLowerCase())
  )

  const isLoading = isTemplateLoading || isReportLoading
  const isGenerating = generateMutation.isPending

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-emerald-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Loading report...</p>
        </div>
      </div>
    )
  }

  if (!template && !report) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mb-6">
          <FileSpreadsheet className="w-10 h-10 text-gray-400" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Template not found</h3>
        <p className="text-gray-500 mb-6">The template you're looking for doesn't exist.</p>
        <button
          onClick={() => navigate('/excel-templates')}
          className="px-6 py-3 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 transition-all"
        >
          Go to Templates
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <div className="bg-gradient-to-br from-emerald-600 via-green-600 to-teal-600 -mx-4 -mt-4 lg:-mx-6 lg:-mt-6 px-4 lg:px-6 pt-6 pb-32 mb-8">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={() => navigate('/reports')}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <FileSpreadsheet className="w-5 h-5 text-white" />
                </div>
                {isNewReport ? 'Create Excel Report' : reportName}
              </h1>
              <p className="text-emerald-100 mt-1">
                Template: {template?.name || `Template #${report?.template_id}`}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto -mt-28 relative z-10">
        {/* Step Indicator Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 mb-6">
          <StepIndicator
            currentStep={currentStep}
            steps={steps}
            onStepClick={handleStepClick}
          />
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-500" />
            </div>
            <p className="text-red-700 flex-1">{error}</p>
            <button
              onClick={() => setError(null)}
              className="p-2 hover:bg-red-100 rounded-lg"
            >
              <X className="w-4 h-4 text-red-500" />
            </button>
          </div>
        )}

        {/* Step Content */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          {/* Step 1: Report Info */}
          {currentStep === 0 && (
            <div className="p-8">
              <div className="max-w-xl mx-auto">
                <div className="text-center mb-8">
                  <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <FileText className="w-8 h-8 text-emerald-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900">Report Information</h2>
                  <p className="text-gray-500 mt-2">Give your report a name and description</p>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Report Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={reportName}
                      onChange={(e) => setReportName(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-lg"
                      placeholder="Enter report name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description <span className="text-gray-400">(optional)</span>
                    </label>
                    <textarea
                      value={reportDescription}
                      onChange={(e) => setReportDescription(e.target.value)}
                      rows={4}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
                      placeholder="Describe what this report contains..."
                    />
                  </div>

                  {/* Template Info */}
                  <div className="bg-gray-50 rounded-xl p-4 flex items-center gap-4">
                    <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                      <FileSpreadsheet className="w-6 h-6 text-emerald-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">
                        {template?.name || `Template #${report?.template_id}`}
                      </p>
                      <p className="text-sm text-gray-500">
                        {sheets.length} sheet{sheets.length !== 1 ? 's' : ''} available
                      </p>
                    </div>
                    <div className="px-3 py-1 bg-emerald-100 text-emerald-700 text-sm font-medium rounded-full">
                      Template
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Data Sources */}
          {currentStep === 1 && (
            <div className="p-8">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Database className="w-8 h-8 text-emerald-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Select Data Sources</h2>
                <p className="text-gray-500 mt-2">Choose visualizations to include in your report</p>
              </div>

              {/* Selected Data Sources */}
              {dataSources.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    Selected ({dataSources.length})
                  </h3>
                  <div className="space-y-3">
                    {dataSources.map((ds) => {
                      const viz = visualizations.find((v: Visualization) => v.id === ds.visualization_id)
                      return (
                        <div
                          key={ds.id}
                          className="flex items-center gap-4 p-4 bg-emerald-50 border border-emerald-200 rounded-xl group"
                        >
                          <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                            {viz?.visualization_type === 'table' ? (
                              <Table className="w-6 h-6 text-emerald-600" />
                            ) : (
                              <BarChart3 className="w-6 h-6 text-emerald-600" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-emerald-900">{viz?.name || 'Unknown'}</p>
                            <p className="text-sm text-emerald-600 flex items-center gap-2">
                              <Columns className="w-3.5 h-3.5" />
                              {ds.columns.length} columns
                            </p>
                          </div>
                          <button
                            onClick={() => handleRemoveDataSource(ds.id)}
                            className="p-2 text-emerald-600 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Search */}
              <div className="mb-6">
                <div className="relative">
                  <Database className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search visualizations..."
                    value={vizSearchQuery}
                    onChange={(e) => setVizSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Available Visualizations */}
              {isVisualizationsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
                </div>
              ) : filteredVisualizations.length === 0 ? (
                <div className="text-center py-12 bg-amber-50 border border-amber-200 rounded-xl">
                  <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <AlertCircle className="w-8 h-8 text-amber-500" />
                  </div>
                  <h3 className="text-lg font-semibold text-amber-800 mb-2">
                    {vizSearchQuery ? 'No matching visualizations' : 'No visualizations available'}
                  </h3>
                  <p className="text-amber-600 max-w-md mx-auto">
                    {vizSearchQuery
                      ? 'Try a different search term'
                      : 'Create visualizations with data sources to use them in reports'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredVisualizations.map((viz: Visualization) => {
                    const isAdded = dataSources.some((ds) => ds.visualization_id === viz.id)
                    const isAdding = addingDataSourceId === viz.id

                    return (
                      <button
                        key={viz.id}
                        onClick={() => !isAdded && !isAdding && handleAddDataSource(viz.id)}
                        disabled={isAdded || isAdding}
                        className={clsx(
                          'flex items-center gap-4 p-4 rounded-xl border text-left transition-all',
                          isAdded
                            ? 'bg-gray-50 border-gray-200 cursor-default opacity-60'
                            : isAdding
                              ? 'bg-emerald-50 border-emerald-300 cursor-wait'
                              : 'bg-white border-gray-200 hover:border-emerald-400 hover:shadow-md'
                        )}
                      >
                        <div
                          className={clsx(
                            'w-12 h-12 rounded-xl flex items-center justify-center shrink-0',
                            isAdded || isAdding ? 'bg-gray-100' : 'bg-gray-100 group-hover:bg-emerald-100'
                          )}
                        >
                          {viz.visualization_type === 'table' ? (
                            <Table className="w-6 h-6 text-gray-500" />
                          ) : (
                            <BarChart3 className="w-6 h-6 text-gray-500" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 truncate">{viz.name}</p>
                          <p className="text-sm text-gray-500 capitalize">{viz.visualization_type}</p>
                        </div>
                        {isAdding ? (
                          <Loader2 className="w-5 h-5 text-emerald-600 animate-spin shrink-0" />
                        ) : isAdded ? (
                          <div className="p-1.5 bg-emerald-100 rounded-full shrink-0">
                            <Check className="w-4 h-4 text-emerald-600" />
                          </div>
                        ) : (
                          <div className="p-1.5 bg-gray-100 rounded-full shrink-0 group-hover:bg-emerald-100">
                            <Plus className="w-4 h-4 text-gray-500 group-hover:text-emerald-600" />
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Step 3: Configure */}
          {currentStep === 2 && (
            <div className="p-8">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Settings className="w-8 h-8 text-emerald-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Configure Data Placement</h2>
                <p className="text-gray-500 mt-2">Specify where each data source appears in the Excel template</p>
              </div>

              <div className="space-y-4">
                {dataSources.map((ds, index) => {
                  const viz = visualizations.find((v: Visualization) => v.id === ds.visualization_id)
                  const isExpanded = expandedMapping === ds.id

                  return (
                    <div
                      key={ds.id}
                      className="border border-gray-200 rounded-xl overflow-hidden hover:border-emerald-300 transition-colors"
                    >
                      {/* Header */}
                      <div
                        className="flex items-center gap-4 px-5 py-4 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => setExpandedMapping(isExpanded ? null : ds.id)}
                      >
                        <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600 font-bold">
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900">{viz?.name || 'Unknown'}</p>
                          <p className="text-sm text-gray-500 flex items-center gap-3">
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5" />
                              {ds.sheet_name}:{ds.start_cell}
                            </span>
                            <span className="flex items-center gap-1">
                              <Columns className="w-3.5 h-3.5" />
                              {ds.columns.length} columns
                            </span>
                          </p>
                        </div>
                        <div className={clsx(
                          'p-2 rounded-lg transition-transform',
                          isExpanded ? 'rotate-180' : ''
                        )}>
                          <ChevronDown className="w-5 h-5 text-gray-400" />
                        </div>
                      </div>

                      {/* Expanded Content */}
                      {isExpanded && (
                        <div className="p-5 space-y-5 border-t border-gray-200 bg-white">
                          <div className="grid grid-cols-2 gap-5">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                Target Sheet
                              </label>
                              <select
                                value={ds.sheet_name}
                                onChange={(e) =>
                                  handleUpdateDataSource(ds.id, { sheet_name: e.target.value })
                                }
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white"
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
                              <label className="block text-sm font-medium text-gray-700 mb-2">
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
                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                placeholder="e.g., A1, B5"
                              />
                            </div>
                          </div>

                          <div className="flex items-center gap-6">
                            <label className="flex items-center gap-2 cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={ds.include_header}
                                onChange={(e) =>
                                  handleUpdateDataSource(ds.id, { include_header: e.target.checked })
                                }
                                className="w-5 h-5 text-emerald-600 rounded focus:ring-emerald-500"
                              />
                              <span className="text-sm text-gray-700">Include header row</span>
                            </label>
                          </div>

                          {/* Columns preview */}
                          {ds.columns.length > 0 && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-3">
                                Columns ({ds.columns.length})
                              </label>
                              <div className="flex flex-wrap gap-2">
                                {ds.columns.map((col) => (
                                  <span
                                    key={col.source_column}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-700"
                                    title={col.source_column !== col.header_label ? `Raw: ${col.source_column}` : undefined}
                                  >
                                    <Columns className="w-3.5 h-3.5" />
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
            </div>
          )}

          {/* Step 4: Generate */}
          {currentStep === 3 && (
            <div className="p-8">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Zap className="w-8 h-8 text-emerald-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Generate & Download</h2>
                <p className="text-gray-500 mt-2">Review your configuration and generate the report</p>
              </div>

              {/* Summary Card */}
              <div className="bg-gray-50 rounded-xl p-6 mb-8">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Info className="w-5 h-5 text-gray-400" />
                  Report Summary
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <p className="text-sm text-gray-500 mb-1">Report Name</p>
                    <p className="font-semibold text-gray-900">{reportName}</p>
                  </div>
                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                    <p className="text-sm text-gray-500 mb-1">Template</p>
                    <p className="font-semibold text-gray-900">
                      {template?.name || `Template #${report?.template_id}`}
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-4 border border-gray-200 col-span-2">
                    <p className="text-sm text-gray-500 mb-3">Data Sources ({dataSources.length})</p>
                    <div className="space-y-2">
                      {dataSources.map((ds) => {
                        const viz = visualizations.find((v: Visualization) => v.id === ds.visualization_id)
                        return (
                          <div key={ds.id} className="flex items-center justify-between text-sm">
                            <span className="font-medium text-gray-700">{viz?.name || 'Unknown'}</span>
                            <span className="text-gray-500">
                              → {ds.sheet_name}:{ds.start_cell}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Generate / Download Section */}
              {!isGenerated ? (
                <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl p-8 text-white text-center">
                  <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <Sparkles className="w-10 h-10" />
                  </div>
                  <h3 className="text-2xl font-bold mb-2">Ready to Generate</h3>
                  <p className="text-emerald-100 mb-8 max-w-md mx-auto">
                    Click the button below to create your Excel report with live data from your visualizations.
                  </p>
                  <button
                    onClick={handleGenerateReport}
                    disabled={isGenerating}
                    className="inline-flex items-center gap-3 px-8 py-4 bg-white text-emerald-600 font-bold rounded-xl hover:bg-emerald-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl text-lg"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="w-6 h-6 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-6 h-6" />
                        Generate Report
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Success Message */}
                  <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 flex items-center gap-4">
                    <div className="w-14 h-14 bg-emerald-100 rounded-xl flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-7 h-7 text-emerald-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-lg font-bold text-emerald-900">Report Generated!</h4>
                      <p className="text-emerald-700">
                        Your Excel report is ready. Download it or share with others.
                      </p>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => downloadMutation.mutate()}
                      disabled={downloadMutation.isPending}
                      className="flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold rounded-xl hover:from-emerald-700 hover:to-teal-700 transition-all disabled:opacity-50 shadow-lg hover:shadow-xl"
                    >
                      {downloadMutation.isPending ? (
                        <Loader2 className="w-6 h-6 animate-spin" />
                      ) : (
                        <Download className="w-6 h-6" />
                      )}
                      Download Excel
                    </button>
                    <button
                      onClick={() => setShowShareModal(true)}
                      className="flex items-center justify-center gap-3 px-6 py-4 bg-white border-2 border-gray-200 text-gray-700 font-bold rounded-xl hover:border-emerald-300 hover:bg-emerald-50 transition-all"
                    >
                      <Share2 className="w-6 h-6" />
                      Share Report
                    </button>
                  </div>

                  {/* Regenerate hint */}
                  <p className="text-sm text-gray-500 text-center">
                    Made changes?{' '}
                    <button
                      onClick={handleGenerateReport}
                      disabled={isGenerating}
                      className="text-emerald-600 hover:underline font-medium"
                    >
                      Regenerate report
                    </button>{' '}
                    to apply them.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between mt-6">
          <button
            onClick={handleBack}
            disabled={currentStep === 0}
            className={clsx(
              'flex items-center gap-2 px-5 py-3 rounded-xl font-semibold transition-all',
              currentStep === 0
                ? 'text-gray-300 cursor-not-allowed'
                : 'text-gray-700 hover:bg-gray-100'
            )}
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>

          {currentStep < 3 && (
            <button
              onClick={handleNext}
              disabled={!canProceedToNext()}
              className={clsx(
                'flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all shadow-lg',
                canProceedToNext()
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-700 hover:to-teal-700 hover:shadow-xl'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              )}
            >
              Continue
              <ArrowRight className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Share Modal */}
      {showShareModal && generatedReportId && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <Share2 className="w-6 h-6 text-white" />
                  </div>
                  <h2 className="text-xl font-semibold text-white">Share Report</h2>
                </div>
                <button
                  onClick={() => setShowShareModal(false)}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>

            <div className="p-6">
              {report?.share_token ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                    <div className="p-2 bg-emerald-100 rounded-lg">
                      <Globe className="w-5 h-5 text-emerald-600" />
                    </div>
                    <span className="text-emerald-800 font-medium">This report is shared publicly</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={`${window.location.origin}/shared/excel-report/${report.share_token}`}
                      className="flex-1 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm"
                    />
                    <button
                      onClick={handleCopyLink}
                      className={clsx(
                        'p-3 rounded-xl transition-all',
                        linkCopied ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 hover:bg-gray-200'
                      )}
                    >
                      {linkCopied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                    </button>
                  </div>
                  {linkCopied && (
                    <p className="text-sm text-emerald-600 text-center font-medium">
                      Link copied to clipboard!
                    </p>
                  )}
                </div>
              ) : (
                <div className="text-center py-6">
                  <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Lock className="w-10 h-10 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Private Report</h3>
                  <p className="text-gray-500 mb-6">
                    Create a public link to share this report with anyone
                  </p>
                  <button
                    onClick={() => shareMutation.mutate()}
                    disabled={shareMutation.isPending}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 transition-all disabled:opacity-50"
                  >
                    {shareMutation.isPending ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Globe className="w-5 h-5" />
                        Create Share Link
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
