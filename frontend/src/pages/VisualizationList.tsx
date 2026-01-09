import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus,
  Search,
  MoreVertical,
  Trash2,
  Archive,
  BarChart3,
  Table,
  LineChart,
  PieChart,
  AreaChart,
  Eye,
  Lock,
  Filter,
  Grid3X3,
  List,
  ChevronDown,
  X,
  Sparkles,
  TrendingUp,
  Clock,
  ArchiveRestore,
  Edit3,
  Copy,
  Layers,
} from 'lucide-react'
import clsx from 'clsx'
import { visualizationService } from '../services/visualizationService'
import type { Visualization, VisualizationType } from '../types'

const VISUALIZATION_ICONS: Record<VisualizationType, React.ReactNode> = {
  table: <Table className="w-5 h-5" />,
  bar: <BarChart3 className="w-5 h-5" />,
  line: <LineChart className="w-5 h-5" />,
  area: <AreaChart className="w-5 h-5" />,
  pie: <PieChart className="w-5 h-5" />,
  scatter: <BarChart3 className="w-5 h-5" />,
  funnel: <BarChart3 className="w-5 h-5" />,
  gauge: <BarChart3 className="w-5 h-5" />,
}

const VISUALIZATION_LABELS: Record<VisualizationType, string> = {
  table: 'Table',
  bar: 'Bar Chart',
  line: 'Line Chart',
  area: 'Area Chart',
  pie: 'Pie Chart',
  scatter: 'Scatter Plot',
  funnel: 'Funnel',
  gauge: 'Gauge',
}

const VISUALIZATION_COLORS: Record<VisualizationType, { bg: string; text: string; gradient: string }> = {
  table: { bg: 'bg-slate-100', text: 'text-slate-600', gradient: 'from-slate-400 to-slate-600' },
  bar: { bg: 'bg-blue-100', text: 'text-blue-600', gradient: 'from-blue-400 to-blue-600' },
  line: { bg: 'bg-emerald-100', text: 'text-emerald-600', gradient: 'from-emerald-400 to-emerald-600' },
  area: { bg: 'bg-purple-100', text: 'text-purple-600', gradient: 'from-purple-400 to-purple-600' },
  pie: { bg: 'bg-orange-100', text: 'text-orange-600', gradient: 'from-orange-400 to-orange-600' },
  scatter: { bg: 'bg-cyan-100', text: 'text-cyan-600', gradient: 'from-cyan-400 to-cyan-600' },
  funnel: { bg: 'bg-pink-100', text: 'text-pink-600', gradient: 'from-pink-400 to-pink-600' },
  gauge: { bg: 'bg-amber-100', text: 'text-amber-600', gradient: 'from-amber-400 to-amber-600' },
}

type SortOption = 'newest' | 'oldest' | 'name' | 'type'
type ViewMode = 'grid' | 'list'
type TypeFilter = 'all' | VisualizationType

export default function VisualizationList() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [searchQuery, setSearchQuery] = useState('')
  const [showArchived, setShowArchived] = useState(false)
  const [menuOpenId, setMenuOpenId] = useState<number | null>(null)
  const [sortBy, setSortBy] = useState<SortOption>('newest')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [showSortDropdown, setShowSortDropdown] = useState(false)
  const [showTypeDropdown, setShowTypeDropdown] = useState(false)

  const { data: visualizations = [], isLoading } = useQuery({
    queryKey: ['visualizations', showArchived],
    queryFn: () => visualizationService.list(showArchived),
  })

  const deleteMutation = useMutation({
    mutationFn: visualizationService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visualizations'] })
    },
  })

  const archiveMutation = useMutation({
    mutationFn: ({ id, archived }: { id: number; archived: boolean }) =>
      visualizationService.update(id, { is_archived: archived }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visualizations'] })
    },
  })

  // Filter and sort visualizations
  const filteredVisualizations = visualizations
    .filter((v) => v.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .filter((v) => typeFilter === 'all' || v.visualization_type === typeFilter)
    .sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        case 'oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        case 'name':
          return a.name.localeCompare(b.name)
        case 'type':
          return a.visualization_type.localeCompare(b.visualization_type)
        default:
          return 0
      }
    })

  // Separate active and archived
  const activeVisualizations = filteredVisualizations.filter((v) => !v.is_archived)
  const archivedVisualizations = filteredVisualizations.filter((v) => v.is_archived)

  // Stats
  const totalCount = visualizations.length
  const chartCount = visualizations.filter((v) => v.visualization_type !== 'table').length
  const tableCount = visualizations.filter((v) => v.visualization_type === 'table').length
  const archivedCount = visualizations.filter((v) => v.is_archived).length

  const sortOptions: { value: SortOption; label: string }[] = [
    { value: 'newest', label: 'Newest First' },
    { value: 'oldest', label: 'Oldest First' },
    { value: 'name', label: 'Name A-Z' },
    { value: 'type', label: 'Type' },
  ]

  const typeOptions: { value: TypeFilter; label: string }[] = [
    { value: 'all', label: 'All Types' },
    { value: 'table', label: 'Tables' },
    { value: 'bar', label: 'Bar Charts' },
    { value: 'line', label: 'Line Charts' },
    { value: 'area', label: 'Area Charts' },
    { value: 'pie', label: 'Pie Charts' },
    { value: 'scatter', label: 'Scatter Plots' },
  ]

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700 rounded-2xl">
        <div className="absolute inset-0 bg-grid-white/10" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-teal-400/20 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />

        <div className="relative px-6 py-8 sm:px-8 sm:py-10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2.5 bg-white/20 backdrop-blur-sm rounded-xl">
                  <BarChart3 className="w-6 h-6 text-white" />
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white">Visualizations</h1>
              </div>
              <p className="text-emerald-100 max-w-lg">
                Create, manage, and explore your data visualizations. Build charts and tables from your queries.
              </p>
            </div>
            <button
              onClick={() => navigate('/query-builder')}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-emerald-600 font-medium rounded-xl hover:bg-emerald-50 transition-colors shadow-lg shadow-emerald-900/20"
            >
              <Plus className="w-5 h-5" />
              New Visualization
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3">
              <div className="flex items-center gap-2 text-emerald-200 text-sm mb-1">
                <Layers className="w-4 h-4" />
                Total
              </div>
              <div className="text-2xl font-bold text-white">{totalCount}</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3">
              <div className="flex items-center gap-2 text-emerald-200 text-sm mb-1">
                <BarChart3 className="w-4 h-4" />
                Charts
              </div>
              <div className="text-2xl font-bold text-white">{chartCount}</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3">
              <div className="flex items-center gap-2 text-emerald-200 text-sm mb-1">
                <Table className="w-4 h-4" />
                Tables
              </div>
              <div className="text-2xl font-bold text-white">{tableCount}</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3">
              <div className="flex items-center gap-2 text-emerald-200 text-sm mb-1">
                <Archive className="w-4 h-4" />
                Archived
              </div>
              <div className="text-2xl font-bold text-white">{archivedCount}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Controls Bar */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search visualizations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent focus:bg-white transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 hover:bg-gray-200 rounded-full transition-colors"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            )}
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Type Filter Dropdown */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowTypeDropdown(!showTypeDropdown)
                  setShowSortDropdown(false)
                }}
                className={clsx(
                  'flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors border',
                  typeFilter !== 'all'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                )}
              >
                <Filter className="w-4 h-4" />
                <span className="hidden sm:inline">
                  {typeOptions.find((o) => o.value === typeFilter)?.label}
                </span>
                <ChevronDown className="w-4 h-4" />
              </button>
              {showTypeDropdown && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowTypeDropdown(false)} />
                  <div className="absolute left-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-200 py-1 z-20">
                    {typeOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => {
                          setTypeFilter(option.value)
                          setShowTypeDropdown(false)
                        }}
                        className={clsx(
                          'w-full px-4 py-2 text-sm text-left transition-colors',
                          typeFilter === option.value
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'text-gray-700 hover:bg-gray-50'
                        )}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Sort Dropdown */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowSortDropdown(!showSortDropdown)
                  setShowTypeDropdown(false)
                }}
                className="flex items-center gap-2 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <TrendingUp className="w-4 h-4" />
                <span className="hidden sm:inline">{sortOptions.find((o) => o.value === sortBy)?.label}</span>
                <ChevronDown className="w-4 h-4" />
              </button>
              {showSortDropdown && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowSortDropdown(false)} />
                  <div className="absolute right-0 mt-2 w-40 bg-white rounded-xl shadow-lg border border-gray-200 py-1 z-20">
                    {sortOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => {
                          setSortBy(option.value)
                          setShowSortDropdown(false)
                        }}
                        className={clsx(
                          'w-full px-4 py-2 text-sm text-left transition-colors',
                          sortBy === option.value
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'text-gray-700 hover:bg-gray-50'
                        )}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Archived Toggle */}
            <button
              onClick={() => setShowArchived(!showArchived)}
              className={clsx(
                'flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors border',
                showArchived
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
              )}
            >
              <Archive className="w-4 h-4" />
              <span className="hidden sm:inline">Archived</span>
            </button>

            {/* Divider */}
            <div className="w-px h-8 bg-gray-200 hidden sm:block" />

            {/* View Mode Toggle */}
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={clsx(
                  'p-2 rounded-md transition-colors',
                  viewMode === 'grid' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                )}
              >
                <Grid3X3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={clsx(
                  'p-2 rounded-md transition-colors',
                  viewMode === 'list' ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                )}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-500 text-sm">Loading visualizations...</p>
          </div>
        </div>
      ) : filteredVisualizations.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
          <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <BarChart3 className="w-8 h-8 text-emerald-600" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No visualizations found</h3>
          <p className="text-gray-500 mb-6 max-w-sm mx-auto">
            {searchQuery || typeFilter !== 'all'
              ? 'Try adjusting your search or filters'
              : 'Create your first visualization using the Query Builder'}
          </p>
          {!searchQuery && typeFilter === 'all' && (
            <button
              onClick={() => navigate('/query-builder')}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white font-medium rounded-xl hover:bg-emerald-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Create Visualization
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          {/* Active Visualizations */}
          {activeVisualizations.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-5 h-5 text-emerald-600" />
                <h2 className="text-lg font-semibold text-gray-900">
                  Active Visualizations
                </h2>
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-full">
                  {activeVisualizations.length}
                </span>
              </div>

              {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {activeVisualizations.map((visualization) => (
                    <VisualizationCard
                      key={visualization.id}
                      visualization={visualization}
                      isMenuOpen={menuOpenId === visualization.id}
                      onMenuToggle={() => setMenuOpenId(menuOpenId === visualization.id ? null : visualization.id)}
                      onDelete={() => {
                        if (confirm('Are you sure you want to delete this visualization?')) {
                          deleteMutation.mutate(visualization.id)
                        }
                        setMenuOpenId(null)
                      }}
                      onArchive={() => {
                        archiveMutation.mutate({ id: visualization.id, archived: !visualization.is_archived })
                        setMenuOpenId(null)
                      }}
                    />
                  ))}
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  {activeVisualizations.map((visualization, index) => (
                    <VisualizationListItem
                      key={visualization.id}
                      visualization={visualization}
                      isLast={index === activeVisualizations.length - 1}
                      isMenuOpen={menuOpenId === visualization.id}
                      onMenuToggle={() => setMenuOpenId(menuOpenId === visualization.id ? null : visualization.id)}
                      onDelete={() => {
                        if (confirm('Are you sure you want to delete this visualization?')) {
                          deleteMutation.mutate(visualization.id)
                        }
                        setMenuOpenId(null)
                      }}
                      onArchive={() => {
                        archiveMutation.mutate({ id: visualization.id, archived: !visualization.is_archived })
                        setMenuOpenId(null)
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Archived Visualizations */}
          {showArchived && archivedVisualizations.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Archive className="w-5 h-5 text-gray-400" />
                <h2 className="text-lg font-semibold text-gray-500">Archived</h2>
                <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
                  {archivedVisualizations.length}
                </span>
              </div>

              {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {archivedVisualizations.map((visualization) => (
                    <VisualizationCard
                      key={visualization.id}
                      visualization={visualization}
                      isMenuOpen={menuOpenId === visualization.id}
                      onMenuToggle={() => setMenuOpenId(menuOpenId === visualization.id ? null : visualization.id)}
                      onDelete={() => {
                        if (confirm('Are you sure you want to delete this visualization?')) {
                          deleteMutation.mutate(visualization.id)
                        }
                        setMenuOpenId(null)
                      }}
                      onArchive={() => {
                        archiveMutation.mutate({ id: visualization.id, archived: !visualization.is_archived })
                        setMenuOpenId(null)
                      }}
                    />
                  ))}
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden opacity-75">
                  {archivedVisualizations.map((visualization, index) => (
                    <VisualizationListItem
                      key={visualization.id}
                      visualization={visualization}
                      isLast={index === archivedVisualizations.length - 1}
                      isMenuOpen={menuOpenId === visualization.id}
                      onMenuToggle={() => setMenuOpenId(menuOpenId === visualization.id ? null : visualization.id)}
                      onDelete={() => {
                        if (confirm('Are you sure you want to delete this visualization?')) {
                          deleteMutation.mutate(visualization.id)
                        }
                        setMenuOpenId(null)
                      }}
                      onArchive={() => {
                        archiveMutation.mutate({ id: visualization.id, archived: !visualization.is_archived })
                        setMenuOpenId(null)
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Visualization Preview Pattern
function VisualizationPreview({ type }: { type: VisualizationType }) {
  const colors = VISUALIZATION_COLORS[type] || VISUALIZATION_COLORS.bar

  switch (type) {
    case 'bar':
      return (
        <div className="flex items-end justify-center gap-1.5 h-full px-4">
          {[40, 65, 45, 80, 55, 70, 50].map((height, i) => (
            <div
              key={i}
              className={clsx('w-3 rounded-t bg-gradient-to-t', colors.gradient)}
              style={{ height: `${height}%`, opacity: 0.6 + i * 0.05 }}
            />
          ))}
        </div>
      )
    case 'line':
      return (
        <svg className="w-full h-full" viewBox="0 0 100 50" preserveAspectRatio="none">
          <defs>
            <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" className="text-emerald-400" stopColor="currentColor" />
              <stop offset="100%" className="text-emerald-600" stopColor="currentColor" />
            </linearGradient>
          </defs>
          <path
            d="M0,40 Q15,35 25,28 T50,20 T75,30 T100,15"
            fill="none"
            stroke="url(#lineGradient)"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M0,40 Q15,35 25,28 T50,20 T75,30 T100,15 L100,50 L0,50 Z"
            fill="url(#lineGradient)"
            opacity="0.1"
          />
        </svg>
      )
    case 'area':
      return (
        <svg className="w-full h-full" viewBox="0 0 100 50" preserveAspectRatio="none">
          <defs>
            <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" className="text-purple-400" stopColor="currentColor" stopOpacity="0.6" />
              <stop offset="100%" className="text-purple-600" stopColor="currentColor" stopOpacity="0.1" />
            </linearGradient>
          </defs>
          <path
            d="M0,45 Q10,40 20,35 T40,25 T60,30 T80,20 T100,25 L100,50 L0,50 Z"
            fill="url(#areaGradient)"
          />
          <path
            d="M0,45 Q10,40 20,35 T40,25 T60,30 T80,20 T100,25"
            fill="none"
            className="stroke-purple-500"
            strokeWidth="2"
          />
        </svg>
      )
    case 'pie':
      return (
        <div className="flex items-center justify-center h-full">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-300 via-orange-400 to-orange-600 relative overflow-hidden">
            <div className="absolute inset-0" style={{
              background: 'conic-gradient(from 0deg, #fb923c 0deg 120deg, #f97316 120deg 220deg, #ea580c 220deg 300deg, #c2410c 300deg 360deg)'
            }} />
            <div className="absolute inset-3 bg-white rounded-full" />
          </div>
        </div>
      )
    case 'table':
      return (
        <div className="flex flex-col gap-1.5 px-3 py-2 h-full justify-center">
          <div className="h-2 bg-slate-300 rounded w-full" />
          <div className="h-1.5 bg-slate-200 rounded w-3/4" />
          <div className="h-1.5 bg-slate-200 rounded w-5/6" />
          <div className="h-1.5 bg-slate-200 rounded w-2/3" />
          <div className="h-1.5 bg-slate-200 rounded w-4/5" />
        </div>
      )
    default:
      return (
        <div className="flex items-end justify-center gap-1.5 h-full px-4">
          {[40, 65, 45, 80, 55].map((height, i) => (
            <div
              key={i}
              className={clsx('w-4 rounded-t bg-gradient-to-t', colors.gradient)}
              style={{ height: `${height}%`, opacity: 0.6 + i * 0.1 }}
            />
          ))}
        </div>
      )
  }
}

function VisualizationCard({
  visualization,
  isMenuOpen,
  onMenuToggle,
  onDelete,
  onArchive,
}: {
  visualization: Visualization
  isMenuOpen: boolean
  onMenuToggle: () => void
  onDelete: () => void
  onArchive: () => void
}) {
  const navigate = useNavigate()
  const colors = VISUALIZATION_COLORS[visualization.visualization_type] || VISUALIZATION_COLORS.bar

  const handleCardClick = () => {
    navigate(`/visualizations/${visualization.id}`)
  }

  return (
    <div
      onClick={handleCardClick}
      className={clsx(
        'group bg-white rounded-xl border border-gray-200 hover:border-emerald-300 hover:shadow-lg hover:shadow-emerald-100 transition-all duration-200 cursor-pointer overflow-hidden',
        visualization.is_archived && 'opacity-60'
      )}
    >
      {/* Preview Area */}
      <div className={clsx('h-28 relative', colors.bg)}>
        <VisualizationPreview type={visualization.visualization_type} />

        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-white/20 to-transparent" />

        {/* Type badge */}
        <div className="absolute top-3 left-3">
          <span className={clsx(
            'inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium bg-white/90 backdrop-blur-sm shadow-sm',
            colors.text
          )}>
            {VISUALIZATION_ICONS[visualization.visualization_type]}
            {VISUALIZATION_LABELS[visualization.visualization_type]}
          </span>
        </div>

        {/* Status badges */}
        <div className="absolute top-3 right-3 flex items-center gap-1.5">
          {visualization.is_query_locked && (
            <span className="p-1.5 bg-amber-100 rounded-lg" title="Query locked">
              <Lock className="w-3.5 h-3.5 text-amber-600" />
            </span>
          )}
          {visualization.is_archived && (
            <span className="p-1.5 bg-gray-100 rounded-lg" title="Archived">
              <Archive className="w-3.5 h-3.5 text-gray-500" />
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 truncate group-hover:text-emerald-600 transition-colors">
              {visualization.name}
            </h3>
            {visualization.description && (
              <p className="text-sm text-gray-500 mt-1 line-clamp-2">{visualization.description}</p>
            )}
          </div>

          {/* Menu */}
          <div className="relative shrink-0">
            <button
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onMenuToggle()
              }}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors opacity-0 group-hover:opacity-100"
            >
              <MoreVertical className="w-4 h-4 text-gray-400" />
            </button>

            {isMenuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={(e) => { e.preventDefault(); e.stopPropagation(); onMenuToggle() }} />
                <div className="absolute right-0 mt-1 w-44 bg-white rounded-xl shadow-lg border border-gray-200 py-1 z-20">
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      navigate(`/visualizations/${visualization.id}`)
                    }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <Eye className="w-4 h-4" />
                    View
                  </button>
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      navigate(`/visualizations/${visualization.id}/edit`)
                    }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <Edit3 className="w-4 h-4" />
                    Edit
                  </button>
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      onArchive()
                    }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    {visualization.is_archived ? (
                      <>
                        <ArchiveRestore className="w-4 h-4" />
                        Restore
                      </>
                    ) : (
                      <>
                        <Archive className="w-4 h-4" />
                        Archive
                      </>
                    )}
                  </button>
                  <div className="border-t border-gray-100 my-1" />
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      onDelete()
                    }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Meta */}
        <div className="flex items-center gap-3 mt-3 text-xs text-gray-400">
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {new Date(visualization.created_at).toLocaleDateString()}
          </span>
        </div>
      </div>
    </div>
  )
}

function VisualizationListItem({
  visualization,
  isLast,
  isMenuOpen,
  onMenuToggle,
  onDelete,
  onArchive,
}: {
  visualization: Visualization
  isLast: boolean
  isMenuOpen: boolean
  onMenuToggle: () => void
  onDelete: () => void
  onArchive: () => void
}) {
  const navigate = useNavigate()
  const colors = VISUALIZATION_COLORS[visualization.visualization_type] || VISUALIZATION_COLORS.bar

  return (
    <div
      onClick={() => navigate(`/visualizations/${visualization.id}`)}
      className={clsx(
        'group flex items-center gap-4 p-4 hover:bg-gray-50 cursor-pointer transition-colors',
        !isLast && 'border-b border-gray-100'
      )}
    >
      {/* Icon */}
      <div className={clsx('p-3 rounded-xl shrink-0', colors.bg, colors.text)}>
        {VISUALIZATION_ICONS[visualization.visualization_type]}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-medium text-gray-900 truncate group-hover:text-emerald-600 transition-colors">
            {visualization.name}
          </h3>
          {visualization.is_query_locked && (
            <Lock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          )}
        </div>
        {visualization.description && (
          <p className="text-sm text-gray-500 truncate mt-0.5">{visualization.description}</p>
        )}
      </div>

      {/* Type */}
      <div className="hidden sm:block">
        <span className={clsx(
          'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium',
          colors.bg, colors.text
        )}>
          {VISUALIZATION_LABELS[visualization.visualization_type]}
        </span>
      </div>

      {/* Date */}
      <div className="hidden md:block text-sm text-gray-400 shrink-0">
        {new Date(visualization.created_at).toLocaleDateString()}
      </div>

      {/* Menu */}
      <div className="relative shrink-0">
        <button
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onMenuToggle()
          }}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <MoreVertical className="w-4 h-4 text-gray-400" />
        </button>

        {isMenuOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={(e) => { e.preventDefault(); e.stopPropagation(); onMenuToggle() }} />
            <div className="absolute right-0 mt-1 w-44 bg-white rounded-xl shadow-lg border border-gray-200 py-1 z-20">
              <button
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  navigate(`/visualizations/${visualization.id}`)
                }}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                <Eye className="w-4 h-4" />
                View
              </button>
              <button
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  navigate(`/visualizations/${visualization.id}/edit`)
                }}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                <Edit3 className="w-4 h-4" />
                Edit
              </button>
              <button
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  onArchive()
                }}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                {visualization.is_archived ? (
                  <>
                    <ArchiveRestore className="w-4 h-4" />
                    Restore
                  </>
                ) : (
                  <>
                    <Archive className="w-4 h-4" />
                    Archive
                  </>
                )}
              </button>
              <div className="border-t border-gray-100 my-1" />
              <button
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  onDelete()
                }}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
