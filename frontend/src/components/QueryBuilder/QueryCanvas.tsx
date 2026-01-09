import { useState } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { Database, MousePointer2, Link2 } from 'lucide-react'
import clsx from 'clsx'
import TableNode from './TableNode'
import JoinLine from './JoinLine'
import type { CanvasTable, JoinDefinition } from '../../types/queryBuilder'

interface QueryCanvasProps {
  tables: CanvasTable[]
  joins: JoinDefinition[]
  onRemoveTable: (tableId: string) => void
  onCreateJoin: (sourceTable: CanvasTable, targetTable: CanvasTable) => void
  onRemoveJoin: (joinId: string) => void
  onEditJoin: (join: JoinDefinition) => void
  onFieldDoubleClick: (
    canvasTableId: string,
    fieldId: number,
    fieldName: string,
    tableName: string,
    baseType: string
  ) => void
}

export default function QueryCanvas({
  tables,
  joins,
  onRemoveTable,
  onCreateJoin,
  onRemoveJoin,
  onEditJoin,
  onFieldDoubleClick,
}: QueryCanvasProps) {
  const [joinStartTable, setJoinStartTable] = useState<CanvasTable | null>(null)

  const { setNodeRef, isOver } = useDroppable({
    id: 'query-canvas',
  })

  const handleStartJoin = (tableId: string) => {
    const table = tables.find(t => t.id === tableId)
    if (table) {
      setJoinStartTable(table)
    }
  }

  const handleCompleteJoin = (targetTableId: string) => {
    if (joinStartTable && joinStartTable.id !== targetTableId) {
      const targetTable = tables.find(t => t.id === targetTableId)
      if (targetTable) {
        onCreateJoin(joinStartTable, targetTable)
      }
    }
    setJoinStartTable(null)
  }

  const handleCancelJoin = () => {
    setJoinStartTable(null)
  }

  return (
    <div
      ref={setNodeRef}
      className={clsx(
        'relative overflow-hidden h-full w-full transition-all duration-200',
        isOver ? 'bg-amber-50/50 ring-2 ring-inset ring-amber-400' : 'bg-gray-50/50'
      )}
      style={{
        backgroundImage: `
          radial-gradient(circle, #d1d5db 1px, transparent 1px)
        `,
        backgroundSize: '24px 24px',
        minHeight: '400px',
      }}
      onClick={handleCancelJoin}
    >
      {/* SVG layer for join lines */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        {joins.map((join) => {
          const sourceTable = tables.find(t => t.id === join.sourceTableId)
          const targetTable = tables.find(t => t.id === join.targetTableId)
          if (!sourceTable || !targetTable) return null

          return (
            <JoinLine
              key={join.id}
              join={join}
              sourcePosition={{
                x: sourceTable.position.x + 224, // table width
                y: sourceTable.position.y + 50,
              }}
              targetPosition={{
                x: targetTable.position.x,
                y: targetTable.position.y + 50,
              }}
              onRemove={() => onRemoveJoin(join.id)}
              onEdit={() => onEditJoin(join)}
            />
          )
        })}
      </svg>

      {/* Table nodes */}
      {tables.map((table) => (
        <TableNode
          key={table.id}
          table={table}
          onRemove={() => onRemoveTable(table.id)}
          onStartJoin={() => handleStartJoin(table.id)}
          onCompleteJoin={() => handleCompleteJoin(table.id)}
          onFieldDoubleClick={(fieldId, fieldName, baseType) =>
            onFieldDoubleClick(table.id, fieldId, fieldName, table.tableName, baseType)
          }
          isJoinSource={joinStartTable?.id === table.id}
          isJoinTarget={joinStartTable !== null && joinStartTable.id !== table.id}
        />
      ))}

      {/* Empty state */}
      {tables.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-amber-100 to-orange-100 rounded-2xl mb-4 shadow-sm">
              <Database className="w-10 h-10 text-amber-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-700 mb-1">Drop tables here</h3>
            <p className="text-sm text-gray-500 max-w-xs">
              Drag tables from the sidebar to start building your query
            </p>
            <div className="flex items-center justify-center gap-4 mt-6 text-xs text-gray-400">
              <span className="flex items-center gap-1.5">
                <MousePointer2 className="w-3.5 h-3.5" />
                Double-click field to add
              </span>
              <span className="flex items-center gap-1.5">
                <Link2 className="w-3.5 h-3.5" />
                Click link icon to join
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Drop indicator */}
      {isOver && tables.length > 0 && (
        <div className="absolute inset-4 border-2 border-dashed border-amber-400 rounded-xl pointer-events-none bg-amber-50/30" />
      )}

      {/* Join mode indicator */}
      {joinStartTable && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
          <div className="flex items-center gap-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white px-5 py-2.5 rounded-xl shadow-lg shadow-amber-500/25">
            <Link2 className="w-4 h-4" />
            <span className="text-sm">
              Click another table to join from <strong>{joinStartTable.tableName}</strong>
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); handleCancelJoin(); }}
              className="ml-1 px-2 py-0.5 text-xs bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
