import { useState, useRef, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  Plus,
  FileSpreadsheet,
  Upload,
  Trash2,
  FileText,
  MoreVertical,
  X,
  Check,
  Search,
  Loader2,
  CloudUpload,
  Sparkles,
  Clock,
  ArrowRight,
  FolderOpen,
  Grid3X3,
  List,
  Filter,
  Table,
  Eye,
} from 'lucide-react'
import clsx from 'clsx'
import { excelService } from '../services/excelService'
import type { ExcelTemplateListItem } from '../types'

type ViewMode = 'grid' | 'list'

export default function ExcelTemplates() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dropZoneRef = useRef<HTMLDivElement>(null)

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newTemplateName, setNewTemplateName] = useState('')
  const [newTemplateDescription, setNewTemplateDescription] = useState('')
  const [uploadingTemplateId, setUploadingTemplateId] = useState<number | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeMenu, setActiveMenu] = useState<number | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [isDragging, setIsDragging] = useState(false)
  const [showQuickUpload, setShowQuickUpload] = useState(false)
  const [quickUploadFile, setQuickUploadFile] = useState<File | null>(null)

  // Fetch templates
  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['excel-templates'],
    queryFn: () => excelService.listTemplates(),
  })

  // Create template mutation
  const createMutation = useMutation({
    mutationFn: (data: { name: string; description?: string }) =>
      excelService.createTemplate(data),
    onSuccess: (template) => {
      queryClient.invalidateQueries({ queryKey: ['excel-templates'] })
      setShowCreateModal(false)
      setNewTemplateName('')
      setNewTemplateDescription('')
      setUploadingTemplateId(template.id)
      setTimeout(() => fileInputRef.current?.click(), 100)
    },
  })

  // Quick create with file
  const quickCreateMutation = useMutation({
    mutationFn: async ({ name, file }: { name: string; file: File }) => {
      const template = await excelService.createTemplate({ name })
      await excelService.uploadTemplateFile(template.id, file)
      return template
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['excel-templates'] })
      setShowQuickUpload(false)
      setQuickUploadFile(null)
    },
  })

  // Upload file mutation
  const uploadMutation = useMutation({
    mutationFn: ({ templateId, file }: { templateId: number; file: File }) =>
      excelService.uploadTemplateFile(templateId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['excel-templates'] })
      setUploadingTemplateId(null)
    },
    onError: () => {
      setUploadingTemplateId(null)
    },
  })

  // Delete template mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => excelService.deleteTemplate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['excel-templates'] })
      setActiveMenu(null)
    },
  })

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && uploadingTemplateId) {
      uploadMutation.mutate({ templateId: uploadingTemplateId, file })
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleUploadClick = (templateId: number) => {
    setUploadingTemplateId(templateId)
    setActiveMenu(null)
    setTimeout(() => fileInputRef.current?.click(), 100)
  }

  // Drag and drop handlers
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.target === dropZoneRef.current) {
      setIsDragging(false)
    }
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const file = e.dataTransfer.files?.[0]
    if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))) {
      setQuickUploadFile(file)
      setShowQuickUpload(true)
    }
  }, [])

  const filteredTemplates = templates.filter(
    (t) =>
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const templatesWithFiles = filteredTemplates.filter((t) => t.file_name)
  const templatesWithoutFiles = filteredTemplates.filter((t) => !t.file_name)

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const formatRelativeDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (days === 0) return 'Today'
    if (days === 1) return 'Yesterday'
    if (days < 7) return `${days} days ago`
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`
    return formatDate(dateStr)
  }

  return (
    <div
      className="min-h-screen"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      ref={dropZoneRef}
    >
      {/* Drag Overlay */}
      {isDragging && (
        <div className="fixed inset-0 bg-emerald-500/20 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-white rounded-3xl shadow-2xl p-12 text-center max-w-md mx-4">
            <div className="w-20 h-20 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-6 animate-bounce">
              <CloudUpload className="w-10 h-10 text-emerald-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Drop your Excel file</h3>
            <p className="text-gray-500">Release to create a new template from this file</p>
          </div>
        </div>
      )}

      {/* Hero Header */}
      <div className="bg-gradient-to-br from-emerald-600 via-green-600 to-teal-600 -mx-4 -mt-4 lg:-mx-6 lg:-mt-6 px-4 lg:px-6 pt-8 pb-16 mb-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-sm">
                  <FileSpreadsheet className="w-7 h-7 text-white" />
                </div>
                <h1 className="text-3xl font-bold text-white">Excel Templates</h1>
              </div>
              <p className="text-emerald-100 max-w-xl text-lg">
                Upload Excel templates and connect them to your data sources for automated report generation
              </p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-5 py-3 bg-white text-emerald-700 font-semibold rounded-xl hover:bg-emerald-50 transition-all shadow-lg hover:shadow-xl hover:scale-105"
            >
              <Plus className="w-5 h-5" />
              New Template
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mt-8 max-w-lg">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3">
              <div className="text-2xl font-bold text-white">{templates.length}</div>
              <div className="text-emerald-200 text-sm">Total</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3">
              <div className="text-2xl font-bold text-white">{templatesWithFiles.length}</div>
              <div className="text-emerald-200 text-sm">Ready</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3">
              <div className="text-2xl font-bold text-white">{templatesWithoutFiles.length}</div>
              <div className="text-emerald-200 text-sm">Pending</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto">
        {/* Search and Controls */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 mb-6 -mt-20 relative z-10">
          <div className="flex items-center gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-gray-50 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-900 placeholder-gray-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-200 rounded-full"
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              )}
            </div>

            {/* View Toggle */}
            <div className="flex items-center bg-gray-100 rounded-xl p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={clsx(
                  'p-2.5 rounded-lg transition-all',
                  viewMode === 'grid' ? 'bg-white shadow-sm text-emerald-600' : 'text-gray-500 hover:text-gray-700'
                )}
              >
                <Grid3X3 className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={clsx(
                  'p-2.5 rounded-lg transition-all',
                  viewMode === 'list' ? 'bg-white shadow-sm text-emerald-600' : 'text-gray-500 hover:text-gray-700'
                )}
              >
                <List className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24">
            <Loader2 className="w-12 h-12 text-emerald-600 animate-spin" />
            <p className="mt-4 text-gray-500">Loading templates...</p>
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="text-center py-20">
            <div className="max-w-md mx-auto">
              {/* Empty State Illustration */}
              <div className="relative mb-8">
                <div className="w-32 h-32 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-3xl mx-auto flex items-center justify-center">
                  <FileSpreadsheet className="w-16 h-16 text-emerald-500" />
                </div>
                <div className="absolute -bottom-2 -right-2 w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-amber-500" />
                </div>
              </div>

              <h3 className="text-2xl font-bold text-gray-900 mb-3">
                {searchQuery ? 'No templates found' : 'Create your first template'}
              </h3>
              <p className="text-gray-500 mb-8 text-lg">
                {searchQuery
                  ? `No templates match "${searchQuery}". Try a different search.`
                  : 'Upload an Excel file to use as a template for automated reports. Drag & drop or click to upload.'}
              </p>

              {!searchQuery && (
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 transition-all shadow-lg hover:shadow-xl"
                  >
                    <Upload className="w-5 h-5" />
                    Upload Template
                  </button>
                  <button
                    onClick={() => navigate('/reports')}
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-all"
                  >
                    <FolderOpen className="w-5 h-5" />
                    View Reports
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Ready Templates */}
            {templatesWithFiles.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                  <h2 className="text-lg font-semibold text-gray-900">
                    Ready to Use ({templatesWithFiles.length})
                  </h2>
                </div>

                {viewMode === 'grid' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {templatesWithFiles.map((template) => (
                      <TemplateCardGrid
                        key={template.id}
                        template={template}
                        isUploading={uploadingTemplateId === template.id && uploadMutation.isPending}
                        isMenuOpen={activeMenu === template.id}
                        onMenuToggle={() => setActiveMenu(activeMenu === template.id ? null : template.id)}
                        onUpload={() => handleUploadClick(template.id)}
                        onDelete={() => deleteMutation.mutate(template.id)}
                        onCreateReport={() => navigate(`/excel-reports/new?template=${template.id}`)}
                        formatRelativeDate={formatRelativeDate}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {templatesWithFiles.map((template) => (
                      <TemplateCardList
                        key={template.id}
                        template={template}
                        isUploading={uploadingTemplateId === template.id && uploadMutation.isPending}
                        isMenuOpen={activeMenu === template.id}
                        onMenuToggle={() => setActiveMenu(activeMenu === template.id ? null : template.id)}
                        onUpload={() => handleUploadClick(template.id)}
                        onDelete={() => deleteMutation.mutate(template.id)}
                        onCreateReport={() => navigate(`/excel-reports/new?template=${template.id}`)}
                        formatRelativeDate={formatRelativeDate}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Pending Templates */}
            {templatesWithoutFiles.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-2 h-2 bg-amber-500 rounded-full" />
                  <h2 className="text-lg font-semibold text-gray-500">
                    Pending Upload ({templatesWithoutFiles.length})
                  </h2>
                </div>

                {viewMode === 'grid' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {templatesWithoutFiles.map((template) => (
                      <TemplateCardGrid
                        key={template.id}
                        template={template}
                        isUploading={uploadingTemplateId === template.id && uploadMutation.isPending}
                        isMenuOpen={activeMenu === template.id}
                        onMenuToggle={() => setActiveMenu(activeMenu === template.id ? null : template.id)}
                        onUpload={() => handleUploadClick(template.id)}
                        onDelete={() => deleteMutation.mutate(template.id)}
                        onCreateReport={() => navigate(`/excel-reports/new?template=${template.id}`)}
                        formatRelativeDate={formatRelativeDate}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {templatesWithoutFiles.map((template) => (
                      <TemplateCardList
                        key={template.id}
                        template={template}
                        isUploading={uploadingTemplateId === template.id && uploadMutation.isPending}
                        isMenuOpen={activeMenu === template.id}
                        onMenuToggle={() => setActiveMenu(activeMenu === template.id ? null : template.id)}
                        onUpload={() => handleUploadClick(template.id)}
                        onDelete={() => deleteMutation.mutate(template.id)}
                        onCreateReport={() => navigate(`/excel-reports/new?template=${template.id}`)}
                        formatRelativeDate={formatRelativeDate}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Create Template Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <FileSpreadsheet className="w-6 h-6 text-white" />
                  </div>
                  <h2 className="text-xl font-semibold text-white">New Template</h2>
                </div>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Template Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newTemplateName}
                  onChange={(e) => setNewTemplateName(e.target.value)}
                  placeholder="e.g., Monthly Sales Report"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-lg"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description <span className="text-gray-400">(optional)</span>
                </label>
                <textarea
                  value={newTemplateDescription}
                  onChange={(e) => setNewTemplateDescription(e.target.value)}
                  placeholder="Describe what this template is for..."
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
                />
              </div>

              {/* Info Box */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex gap-3">
                <div className="p-1.5 bg-emerald-100 rounded-lg h-fit">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="text-sm">
                  <p className="font-medium text-emerald-800">After creating, you'll upload an Excel file</p>
                  <p className="text-emerald-600 mt-0.5">The file will be parsed to detect sheets and structure</p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 px-6 py-4 bg-gray-50 border-t border-gray-100">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-5 py-2.5 text-gray-700 hover:bg-gray-200 rounded-xl font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  createMutation.mutate({
                    name: newTemplateName,
                    description: newTemplateDescription || undefined,
                  })
                }
                disabled={!newTemplateName.trim() || createMutation.isPending}
                className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {createMutation.isPending ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    Create & Upload
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Upload Modal */}
      {showQuickUpload && quickUploadFile && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <CloudUpload className="w-6 h-6 text-white" />
                  </div>
                  <h2 className="text-xl font-semibold text-white">Quick Upload</h2>
                </div>
                <button
                  onClick={() => {
                    setShowQuickUpload(false)
                    setQuickUploadFile(null)
                  }}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-5">
              {/* File Preview */}
              <div className="bg-gray-50 rounded-xl p-4 flex items-center gap-4">
                <div className="w-14 h-14 bg-emerald-100 rounded-xl flex items-center justify-center">
                  <FileSpreadsheet className="w-7 h-7 text-emerald-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{quickUploadFile.name}</p>
                  <p className="text-sm text-gray-500">
                    {(quickUploadFile.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                <div className="p-2 bg-emerald-100 rounded-full">
                  <Check className="w-5 h-5 text-emerald-600" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Template Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newTemplateName || quickUploadFile.name.replace(/\.(xlsx|xls)$/i, '')}
                  onChange={(e) => setNewTemplateName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-lg"
                  autoFocus
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 bg-gray-50 border-t border-gray-100">
              <button
                onClick={() => {
                  setShowQuickUpload(false)
                  setQuickUploadFile(null)
                }}
                className="px-5 py-2.5 text-gray-700 hover:bg-gray-200 rounded-xl font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  quickCreateMutation.mutate({
                    name: newTemplateName || quickUploadFile.name.replace(/\.(xlsx|xls)$/i, ''),
                    file: quickUploadFile,
                  })
                }
                disabled={quickCreateMutation.isPending}
                className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {quickCreateMutation.isPending ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Create Template
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Grid View Card
function TemplateCardGrid({
  template,
  isUploading,
  isMenuOpen,
  onMenuToggle,
  onUpload,
  onDelete,
  onCreateReport,
  formatRelativeDate,
}: {
  template: ExcelTemplateListItem
  isUploading: boolean
  isMenuOpen: boolean
  onMenuToggle: () => void
  onUpload: () => void
  onDelete: () => void
  onCreateReport: () => void
  formatRelativeDate: (date: string) => string
}) {
  const hasFile = !!template.file_name

  return (
    <div
      className={clsx(
        'group bg-white rounded-2xl border overflow-hidden transition-all hover:shadow-lg',
        hasFile ? 'border-gray-200 hover:border-emerald-300' : 'border-dashed border-gray-300 hover:border-emerald-400'
      )}
    >
      {/* Preview Area */}
      <div
        className={clsx(
          'h-40 relative overflow-hidden',
          hasFile
            ? 'bg-gradient-to-br from-emerald-50 via-teal-50 to-green-50'
            : 'bg-gradient-to-br from-gray-50 to-gray-100'
        )}
      >
        {hasFile ? (
          <>
            {/* Spreadsheet Preview Pattern */}
            <div className="absolute inset-4 flex flex-col gap-2">
              {/* Header Row */}
              <div className="flex gap-1">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-5 flex-1 bg-emerald-200/60 rounded" />
                ))}
              </div>
              {/* Data Rows */}
              {[1, 2, 3, 4].map((row) => (
                <div key={row} className="flex gap-1">
                  {[1, 2, 3, 4].map((col) => (
                    <div key={col} className="h-4 flex-1 bg-gray-200/50 rounded" />
                  ))}
                </div>
              ))}
            </div>

            {/* Status Badge */}
            <div className="absolute top-3 left-3">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-full">
                <Check className="w-3 h-3" />
                Ready
              </span>
            </div>
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="w-16 h-16 bg-gray-200 rounded-xl flex items-center justify-center mb-3">
              <Upload className="w-8 h-8 text-gray-400" />
            </div>
            <span className="text-sm text-gray-500">No file uploaded</span>
          </div>
        )}

        {/* Menu Button */}
        <div className="absolute top-3 right-3">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onMenuToggle()
            }}
            className="p-1.5 bg-white/80 hover:bg-white rounded-lg shadow-sm transition-all"
          >
            <MoreVertical className="w-4 h-4 text-gray-600" />
          </button>

          {isMenuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={onMenuToggle} />
              <div className="absolute right-0 top-8 w-48 bg-white rounded-xl shadow-lg border border-gray-200 py-1.5 z-20">
                {hasFile && (
                  <button
                    onClick={onCreateReport}
                    className="flex items-center gap-2.5 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <FileText className="w-4 h-4 text-gray-400" />
                    Create Report
                  </button>
                )}
                <button
                  onClick={onUpload}
                  className="flex items-center gap-2.5 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <Upload className="w-4 h-4 text-gray-400" />
                  {hasFile ? 'Replace File' : 'Upload File'}
                </button>
                <div className="my-1 border-t border-gray-100" />
                <button
                  onClick={onDelete}
                  className="flex items-center gap-2.5 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Template
                </button>
              </div>
            </>
          )}
        </div>

        {/* Hover Overlay */}
        {hasFile && (
          <div
            onClick={onCreateReport}
            className="absolute inset-0 bg-emerald-600/0 group-hover:bg-emerald-600/10 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer"
          >
            <span className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl shadow-lg text-sm font-medium text-emerald-600">
              Create Report
              <ArrowRight className="w-4 h-4" />
            </span>
          </div>
        )}
      </div>

      {/* Card Content */}
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 truncate group-hover:text-emerald-600 transition-colors">
          {template.name}
        </h3>
        {template.file_name && (
          <p className="text-sm text-gray-500 truncate mt-0.5">{template.file_name}</p>
        )}
        {template.description && (
          <p className="text-sm text-gray-500 line-clamp-2 mt-2">{template.description}</p>
        )}

        {/* Meta */}
        <div className="flex items-center gap-3 mt-4 pt-3 border-t border-gray-100">
          <span className="inline-flex items-center gap-1.5 text-xs text-gray-500">
            <Clock className="w-3.5 h-3.5" />
            {formatRelativeDate(template.created_at)}
          </span>
        </div>
      </div>

      {/* Action Button */}
      <div className="px-4 pb-4">
        {isUploading ? (
          <div className="flex items-center justify-center gap-2 py-3 text-emerald-600">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="font-medium">Uploading...</span>
          </div>
        ) : hasFile ? (
          <button
            onClick={onCreateReport}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold rounded-xl hover:from-emerald-700 hover:to-teal-700 transition-all shadow-sm hover:shadow-md"
          >
            <Sparkles className="w-4 h-4" />
            Create Report
          </button>
        ) : (
          <button
            onClick={onUpload}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 text-gray-600 font-medium rounded-xl hover:border-emerald-500 hover:text-emerald-600 hover:bg-emerald-50 transition-all"
          >
            <Upload className="w-4 h-4" />
            Upload Excel File
          </button>
        )}
      </div>
    </div>
  )
}

// List View Card
function TemplateCardList({
  template,
  isUploading,
  isMenuOpen,
  onMenuToggle,
  onUpload,
  onDelete,
  onCreateReport,
  formatRelativeDate,
}: {
  template: ExcelTemplateListItem
  isUploading: boolean
  isMenuOpen: boolean
  onMenuToggle: () => void
  onUpload: () => void
  onDelete: () => void
  onCreateReport: () => void
  formatRelativeDate: (date: string) => string
}) {
  const hasFile = !!template.file_name

  return (
    <div
      className={clsx(
        'group flex items-center gap-4 bg-white rounded-xl border p-4 transition-all hover:shadow-md',
        hasFile ? 'border-gray-200 hover:border-emerald-300' : 'border-dashed border-gray-300'
      )}
    >
      {/* Icon */}
      <div
        className={clsx(
          'w-14 h-14 rounded-xl flex items-center justify-center shrink-0',
          hasFile
            ? 'bg-gradient-to-br from-emerald-500 to-teal-600'
            : 'bg-gray-100'
        )}
      >
        <FileSpreadsheet className={clsx('w-7 h-7', hasFile ? 'text-white' : 'text-gray-400')} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-gray-900 truncate group-hover:text-emerald-600 transition-colors">
            {template.name}
          </h3>
          {hasFile ? (
            <span className="shrink-0 px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-full">
              Ready
            </span>
          ) : (
            <span className="shrink-0 px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">
              Pending
            </span>
          )}
        </div>
        {template.file_name && (
          <p className="text-sm text-gray-500 truncate mt-0.5">{template.file_name}</p>
        )}
        <div className="flex items-center gap-4 mt-1 text-xs text-gray-400">
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {formatRelativeDate(template.created_at)}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 shrink-0">
        {isUploading ? (
          <div className="flex items-center gap-2 text-emerald-600">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm font-medium">Uploading...</span>
          </div>
        ) : hasFile ? (
          <button
            onClick={onCreateReport}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition-all"
          >
            <Sparkles className="w-4 h-4" />
            Create Report
          </button>
        ) : (
          <button
            onClick={onUpload}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-600 font-medium rounded-lg hover:border-emerald-500 hover:text-emerald-600 transition-all"
          >
            <Upload className="w-4 h-4" />
            Upload
          </button>
        )}

        <div className="relative">
          <button
            onClick={onMenuToggle}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <MoreVertical className="w-5 h-5 text-gray-400" />
          </button>

          {isMenuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={onMenuToggle} />
              <div className="absolute right-0 top-10 w-48 bg-white rounded-xl shadow-lg border border-gray-200 py-1.5 z-20">
                {hasFile && (
                  <button
                    onClick={onCreateReport}
                    className="flex items-center gap-2.5 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <FileText className="w-4 h-4 text-gray-400" />
                    Create Report
                  </button>
                )}
                <button
                  onClick={onUpload}
                  className="flex items-center gap-2.5 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <Upload className="w-4 h-4 text-gray-400" />
                  {hasFile ? 'Replace File' : 'Upload File'}
                </button>
                <div className="my-1 border-t border-gray-100" />
                <button
                  onClick={onDelete}
                  className="flex items-center gap-2.5 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Template
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
