import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus,
  Search,
  MoreVertical,
  Trash2,
  Copy,
  Archive,
  Share2,
  LayoutDashboard,
  Calendar,
  Layers,
  Globe,
  Lock,
  X,
  Filter,
  SortAsc,
  Grid3X3,
  List,
} from 'lucide-react'
import clsx from 'clsx'
import { dashboardService } from '../services/dashboardService'
import type { Dashboard } from '../types'

type ViewMode = 'grid' | 'list'
type SortOption = 'updated' | 'created' | 'name'

export default function DashboardList() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [searchQuery, setSearchQuery] = useState('')
  const [showArchived, setShowArchived] = useState(false)
  const [menuOpenId, setMenuOpenId] = useState<number | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [newDashboardName, setNewDashboardName] = useState('')
  const [newDashboardDesc, setNewDashboardDesc] = useState('')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [sortBy, setSortBy] = useState<SortOption>('updated')
  const [showFilters, setShowFilters] = useState(false)

  const { data: dashboards = [], isLoading } = useQuery({
    queryKey: ['dashboards', showArchived],
    queryFn: () => dashboardService.list(showArchived),
  })

  const createMutation = useMutation({
    mutationFn: dashboardService.create,
    onSuccess: (dashboard) => {
      queryClient.invalidateQueries({ queryKey: ['dashboards'] })
      navigate(`/dashboards/${dashboard.id}`)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: dashboardService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboards'] })
    },
  })

  const archiveMutation = useMutation({
    mutationFn: ({ id, archived }: { id: number; archived: boolean }) =>
      dashboardService.update(id, { is_archived: archived }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboards'] })
    },
  })

  // Filter and sort dashboards
  const filteredDashboards = dashboards
    .filter((d) => d.name.toLowerCase().includes(searchQuery.toLowerCase()))
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

  const handleCreate = () => {
    if (newDashboardName.trim()) {
      createMutation.mutate({
        name: newDashboardName.trim(),
        description: newDashboardDesc.trim() || undefined,
      })
      setIsCreating(false)
      setNewDashboardName('')
      setNewDashboardDesc('')
    }
  }

  const activeDashboards = filteredDashboards.filter(d => !d.is_archived)
  const archivedDashboards = filteredDashboards.filter(d => d.is_archived)

  return (
    <div className="min-h-screen">
      {/* Hero Header */}
      <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 -mx-4 -mt-4 lg:-mx-6 lg:-mt-6 px-4 lg:px-6 pt-8 pb-12 mb-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                  <LayoutDashboard className="w-6 h-6 text-white" />
                </div>
                <h1 className="text-3xl font-bold text-white">Dashboards</h1>
              </div>
              <p className="text-blue-100 max-w-xl">
                Create interactive dashboards to monitor your key metrics and KPIs in real-time
              </p>
            </div>
            <button
              onClick={() => setIsCreating(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-white text-blue-700 font-semibold rounded-xl hover:bg-blue-50 transition-all shadow-lg hover:shadow-xl"
            >
              <Plus className="w-5 h-5" />
              New Dashboard
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mt-8 max-w-lg">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3">
              <div className="text-2xl font-bold text-white">{dashboards.length}</div>
              <div className="text-blue-200 text-sm">Total</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3">
              <div className="text-2xl font-bold text-white">{dashboards.filter(d => d.is_public).length}</div>
              <div className="text-blue-200 text-sm">Public</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3">
              <div className="text-2xl font-bold text-white">{dashboards.filter(d => d.is_archived).length}</div>
              <div className="text-blue-200 text-sm">Archived</div>
            </div>
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
                placeholder="Search dashboards by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-gray-50 border-0 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
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
                  ? 'bg-blue-50 border-blue-200 text-blue-700'
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
              className="px-4 py-3 bg-gray-50 border-0 rounded-xl text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
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
                  viewMode === 'grid' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'
                )}
              >
                <Grid3X3 className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={clsx(
                  'p-2 rounded-lg transition-all',
                  viewMode === 'list' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'
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
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                Show archived dashboards
              </label>
            </div>
          )}
        </div>

        {/* Results Count */}
        {searchQuery && (
          <div className="mb-4 text-sm text-gray-500">
            Found {filteredDashboards.length} dashboard{filteredDashboards.length !== 1 ? 's' : ''} matching "{searchQuery}"
          </div>
        )}

        {/* Dashboard Grid/List */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24">
            <div className="w-12 h-12 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <p className="mt-4 text-gray-500">Loading dashboards...</p>
          </div>
        ) : filteredDashboards.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
            <div className="w-20 h-20 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <LayoutDashboard className="w-10 h-10 text-blue-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {searchQuery ? 'No dashboards found' : 'No dashboards yet'}
            </h3>
            <p className="text-gray-500 mb-6 max-w-md mx-auto">
              {searchQuery
                ? `No dashboards match "${searchQuery}". Try a different search term.`
                : 'Create your first dashboard to start visualizing your data and tracking metrics.'}
            </p>
            {!searchQuery && (
              <button
                onClick={() => setIsCreating(true)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-5 h-5" />
                Create Your First Dashboard
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-8">
            {/* Active Dashboards */}
            {activeDashboards.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Active Dashboards ({activeDashboards.length})
                </h2>
                <div className={clsx(
                  viewMode === 'grid'
                    ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5'
                    : 'space-y-3'
                )}>
                  {activeDashboards.map((dashboard) => (
                    <DashboardCard
                      key={dashboard.id}
                      dashboard={dashboard}
                      viewMode={viewMode}
                      isMenuOpen={menuOpenId === dashboard.id}
                      onMenuToggle={() => setMenuOpenId(menuOpenId === dashboard.id ? null : dashboard.id)}
                      onDelete={() => {
                        if (confirm('Are you sure you want to delete this dashboard?')) {
                          deleteMutation.mutate(dashboard.id)
                        }
                        setMenuOpenId(null)
                      }}
                      onArchive={() => {
                        archiveMutation.mutate({ id: dashboard.id, archived: !dashboard.is_archived })
                        setMenuOpenId(null)
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Archived Dashboards */}
            {showArchived && archivedDashboards.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-gray-500 mb-4">
                  Archived ({archivedDashboards.length})
                </h2>
                <div className={clsx(
                  viewMode === 'grid'
                    ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5'
                    : 'space-y-3'
                )}>
                  {archivedDashboards.map((dashboard) => (
                    <DashboardCard
                      key={dashboard.id}
                      dashboard={dashboard}
                      viewMode={viewMode}
                      isMenuOpen={menuOpenId === dashboard.id}
                      onMenuToggle={() => setMenuOpenId(menuOpenId === dashboard.id ? null : dashboard.id)}
                      onDelete={() => {
                        if (confirm('Are you sure you want to delete this dashboard?')) {
                          deleteMutation.mutate(dashboard.id)
                        }
                        setMenuOpenId(null)
                      }}
                      onArchive={() => {
                        archiveMutation.mutate({ id: dashboard.id, archived: !dashboard.is_archived })
                        setMenuOpenId(null)
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create Dashboard Modal */}
      {isCreating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsCreating(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <LayoutDashboard className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">Create New Dashboard</h2>
                  <p className="text-blue-100 text-sm">Set up your dashboard details</p>
                </div>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Dashboard Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g., Sales Overview, Marketing KPIs"
                  value={newDashboardName}
                  onChange={(e) => setNewDashboardName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description <span className="text-gray-400">(optional)</span>
                </label>
                <textarea
                  placeholder="Describe what this dashboard will show..."
                  value={newDashboardDesc}
                  onChange={(e) => setNewDashboardDesc(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-gray-50 flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setIsCreating(false)
                  setNewDashboardName('')
                  setNewDashboardDesc('')
                }}
                className="px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={!newDashboardName.trim() || createMutation.isPending}
                className="px-5 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {createMutation.isPending ? 'Creating...' : 'Create Dashboard'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function DashboardCard({
  dashboard,
  viewMode,
  isMenuOpen,
  onMenuToggle,
  onDelete,
  onArchive,
}: {
  dashboard: Dashboard
  viewMode: ViewMode
  isMenuOpen: boolean
  onMenuToggle: () => void
  onDelete: () => void
  onArchive: () => void
}) {
  const cardCount = dashboard.cards.length

  if (viewMode === 'list') {
    return (
      <Link
        to={`/dashboards/${dashboard.id}`}
        className={clsx(
          'flex items-center gap-4 bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-md p-4 transition-all group',
          dashboard.is_archived && 'opacity-60'
        )}
      >
        {/* Preview Icon */}
        <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shrink-0">
          <LayoutDashboard className="w-7 h-7 text-white" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
              {dashboard.name}
            </h3>
            {dashboard.is_public ? (
              <Globe className="w-4 h-4 text-green-500 shrink-0" />
            ) : (
              <Lock className="w-4 h-4 text-gray-400 shrink-0" />
            )}
          </div>
          {dashboard.description && (
            <p className="text-sm text-gray-500 truncate mt-0.5">{dashboard.description}</p>
          )}
          <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <Layers className="w-3.5 h-3.5" />
              {cardCount} card{cardCount !== 1 ? 's' : ''}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {new Date(dashboard.updated_at || dashboard.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="relative shrink-0">
          <button
            onClick={(e) => {
              e.preventDefault()
              onMenuToggle()
            }}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <MoreVertical className="w-5 h-5 text-gray-400" />
          </button>
          {isMenuOpen && (
            <DropdownMenu
              dashboard={dashboard}
              onToggle={onMenuToggle}
              onDelete={onDelete}
              onArchive={onArchive}
            />
          )}
        </div>
      </Link>
    )
  }

  return (
    <Link
      to={`/dashboards/${dashboard.id}`}
      className={clsx(
        'group bg-white rounded-2xl border border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all overflow-hidden',
        dashboard.is_archived && 'opacity-60'
      )}
    >
      {/* Preview Area */}
      <div className="h-36 bg-gradient-to-br from-gray-50 to-gray-100 relative overflow-hidden">
        {/* Grid Preview Pattern */}
        <div className="absolute inset-4 grid grid-cols-3 gap-2 opacity-60">
          {[...Array(Math.min(cardCount, 6))].map((_, i) => (
            <div
              key={i}
              className={clsx(
                'rounded-lg',
                i === 0 ? 'col-span-2 row-span-2 bg-blue-200' :
                i === 1 ? 'bg-indigo-200' :
                i === 2 ? 'bg-purple-200' :
                i === 3 ? 'bg-green-200' :
                i === 4 ? 'bg-amber-200' :
                'bg-pink-200'
              )}
            />
          ))}
          {cardCount === 0 && (
            <div className="col-span-3 row-span-2 flex items-center justify-center">
              <div className="text-gray-400 text-sm">No cards yet</div>
            </div>
          )}
        </div>

        {/* Status Badge */}
        <div className="absolute top-3 right-3">
          {dashboard.is_public ? (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
              <Globe className="w-3 h-3" />
              Public
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full">
              <Lock className="w-3 h-3" />
              Private
            </span>
          )}
        </div>

        {/* Hover Overlay */}
        <div className="absolute inset-0 bg-blue-600/0 group-hover:bg-blue-600/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
          <span className="px-4 py-2 bg-white rounded-lg shadow-lg text-sm font-medium text-blue-600">
            Open Dashboard
          </span>
        </div>
      </div>

      {/* Card Content */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 truncate group-hover:text-blue-600 transition-colors">
              {dashboard.name}
            </h3>
            {dashboard.description && (
              <p className="text-sm text-gray-500 line-clamp-2 mt-1">{dashboard.description}</p>
            )}
          </div>
          <div className="relative shrink-0">
            <button
              onClick={(e) => {
                e.preventDefault()
                onMenuToggle()
              }}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <MoreVertical className="w-5 h-5 text-gray-400" />
            </button>
            {isMenuOpen && (
              <DropdownMenu
                dashboard={dashboard}
                onToggle={onMenuToggle}
                onDelete={onDelete}
                onArchive={onArchive}
              />
            )}
          </div>
        </div>

        {/* Meta Info */}
        <div className="flex items-center gap-3 mt-4 pt-3 border-t border-gray-100">
          <span className="inline-flex items-center gap-1.5 text-xs text-gray-500">
            <Layers className="w-3.5 h-3.5" />
            {cardCount} card{cardCount !== 1 ? 's' : ''}
          </span>
          <span className="inline-flex items-center gap-1.5 text-xs text-gray-500">
            <Calendar className="w-3.5 h-3.5" />
            {new Date(dashboard.updated_at || dashboard.created_at).toLocaleDateString()}
          </span>
        </div>
      </div>
    </Link>
  )
}

function DropdownMenu({
  dashboard,
  onToggle,
  onDelete,
  onArchive,
}: {
  dashboard: Dashboard
  onToggle: () => void
  onDelete: () => void
  onArchive: () => void
}) {
  return (
    <>
      <div className="fixed inset-0 z-10" onClick={(e) => { e.preventDefault(); onToggle() }} />
      <div className="absolute right-0 mt-1 w-48 bg-white rounded-xl shadow-lg border border-gray-200 py-1.5 z-20">
        <button
          onClick={(e) => {
            e.preventDefault()
            navigator.clipboard.writeText(window.location.origin + `/dashboards/${dashboard.id}`)
            onToggle()
          }}
          className="flex items-center gap-2.5 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
        >
          <Copy className="w-4 h-4 text-gray-400" />
          Copy Link
        </button>
        {dashboard.is_public && dashboard.public_uuid && (
          <button
            onClick={(e) => {
              e.preventDefault()
              navigator.clipboard.writeText(
                window.location.origin + `/dashboards/public/${dashboard.public_uuid}`
              )
              onToggle()
            }}
            className="flex items-center gap-2.5 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            <Share2 className="w-4 h-4 text-gray-400" />
            Copy Share Link
          </button>
        )}
        <div className="my-1.5 border-t border-gray-100" />
        <button
          onClick={(e) => {
            e.preventDefault()
            onArchive()
          }}
          className="flex items-center gap-2.5 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
        >
          <Archive className="w-4 h-4 text-gray-400" />
          {dashboard.is_archived ? 'Restore' : 'Archive'}
        </button>
        <button
          onClick={(e) => {
            e.preventDefault()
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
