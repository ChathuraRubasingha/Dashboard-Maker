import { useState, useRef } from 'react'
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
} from 'lucide-react'
import clsx from 'clsx'
import { excelService } from '../services/excelService'
import type { ExcelTemplateListItem } from '../types'

export default function ExcelTemplates() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newTemplateName, setNewTemplateName] = useState('')
  const [newTemplateDescription, setNewTemplateDescription] = useState('')
  const [uploadingTemplateId, setUploadingTemplateId] = useState<number | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeMenu, setActiveMenu] = useState<number | null>(null)

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
      // Trigger file upload for the new template
      setUploadingTemplateId(template.id)
      setTimeout(() => fileInputRef.current?.click(), 100)
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
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleUploadClick = (templateId: number) => {
    setUploadingTemplateId(templateId)
    setActiveMenu(null)
    setTimeout(() => fileInputRef.current?.click(), 100)
  }

  const filteredTemplates = templates.filter(
    (t) =>
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Excel Templates</h1>
          <p className="text-gray-500 mt-1">
            Upload and manage Excel templates for report generation
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          New Template
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search templates..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
        />
      </div>

      {/* Templates Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-3 border-green-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filteredTemplates.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <FileSpreadsheet className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchQuery ? 'No templates found' : 'No templates yet'}
          </h3>
          <p className="text-gray-500 mb-6">
            {searchQuery
              ? 'Try a different search term'
              : 'Upload your first Excel template to get started'}
          </p>
          {!searchQuery && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <Upload className="w-5 h-5" />
              Upload Template
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              isUploading={uploadingTemplateId === template.id && uploadMutation.isPending}
              isMenuOpen={activeMenu === template.id}
              onMenuToggle={() => setActiveMenu(activeMenu === template.id ? null : template.id)}
              onUpload={() => handleUploadClick(template.id)}
              onDelete={() => deleteMutation.mutate(template.id)}
              onCreateReport={() => navigate(`/excel-reports/new?template=${template.id}`)}
              formatDate={formatDate}
            />
          ))}
        </div>
      )}

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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">New Template</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Template Name
                </label>
                <input
                  type="text"
                  value={newTemplateName}
                  onChange={(e) => setNewTemplateName(e.target.value)}
                  placeholder="e.g., Monthly Sales Report"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description (optional)
                </label>
                <textarea
                  value={newTemplateDescription}
                  onChange={(e) => setNewTemplateDescription(e.target.value)}
                  placeholder="Describe what this template is for..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
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
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {createMutation.isPending ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                Create & Upload File
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Template Card Component
function TemplateCard({
  template,
  isUploading,
  isMenuOpen,
  onMenuToggle,
  onUpload,
  onDelete,
  onCreateReport,
  formatDate,
}: {
  template: ExcelTemplateListItem
  isUploading: boolean
  isMenuOpen: boolean
  onMenuToggle: () => void
  onUpload: () => void
  onDelete: () => void
  onCreateReport: () => void
  formatDate: (date: string) => string
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className={clsx(
                'w-12 h-12 rounded-xl flex items-center justify-center',
                template.file_name
                  ? 'bg-green-100 text-green-600'
                  : 'bg-gray-100 text-gray-400'
              )}
            >
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">{template.name}</h3>
              {template.file_name ? (
                <p className="text-sm text-gray-500 truncate max-w-[180px]">
                  {template.file_name}
                </p>
              ) : (
                <p className="text-sm text-amber-600">No file uploaded</p>
              )}
            </div>
          </div>

          <div className="relative">
            <button
              onClick={onMenuToggle}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <MoreVertical className="w-5 h-5 text-gray-400" />
            </button>

            {isMenuOpen && (
              <div className="absolute right-0 top-8 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                <button
                  onClick={onUpload}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <Upload className="w-4 h-4" />
                  {template.file_name ? 'Replace File' : 'Upload File'}
                </button>
                <button
                  onClick={onDelete}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Template
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {template.description && (
          <p className="text-sm text-gray-600 mb-4 line-clamp-2">
            {template.description}
          </p>
        )}

        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>Created {formatDate(template.created_at)}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="px-4 pb-4">
        {isUploading ? (
          <div className="flex items-center justify-center gap-2 py-2 text-green-600">
            <div className="w-4 h-4 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
            Uploading...
          </div>
        ) : template.file_name ? (
          <button
            onClick={onCreateReport}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <FileText className="w-4 h-4" />
            Create Report
          </button>
        ) : (
          <button
            onClick={onUpload}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 text-gray-600 rounded-lg hover:border-green-500 hover:text-green-600 transition-colors"
          >
            <Upload className="w-4 h-4" />
            Upload Excel File
          </button>
        )}
      </div>
    </div>
  )
}
