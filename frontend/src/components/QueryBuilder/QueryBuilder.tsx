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
import { Play, Table, Columns, Filter, X, Sparkles, GripVertical, AlertCircle, PanelLeftClose, PanelLeft } from 'lucide-react'

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
  const [isTableSelectorOpen, setIsTableSelectorOpen] = useState(true)
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
      <div className="flex flex-col h-full bg-gradient-to-br from-gray-50 to-amber-50/30">
        {/* Modern toolbar with backdrop blur */}
        <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-gray-200/80">
          <div className="flex items-center justify-between h-16 px-4 lg:px-6">
            <div className="flex items-center gap-4">
              {/* Amber gradient icon */}
              <div className="p-2.5 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl shadow-lg shadow-amber-500/25">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">Query Builder</h1>
                <p className="text-xs text-gray-500">Visual query designer</p>
              </div>

              {/* Stats badges */}
              <div className="hidden sm:flex items-center gap-2 ml-4 pl-4 border-l border-gray-200">
                {tables.length > 0 && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-blue-50 text-blue-700 rounded-full border border-blue-200">
                    <Table className="w-3 h-3" />
                    {tables.length} table{tables.length !== 1 ? 's' : ''}
                  </span>
                )}
                {columns.length > 0 && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200">
                    <Columns className="w-3 h-3" />
                    {columns.length} column{columns.length !== 1 ? 's' : ''}
                  </span>
                )}
                {filters.length > 0 && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-orange-50 text-orange-700 rounded-full border border-orange-200">
                    <Filter className="w-3 h-3" />
                    {filters.length} filter{filters.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>

            {/* Run Query button with amber gradient */}
            <button
              onClick={() => {
                handleExecuteQuery()
                setIsResultsModalOpen(true)
              }}
              disabled={isExecuting}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl hover:from-amber-600 hover:to-orange-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-amber-500/25 transition-all hover:shadow-xl hover:shadow-amber-500/30 hover:-translate-y-0.5"
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
                  <Play className="w-4 h-4" fill="currentColor" />
                  Run Query
                </>
              )}
            </button>
          </div>
        </div>

        {/* Error banner with modern styling */}
        {error && (
          <div className="mx-4 lg:mx-6 mt-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-3 shadow-sm">
            <div className="p-1.5 bg-red-100 rounded-lg">
              <AlertCircle className="w-4 h-4 text-red-600" />
            </div>
            <span className="text-sm flex-1">{error}</span>
            <button
              onClick={() => setError(null)}
              className="p-1.5 hover:bg-red-100 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Main content area */}
        <div className="flex flex-1 overflow-hidden p-3 gap-3">
          {/* Left sidebar - Table selector (collapsible) */}
          {isTableSelectorOpen && (
            <div className="w-64 flex-shrink-0 bg-white rounded-xl shadow-sm border border-gray-200/80 overflow-hidden">
              <TableSelector />
            </div>
          )}

          {/* Center - Query Canvas */}
          <div className="flex-1 flex flex-col min-w-0 gap-3">
            {/* Canvas with toggle button */}
            <div className="flex-1 min-h-[300px] bg-white rounded-xl shadow-sm border border-gray-200/80 overflow-hidden relative">
              {/* Toggle sidebar button */}
              <button
                onClick={() => setIsTableSelectorOpen(!isTableSelectorOpen)}
                className="absolute top-3 left-3 z-10 p-2 bg-white/90 hover:bg-gray-100 rounded-lg border border-gray-200 shadow-sm transition-colors"
                title={isTableSelectorOpen ? 'Hide tables panel' : 'Show tables panel'}
              >
                {isTableSelectorOpen ? (
                  <PanelLeftClose className="w-4 h-4 text-gray-600" />
                ) : (
                  <PanelLeft className="w-4 h-4 text-gray-600" />
                )}
              </button>
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
            <div className="flex gap-3 h-56">
              {/* Column panel */}
              <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200/80 overflow-hidden">
                <ColumnPanel
                  columns={columns}
                  onUpdateColumn={updateColumn}
                  onRemoveColumn={removeColumn}
                />
              </div>

              {/* Filter panel */}
              <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200/80 overflow-hidden">
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

      {/* Modern drag overlay */}
      <DragOverlay>
        {activeItem && (
          <div className="inline-flex items-center gap-2 px-3 py-2 bg-white border-2 border-amber-400 rounded-xl shadow-xl text-sm">
            <GripVertical className="w-3.5 h-3.5 text-amber-500" />
            {activeItem.type === 'table' && (
              <span className="font-medium text-gray-900">{activeItem.data.tableName}</span>
            )}
            {activeItem.type === 'field' && (
              <span>
                <span className="text-gray-400">{activeItem.data.tableName}.</span>
                <span className="font-medium text-gray-900">{activeItem.data.fieldName}</span>
              </span>
            )}
            {activeItem.type === 'column' && (
              <span className="font-medium text-gray-900">{activeItem.data.fieldName}</span>
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
