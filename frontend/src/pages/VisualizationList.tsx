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

export default function VisualizationList() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [searchQuery, setSearchQuery] = useState('')
  const [showArchived, setShowArchived] = useState(false)
  const [menuOpenId, setMenuOpenId] = useState<number | null>(null)

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

  const filteredVisualizations = visualizations.filter((v) =>
    v.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Visualizations</h1>
          <p className="text-sm text-gray-500 mt-1">
            View and manage your saved visualizations
          </p>
        </div>
        <button
          onClick={() => navigate('/query-builder')}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          New Visualization
        </button>
      </div>

      {/* Search and filters */}
      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search visualizations..."
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

      {/* Visualization grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filteredVisualizations.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No visualizations yet</h3>
          <p className="text-gray-500 mb-4">
            Create your first visualization using the Query Builder
          </p>
          <button
            onClick={() => navigate('/query-builder')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-5 h-5" />
            Create Visualization
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredVisualizations.map((visualization) => (
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
      )}
    </div>
  )
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

  const handleCardClick = () => {
    navigate(`/visualizations/${visualization.id}`)
  }

  return (
    <div
      onClick={handleCardClick}
      className={clsx(
        'bg-white rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all cursor-pointer',
        visualization.is_archived && 'opacity-60'
      )}
    >
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className={clsx(
              'p-2 rounded-lg',
              visualization.visualization_type === 'table' ? 'bg-gray-100 text-gray-600' :
              visualization.visualization_type === 'bar' ? 'bg-blue-100 text-blue-600' :
              visualization.visualization_type === 'line' ? 'bg-green-100 text-green-600' :
              visualization.visualization_type === 'area' ? 'bg-purple-100 text-purple-600' :
              visualization.visualization_type === 'pie' ? 'bg-orange-100 text-orange-600' :
              'bg-gray-100 text-gray-600'
            )}>
              {VISUALIZATION_ICONS[visualization.visualization_type] || <BarChart3 className="w-5 h-5" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-medium text-gray-900 truncate">{visualization.name}</h3>
                {visualization.is_query_locked && (
                  <span title="Query locked">
                    <Lock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  </span>
                )}
              </div>
              {visualization.description && (
                <p className="text-sm text-gray-500 mt-1 line-clamp-2">{visualization.description}</p>
              )}
            </div>
          </div>
          <div className="relative">
            <button
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onMenuToggle()
              }}
              className="p-1 rounded hover:bg-gray-100"
            >
              <MoreVertical className="w-5 h-5 text-gray-400" />
            </button>

            {isMenuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={(e) => { e.preventDefault(); e.stopPropagation(); onMenuToggle() }} />
                <div className="absolute right-0 mt-1 w-40 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      navigate(`/visualizations/${visualization.id}`)
                    }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <Eye className="w-4 h-4" />
                    View / Edit
                  </button>
                  <button
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      onArchive()
                    }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <Archive className="w-4 h-4" />
                    {visualization.is_archived ? 'Unarchive' : 'Archive'}
                  </button>
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

        <div className="flex items-center gap-4 mt-4 text-xs text-gray-500">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 rounded-full">
            {VISUALIZATION_LABELS[visualization.visualization_type] || visualization.visualization_type}
          </span>
          <span>Created {new Date(visualization.created_at).toLocaleDateString()}</span>
        </div>
      </div>
    </div>
  )
}
