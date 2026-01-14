import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  Share2,
  Upload,
  FileSpreadsheet,
  Check,
  X,
  Clock,
  Download,
  Link,
  RefreshCw,
  Table,
  Hash,
  BarChart3,
  Database,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  FileText,
  Layers,
  MessageCircle,
  Search,
} from 'lucide-react'
import clsx from 'clsx'
import { excelReportService } from '../services/excelReportService'
import { visualizationService } from '../services/visualizationService'
import type {
  ExcelTemplateReport,
  ExcelPlaceholder,
  DataSourceMapping,
  Visualization,
} from '../types'

type Step = 'details' | 'template' | 'mappings' | 'generate'

export default function ExcelReportBuilder() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const isNewReport = !id || id === 'new'
  const reportId = isNewReport ? undefined : parseInt(id, 10)

  const [currentStep, setCurrentStep] = useState<Step>('details')
  const [reportName, setReportName] = useState('Untitled Excel Report')
  const [reportDescription, setReportDescription] = useState('')
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [mappings, setMappings] = useState<Record<string, DataSourceMapping>>({})

  // Fetch existing report
  const { data: report, isLoading } = useQuery({
    queryKey: ['excel-report', reportId],
    queryFn: () => excelReportService.get(reportId!),
    enabled: !!reportId,
  })

  // Fetch visualizations for mapping
  const { data: visualizations = [] } = useQuery({
    queryKey: ['visualizations'],
    queryFn: () => visualizationService.list(false),
  })

  // Load report data
  useEffect(() => {
    if (report) {
      setReportName(report.name)
      setReportDescription(report.description || '')
      setMappings(report.mappings || {})
      // Determine current step based on report state
      if (!report.template_filename) {
        setCurrentStep('template')
      } else if (report.placeholders.length > 0 && Object.keys(report.mappings).length < report.placeholders.length) {
        setCurrentStep('mappings')
      } else {
        setCurrentStep('generate')
      }
    }
  }, [report])

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: { name: string; description?: string }) =>
      excelReportService.create(data),
    onSuccess: (newReport) => {
      queryClient.invalidateQueries({ queryKey: ['excel-reports'] })
      navigate(`/excel-reports/${newReport.id}`, { replace: true })
      setHasUnsavedChanges(false)
      setCurrentStep('template')
    },
  })

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (data: { name?: string; description?: string }) =>
      excelReportService.update(reportId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['excel-report', reportId] })
      queryClient.invalidateQueries({ queryKey: ['excel-reports'] })
      setHasUnsavedChanges(false)
    },
  })

  // Upload template mutation
  const uploadMutation = useMutation({
    mutationFn: (file: File) => excelReportService.uploadTemplate(reportId!, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['excel-report', reportId] })
      setCurrentStep('mappings')
    },
  })

  // Update mappings mutation
  const mappingsMutation = useMutation({
    mutationFn: (mappings: Record<string, DataSourceMapping>) =>
      excelReportService.updateMappings(reportId!, mappings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['excel-report', reportId] })
      setHasUnsavedChanges(false)
    },
  })

  // Share mutation
  const shareMutation = useMutation({
    mutationFn: () => excelReportService.share(reportId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['excel-report', reportId] })
    },
  })

  const handleSaveDetails = async () => {
    setIsSaving(true)
    try {
      const data = {
        name: reportName,
        description: reportDescription || undefined,
      }

      if (isNewReport) {
        await createMutation.mutateAsync(data)
      } else {
        await updateMutation.mutateAsync(data)
      }
    } catch (error) {
      console.error('Failed to save report:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      alert('Please upload an Excel file (.xlsx or .xls)')
      return
    }

    setIsUploading(true)
    try {
      await uploadMutation.mutateAsync(file)
    } catch (error) {
      console.error('Failed to upload template:', error)
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleSaveMappings = async () => {
    setIsSaving(true)
    try {
      await mappingsMutation.mutateAsync(mappings)
      setCurrentStep('generate')
    } catch (error) {
      console.error('Failed to save mappings:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleGenerate = async () => {
    setIsGenerating(true)
    try {
      const blob = await excelReportService.generate(reportId!)
      const filename = `${reportName.replace(/[^a-z0-9]/gi, '_')}.xlsx`
      excelReportService.downloadBlob(blob, filename)
    } catch (error) {
      console.error('Failed to generate Excel:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  const updateMapping = (placeholderId: string, mapping: DataSourceMapping | null) => {
    if (mapping) {
      setMappings((prev) => ({ ...prev, [placeholderId]: mapping }))
    } else {
      setMappings((prev) => {
        const newMappings = { ...prev }
        delete newMappings[placeholderId]
        return newMappings
      })
    }
    setHasUnsavedChanges(true)
  }

  const steps: { key: Step; label: string; icon: React.ReactNode }[] = [
    { key: 'details', label: 'Details', icon: <FileText className="w-4 h-4" /> },
    { key: 'template', label: 'Template', icon: <Upload className="w-4 h-4" /> },
    { key: 'mappings', label: 'Map Data', icon: <Layers className="w-4 h-4" /> },
    { key: 'generate', label: 'Generate', icon: <Download className="w-4 h-4" /> },
  ]

  const canProceed = (step: Step): boolean => {
    switch (step) {
      case 'details':
        return !!reportName.trim()
      case 'template':
        return !!report?.template_filename
      case 'mappings':
        return report?.placeholders?.length === 0 || Object.keys(mappings).length > 0
      case 'generate':
        return true
      default:
        return false
    }
  }

  if (!isNewReport && isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <div className="w-12 h-12 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-500 text-sm mt-4">Loading report...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen -m-4 lg:-m-6 bg-gray-50">
      {/* Modern Toolbar - Compact */}
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-gray-200/80">
        <div className="flex items-center justify-between h-12 px-3 lg:px-4">
          {/* Left side */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/reports')}
              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors group"
            >
              <ArrowLeft className="w-4 h-4 text-gray-500 group-hover:text-gray-700" />
            </button>

            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg">
                <FileSpreadsheet className="w-4 h-4 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-gray-900">
                  {reportName || 'Untitled Excel Report'}
                </span>
                <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
                  <Clock className="w-2.5 h-2.5" />
                  <span>{isNewReport ? 'New report' : 'Last edited just now'}</span>
                </div>
              </div>
            </div>

            {hasUnsavedChanges && (
              <div className="flex items-center gap-1 px-2 py-0.5 bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-medium rounded-md">
                <div className="w-1 h-1 bg-amber-500 rounded-full animate-pulse" />
                Unsaved
              </div>
            )}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-1.5">
            {/* Share Button */}
            {!isNewReport && (
              <button
                onClick={() => setShowShareModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Share</span>
              </button>
            )}
          </div>
        </div>

        {/* Step indicators - Compact */}
        <div className="flex items-center justify-center gap-1 px-3 py-2 border-t border-gray-100 bg-gray-50/50">
          {steps.map((step, index) => {
            const isActive = currentStep === step.key
            const stepIndex = steps.findIndex((s) => s.key === currentStep)
            const isPast = index < stepIndex
            const isClickable = isPast || (index === stepIndex + 1 && canProceed(currentStep))

            return (
              <div key={step.key} className="flex items-center">
                <button
                  onClick={() => isClickable && setCurrentStep(step.key)}
                  disabled={!isClickable && !isActive}
                  className={clsx(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all text-xs font-medium',
                    isActive && 'bg-emerald-100 text-emerald-700',
                    isPast && 'text-emerald-600 hover:bg-emerald-50',
                    !isActive && !isPast && 'text-gray-400',
                    isClickable && !isActive && 'cursor-pointer hover:text-emerald-600'
                  )}
                >
                  {isPast ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  ) : (
                    <span className="[&>svg]:w-3.5 [&>svg]:h-3.5">{step.icon}</span>
                  )}
                  <span className="hidden sm:inline">{step.label}</span>
                </button>
                {index < steps.length - 1 && (
                  <ChevronRight className="w-3.5 h-3.5 text-gray-300 mx-1" />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Content */}
      <div className="flex justify-center py-4 px-3">
        <div className="w-full max-w-xl bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          {/* Step: Details */}
          {currentStep === 'details' && (
            <div className="p-4">
              <h2 className="text-base font-bold text-gray-900 mb-0.5">Report Details</h2>
              <p className="text-xs text-gray-500 mb-4">Give your Excel report a name and description.</p>

              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-medium text-gray-700 mb-1">
                    Report Name *
                  </label>
                  <input
                    type="text"
                    value={reportName}
                    onChange={(e) => {
                      setReportName(e.target.value)
                      setHasUnsavedChanges(true)
                    }}
                    className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                    placeholder="Enter report name"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-gray-700 mb-1">
                    Description (optional)
                  </label>
                  <textarea
                    value={reportDescription}
                    onChange={(e) => {
                      setReportDescription(e.target.value)
                      setHasUnsavedChanges(true)
                    }}
                    rows={2}
                    className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all resize-none"
                    placeholder="Describe what this report contains..."
                  />
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={handleSaveDetails}
                    disabled={!reportName.trim() || isSaving}
                    className={clsx(
                      'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all',
                      reportName.trim()
                        ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-700 hover:to-teal-700 shadow-md shadow-emerald-500/25'
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    )}
                  >
                    {isSaving ? (
                      <>
                        <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        {isNewReport ? 'Create & Continue' : 'Save & Continue'}
                        <ChevronRight className="w-3 h-3" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Step: Template Upload */}
          {currentStep === 'template' && (
            <div className="p-4">
              <h2 className="text-base font-bold text-gray-900 mb-0.5">Upload Template</h2>
              <p className="text-xs text-gray-500 mb-4">
                Upload an Excel template with placeholders like{' '}
                <code className="px-1 py-0.5 bg-gray-100 rounded text-[10px]">{'{{table:name}}'}</code>
              </p>

              {/* Current template */}
              {report?.template_filename && (
                <div className="mb-3 p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-1 bg-emerald-100 rounded-md">
                        <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                      </div>
                      <div>
                        <div className="text-xs font-medium text-emerald-900">{report.template_filename}</div>
                        <div className="text-[10px] text-emerald-600">
                          {report.placeholders.length} placeholder(s) detected
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-1 px-2 py-0.5 text-emerald-700 hover:bg-emerald-100 rounded-md transition-colors text-[10px]"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Replace
                    </button>
                  </div>
                </div>
              )}

              {/* Upload area */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className={clsx(
                  'border-2 border-dashed rounded-lg p-5 text-center cursor-pointer transition-all',
                  isUploading
                    ? 'border-emerald-300 bg-emerald-50'
                    : 'border-gray-300 hover:border-emerald-400 hover:bg-emerald-50/50'
                )}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                {isUploading ? (
                  <div className="flex flex-col items-center">
                    <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mb-2" />
                    <p className="text-xs text-emerald-600 font-medium">Uploading template...</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <div className="w-10 h-10 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-lg flex items-center justify-center mb-2">
                      <Upload className="w-5 h-5 text-emerald-600" />
                    </div>
                    <p className="text-xs text-gray-900 font-medium mb-0.5">
                      {report?.template_filename ? 'Upload a new template' : 'Click to upload'}
                    </p>
                    <p className="text-[10px] text-gray-500">Excel files only (.xlsx, .xls)</p>
                  </div>
                )}
              </div>

              {/* Placeholder format help */}
              <div className="mt-3 p-2.5 bg-gray-50 rounded-lg">
                <h4 className="text-xs font-medium text-gray-900 mb-1.5">Placeholder Format</h4>
                <div className="space-y-1 text-[10px]">
                  <div className="flex items-center gap-1.5">
                    <div className="p-0.5 bg-blue-100 rounded">
                      <Table className="w-2.5 h-2.5 text-blue-600" />
                    </div>
                    <code className="text-blue-600">{'{{table:name}}'}</code>
                    <span className="text-gray-500">- Insert table</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="p-0.5 bg-purple-100 rounded">
                      <Hash className="w-2.5 h-2.5 text-purple-600" />
                    </div>
                    <code className="text-purple-600">{'{{value:name}}'}</code>
                    <span className="text-gray-500">- Insert value</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="p-0.5 bg-amber-100 rounded">
                      <BarChart3 className="w-2.5 h-2.5 text-amber-600" />
                    </div>
                    <code className="text-amber-600">{'{{chart:name}}'}</code>
                    <span className="text-gray-500">- Insert chart</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-between pt-3">
                <button
                  onClick={() => setCurrentStep('details')}
                  className="px-2.5 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={() => setCurrentStep('mappings')}
                  disabled={!report?.template_filename}
                  className={clsx(
                    'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all',
                    report?.template_filename
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-700 hover:to-teal-700 shadow-md shadow-emerald-500/25'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  )}
                >
                  Continue
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}

          {/* Step: Mappings */}
          {currentStep === 'mappings' && (
            <div className="p-4">
              <h2 className="text-base font-bold text-gray-900 mb-0.5">Map Data Sources</h2>
              <p className="text-xs text-gray-500 mb-4">
                Connect each placeholder to a data source.
              </p>

              {report?.placeholders.length === 0 ? (
                <div className="text-center py-6">
                  <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                    <AlertCircle className="w-5 h-5 text-amber-600" />
                  </div>
                  <h3 className="text-xs font-medium text-gray-900 mb-0.5">No Placeholders Found</h3>
                  <p className="text-[10px] text-gray-500 mb-2">
                    Your template doesn't contain any placeholders.
                    <br />
                    Add placeholders like <code>{'{{table:name}}'}</code> to your Excel file.
                  </p>
                  <button
                    onClick={() => setCurrentStep('template')}
                    className="text-[10px] text-emerald-600 hover:text-emerald-700 font-medium"
                  >
                    Upload a different template
                  </button>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    {report?.placeholders.map((placeholder) => (
                      <PlaceholderMappingCard
                        key={placeholder.id}
                        placeholder={placeholder}
                        mapping={mappings[placeholder.id]}
                        visualizations={visualizations}
                        onUpdate={(mapping) => updateMapping(placeholder.id, mapping)}
                      />
                    ))}
                  </div>

                  <div className="flex justify-between pt-3 border-t border-gray-200 mt-3">
                    <button
                      onClick={() => setCurrentStep('template')}
                      className="px-2.5 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      Back
                    </button>
                    <button
                      onClick={handleSaveMappings}
                      disabled={Object.keys(mappings).length === 0 || isSaving}
                      className={clsx(
                        'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all',
                        Object.keys(mappings).length > 0
                          ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-700 hover:to-teal-700 shadow-md shadow-emerald-500/25'
                          : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      )}
                    >
                      {isSaving ? (
                        <>
                          <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          Save & Continue
                          <ChevronRight className="w-3 h-3" />
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Step: Generate */}
          {currentStep === 'generate' && (
            <div className="p-4">
              <h2 className="text-base font-bold text-gray-900 mb-0.5">Generate Report</h2>
              <p className="text-xs text-gray-500 mb-4">
                Your Excel report is ready to be generated with live data.
              </p>

              {/* Summary */}
              <div className="bg-gray-50 rounded-lg p-3 mb-4">
                <h3 className="text-xs font-medium text-gray-900 mb-2">Report Summary</h3>
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <div>
                    <span className="text-gray-500">Template:</span>
                    <span className="ml-1 font-medium text-gray-900">
                      {report?.template_filename || 'None'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Placeholders:</span>
                    <span className="ml-1 font-medium text-gray-900">
                      {report?.placeholders.length || 0}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Mapped:</span>
                    <span className="ml-1 font-medium text-emerald-600">
                      {Object.keys(report?.mappings || {}).length} / {report?.placeholders.length || 0}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Status:</span>
                    <span className="ml-1 font-medium text-emerald-600">Ready</span>
                  </div>
                </div>
              </div>

              {/* Generate button */}
              <div className="flex flex-col items-center py-4">
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className={clsx(
                    'flex items-center gap-1.5 px-5 py-2 text-xs font-medium rounded-lg transition-all',
                    'bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-700 hover:to-teal-700 shadow-lg shadow-emerald-500/30'
                  )}
                >
                  {isGenerating ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Download className="w-3.5 h-3.5" />
                      Generate & Download Excel
                    </>
                  )}
                </button>
                <p className="text-[10px] text-gray-500 mt-2">
                  The report will be generated with current data
                </p>
              </div>

              <div className="flex justify-between pt-3 border-t border-gray-200">
                <button
                  onClick={() => setCurrentStep('mappings')}
                  className="px-2.5 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Back to Mappings
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Share Modal */}
      {showShareModal && reportId && report && (
        <ShareModal
          report={report}
          onShare={() => shareMutation.mutate()}
          onClose={() => setShowShareModal(false)}
          isSharing={shareMutation.isPending}
        />
      )}
    </div>
  )
}

// Placeholder Mapping Card Component - Compact
function PlaceholderMappingCard({
  placeholder,
  mapping,
  visualizations,
  onUpdate,
}: {
  placeholder: ExcelPlaceholder
  mapping?: DataSourceMapping
  visualizations: Visualization[]
  onUpdate: (mapping: DataSourceMapping | null) => void
}) {
  const [showPicker, setShowPicker] = useState(false)
  const [search, setSearch] = useState('')

  const selectedVisualization = mapping?.source_id
    ? visualizations.find((v) => v.id === mapping.source_id)
    : null

  const filteredVisualizations = visualizations.filter((v) =>
    v.name.toLowerCase().includes(search.toLowerCase())
  )

  const getTypeIcon = () => {
    switch (placeholder.type) {
      case 'table':
        return <Table className="w-2.5 h-2.5 text-blue-600" />
      case 'value':
        return <Hash className="w-2.5 h-2.5 text-purple-600" />
      case 'chart':
        return <BarChart3 className="w-2.5 h-2.5 text-amber-600" />
      default:
        return <Database className="w-2.5 h-2.5 text-gray-600" />
    }
  }

  const getTypeBgColor = () => {
    switch (placeholder.type) {
      case 'table':
        return 'bg-blue-100'
      case 'value':
        return 'bg-purple-100'
      case 'chart':
        return 'bg-amber-100'
      default:
        return 'bg-gray-100'
    }
  }

  return (
    <div className="border border-gray-200 rounded-lg p-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className={clsx('p-1 rounded flex-shrink-0', getTypeBgColor())}>{getTypeIcon()}</div>
          <div className="min-w-0">
            <div className="text-xs font-medium text-gray-900 truncate">{placeholder.name}</div>
            <div className="text-[10px] text-gray-500 flex items-center gap-1 flex-wrap">
              <code className="text-[9px] bg-gray-100 px-0.5 rounded">
                {placeholder.placeholder}
              </code>
              <span>•</span>
              <span>{placeholder.sheet_name}:{placeholder.cell_reference}</span>
            </div>
          </div>
        </div>

        {mapping ? (
          <div className="flex items-center gap-1 flex-shrink-0">
            <div className="flex items-center gap-1 px-1.5 py-0.5 bg-emerald-50 text-emerald-700 rounded text-[10px]">
              <CheckCircle2 className="w-2.5 h-2.5" />
              <span className="truncate max-w-[80px]">{selectedVisualization?.name || 'Custom'}</span>
            </div>
            <button
              onClick={() => onUpdate(null)}
              className="p-0.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowPicker(true)}
            className="flex items-center gap-1 px-1.5 py-0.5 text-emerald-600 hover:bg-emerald-50 rounded transition-colors text-[10px] font-medium flex-shrink-0"
          >
            <Database className="w-2.5 h-2.5" />
            Select
          </button>
        )}
      </div>

      {/* Data Source Picker */}
      {showPicker && (
        <div className="mt-2 border-t border-gray-200 pt-2">
          <div className="relative mb-1.5">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400" />
            <input
              type="text"
              placeholder="Search visualizations..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-6 pr-2 py-1 bg-gray-50 border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-[10px]"
              autoFocus
            />
          </div>
          <div className="max-h-28 overflow-y-auto space-y-0.5">
            {filteredVisualizations.length === 0 ? (
              <div className="text-center py-2 text-gray-500 text-[10px]">No visualizations found</div>
            ) : (
              filteredVisualizations.map((v) => (
                <button
                  key={v.id}
                  onClick={() => {
                    onUpdate({ type: 'visualization', source_id: v.id })
                    setShowPicker(false)
                    setSearch('')
                  }}
                  className="w-full text-left p-1 rounded hover:bg-emerald-50 transition-colors flex items-center gap-1.5"
                >
                  <div className="w-5 h-5 bg-gray-100 rounded flex items-center justify-center flex-shrink-0">
                    {v.visualization_type === 'table' ? (
                      <Table className="w-2.5 h-2.5 text-gray-500" />
                    ) : (
                      <BarChart3 className="w-2.5 h-2.5 text-gray-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] font-medium text-gray-900 truncate">{v.name}</div>
                    <div className="text-[9px] text-gray-500 capitalize">{v.visualization_type}</div>
                  </div>
                </button>
              ))
            )}
          </div>
          <div className="flex justify-end pt-1.5 border-t border-gray-200 mt-1.5">
            <button
              onClick={() => {
                setShowPicker(false)
                setSearch('')
              }}
              className="px-2 py-0.5 text-[10px] text-gray-600 hover:bg-gray-100 rounded transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// Share Modal Component - Compact
function ShareModal({
  report,
  onShare,
  onClose,
  isSharing,
}: {
  report: ExcelTemplateReport
  onShare: () => void
  onClose: () => void
  isSharing: boolean
}) {
  const [copied, setCopied] = useState(false)

  const shareUrl = report.share_token
    ? `${window.location.origin}/excel-reports/shared/${report.share_token}`
    : null

  const handleCopy = () => {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleWhatsAppShare = () => {
    const message = `Check out this Excel report: ${report.name}${shareUrl ? `\n${shareUrl}` : ''}`
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`
    window.open(whatsappUrl, '_blank')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-xs overflow-hidden">
        <div className="p-3 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">Share Report</h2>
            <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
              <X className="w-3.5 h-3.5 text-gray-400" />
            </button>
          </div>
          <p className="text-[10px] text-gray-500 mt-0.5">Share your Excel report</p>
        </div>

        <div className="p-3 space-y-3">
          {/* Share Link Section */}
          {report.is_public && shareUrl ? (
            <div>
              <label className="text-[10px] font-medium text-gray-700 mb-1 block">Share link</label>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={shareUrl}
                  readOnly
                  className="flex-1 px-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-[10px]"
                />
                <button
                  onClick={handleCopy}
                  className="px-2 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-lg hover:from-emerald-700 hover:to-teal-700 flex items-center gap-1 transition-all shadow-md shadow-emerald-500/25 text-[10px]"
                >
                  {copied ? <Check className="w-3 h-3" /> : <Link className="w-3 h-3" />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-[10px] text-gray-600 mb-1.5">
                Generate a shareable link for this report.
              </p>
              <button
                onClick={onShare}
                disabled={isSharing}
                className="w-full px-2.5 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-lg hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 text-xs font-medium transition-all shadow-md shadow-emerald-500/25"
              >
                {isSharing ? 'Generating...' : 'Generate Share Link'}
              </button>
            </div>
          )}

          {/* Share via WhatsApp */}
          <div>
            <label className="text-[10px] font-medium text-gray-700 mb-1 block">Share via</label>
            <button
              onClick={handleWhatsAppShare}
              className="w-full flex items-center justify-center gap-1 px-2.5 py-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-xs font-medium"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              WhatsApp
            </button>
          </div>
        </div>

        <div className="p-2.5 border-t border-gray-200 bg-gray-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-2.5 py-1 text-[10px] font-medium text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
