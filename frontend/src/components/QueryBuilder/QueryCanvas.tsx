import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { useDroppable } from '@dnd-kit/core'
import {
  Database,
  MousePointer2,
  Link2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Grid3X3,
  Move,
  RotateCcw
} from 'lucide-react'
import clsx from 'clsx'
import TableNode from './TableNode'
import JoinLine from './JoinLine'
import type { CanvasTable, JoinDefinition, Position } from '../../types/queryBuilder'

interface QueryCanvasProps {
  tables: CanvasTable[]
  joins: JoinDefinition[]
  onRemoveTable: (tableId: string) => void
  onCreateJoin: (sourceTable: CanvasTable, targetTable: CanvasTable) => void
  onRemoveJoin: (joinId: string) => void
  onEditJoin: (join: JoinDefinition) => void
  onFieldDoubleClick: (
    canvasTableId: string,
    fieldId: number,
    fieldName: string,
    tableName: string,
    baseType: string
  ) => void
  onUpdateTablePosition?: (tableId: string, position: Position) => void
}

export default function QueryCanvas({
  tables,
  joins,
  onRemoveTable,
  onCreateJoin,
  onRemoveJoin,
  onEditJoin,
  onFieldDoubleClick,
  onUpdateTablePosition,
}: QueryCanvasProps) {
  const [joinStartTable, setJoinStartTable] = useState<CanvasTable | null>(null)
  const [zoom, setZoom] = useState(1)
  const [showGrid, setShowGrid] = useState(false)

  // Table dragging state
  const [draggingTable, setDraggingTable] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
  const [localTablePositions, setLocalTablePositions] = useState<Record<string, Position>>({})

  const containerRef = useRef<HTMLDivElement>(null)
  const canvasContentRef = useRef<HTMLDivElement>(null)

  const { setNodeRef, isOver } = useDroppable({
    id: 'query-canvas',
  })

  // Initialize local positions from tables
  useEffect(() => {
    const positions: Record<string, Position> = {}
    tables.forEach(table => {
      positions[table.id] = table.position
    })
    setLocalTablePositions(positions)
  }, [tables])

  // Calculate canvas bounds based on table positions
  const canvasBounds = useMemo(() => {
    if (tables.length === 0) {
      return { width: 2000, height: 1200 }
    }

    const padding = 400
    const tableWidth = 224
    const tableHeight = 300

    let maxX = 0
    let maxY = 0

    tables.forEach(table => {
      const pos = localTablePositions[table.id] || table.position
      maxX = Math.max(maxX, pos.x + tableWidth)
      maxY = Math.max(maxY, pos.y + tableHeight)
    })

    return {
      width: Math.max(2000, maxX + padding),
      height: Math.max(1200, maxY + padding)
    }
  }, [tables, localTablePositions])

  // Zoom controls
  const handleZoomIn = () => setZoom(z => Math.min(1.5, z + 0.1))
  const handleZoomOut = () => setZoom(z => Math.max(0.5, z - 0.1))
  const handleZoomReset = () => setZoom(1)

  // Fit all tables in view
  const handleFitToView = useCallback(() => {
    if (tables.length === 0 || !containerRef.current) return

    const container = containerRef.current
    const containerWidth = container.clientWidth
    const containerHeight = container.clientHeight

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    tables.forEach(table => {
      const pos = localTablePositions[table.id] || table.position
      minX = Math.min(minX, pos.x)
      minY = Math.min(minY, pos.y)
      maxX = Math.max(maxX, pos.x + 224)
      maxY = Math.max(maxY, pos.y + 250)
    })

    const contentWidth = maxX - minX + 100
    const contentHeight = maxY - minY + 100

    const scaleX = containerWidth / contentWidth
    const scaleY = containerHeight / contentHeight
    const newZoom = Math.min(1.2, Math.max(0.5, Math.min(scaleX, scaleY) * 0.9))

    setZoom(newZoom)
  }, [tables, localTablePositions])

  // Handle wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault()
      const delta = e.deltaY > 0 ? -0.1 : 0.1
      setZoom(z => Math.min(1.5, Math.max(0.5, z + delta)))
    }
  }, [])

  // Table drag start - called from TableNode header
  const handleTableDragStart = useCallback((tableId: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!onUpdateTablePosition || !canvasContentRef.current) return

    const table = tables.find(t => t.id === tableId)
    if (!table) return

    const tablePos = localTablePositions[tableId] || table.position

    // Get the canvas content element's bounding rect
    const canvasRect = canvasContentRef.current.getBoundingClientRect()

    // Calculate offset from mouse to table top-left corner (accounting for zoom)
    const offsetX = (e.clientX - canvasRect.left) / zoom - tablePos.x
    const offsetY = (e.clientY - canvasRect.top) / zoom - tablePos.y

    setDraggingTable(tableId)
    setDragOffset({ x: offsetX, y: offsetY })
  }, [tables, localTablePositions, zoom, onUpdateTablePosition])

  // Global mouse move handler for dragging
  useEffect(() => {
    if (!draggingTable || !canvasContentRef.current) return

    const handleMouseMove = (e: MouseEvent) => {
      if (!canvasContentRef.current) return

      const canvasRect = canvasContentRef.current.getBoundingClientRect()

      // Calculate new position (accounting for zoom and offset)
      const newX = Math.max(0, (e.clientX - canvasRect.left) / zoom - dragOffset.x)
      const newY = Math.max(0, (e.clientY - canvasRect.top) / zoom - dragOffset.y)

      // Round to nearest grid point for snapping (optional)
      const snappedX = showGrid ? Math.round(newX / 24) * 24 : newX
      const snappedY = showGrid ? Math.round(newY / 24) * 24 : newY

      // Update local position immediately for smooth visual feedback
      setLocalTablePositions(prev => ({
        ...prev,
        [draggingTable]: { x: snappedX, y: snappedY }
      }))
    }

    const handleMouseUp = () => {
      if (draggingTable && onUpdateTablePosition) {
        const finalPos = localTablePositions[draggingTable]
        if (finalPos) {
          onUpdateTablePosition(draggingTable, finalPos)
        }
      }
      setDraggingTable(null)
    }

    // Add global listeners
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [draggingTable, dragOffset, zoom, showGrid, localTablePositions, onUpdateTablePosition])

  const handleStartJoin = (tableId: string) => {
    const table = tables.find(t => t.id === tableId)
    if (table) {
      setJoinStartTable(table)
    }
  }

  const handleCompleteJoin = (targetTableId: string) => {
    if (joinStartTable && joinStartTable.id !== targetTableId) {
      const targetTable = tables.find(t => t.id === targetTableId)
      if (targetTable) {
        onCreateJoin(joinStartTable, targetTable)
      }
    }
    setJoinStartTable(null)
  }

  const handleCancelJoin = () => {
    setJoinStartTable(null)
  }

  // Get position for a table (use local position if available)
  const getTablePosition = (tableId: string): Position => {
    return localTablePositions[tableId] || tables.find(t => t.id === tableId)?.position || { x: 0, y: 0 }
  }

  // Minimap calculations
  const minimapScale = 0.08
  const minimapWidth = 160
  const minimapHeight = 100

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden bg-gray-100"
      onWheel={handleWheel}
    >
      {/* Toolbar */}
      <div className="absolute top-2 right-2 z-20 flex items-center gap-1 bg-white/95 backdrop-blur-sm rounded-lg shadow-md border border-gray-200 p-1">
        <button
          onClick={handleZoomOut}
          className="p-1.5 hover:bg-gray-100 rounded-md transition-colors"
          title="Zoom out (Ctrl + Scroll)"
        >
          <ZoomOut className="w-4 h-4 text-gray-600" />
        </button>
        <span className="px-2 text-xs font-medium text-gray-700 min-w-12 text-center">
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={handleZoomIn}
          className="p-1.5 hover:bg-gray-100 rounded-md transition-colors"
          title="Zoom in (Ctrl + Scroll)"
        >
          <ZoomIn className="w-4 h-4 text-gray-600" />
        </button>
        <div className="w-px h-5 bg-gray-200 mx-1" />
        <button
          onClick={handleZoomReset}
          className="p-1.5 hover:bg-gray-100 rounded-md transition-colors"
          title="Reset zoom (100%)"
        >
          <RotateCcw className="w-4 h-4 text-gray-600" />
        </button>
        <button
          onClick={handleFitToView}
          className="p-1.5 hover:bg-gray-100 rounded-md transition-colors"
          title="Fit to view"
        >
          <Maximize2 className="w-4 h-4 text-gray-600" />
        </button>
        <div className="w-px h-5 bg-gray-200 mx-1" />
        <button
          onClick={() => setShowGrid(!showGrid)}
          className={clsx(
            'p-1.5 rounded-md transition-colors',
            showGrid ? 'bg-amber-100 text-amber-700' : 'hover:bg-gray-100 text-gray-600'
          )}
          title={showGrid ? 'Hide grid (snap enabled)' : 'Show grid'}
        >
          <Grid3X3 className="w-4 h-4" />
        </button>
      </div>

      {/* Drag indicator */}
      <div className="absolute top-2 left-12 z-20 flex items-center gap-1.5 bg-white/80 backdrop-blur-sm rounded-lg px-2 py-1 text-[10px] text-gray-500 border border-gray-200">
        <Move className="w-3 h-3" />
        <span>Drag table headers to reposition</span>
      </div>

      {/* Scrollable canvas area */}
      <div
        ref={setNodeRef}
        className={clsx(
          'absolute inset-0 overflow-auto',
          isOver && 'ring-2 ring-inset ring-amber-400'
        )}
        onClick={handleCancelJoin}
      >
        {/* Zoomable canvas content */}
        <div
          ref={canvasContentRef}
          className="relative"
          style={{
            width: canvasBounds.width * zoom,
            height: canvasBounds.height * zoom,
            cursor: draggingTable ? 'grabbing' : 'default',
          }}
        >
          {/* Background grid (scales with zoom) */}
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: showGrid
                ? `
                  linear-gradient(to right, #e5e7eb 1px, transparent 1px),
                  linear-gradient(to bottom, #e5e7eb 1px, transparent 1px)
                `
                : `radial-gradient(circle, #d1d5db 1px, transparent 1px)`,
              backgroundSize: showGrid ? `${24 * zoom}px ${24 * zoom}px` : `${24 * zoom}px ${24 * zoom}px`,
              backgroundColor: isOver ? 'rgba(251, 191, 36, 0.1)' : '#f9fafb',
            }}
          />

          {/* SVG layer for join lines */}
          <svg
            className="absolute inset-0 pointer-events-none"
            style={{
              width: canvasBounds.width * zoom,
              height: canvasBounds.height * zoom,
            }}
          >
            <g transform={`scale(${zoom})`}>
              {joins.map((join) => {
                const sourcePos = getTablePosition(join.sourceTableId)
                const targetPos = getTablePosition(join.targetTableId)

                return (
                  <JoinLine
                    key={join.id}
                    join={join}
                    sourcePosition={{
                      x: sourcePos.x + 224,
                      y: sourcePos.y + 50,
                    }}
                    targetPosition={{
                      x: targetPos.x,
                      y: targetPos.y + 50,
                    }}
                    onRemove={() => onRemoveJoin(join.id)}
                    onEdit={() => onEditJoin(join)}
                  />
                )
              })}
            </g>
          </svg>

          {/* Table nodes */}
          {tables.map((table) => {
            const pos = getTablePosition(table.id)
            return (
              <div
                key={table.id}
                className="absolute"
                style={{
                  left: pos.x * zoom,
                  top: pos.y * zoom,
                  transform: `scale(${zoom})`,
                  transformOrigin: 'top left',
                }}
              >
                <TableNode
                  table={{ ...table, position: pos }}
                  onRemove={() => onRemoveTable(table.id)}
                  onStartJoin={() => handleStartJoin(table.id)}
                  onCompleteJoin={() => handleCompleteJoin(table.id)}
                  onFieldDoubleClick={(fieldId, fieldName, baseType) =>
                    onFieldDoubleClick(table.id, fieldId, fieldName, table.tableName, baseType)
                  }
                  isJoinSource={joinStartTable?.id === table.id}
                  isJoinTarget={joinStartTable !== null && joinStartTable.id !== table.id}
                  onDragStart={(e) => handleTableDragStart(table.id, e)}
                  isDragging={draggingTable === table.id}
                />
              </div>
            )
          })}

          {/* Drop indicator */}
          {isOver && tables.length > 0 && (
            <div className="absolute inset-4 border-2 border-dashed border-amber-400 rounded-xl pointer-events-none bg-amber-50/30" />
          )}
        </div>
      </div>

      {/* Empty state - positioned over viewport, not inside scrollable canvas */}
      {tables.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10">
          <div className="text-center pointer-events-auto">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-amber-100 to-orange-100 rounded-2xl mb-4 shadow-sm">
              <Database className="w-10 h-10 text-amber-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-700 mb-1">Drop tables here</h3>
            <p className="text-sm text-gray-500 max-w-xs">
              Drag tables from the sidebar to start building your query
            </p>
            <div className="flex items-center justify-center gap-4 mt-6 text-xs text-gray-400">
              <span className="flex items-center gap-1.5">
                <MousePointer2 className="w-3.5 h-3.5" />
                Double-click field to add
              </span>
              <span className="flex items-center gap-1.5">
                <Link2 className="w-3.5 h-3.5" />
                Click link icon to join
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Join mode indicator */}
      {joinStartTable && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-20">
          <div className="flex items-center gap-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white px-5 py-2.5 rounded-xl shadow-lg shadow-amber-500/25">
            <Link2 className="w-4 h-4" />
            <span className="text-sm">
              Click another table to join from <strong>{joinStartTable.tableName}</strong>
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); handleCancelJoin(); }}
              className="ml-1 px-2 py-0.5 text-xs bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Minimap */}
      {tables.length > 0 && (
        <div className="absolute bottom-3 right-3 z-20 bg-white/95 backdrop-blur-sm rounded-lg shadow-md border border-gray-200 p-2">
          <div
            className="relative bg-gray-50 rounded border border-gray-200"
            style={{ width: minimapWidth, height: minimapHeight }}
          >
            {/* Minimap tables */}
            {tables.map((table) => {
              const pos = getTablePosition(table.id)
              return (
                <div
                  key={table.id}
                  className={clsx(
                    'absolute rounded-sm transition-colors',
                    draggingTable === table.id ? 'bg-amber-400' : 'bg-blue-400'
                  )}
                  style={{
                    left: pos.x * minimapScale,
                    top: pos.y * minimapScale,
                    width: Math.max(8, 224 * minimapScale),
                    height: Math.max(4, 80 * minimapScale),
                  }}
                />
              )
            })}
          </div>
          <div className="text-[9px] text-gray-400 text-center mt-1">Minimap</div>
        </div>
      )}
    </div>
  )
}
