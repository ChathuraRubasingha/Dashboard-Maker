import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Save,
  Plus,
  ArrowLeft,
  Share2,
  Download,
  Eye,
  Edit3,
  Type,
  BarChart3,
  Table,
  Minus,
  GripVertical,
  Trash2,
  Settings,
  Copy,
  Check,
} from 'lucide-react'
import clsx from 'clsx'
import { v4 as uuidv4 } from 'uuid'
import { reportService } from '../services/reportService'
import { visualizationService } from '../services/visualizationService'
import type {
  Report,
  ReportBlock,
  BlockType,
  TextBlockConfig,
  VisualizationBlockConfig,
  TableBlockConfig,
  DividerBlockConfig,
  Visualization,
} from '../types'
import TextBlock from '../components/ReportBlocks/TextBlock'
import VisualizationBlock from '../components/ReportBlocks/VisualizationBlock'
import TableBlock from '../components/ReportBlocks/TableBlock'
import DividerBlock from '../components/ReportBlocks/DividerBlock'

export default function ReportBuilder() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const isNewReport = id === 'new'
  const reportId = isNewReport ? undefined : parseInt(id!, 10)

  const [reportName, setReportName] = useState('Untitled Report')
  const [reportDescription, setReportDescription] = useState('')
  const [blocks, setBlocks] = useState<ReportBlock[]>([])
  const [isEditing, setIsEditing] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [showAddBlockMenu, setShowAddBlockMenu] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null)
  const [showVisualizationPicker, setShowVisualizationPicker] = useState(false)
  const [pendingBlockType, setPendingBlockType] = useState<'visualization' | 'table' | null>(null)

  // Fetch existing report
  const { data: report, isLoading } = useQuery({
    queryKey: ['report', reportId],
    queryFn: () => reportService.get(reportId!),
    enabled: !!reportId,
  })

  // Fetch visualizations for picker
  const { data: visualizations = [] } = useQuery({
    queryKey: ['visualizations'],
    queryFn: () => visualizationService.list(false),
  })

  // Load report data
  useEffect(() => {
    if (report) {
      setReportName(report.name)
      setReportDescription(report.description || '')
      setBlocks(report.blocks || [])
    }
  }, [report])

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: { name: string; description?: string; blocks: ReportBlock[] }) =>
      reportService.create(data),
    onSuccess: (newReport) => {
      queryClient.invalidateQueries({ queryKey: ['reports'] })
      navigate(`/reports/${newReport.id}`, { replace: true })
      setHasUnsavedChanges(false)
    },
  })

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (data: { name: string; description?: string; blocks: ReportBlock[] }) =>
      reportService.update(reportId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report', reportId] })
      queryClient.invalidateQueries({ queryKey: ['reports'] })
      setHasUnsavedChanges(false)
    },
  })

  // Share mutation
  const shareMutation = useMutation({
    mutationFn: () => reportService.share(reportId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['report', reportId] })
    },
  })

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const data = {
        name: reportName,
        description: reportDescription || undefined,
        blocks,
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

  const addBlock = (type: BlockType, visualizationId?: number) => {
    const newBlock: ReportBlock = {
      id: uuidv4(),
      type,
      order: blocks.length,
      config: getDefaultConfig(type, visualizationId),
    }
    setBlocks([...blocks, newBlock])
    setHasUnsavedChanges(true)
    setShowAddBlockMenu(false)
    setShowVisualizationPicker(false)
    setPendingBlockType(null)
  }

  const updateBlock = (blockId: string, config: ReportBlock['config']) => {
    setBlocks(blocks.map((b) => (b.id === blockId ? { ...b, config } : b)))
    setHasUnsavedChanges(true)
  }

  const removeBlock = (blockId: string) => {
    setBlocks(blocks.filter((b) => b.id !== blockId).map((b, i) => ({ ...b, order: i })))
    setHasUnsavedChanges(true)
    if (selectedBlockId === blockId) {
      setSelectedBlockId(null)
    }
  }

  const moveBlock = (blockId: string, direction: 'up' | 'down') => {
    const index = blocks.findIndex((b) => b.id === blockId)
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === blocks.length - 1)
    ) {
      return
    }

    const newBlocks = [...blocks]
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    ;[newBlocks[index], newBlocks[targetIndex]] = [newBlocks[targetIndex], newBlocks[index]]
    setBlocks(newBlocks.map((b, i) => ({ ...b, order: i })))
    setHasUnsavedChanges(true)
  }

  const handleAddVisualizationBlock = (type: 'visualization' | 'table') => {
    setPendingBlockType(type)
    setShowVisualizationPicker(true)
    setShowAddBlockMenu(false)
  }

  const handleSelectVisualization = (visualization: Visualization) => {
    if (pendingBlockType) {
      addBlock(pendingBlockType, visualization.id)
    }
  }

  if (!isNewReport && isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen -m-4 lg:-m-6 bg-gray-50">
      {/* Toolbar */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-200 px-4 lg:px-6">
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/reports')}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <input
              type="text"
              value={reportName}
              onChange={(e) => {
                setReportName(e.target.value)
                setHasUnsavedChanges(true)
              }}
              className="text-lg font-semibold text-gray-900 bg-transparent border-none focus:outline-none focus:ring-0"
              placeholder="Report name"
            />
            {hasUnsavedChanges && (
              <span className="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded">
                Unsaved changes
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <div className="relative">
                  <button
                    onClick={() => setShowAddBlockMenu(!showAddBlockMenu)}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-lg"
                  >
                    <Plus className="w-4 h-4" />
                    Add Block
                  </button>
                  {showAddBlockMenu && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setShowAddBlockMenu(false)}
                      />
                      <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                        <button
                          onClick={() => addBlock('text')}
                          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        >
                          <Type className="w-4 h-4" />
                          Text Block
                        </button>
                        <button
                          onClick={() => handleAddVisualizationBlock('visualization')}
                          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        >
                          <BarChart3 className="w-4 h-4" />
                          Visualization
                        </button>
                        <button
                          onClick={() => handleAddVisualizationBlock('table')}
                          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        >
                          <Table className="w-4 h-4" />
                          Data Table
                        </button>
                        <button
                          onClick={() => addBlock('divider')}
                          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        >
                          <Minus className="w-4 h-4" />
                          Divider
                        </button>
                      </div>
                    </>
                  )}
                </div>
                <button
                  onClick={handleSave}
                  disabled={isSaving || !hasUnsavedChanges}
                  className={clsx(
                    'flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg',
                    hasUnsavedChanges
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-100 text-gray-400'
                  )}
                >
                  <Save className="w-4 h-4" />
                  {isSaving ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  <Eye className="w-4 h-4" />
                  Preview
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded-lg"
              >
                <Edit3 className="w-4 h-4" />
                Edit
              </button>
            )}
            {!isNewReport && (
              <>
                <button
                  onClick={() => setShowShareModal(true)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <Share2 className="w-5 h-5 text-gray-600" />
                </button>
                <button
                  onClick={() => window.print()}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                  title="Print / Save as PDF"
                >
                  <Download className="w-5 h-5 text-gray-600" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Report Canvas */}
      <div className="max-w-4xl mx-auto py-8 px-4">
        {/* Description input (editing mode only) */}
        {isEditing && (
          <div className="mb-6">
            <input
              type="text"
              value={reportDescription}
              onChange={(e) => {
                setReportDescription(e.target.value)
                setHasUnsavedChanges(true)
              }}
              className="w-full text-gray-500 bg-transparent border-none focus:outline-none focus:ring-0"
              placeholder="Add a description..."
            />
          </div>
        )}

        {/* Blocks */}
        <div className="space-y-4">
          {blocks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 bg-white rounded-lg border-2 border-dashed border-gray-300">
              <p className="text-gray-500 mb-4">No blocks in this report</p>
              {isEditing && (
                <button
                  onClick={() => setShowAddBlockMenu(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Plus className="w-5 h-5" />
                  Add Your First Block
                </button>
              )}
            </div>
          ) : (
            blocks
              .sort((a, b) => a.order - b.order)
              .map((block, index) => (
                <BlockWrapper
                  key={block.id}
                  block={block}
                  isEditing={isEditing}
                  isSelected={selectedBlockId === block.id}
                  onSelect={() => setSelectedBlockId(block.id)}
                  onUpdate={(config) => updateBlock(block.id, config)}
                  onRemove={() => removeBlock(block.id)}
                  onMoveUp={() => moveBlock(block.id, 'up')}
                  onMoveDown={() => moveBlock(block.id, 'down')}
                  canMoveUp={index > 0}
                  canMoveDown={index < blocks.length - 1}
                />
              ))
          )}
        </div>

        {/* Add block button at bottom */}
        {isEditing && blocks.length > 0 && (
          <div className="mt-4 flex justify-center">
            <button
              onClick={() => setShowAddBlockMenu(true)}
              className="flex items-center gap-2 px-4 py-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Plus className="w-5 h-5" />
              Add Block
            </button>
          </div>
        )}
      </div>

      {/* Visualization Picker Modal */}
      {showVisualizationPicker && (
        <VisualizationPickerModal
          visualizations={visualizations}
          onSelect={handleSelectVisualization}
          onClose={() => {
            setShowVisualizationPicker(false)
            setPendingBlockType(null)
          }}
          blockType={pendingBlockType}
        />
      )}

      {/* Share Modal */}
      {showShareModal && reportId && (
        <ShareModal
          report={report!}
          onShare={() => shareMutation.mutate()}
          onClose={() => setShowShareModal(false)}
          isSharing={shareMutation.isPending}
        />
      )}
    </div>
  )
}

function getDefaultConfig(
  type: BlockType,
  visualizationId?: number
): ReportBlock['config'] {
  switch (type) {
    case 'text':
      return {
        content: '',
        style: {
          fontSize: 16,
          fontWeight: 'normal',
          textAlign: 'left',
          color: '#000000',
        },
      } as TextBlockConfig
    case 'visualization':
      return {
        visualization_id: visualizationId!,
        show_title: true,
        show_description: false,
        height: 300,
      } as VisualizationBlockConfig
    case 'table':
      return {
        visualization_id: visualizationId!,
        show_title: true,
        export_all_rows: true,
        max_preview_rows: 100,
      } as TableBlockConfig
    case 'divider':
      return {
        style: 'solid',
        color: '#e5e7eb',
        margin: 20,
      } as DividerBlockConfig
    default:
      throw new Error(`Unknown block type: ${type}`)
  }
}

function BlockWrapper({
  block,
  isEditing,
  isSelected,
  onSelect,
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
}: {
  block: ReportBlock
  isEditing: boolean
  isSelected: boolean
  onSelect: () => void
  onUpdate: (config: ReportBlock['config']) => void
  onRemove: () => void
  onMoveUp: () => void
  onMoveDown: () => void
  canMoveUp: boolean
  canMoveDown: boolean
}) {
  return (
    <div
      onClick={onSelect}
      className={clsx(
        'relative group',
        isEditing && 'cursor-pointer',
        isSelected && isEditing && 'ring-2 ring-blue-500 rounded-lg'
      )}
    >
      {/* Block controls (editing mode) */}
      {isEditing && (
        <div
          className={clsx(
            'absolute -left-12 top-0 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity',
            isSelected && 'opacity-100'
          )}
        >
          <button
            onClick={(e) => {
              e.stopPropagation()
              onMoveUp()
            }}
            disabled={!canMoveUp}
            className="p-1 bg-white border rounded hover:bg-gray-50 disabled:opacity-30"
            title="Move up"
          >
            <GripVertical className="w-4 h-4 text-gray-400 rotate-180" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onMoveDown()
            }}
            disabled={!canMoveDown}
            className="p-1 bg-white border rounded hover:bg-gray-50 disabled:opacity-30"
            title="Move down"
          >
            <GripVertical className="w-4 h-4 text-gray-400" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onRemove()
            }}
            className="p-1 bg-white border rounded hover:bg-red-50 hover:border-red-200"
            title="Remove"
          >
            <Trash2 className="w-4 h-4 text-red-500" />
          </button>
        </div>
      )}

      {/* Block content */}
      {block.type === 'text' && (
        <TextBlock
          config={block.config as TextBlockConfig}
          isEditing={isEditing}
          onUpdate={onUpdate}
        />
      )}
      {block.type === 'visualization' && (
        <VisualizationBlock
          config={block.config as VisualizationBlockConfig}
          isEditing={isEditing}
          onUpdate={onUpdate}
        />
      )}
      {block.type === 'table' && (
        <TableBlock
          config={block.config as TableBlockConfig}
          isEditing={isEditing}
          onUpdate={onUpdate}
        />
      )}
      {block.type === 'divider' && (
        <DividerBlock
          config={block.config as DividerBlockConfig}
          isEditing={isEditing}
          onUpdate={onUpdate}
        />
      )}
    </div>
  )
}

function VisualizationPickerModal({
  visualizations,
  onSelect,
  onClose,
  blockType,
}: {
  visualizations: Visualization[]
  onSelect: (visualization: Visualization) => void
  onClose: () => void
  blockType: 'visualization' | 'table' | null
}) {
  const [search, setSearch] = useState('')

  const filtered = visualizations.filter((v) =>
    v.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold">
            Select {blockType === 'table' ? 'Data Table' : 'Visualization'}
          </h2>
          <div className="mt-3 relative">
            <input
              type="text"
              placeholder="Search visualizations..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-4 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {filtered.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No visualizations found</p>
          ) : (
            <div className="space-y-2">
              {filtered.map((v) => (
                <button
                  key={v.id}
                  onClick={() => onSelect(v)}
                  className="w-full text-left p-3 rounded-lg border hover:border-blue-500 hover:bg-blue-50 transition-colors"
                >
                  <div className="font-medium text-gray-900">{v.name}</div>
                  {v.description && (
                    <div className="text-sm text-gray-500 mt-1">{v.description}</div>
                  )}
                  <div className="text-xs text-gray-400 mt-1">
                    {v.visualization_type} chart
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="p-4 border-t flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

function ShareModal({
  report,
  onShare,
  onClose,
  isSharing,
}: {
  report: Report
  onShare: () => void
  onClose: () => void
  isSharing: boolean
}) {
  const [copied, setCopied] = useState(false)

  const shareUrl = report.share_token
    ? `${window.location.origin}/reports/shared/${report.share_token}`
    : null

  const handleCopy = () => {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <h2 className="text-lg font-semibold mb-4">Share Report</h2>

        {report.is_public && shareUrl ? (
          <div>
            <p className="text-sm text-gray-600 mb-3">
              Anyone with this link can view the report:
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={shareUrl}
                readOnly
                className="flex-1 px-3 py-2 border rounded-lg bg-gray-50 text-sm"
              />
              <button
                onClick={handleCopy}
                className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>
        ) : (
          <div>
            <p className="text-sm text-gray-600 mb-4">
              Generate a shareable link for this report. Anyone with the link will be able to
              view it.
            </p>
            <button
              onClick={onShare}
              disabled={isSharing}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isSharing ? 'Generating...' : 'Generate Share Link'}
            </button>
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
