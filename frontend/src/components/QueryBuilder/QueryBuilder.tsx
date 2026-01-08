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
import ResultsPanel from './ResultsPanel'
import JoinConfigModal from './JoinConfigModal'


export default function QueryBuilder() {
  const [activeItem, setActiveItem] = useState<DragItem | null>(null)
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
      <div className="flex flex-col h-full bg-gray-50">
        {/* Main content area */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left sidebar - Table selector */}
          <div className="w-64 flex-shrink-0">
            <TableSelector />
          </div>

          {/* Center - Query Canvas */}
          <div className="flex-1 flex flex-col min-w-0">
            <div className="flex-1 min-h-[300px]">
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

            {/* Bottom panels */}
            <div className="h-64 flex border-t border-gray-200">
              {/* Column panel */}
              <div className="w-72 flex-shrink-0">
                <ColumnPanel
                  columns={columns}
                  onUpdateColumn={updateColumn}
                  onRemoveColumn={removeColumn}
                />
              </div>

              {/* Filter panel */}
              <div className="w-80 flex-shrink-0 border-l border-gray-200">
                <FilterPanel
                  filters={filters}
                  tables={tables}
                  onAddFilter={addFilter}
                  onUpdateFilter={updateFilter}
                  onRemoveFilter={removeFilter}
                />
              </div>

              {/* Results panel */}
              <div className="flex-1 border-l border-gray-200">
                <ResultsPanel
                  queryResult={queryResult}
                  isExecuting={isExecuting}
                  error={error}
                  mbqlPreview={mbqlPreview}
                  onExecute={handleExecuteQuery}
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
    </DndContext>
  )
}
