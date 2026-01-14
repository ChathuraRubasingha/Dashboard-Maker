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
      title={tableName}
      className={clsx(
        'group flex items-center gap-1.5 px-2 py-1.5 rounded-md cursor-grab transition-all min-w-0',
        'hover:bg-amber-50',
        isDragging && 'opacity-50 scale-95'
      )}
    >
      <GripVertical className="w-3.5 h-3.5 flex-shrink-0 text-gray-300 group-hover:text-amber-400 transition-colors" />
      <div className="p-1 bg-gray-100 group-hover:bg-amber-100 rounded flex-shrink-0 transition-colors">
        <Table className="w-3 h-3 text-gray-500 group-hover:text-amber-600" />
      </div>
      <span className="text-xs text-gray-700 group-hover:text-gray-900 truncate font-medium flex-1 min-w-0">{tableName}</span>
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
    <div className="mb-1">
      <button
        onClick={onToggle}
        className={clsx(
          'flex items-center gap-1.5 w-full px-2 py-1.5 rounded-lg transition-all',
          'hover:bg-gray-100',
          isExpanded && 'bg-gray-50'
        )}
      >
        <div className={clsx(
          'p-0.5 rounded transition-colors',
          isExpanded ? 'bg-amber-100' : 'bg-gray-100'
        )}>
          {isExpanded ? (
            <ChevronDown className="w-3 h-3 text-amber-600" />
          ) : (
            <ChevronRight className="w-3 h-3 text-gray-500" />
          )}
        </div>
        <div className={clsx(
          'p-1 rounded transition-colors',
          isExpanded ? 'bg-amber-500' : 'bg-blue-500'
        )}>
          <Database className="w-3 h-3 text-white" />
        </div>
        <span className="text-xs font-semibold text-gray-800 truncate flex-1 text-left">{database.name}</span>
        {metadata && (
          <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">
            {tables.length}
          </span>
        )}
      </button>

      {shouldShow && (
        <div className="ml-2 mt-0.5 pl-2 border-l border-gray-200">
          {isLoading ? (
            <div className="flex items-center gap-1.5 px-2 py-2 text-gray-500">
              <Loader2 className="w-3 h-3 animate-spin text-amber-500" />
              <span className="text-xs">Loading...</span>
            </div>
          ) : filteredTables.length === 0 ? (
            <div className="px-2 py-2 text-xs text-gray-400 italic">
              {searchQuery ? 'No matching tables' : 'No tables'}
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
    <div className="flex flex-col h-full max-h-full overflow-hidden">
      {/* Compact Header */}
      <div className="p-2 border-b border-gray-100 flex-shrink-0">
        <div className="flex items-center gap-2 mb-2">
          <div className="p-1.5 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg">
            <Layers className="w-3.5 h-3.5 text-white" />
          </div>
          <div>
            <h3 className="text-xs font-semibold text-gray-900">Tables</h3>
            <p className="text-[10px] text-gray-500">Drag to canvas</p>
          </div>
        </div>

        {/* Compact Search input */}
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-7 pr-2 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-amber-500/20 focus:border-amber-400 transition-all"
          />
        </div>
      </div>

      {/* Database list */}
      <div className="flex-1 min-h-0 overflow-y-auto p-2">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-6">
            <div className="p-2 bg-amber-50 rounded-lg mb-2">
              <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
            </div>
            <p className="text-xs text-gray-500">Loading...</p>
          </div>
        ) : error ? (
          <div className="text-center py-4">
            <div className="p-2 bg-red-50 rounded-lg inline-block mb-2">
              <Database className="w-4 h-4 text-red-400" />
            </div>
            <p className="text-xs text-red-600 font-medium">Failed to load</p>
            <p className="text-[10px] text-gray-500 mt-0.5">Check connection</p>
          </div>
        ) : filteredDatabases.length === 0 ? (
          <div className="text-center py-4">
            <div className="p-2 bg-gray-100 rounded-lg inline-block mb-2">
              <Database className="w-4 h-4 text-gray-400" />
            </div>
            <p className="text-xs text-gray-600 font-medium">No databases</p>
            <p className="text-[10px] text-gray-500 mt-0.5">Connect to get started</p>
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
