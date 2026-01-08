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
} from 'lucide-react'
import clsx from 'clsx'
import { dashboardService } from '../services/dashboardService'
import type { Dashboard } from '../types'

export default function DashboardList() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [searchQuery, setSearchQuery] = useState('')
  const [showArchived, setShowArchived] = useState(false)
  const [menuOpenId, setMenuOpenId] = useState<number | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [newDashboardName, setNewDashboardName] = useState('')

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

  const filteredDashboards = dashboards.filter((d) =>
    d.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleCreate = () => {
    if (newDashboardName.trim()) {
      createMutation.mutate({ name: newDashboardName.trim() })
      setIsCreating(false)
      setNewDashboardName('')
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboards</h1>
          <p className="text-sm text-gray-500 mt-1">
            Create and manage your analytics dashboards
          </p>
        </div>
        <button
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          New Dashboard
        </button>
      </div>

      {/* Search and filters */}
      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search dashboards..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(e) => setShowArchived(e.target.checked)}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          Show archived
        </label>
      </div>

      {/* Dashboard grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filteredDashboards.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <LayoutDashboard className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No dashboards yet</h3>
          <p className="text-gray-500 mb-4">
            Create your first dashboard to start visualizing your data
          </p>
          <button
            onClick={() => setIsCreating(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-5 h-5" />
            Create Dashboard
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDashboards.map((dashboard) => (
            <DashboardCard
              key={dashboard.id}
              dashboard={dashboard}
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
      )}

      {/* Create dashboard modal */}
      {isCreating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setIsCreating(false)} />
          <div className="relative bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Create New Dashboard</h2>
            <input
              type="text"
              placeholder="Dashboard name"
              value={newDashboardName}
              onChange={(e) => setNewDashboardName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-4"
              autoFocus
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setIsCreating(false)
                  setNewDashboardName('')
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={!newDashboardName.trim() || createMutation.isPending}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50"
              >
                {createMutation.isPending ? 'Creating...' : 'Create'}
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
  isMenuOpen,
  onMenuToggle,
  onDelete,
  onArchive,
}: {
  dashboard: Dashboard
  isMenuOpen: boolean
  onMenuToggle: () => void
  onDelete: () => void
  onArchive: () => void
}) {
  return (
    <Link
      to={`/dashboards/${dashboard.id}`}
      className={clsx(
        'block bg-white rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all',
        dashboard.is_archived && 'opacity-60'
      )}
    >
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-gray-900 truncate">{dashboard.name}</h3>
            {dashboard.description && (
              <p className="text-sm text-gray-500 mt-1 line-clamp-2">{dashboard.description}</p>
            )}
          </div>
          <div className="relative">
            <button
              onClick={(e) => {
                e.preventDefault()
                onMenuToggle()
              }}
              className="p-1 rounded hover:bg-gray-100"
            >
              <MoreVertical className="w-5 h-5 text-gray-400" />
            </button>

            {isMenuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={(e) => { e.preventDefault(); onMenuToggle() }} />
                <div className="absolute right-0 mt-1 w-40 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      // Copy link
                      navigator.clipboard.writeText(window.location.origin + `/dashboards/${dashboard.id}`)
                      onMenuToggle()
                    }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <Copy className="w-4 h-4" />
                    Copy Link
                  </button>
                  {dashboard.is_public && (
                    <button
                      onClick={(e) => {
                        e.preventDefault()
                        navigator.clipboard.writeText(
                          window.location.origin + `/dashboards/public/${dashboard.public_uuid}`
                        )
                        onMenuToggle()
                      }}
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <Share2 className="w-4 h-4" />
                      Share Link
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      onArchive()
                    }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <Archive className="w-4 h-4" />
                    {dashboard.is_archived ? 'Unarchive' : 'Archive'}
                  </button>
                  <button
                    onClick={(e) => {
                      e.preventDefault()
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

        <div className="flex items-center gap-4 mt-4 text-xs text-gray-500">
          <span>{dashboard.cards.length} cards</span>
          <span>Updated {new Date(dashboard.updated_at || dashboard.created_at).toLocaleDateString()}</span>
        </div>
      </div>
    </Link>
  )
}
