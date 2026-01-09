import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  Save,
  Plus,
  ArrowLeft,
  Share2,
  Eye,
  Edit3,
  Type,
  BarChart3,
  Table,
  Minus,
  GripVertical,
  Trash2,
  Copy,
  Check,
  FileText,
  FileSpreadsheet,
  MessageCircle,
  MoreHorizontal,
  Heading1,
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

  // If id is undefined (at /reports/new route) or 'new', treat as a new report
  const isNewReport = !id || id === 'new'
  const reportId = isNewReport ? undefined : parseInt(id, 10)

  const [reportName, setReportName] = useState('Untitled Report')
  const [reportDescription, setReportDescription] = useState('')
  const [blocks, setBlocks] = useState<ReportBlock[]>([])
  const [isEditing, setIsEditing] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null)
  const [showVisualizationPicker, setShowVisualizationPicker] = useState(false)
  const [pendingBlockType, setPendingBlockType] = useState<'visualization' | 'table' | null>(null)
  const [showAddBlockMenu, setShowAddBlockMenu] = useState<string | null>(null) // block id or 'top' or 'bottom'
  const reportContentRef = useRef<HTMLDivElement>(null)

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

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

  const addBlock = (type: BlockType, visualizationId?: number, insertAfter?: string) => {
    const newBlock: ReportBlock = {
      id: uuidv4(),
      type,
      order: blocks.length,
      config: getDefaultConfig(type, visualizationId),
    }

    let newBlocks: ReportBlock[]
    if (insertAfter === 'top') {
      newBlocks = [newBlock, ...blocks]
    } else if (insertAfter) {
      const index = blocks.findIndex((b) => b.id === insertAfter)
      newBlocks = [...blocks.slice(0, index + 1), newBlock, ...blocks.slice(index + 1)]
    } else {
      newBlocks = [...blocks, newBlock]
    }

    // Reorder
    setBlocks(newBlocks.map((b, i) => ({ ...b, order: i })))
    setHasUnsavedChanges(true)
    setShowAddBlockMenu(null)
    setShowVisualizationPicker(false)
    setPendingBlockType(null)
    setSelectedBlockId(newBlock.id)
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

  const duplicateBlock = (blockId: string) => {
    const block = blocks.find((b) => b.id === blockId)
    if (block) {
      const newBlock: ReportBlock = {
        ...block,
        id: uuidv4(),
        order: block.order + 1,
      }
      const index = blocks.findIndex((b) => b.id === blockId)
      const newBlocks = [...blocks.slice(0, index + 1), newBlock, ...blocks.slice(index + 1)]
      setBlocks(newBlocks.map((b, i) => ({ ...b, order: i })))
      setHasUnsavedChanges(true)
      setSelectedBlockId(newBlock.id)
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      setBlocks((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id)
        const newIndex = items.findIndex((i) => i.id === over.id)
        const newItems = arrayMove(items, oldIndex, newIndex)
        return newItems.map((b, i) => ({ ...b, order: i }))
      })
      setHasUnsavedChanges(true)
    }
  }

  const handleAddVisualizationBlock = (type: 'visualization' | 'table') => {
    setPendingBlockType(type)
    setShowVisualizationPicker(true)
    setShowAddBlockMenu(null)
  }

  const handleSelectVisualization = (visualization: Visualization) => {
    if (pendingBlockType) {
      addBlock(pendingBlockType, visualization.id, showAddBlockMenu || undefined)
    }
  }

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 's' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        if (hasUnsavedChanges) {
          handleSave()
        }
      }
      if (e.key === 'Escape') {
        setSelectedBlockId(null)
        setShowAddBlockMenu(null)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [hasUnsavedChanges])

  if (!isNewReport && isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen -m-4 lg:-m-6 bg-gray-100">
      {/* Top Toolbar - Google Docs style */}
      <div className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm">
        {/* Title row */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/reports')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div className="flex flex-col">
              <input
                type="text"
                value={reportName}
                onChange={(e) => {
                  setReportName(e.target.value)
                  setHasUnsavedChanges(true)
                }}
                className="text-lg font-semibold text-gray-900 bg-transparent border-none focus:outline-none focus:ring-0 hover:bg-gray-50 px-2 py-1 -mx-2 rounded"
                placeholder="Report name"
              />
              <input
                type="text"
                value={reportDescription}
                onChange={(e) => {
                  setReportDescription(e.target.value)
                  setHasUnsavedChanges(true)
                }}
                className="text-sm text-gray-500 bg-transparent border-none focus:outline-none focus:ring-0 hover:bg-gray-50 px-2 py-0.5 -mx-2 rounded"
                placeholder="Add a description..."
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            {hasUnsavedChanges && (
              <span className="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded">
                Unsaved
              </span>
            )}
            <button
              onClick={handleSave}
              disabled={isSaving || !hasUnsavedChanges}
              className={clsx(
                'flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all',
                hasUnsavedChanges
                  ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              )}
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'Saving...' : 'Save'}
            </button>
            {!isNewReport && (
              <button
                onClick={() => setShowShareModal(true)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Share2 className="w-4 h-4" />
                Share
              </button>
            )}
          </div>
        </div>

        {/* Action row */}
        <div className="flex items-center justify-between px-4 py-2">
          <div className="flex items-center gap-1">
            {/* Quick add buttons */}
            <button
              onClick={() => addBlock('text')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="Add text"
            >
              <Type className="w-4 h-4" />
              <span className="hidden sm:inline">Text</span>
            </button>
            <button
              onClick={() => addBlock('text', undefined, undefined)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="Add heading"
            >
              <Heading1 className="w-4 h-4" />
              <span className="hidden sm:inline">Heading</span>
            </button>
            <div className="w-px h-6 bg-gray-200 mx-1" />
            <button
              onClick={() => handleAddVisualizationBlock('visualization')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="Add chart"
            >
              <BarChart3 className="w-4 h-4" />
              <span className="hidden sm:inline">Chart</span>
            </button>
            <button
              onClick={() => handleAddVisualizationBlock('table')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="Add table"
            >
              <Table className="w-4 h-4" />
              <span className="hidden sm:inline">Table</span>
            </button>
            <button
              onClick={() => addBlock('divider')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="Add divider"
            >
              <Minus className="w-4 h-4" />
              <span className="hidden sm:inline">Divider</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsEditing(!isEditing)}
              className={clsx(
                'flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg transition-colors',
                isEditing
                  ? 'bg-blue-50 text-blue-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
            >
              {isEditing ? (
                <>
                  <Eye className="w-4 h-4" />
                  Preview
                </>
              ) : (
                <>
                  <Edit3 className="w-4 h-4" />
                  Edit
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Report Canvas - Paper-like */}
      <div className="flex justify-center py-8 px-4">
        <div
          ref={reportContentRef}
          className={clsx(
            'w-full max-w-4xl bg-white rounded-lg shadow-lg transition-all',
            isEditing ? 'min-h-[800px]' : 'min-h-[600px]'
          )}
          style={{
            boxShadow: '0 0 20px rgba(0,0,0,0.1)',
          }}
        >
          <div className="p-8 lg:p-12">
            {/* Blocks */}
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={blocks.map((b) => b.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {blocks.length === 0 ? (
                    <EmptyState onAddBlock={() => setShowAddBlockMenu('bottom')} />
                  ) : (
                    blocks
                      .sort((a, b) => a.order - b.order)
                      .map((block) => (
                        <SortableBlock
                          key={block.id}
                          block={block}
                          isEditing={isEditing}
                          isSelected={selectedBlockId === block.id}
                          onSelect={() => setSelectedBlockId(block.id)}
                          onUpdate={(config) => updateBlock(block.id, config)}
                          onRemove={() => removeBlock(block.id)}
                          onDuplicate={() => duplicateBlock(block.id)}
                          onAddBelow={() => setShowAddBlockMenu(block.id)}
                        />
                      ))
                  )}
                </div>
              </SortableContext>
            </DndContext>

            {/* Add block at bottom */}
            {isEditing && blocks.length > 0 && (
              <div className="mt-6 flex justify-center">
                <button
                  onClick={() => setShowAddBlockMenu('bottom')}
                  className="flex items-center gap-2 px-4 py-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors border-2 border-dashed border-gray-200 hover:border-gray-300"
                >
                  <Plus className="w-5 h-5" />
                  Add block
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Block Menu */}
      {showAddBlockMenu && (
        <AddBlockMenu
          onAddText={() => addBlock('text', undefined, showAddBlockMenu)}
          onAddHeading={() => {
            const headingBlock: ReportBlock = {
              id: uuidv4(),
              type: 'text',
              order: blocks.length,
              config: {
                content: '',
                style: {
                  fontSize: 24,
                  fontWeight: 'bold',
                  textAlign: 'left',
                  color: '#000000',
                },
              } as TextBlockConfig,
            }
            let newBlocks: ReportBlock[]
            if (showAddBlockMenu === 'top') {
              newBlocks = [headingBlock, ...blocks]
            } else if (showAddBlockMenu === 'bottom') {
              newBlocks = [...blocks, headingBlock]
            } else {
              const index = blocks.findIndex((b) => b.id === showAddBlockMenu)
              newBlocks = [...blocks.slice(0, index + 1), headingBlock, ...blocks.slice(index + 1)]
            }
            setBlocks(newBlocks.map((b, i) => ({ ...b, order: i })))
            setHasUnsavedChanges(true)
            setShowAddBlockMenu(null)
            setSelectedBlockId(headingBlock.id)
          }}
          onAddChart={() => handleAddVisualizationBlock('visualization')}
          onAddTable={() => handleAddVisualizationBlock('table')}
          onAddDivider={() => addBlock('divider', undefined, showAddBlockMenu)}
          onClose={() => setShowAddBlockMenu(null)}
        />
      )}

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
          reportName={reportName}
          contentRef={reportContentRef}
          onShare={() => shareMutation.mutate()}
          onClose={() => setShowShareModal(false)}
          isSharing={shareMutation.isPending}
        />
      )}
    </div>
  )
}

function EmptyState({ onAddBlock }: { onAddBlock: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
        <FileText className="w-8 h-8 text-gray-400" />
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">Start building your report</h3>
      <p className="text-gray-500 text-center mb-6 max-w-sm">
        Add text, charts, tables, and more to create a beautiful report.
      </p>
      <button
        onClick={onAddBlock}
        className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
      >
        <Plus className="w-5 h-5" />
        Add your first block
      </button>
    </div>
  )
}

function SortableBlock({
  block,
  isEditing,
  isSelected,
  onSelect,
  onUpdate,
  onRemove,
  onDuplicate,
  onAddBelow,
}: {
  block: ReportBlock
  isEditing: boolean
  isSelected: boolean
  onSelect: () => void
  onUpdate: (config: ReportBlock['config']) => void
  onRemove: () => void
  onDuplicate: () => void
  onAddBelow: () => void
}) {
  const [showMenu, setShowMenu] = useState(false)
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id, disabled: !isEditing })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={clsx(
        'group relative',
        isDragging && 'z-50 opacity-90',
        isEditing && 'hover:bg-gray-50 rounded-lg transition-colors'
      )}
      onClick={onSelect}
    >
      {/* Drag handle and actions */}
      {isEditing && (
        <div
          className={clsx(
            'absolute -left-10 top-1/2 -translate-y-1/2 flex flex-col items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity',
            isSelected && 'opacity-100'
          )}
        >
          <button
            {...attributes}
            {...listeners}
            className="p-1.5 hover:bg-gray-200 rounded cursor-grab active:cursor-grabbing"
            title="Drag to reorder"
          >
            <GripVertical className="w-4 h-4 text-gray-400" />
          </button>
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation()
                setShowMenu(!showMenu)
              }}
              className="p-1.5 hover:bg-gray-200 rounded"
            >
              <MoreHorizontal className="w-4 h-4 text-gray-400" />
            </button>
            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowMenu(false)}
                />
                <div className="absolute left-6 top-0 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20 min-w-[140px]">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onDuplicate()
                      setShowMenu(false)
                    }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <Copy className="w-4 h-4" />
                    Duplicate
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onAddBelow()
                      setShowMenu(false)
                    }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <Plus className="w-4 h-4" />
                    Add below
                  </button>
                  <div className="border-t border-gray-100 my-1" />
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onRemove()
                      setShowMenu(false)
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
      )}

      {/* Block content */}
      <div className={clsx('py-1', isSelected && isEditing && 'ring-2 ring-blue-500 rounded-lg')}>
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
    </div>
  )
}

function AddBlockMenu({
  onAddText,
  onAddHeading,
  onAddChart,
  onAddTable,
  onAddDivider,
  onClose,
}: {
  onAddText: () => void
  onAddHeading: () => void
  onAddChart: () => void
  onAddTable: () => void
  onAddDivider: () => void
  onClose: () => void
}) {
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
        <div className="bg-white rounded-xl shadow-2xl border border-gray-200 p-4 pointer-events-auto w-80">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Add block</h3>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={onAddText}
              className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-all text-left"
            >
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                <Type className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <div className="font-medium text-gray-900 text-sm">Text</div>
                <div className="text-xs text-gray-500">Paragraph text</div>
              </div>
            </button>
            <button
              onClick={onAddHeading}
              className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-all text-left"
            >
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                <Heading1 className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <div className="font-medium text-gray-900 text-sm">Heading</div>
                <div className="text-xs text-gray-500">Section title</div>
              </div>
            </button>
            <button
              onClick={onAddChart}
              className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-all text-left"
            >
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <div className="font-medium text-gray-900 text-sm">Chart</div>
                <div className="text-xs text-gray-500">Visualization</div>
              </div>
            </button>
            <button
              onClick={onAddTable}
              className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-all text-left"
            >
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Table className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <div className="font-medium text-gray-900 text-sm">Table</div>
                <div className="text-xs text-gray-500">Data table</div>
              </div>
            </button>
            <button
              onClick={onAddDivider}
              className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-all text-left col-span-2"
            >
              <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                <Minus className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <div className="font-medium text-gray-900 text-sm">Divider</div>
                <div className="text-xs text-gray-500">Horizontal line separator</div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </>
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
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden">
        <div className="p-5 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Select {blockType === 'table' ? 'Data Table' : 'Visualization'}
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Choose a saved visualization to add to your report
          </p>
          <div className="mt-4 relative">
            <input
              type="text"
              placeholder="Search visualizations..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-4 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              autoFocus
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {filtered.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <BarChart3 className="w-6 h-6 text-gray-400" />
              </div>
              <p className="text-gray-500">No visualizations found</p>
              <p className="text-sm text-gray-400 mt-1">Create one in the Query Builder first</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((v) => (
                <button
                  key={v.id}
                  onClick={() => onSelect(v)}
                  className="w-full text-left p-4 rounded-lg border border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-all group"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-blue-100">
                      {v.visualization_type === 'table' ? (
                        <Table className="w-5 h-5 text-gray-500 group-hover:text-blue-600" />
                      ) : (
                        <BarChart3 className="w-5 h-5 text-gray-500 group-hover:text-blue-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 truncate">{v.name}</div>
                      {v.description && (
                        <div className="text-sm text-gray-500 mt-0.5 truncate">{v.description}</div>
                      )}
                      <div className="text-xs text-gray-400 mt-1 capitalize">
                        {v.visualization_type} chart
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
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
  reportName,
  contentRef,
  onShare,
  onClose,
  isSharing,
}: {
  report: Report
  reportName: string
  contentRef: React.RefObject<HTMLDivElement | null>
  onShare: () => void
  onClose: () => void
  isSharing: boolean
}) {
  const [copied, setCopied] = useState(false)
  const [isExportingPDF, setIsExportingPDF] = useState(false)
  const [isExportingExcel, setIsExportingExcel] = useState(false)

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

  const handleWhatsAppShare = () => {
    const message = `Check out this report: ${report.name}${shareUrl ? `\n${shareUrl}` : ''}`
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`
    window.open(whatsappUrl, '_blank')
  }

  const handlePDFExport = async () => {
    if (!contentRef.current) return

    setIsExportingPDF(true)
    try {
      // Close modal temporarily to capture content
      const modalBackdrop = document.querySelector('.fixed.inset-0.z-50') as HTMLElement
      if (modalBackdrop) {
        modalBackdrop.style.display = 'none'
      }

      // Wait for any animations to complete
      await new Promise((resolve) => setTimeout(resolve, 100))

      // Clone the element to avoid modifying the original
      const clone = contentRef.current.cloneNode(true) as HTMLElement
      clone.style.position = 'absolute'
      clone.style.left = '-9999px'
      clone.style.top = '0'
      clone.style.width = contentRef.current.offsetWidth + 'px'
      clone.style.backgroundColor = '#ffffff'
      document.body.appendChild(clone)

      // Convert oklch colors to rgb for html2canvas compatibility
      const convertOklchColors = (element: HTMLElement) => {
        const computedStyle = window.getComputedStyle(element)
        const propsToCheck = ['color', 'backgroundColor', 'borderColor', 'borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor']

        propsToCheck.forEach(prop => {
          const value = computedStyle.getPropertyValue(prop.replace(/([A-Z])/g, '-$1').toLowerCase())
          if (value && value.includes('oklch')) {
            // Create a temporary element to convert the color
            const temp = document.createElement('div')
            temp.style.color = value
            document.body.appendChild(temp)
            const rgb = window.getComputedStyle(temp).color
            document.body.removeChild(temp)

            if (prop === 'backgroundColor') {
              element.style.backgroundColor = rgb
            } else if (prop === 'color') {
              element.style.color = rgb
            } else if (prop.includes('border')) {
              element.style.setProperty(prop.replace(/([A-Z])/g, '-$1').toLowerCase(), rgb)
            }
          }
        })

        // Process children
        Array.from(element.children).forEach(child => {
          if (child instanceof HTMLElement) {
            convertOklchColors(child)
          }
        })
      }

      convertOklchColors(clone)

      // Capture the cloned content
      const canvas = await html2canvas(clone, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
      })

      // Remove the clone
      document.body.removeChild(clone)

      // Show modal again
      if (modalBackdrop) {
        modalBackdrop.style.display = 'flex'
      }

      // Calculate PDF dimensions (A4)
      const imgWidth = 210 // A4 width in mm
      const pageHeight = 297 // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width

      // Create PDF
      const pdf = new jsPDF('p', 'mm', 'a4')

      // Add title
      pdf.setFontSize(16)
      pdf.setFont('helvetica', 'bold')
      pdf.text(reportName, 14, 15)

      // Add date
      pdf.setFontSize(10)
      pdf.setFont('helvetica', 'normal')
      pdf.setTextColor(128, 128, 128)
      pdf.text(`Generated: ${new Date().toLocaleDateString()}`, 14, 22)

      // Reset text color
      pdf.setTextColor(0, 0, 0)

      // Add the canvas image
      const imgData = canvas.toDataURL('image/png')
      let heightLeft = imgHeight
      let position = 30 // Start after title

      // Add first page
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
      heightLeft -= pageHeight - position

      // Add additional pages if needed
      while (heightLeft > 0) {
        position = heightLeft - imgHeight
        pdf.addPage()
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
        heightLeft -= pageHeight
      }

      // Save the PDF
      const fileName = `${reportName.replace(/[^a-z0-9]/gi, '_')}.pdf`
      pdf.save(fileName)
    } catch (error) {
      console.error('Failed to export PDF:', error)
      // Show modal again in case of error
      const modalBackdrop = document.querySelector('.fixed.inset-0.z-50') as HTMLElement
      if (modalBackdrop) {
        modalBackdrop.style.display = 'flex'
      }
    } finally {
      setIsExportingPDF(false)
    }
  }

  const handleExcelExport = async () => {
    setIsExportingExcel(true)
    try {
      let csvContent = ''
      csvContent += `Report: ${report.name}\n`
      csvContent += `Generated: ${new Date().toLocaleString()}\n\n`
      csvContent += 'Report Name,Description,Created At\n'
      csvContent += `"${report.name}","${report.description || ''}","${report.created_at || ''}"\n`

      const blob = new Blob([csvContent], { type: 'application/vnd.ms-excel;charset=utf-8;' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `${report.name.replace(/[^a-z0-9]/gi, '_')}.csv`
      link.click()
      URL.revokeObjectURL(link.href)
    } catch (error) {
      console.error('Failed to export Excel:', error)
    } finally {
      setIsExportingExcel(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="p-5 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Share Report</h2>
          <p className="text-sm text-gray-500 mt-1">Share your report or export it</p>
        </div>

        <div className="p-5 space-y-5">
          {/* Share Link Section */}
          {report.is_public && shareUrl ? (
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Share link</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={shareUrl}
                  readOnly
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm"
                />
                <button
                  onClick={handleCopy}
                  className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 transition-colors"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
          ) : (
            <div>
              <p className="text-sm text-gray-600 mb-3">
                Generate a shareable link for this report.
              </p>
              <button
                onClick={onShare}
                disabled={isSharing}
                className="w-full px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium transition-colors"
              >
                {isSharing ? 'Generating...' : 'Generate Share Link'}
              </button>
            </div>
          )}

          {/* Share via WhatsApp */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">Share via</label>
            <button
              onClick={handleWhatsAppShare}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium"
            >
              <MessageCircle className="w-5 h-5" />
              WhatsApp
            </button>
          </div>

          {/* Export Options */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">Export as</label>
            <div className="flex gap-2">
              <button
                onClick={handlePDFExport}
                disabled={isExportingPDF}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50"
              >
                <FileText className="w-5 h-5 text-red-500" />
                {isExportingPDF ? 'Exporting...' : 'PDF'}
              </button>
              <button
                onClick={handleExcelExport}
                disabled={isExportingExcel}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50"
              >
                <FileSpreadsheet className="w-5 h-5 text-green-600" />
                {isExportingExcel ? 'Exporting...' : 'Excel'}
              </button>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
