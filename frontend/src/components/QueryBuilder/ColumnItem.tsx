import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { SelectedColumn, AggregationType } from '../../types/queryBuilder'
import { aggregationLabels, canAggregate } from '../../types/queryBuilder'

interface ColumnItemProps {
  column: SelectedColumn
  onUpdate: (updates: Partial<SelectedColumn>) => void
  onRemove: () => void
}

export default function ColumnItem({ column, onUpdate, onRemove }: ColumnItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: column.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const showAggregation = canAggregate(column.baseType)

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        flex items-center gap-2 p-2 bg-white border border-gray-200 rounded-lg
        ${isDragging ? 'opacity-50 shadow-lg' : ''}
      `}
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="p-1 text-gray-400 hover:text-gray-600 cursor-grab active:cursor-grabbing"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
        </svg>
      </button>

      {/* Column info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <span className="text-xs text-gray-500 truncate">{column.tableName}.</span>
          <span className="text-sm font-medium text-gray-800 truncate">{column.fieldName}</span>
        </div>
      </div>

      {/* Aggregation dropdown */}
      {showAggregation ? (
        <select
          value={column.aggregation}
          onChange={(e) => onUpdate({ aggregation: e.target.value as AggregationType })}
          className="px-2 py-1 text-xs border border-gray-200 rounded bg-gray-50 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          {(Object.keys(aggregationLabels) as AggregationType[]).map((agg) => (
            <option key={agg} value={agg}>
              {aggregationLabels[agg]}
            </option>
          ))}
        </select>
      ) : (
        <span className="px-2 py-1 text-xs text-gray-500 bg-gray-100 rounded">
          {column.baseType.replace('type/', '')}
        </span>
      )}

      {/* Alias input */}
      <input
        type="text"
        value={column.alias || ''}
        onChange={(e) => onUpdate({ alias: e.target.value || undefined })}
        placeholder="Alias"
        className="w-20 px-2 py-1 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
      />

      {/* Remove button */}
      <button
        onClick={onRemove}
        className="p-1 text-gray-400 hover:text-red-500"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  )
}
