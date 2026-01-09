import { useDroppable } from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { Columns, GripVertical, MousePointer2 } from 'lucide-react'
import clsx from 'clsx'
import type { SelectedColumn } from '../../types/queryBuilder'
import ColumnItem from './ColumnItem'

interface ColumnPanelProps {
  columns: SelectedColumn[]
  onUpdateColumn: (columnId: string, updates: Partial<SelectedColumn>) => void
  onRemoveColumn: (columnId: string) => void
}

export default function ColumnPanel({
  columns,
  onUpdateColumn,
  onRemoveColumn,
}: ColumnPanelProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: 'column-panel',
  })

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl shadow-sm">
            <Columns className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-gray-900">Selected Columns</h3>
            <p className="text-xs text-gray-500">Drag to reorder</p>
          </div>
          {columns.length > 0 && (
            <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              {columns.length}
            </span>
          )}
        </div>
      </div>

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        className={clsx(
          'flex-1 p-3 overflow-y-auto transition-colors duration-200',
          isOver && 'bg-emerald-50/50 ring-2 ring-inset ring-emerald-400',
          columns.length === 0 && 'flex items-center justify-center'
        )}
      >
        {columns.length === 0 ? (
          <div className="text-center p-4">
            <div className="w-14 h-14 mx-auto mb-3 rounded-xl bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center">
              <GripVertical className="w-6 h-6 text-gray-300" />
            </div>
            <p className="text-sm font-medium text-gray-600 mb-1">
              Drag columns here
            </p>
            <p className="text-xs text-gray-400 flex items-center justify-center gap-1.5">
              <MousePointer2 className="w-3 h-3" />
              Or double-click a field
            </p>
          </div>
        ) : (
          <SortableContext
            items={columns.map(c => c.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {columns.map((column) => (
                <ColumnItem
                  key={column.id}
                  column={column}
                  onUpdate={(updates) => onUpdateColumn(column.id, updates)}
                  onRemove={() => onRemoveColumn(column.id)}
                />
              ))}
            </div>
          </SortableContext>
        )}
      </div>

      {/* Footer stats */}
      {columns.length > 0 && (
        <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50/50">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">
              {columns.length} column{columns.length !== 1 ? 's' : ''} in SELECT
            </span>
            <span className="text-gray-400">Drag to reorder</span>
          </div>
        </div>
      )}
    </div>
  )
}
