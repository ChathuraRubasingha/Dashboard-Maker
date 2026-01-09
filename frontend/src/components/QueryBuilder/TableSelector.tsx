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
  Search,
  Layers,
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
        'group flex items-center gap-2 px-3 py-2 rounded-lg cursor-grab transition-all',
        'hover:bg-amber-50 hover:shadow-sm',
        isDragging && 'opacity-50 scale-95'
      )}
    >
      <GripVertical className="w-3.5 h-3.5 text-gray-300 group-hover:text-amber-400 transition-colors" />
      <div className="p-1 bg-gray-100 group-hover:bg-amber-100 rounded transition-colors">
        <Table className="w-3.5 h-3.5 text-gray-500 group-hover:text-amber-600" />
      </div>
      <span className="text-sm text-gray-700 group-hover:text-gray-900 truncate font-medium">{tableName}</span>
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
  searchQuery: string
}

function DatabaseItem({ database, isExpanded, onToggle, searchQuery }: DatabaseItemProps) {
  const { data: metadata, isLoading } = useQuery({
    queryKey: ['database-metadata', database.id],
    queryFn: () => metabaseService.getDatabaseMetadata(database.id),
    enabled: isExpanded || searchQuery.length > 0,
  })

  const tables = metadata?.tables || []

  // Filter tables based on search query
  const filteredTables = searchQuery
    ? tables.filter((table) =>
        (table.display_name || table.name).toLowerCase().includes(searchQuery.toLowerCase())
      )
    : tables

  // Auto-expand if there are matching tables in search
  const shouldShow = isExpanded || (searchQuery && filteredTables.length > 0)

  return (
    <div className="mb-2">
      <button
        onClick={onToggle}
        className={clsx(
          'flex items-center gap-2 w-full px-3 py-2.5 rounded-xl transition-all',
          'hover:bg-gray-100',
          isExpanded && 'bg-gray-50'
        )}
      >
        <div className={clsx(
          'p-1 rounded-lg transition-colors',
          isExpanded ? 'bg-amber-100' : 'bg-gray-100'
        )}>
          {isExpanded ? (
            <ChevronDown className="w-3.5 h-3.5 text-amber-600" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-gray-500" />
          )}
        </div>
        <div className={clsx(
          'p-1.5 rounded-lg transition-colors',
          isExpanded ? 'bg-amber-500' : 'bg-blue-500'
        )}>
          <Database className="w-3.5 h-3.5 text-white" />
        </div>
        <span className="text-sm font-semibold text-gray-800 truncate flex-1 text-left">{database.name}</span>
        {metadata && (
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
            {tables.length}
          </span>
        )}
      </button>

      {shouldShow && (
        <div className="ml-3 mt-1 pl-3 border-l-2 border-gray-100 space-y-0.5">
          {isLoading ? (
            <div className="flex items-center gap-2 px-3 py-3 text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
              <span className="text-sm">Loading tables...</span>
            </div>
          ) : filteredTables.length === 0 ? (
            <div className="px-3 py-3 text-sm text-gray-400 italic">
              {searchQuery ? 'No matching tables' : 'No tables found'}
            </div>
          ) : (
            filteredTables.map((table) => (
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
  const [searchQuery, setSearchQuery] = useState('')

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

  const filteredDatabases = databases?.filter((db: { is_sample?: boolean }) => !db.is_sample) || []

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl shadow-sm">
            <Layers className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Tables</h3>
            <p className="text-xs text-gray-500">Drag to canvas</p>
          </div>
        </div>

        {/* Search input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search tables..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 transition-all"
          />
        </div>
      </div>

      {/* Database list */}
      <div className="flex-1 overflow-y-auto p-3">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="p-3 bg-amber-50 rounded-xl mb-3">
              <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
            </div>
            <p className="text-sm text-gray-500">Loading databases...</p>
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <div className="p-3 bg-red-50 rounded-xl inline-block mb-3">
              <Database className="w-6 h-6 text-red-400" />
            </div>
            <p className="text-sm text-red-600 font-medium">Failed to load databases</p>
            <p className="text-xs text-gray-500 mt-1">Check your connection</p>
          </div>
        ) : filteredDatabases.length === 0 ? (
          <div className="text-center py-8">
            <div className="p-3 bg-gray-100 rounded-xl inline-block mb-3">
              <Database className="w-6 h-6 text-gray-400" />
            </div>
            <p className="text-sm text-gray-600 font-medium">No databases available</p>
            <p className="text-xs text-gray-500 mt-1">Connect a database to get started</p>
          </div>
        ) : (
          filteredDatabases.map((db: { id: number; name: string; engine: string; is_sample?: boolean }) => (
            <DatabaseItem
              key={db.id}
              database={db}
              isExpanded={expandedDatabases.has(db.id)}
              onToggle={() => toggleDatabase(db.id)}
              searchQuery={searchQuery}
            />
          ))
        )}
      </div>
    </div>
  )
}
