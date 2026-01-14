import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus,
  Search,
  MoreVertical,
  Trash2,
  Archive,
  FileText,
  FileSpreadsheet,
  Eye,
  Copy,
  Link2,
  Calendar,
  Layers,
  Globe,
  Lock,
  X,
  Filter,
  Grid3X3,
  List,
  ChevronDown,
} from 'lucide-react'
import clsx from 'clsx'
import { reportService } from '../services/reportService'
import { excelReportService } from '../services/excelReportService'
import { DeleteConfirmDialog } from '../components/ui/ConfirmDialog'
import { useToast } from '../components/ui/Toast'
import type { ReportListItem, ExcelTemplateReportListItem } from '../types'

type ViewMode = 'grid' | 'list'
type SortOption = 'updated' | 'created' | 'name'
type ReportTab = 'widget' | 'excel'

export default function ReportList() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const toast = useToast()

  const [activeTab, setActiveTab] = useState<ReportTab>('widget')
  const [searchQuery, setSearchQuery] = useState('')
  const [showArchived, setShowArchived] = useState(false)
  const [menuOpenId, setMenuOpenId] = useState<number | null>(null)
  const [menuOpenType, setMenuOpenType] = useState<'widget' | 'excel' | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [sortBy, setSortBy] = useState<SortOption>('updated')
  const [showFilters, setShowFilters] = useState(false)
  const [showNewMenu, setShowNewMenu] = useState(false)

  // Delete confirmation state
  const [deleteWidgetTarget, setDeleteWidgetTarget] = useState<ReportListItem | null>(null)
  const [deleteExcelTarget, setDeleteExcelTarget] = useState<ExcelTemplateReportListItem | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Fetch widget-based reports
  const { data: reports = [], isLoading } = useQuery({
    queryKey: ['reports', showArchived],
    queryFn: () => reportService.list(showArchived),
  })

  // Fetch Excel template reports
  const { data: excelReports = [], isLoading: isLoadingExcel } = useQuery({
    queryKey: ['excel-reports', showArchived],
    queryFn: () => excelReportService.list(showArchived),
  })

  const deleteMutation = useMutation({
    mutationFn: reportService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] })
      toast.success('Report deleted', 'The report has been permanently removed')
      setDeleteWidgetTarget(null)
      setIsDeleting(false)
    },
    onError: () => {
      toast.error('Failed to delete report', 'Please try again')
      setIsDeleting(false)
    },
  })

  const archiveMutation = useMutation({
    mutationFn: ({ id, archived }: { id: number; archived: boolean }) =>
      reportService.update(id, { is_archived: archived }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['reports'] })
      toast.success(
        variables.archived ? 'Report archived' : 'Report restored',
        variables.archived ? 'The report has been archived' : 'The report has been restored'
      )
    },
    onError: () => {
      toast.error('Operation failed', 'Please try again')
    },
  })

  const duplicateMutation = useMutation({
    mutationFn: (id: number) => reportService.duplicate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] })
      toast.success('Report duplicated', 'A copy of the report has been created')
    },
    onError: () => {
      toast.error('Failed to duplicate report', 'Please try again')
    },
  })

  // Excel report mutations
  const deleteExcelMutation = useMutation({
    mutationFn: excelReportService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['excel-reports'] })
      toast.success('Excel report deleted', 'The report has been permanently removed')
      setDeleteExcelTarget(null)
      setIsDeleting(false)
    },
    onError: () => {
      toast.error('Failed to delete Excel report', 'Please try again')
      setIsDeleting(false)
    },
  })

  const archiveExcelMutation = useMutation({
    mutationFn: ({ id, archived }: { id: number; archived: boolean }) =>
      excelReportService.update(id, { is_archived: archived }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['excel-reports'] })
      toast.success(
        variables.archived ? 'Excel report archived' : 'Excel report restored',
        variables.archived ? 'The report has been archived' : 'The report has been restored'
      )
    },
    onError: () => {
      toast.error('Operation failed', 'Please try again')
    },
  })

  const duplicateExcelMutation = useMutation({
    mutationFn: (id: number) => excelReportService.duplicate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['excel-reports'] })
      toast.success('Excel report duplicated', 'A copy of the report has been created')
    },
    onError: () => {
      toast.error('Failed to duplicate Excel report', 'Please try again')
    },
  })

  // Delete confirmation handlers
  const handleDeleteWidget = (report: ReportListItem) => {
    setDeleteWidgetTarget(report)
    setMenuOpenId(null)
  }

  const confirmDeleteWidget = () => {
    if (deleteWidgetTarget) {
      setIsDeleting(true)
      deleteMutation.mutate(deleteWidgetTarget.id)
    }
  }

  const handleDeleteExcel = (report: ExcelTemplateReportListItem) => {
    setDeleteExcelTarget(report)
    setMenuOpenId(null)
  }

  const confirmDeleteExcel = () => {
    if (deleteExcelTarget) {
      setIsDeleting(true)
      deleteExcelMutation.mutate(deleteExcelTarget.id)
    }
  }

  // Filter and sort reports
  const filteredReports = reports
    .filter((r) => r.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name)
        case 'created':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        case 'updated':
        default:
          return new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime()
      }
    })

  const activeReports = filteredReports.filter(r => !r.is_archived)
  const archivedReports = filteredReports.filter(r => r.is_archived)

  // Filter and sort Excel reports
  const filteredExcelReports = excelReports
    .filter((r) => r.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name)
        case 'created':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        case 'updated':
        default:
          return new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime()
      }
    })

  const activeExcelReports = filteredExcelReports.filter(r => !r.is_archived)
  const archivedExcelReports = filteredExcelReports.filter(r => r.is_archived)

  const totalReports = reports.length + excelReports.length
  const totalShared = reports.filter(r => r.is_public).length + excelReports.filter(r => r.is_public).length
  const totalArchived = reports.filter(r => r.is_archived).length + excelReports.filter(r => r.is_archived).length

  return (
    <div className="min-h-screen">
      {/* Hero Header */}
      <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 -mx-4 -mt-4 lg:-mx-6 lg:-mt-6 px-4 lg:px-6 pt-8 pb-12 mb-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <h1 className="text-3xl font-bold text-white">Reports</h1>
              </div>
              <p className="text-purple-100 max-w-xl">
                Build professional reports combining visualizations, tables, and insights for sharing
              </p>
            </div>
            <div className="relative">
              <button
                onClick={() => setShowNewMenu(!showNewMenu)}
                className="flex items-center gap-2 px-5 py-2.5 bg-white text-purple-700 font-semibold rounded-xl hover:bg-purple-50 transition-all shadow-lg hover:shadow-xl"
              >
                <Plus className="w-5 h-5" />
                New Report
                <ChevronDown className="w-4 h-4" />
              </button>
              {showNewMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowNewMenu(false)} />
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-200 py-2 z-20">
                    <button
                      onClick={() => {
                        navigate('/reports/new')
                        setShowNewMenu(false)
                      }}
                      className="flex items-start gap-3 w-full px-4 py-3 text-left hover:bg-purple-50 transition-colors"
                    >
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <FileText className="w-5 h-5 text-purple-600" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">Widget Report</div>
                        <div className="text-xs text-gray-500">Visual report with charts & text</div>
                      </div>
                    </button>
                    <button
                      onClick={() => {
                        navigate('/excel-templates')
                        setShowNewMenu(false)
                      }}
                      className="flex items-start gap-3 w-full px-4 py-3 text-left hover:bg-emerald-50 transition-colors"
                    >
                      <div className="p-2 bg-emerald-100 rounded-lg">
                        <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">Excel Report</div>
                        <div className="text-xs text-gray-500">Select template & map data</div>
                      </div>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mt-8 max-w-lg">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3">
              <div className="text-2xl font-bold text-white">{totalReports}</div>
              <div className="text-purple-200 text-sm">Total</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3">
              <div className="text-2xl font-bold text-white">{totalShared}</div>
              <div className="text-purple-200 text-sm">Shared</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3">
              <div className="text-2xl font-bold text-white">{totalArchived}</div>
              <div className="text-purple-200 text-sm">Archived</div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-2 mt-8">
            <button
              onClick={() => setActiveTab('widget')}
              className={clsx(
                'flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all',
                activeTab === 'widget'
                  ? 'bg-white text-purple-700'
                  : 'bg-white/10 text-white hover:bg-white/20'
              )}
            >
              <FileText className="w-4 h-4" />
              Widget Reports
              <span className={clsx(
                'px-2 py-0.5 text-xs rounded-full',
                activeTab === 'widget' ? 'bg-purple-100 text-purple-700' : 'bg-white/20'
              )}>
                {reports.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('excel')}
              className={clsx(
                'flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all',
                activeTab === 'excel'
                  ? 'bg-white text-emerald-700'
                  : 'bg-white/10 text-white hover:bg-white/20'
              )}
            >
              <FileSpreadsheet className="w-4 h-4" />
              Excel Reports
              <span className={clsx(
                'px-2 py-0.5 text-xs rounded-full',
                activeTab === 'excel' ? 'bg-emerald-100 text-emerald-700' : 'bg-white/20'
              )}>
                {excelReports.length}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Search and Controls */}
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 mb-6 -mt-16 relative z-10">
          <div className="flex items-center gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search reports by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-gray-50 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900 placeholder-gray-500"
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

            {/* Filters Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={clsx(
                'flex items-center gap-2 px-4 py-3 rounded-xl border transition-all',
                showFilters
                  ? 'bg-purple-50 border-purple-200 text-purple-700'
                  : 'bg-gray-50 border-transparent text-gray-600 hover:bg-gray-100'
              )}
            >
              <Filter className="w-5 h-5" />
              <span className="hidden sm:inline">Filters</span>
            </button>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="px-4 py-3 bg-gray-50 border-0 rounded-xl text-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
            >
              <option value="updated">Recently Updated</option>
              <option value="created">Recently Created</option>
              <option value="name">Name (A-Z)</option>
            </select>

            {/* View Toggle */}
            <div className="flex items-center bg-gray-100 rounded-xl p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={clsx(
                  'p-2 rounded-lg transition-all',
                  viewMode === 'grid' ? 'bg-white shadow-sm text-purple-600' : 'text-gray-500 hover:text-gray-700'
                )}
              >
                <Grid3X3 className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={clsx(
                  'p-2 rounded-lg transition-all',
                  viewMode === 'list' ? 'bg-white shadow-sm text-purple-600' : 'text-gray-500 hover:text-gray-700'
                )}
              >
                <List className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Extended Filters */}
          {showFilters && (
            <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-100">
              <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showArchived}
                  onChange={(e) => setShowArchived(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                />
                Show archived reports
              </label>
            </div>
          )}
        </div>

        {/* Results Count */}
        {searchQuery && (
          <div className="mb-4 text-sm text-gray-500">
            Found {activeTab === 'widget' ? filteredReports.length : filteredExcelReports.length} report{(activeTab === 'widget' ? filteredReports.length : filteredExcelReports.length) !== 1 ? 's' : ''} matching "{searchQuery}"
          </div>
        )}

        {/* Widget Reports Tab */}
        {activeTab === 'widget' && (
          <>
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-24">
                <div className="w-12 h-12 border-3 border-purple-600 border-t-transparent rounded-full animate-spin" />
                <p className="mt-4 text-gray-500">Loading reports...</p>
              </div>
            ) : filteredReports.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
                <div className="w-20 h-20 bg-purple-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <FileText className="w-10 h-10 text-purple-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {searchQuery ? 'No reports found' : 'No widget reports yet'}
                </h3>
                <p className="text-gray-500 mb-6 max-w-md mx-auto">
                  {searchQuery
                    ? `No reports match "${searchQuery}". Try a different search term.`
                    : 'Create your first widget report to combine visualizations into shareable documents.'}
                </p>
                {!searchQuery && (
                  <button
                    onClick={() => navigate('/reports/new')}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 text-white font-semibold rounded-xl hover:bg-purple-700 transition-colors"
                  >
                    <Plus className="w-5 h-5" />
                    Create Widget Report
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-8">
                {/* Active Reports */}
                {activeReports.length > 0 && (
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">
                      Active Reports ({activeReports.length})
                    </h2>
                    <div className={clsx(
                      viewMode === 'grid'
                        ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5'
                        : 'space-y-3'
                    )}>
                      {activeReports.map((report) => (
                        <ReportCard
                          key={report.id}
                          report={report}
                          viewMode={viewMode}
                          isMenuOpen={menuOpenId === report.id && menuOpenType === 'widget'}
                          onMenuToggle={() => {
                            setMenuOpenId(menuOpenId === report.id ? null : report.id)
                            setMenuOpenType('widget')
                          }}
                          onDelete={() => handleDeleteWidget(report)}
                          onArchive={() => {
                            archiveMutation.mutate({ id: report.id, archived: !report.is_archived })
                            setMenuOpenId(null)
                          }}
                          onDuplicate={() => {
                            duplicateMutation.mutate(report.id)
                            setMenuOpenId(null)
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Archived Reports */}
                {/* Archived Widget Reports */}
                {showArchived && archivedReports.length > 0 && (
                  <div>
                    <h2 className="text-lg font-semibold text-gray-500 mb-4">
                      Archived ({archivedReports.length})
                    </h2>
                    <div className={clsx(
                      viewMode === 'grid'
                        ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5'
                        : 'space-y-3'
                    )}>
                      {archivedReports.map((report) => (
                        <ReportCard
                          key={report.id}
                          report={report}
                          viewMode={viewMode}
                          isMenuOpen={menuOpenId === report.id && menuOpenType === 'widget'}
                          onMenuToggle={() => {
                            setMenuOpenId(menuOpenId === report.id ? null : report.id)
                            setMenuOpenType('widget')
                          }}
                          onDelete={() => handleDeleteWidget(report)}
                          onArchive={() => {
                            archiveMutation.mutate({ id: report.id, archived: !report.is_archived })
                            setMenuOpenId(null)
                          }}
                          onDuplicate={() => {
                            duplicateMutation.mutate(report.id)
                            setMenuOpenId(null)
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Excel Reports Tab */}
        {activeTab === 'excel' && (
          <>
            {isLoadingExcel ? (
              <div className="flex flex-col items-center justify-center py-24">
                <div className="w-12 h-12 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
                <p className="mt-4 text-gray-500">Loading Excel reports...</p>
              </div>
            ) : filteredExcelReports.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
                <div className="w-20 h-20 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <FileSpreadsheet className="w-10 h-10 text-emerald-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {searchQuery ? 'No Excel reports found' : 'No Excel reports yet'}
                </h3>
                <p className="text-gray-500 mb-6 max-w-md mx-auto">
                  {searchQuery
                    ? `No Excel reports match "${searchQuery}". Try a different search term.`
                    : 'Create your first Excel report by uploading a template with placeholders.'}
                </p>
                {!searchQuery && (
                  <button
                    onClick={() => navigate('/excel-templates')}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 transition-colors"
                  >
                    <Plus className="w-5 h-5" />
                    Create Excel Report
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-8">
                {/* Active Excel Reports */}
                {activeExcelReports.length > 0 && (
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">
                      Active Reports ({activeExcelReports.length})
                    </h2>
                    <div className={clsx(
                      viewMode === 'grid'
                        ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5'
                        : 'space-y-3'
                    )}>
                      {activeExcelReports.map((report) => (
                        <ExcelReportCard
                          key={report.id}
                          report={report}
                          viewMode={viewMode}
                          isMenuOpen={menuOpenId === report.id && menuOpenType === 'excel'}
                          onMenuToggle={() => {
                            setMenuOpenId(menuOpenId === report.id ? null : report.id)
                            setMenuOpenType('excel')
                          }}
                          onDelete={() => handleDeleteExcel(report)}
                          onArchive={() => {
                            archiveExcelMutation.mutate({ id: report.id, archived: !report.is_archived })
                            setMenuOpenId(null)
                          }}
                          onDuplicate={() => {
                            duplicateExcelMutation.mutate(report.id)
                            setMenuOpenId(null)
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Archived Excel Reports */}
                {showArchived && archivedExcelReports.length > 0 && (
                  <div>
                    <h2 className="text-lg font-semibold text-gray-500 mb-4">
                      Archived ({archivedExcelReports.length})
                    </h2>
                    <div className={clsx(
                      viewMode === 'grid'
                        ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5'
                        : 'space-y-3'
                    )}>
                      {archivedExcelReports.map((report) => (
                        <ExcelReportCard
                          key={report.id}
                          report={report}
                          viewMode={viewMode}
                          isMenuOpen={menuOpenId === report.id && menuOpenType === 'excel'}
                          onMenuToggle={() => {
                            setMenuOpenId(menuOpenId === report.id ? null : report.id)
                            setMenuOpenType('excel')
                          }}
                          onDelete={() => handleDeleteExcel(report)}
                          onArchive={() => {
                            archiveExcelMutation.mutate({ id: report.id, archived: !report.is_archived })
                            setMenuOpenId(null)
                          }}
                          onDuplicate={() => {
                            duplicateExcelMutation.mutate(report.id)
                            setMenuOpenId(null)
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Delete Confirmation Dialogs */}
      <DeleteConfirmDialog
        isOpen={deleteWidgetTarget !== null}
        onClose={() => setDeleteWidgetTarget(null)}
        onConfirm={confirmDeleteWidget}
        itemName={deleteWidgetTarget?.name}
        itemType="report"
        isLoading={isDeleting}
      />

      <DeleteConfirmDialog
        isOpen={deleteExcelTarget !== null}
        onClose={() => setDeleteExcelTarget(null)}
        onConfirm={confirmDeleteExcel}
        itemName={deleteExcelTarget?.name}
        itemType="Excel report"
        isLoading={isDeleting}
      />
    </div>
  )
}

function ReportCard({
  report,
  viewMode,
  isMenuOpen,
  onMenuToggle,
  onDelete,
  onArchive,
  onDuplicate,
}: {
  report: ReportListItem
  viewMode: ViewMode
  isMenuOpen: boolean
  onMenuToggle: () => void
  onDelete: () => void
  onArchive: () => void
  onDuplicate: () => void
}) {
  const navigate = useNavigate()

  const handleClick = () => {
    navigate(`/reports/${report.id}`)
  }

  if (viewMode === 'list') {
    return (
      <div
        onClick={handleClick}
        className={clsx(
          'flex items-center gap-4 bg-white rounded-xl border border-gray-200 hover:border-purple-300 hover:shadow-md p-4 transition-all group cursor-pointer',
          report.is_archived && 'opacity-60'
        )}
      >
        {/* Preview Icon */}
        <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center shrink-0">
          <FileText className="w-7 h-7 text-white" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-900 truncate group-hover:text-purple-600 transition-colors">
              {report.name}
            </h3>
            {report.is_public ? (
              <Globe className="w-4 h-4 text-green-500 shrink-0" />
            ) : (
              <Lock className="w-4 h-4 text-gray-400 shrink-0" />
            )}
          </div>
          {report.description && (
            <p className="text-sm text-gray-500 truncate mt-0.5">{report.description}</p>
          )}
          <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <Layers className="w-3.5 h-3.5" />
              {report.block_count} block{report.block_count !== 1 ? 's' : ''}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {new Date(report.updated_at || report.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="relative shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onMenuToggle()
            }}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <MoreVertical className="w-5 h-5 text-gray-400" />
          </button>
          {isMenuOpen && (
            <DropdownMenu
              report={report}
              onToggle={onMenuToggle}
              onDelete={onDelete}
              onArchive={onArchive}
              onDuplicate={onDuplicate}
            />
          )}
        </div>
      </div>
    )
  }

  return (
    <div
      onClick={handleClick}
      className={clsx(
        'group relative bg-white rounded-2xl border border-gray-200 hover:border-purple-300 hover:shadow-lg transition-all cursor-pointer',
        report.is_archived && 'opacity-60'
      )}
    >
      {/* Preview Area */}
      <div className="h-36 bg-gradient-to-br from-gray-50 to-gray-100 relative overflow-hidden rounded-t-2xl">
        {/* Document Preview Pattern */}
        <div className="absolute inset-4 flex flex-col gap-2">
          {/* Header block */}
          <div className="h-4 w-3/4 bg-gray-300 rounded opacity-50" />
          <div className="h-2 w-1/2 bg-gray-200 rounded opacity-50" />

          {/* Content blocks */}
          <div className="flex-1 grid grid-cols-2 gap-2 mt-2">
            <div className="bg-purple-200 rounded opacity-60" />
            <div className="space-y-2">
              <div className="h-2 bg-gray-200 rounded opacity-50" />
              <div className="h-2 bg-gray-200 rounded opacity-50" />
              <div className="h-2 w-3/4 bg-gray-200 rounded opacity-50" />
            </div>
          </div>

          {/* Table preview */}
          <div className="h-8 bg-indigo-100 rounded opacity-60 flex items-center gap-1 px-2">
            <div className="h-1.5 flex-1 bg-indigo-300 rounded" />
            <div className="h-1.5 flex-1 bg-indigo-300 rounded" />
            <div className="h-1.5 flex-1 bg-indigo-300 rounded" />
          </div>
        </div>

        {/* Block Count Badge */}
        <div className="absolute top-3 left-3">
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-white/90 backdrop-blur-sm text-gray-700 text-xs font-medium rounded-full shadow-sm">
            <Layers className="w-3 h-3" />
            {report.block_count} blocks
          </span>
        </div>

        {/* Status Badge */}
        <div className="absolute top-3 right-3">
          {report.is_public ? (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
              <Globe className="w-3 h-3" />
              Shared
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
              <Lock className="w-3 h-3" />
              Private
            </span>
          )}
        </div>

        {/* Hover Overlay */}
        <div className="absolute inset-0 bg-purple-600/0 group-hover:bg-purple-600/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
          <span className="px-4 py-2 bg-white rounded-lg shadow-lg text-sm font-medium text-purple-600">
            Open Report
          </span>
        </div>
      </div>

      {/* Card Content */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 truncate group-hover:text-purple-600 transition-colors">
              {report.name}
            </h3>
            {report.description && (
              <p className="text-sm text-gray-500 line-clamp-2 mt-1">{report.description}</p>
            )}
          </div>
          <div className="relative shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation()
                onMenuToggle()
              }}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <MoreVertical className="w-5 h-5 text-gray-400" />
            </button>
            {isMenuOpen && (
              <DropdownMenu
                report={report}
                onToggle={onMenuToggle}
                onDelete={onDelete}
                onArchive={onArchive}
                onDuplicate={onDuplicate}
              />
            )}
          </div>
        </div>

        {/* Meta Info */}
        <div className="flex items-center gap-3 mt-4 pt-3 border-t border-gray-100">
          <span className="inline-flex items-center gap-1.5 text-xs text-gray-500">
            <Calendar className="w-3.5 h-3.5" />
            {report.updated_at
              ? `Updated ${new Date(report.updated_at).toLocaleDateString()}`
              : `Created ${new Date(report.created_at).toLocaleDateString()}`}
          </span>
        </div>
      </div>
    </div>
  )
}

function DropdownMenu({
  report,
  onToggle,
  onDelete,
  onArchive,
  onDuplicate,
}: {
  report: ReportListItem
  onToggle: () => void
  onDelete: () => void
  onArchive: () => void
  onDuplicate: () => void
}) {
  const navigate = useNavigate()

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); onToggle() }} />
      <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-xl border border-gray-200 py-1.5 z-50">
        <button
          onClick={(e) => {
            e.stopPropagation()
            navigate(`/reports/${report.id}`)
          }}
          className="flex items-center gap-2.5 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
        >
          <Eye className="w-4 h-4 text-gray-400" />
          View / Edit
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onDuplicate()
          }}
          className="flex items-center gap-2.5 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
        >
          <Copy className="w-4 h-4 text-gray-400" />
          Duplicate
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation()
            navigator.clipboard.writeText(window.location.origin + `/reports/${report.id}`)
            onToggle()
          }}
          className="flex items-center gap-2.5 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
        >
          <Link2 className="w-4 h-4 text-gray-400" />
          Copy Link
        </button>
        <div className="my-1.5 border-t border-gray-100" />
        <button
          onClick={(e) => {
            e.stopPropagation()
            onArchive()
          }}
          className="flex items-center gap-2.5 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
        >
          <Archive className="w-4 h-4 text-gray-400" />
          {report.is_archived ? 'Restore' : 'Archive'}
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
          className="flex items-center gap-2.5 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
        >
          <Trash2 className="w-4 h-4" />
          Delete
        </button>
      </div>
    </>
  )
}

// Excel Report Card Component
function ExcelReportCard({
  report,
  viewMode,
  isMenuOpen,
  onMenuToggle,
  onDelete,
  onArchive,
  onDuplicate,
}: {
  report: ExcelTemplateReportListItem
  viewMode: ViewMode
  isMenuOpen: boolean
  onMenuToggle: () => void
  onDelete: () => void
  onArchive: () => void
  onDuplicate: () => void
}) {
  const navigate = useNavigate()

  const handleClick = () => {
    navigate(`/excel-reports/${report.id}`)
  }

  if (viewMode === 'list') {
    return (
      <div
        onClick={handleClick}
        className={clsx(
          'flex items-center gap-4 bg-white rounded-xl border border-gray-200 hover:border-emerald-300 hover:shadow-md p-4 transition-all group cursor-pointer',
          report.is_archived && 'opacity-60'
        )}
      >
        {/* Preview Icon */}
        <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shrink-0">
          <FileSpreadsheet className="w-7 h-7 text-white" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-900 truncate group-hover:text-emerald-600 transition-colors">
              {report.name}
            </h3>
            {report.is_public ? (
              <Globe className="w-4 h-4 text-green-500 shrink-0" />
            ) : (
              <Lock className="w-4 h-4 text-gray-400 shrink-0" />
            )}
          </div>
          {report.description && (
            <p className="text-sm text-gray-500 truncate mt-0.5">{report.description}</p>
          )}
          <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <Layers className="w-3.5 h-3.5" />
              {report.mapped_count}/{report.placeholder_count} mapped
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {new Date(report.updated_at || report.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="relative shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onMenuToggle()
            }}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <MoreVertical className="w-5 h-5 text-gray-400" />
          </button>
          {isMenuOpen && (
            <ExcelDropdownMenu
              report={report}
              onToggle={onMenuToggle}
              onDelete={onDelete}
              onArchive={onArchive}
              onDuplicate={onDuplicate}
            />
          )}
        </div>
      </div>
    )
  }

  return (
    <div
      onClick={handleClick}
      className={clsx(
        'group relative bg-white rounded-2xl border border-gray-200 hover:border-emerald-300 hover:shadow-lg transition-all cursor-pointer',
        report.is_archived && 'opacity-60'
      )}
    >
      {/* Preview Area */}
      <div className="h-36 bg-gradient-to-br from-emerald-50 to-teal-50 relative overflow-hidden rounded-t-2xl">
        {/* Excel Preview Pattern */}
        <div className="absolute inset-4 flex flex-col gap-2">
          {/* Spreadsheet Header */}
          <div className="flex gap-1">
            <div className="h-4 w-8 bg-emerald-200 rounded opacity-60" />
            <div className="h-4 w-8 bg-emerald-200 rounded opacity-60" />
            <div className="h-4 w-8 bg-emerald-200 rounded opacity-60" />
            <div className="h-4 flex-1 bg-emerald-200 rounded opacity-60" />
          </div>

          {/* Spreadsheet Rows */}
          <div className="flex-1 space-y-1">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex gap-1">
                <div className="h-3 w-8 bg-gray-200 rounded opacity-50" />
                <div className="h-3 w-8 bg-gray-200 rounded opacity-50" />
                <div className="h-3 w-8 bg-gray-200 rounded opacity-50" />
                <div className="h-3 flex-1 bg-gray-200 rounded opacity-50" />
              </div>
            ))}
          </div>

          {/* Placeholder indicator */}
          <div className="h-6 bg-amber-100 rounded opacity-80 flex items-center justify-center">
            <span className="text-xs text-amber-600 font-mono">{'{{table:data}}'}</span>
          </div>
        </div>

        {/* Mapping Badge */}
        <div className="absolute top-3 left-3">
          <span className={clsx(
            'inline-flex items-center gap-1 px-2 py-1 backdrop-blur-sm text-xs font-medium rounded-full shadow-sm',
            report.mapped_count === report.placeholder_count && report.placeholder_count > 0
              ? 'bg-emerald-100 text-emerald-700'
              : 'bg-white/90 text-gray-700'
          )}>
            <Layers className="w-3 h-3" />
            {report.mapped_count}/{report.placeholder_count} mapped
          </span>
        </div>

        {/* Status Badge */}
        <div className="absolute top-3 right-3">
          {report.is_public ? (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
              <Globe className="w-3 h-3" />
              Shared
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
              <Lock className="w-3 h-3" />
              Private
            </span>
          )}
        </div>

        {/* Hover Overlay */}
        <div className="absolute inset-0 bg-emerald-600/0 group-hover:bg-emerald-600/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
          <span className="px-4 py-2 bg-white rounded-lg shadow-lg text-sm font-medium text-emerald-600">
            Open Report
          </span>
        </div>
      </div>

      {/* Card Content */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 truncate group-hover:text-emerald-600 transition-colors">
              {report.name}
            </h3>
            {report.template_filename && (
              <p className="text-sm text-gray-500 truncate mt-0.5">
                Template: {report.template_filename}
              </p>
            )}
          </div>
          <div className="relative shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation()
                onMenuToggle()
              }}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <MoreVertical className="w-5 h-5 text-gray-400" />
            </button>
            {isMenuOpen && (
              <ExcelDropdownMenu
                report={report}
                onToggle={onMenuToggle}
                onDelete={onDelete}
                onArchive={onArchive}
                onDuplicate={onDuplicate}
              />
            )}
          </div>
        </div>

        {/* Meta Info */}
        <div className="flex items-center gap-3 mt-4 pt-3 border-t border-gray-100">
          <span className="inline-flex items-center gap-1.5 text-xs text-gray-500">
            <Calendar className="w-3.5 h-3.5" />
            {report.updated_at
              ? `Updated ${new Date(report.updated_at).toLocaleDateString()}`
              : `Created ${new Date(report.created_at).toLocaleDateString()}`}
          </span>
        </div>
      </div>
    </div>
  )
}

function ExcelDropdownMenu({
  report,
  onToggle,
  onDelete,
  onArchive,
  onDuplicate,
}: {
  report: ExcelTemplateReportListItem
  onToggle: () => void
  onDelete: () => void
  onArchive: () => void
  onDuplicate: () => void
}) {
  const navigate = useNavigate()

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); onToggle() }} />
      <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl shadow-xl border border-gray-200 py-1.5 z-50">
        <button
          onClick={(e) => {
            e.stopPropagation()
            navigate(`/excel-reports/${report.id}`)
          }}
          className="flex items-center gap-2.5 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
        >
          <Eye className="w-4 h-4 text-gray-400" />
          View / Edit
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onDuplicate()
          }}
          className="flex items-center gap-2.5 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
        >
          <Copy className="w-4 h-4 text-gray-400" />
          Duplicate
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation()
            navigator.clipboard.writeText(window.location.origin + `/excel-reports/${report.id}`)
            onToggle()
          }}
          className="flex items-center gap-2.5 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
        >
          <Link2 className="w-4 h-4 text-gray-400" />
          Copy Link
        </button>
        <div className="my-1.5 border-t border-gray-100" />
        <button
          onClick={(e) => {
            e.stopPropagation()
            onArchive()
          }}
          className="flex items-center gap-2.5 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
        >
          <Archive className="w-4 h-4 text-gray-400" />
          {report.is_archived ? 'Restore' : 'Archive'}
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
          }}
          className="flex items-center gap-2.5 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
        >
          <Trash2 className="w-4 h-4" />
          Delete
        </button>
      </div>
    </>
  )
}
