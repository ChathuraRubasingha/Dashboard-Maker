import { useState } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { Database } from 'lucide-react'
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
        'relative bg-gray-50 overflow-hidden h-full w-full',
        isOver && 'ring-2 ring-inset ring-blue-400 bg-blue-50/30'
      )}
      style={{
        backgroundImage: `
          linear-gradient(to right, #e5e7eb 1px, transparent 1px),
          linear-gradient(to bottom, #e5e7eb 1px, transparent 1px)
        `,
        backgroundSize: '20px 20px',
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
        <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
          <Database className="w-12 h-12 mb-3" />
          <p className="text-lg font-medium">Drag tables here</p>
          <p className="text-sm">Drop tables from the sidebar to start building your query</p>
        </div>
      )}

      {/* Drop indicator */}
      {isOver && tables.length > 0 && (
        <div className="absolute inset-4 border-2 border-dashed border-blue-400 rounded-lg pointer-events-none" />
      )}

      {/* Join mode indicator */}
      {joinStartTable && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg text-sm z-10">
          Click another table to create a join from <strong>{joinStartTable.tableName}</strong>
          <button
            onClick={(e) => { e.stopPropagation(); handleCancelJoin(); }}
            className="ml-3 text-blue-200 hover:text-white"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  )
}
