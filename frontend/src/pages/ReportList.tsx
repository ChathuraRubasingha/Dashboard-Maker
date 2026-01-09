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
  Eye,
  Share2,
  Copy,
  Link2,
} from 'lucide-react'
import clsx from 'clsx'
import { reportService } from '../services/reportService'
import type { ReportListItem } from '../types'

export default function ReportList() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [searchQuery, setSearchQuery] = useState('')
  const [showArchived, setShowArchived] = useState(false)
  const [menuOpenId, setMenuOpenId] = useState<number | null>(null)

  const { data: reports = [], isLoading } = useQuery({
    queryKey: ['reports', showArchived],
    queryFn: () => reportService.list(showArchived),
  })

  const deleteMutation = useMutation({
    mutationFn: reportService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] })
    },
  })

  const archiveMutation = useMutation({
    mutationFn: ({ id, archived }: { id: number; archived: boolean }) =>
      reportService.update(id, { is_archived: archived }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] })
    },
  })

  const duplicateMutation = useMutation({
    mutationFn: (id: number) => reportService.duplicate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reports'] })
    },
  })

  const filteredReports = reports.filter((r) =>
    r.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="text-sm text-gray-500 mt-1">
            Build and share reports with your saved visualizations
          </p>
        </div>
        <button
          onClick={() => navigate('/reports/new')}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          New Report
        </button>
      </div>

      {/* Search and filters */}
      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search reports..."
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

      {/* Reports grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filteredReports.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No reports yet</h3>
          <p className="text-gray-500 mb-4">
            Create your first report to combine visualizations into shareable documents
          </p>
          <button
            onClick={() => navigate('/reports/new')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-5 h-5" />
            Create Report
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredReports.map((report) => (
            <ReportCard
              key={report.id}
              report={report}
              isMenuOpen={menuOpenId === report.id}
              onMenuToggle={() => setMenuOpenId(menuOpenId === report.id ? null : report.id)}
              onDelete={() => {
                if (confirm('Are you sure you want to delete this report?')) {
                  deleteMutation.mutate(report.id)
                }
                setMenuOpenId(null)
              }}
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
      )}
    </div>
  )
}

function ReportCard({
  report,
  isMenuOpen,
  onMenuToggle,
  onDelete,
  onArchive,
  onDuplicate,
}: {
  report: ReportListItem
  isMenuOpen: boolean
  onMenuToggle: () => void
  onDelete: () => void
  onArchive: () => void
  onDuplicate: () => void
}) {
  const navigate = useNavigate()

  const handleCardClick = () => {
    navigate(`/reports/${report.id}`)
  }

  return (
    <div
      onClick={handleCardClick}
      className={clsx(
        'bg-white rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all cursor-pointer',
        report.is_archived && 'opacity-60'
      )}
    >
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="p-2 rounded-lg bg-indigo-100 text-indigo-600">
              <FileText className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-medium text-gray-900 truncate">{report.name}</h3>
                {report.is_public && (
                  <span title="Shared">
                    <Link2 className="w-3.5 h-3.5 text-green-500 shrink-0" />
                  </span>
                )}
              </div>
              {report.description && (
                <p className="text-sm text-gray-500 mt-1 line-clamp-2">{report.description}</p>
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
                      navigate(`/reports/${report.id}`)
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
                      onDuplicate()
                    }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <Copy className="w-4 h-4" />
                    Duplicate
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
                    {report.is_archived ? 'Unarchive' : 'Archive'}
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
            {report.block_count} {report.block_count === 1 ? 'block' : 'blocks'}
          </span>
          <span>
            {report.updated_at
              ? `Updated ${new Date(report.updated_at).toLocaleDateString()}`
              : `Created ${new Date(report.created_at).toLocaleDateString()}`}
          </span>
        </div>
      </div>
    </div>
  )
}
