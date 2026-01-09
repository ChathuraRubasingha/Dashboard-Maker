import { useState, useCallback } from 'react'
import {
  DndContext,
  DragOverlay,
  DragStartEvent,
  DragEndEvent,
  closestCenter,
  useSensor,
  useSensors,
  PointerSensor,
  MouseSensor,
} from '@dnd-kit/core'

import { useQueryBuilderStore } from '../../store/queryBuilderStore'
import { metabaseService } from '../../services/metabaseService'
import type { DragItem, CanvasTable, JoinDefinition, Position } from '../../types/queryBuilder'
import type { MBQLQuery } from '../../types'
import TableSelector from './TableSelector'
import QueryCanvas from './QueryCanvas'
import ColumnPanel from './ColumnPanel'
import FilterPanel from './FilterPanel'
import ResultsModal from './ResultsModal'
import JoinConfigModal from './JoinConfigModal'


export default function QueryBuilder() {
  const [activeItem, setActiveItem] = useState<DragItem | null>(null)
  const [isResultsModalOpen, setIsResultsModalOpen] = useState(false)
  const [joinModalState, setJoinModalState] = useState<{
    isOpen: boolean
    sourceTable: CanvasTable | null
    targetTable: CanvasTable | null
    existingJoin?: JoinDefinition
  }>({
    isOpen: false,
    sourceTable: null,
    targetTable: null,
  })

  // Configure drag sensors with lower activation distance
  const pointerSensor = useSensor(PointerSensor, {
    activationConstraint: {
      distance: 5, // Start drag after 5px movement
    },
  })
  const mouseSensor = useSensor(MouseSensor, {
    activationConstraint: {
      distance: 5,
    },
  })
  const sensors = useSensors(pointerSensor, mouseSensor)

  // Store state
  const {
    databaseId,
    tables,
    joins,
    columns,
    filters,
    
    
    isExecuting,
    error,
    queryResult,
    setDatabaseId,
    addTable,
    removeTable,
    addJoin,
    updateJoin,
    removeJoin,
    addColumn,
    updateColumn,
    removeColumn,
    reorderColumns,
    addFilter,
    updateFilter,
    removeFilter,
    
    
    
    
    setExecuting,
    setError,
    setQueryResult,
    buildMBQLQuery,
  } = useQueryBuilderStore()

  // Handle drag start
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event
    const dragData = active.data.current as DragItem
    setActiveItem(dragData)
  }, [])

  // Handle drag end
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    setActiveItem(null)

    console.log('Drag end:', { active: active.id, over: over?.id, dragData: active.data.current })

    if (!over) {
      console.log('No drop target detected')
      return
    }

    const dragData = active.data.current as DragItem

    // Dropping a table onto the canvas
    if (dragData.type === 'table' && over.id === 'query-canvas') {
      console.log('Dropping table on canvas:', dragData)
      const { tableId, tableName, schemaName, databaseId: dbId, fields } = dragData.data

      if (!tableId || !tableName || !dbId || !fields) return

      // Check if table already on canvas
      const existingTable = tables.find(t => t.tableId === tableId)
      if (existingTable) {
        setError(`Table "${tableName}" is already on the canvas`)
        return
      }

      // Set database ID if not set
      if (!databaseId) {
        setDatabaseId(dbId)
      } else if (databaseId !== dbId) {
        setError('All tables must be from the same database')
        return
      }

      // Calculate position - place to the right of existing tables
      const maxX = tables.reduce((max, t) => Math.max(max, t.position.x + 250), 50)
      const position: Position = { x: maxX, y: 100 }

      addTable({
        tableId,
        tableName,
        schemaName: schemaName || null,
        position,
        fields,
        databaseId: dbId,
      })
    }

    // Dropping a field onto the column panel
    if (dragData.type === 'field' && over.id === 'column-panel') {
      const { canvasTableId, fieldId, fieldName, tableName: tblName, baseType } = dragData.data

      if (!canvasTableId || !fieldId || !fieldName || !tblName || !baseType) return

      // Check if column already added
      const existingColumn = columns.find(
        c => c.canvasTableId === canvasTableId && c.fieldId === fieldId
      )
      if (existingColumn) {
        setError(`Column "${fieldName}" is already selected`)
        return
      }

      addColumn({
        canvasTableId,
        fieldId,
        fieldName,
        tableName: tblName,
        baseType,
        aggregation: 'none',
      })
    }

    // Reordering columns
    if (dragData.type === 'column' && active.id !== over.id) {
      const oldIndex = columns.findIndex(c => c.id === active.id)
      const newIndex = columns.findIndex(c => c.id === over.id)
      if (oldIndex !== -1 && newIndex !== -1) {
        reorderColumns(oldIndex, newIndex)
      }
    }
  }, [tables, columns, databaseId, addTable, addColumn, reorderColumns, setDatabaseId, setError])

  // Handle double-click on field to add column
  const handleFieldDoubleClick = useCallback((
    canvasTableId: string,
    fieldId: number,
    fieldName: string,
    tableName: string,
    baseType: string
  ) => {
    const existingColumn = columns.find(
      c => c.canvasTableId === canvasTableId && c.fieldId === fieldId
    )
    if (!existingColumn) {
      addColumn({
        canvasTableId,
        fieldId,
        fieldName,
        tableName,
        baseType,
        aggregation: 'none',
      })
    }
  }, [columns, addColumn])

  // Handle creating a join
  const handleCreateJoin = useCallback((sourceTable: CanvasTable, targetTable: CanvasTable) => {
    setJoinModalState({
      isOpen: true,
      sourceTable,
      targetTable,
    })
  }, [])

  // Handle editing a join
  const handleEditJoin = useCallback((join: JoinDefinition) => {
    const sourceTable = tables.find(t => t.id === join.sourceTableId) || null
    const targetTable = tables.find(t => t.id === join.targetTableId) || null
    setJoinModalState({
      isOpen: true,
      sourceTable,
      targetTable,
      existingJoin: join,
    })
  }, [tables])

  // Handle saving a join
  const handleSaveJoin = useCallback((joinData: Omit<JoinDefinition, 'id'>) => {
    if (joinModalState.existingJoin) {
      updateJoin(joinModalState.existingJoin.id, joinData)
    } else {
      addJoin(joinData)
    }
  }, [joinModalState.existingJoin, addJoin, updateJoin])

  // Execute query
  const handleExecuteQuery = useCallback(async () => {
    const query = buildMBQLQuery()
    if (!query) {
      setError('Please add at least one table and select columns')
      return
    }

    setExecuting(true)
    setError(null)

    try {
      const result = await metabaseService.executeQuery(query as unknown as { database: number; type: "query" | "native"; query?: MBQLQuery })
      setQueryResult(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Query execution failed')
    } finally {
      setExecuting(false)
    }
  }, [buildMBQLQuery, setExecuting, setError, setQueryResult])

  // Get MBQL preview
  const mbqlPreview = buildMBQLQuery()

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      collisionDetection={closestCenter}
    >
      <div className="flex flex-col h-full bg-gray-100">
        {/* Top toolbar */}
        <div className="px-4 py-3 bg-white border-b border-gray-200 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold text-gray-800">Query Builder</h1>
            {tables.length > 0 && (
              <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">
                {tables.length} table{tables.length !== 1 ? 's' : ''}
              </span>
            )}
            {columns.length > 0 && (
              <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full">
                {columns.length} column{columns.length !== 1 ? 's' : ''}
              </span>
            )}
            {filters.length > 0 && (
              <span className="px-2 py-1 text-xs font-medium bg-orange-100 text-orange-700 rounded-full">
                {filters.length} filter{filters.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          <button
            onClick={() => {
              handleExecuteQuery()
              setIsResultsModalOpen(true)
            }}
            disabled={isExecuting}
            className="px-5 py-2.5 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm transition-all hover:shadow-md"
          >
            {isExecuting ? (
              <>
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Running...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
                Run Query
              </>
            )}
          </button>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mx-4 mt-3 px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center gap-3">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm">{error}</span>
            <button
              onClick={() => setError(null)}
              className="ml-auto p-1 hover:bg-red-100 rounded"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Main content area */}
        <div className="flex flex-1 overflow-hidden p-4 gap-4">
          {/* Left sidebar - Table selector */}
          <div className="w-72 flex-shrink-0 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <TableSelector />
          </div>

          {/* Center - Query Canvas */}
          <div className="flex-1 flex flex-col min-w-0 gap-4">
            <div className="flex-1 min-h-[350px] bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <QueryCanvas
                tables={tables}
                joins={joins}
                onRemoveTable={removeTable}
                onCreateJoin={handleCreateJoin}
                onEditJoin={handleEditJoin}
                onRemoveJoin={removeJoin}
                onFieldDoubleClick={handleFieldDoubleClick}
              />
            </div>

            {/* Bottom panels - side by side */}
            <div className="flex gap-4 h-72">
              {/* Column panel */}
              <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <ColumnPanel
                  columns={columns}
                  onUpdateColumn={updateColumn}
                  onRemoveColumn={removeColumn}
                />
              </div>

              {/* Filter panel */}
              <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <FilterPanel
                  filters={filters}
                  tables={tables}
                  onAddFilter={addFilter}
                  onUpdateFilter={updateFilter}
                  onRemoveFilter={removeFilter}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Drag overlay */}
      <DragOverlay>
        {activeItem && (
          <div className="px-3 py-2 bg-white border border-blue-500 rounded shadow-lg text-sm">
            {activeItem.type === 'table' && (
              <span className="font-medium">{activeItem.data.tableName}</span>
            )}
            {activeItem.type === 'field' && (
              <span>
                <span className="text-gray-500">{activeItem.data.tableName}.</span>
                <span className="font-medium">{activeItem.data.fieldName}</span>
              </span>
            )}
            {activeItem.type === 'column' && (
              <span className="font-medium">{activeItem.data.fieldName}</span>
            )}
          </div>
        )}
      </DragOverlay>

      {/* Join configuration modal */}
      <JoinConfigModal
        isOpen={joinModalState.isOpen}
        onClose={() => setJoinModalState({ isOpen: false, sourceTable: null, targetTable: null })}
        onSave={handleSaveJoin}
        sourceTable={joinModalState.sourceTable}
        targetTable={joinModalState.targetTable}
        existingJoin={joinModalState.existingJoin}
        tables={tables}
      />

      {/* Results modal */}
      <ResultsModal
        isOpen={isResultsModalOpen}
        onClose={() => setIsResultsModalOpen(false)}
        queryResult={queryResult}
        isExecuting={isExecuting}
        error={error}
        mbqlPreview={mbqlPreview}
        databaseId={databaseId}
      />
    </DndContext>
  )
}
