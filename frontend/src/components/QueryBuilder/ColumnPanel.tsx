import { useDroppable } from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
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
    <div className="flex flex-col h-full bg-white border-r border-gray-200">
      <div className="px-4 py-3 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-700">Selected Columns</h3>
        <p className="text-xs text-gray-500 mt-0.5">
          Drag fields here to add them to your query
        </p>
      </div>

      <div
        ref={setNodeRef}
        className={`
          flex-1 p-3 overflow-y-auto
          ${isOver ? 'bg-blue-50' : ''}
          ${columns.length === 0 ? 'flex items-center justify-center' : ''}
        `}
      >
        {columns.length === 0 ? (
          <div className="text-center p-4">
            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-100 flex items-center justify-center">
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
            </div>
            <p className="text-sm text-gray-500">
              Drag columns from tables
            </p>
            <p className="text-xs text-gray-400 mt-1">
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

      {columns.length > 0 && (
        <div className="px-4 py-2 border-t border-gray-200 text-xs text-gray-500">
          {columns.length} column{columns.length !== 1 ? 's' : ''} selected
        </div>
      )}
    </div>
  )
}
