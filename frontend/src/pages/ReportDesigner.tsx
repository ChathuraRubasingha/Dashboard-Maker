import { useState, useRef, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { domToPng } from 'modern-screenshot'
import { jsPDF } from 'jspdf'
import { v4 as uuidv4 } from 'uuid'
import {
  Save,
  ArrowLeft,
  Share2,
  Eye,
  Edit3,
  Type,
  Image as ImageIcon,
  Table,
  Minus,
  Square,
  BarChart3,
  Trash2,
  Copy,
  Lock,
  Unlock,
  ChevronDown,
  ChevronRight,
  FileText,
  Download,
  Link,
  X,
  Check,
  MessageCircle,
  ZoomIn,
  ZoomOut,
  GripVertical,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Bold,
  Italic,
  Underline,
  RotateCcw,
} from 'lucide-react'
import clsx from 'clsx'
import { reportService } from '../services/reportService'
import { visualizationService } from '../services/visualizationService'
import VisualizationCard from '../components/VisualizationCard'
import type {
  Report,
  ReportElement,
  ReportElementType,
  ReportSectionType,
  ElementPosition,
  TextElementConfig,
  ImageElementConfig,
  LineElementConfig,
  ChartElementConfig,
  PageSettings,
  Visualization,
} from '../types'

// Constants
const MM_TO_PX = 3.78 // 1mm = 3.78px at 96dpi
const DEFAULT_PAGE_SETTINGS: PageSettings = {
  pageSize: 'A4',
  orientation: 'portrait',
  width: 210,
  height: 297,
  margins: { top: 20, right: 20, bottom: 20, left: 20 },
  headerHeight: 30,
  footerHeight: 20,
}

// Helper to create default element configs
const createDefaultElementConfig = (type: ReportElementType): any => {
  switch (type) {
    case 'text':
      return {
        content: 'Double-click to edit text',
        style: {
          fontSize: 14,
          fontFamily: 'Inter',
          fontWeight: 'normal',
          fontStyle: 'normal',
          textDecoration: 'none',
          textAlign: 'left',
          verticalAlign: 'top',
          color: '#000000',
          lineHeight: 1.4,
          letterSpacing: 0,
          padding: 4,
        },
      } as TextElementConfig
    case 'image':
      return {
        src: '',
        alt: '',
        objectFit: 'contain',
        style: {},
      } as ImageElementConfig
    case 'line':
      return {
        color: '#000000',
        thickness: 1,
        style: 'solid',
      } as LineElementConfig
    case 'chart':
      return {
        visualization_id: 0,
        showTitle: true,
        showLegend: true,
      } as ChartElementConfig
    case 'table':
      return {
        columns: [],
        showHeader: true,
        headerStyle: {
          fontSize: 12,
          fontFamily: 'Inter',
          fontWeight: 'bold',
          fontStyle: 'normal',
          textDecoration: 'none',
          textAlign: 'left',
          verticalAlign: 'middle',
          color: '#ffffff',
          lineHeight: 1.2,
          letterSpacing: 0,
          padding: 8,
          backgroundColor: '#4f46e5',
        },
        rowStyle: {
          fontSize: 12,
          fontFamily: 'Inter',
          fontWeight: 'normal',
          fontStyle: 'normal',
          textDecoration: 'none',
          textAlign: 'left',
          verticalAlign: 'middle',
          color: '#000000',
          lineHeight: 1.2,
          letterSpacing: 0,
          padding: 8,
        },
        borderColor: '#e5e7eb',
        borderWidth: 1,
      }
    case 'frame':
      return {
        style: {
          backgroundColor: 'transparent',
          borderWidth: 1,
          borderColor: '#e5e7eb',
          borderStyle: 'solid',
        },
        children: [],
      }
    default:
      return {}
  }
}

// Element default sizes
const DEFAULT_ELEMENT_SIZES: Record<ReportElementType, { width: number; height: number }> = {
  text: { width: 150, height: 30 },
  image: { width: 100, height: 80 },
  line: { width: 150, height: 2 },
  frame: { width: 200, height: 150 },
  table: { width: 300, height: 150 },
  chart: { width: 300, height: 200 },
}

export default function ReportDesigner() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const isNewReport = !id || id === 'new'
  const reportId = isNewReport ? undefined : parseInt(id, 10)

  // State
  const [reportName, setReportName] = useState('Untitled Report')
  const [reportDescription, setReportDescription] = useState('')
  const [elements, setElements] = useState<ReportElement[]>([])
  const [pageSettings, setPageSettings] = useState<PageSettings>(DEFAULT_PAGE_SETTINGS)
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [showShareModal, setShowShareModal] = useState(false)
  const [activeSection, setActiveSection] = useState<ReportSectionType>('content')
  const [expandedPanels, setExpandedPanels] = useState({ elements: true, layers: true, properties: true, charts: false, tables: false })
  const [draggedElementType, setDraggedElementType] = useState<ReportElementType | null>(null)
  const [draggedVisualizationId, setDraggedVisualizationId] = useState<number | null>(null)
  const [visualizationSearch, setVisualizationSearch] = useState('')
  const [pendingImageElementId, setPendingImageElementId] = useState<string | null>(null)
  const [pendingDropPosition, setPendingDropPosition] = useState<{ x: number; y: number } | null>(null)

  // Refs
  const canvasRef = useRef<HTMLDivElement>(null)
  const reportContentRef = useRef<HTMLDivElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)

  // Fetch existing report
  const { data: report, isLoading } = useQuery({
    queryKey: ['report', reportId],
    queryFn: () => reportService.get(reportId!),
    enabled: !!reportId,
  })

  // Fetch visualizations
  const { data: visualizations = [] } = useQuery({
    queryKey: ['visualizations'],
    queryFn: () => visualizationService.list(false),
  })

  // Load report data
  useEffect(() => {
    if (report) {
      setReportName(report.name)
      setReportDescription(report.description || '')
      if (report.elements && report.elements.length > 0) {
        setElements(report.elements)
      }
      if (report.settings) {
        setPageSettings({ ...DEFAULT_PAGE_SETTINGS, ...report.settings })
      }
    }
  }, [report])

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: any) => reportService.create(data),
    onSuccess: (newReport) => {
      queryClient.invalidateQueries({ queryKey: ['reports'] })
      navigate(`/reports/${newReport.id}`, { replace: true })
      setHasUnsavedChanges(false)
    },
  })

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (data: any) => reportService.update(reportId!, data),
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

  // Calculate page dimensions in pixels
  const pageWidth = pageSettings.width * MM_TO_PX * zoom
  const pageHeight = pageSettings.height * MM_TO_PX * zoom
  const contentAreaTop = (pageSettings.margins.top + pageSettings.headerHeight) * MM_TO_PX * zoom
  const contentAreaHeight = (pageSettings.height - pageSettings.margins.top - pageSettings.margins.bottom - pageSettings.headerHeight - pageSettings.footerHeight) * MM_TO_PX * zoom
  const footerTop = (pageSettings.height - pageSettings.margins.bottom - pageSettings.footerHeight) * MM_TO_PX * zoom

  // Get selected element
  const selectedElement = elements.find((e) => e.id === selectedElementId)

  // Handle save
  const handleSave = async () => {
    setIsSaving(true)
    try {
      const data = {
        name: reportName,
        description: reportDescription || undefined,
        elements,
        settings: pageSettings,
        blocks: [], // Keep empty for backward compatibility
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

  // Add element to canvas
  const addElement = (type: ReportElementType, position?: { x: number; y: number }, visualizationId?: number, imageSrc?: string) => {
    const defaultSize = DEFAULT_ELEMENT_SIZES[type]
    const newElement: ReportElement = {
      id: uuidv4(),
      type,
      name: `${type.charAt(0).toUpperCase() + type.slice(1)} ${elements.filter((e) => e.type === type).length + 1}`,
      section: activeSection,
      position: {
        x: position?.x ?? 20,
        y: position?.y ?? 20,
        width: defaultSize.width,
        height: defaultSize.height,
      },
      locked: false,
      visible: true,
      config: createDefaultElementConfig(type),
    }

    // Set visualization ID if provided
    if (visualizationId && (type === 'chart' || type === 'table')) {
      (newElement.config as any).visualization_id = visualizationId
    }

    // Set image source if provided
    if (imageSrc && type === 'image') {
      (newElement.config as ImageElementConfig).src = imageSrc
    }

    setElements([...elements, newElement])
    setSelectedElementId(newElement.id)
    setHasUnsavedChanges(true)

    return newElement.id
  }

  // Handle image file selection
  const handleImageFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) {
      // User cancelled - clear pending state
      setPendingDropPosition(null)
      setPendingImageElementId(null)
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be less than 5MB')
      setPendingDropPosition(null)
      setPendingImageElementId(null)
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      const imageSrc = event.target?.result as string

      if (pendingImageElementId) {
        // Update existing element
        const element = elements.find(el => el.id === pendingImageElementId)
        if (element) {
          updateElementConfig(pendingImageElementId, {
            ...element.config,
            src: imageSrc,
            alt: file.name,
          })
        }
        setPendingImageElementId(null)
      } else {
        // Create new element with image at the drop position or default position
        addElement('image', pendingDropPosition || undefined, undefined, imageSrc)
        setPendingDropPosition(null)
      }
    }
    reader.readAsDataURL(file)

    // Reset input
    if (imageInputRef.current) {
      imageInputRef.current.value = ''
    }
  }

  // Trigger image upload
  const triggerImageUpload = (existingElementId?: string) => {
    if (existingElementId) {
      setPendingImageElementId(existingElementId)
    } else {
      setPendingImageElementId(null)
    }
    imageInputRef.current?.click()
  }

  // Update element
  const updateElement = (elementId: string, updates: Partial<ReportElement>) => {
    setElements(elements.map((e) => (e.id === elementId ? { ...e, ...updates } : e)))
    setHasUnsavedChanges(true)
  }

  // Update element position
  const updateElementPosition = (elementId: string, position: Partial<ElementPosition>) => {
    setElements(
      elements.map((e) =>
        e.id === elementId ? { ...e, position: { ...e.position, ...position } } : e
      )
    )
    setHasUnsavedChanges(true)
  }

  // Update element config
  const updateElementConfig = (elementId: string, config: any) => {
    setElements(elements.map((e) => (e.id === elementId ? { ...e, config } : e)))
    setHasUnsavedChanges(true)
  }

  // Delete element
  const deleteElement = (elementId: string) => {
    setElements(elements.filter((e) => e.id !== elementId))
    if (selectedElementId === elementId) {
      setSelectedElementId(null)
    }
    setHasUnsavedChanges(true)
  }

  // Duplicate element
  const duplicateElement = (elementId: string) => {
    const element = elements.find((e) => e.id === elementId)
    if (element) {
      const newElement: ReportElement = {
        ...element,
        id: uuidv4(),
        name: `${element.name} (copy)`,
        position: {
          ...element.position,
          x: element.position.x + 20,
          y: element.position.y + 20,
        },
      }
      setElements([...elements, newElement])
      setSelectedElementId(newElement.id)
      setHasUnsavedChanges(true)
    }
  }

  // Handle drag start from palette
  const handlePaletteDragStart = (type: ReportElementType) => {
    setDraggedElementType(type)
    setDraggedVisualizationId(null)
  }

  // Handle drag start for visualization items
  const handleVisualizationDragStart = (type: 'chart' | 'table', visualizationId: number) => {
    setDraggedElementType(type)
    setDraggedVisualizationId(visualizationId)
  }

  // Handle drop on canvas
  const handleCanvasDrop = (e: React.DragEvent) => {
    e.preventDefault()
    if (!canvasRef.current) return

    const rect = canvasRef.current.getBoundingClientRect()
    const x = (e.clientX - rect.left) / zoom
    const y = (e.clientY - rect.top) / zoom

    // If dropping a visualization with ID (from the visualization panel)
    if (draggedVisualizationId && draggedElementType) {
      addElement(draggedElementType, { x, y }, draggedVisualizationId)
      setDraggedVisualizationId(null)
      setDraggedElementType(null)
      return
    }

    // If dropping a generic element type
    if (draggedElementType) {
      if (draggedElementType === 'chart') {
        // Expand charts panel instead of opening modal
        setExpandedPanels({ ...expandedPanels, charts: true, tables: false })
      } else if (draggedElementType === 'table') {
        // Expand tables panel instead of opening modal
        setExpandedPanels({ ...expandedPanels, tables: true, charts: false })
      } else if (draggedElementType === 'image') {
        // Store drop position and trigger file picker
        setPendingDropPosition({ x, y })
        triggerImageUpload()
      } else {
        addElement(draggedElementType, { x, y })
      }
      setDraggedElementType(null)
    }
  }

  // Filter visualizations based on search
  const filteredVisualizations = visualizations.filter((v) =>
    v.name.toLowerCase().includes(visualizationSearch.toLowerCase())
  )

  // Separate charts and tables
  const chartVisualizations = filteredVisualizations.filter(
    (v) => v.visualization_type !== 'table'
  )
  const tableVisualizations = filteredVisualizations.filter(
    (v) => v.visualization_type === 'table'
  )

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 's' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        if (hasUnsavedChanges) handleSave()
      }
      if (e.key === 'Delete' && selectedElementId) {
        deleteElement(selectedElementId)
      }
      if (e.key === 'Escape') {
        setSelectedElementId(null)
      }
      if (e.key === 'd' && (e.metaKey || e.ctrlKey) && selectedElementId) {
        e.preventDefault()
        duplicateElement(selectedElementId)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [hasUnsavedChanges, selectedElementId])

  if (!isNewReport && isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <div className="w-12 h-12 border-3 border-purple-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-500 text-sm mt-4">Loading report...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-gray-100 -m-4 lg:-m-6">
      {/* Top Toolbar */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200 shadow-sm z-20">
        <div className="flex items-center justify-between h-14 px-4">
          {/* Left section */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/reports')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-500" />
            </button>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg">
                <FileText className="w-4 h-4 text-white" />
              </div>
              <input
                type="text"
                value={reportName}
                onChange={(e) => {
                  setReportName(e.target.value)
                  setHasUnsavedChanges(true)
                }}
                className="text-lg font-semibold text-gray-900 bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-purple-500 rounded px-2 py-1 -ml-2"
                placeholder="Report Name"
              />
            </div>
            {hasUnsavedChanges && (
              <span className="px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 rounded">
                Unsaved
              </span>
            )}
          </div>

          {/* Center section - Zoom controls */}
          <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-2 py-1">
            <button
              onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}
              className="p-1 hover:bg-gray-200 rounded"
            >
              <ZoomOut className="w-4 h-4 text-gray-600" />
            </button>
            <span className="text-sm text-gray-600 w-12 text-center">{Math.round(zoom * 100)}%</span>
            <button
              onClick={() => setZoom(Math.min(2, zoom + 0.1))}
              className="p-1 hover:bg-gray-200 rounded"
            >
              <ZoomIn className="w-4 h-4 text-gray-600" />
            </button>
            <button
              onClick={() => setZoom(1)}
              className="p-1 hover:bg-gray-200 rounded ml-1"
              title="Reset zoom"
            >
              <RotateCcw className="w-4 h-4 text-gray-600" />
            </button>
          </div>

          {/* Right section */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsEditing(!isEditing)}
              className={clsx(
                'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                isEditing
                  ? 'bg-purple-100 text-purple-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
            >
              {isEditing ? <Eye className="w-4 h-4" /> : <Edit3 className="w-4 h-4" />}
              {isEditing ? 'Preview' : 'Edit'}
            </button>

            {!isNewReport && (
              <button
                onClick={() => setShowShareModal(true)}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                <Share2 className="w-4 h-4" />
                Share
              </button>
            )}

            <button
              onClick={handleSave}
              disabled={isSaving || !hasUnsavedChanges}
              className={clsx(
                'flex items-center gap-2 px-4 py-1.5 text-sm font-medium rounded-lg transition-all',
                hasUnsavedChanges
                  ? 'bg-purple-600 text-white hover:bg-purple-700'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              )}
            >
              {isSaving ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save
            </button>
          </div>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel - Elements Palette */}
        {isEditing && (
          <div className="w-64 bg-white border-r border-gray-200 flex flex-col overflow-hidden">
            {/* Elements Panel */}
            <div className="border-b border-gray-200">
              <button
                onClick={() => setExpandedPanels({ ...expandedPanels, elements: !expandedPanels.elements })}
                className="flex items-center justify-between w-full px-4 py-3 hover:bg-gray-50"
              >
                <span className="text-sm font-medium text-gray-700">Elements</span>
                {expandedPanels.elements ? (
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                )}
              </button>
              {expandedPanels.elements && (
                <div className="px-3 pb-3 grid grid-cols-3 gap-2">
                  <ElementPaletteItem
                    icon={<Type className="w-5 h-5" />}
                    label="Text"
                    onDragStart={() => handlePaletteDragStart('text')}
                    onClick={() => addElement('text')}
                  />
                  <ElementPaletteItem
                    icon={<ImageIcon className="w-5 h-5" />}
                    label="Image"
                    onDragStart={() => handlePaletteDragStart('image')}
                    onClick={() => triggerImageUpload()}
                  />
                  <ElementPaletteItem
                    icon={<Minus className="w-5 h-5" />}
                    label="Line"
                    onDragStart={() => handlePaletteDragStart('line')}
                    onClick={() => addElement('line')}
                  />
                  <ElementPaletteItem
                    icon={<Square className="w-5 h-5" />}
                    label="Frame"
                    onDragStart={() => handlePaletteDragStart('frame')}
                    onClick={() => addElement('frame')}
                  />
                  <ElementPaletteItem
                    icon={<Table className="w-5 h-5" />}
                    label="Table"
                    onDragStart={() => handlePaletteDragStart('table')}
                    onClick={() => setExpandedPanels({ ...expandedPanels, tables: !expandedPanels.tables, charts: false })}
                    isActive={expandedPanels.tables}
                  />
                  <ElementPaletteItem
                    icon={<BarChart3 className="w-5 h-5" />}
                    label="Chart"
                    onDragStart={() => handlePaletteDragStart('chart')}
                    onClick={() => setExpandedPanels({ ...expandedPanels, charts: !expandedPanels.charts, tables: false })}
                    isActive={expandedPanels.charts}
                  />
                </div>
              )}
            </div>

            {/* Charts Panel - Expandable */}
            {expandedPanels.charts && (
              <div className="border-b border-gray-200">
                <div className="px-3 py-2 bg-purple-50 border-b border-purple-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-purple-700">Charts</span>
                    <button
                      onClick={() => setExpandedPanels({ ...expandedPanels, charts: false })}
                      className="p-1 hover:bg-purple-100 rounded"
                    >
                      <X className="w-3.5 h-3.5 text-purple-500" />
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="Search charts..."
                    value={visualizationSearch}
                    onChange={(e) => setVisualizationSearch(e.target.value)}
                    className="w-full px-2 py-1.5 text-xs border border-purple-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500 bg-white"
                  />
                </div>
                <div className="max-h-64 overflow-y-auto p-2 space-y-1">
                  {chartVisualizations.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-4">
                      {visualizationSearch ? 'No charts found' : 'No charts available'}
                    </p>
                  ) : (
                    chartVisualizations.map((viz) => (
                      <VisualizationDragItem
                        key={viz.id}
                        visualization={viz}
                        type="chart"
                        onDragStart={() => handleVisualizationDragStart('chart', viz.id)}
                        onClick={() => addElement('chart', undefined, viz.id)}
                      />
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Tables Panel - Expandable */}
            {expandedPanels.tables && (
              <div className="border-b border-gray-200">
                <div className="px-3 py-2 bg-emerald-50 border-b border-emerald-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-emerald-700">Tables</span>
                    <button
                      onClick={() => setExpandedPanels({ ...expandedPanels, tables: false })}
                      className="p-1 hover:bg-emerald-100 rounded"
                    >
                      <X className="w-3.5 h-3.5 text-emerald-500" />
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="Search tables..."
                    value={visualizationSearch}
                    onChange={(e) => setVisualizationSearch(e.target.value)}
                    className="w-full px-2 py-1.5 text-xs border border-emerald-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 bg-white"
                  />
                </div>
                <div className="max-h-64 overflow-y-auto p-2 space-y-1">
                  {tableVisualizations.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-4">
                      {visualizationSearch ? 'No tables found' : 'No tables available. Any visualization can be used as a table.'}
                    </p>
                  ) : (
                    tableVisualizations.map((viz) => (
                      <VisualizationDragItem
                        key={viz.id}
                        visualization={viz}
                        type="table"
                        onDragStart={() => handleVisualizationDragStart('table', viz.id)}
                        onClick={() => addElement('table', undefined, viz.id)}
                      />
                    ))
                  )}
                  {/* Also show other visualizations that can be displayed as tables */}
                  {chartVisualizations.length > 0 && (
                    <>
                      <div className="text-xs text-gray-400 py-2 border-t border-gray-100 mt-2">
                        Other visualizations (as table)
                      </div>
                      {chartVisualizations.map((viz) => (
                        <VisualizationDragItem
                          key={viz.id}
                          visualization={viz}
                          type="table"
                          onDragStart={() => handleVisualizationDragStart('table', viz.id)}
                          onClick={() => addElement('table', undefined, viz.id)}
                        />
                      ))}
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Layers Panel */}
            <div className="flex-1 overflow-auto">
              <button
                onClick={() => setExpandedPanels({ ...expandedPanels, layers: !expandedPanels.layers })}
                className="flex items-center justify-between w-full px-4 py-3 hover:bg-gray-50 border-b border-gray-200"
              >
                <span className="text-sm font-medium text-gray-700">Layers</span>
                {expandedPanels.layers ? (
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                )}
              </button>
              {expandedPanels.layers && (
                <div className="p-2">
                  {/* Section tabs */}
                  <div className="flex gap-1 mb-2 p-1 bg-gray-100 rounded-lg">
                    {(['header', 'content', 'footer'] as ReportSectionType[]).map((section) => (
                      <button
                        key={section}
                        onClick={() => setActiveSection(section)}
                        className={clsx(
                          'flex-1 px-2 py-1 text-xs font-medium rounded transition-colors capitalize',
                          activeSection === section
                            ? 'bg-white text-purple-700 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                        )}
                      >
                        {section}
                      </button>
                    ))}
                  </div>

                  {/* Element list */}
                  <div className="space-y-1">
                    {elements
                      .filter((e) => e.section === activeSection)
                      .map((element) => (
                        <div
                          key={element.id}
                          onClick={() => setSelectedElementId(element.id)}
                          className={clsx(
                            'flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer text-sm',
                            selectedElementId === element.id
                              ? 'bg-purple-100 text-purple-700'
                              : 'hover:bg-gray-100 text-gray-600'
                          )}
                        >
                          <GripVertical className="w-3 h-3 text-gray-400" />
                          {element.type === 'text' && <Type className="w-3.5 h-3.5" />}
                          {element.type === 'image' && <ImageIcon className="w-3.5 h-3.5" />}
                          {element.type === 'line' && <Minus className="w-3.5 h-3.5" />}
                          {element.type === 'frame' && <Square className="w-3.5 h-3.5" />}
                          {element.type === 'table' && <Table className="w-3.5 h-3.5" />}
                          {element.type === 'chart' && <BarChart3 className="w-3.5 h-3.5" />}
                          <span className="truncate flex-1">{element.name}</span>
                          {element.locked && <Lock className="w-3 h-3 text-gray-400" />}
                        </div>
                      ))}
                    {elements.filter((e) => e.section === activeSection).length === 0 && (
                      <p className="text-xs text-gray-400 text-center py-4">
                        No elements in {activeSection}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Canvas Area */}
        <div className="flex-1 overflow-auto bg-gray-200 p-8">
          <div
            ref={canvasRef}
            className="relative mx-auto bg-white shadow-xl"
            style={{
              width: pageWidth,
              minHeight: pageHeight,
            }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleCanvasDrop}
            onClick={() => setSelectedElementId(null)}
          >
            {/* Page content ref for PDF export */}
            <div ref={reportContentRef} className="absolute inset-0">
              {/* Header Section */}
              <div
                className="absolute left-0 right-0 border-b border-dashed border-gray-300"
                style={{
                  top: pageSettings.margins.top * MM_TO_PX * zoom,
                  height: pageSettings.headerHeight * MM_TO_PX * zoom,
                  left: pageSettings.margins.left * MM_TO_PX * zoom,
                  right: pageSettings.margins.right * MM_TO_PX * zoom,
                  width: `calc(100% - ${(pageSettings.margins.left + pageSettings.margins.right) * MM_TO_PX * zoom}px)`,
                }}
              >
                {isEditing && (
                  <div className="absolute -top-5 left-0 text-xs text-gray-400">Header</div>
                )}
                {/* Render header elements */}
                {elements
                  .filter((e) => e.section === 'header' && e.visible)
                  .map((element) => (
                    <CanvasElement
                      key={element.id}
                      element={element}
                      isSelected={selectedElementId === element.id}
                      isEditing={isEditing}
                      zoom={zoom}
                      onSelect={() => setSelectedElementId(element.id)}
                      onUpdatePosition={(pos) => updateElementPosition(element.id, pos)}
                      onUpdateConfig={(config) => updateElementConfig(element.id, config)}
                      onDelete={() => deleteElement(element.id)}
                      onDuplicate={() => duplicateElement(element.id)}
                    />
                  ))}
              </div>

              {/* Content Section */}
              <div
                className="absolute left-0 right-0"
                style={{
                  top: contentAreaTop,
                  height: contentAreaHeight,
                  left: pageSettings.margins.left * MM_TO_PX * zoom,
                  right: pageSettings.margins.right * MM_TO_PX * zoom,
                  width: `calc(100% - ${(pageSettings.margins.left + pageSettings.margins.right) * MM_TO_PX * zoom}px)`,
                }}
              >
                {isEditing && (
                  <div className="absolute -top-5 left-0 text-xs text-gray-400">Content</div>
                )}
                {/* Render content elements */}
                {elements
                  .filter((e) => e.section === 'content' && e.visible)
                  .map((element) => (
                    <CanvasElement
                      key={element.id}
                      element={element}
                      isSelected={selectedElementId === element.id}
                      isEditing={isEditing}
                      zoom={zoom}
                      onSelect={() => setSelectedElementId(element.id)}
                      onUpdatePosition={(pos) => updateElementPosition(element.id, pos)}
                      onUpdateConfig={(config) => updateElementConfig(element.id, config)}
                      onDelete={() => deleteElement(element.id)}
                      onDuplicate={() => duplicateElement(element.id)}
                    />
                  ))}
              </div>

              {/* Footer Section */}
              <div
                className="absolute left-0 right-0 border-t border-dashed border-gray-300"
                style={{
                  top: footerTop,
                  height: pageSettings.footerHeight * MM_TO_PX * zoom,
                  left: pageSettings.margins.left * MM_TO_PX * zoom,
                  right: pageSettings.margins.right * MM_TO_PX * zoom,
                  width: `calc(100% - ${(pageSettings.margins.left + pageSettings.margins.right) * MM_TO_PX * zoom}px)`,
                }}
              >
                {isEditing && (
                  <div className="absolute -top-5 left-0 text-xs text-gray-400">Footer</div>
                )}
                {/* Render footer elements */}
                {elements
                  .filter((e) => e.section === 'footer' && e.visible)
                  .map((element) => (
                    <CanvasElement
                      key={element.id}
                      element={element}
                      isSelected={selectedElementId === element.id}
                      isEditing={isEditing}
                      zoom={zoom}
                      onSelect={() => setSelectedElementId(element.id)}
                      onUpdatePosition={(pos) => updateElementPosition(element.id, pos)}
                      onUpdateConfig={(config) => updateElementConfig(element.id, config)}
                      onDelete={() => deleteElement(element.id)}
                      onDuplicate={() => duplicateElement(element.id)}
                    />
                  ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel - Properties */}
        {isEditing && (
          <div className="w-72 bg-white border-l border-gray-200 overflow-auto">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-sm font-medium text-gray-700">Properties</h3>
            </div>

            {selectedElement ? (
              <ElementPropertiesPanel
                element={selectedElement}
                onUpdate={(updates) => updateElement(selectedElement.id, updates)}
                onUpdateConfig={(config) => updateElementConfig(selectedElement.id, config)}
                onDelete={() => deleteElement(selectedElement.id)}
                onDuplicate={() => duplicateElement(selectedElement.id)}
              />
            ) : (
              <PageSettingsPanel
                settings={pageSettings}
                onUpdate={(settings) => {
                  setPageSettings(settings)
                  setHasUnsavedChanges(true)
                }}
              />
            )}
          </div>
        )}
      </div>

      {/* Hidden file input for image upload */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageFileSelect}
        className="hidden"
      />

      {/* Share Modal */}
      {showShareModal && reportId && report && (
        <ShareModal
          report={report}
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

// Element Palette Item Component
function ElementPaletteItem({
  icon,
  label,
  onDragStart,
  onClick,
  isActive,
}: {
  icon: React.ReactNode
  label: string
  onDragStart: () => void
  onClick: () => void
  isActive?: boolean
}) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onClick={onClick}
      className={clsx(
        'flex flex-col items-center justify-center p-3 border rounded-lg cursor-pointer transition-colors',
        isActive
          ? 'bg-purple-100 border-purple-400 text-purple-700'
          : 'bg-gray-50 hover:bg-purple-50 border-gray-200 hover:border-purple-300'
      )}
    >
      <div className={isActive ? 'text-purple-600' : 'text-gray-500'}>{icon}</div>
      <span className={clsx('text-xs mt-1', isActive ? 'text-purple-700' : 'text-gray-600')}>{label}</span>
    </div>
  )
}

// Visualization Drag Item Component - for dragging charts/tables from the panel
function VisualizationDragItem({
  visualization,
  type,
  onDragStart,
  onClick,
}: {
  visualization: Visualization
  type: 'chart' | 'table'
  onDragStart: () => void
  onClick: () => void
}) {
  const getTypeIcon = () => {
    switch (visualization.visualization_type) {
      case 'bar':
        return <BarChart3 className="w-4 h-4" />
      case 'line':
        return <BarChart3 className="w-4 h-4" />
      case 'pie':
        return <BarChart3 className="w-4 h-4" />
      case 'table':
        return <Table className="w-4 h-4" />
      default:
        return type === 'chart' ? <BarChart3 className="w-4 h-4" /> : <Table className="w-4 h-4" />
    }
  }

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onClick={onClick}
      className={clsx(
        'flex items-center gap-2 px-2 py-2 rounded-lg cursor-grab border transition-all',
        type === 'chart'
          ? 'bg-white hover:bg-purple-50 border-gray-200 hover:border-purple-300'
          : 'bg-white hover:bg-emerald-50 border-gray-200 hover:border-emerald-300'
      )}
    >
      <div className={type === 'chart' ? 'text-purple-500' : 'text-emerald-500'}>
        {getTypeIcon()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium text-gray-700 truncate">{visualization.name}</div>
        {visualization.description && (
          <div className="text-[10px] text-gray-400 truncate">{visualization.description}</div>
        )}
      </div>
      <div className="text-[10px] text-gray-400 uppercase">{visualization.visualization_type}</div>
    </div>
  )
}

// Canvas Element Component
function CanvasElement({
  element,
  isSelected,
  isEditing,
  zoom,
  onSelect,
  onUpdatePosition,
  onUpdateConfig,
}: {
  element: ReportElement
  isSelected: boolean
  isEditing: boolean
  zoom: number
  onSelect: () => void
  onUpdatePosition: (position: Partial<ElementPosition>) => void
  onUpdateConfig: (config: any) => void
  onDelete?: () => void
  onDuplicate?: () => void
}) {
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [resizeHandle, setResizeHandle] = useState<string | null>(null)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [isEditingText, setIsEditingText] = useState(false)
  const textAreaRef = useRef<HTMLTextAreaElement>(null)

  // Handle drag
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isEditing || element.locked || isEditingText) return
    e.stopPropagation()
    setIsDragging(true)
    setDragStart({
      x: e.clientX - element.position.x * zoom,
      y: e.clientY - element.position.y * zoom,
    })
    onSelect()
  }

  // Handle resize
  const handleResizeStart = (e: React.MouseEvent, handle: string) => {
    if (!isEditing || element.locked) return
    e.stopPropagation()
    setIsResizing(true)
    setResizeHandle(handle)
    setDragStart({ x: e.clientX, y: e.clientY })
    onSelect()
  }

  // Mouse move handler
  useEffect(() => {
    if (!isDragging && !isResizing) return

    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const newX = (e.clientX - dragStart.x) / zoom
        const newY = (e.clientY - dragStart.y) / zoom
        onUpdatePosition({
          x: Math.max(0, newX),
          y: Math.max(0, newY),
        })
      }

      if (isResizing && resizeHandle) {
        const deltaX = (e.clientX - dragStart.x) / zoom
        const deltaY = (e.clientY - dragStart.y) / zoom

        let newWidth = element.position.width
        let newHeight = element.position.height
        let newX = element.position.x
        let newY = element.position.y

        if (resizeHandle.includes('e')) newWidth = Math.max(20, element.position.width + deltaX)
        if (resizeHandle.includes('w')) {
          newWidth = Math.max(20, element.position.width - deltaX)
          newX = element.position.x + deltaX
        }
        if (resizeHandle.includes('s')) newHeight = Math.max(10, element.position.height + deltaY)
        if (resizeHandle.includes('n')) {
          newHeight = Math.max(10, element.position.height - deltaY)
          newY = element.position.y + deltaY
        }

        setDragStart({ x: e.clientX, y: e.clientY })
        onUpdatePosition({
          x: Math.max(0, newX),
          y: Math.max(0, newY),
          width: newWidth,
          height: newHeight,
        })
      }
    }

    const handleMouseUp = () => {
      setIsDragging(false)
      setIsResizing(false)
      setResizeHandle(null)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, isResizing, dragStart, resizeHandle, element.position, zoom, onUpdatePosition])

  // Double click to edit text
  const handleDoubleClick = () => {
    if (element.type === 'text' && isEditing) {
      setIsEditingText(true)
      setTimeout(() => textAreaRef.current?.focus(), 0)
    }
  }

  const renderContent = () => {
    switch (element.type) {
      case 'text': {
        const config = element.config as TextElementConfig
        if (isEditingText) {
          return (
            <textarea
              ref={textAreaRef}
              value={config.content}
              onChange={(e) => onUpdateConfig({ ...config, content: e.target.value })}
              onBlur={() => setIsEditingText(false)}
              className="w-full h-full resize-none border-none outline-none bg-transparent"
              style={{
                fontSize: `${config.style.fontSize * zoom}px`,
                fontFamily: config.style.fontFamily,
                fontWeight: config.style.fontWeight,
                fontStyle: config.style.fontStyle,
                textAlign: config.style.textAlign,
                color: config.style.color,
                lineHeight: config.style.lineHeight,
                padding: `${config.style.padding * zoom}px`,
              }}
            />
          )
        }
        return (
          <div
            className="w-full h-full overflow-hidden"
            style={{
              fontSize: `${config.style.fontSize * zoom}px`,
              fontFamily: config.style.fontFamily,
              fontWeight: config.style.fontWeight,
              fontStyle: config.style.fontStyle,
              textDecoration: config.style.textDecoration,
              textAlign: config.style.textAlign,
              color: config.style.color,
              lineHeight: config.style.lineHeight,
              letterSpacing: `${config.style.letterSpacing}px`,
              padding: `${config.style.padding * zoom}px`,
              backgroundColor: config.style.backgroundColor,
            }}
          >
            {config.content || (isEditing ? 'Double-click to edit' : '')}
          </div>
        )
      }
      case 'image': {
        const config = element.config as ImageElementConfig
        if (!config.src) {
          return (
            <div className="w-full h-full flex items-center justify-center bg-gray-100 border-2 border-dashed border-gray-300">
              <ImageIcon className="w-8 h-8 text-gray-400" />
            </div>
          )
        }
        return (
          <img
            src={config.src}
            alt={config.alt}
            className="w-full h-full"
            style={{ objectFit: config.objectFit }}
          />
        )
      }
      case 'line': {
        const config = element.config as LineElementConfig
        return (
          <div
            className="w-full"
            style={{
              height: `${config.thickness * zoom}px`,
              backgroundColor: config.color,
              marginTop: `${(element.position.height * zoom - config.thickness * zoom) / 2}px`,
            }}
          />
        )
      }
      case 'frame': {
        const config = element.config as any
        return (
          <div
            className="w-full h-full"
            style={{
              backgroundColor: config.style?.backgroundColor || 'transparent',
              borderWidth: config.style?.borderWidth || 1,
              borderColor: config.style?.borderColor || '#e5e7eb',
              borderStyle: config.style?.borderStyle || 'solid',
              borderRadius: config.style?.borderRadius || 0,
            }}
          />
        )
      }
      case 'chart':
      case 'table': {
        const config = element.config as any
        if (!config.visualization_id) {
          return (
            <div className="w-full h-full flex items-center justify-center bg-gray-50 border border-gray-200 rounded">
              {element.type === 'chart' ? (
                <BarChart3 className="w-8 h-8 text-gray-400" />
              ) : (
                <Table className="w-8 h-8 text-gray-400" />
              )}
              <span className="text-sm text-gray-500 ml-2">Select visualization</span>
            </div>
          )
        }
        return (
          <div className="w-full h-full overflow-hidden">
            <VisualizationCard
              visualizationId={config.visualization_id}
              showTitle={config.showTitle ?? true}
              showDescription={false}
              height="100%"
              isEditing={false}
            />
          </div>
        )
      }
      default:
        return null
    }
  }

  const resizeHandles = ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw']

  return (
    <div
      className={clsx(
        'absolute',
        isSelected && isEditing && 'ring-2 ring-purple-500',
        isDragging && 'cursor-grabbing'
      )}
      style={{
        left: element.position.x * zoom,
        top: element.position.y * zoom,
        width: element.position.width * zoom,
        height: element.position.height * zoom,
      }}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
      onClick={(e) => {
        e.stopPropagation()
        onSelect()
      }}
    >
      {renderContent()}

      {/* Resize handles */}
      {isSelected && isEditing && !element.locked && (
        <>
          {resizeHandles.map((handle) => (
            <div
              key={handle}
              className="absolute w-2 h-2 bg-white border-2 border-purple-500 z-10"
              style={{
                ...getHandlePosition(handle),
                cursor: `${handle}-resize`,
              }}
              onMouseDown={(e) => handleResizeStart(e, handle)}
            />
          ))}
        </>
      )}
    </div>
  )
}

// Get resize handle position styles
function getHandlePosition(handle: string): React.CSSProperties {
  switch (handle) {
    case 'n':
      return { top: -4, left: '50%', transform: 'translateX(-50%)' }
    case 'ne':
      return { top: -4, right: -4 }
    case 'e':
      return { top: '50%', right: -4, transform: 'translateY(-50%)' }
    case 'se':
      return { bottom: -4, right: -4 }
    case 's':
      return { bottom: -4, left: '50%', transform: 'translateX(-50%)' }
    case 'sw':
      return { bottom: -4, left: -4 }
    case 'w':
      return { top: '50%', left: -4, transform: 'translateY(-50%)' }
    case 'nw':
      return { top: -4, left: -4 }
    default:
      return {}
  }
}

// Element Properties Panel
function ElementPropertiesPanel({
  element,
  onUpdate,
  onUpdateConfig,
  onDelete,
  onDuplicate,
}: {
  element: ReportElement
  onUpdate: (updates: Partial<ReportElement>) => void
  onUpdateConfig: (config: any) => void
  onDelete: () => void
  onDuplicate: () => void
}) {
  return (
    <div className="p-4 space-y-4">
      {/* Element info */}
      <div className="space-y-2">
        <label className="block text-xs text-gray-500">Name</label>
        <input
          type="text"
          value={element.name}
          onChange={(e) => onUpdate({ name: e.target.value })}
          className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
        />
      </div>

      {/* Position */}
      <div>
        <label className="block text-xs text-gray-500 mb-2">Position</label>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs text-gray-400">X</label>
            <input
              type="number"
              value={Math.round(element.position.x)}
              onChange={(e) => onUpdate({ position: { ...element.position, x: parseFloat(e.target.value) || 0 } })}
              className="w-full px-2 py-1 text-sm border border-gray-200 rounded"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400">Y</label>
            <input
              type="number"
              value={Math.round(element.position.y)}
              onChange={(e) => onUpdate({ position: { ...element.position, y: parseFloat(e.target.value) || 0 } })}
              className="w-full px-2 py-1 text-sm border border-gray-200 rounded"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400">Width</label>
            <input
              type="number"
              value={Math.round(element.position.width)}
              onChange={(e) => onUpdate({ position: { ...element.position, width: parseFloat(e.target.value) || 20 } })}
              className="w-full px-2 py-1 text-sm border border-gray-200 rounded"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400">Height</label>
            <input
              type="number"
              value={Math.round(element.position.height)}
              onChange={(e) => onUpdate({ position: { ...element.position, height: parseFloat(e.target.value) || 10 } })}
              className="w-full px-2 py-1 text-sm border border-gray-200 rounded"
            />
          </div>
        </div>
      </div>

      {/* Type-specific properties */}
      {element.type === 'text' && (
        <TextElementProperties
          config={element.config as TextElementConfig}
          onUpdate={onUpdateConfig}
        />
      )}

      {element.type === 'image' && (
        <ImageElementProperties
          config={element.config as ImageElementConfig}
          onUpdate={onUpdateConfig}
        />
      )}

      {element.type === 'line' && (
        <LineElementProperties
          config={element.config as LineElementConfig}
          onUpdate={onUpdateConfig}
        />
      )}

      {(element.type === 'chart' || element.type === 'table') && (
        <ChartTableElementProperties
          config={element.config as ChartElementConfig}
          elementType={element.type}
          onUpdate={onUpdateConfig}
        />
      )}

      {/* Actions */}
      <div className="pt-4 border-t border-gray-200 space-y-2">
        <div className="flex gap-2">
          <button
            onClick={() => onUpdate({ locked: !element.locked })}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            {element.locked ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
            {element.locked ? 'Unlock' : 'Lock'}
          </button>
          <button
            onClick={onDuplicate}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <Copy className="w-4 h-4" />
            Duplicate
          </button>
        </div>
        <button
          onClick={onDelete}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg"
        >
          <Trash2 className="w-4 h-4" />
          Delete
        </button>
      </div>
    </div>
  )
}

// Text Element Properties
function TextElementProperties({
  config,
  onUpdate,
}: {
  config: TextElementConfig
  onUpdate: (config: TextElementConfig) => void
}) {
  const updateStyle = (styleUpdates: Partial<typeof config.style>) => {
    onUpdate({ ...config, style: { ...config.style, ...styleUpdates } })
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs text-gray-500 mb-1">Font Family</label>
        <select
          value={config.style.fontFamily}
          onChange={(e) => updateStyle({ fontFamily: e.target.value })}
          className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg"
        >
          <option value="Inter">Inter</option>
          <option value="Arial">Arial</option>
          <option value="Helvetica">Helvetica</option>
          <option value="Georgia">Georgia</option>
          <option value="Times New Roman">Times New Roman</option>
          <option value="Courier New">Courier New</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Size</label>
          <input
            type="number"
            value={config.style.fontSize}
            onChange={(e) => updateStyle({ fontSize: parseInt(e.target.value) || 14 })}
            className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Color</label>
          <input
            type="color"
            value={config.style.color}
            onChange={(e) => updateStyle({ color: e.target.value })}
            className="w-full h-8 rounded border border-gray-200 cursor-pointer"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs text-gray-500 mb-1">Style</label>
        <div className="flex gap-1">
          <button
            onClick={() => updateStyle({ fontWeight: config.style.fontWeight === 'bold' ? 'normal' : 'bold' })}
            className={clsx(
              'p-2 rounded',
              config.style.fontWeight === 'bold' ? 'bg-purple-100 text-purple-700' : 'hover:bg-gray-100'
            )}
          >
            <Bold className="w-4 h-4" />
          </button>
          <button
            onClick={() => updateStyle({ fontStyle: config.style.fontStyle === 'italic' ? 'normal' : 'italic' })}
            className={clsx(
              'p-2 rounded',
              config.style.fontStyle === 'italic' ? 'bg-purple-100 text-purple-700' : 'hover:bg-gray-100'
            )}
          >
            <Italic className="w-4 h-4" />
          </button>
          <button
            onClick={() => updateStyle({ textDecoration: config.style.textDecoration === 'underline' ? 'none' : 'underline' })}
            className={clsx(
              'p-2 rounded',
              config.style.textDecoration === 'underline' ? 'bg-purple-100 text-purple-700' : 'hover:bg-gray-100'
            )}
          >
            <Underline className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div>
        <label className="block text-xs text-gray-500 mb-1">Alignment</label>
        <div className="flex gap-1">
          <button
            onClick={() => updateStyle({ textAlign: 'left' })}
            className={clsx(
              'p-2 rounded',
              config.style.textAlign === 'left' ? 'bg-purple-100 text-purple-700' : 'hover:bg-gray-100'
            )}
          >
            <AlignLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => updateStyle({ textAlign: 'center' })}
            className={clsx(
              'p-2 rounded',
              config.style.textAlign === 'center' ? 'bg-purple-100 text-purple-700' : 'hover:bg-gray-100'
            )}
          >
            <AlignCenter className="w-4 h-4" />
          </button>
          <button
            onClick={() => updateStyle({ textAlign: 'right' })}
            className={clsx(
              'p-2 rounded',
              config.style.textAlign === 'right' ? 'bg-purple-100 text-purple-700' : 'hover:bg-gray-100'
            )}
          >
            <AlignRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div>
        <label className="block text-xs text-gray-500 mb-1">Background</label>
        <input
          type="color"
          value={config.style.backgroundColor || '#ffffff'}
          onChange={(e) => updateStyle({ backgroundColor: e.target.value })}
          className="w-full h-8 rounded border border-gray-200 cursor-pointer"
        />
      </div>
    </div>
  )
}

// Image Element Properties
function ImageElementProperties({
  config,
  onUpdate,
}: {
  config: ImageElementConfig
  onUpdate: (config: ImageElementConfig) => void
}) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('Image must be less than 5MB')
        return
      }
      const reader = new FileReader()
      reader.onload = (event) => {
        onUpdate({ ...config, src: event.target?.result as string, alt: file.name })
      }
      reader.readAsDataURL(file)
    }
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs text-gray-500 mb-1">Image</label>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-full px-3 py-2 text-sm text-purple-600 bg-purple-50 hover:bg-purple-100 rounded-lg"
        >
          {config.src ? 'Replace Image' : 'Upload Image'}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      <div>
        <label className="block text-xs text-gray-500 mb-1">Fit</label>
        <select
          value={config.objectFit}
          onChange={(e) => onUpdate({ ...config, objectFit: e.target.value as any })}
          className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg"
        >
          <option value="contain">Contain</option>
          <option value="cover">Cover</option>
          <option value="fill">Fill</option>
          <option value="none">None</option>
        </select>
      </div>

      <div>
        <label className="block text-xs text-gray-500 mb-1">Alt Text</label>
        <input
          type="text"
          value={config.alt}
          onChange={(e) => onUpdate({ ...config, alt: e.target.value })}
          className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg"
          placeholder="Image description"
        />
      </div>
    </div>
  )
}

// Line Element Properties
function LineElementProperties({
  config,
  onUpdate,
}: {
  config: LineElementConfig
  onUpdate: (config: LineElementConfig) => void
}) {
  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs text-gray-500 mb-1">Color</label>
        <input
          type="color"
          value={config.color}
          onChange={(e) => onUpdate({ ...config, color: e.target.value })}
          className="w-full h-8 rounded border border-gray-200 cursor-pointer"
        />
      </div>

      <div>
        <label className="block text-xs text-gray-500 mb-1">Thickness</label>
        <input
          type="number"
          value={config.thickness}
          onChange={(e) => onUpdate({ ...config, thickness: parseInt(e.target.value) || 1 })}
          min={1}
          max={20}
          className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg"
        />
      </div>

      <div>
        <label className="block text-xs text-gray-500 mb-1">Style</label>
        <select
          value={config.style}
          onChange={(e) => onUpdate({ ...config, style: e.target.value as any })}
          className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg"
        >
          <option value="solid">Solid</option>
          <option value="dashed">Dashed</option>
          <option value="dotted">Dotted</option>
        </select>
      </div>
    </div>
  )
}

// Chart/Table Element Properties
function ChartTableElementProperties({
  config,
  elementType,
  onUpdate,
}: {
  config: ChartElementConfig
  elementType: 'chart' | 'table'
  onUpdate: (config: ChartElementConfig) => void
}) {
  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs text-gray-500 mb-1">Visualization ID</label>
        <input
          type="number"
          value={config.visualization_id || ''}
          onChange={(e) => onUpdate({ ...config, visualization_id: parseInt(e.target.value) || 0 })}
          className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg"
          placeholder="Enter visualization ID"
        />
      </div>

      <div className="flex items-center justify-between">
        <label className="text-xs text-gray-500">Show Title</label>
        <button
          onClick={() => onUpdate({ ...config, showTitle: !config.showTitle })}
          className={clsx(
            'w-10 h-5 rounded-full transition-colors relative',
            config.showTitle ? 'bg-purple-600' : 'bg-gray-300'
          )}
        >
          <div
            className={clsx(
              'w-4 h-4 bg-white rounded-full absolute top-0.5 transition-all',
              config.showTitle ? 'left-5' : 'left-0.5'
            )}
          />
        </button>
      </div>

      {elementType === 'chart' && (
        <div className="flex items-center justify-between">
          <label className="text-xs text-gray-500">Show Legend</label>
          <button
            onClick={() => onUpdate({ ...config, showLegend: !config.showLegend })}
            className={clsx(
              'w-10 h-5 rounded-full transition-colors relative',
              config.showLegend ? 'bg-purple-600' : 'bg-gray-300'
            )}
          >
            <div
              className={clsx(
                'w-4 h-4 bg-white rounded-full absolute top-0.5 transition-all',
                config.showLegend ? 'left-5' : 'left-0.5'
              )}
            />
          </button>
        </div>
      )}

      <p className="text-xs text-gray-400 mt-2">
        Tip: Create visualizations in the Query Builder first, then use their ID here.
      </p>
    </div>
  )
}

// Page Settings Panel
function PageSettingsPanel({
  settings,
  onUpdate,
}: {
  settings: PageSettings
  onUpdate: (settings: PageSettings) => void
}) {
  return (
    <div className="p-4 space-y-4">
      <div>
        <label className="block text-xs text-gray-500 mb-1">Page Size</label>
        <select
          value={settings.pageSize}
          onChange={(e) => {
            const size = e.target.value as 'A4' | 'Letter' | 'Legal'
            const dimensions = { A4: { width: 210, height: 297 }, Letter: { width: 216, height: 279 }, Legal: { width: 216, height: 356 } }[size]
            onUpdate({ ...settings, pageSize: size, ...dimensions })
          }}
          className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg"
        >
          <option value="A4">A4</option>
          <option value="Letter">Letter</option>
          <option value="Legal">Legal</option>
        </select>
      </div>

      <div>
        <label className="block text-xs text-gray-500 mb-1">Orientation</label>
        <div className="flex gap-2">
          <button
            onClick={() => onUpdate({ ...settings, orientation: 'portrait', width: Math.min(settings.width, settings.height), height: Math.max(settings.width, settings.height) })}
            className={clsx(
              'flex-1 px-3 py-2 text-sm rounded-lg border',
              settings.orientation === 'portrait'
                ? 'bg-purple-100 border-purple-300 text-purple-700'
                : 'border-gray-200 hover:bg-gray-50'
            )}
          >
            Portrait
          </button>
          <button
            onClick={() => onUpdate({ ...settings, orientation: 'landscape', width: Math.max(settings.width, settings.height), height: Math.min(settings.width, settings.height) })}
            className={clsx(
              'flex-1 px-3 py-2 text-sm rounded-lg border',
              settings.orientation === 'landscape'
                ? 'bg-purple-100 border-purple-300 text-purple-700'
                : 'border-gray-200 hover:bg-gray-50'
            )}
          >
            Landscape
          </button>
        </div>
      </div>

      <div>
        <label className="block text-xs text-gray-500 mb-2">Margins (mm)</label>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs text-gray-400">Top</label>
            <input
              type="number"
              value={settings.margins.top}
              onChange={(e) => onUpdate({ ...settings, margins: { ...settings.margins, top: parseInt(e.target.value) || 0 } })}
              className="w-full px-2 py-1 text-sm border border-gray-200 rounded"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400">Bottom</label>
            <input
              type="number"
              value={settings.margins.bottom}
              onChange={(e) => onUpdate({ ...settings, margins: { ...settings.margins, bottom: parseInt(e.target.value) || 0 } })}
              className="w-full px-2 py-1 text-sm border border-gray-200 rounded"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400">Left</label>
            <input
              type="number"
              value={settings.margins.left}
              onChange={(e) => onUpdate({ ...settings, margins: { ...settings.margins, left: parseInt(e.target.value) || 0 } })}
              className="w-full px-2 py-1 text-sm border border-gray-200 rounded"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400">Right</label>
            <input
              type="number"
              value={settings.margins.right}
              onChange={(e) => onUpdate({ ...settings, margins: { ...settings.margins, right: parseInt(e.target.value) || 0 } })}
              className="w-full px-2 py-1 text-sm border border-gray-200 rounded"
            />
          </div>
        </div>
      </div>

      <div>
        <label className="block text-xs text-gray-500 mb-2">Section Heights (mm)</label>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs text-gray-400">Header</label>
            <input
              type="number"
              value={settings.headerHeight}
              onChange={(e) => onUpdate({ ...settings, headerHeight: parseInt(e.target.value) || 0 })}
              className="w-full px-2 py-1 text-sm border border-gray-200 rounded"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400">Footer</label>
            <input
              type="number"
              value={settings.footerHeight}
              onChange={(e) => onUpdate({ ...settings, footerHeight: parseInt(e.target.value) || 0 })}
              className="w-full px-2 py-1 text-sm border border-gray-200 rounded"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

// Share Modal
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

  const handlePDFExport = async () => {
    if (!contentRef.current) return
    setIsExportingPDF(true)

    try {
      const dataUrl = await domToPng(contentRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
      })

      const img = new Image()
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve()
        img.onerror = reject
        img.src = dataUrl
      })

      const pdf = new jsPDF('p', 'mm', 'a4')
      const imgWidth = 210
      const imgHeight = (img.height * imgWidth) / img.width

      pdf.addImage(dataUrl, 'PNG', 0, 0, imgWidth, imgHeight)
      pdf.save(`${reportName.replace(/[^a-z0-9]/gi, '_')}.pdf`)
    } catch (error) {
      console.error('Failed to export PDF:', error)
      alert('Failed to export PDF')
    } finally {
      setIsExportingPDF(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Share Report</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {report.is_public && shareUrl ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Share link</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={shareUrl}
                  readOnly
                  className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm"
                />
                <button
                  onClick={handleCopy}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Link className="w-4 h-4" />}
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={onShare}
              disabled={isSharing}
              className="w-full px-4 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
            >
              {isSharing ? 'Generating...' : 'Generate Share Link'}
            </button>
          )}

          <button
            onClick={handlePDFExport}
            disabled={isExportingPDF}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            {isExportingPDF ? 'Exporting...' : 'Download PDF'}
          </button>

          <button
            onClick={() => {
              const message = `Check out this report: ${reportName}${shareUrl ? `\n${shareUrl}` : ''}`
              window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank')
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-green-500 text-white rounded-lg hover:bg-green-600"
          >
            <MessageCircle className="w-4 h-4" />
            Share via WhatsApp
          </button>
        </div>

        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 text-sm text-gray-600 hover:bg-gray-200 rounded-lg"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
