import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useDraggable } from '@dnd-kit/core'
import {
  Database,
  Table,
  ChevronRight,
  ChevronDown,
  GripVertical,
  Loader2,
} from 'lucide-react'
import clsx from 'clsx'
import { metabaseService } from '../../services/metabaseService'
import type { MetabaseField } from '../../types'

interface DraggableTableProps {
  tableId: number
  tableName: string
  schemaName: string | null
  databaseId: number
  fields: MetabaseField[]
}

function DraggableTable({ tableId, tableName, schemaName, databaseId, fields }: DraggableTableProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `table-${tableId}`,
    data: {
      type: 'table',
      data: {
        tableId,
        tableName,
        schemaName,
        databaseId,
        fields,
      },
    },
  })

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={clsx(
        'flex items-center gap-2 px-3 py-1.5 rounded cursor-grab hover:bg-blue-50 transition-colors',
        isDragging && 'opacity-50'
      )}
    >
      <GripVertical className="w-3 h-3 text-gray-400" />
      <Table className="w-4 h-4 text-gray-500" />
      <span className="text-sm text-gray-700 truncate">{tableName}</span>
    </div>
  )
}

interface DatabaseItemProps {
  database: {
    id: number
    name: string
    engine: string
  }
  isExpanded: boolean
  onToggle: () => void
}

function DatabaseItem({ database, isExpanded, onToggle }: DatabaseItemProps) {
  const { data: metadata, isLoading } = useQuery({
    queryKey: ['database-metadata', database.id],
    queryFn: () => metabaseService.getDatabaseMetadata(database.id),
    enabled: isExpanded,
  })

  const tables = metadata?.tables || []

  return (
    <div className="mb-1">
      <button
        onClick={onToggle}
        className="flex items-center gap-2 w-full px-2 py-1.5 rounded hover:bg-gray-100 transition-colors"
      >
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-gray-500" />
        ) : (
          <ChevronRight className="w-4 h-4 text-gray-500" />
        )}
        <Database className="w-4 h-4 text-blue-500" />
        <span className="text-sm font-medium text-gray-700 truncate">{database.name}</span>
      </button>

      {isExpanded && (
        <div className="ml-4 mt-1 space-y-0.5">
          {isLoading ? (
            <div className="flex items-center gap-2 px-3 py-2 text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Loading tables...</span>
            </div>
          ) : tables.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-500">No tables found</div>
          ) : (
            tables.map((table) => (
              <DraggableTable
                key={table.id}
                tableId={table.id}
                tableName={table.display_name || table.name}
                schemaName={table.schema}
                databaseId={database.id}
                fields={table.fields || []}
              />
            ))
          )}
        </div>
      )}
    </div>
  )
}

export default function TableSelector() {
  const [expandedDatabases, setExpandedDatabases] = useState<Set<number>>(new Set())

  const { data: databases, isLoading, error } = useQuery({
    queryKey: ['metabase-databases'],
    queryFn: () => metabaseService.listDatabases(),
  })

  const toggleDatabase = (id: number) => {
    setExpandedDatabases((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col h-full">
      <div className="p-3 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-700">Tables</h3>
        <p className="text-xs text-gray-500 mt-0.5">Drag tables to the canvas</p>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
          </div>
        ) : error ? (
          <div className="text-sm text-red-500 p-3">
            Failed to load databases
          </div>
        ) : databases?.length === 0 ? (
          <div className="text-sm text-gray-500 p-3">
            No databases available
          </div>
        ) : (
          databases?.filter((db: { is_sample?: boolean; id: number }) => !db.is_sample).map((db: { id: number; name: string; engine: string; is_sample?: boolean }) => (
            <DatabaseItem
              key={db.id}
              database={db}
              isExpanded={expandedDatabases.has(db.id)}
              onToggle={() => toggleDatabase(db.id)}
            />
          ))
        )}
      </div>
    </div>
  )
}
