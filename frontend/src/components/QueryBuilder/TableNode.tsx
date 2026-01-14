import { useDraggable } from '@dnd-kit/core'
import { Table, X, GripVertical, Link, Move } from 'lucide-react'
import clsx from 'clsx'
import type { CanvasTable } from '../../types/queryBuilder'
import type { MetabaseField } from '../../types'

interface FieldItemProps {
  field: MetabaseField
  canvasTableId: string
  tableName: string
  onDoubleClick: (fieldId: number, fieldName: string, baseType: string) => void
}

function FieldItem({ field, canvasTableId, tableName, onDoubleClick }: FieldItemProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `field-${canvasTableId}-${field.id}`,
    data: {
      type: 'field',
      data: {
        canvasTableId,
        fieldId: field.id,
        fieldName: field.display_name || field.name,
        tableName,
        baseType: field.base_type,
      },
    },
  })

  const isForeignKey = field.semantic_type === 'type/FK'
  const isPrimaryKey = field.semantic_type === 'type/PK'

  return (
    <div
      ref={setNodeRef}
      className={clsx(
        'flex items-center gap-1 px-2 py-1 text-xs rounded cursor-grab hover:bg-blue-50 group',
        isDragging && 'opacity-50'
      )}
      {...listeners}
      {...attributes}
      onDoubleClick={() => onDoubleClick(field.id, field.display_name || field.name, field.base_type)}
    >
      <GripVertical className="w-3 h-3 text-gray-300 group-hover:text-gray-500" />
      <span className="flex-1 truncate text-gray-700">
        {field.display_name || field.name}
      </span>
      {(isForeignKey || isPrimaryKey) && (
        <Link className="w-3 h-3 text-blue-500" />
      )}
      <span className="text-[10px] text-gray-400 ml-1">
        {field.base_type.replace('type/', '')}
      </span>
    </div>
  )
}

interface TableNodeProps {
  table: CanvasTable
  onRemove: () => void
  onStartJoin: () => void
  onCompleteJoin: () => void
  onFieldDoubleClick: (fieldId: number, fieldName: string, baseType: string) => void
  isJoinSource: boolean
  isJoinTarget: boolean
  onDragStart?: (e: React.MouseEvent) => void
  isDragging?: boolean
}

export default function TableNode({
  table,
  onRemove,
  onStartJoin,
  onCompleteJoin,
  onFieldDoubleClick,
  isJoinSource,
  isJoinTarget,
  onDragStart,
  isDragging,
}: TableNodeProps) {
  const handleTableClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isJoinTarget) {
      onCompleteJoin()
    }
  }

  const handleHeaderMouseDown = (e: React.MouseEvent) => {
    // Only start drag on left click and if onDragStart is provided
    if (e.button === 0 && onDragStart) {
      onDragStart(e)
    }
  }

  return (
    <div
      className={clsx(
        'bg-white rounded-lg shadow-md border w-56 transition-shadow',
        isDragging && 'shadow-xl ring-2 ring-amber-400 z-50',
        isJoinSource && 'ring-2 ring-green-400 border-green-400',
        isJoinTarget && 'ring-2 ring-blue-400 border-blue-400 cursor-pointer',
        !isJoinSource && !isJoinTarget && !isDragging && 'border-gray-200 hover:shadow-lg'
      )}
      onClick={handleTableClick}
    >
      {/* Header - drag handle for repositioning */}
      <div
        onMouseDown={handleHeaderMouseDown}
        className={clsx(
          'flex items-center gap-2 px-3 py-2 border-b border-gray-200 rounded-t-lg select-none transition-colors',
          isDragging ? 'bg-amber-50 cursor-grabbing' : 'bg-gray-50 cursor-grab hover:bg-gray-100'
        )}
      >
        <Move className={clsx(
          'w-4 h-4 flex-shrink-0',
          isDragging ? 'text-amber-500' : 'text-gray-400'
        )} />
        <Table className="w-4 h-4 text-blue-500 flex-shrink-0" />
        <span className="flex-1 font-medium text-sm text-gray-700 truncate">
          {table.tableName}
        </span>
        <span className="text-xs text-gray-400 flex-shrink-0">{table.alias}</span>
        <button
          onClick={(e) => { e.stopPropagation(); e.preventDefault(); onRemove(); }}
          onMouseDown={(e) => e.stopPropagation()}
          className="p-0.5 rounded hover:bg-red-100 text-gray-400 hover:text-red-500 flex-shrink-0"
          title="Remove table"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Join button */}
      <div className="px-3 py-1 border-b border-gray-100 bg-gray-50/50">
        <button
          onClick={(e) => { e.stopPropagation(); onStartJoin(); }}
          onMouseDown={(e) => e.stopPropagation()}
          className="w-full text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded py-1"
        >
          + Create Join
        </button>
      </div>

      {/* Fields */}
      <div className="max-h-48 overflow-y-auto p-1">
        {table.fields.slice(0, 15).map((field) => (
          <FieldItem
            key={field.id}
            field={field}
            canvasTableId={table.id}
            tableName={table.tableName}
            onDoubleClick={onFieldDoubleClick}
          />
        ))}
        {table.fields.length > 15 && (
          <div className="text-xs text-gray-400 text-center py-1">
            +{table.fields.length - 15} more fields
          </div>
        )}
      </div>
    </div>
  )
}
