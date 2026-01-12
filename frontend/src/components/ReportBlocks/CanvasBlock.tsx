import { useState, useRef, useEffect } from 'react'
import {
  GripVertical,
  Trash2,
  Copy,
  Lock,
  Unlock,
} from 'lucide-react'
import clsx from 'clsx'
import type { ReportBlock, CanvasPosition } from '../../types'

interface CanvasBlockProps {
  block: ReportBlock
  isSelected: boolean
  isEditing: boolean
  canvasScale: number
  onSelect: () => void
  onUpdate: (position: CanvasPosition) => void
  onDelete: () => void
  onDuplicate: () => void
  children: React.ReactNode
}

export default function CanvasBlock({
  block,
  isSelected,
  isEditing,
  canvasScale,
  onSelect,
  onUpdate,
  onDelete,
  onDuplicate,
  children,
}: CanvasBlockProps) {
  const blockRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [resizeHandle, setResizeHandle] = useState<string | null>(null)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [isLocked, setIsLocked] = useState(false)

  const position = block.canvasPosition || {
    x: 50,
    y: 50,
    width: 400,
    height: 300,
    rotation: 0,
    zIndex: 1,
  }

  // Handle drag start
  const handleDragStart = (e: React.MouseEvent) => {
    if (!isEditing || isLocked) return
    e.stopPropagation()
    setIsDragging(true)
    setDragStart({
      x: e.clientX - position.x * canvasScale,
      y: e.clientY - position.y * canvasScale,
    })
    onSelect()
  }

  // Handle resize start
  const handleResizeStart = (e: React.MouseEvent, handle: string) => {
    if (!isEditing || isLocked) return
    e.stopPropagation()
    setIsResizing(true)
    setResizeHandle(handle)
    setDragStart({ x: e.clientX, y: e.clientY })
    onSelect()
  }

  // Handle mouse move
  useEffect(() => {
    if (!isDragging && !isResizing) return

    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const newX = (e.clientX - dragStart.x) / canvasScale
        const newY = (e.clientY - dragStart.y) / canvasScale
        onUpdate({
          ...position,
          x: Math.max(0, newX),
          y: Math.max(0, newY),
        })
      }

      if (isResizing && resizeHandle) {
        const deltaX = (e.clientX - dragStart.x) / canvasScale
        const deltaY = (e.clientY - dragStart.y) / canvasScale

        let newWidth = position.width
        let newHeight = position.height
        let newX = position.x
        let newY = position.y

        if (resizeHandle.includes('e')) {
          newWidth = Math.max(100, position.width + deltaX)
        }
        if (resizeHandle.includes('w')) {
          newWidth = Math.max(100, position.width - deltaX)
          newX = position.x + deltaX
        }
        if (resizeHandle.includes('s')) {
          newHeight = Math.max(50, position.height + deltaY)
        }
        if (resizeHandle.includes('n')) {
          newHeight = Math.max(50, position.height - deltaY)
          newY = position.y + deltaY
        }

        setDragStart({ x: e.clientX, y: e.clientY })
        onUpdate({
          ...position,
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
  }, [isDragging, isResizing, dragStart, resizeHandle, position, canvasScale, onUpdate])

  // Resize handles
  const resizeHandles = ['n', 'ne', 'e', 'se', 's', 'sw', 'w', 'nw']

  const getHandleStyle = (handle: string): React.CSSProperties => {
    const base: React.CSSProperties = {
      position: 'absolute',
      width: '10px',
      height: '10px',
      backgroundColor: 'white',
      border: '2px solid #8b5cf6',
      borderRadius: '2px',
      zIndex: 10,
    }

    switch (handle) {
      case 'n':
        return { ...base, top: '-5px', left: '50%', transform: 'translateX(-50%)', cursor: 'n-resize' }
      case 'ne':
        return { ...base, top: '-5px', right: '-5px', cursor: 'ne-resize' }
      case 'e':
        return { ...base, top: '50%', right: '-5px', transform: 'translateY(-50%)', cursor: 'e-resize' }
      case 'se':
        return { ...base, bottom: '-5px', right: '-5px', cursor: 'se-resize' }
      case 's':
        return { ...base, bottom: '-5px', left: '50%', transform: 'translateX(-50%)', cursor: 's-resize' }
      case 'sw':
        return { ...base, bottom: '-5px', left: '-5px', cursor: 'sw-resize' }
      case 'w':
        return { ...base, top: '50%', left: '-5px', transform: 'translateY(-50%)', cursor: 'w-resize' }
      case 'nw':
        return { ...base, top: '-5px', left: '-5px', cursor: 'nw-resize' }
      default:
        return base
    }
  }

  return (
    <div
      ref={blockRef}
      className={clsx(
        'absolute group',
        isSelected && isEditing && 'ring-2 ring-purple-500 ring-offset-2',
        isDragging && 'cursor-grabbing',
        isLocked && 'opacity-90'
      )}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${position.width}px`,
        height: `${position.height}px`,
        transform: position.rotation ? `rotate(${position.rotation}deg)` : undefined,
        zIndex: position.zIndex || 1,
      }}
      onClick={(e) => {
        e.stopPropagation()
        onSelect()
      }}
    >
      {/* Drag handle */}
      {isEditing && isSelected && !isLocked && (
        <div
          onMouseDown={handleDragStart}
          className="absolute -top-10 left-0 right-0 flex items-center justify-center gap-1 py-1 bg-purple-600 text-white rounded-t-lg cursor-grab active:cursor-grabbing"
        >
          <GripVertical className="w-4 h-4" />
          <span className="text-xs font-medium">{block.type}</span>
        </div>
      )}

      {/* Action toolbar */}
      {isEditing && isSelected && (
        <div className="absolute -top-10 right-0 flex items-center gap-1 bg-white rounded-lg shadow-lg border border-gray-200 p-1">
          <button
            onClick={() => setIsLocked(!isLocked)}
            className="p-1.5 hover:bg-gray-100 rounded transition-colors"
            title={isLocked ? 'Unlock' : 'Lock'}
          >
            {isLocked ? (
              <Lock className="w-3.5 h-3.5 text-amber-600" />
            ) : (
              <Unlock className="w-3.5 h-3.5 text-gray-500" />
            )}
          </button>
          <button
            onClick={onDuplicate}
            className="p-1.5 hover:bg-gray-100 rounded transition-colors"
            title="Duplicate"
          >
            <Copy className="w-3.5 h-3.5 text-gray-500" />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 hover:bg-red-100 rounded transition-colors"
            title="Delete"
          >
            <Trash2 className="w-3.5 h-3.5 text-red-500" />
          </button>
        </div>
      )}

      {/* Content */}
      <div className="w-full h-full overflow-hidden rounded-lg bg-white shadow-sm border border-gray-200">
        {children}
      </div>

      {/* Resize handles */}
      {isEditing && isSelected && !isLocked && (
        <>
          {resizeHandles.map((handle) => (
            <div
              key={handle}
              style={getHandleStyle(handle)}
              onMouseDown={(e) => handleResizeStart(e, handle)}
            />
          ))}
        </>
      )}

      {/* Size indicator */}
      {isEditing && (isResizing || isDragging) && (
        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap">
          {Math.round(position.width)} x {Math.round(position.height)}
        </div>
      )}
    </div>
  )
}
