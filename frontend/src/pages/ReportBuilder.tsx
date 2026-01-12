import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { domToPng } from 'modern-screenshot'
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
  MessageCircle,
  MoreHorizontal,
  Heading1,
  Clock,
  FileText as FileIcon,
  Layers,
  X,
  Download,
  Link,
  Search,
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
  const [isEditingTitle, setIsEditingTitle] = useState(false)
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
        setIsEditingTitle(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [hasUnsavedChanges])

  if (!isNewReport && isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <div className="w-12 h-12 border-3 border-purple-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-500 text-sm mt-4">Loading report...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen -m-4 lg:-m-6 bg-gray-50">
      {/* Modern Toolbar */}
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-gray-200/80">
        <div className="flex items-center justify-between h-16 px-4 lg:px-6">
          {/* Left side */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/reports')}
              className="p-2.5 hover:bg-gray-100 rounded-xl transition-colors group"
            >
              <ArrowLeft className="w-5 h-5 text-gray-500 group-hover:text-gray-700" />
            </button>

            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl">
                <FileIcon className="w-5 h-5 text-white" />
              </div>
              <div className="flex flex-col">
                {isEditingTitle ? (
                  <input
                    type="text"
                    value={reportName}
                    onChange={(e) => {
                      setReportName(e.target.value)
                      setHasUnsavedChanges(true)
                    }}
                    onBlur={() => setIsEditingTitle(false)}
                    onKeyDown={(e) => e.key === 'Enter' && setIsEditingTitle(false)}
                    className="text-lg font-semibold text-gray-900 bg-white border border-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500 px-2 py-0.5 rounded-lg -ml-2"
                    autoFocus
                  />
                ) : (
                  <button
                    onClick={() => setIsEditingTitle(true)}
                    className="text-lg font-semibold text-gray-900 hover:bg-gray-100 px-2 py-0.5 rounded-lg -ml-2 text-left transition-colors"
                  >
                    {reportName || 'Untitled Report'}
                  </button>
                )}
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Clock className="w-3 h-3" />
                  <span>{isNewReport ? 'New report' : 'Last edited just now'}</span>
                </div>
              </div>
            </div>

            {hasUnsavedChanges && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 border border-amber-200 text-amber-700 text-xs font-medium rounded-lg">
                <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
                Unsaved changes
              </div>
            )}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {/* Block count */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg text-sm text-gray-600">
              <Layers className="w-4 h-4" />
              {blocks.length} blocks
            </div>

            {/* Mode toggle */}
            <button
              onClick={() => setIsEditing(!isEditing)}
              className={clsx(
                'flex items-center gap-2 px-4 py-2 rounded-xl transition-all font-medium',
                isEditing
                  ? 'bg-purple-50 text-purple-700 hover:bg-purple-100'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
            >
              {isEditing ? (
                <>
                  <Eye className="w-4 h-4" />
                  <span className="hidden sm:inline">Preview</span>
                </>
              ) : (
                <>
                  <Edit3 className="w-4 h-4" />
                  <span className="hidden sm:inline">Edit</span>
                </>
              )}
            </button>

            {/* Share Button */}
            {!isNewReport && (
              <button
                onClick={() => setShowShareModal(true)}
                className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <Share2 className="w-4 h-4" />
                <span className="hidden sm:inline">Share</span>
              </button>
            )}

            {/* Save Button */}
            <button
              onClick={handleSave}
              disabled={isSaving || !hasUnsavedChanges}
              className={clsx(
                'flex items-center gap-2 px-4 py-2 font-medium rounded-xl transition-all',
                hasUnsavedChanges
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700 shadow-lg shadow-purple-500/25'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              )}
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span className="hidden sm:inline">Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span className="hidden sm:inline">Save</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Block toolbar */}
        {isEditing && (
          <div className="flex items-center justify-center gap-1 px-4 py-2 border-t border-gray-100 bg-gray-50/50">
            <button
              onClick={() => addBlock('text')}
              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:bg-white hover:shadow-sm rounded-xl transition-all border border-transparent hover:border-gray-200"
            >
              <Type className="w-4 h-4" />
              <span>Text</span>
            </button>
            <button
              onClick={() => {
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
                setBlocks([...blocks, headingBlock].map((b, i) => ({ ...b, order: i })))
                setHasUnsavedChanges(true)
                setSelectedBlockId(headingBlock.id)
              }}
              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:bg-white hover:shadow-sm rounded-xl transition-all border border-transparent hover:border-gray-200"
            >
              <Heading1 className="w-4 h-4" />
              <span>Heading</span>
            </button>

            <div className="w-px h-6 bg-gray-300 mx-2" />

            <button
              onClick={() => handleAddVisualizationBlock('visualization')}
              className="flex items-center gap-2 px-4 py-2 text-sm text-purple-600 hover:bg-purple-50 rounded-xl transition-all border border-transparent hover:border-purple-200"
            >
              <BarChart3 className="w-4 h-4" />
              <span>Chart</span>
            </button>
            <button
              onClick={() => handleAddVisualizationBlock('table')}
              className="flex items-center gap-2 px-4 py-2 text-sm text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all border border-transparent hover:border-emerald-200"
            >
              <Table className="w-4 h-4" />
              <span>Table</span>
            </button>

            <div className="w-px h-6 bg-gray-300 mx-2" />

            <button
              onClick={() => addBlock('divider')}
              className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:bg-white hover:shadow-sm rounded-xl transition-all border border-transparent hover:border-gray-200"
            >
              <Minus className="w-4 h-4" />
              <span>Divider</span>
            </button>
          </div>
        )}
      </div>

      {/* Report Canvas - Paper-like */}
      <div className="flex justify-center py-8 px-4">
        <div
          ref={reportContentRef}
          className={clsx(
            'w-full max-w-4xl bg-white rounded-2xl shadow-xl transition-all border border-gray-200',
            isEditing ? 'min-h-[800px]' : 'min-h-[600px]'
          )}
        >
          {/* Report Header */}
          <div className="px-8 lg:px-12 pt-8 lg:pt-10 pb-6 border-b border-gray-100">
            {isEditingTitle || isEditing ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={reportName}
                  onChange={(e) => {
                    setReportName(e.target.value)
                    setHasUnsavedChanges(true)
                  }}
                  className="text-2xl lg:text-3xl font-bold text-gray-900 bg-transparent border-none focus:outline-none focus:ring-0 w-full hover:bg-gray-50 px-2 py-1 -mx-2 rounded-lg transition-colors"
                  placeholder="Report Title"
                />
                <input
                  type="text"
                  value={reportDescription}
                  onChange={(e) => {
                    setReportDescription(e.target.value)
                    setHasUnsavedChanges(true)
                  }}
                  className="text-gray-500 bg-transparent border-none focus:outline-none focus:ring-0 w-full hover:bg-gray-50 px-2 py-1 -mx-2 rounded-lg transition-colors"
                  placeholder="Add a description..."
                />
              </div>
            ) : (
              <div>
                <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">{reportName}</h1>
                {reportDescription && (
                  <p className="text-gray-500 mt-2">{reportDescription}</p>
                )}
              </div>
            )}
          </div>

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
                <div className="space-y-3">
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
              <div className="mt-8 flex justify-center" data-pdf-hide="true">
                <button
                  onClick={() => setShowAddBlockMenu('bottom')}
                  className="flex items-center gap-2 px-5 py-3 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-xl transition-all border-2 border-dashed border-gray-200 hover:border-purple-300"
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
      <div className="w-20 h-20 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-2xl flex items-center justify-center mb-6">
        <FileText className="w-10 h-10 text-purple-600" />
      </div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">Start building your report</h3>
      <p className="text-gray-500 text-center mb-8 max-w-sm">
        Add text, charts, tables, and more to create a beautiful report.
      </p>
      <button
        onClick={onAddBlock}
        className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-medium rounded-xl hover:from-purple-700 hover:to-indigo-700 transition-all shadow-lg shadow-purple-500/25"
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
        isEditing && 'hover:bg-purple-50/50 rounded-xl transition-colors'
      )}
      onClick={onSelect}
    >
      {/* Drag handle and actions */}
      {isEditing && (
        <div
          className={clsx(
            'absolute -left-12 top-1/2 -translate-y-1/2 flex flex-col items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity',
            isSelected && 'opacity-100'
          )}
        >
          <button
            {...attributes}
            {...listeners}
            className="p-1.5 hover:bg-gray-200 rounded-lg cursor-grab active:cursor-grabbing"
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
              className="p-1.5 hover:bg-gray-200 rounded-lg"
            >
              <MoreHorizontal className="w-4 h-4 text-gray-400" />
            </button>
            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowMenu(false)}
                />
                <div className="absolute left-8 top-0 bg-white rounded-xl shadow-lg border border-gray-200 py-1 z-20 min-w-[150px]">
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
      <div className={clsx('py-2', isSelected && isEditing && 'ring-2 ring-purple-500 rounded-xl')}>
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
      <div className="fixed inset-0 z-40 bg-gray-900/20 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-5 pointer-events-auto w-96">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Add block</h3>
            <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg">
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={onAddText}
              className="flex items-center gap-3 p-4 rounded-xl border border-gray-200 hover:border-purple-500 hover:bg-purple-50 transition-all text-left group"
            >
              <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center group-hover:bg-purple-100">
                <Type className="w-6 h-6 text-gray-600 group-hover:text-purple-600" />
              </div>
              <div>
                <div className="font-medium text-gray-900">Text</div>
                <div className="text-xs text-gray-500">Paragraph</div>
              </div>
            </button>
            <button
              onClick={onAddHeading}
              className="flex items-center gap-3 p-4 rounded-xl border border-gray-200 hover:border-purple-500 hover:bg-purple-50 transition-all text-left group"
            >
              <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center group-hover:bg-purple-100">
                <Heading1 className="w-6 h-6 text-gray-600 group-hover:text-purple-600" />
              </div>
              <div>
                <div className="font-medium text-gray-900">Heading</div>
                <div className="text-xs text-gray-500">Section title</div>
              </div>
            </button>
            <button
              onClick={onAddChart}
              className="flex items-center gap-3 p-4 rounded-xl border border-gray-200 hover:border-purple-500 hover:bg-purple-50 transition-all text-left group"
            >
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <div className="font-medium text-gray-900">Chart</div>
                <div className="text-xs text-gray-500">Visualization</div>
              </div>
            </button>
            <button
              onClick={onAddTable}
              className="flex items-center gap-3 p-4 rounded-xl border border-gray-200 hover:border-emerald-500 hover:bg-emerald-50 transition-all text-left group"
            >
              <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                <Table className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <div className="font-medium text-gray-900">Table</div>
                <div className="text-xs text-gray-500">Data table</div>
              </div>
            </button>
            <button
              onClick={onAddDivider}
              className="flex items-center gap-3 p-4 rounded-xl border border-gray-200 hover:border-gray-400 hover:bg-gray-50 transition-all text-left col-span-2 group"
            >
              <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center group-hover:bg-gray-200">
                <Minus className="w-6 h-6 text-gray-600" />
              </div>
              <div>
                <div className="font-medium text-gray-900">Divider</div>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              Select {blockType === 'table' ? 'Data Table' : 'Visualization'}
            </h2>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Choose a saved visualization to add to your report
          </p>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search visualizations..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent focus:bg-white transition-all"
              autoFocus
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {filtered.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-600 font-medium">No visualizations found</p>
              <p className="text-sm text-gray-400 mt-1">Create one in the Query Builder first</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((v) => (
                <button
                  key={v.id}
                  onClick={() => onSelect(v)}
                  className="w-full text-left p-4 rounded-xl border border-gray-200 hover:border-purple-400 hover:bg-purple-50 transition-all group"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-purple-100">
                      {v.visualization_type === 'table' ? (
                        <Table className="w-6 h-6 text-gray-500 group-hover:text-purple-600" />
                      ) : (
                        <BarChart3 className="w-6 h-6 text-gray-500 group-hover:text-purple-600" />
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
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 rounded-xl transition-colors"
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
      // Hide modal during capture
      const modalBackdrop = document.querySelector('.fixed.inset-0.z-50') as HTMLElement
      if (modalBackdrop) {
        modalBackdrop.style.display = 'none'
      }

      // Hide elements marked with data-pdf-hide (like "Add block" button)
      const elementsToHide = contentRef.current.querySelectorAll('[data-pdf-hide="true"]') as NodeListOf<HTMLElement>
      elementsToHide.forEach(el => {
        el.style.display = 'none'
      })

      await new Promise((resolve) => setTimeout(resolve, 100))

      // Use modern-screenshot which properly handles oklch colors
      const dataUrl = await domToPng(contentRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        style: {
          // Ensure white background
          backgroundColor: '#ffffff',
        },
      })

      // Show modal again
      if (modalBackdrop) {
        modalBackdrop.style.display = 'flex'
      }

      // Restore hidden elements
      elementsToHide.forEach(el => {
        el.style.display = ''
      })

      // Create image to get dimensions
      const img = new Image()
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve()
        img.onerror = reject
        img.src = dataUrl
      })

      // Generate PDF
      const imgWidth = 210 // A4 width in mm
      const pageHeight = 297 // A4 height in mm
      const imgHeight = (img.height * imgWidth) / img.width

      const pdf = new jsPDF('p', 'mm', 'a4')

      // Add small header with report name and timestamp
      pdf.setFontSize(9)
      pdf.setFont('helvetica', 'normal')
      pdf.setTextColor(120, 120, 120)
      const now = new Date()
      const timestamp = `${now.toLocaleDateString()} ${now.toLocaleTimeString()}`
      pdf.text(`${reportName}  |  Generated: ${timestamp}`, 14, 10)

      // Add a subtle separator line
      pdf.setDrawColor(220, 220, 220)
      pdf.setLineWidth(0.3)
      pdf.line(14, 13, 196, 13)

      // Reset text color for content
      pdf.setTextColor(0, 0, 0)

      // Add image (starting closer to top since header is smaller)
      let heightLeft = imgHeight
      let position = 18

      pdf.addImage(dataUrl, 'PNG', 0, position, imgWidth, imgHeight)
      heightLeft -= pageHeight - position

      while (heightLeft > 0) {
        position = heightLeft - imgHeight
        pdf.addPage()
        pdf.addImage(dataUrl, 'PNG', 0, position, imgWidth, imgHeight)
        heightLeft -= pageHeight
      }

      // Save
      const fileName = `${reportName.replace(/[^a-z0-9]/gi, '_')}.pdf`
      pdf.save(fileName)
    } catch (error) {
      console.error('Failed to export PDF:', error)
      alert('Failed to export PDF: ' + (error instanceof Error ? error.message : 'Unknown error'))

      // Restore modal on error
      const modalBackdrop = document.querySelector('.fixed.inset-0.z-50') as HTMLElement
      if (modalBackdrop) {
        modalBackdrop.style.display = 'flex'
      }

      // Restore hidden elements on error
      if (contentRef.current) {
        const elementsToRestore = contentRef.current.querySelectorAll('[data-pdf-hide="true"]') as NodeListOf<HTMLElement>
        elementsToRestore.forEach(el => {
          el.style.display = ''
        })
      }
    } finally {
      setIsExportingPDF(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Share Report</h2>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>
          <p className="text-sm text-gray-500 mt-1">Share your report or export it</p>
        </div>

        <div className="p-6 space-y-6">
          {/* Share Link Section */}
          {report.is_public && shareUrl ? (
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Share link</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={shareUrl}
                  readOnly
                  className="flex-1 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm"
                />
                <button
                  onClick={handleCopy}
                  className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:from-purple-700 hover:to-indigo-700 flex items-center gap-2 transition-all shadow-lg shadow-purple-500/25"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Link className="w-4 h-4" />}
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
                className="w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 font-medium transition-all shadow-lg shadow-purple-500/25"
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
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-colors font-medium"
            >
              <MessageCircle className="w-5 h-5" />
              WhatsApp
            </button>
          </div>

          {/* Export Options */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">Export as</label>
            <button
              onClick={handlePDFExport}
              disabled={isExportingPDF}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gray-50 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-100 transition-colors font-medium disabled:opacity-50"
            >
              <Download className="w-5 h-5 text-red-500" />
              {isExportingPDF ? 'Exporting...' : 'Download PDF'}
            </button>
          </div>
        </div>

        <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 rounded-xl transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
