import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { Table, X, GripVertical, Link } from 'lucide-react'
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
}

export default function TableNode({
  table,
  onRemove,
  onStartJoin,
  onCompleteJoin,
  onFieldDoubleClick,
  isJoinSource,
  isJoinTarget,
}: TableNodeProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `canvas-table-${table.id}`,
    data: {
      type: 'canvas-table',
      tableId: table.id,
    },
  })

  const style = transform
    ? {
        transform: CSS.Translate.toString(transform),
        left: table.position.x,
        top: table.position.y,
      }
    : {
        left: table.position.x,
        top: table.position.y,
      }

  const handleTableClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isJoinTarget) {
      onCompleteJoin()
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={clsx(
        'absolute bg-white rounded-lg shadow-md border w-56',
        isDragging && 'shadow-lg ring-2 ring-blue-400 z-50',
        isJoinSource && 'ring-2 ring-green-400 border-green-400',
        isJoinTarget && 'ring-2 ring-blue-400 border-blue-400 cursor-pointer',
        !isJoinSource && !isJoinTarget && 'border-gray-200'
      )}
      onClick={handleTableClick}
    >
      {/* Header */}
      <div
        {...listeners}
        {...attributes}
        className="flex items-center gap-2 px-3 py-2 bg-gray-50 border-b border-gray-200 rounded-t-lg cursor-move"
      >
        <Table className="w-4 h-4 text-blue-500" />
        <span className="flex-1 font-medium text-sm text-gray-700 truncate">
          {table.tableName}
        </span>
        <span className="text-xs text-gray-400">{table.alias}</span>
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="p-0.5 rounded hover:bg-red-100 text-gray-400 hover:text-red-500"
          title="Remove table"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Join button */}
      <div className="px-3 py-1 border-b border-gray-100 bg-gray-50/50">
        <button
          onClick={(e) => { e.stopPropagation(); onStartJoin(); }}
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
