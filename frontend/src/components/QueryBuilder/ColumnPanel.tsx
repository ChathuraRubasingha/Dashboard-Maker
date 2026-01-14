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
    <div className="flex flex-col h-full overflow-hidden">
      {/* Compact Header */}
      <div className="px-2 py-1.5 border-b border-gray-100 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="p-1 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-md">
            <Columns className="w-3 h-3 text-white" />
          </div>
          <h3 className="text-xs font-semibold text-gray-900 flex-1">Columns</h3>
          {columns.length > 0 && (
            <span className="text-[10px] font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-200">
              {columns.length}
            </span>
          )}
        </div>
      </div>

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        className={clsx(
          'flex-1 min-h-0 p-2 overflow-y-auto transition-colors duration-200',
          isOver && 'bg-emerald-50/50 ring-2 ring-inset ring-emerald-400',
          columns.length === 0 && 'flex items-center justify-center'
        )}
      >
        {columns.length === 0 ? (
          <div className="text-center p-2">
            <div className="w-10 h-10 mx-auto mb-2 rounded-lg bg-gradient-to-br from-gray-100 to-gray-50 flex items-center justify-center">
              <GripVertical className="w-4 h-4 text-gray-300" />
            </div>
            <p className="text-xs font-medium text-gray-600 mb-0.5">
              Drag columns here
            </p>
            <p className="text-[10px] text-gray-400 flex items-center justify-center gap-1">
              <MousePointer2 className="w-2.5 h-2.5" />
              Or double-click
            </p>
          </div>
        ) : (
          <SortableContext
            items={columns.map(c => c.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-1">
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
    </div>
  )
}
