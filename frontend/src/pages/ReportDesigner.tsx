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
  EyeOff,
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
  ChevronUp,
  FileText,
  Download,
  Link,
  X,
  Check,
  MessageCircle,
  ZoomIn,
  ZoomOut,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Bold,
  Italic,
  Underline,
  RotateCcw,
  Grid3X3,
  Maximize,
  Search,
  Layers,
  PieChart,
  LineChart,
  TrendingUp,
  Move,
  Palette,
  Settings2,
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

  // New UI State
  const [activeLeftTab, setActiveLeftTab] = useState<'elements' | 'assets'>('elements')
  const [showGrid, setShowGrid] = useState(false)
  const [snapToGrid, setSnapToGrid] = useState(false)
  const [gridSize] = useState(20) // pixels
  const [assetSearch, setAssetSearch] = useState('')

  // Drag state
  const [draggedElementType, setDraggedElementType] = useState<ReportElementType | null>(null)
  const [draggedVisualizationId, setDraggedVisualizationId] = useState<number | null>(null)
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
      if (draggedElementType === 'chart' || draggedElementType === 'table') {
        // Switch to assets tab to select visualization
        setActiveLeftTab('assets')
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
    v.name.toLowerCase().includes(assetSearch.toLowerCase())
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
    <div className="flex flex-col h-screen bg-gray-100 -m-4 lg:-m-6 overflow-hidden">
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
              <span className="px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 rounded self-center ml-1">
                Unsaved
              </span>
            )}
          </div>

          {/* Center section - Zoom controls & Grid toggle */}
          <div className="flex items-center gap-3">
            {/* Zoom controls */}
            <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-2 py-1">
              <button
                onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}
                className="p-1 hover:bg-gray-200 rounded"
                title="Zoom out"
              >
                <ZoomOut className="w-4 h-4 text-gray-600" />
              </button>
              <span className="text-sm text-gray-600 w-12 text-center">{Math.round(zoom * 100)}%</span>
              <button
                onClick={() => setZoom(Math.min(2, zoom + 0.1))}
                className="p-1 hover:bg-gray-200 rounded"
                title="Zoom in"
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

            {/* Grid toggle */}
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg px-2 py-1">
              <button
                onClick={() => setShowGrid(!showGrid)}
                className={clsx(
                  'p-1.5 rounded transition-colors',
                  showGrid ? 'bg-purple-100 text-purple-600' : 'hover:bg-gray-200 text-gray-500'
                )}
                title={showGrid ? 'Hide grid' : 'Show grid'}
              >
                <Grid3X3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setSnapToGrid(!snapToGrid)}
                className={clsx(
                  'p-1.5 rounded transition-colors text-xs font-medium',
                  snapToGrid ? 'bg-purple-100 text-purple-600' : 'hover:bg-gray-200 text-gray-500'
                )}
                title={snapToGrid ? 'Disable snap to grid' : 'Enable snap to grid'}
              >
                Snap
              </button>
            </div>

            {/* Fit to view */}
            <button
              onClick={() => {
                // Calculate zoom to fit page in view
                const containerWidth = window.innerWidth - 72 - 288 - 288 - 64 // minus panels and padding
                const containerHeight = window.innerHeight - 56 - 64 // minus toolbar and padding
                const pageWidthMm = pageSettings.width * MM_TO_PX
                const pageHeightMm = pageSettings.height * MM_TO_PX
                const fitZoom = Math.min(
                  containerWidth / pageWidthMm,
                  containerHeight / pageHeightMm,
                  1
                )
                setZoom(Math.max(0.5, Math.min(fitZoom, 1)))
              }}
              className="p-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              title="Fit to view"
            >
              <Maximize className="w-4 h-4 text-gray-600" />
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
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left Panel - Tabbed Interface */}
        {isEditing && (
          <div className="w-72 bg-white border-r border-gray-200 flex flex-col flex-shrink-0">
            {/* Tab Headers */}
            <div className="flex border-b border-gray-200">
              <button
                onClick={() => setActiveLeftTab('elements')}
                className={clsx(
                  'flex-1 px-4 py-3 text-sm font-medium transition-colors relative',
                  activeLeftTab === 'elements'
                    ? 'text-purple-700 bg-purple-50'
                    : 'text-gray-600 hover:bg-gray-50'
                )}
              >
                <div className="flex items-center justify-center gap-2">
                  <Square className="w-4 h-4" />
                  Elements
                </div>
                {activeLeftTab === 'elements' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-600" />
                )}
              </button>
              <button
                onClick={() => setActiveLeftTab('assets')}
                className={clsx(
                  'flex-1 px-4 py-3 text-sm font-medium transition-colors relative',
                  activeLeftTab === 'assets'
                    ? 'text-purple-700 bg-purple-50'
                    : 'text-gray-600 hover:bg-gray-50'
                )}
              >
                <div className="flex items-center justify-center gap-2">
                  <BarChart3 className="w-4 h-4" />
                  Assets
                </div>
                {activeLeftTab === 'assets' && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-600" />
                )}
              </button>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-auto">
              {activeLeftTab === 'elements' ? (
                /* Elements Tab */
                <div className="p-4">
                  <div className="grid grid-cols-2 gap-3">
                    <ElementCard
                      icon={<Type className="w-6 h-6" />}
                      label="Text"
                      hint="Heading or paragraph"
                      onDragStart={() => handlePaletteDragStart('text')}
                      onClick={() => addElement('text')}
                    />
                    <ElementCard
                      icon={<ImageIcon className="w-6 h-6" />}
                      label="Image"
                      hint="Upload image"
                      onDragStart={() => handlePaletteDragStart('image')}
                      onClick={() => triggerImageUpload()}
                    />
                    <ElementCard
                      icon={<Minus className="w-6 h-6" />}
                      label="Line"
                      hint="Divider line"
                      onDragStart={() => handlePaletteDragStart('line')}
                      onClick={() => addElement('line')}
                    />
                    <ElementCard
                      icon={<Square className="w-6 h-6" />}
                      label="Frame"
                      hint="Container box"
                      onDragStart={() => handlePaletteDragStart('frame')}
                      onClick={() => addElement('frame')}
                    />
                  </div>

                  {/* Quick tip */}
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500">
                      <span className="font-medium text-gray-700">Tip:</span> Drag elements to canvas or click to add at default position
                    </p>
                  </div>
                </div>
              ) : (
                /* Assets Tab - Separated Charts & Tables */
                <div className="p-3">
                  {/* Search */}
                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search visualizations..."
                      value={assetSearch}
                      onChange={(e) => setAssetSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>

                  {filteredVisualizations.length === 0 ? (
                    <div className="text-center py-8">
                      <BarChart3 className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">
                        {assetSearch ? 'No visualizations found' : 'No visualizations available'}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        Create visualizations first to add them here
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Charts Section */}
                      <AssetSection
                        title="Charts"
                        icon={<BarChart3 className="w-4 h-4" />}
                        count={filteredVisualizations.filter(v => v.visualization_type !== 'table').length}
                        defaultExpanded={true}
                      >
                        {filteredVisualizations
                          .filter(v => v.visualization_type !== 'table')
                          .map((viz) => (
                            <AssetCard
                              key={viz.id}
                              visualization={viz}
                              onDragStart={() => handleVisualizationDragStart('chart', viz.id)}
                              onClickChart={() => addElement('chart', undefined, viz.id)}
                              onClickTable={() => addElement('table', undefined, viz.id)}
                            />
                          ))}
                      </AssetSection>

                      {/* Tables Section */}
                      <AssetSection
                        title="Tables"
                        icon={<Table className="w-4 h-4" />}
                        count={filteredVisualizations.filter(v => v.visualization_type === 'table').length}
                        defaultExpanded={true}
                      >
                        {filteredVisualizations
                          .filter(v => v.visualization_type === 'table')
                          .map((viz) => (
                            <AssetCard
                              key={viz.id}
                              visualization={viz}
                              onDragStart={() => handleVisualizationDragStart('table', viz.id)}
                              onClickChart={() => addElement('chart', undefined, viz.id)}
                              onClickTable={() => addElement('table', undefined, viz.id)}
                            />
                          ))}
                      </AssetSection>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Layers Panel - Collapsible */}
            <LayersPanel
              elements={elements}
              activeSection={activeSection}
              selectedElementId={selectedElementId}
              onSetActiveSection={setActiveSection}
              onSelectElement={setSelectedElementId}
              onToggleVisibility={(id) => {
                setElements(elements.map(el =>
                  el.id === id ? { ...el, visible: !el.visible } : el
                ))
                setHasUnsavedChanges(true)
              }}
              onToggleLock={(id) => {
                setElements(elements.map(el =>
                  el.id === id ? { ...el, locked: !el.locked } : el
                ))
                setHasUnsavedChanges(true)
              }}
              onMoveUp={(element, index) => {
                if (index > 0) {
                  const sectionElements = elements.filter(e => e.section === activeSection)
                  const otherElements = elements.filter(e => e.section !== activeSection)
                  const newSectionElements = [...sectionElements]
                  const sectionIndex = sectionElements.findIndex(e => e.id === element.id)
                  ;[newSectionElements[sectionIndex], newSectionElements[sectionIndex - 1]] =
                    [newSectionElements[sectionIndex - 1], newSectionElements[sectionIndex]]
                  setElements([...otherElements, ...newSectionElements])
                  setHasUnsavedChanges(true)
                }
              }}
              onMoveDown={(element) => {
                const sectionElements = elements.filter(e => e.section === activeSection)
                const sectionIndex = sectionElements.findIndex(e => e.id === element.id)
                if (sectionIndex < sectionElements.length - 1) {
                  const otherElements = elements.filter(e => e.section !== activeSection)
                  const newSectionElements = [...sectionElements]
                  ;[newSectionElements[sectionIndex], newSectionElements[sectionIndex + 1]] =
                    [newSectionElements[sectionIndex + 1], newSectionElements[sectionIndex]]
                  setElements([...otherElements, ...newSectionElements])
                  setHasUnsavedChanges(true)
                }
              }}
            />
          </div>
        )}

        {/* Canvas Area */}
        <div className="flex-1 min-h-0 overflow-auto bg-gray-200 p-4">
          <div
            ref={canvasRef}
            className="relative mx-auto bg-white shadow-xl"
            style={{
              width: pageWidth,
              minHeight: pageHeight,
              // Grid overlay
              backgroundImage: showGrid
                ? `linear-gradient(to right, #f0f0f0 1px, transparent 1px),
                   linear-gradient(to bottom, #f0f0f0 1px, transparent 1px)`
                : 'none',
              backgroundSize: `${gridSize * zoom}px ${gridSize * zoom}px`,
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
                      snapToGrid={snapToGrid}
                      gridSize={gridSize}
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
                      snapToGrid={snapToGrid}
                      gridSize={gridSize}
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
                      snapToGrid={snapToGrid}
                      gridSize={gridSize}
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
          <div className="w-72 bg-white border-l border-gray-200 overflow-y-auto flex-shrink-0">
            {selectedElement ? (
              <ElementPropertiesPanel
                element={selectedElement}
                onUpdate={(updates) => updateElement(selectedElement.id, updates)}
                onUpdateConfig={(config) => updateElementConfig(selectedElement.id, config)}
                onDelete={() => deleteElement(selectedElement.id)}
                onDuplicate={() => duplicateElement(selectedElement.id)}
              />
            ) : (
              <>
                <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-slate-50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-gray-500">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-gray-800">Page Settings</h3>
                      <div className="text-xs text-gray-500">Configure page layout</div>
                    </div>
                  </div>
                </div>
                <PageSettingsPanel
                  settings={pageSettings}
                  onUpdate={(settings) => {
                    setPageSettings(settings)
                    setHasUnsavedChanges(true)
                  }}
                />
              </>
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

// Element Card Component - larger, more descriptive cards for Elements tab
function ElementCard({
  icon,
  label,
  hint,
  onDragStart,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  hint: string
  onDragStart: () => void
  onClick: () => void
}) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onClick={onClick}
      className="flex flex-col items-center justify-center p-4 bg-white border border-gray-200 rounded-xl cursor-grab hover:border-purple-300 hover:bg-purple-50 hover:shadow-sm transition-all group"
    >
      <div className="text-gray-400 group-hover:text-purple-600 transition-colors mb-2">
        {icon}
      </div>
      <span className="text-sm font-medium text-gray-700 group-hover:text-purple-700">{label}</span>
      <span className="text-[10px] text-gray-400 mt-0.5">{hint}</span>
    </div>
  )
}

// Asset Section Component - Collapsible section for Charts/Tables
function AssetSection({
  title,
  icon,
  count,
  defaultExpanded = true,
  children,
}: {
  title: string
  icon: React.ReactNode
  count: number
  defaultExpanded?: boolean
  children: React.ReactNode
}) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  if (count === 0) {
    return null // Don't show section if no items
  }

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      {/* Section Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-purple-600">{icon}</span>
          <span className="text-sm font-medium text-gray-700">{title}</span>
          <span className="px-1.5 py-0.5 text-xs font-medium bg-gray-200 text-gray-600 rounded">
            {count}
          </span>
        </div>
        <ChevronDown
          className={clsx(
            'w-4 h-4 text-gray-400 transition-transform',
            isExpanded && 'rotate-180'
          )}
        />
      </button>

      {/* Section Content */}
      {isExpanded && (
        <div className="p-2 space-y-2 bg-white">
          {children}
        </div>
      )}
    </div>
  )
}

// Asset Card Component - for visualizations in Assets tab
function AssetCard({
  visualization,
  onDragStart,
  onClickChart,
  onClickTable,
}: {
  visualization: Visualization
  onDragStart: () => void
  onClickChart: () => void
  onClickTable: () => void
}) {
  const getTypeIcon = () => {
    switch (visualization.visualization_type) {
      case 'bar':
        return <BarChart3 className="w-5 h-5" />
      case 'line':
        return <LineChart className="w-5 h-5" />
      case 'pie':
        return <PieChart className="w-5 h-5" />
      case 'area':
        return <TrendingUp className="w-5 h-5" />
      case 'table':
        return <Table className="w-5 h-5" />
      default:
        return <BarChart3 className="w-5 h-5" />
    }
  }

  const getTypeColor = () => {
    switch (visualization.visualization_type) {
      case 'bar':
        return 'bg-purple-100 text-purple-600'
      case 'line':
        return 'bg-blue-100 text-blue-600'
      case 'pie':
        return 'bg-orange-100 text-orange-600'
      case 'area':
        return 'bg-green-100 text-green-600'
      case 'table':
        return 'bg-emerald-100 text-emerald-600'
      default:
        return 'bg-gray-100 text-gray-600'
    }
  }

  return (
    <div
      draggable
      onDragStart={onDragStart}
      className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:border-purple-300 hover:shadow-sm transition-all cursor-grab"
    >
      {/* Card Header */}
      <div className="p-3 flex items-start gap-3">
        <div className={clsx('w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0', getTypeColor())}>
          {getTypeIcon()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-gray-800 truncate">{visualization.name}</div>
          {visualization.description && (
            <div className="text-xs text-gray-400 truncate mt-0.5">{visualization.description}</div>
          )}
          <div className="text-[10px] text-gray-400 mt-1 uppercase tracking-wide">
            {visualization.visualization_type}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex border-t border-gray-100">
        <button
          onClick={(e) => {
            e.stopPropagation()
            onClickChart()
          }}
          className="flex-1 px-3 py-2 text-xs font-medium text-purple-600 hover:bg-purple-50 transition-colors flex items-center justify-center gap-1"
        >
          <BarChart3 className="w-3.5 h-3.5" />
          As Chart
        </button>
        <div className="w-px bg-gray-100" />
        <button
          onClick={(e) => {
            e.stopPropagation()
            onClickTable()
          }}
          className="flex-1 px-3 py-2 text-xs font-medium text-emerald-600 hover:bg-emerald-50 transition-colors flex items-center justify-center gap-1"
        >
          <Table className="w-3.5 h-3.5" />
          As Table
        </button>
      </div>
    </div>
  )
}

// Layers Panel Component - Collapsible with clear section labels
function LayersPanel({
  elements,
  activeSection,
  selectedElementId,
  onSetActiveSection,
  onSelectElement,
  onToggleVisibility,
  onToggleLock,
  onMoveUp,
  onMoveDown,
}: {
  elements: ReportElement[]
  activeSection: ReportSectionType
  selectedElementId: string | null
  onSetActiveSection: (section: ReportSectionType) => void
  onSelectElement: (id: string) => void
  onToggleVisibility: (id: string) => void
  onToggleLock: (id: string) => void
  onMoveUp: (element: ReportElement, index: number) => void
  onMoveDown: (element: ReportElement) => void
}) {
  const [isExpanded, setIsExpanded] = useState(true)

  const sectionLabels: Record<ReportSectionType, string> = {
    header: 'Header',
    content: 'Content',
    footer: 'Footer',
  }

  const sectionElements = elements.filter((e) => e.section === activeSection)

  return (
    <div className="border-t-2 border-purple-200 bg-white">
      {/* Header - Always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-purple-600" />
          <span className="text-sm font-semibold text-gray-800">Layers</span>
          <span className="px-1.5 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 rounded">
            {elements.length}
          </span>
        </div>
        <ChevronDown
          className={clsx(
            'w-4 h-4 text-gray-400 transition-transform',
            isExpanded && 'rotate-180'
          )}
        />
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-gray-100">
          {/* Section Tabs - Full words */}
          <div className="px-3 py-2 bg-gray-50 border-b border-gray-100">
            <div className="flex gap-1">
              {(['header', 'content', 'footer'] as ReportSectionType[]).map((section) => {
                const count = elements.filter(e => e.section === section).length
                return (
                  <button
                    key={section}
                    onClick={() => onSetActiveSection(section)}
                    className={clsx(
                      'flex-1 px-2 py-1.5 text-xs font-medium rounded-lg transition-all',
                      activeSection === section
                        ? 'bg-purple-600 text-white shadow-sm'
                        : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                    )}
                  >
                    {sectionLabels[section]}
                    {count > 0 && (
                      <span className={clsx(
                        'ml-1 px-1 py-0.5 text-[10px] rounded',
                        activeSection === section
                          ? 'bg-purple-500 text-white'
                          : 'bg-gray-100 text-gray-500'
                      )}>
                        {count}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Layer List */}
          <div className="max-h-52 overflow-y-auto">
            {sectionElements.length === 0 ? (
              <div className="py-6 text-center">
                <Layers className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-xs text-gray-400">
                  No elements in {sectionLabels[activeSection]}
                </p>
                <p className="text-[10px] text-gray-300 mt-1">
                  Drag elements from the left panel
                </p>
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {sectionElements.map((element, index) => (
                  <LayerItem
                    key={element.id}
                    element={element}
                    isSelected={selectedElementId === element.id}
                    onSelect={() => onSelectElement(element.id)}
                    onToggleVisibility={() => onToggleVisibility(element.id)}
                    onToggleLock={() => onToggleLock(element.id)}
                    onMoveUp={() => onMoveUp(element, index)}
                    onMoveDown={() => onMoveDown(element)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// Layer Item Component - for layers panel
function LayerItem({
  element,
  isSelected,
  onSelect,
  onToggleVisibility,
  onToggleLock,
  onMoveUp,
  onMoveDown,
}: {
  element: ReportElement
  isSelected: boolean
  onSelect: () => void
  onToggleVisibility: () => void
  onToggleLock: () => void
  onMoveUp: () => void
  onMoveDown: () => void
}) {
  const getIcon = () => {
    switch (element.type) {
      case 'text':
        return <Type className="w-3.5 h-3.5" />
      case 'image':
        return <ImageIcon className="w-3.5 h-3.5" />
      case 'line':
        return <Minus className="w-3.5 h-3.5" />
      case 'frame':
        return <Square className="w-3.5 h-3.5" />
      case 'table':
        return <Table className="w-3.5 h-3.5" />
      case 'chart':
        return <BarChart3 className="w-3.5 h-3.5" />
      default:
        return <Square className="w-3.5 h-3.5" />
    }
  }

  return (
    <div
      onClick={onSelect}
      className={clsx(
        'group flex items-center gap-1.5 px-2 py-1.5 rounded-lg cursor-pointer transition-all',
        isSelected
          ? 'bg-purple-100 text-purple-700 ring-1 ring-purple-300'
          : 'hover:bg-white text-gray-600 hover:shadow-sm'
      )}
    >
      {/* Visibility Toggle */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          onToggleVisibility()
        }}
        className={clsx(
          'p-0.5 rounded transition-colors',
          element.visible
            ? 'text-gray-400 hover:text-gray-600'
            : 'text-gray-300 hover:text-gray-500'
        )}
        title={element.visible ? 'Hide' : 'Show'}
      >
        {element.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
      </button>

      {/* Lock Toggle */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          onToggleLock()
        }}
        className={clsx(
          'p-0.5 rounded transition-colors',
          element.locked
            ? 'text-amber-500 hover:text-amber-600'
            : 'text-gray-300 hover:text-gray-500'
        )}
        title={element.locked ? 'Unlock' : 'Lock'}
      >
        {element.locked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
      </button>

      {/* Icon */}
      <div className={isSelected ? 'text-purple-600' : 'text-gray-400'}>
        {getIcon()}
      </div>

      {/* Name */}
      <span className="flex-1 text-xs font-medium truncate">{element.name}</span>

      {/* Move buttons - show on hover */}
      <div className="hidden group-hover:flex items-center gap-0.5">
        <button
          onClick={(e) => {
            e.stopPropagation()
            onMoveUp()
          }}
          className="p-0.5 text-gray-400 hover:text-gray-600 rounded"
          title="Move up (bring forward)"
        >
          <ChevronUp className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onMoveDown()
          }}
          className="p-0.5 text-gray-400 hover:text-gray-600 rounded"
          title="Move down (send back)"
        >
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

// Collapsible Section Component for Right Panel
function CollapsibleSection({
  title,
  icon,
  children,
  defaultOpen = true,
}: {
  title: string
  icon?: React.ReactNode
  children: React.ReactNode
  defaultOpen?: boolean
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className="border-b border-gray-100">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          {icon && <span className="text-gray-400">{icon}</span>}
          <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">{title}</span>
        </div>
        <ChevronDown
          className={clsx(
            'w-4 h-4 text-gray-400 transition-transform',
            isOpen && 'rotate-180'
          )}
        />
      </button>
      {isOpen && <div className="px-4 pb-4">{children}</div>}
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
  snapToGrid,
  gridSize,
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
  snapToGrid?: boolean
  gridSize?: number
}) {
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [resizeHandle, setResizeHandle] = useState<string | null>(null)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [isEditingText, setIsEditingText] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const textAreaRef = useRef<HTMLTextAreaElement>(null)

  // Snap to grid helper
  const snap = (value: number) => {
    if (!snapToGrid || !gridSize) return value
    return Math.round(value / gridSize) * gridSize
  }

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
          x: Math.max(0, snap(newX)),
          y: Math.max(0, snap(newY)),
        })
      }

      if (isResizing && resizeHandle) {
        const deltaX = (e.clientX - dragStart.x) / zoom
        const deltaY = (e.clientY - dragStart.y) / zoom

        let newWidth = element.position.width
        let newHeight = element.position.height
        let newX = element.position.x
        let newY = element.position.y

        if (resizeHandle.includes('e')) newWidth = Math.max(20, snap(element.position.width + deltaX))
        if (resizeHandle.includes('w')) {
          newWidth = Math.max(20, snap(element.position.width - deltaX))
          newX = snap(element.position.x + deltaX)
        }
        if (resizeHandle.includes('s')) newHeight = Math.max(10, snap(element.position.height + deltaY))
        if (resizeHandle.includes('n')) {
          newHeight = Math.max(10, snap(element.position.height - deltaY))
          newY = snap(element.position.y + deltaY)
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
        'absolute transition-shadow',
        isSelected && isEditing && 'ring-2 ring-purple-500',
        !isSelected && isHovered && isEditing && 'ring-2 ring-purple-300 ring-opacity-50',
        isDragging && 'cursor-grabbing',
        !isDragging && isEditing && !element.locked && 'cursor-grab'
      )}
      style={{
        left: element.position.x * zoom,
        top: element.position.y * zoom,
        width: element.position.width * zoom,
        height: element.position.height * zoom,
      }}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
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
              className="absolute w-3 h-3 bg-white border-2 border-purple-500 rounded-sm z-10 hover:bg-purple-100 hover:scale-110 transition-transform"
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
  const offset = -6 // Half of handle size (12px / 2)
  switch (handle) {
    case 'n':
      return { top: offset, left: '50%', transform: 'translateX(-50%)' }
    case 'ne':
      return { top: offset, right: offset }
    case 'e':
      return { top: '50%', right: offset, transform: 'translateY(-50%)' }
    case 'se':
      return { bottom: offset, right: offset }
    case 's':
      return { bottom: offset, left: '50%', transform: 'translateX(-50%)' }
    case 'sw':
      return { bottom: offset, left: offset }
    case 'w':
      return { top: '50%', left: offset, transform: 'translateY(-50%)' }
    case 'nw':
      return { top: offset, left: offset }
    default:
      return {}
  }
}

// Element Properties Panel with Collapsible Sections
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
  // Get element type icon
  const getElementIcon = () => {
    switch (element.type) {
      case 'text':
        return <Type className="w-4 h-4" />
      case 'image':
        return <ImageIcon className="w-4 h-4" />
      case 'line':
        return <Minus className="w-4 h-4" />
      case 'frame':
        return <Square className="w-4 h-4" />
      case 'table':
        return <Table className="w-4 h-4" />
      case 'chart':
        return <BarChart3 className="w-4 h-4" />
      default:
        return <Square className="w-4 h-4" />
    }
  }

  return (
    <div className="divide-y divide-gray-100">
      {/* Element Header */}
      <div className="p-4 bg-gradient-to-r from-purple-50 to-indigo-50">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-purple-600">
            {getElementIcon()}
          </div>
          <div className="flex-1">
            <input
              type="text"
              value={element.name}
              onChange={(e) => onUpdate({ name: e.target.value })}
              className="w-full text-sm font-semibold text-gray-800 bg-transparent border-none focus:outline-none focus:ring-0 p-0"
              placeholder="Element name"
            />
            <div className="text-xs text-gray-500 capitalize">{element.type} Element</div>
          </div>
        </div>
        {/* Quick Actions */}
        <div className="flex gap-1">
          <button
            onClick={() => onUpdate({ locked: !element.locked })}
            className={clsx(
              'p-1.5 rounded-lg text-xs transition-colors',
              element.locked
                ? 'bg-amber-100 text-amber-600'
                : 'bg-white text-gray-500 hover:bg-gray-100'
            )}
            title={element.locked ? 'Unlock' : 'Lock'}
          >
            {element.locked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={() => onUpdate({ visible: !element.visible })}
            className={clsx(
              'p-1.5 rounded-lg text-xs transition-colors',
              !element.visible
                ? 'bg-gray-200 text-gray-500'
                : 'bg-white text-gray-500 hover:bg-gray-100'
            )}
            title={element.visible ? 'Hide' : 'Show'}
          >
            {element.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={onDuplicate}
            className="p-1.5 rounded-lg bg-white text-gray-500 hover:bg-gray-100 transition-colors"
            title="Duplicate"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 rounded-lg bg-white text-red-500 hover:bg-red-50 transition-colors ml-auto"
            title="Delete"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Transform Section */}
      <CollapsibleSection title="Transform" icon={<Move className="w-3.5 h-3.5" />}>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[10px] text-gray-400 mb-1 uppercase">X</label>
            <input
              type="number"
              value={Math.round(element.position.x)}
              onChange={(e) => onUpdate({ position: { ...element.position, x: parseFloat(e.target.value) || 0 } })}
              className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div>
            <label className="block text-[10px] text-gray-400 mb-1 uppercase">Y</label>
            <input
              type="number"
              value={Math.round(element.position.y)}
              onChange={(e) => onUpdate({ position: { ...element.position, y: parseFloat(e.target.value) || 0 } })}
              className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div>
            <label className="block text-[10px] text-gray-400 mb-1 uppercase">Width</label>
            <input
              type="number"
              value={Math.round(element.position.width)}
              onChange={(e) => onUpdate({ position: { ...element.position, width: parseFloat(e.target.value) || 20 } })}
              className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div>
            <label className="block text-[10px] text-gray-400 mb-1 uppercase">Height</label>
            <input
              type="number"
              value={Math.round(element.position.height)}
              onChange={(e) => onUpdate({ position: { ...element.position, height: parseFloat(e.target.value) || 10 } })}
              className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>
      </CollapsibleSection>

      {/* Type-specific Style Section */}
      {element.type === 'text' && (
        <CollapsibleSection title="Style" icon={<Palette className="w-3.5 h-3.5" />}>
          <TextElementProperties
            config={element.config as TextElementConfig}
            onUpdate={onUpdateConfig}
          />
        </CollapsibleSection>
      )}

      {element.type === 'image' && (
        <CollapsibleSection title="Settings" icon={<Settings2 className="w-3.5 h-3.5" />}>
          <ImageElementProperties
            config={element.config as ImageElementConfig}
            onUpdate={onUpdateConfig}
          />
        </CollapsibleSection>
      )}

      {element.type === 'line' && (
        <CollapsibleSection title="Style" icon={<Palette className="w-3.5 h-3.5" />}>
          <LineElementProperties
            config={element.config as LineElementConfig}
            onUpdate={onUpdateConfig}
          />
        </CollapsibleSection>
      )}

      {(element.type === 'chart' || element.type === 'table') && (
        <CollapsibleSection title="Data" icon={<BarChart3 className="w-3.5 h-3.5" />}>
          <ChartTableElementProperties
            config={element.config as ChartElementConfig}
            elementType={element.type}
            onUpdate={onUpdateConfig}
          />
        </CollapsibleSection>
      )}
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

// Page Settings Panel with Collapsible Sections
function PageSettingsPanel({
  settings,
  onUpdate,
}: {
  settings: PageSettings
  onUpdate: (settings: PageSettings) => void
}) {
  return (
    <div className="divide-y divide-gray-100">
      {/* Page Size & Orientation */}
      <CollapsibleSection title="Page" icon={<FileText className="w-3.5 h-3.5" />}>
        <div className="space-y-3">
          <div>
            <label className="block text-[10px] text-gray-400 mb-1 uppercase">Size</label>
            <select
              value={settings.pageSize}
              onChange={(e) => {
                const size = e.target.value as 'A4' | 'Letter' | 'Legal'
                const dimensions = { A4: { width: 210, height: 297 }, Letter: { width: 216, height: 279 }, Legal: { width: 216, height: 356 } }[size]
                onUpdate({ ...settings, pageSize: size, ...dimensions })
              }}
              className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="A4">A4</option>
              <option value="Letter">Letter</option>
              <option value="Legal">Legal</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] text-gray-400 mb-1 uppercase">Orientation</label>
            <div className="flex gap-2">
              <button
                onClick={() => onUpdate({ ...settings, orientation: 'portrait', width: Math.min(settings.width, settings.height), height: Math.max(settings.width, settings.height) })}
                className={clsx(
                  'flex-1 px-3 py-2 text-sm rounded-lg border transition-colors',
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
                  'flex-1 px-3 py-2 text-sm rounded-lg border transition-colors',
                  settings.orientation === 'landscape'
                    ? 'bg-purple-100 border-purple-300 text-purple-700'
                    : 'border-gray-200 hover:bg-gray-50'
                )}
              >
                Landscape
              </button>
            </div>
          </div>
        </div>
      </CollapsibleSection>

      {/* Margins */}
      <CollapsibleSection title="Margins" icon={<Square className="w-3.5 h-3.5" />}>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[10px] text-gray-400 mb-1 uppercase">Top (mm)</label>
            <input
              type="number"
              value={settings.margins.top}
              onChange={(e) => onUpdate({ ...settings, margins: { ...settings.margins, top: parseInt(e.target.value) || 0 } })}
              className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div>
            <label className="block text-[10px] text-gray-400 mb-1 uppercase">Bottom (mm)</label>
            <input
              type="number"
              value={settings.margins.bottom}
              onChange={(e) => onUpdate({ ...settings, margins: { ...settings.margins, bottom: parseInt(e.target.value) || 0 } })}
              className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div>
            <label className="block text-[10px] text-gray-400 mb-1 uppercase">Left (mm)</label>
            <input
              type="number"
              value={settings.margins.left}
              onChange={(e) => onUpdate({ ...settings, margins: { ...settings.margins, left: parseInt(e.target.value) || 0 } })}
              className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div>
            <label className="block text-[10px] text-gray-400 mb-1 uppercase">Right (mm)</label>
            <input
              type="number"
              value={settings.margins.right}
              onChange={(e) => onUpdate({ ...settings, margins: { ...settings.margins, right: parseInt(e.target.value) || 0 } })}
              className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>
      </CollapsibleSection>

      {/* Section Heights */}
      <CollapsibleSection title="Sections" icon={<Layers className="w-3.5 h-3.5" />}>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[10px] text-gray-400 mb-1 uppercase">Header (mm)</label>
            <input
              type="number"
              value={settings.headerHeight}
              onChange={(e) => onUpdate({ ...settings, headerHeight: parseInt(e.target.value) || 0 })}
              className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div>
            <label className="block text-[10px] text-gray-400 mb-1 uppercase">Footer (mm)</label>
            <input
              type="number"
              value={settings.footerHeight}
              onChange={(e) => onUpdate({ ...settings, footerHeight: parseInt(e.target.value) || 0 })}
              className="w-full px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>
      </CollapsibleSection>
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
