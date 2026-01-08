import { create } from 'zustand'
import type {
  QueryBuilderState,
  QueryBuilderActions,
  CanvasTable,
  JoinDefinition,
  SelectedColumn,
  FilterCondition,
  OrderByField,
} from '../types/queryBuilder'

// Generate unique IDs
const generateId = () => Math.random().toString(36).substring(2, 11)

// Generate table alias (t1, t2, etc.)
const generateAlias = (tables: CanvasTable[]): string => {
  const usedAliases = new Set(tables.map(t => t.alias))
  let i = 1
  while (usedAliases.has(`t${i}`)) i++
  return `t${i}`
}

const initialState: QueryBuilderState = {
  databaseId: null,
  tables: [],
  joins: [],
  columns: [],
  filters: [],
  orderBy: [],
  limit: 100,
  activeJoinSource: null,
  isExecuting: false,
  error: null,
  queryResult: null,
}

export const useQueryBuilderStore = create<QueryBuilderState & QueryBuilderActions>((set, get) => ({
  ...initialState,

  // Database
  setDatabaseId: (id) => set({ databaseId: id }),

  // Tables
  addTable: (tableData) => {
    const tables = get().tables
    const newTable: CanvasTable = {
      ...tableData,
      id: generateId(),
      alias: generateAlias(tables),
    }
    set({ tables: [...tables, newTable] })
  },

  removeTable: (tableId) => {
    const state = get()
    // Remove related joins
    const joins = state.joins.filter(
      j => j.sourceTableId !== tableId && j.targetTableId !== tableId
    )
    // Remove related columns
    const columns = state.columns.filter(c => c.canvasTableId !== tableId)
    // Remove related filters
    const filters = state.filters.filter(f => f.canvasTableId !== tableId)
    // Remove related order by
    const orderBy = state.orderBy.filter(o => o.canvasTableId !== tableId)
    // Remove table
    const tables = state.tables.filter(t => t.id !== tableId)

    set({ tables, joins, columns, filters, orderBy })
  },

  updateTablePosition: (tableId, position) => {
    set(state => ({
      tables: state.tables.map(t =>
        t.id === tableId ? { ...t, position } : t
      ),
    }))
  },

  // Joins
  addJoin: (joinData) => {
    const newJoin: JoinDefinition = {
      ...joinData,
      id: generateId(),
    }
    set(state => ({ joins: [...state.joins, newJoin] }))
  },

  updateJoin: (joinId, updates) => {
    set(state => ({
      joins: state.joins.map(j =>
        j.id === joinId ? { ...j, ...updates } : j
      ),
    }))
  },

  removeJoin: (joinId) => {
    set(state => ({
      joins: state.joins.filter(j => j.id !== joinId),
    }))
  },

  setActiveJoinSource: (source) => set({ activeJoinSource: source }),

  // Columns
  addColumn: (columnData) => {
    const newColumn: SelectedColumn = {
      ...columnData,
      id: generateId(),
    }
    set(state => ({ columns: [...state.columns, newColumn] }))
  },

  updateColumn: (columnId, updates) => {
    set(state => ({
      columns: state.columns.map(c =>
        c.id === columnId ? { ...c, ...updates } : c
      ),
    }))
  },

  removeColumn: (columnId) => {
    set(state => ({
      columns: state.columns.filter(c => c.id !== columnId),
    }))
  },

  reorderColumns: (fromIndex, toIndex) => {
    set(state => {
      const columns = [...state.columns]
      const [removed] = columns.splice(fromIndex, 1)
      columns.splice(toIndex, 0, removed)
      return { columns }
    })
  },

  // Filters
  addFilter: (filterData) => {
    const newFilter: FilterCondition = {
      ...filterData,
      id: generateId(),
    }
    set(state => ({ filters: [...state.filters, newFilter] }))
  },

  updateFilter: (filterId, updates) => {
    set(state => ({
      filters: state.filters.map(f =>
        f.id === filterId ? { ...f, ...updates } : f
      ),
    }))
  },

  removeFilter: (filterId) => {
    set(state => ({
      filters: state.filters.filter(f => f.id !== filterId),
    }))
  },

  // Order by
  addOrderBy: (orderByData) => {
    const newOrderBy: OrderByField = {
      ...orderByData,
      id: generateId(),
    }
    set(state => ({ orderBy: [...state.orderBy, newOrderBy] }))
  },

  updateOrderBy: (orderById, updates) => {
    set(state => ({
      orderBy: state.orderBy.map(o =>
        o.id === orderById ? { ...o, ...updates } : o
      ),
    }))
  },

  removeOrderBy: (orderById) => {
    set(state => ({
      orderBy: state.orderBy.filter(o => o.id !== orderById),
    }))
  },

  // Limit
  setLimit: (limit) => set({ limit }),

  // Execution
  setExecuting: (isExecuting) => set({ isExecuting }),
  setError: (error) => set({ error }),
  setQueryResult: (queryResult) => set({ queryResult }),

  // Build MBQL query
  buildMBQLQuery: () => {
    const state = get()
    const { tables, joins, columns, filters, orderBy, limit, databaseId } = state

    if (tables.length === 0 || !databaseId) {
      return null
    }

    const primaryTable = tables[0]

    // Build the query object
    const query: Record<string, unknown> = {
      'source-table': primaryTable.tableId,
    }

    // Add joins
    if (joins.length > 0) {
      query.joins = joins.map(join => {
        const targetTable = tables.find(t => t.id === join.targetTableId)
        if (!targetTable) return null

        return {
          'source-table': targetTable.tableId,
          alias: targetTable.alias,
          condition: [
            '=',
            ['field', join.sourceFieldId, null],
            ['field', join.targetFieldId, { 'join-alias': targetTable.alias }],
          ],
          fields: 'all',
        }
      }).filter(Boolean)
    }

    // Separate aggregated and non-aggregated columns
    const aggregatedColumns = columns.filter(c => c.aggregation !== 'none')
    const breakoutColumns = columns.filter(c => c.aggregation === 'none')

    // Add aggregations
    if (aggregatedColumns.length > 0) {
      query.aggregation = aggregatedColumns.map(col => {
        const table = tables.find(t => t.id === col.canvasTableId)
        const fieldOptions = table && table.id !== primaryTable.id
          ? { 'join-alias': table.alias }
          : null

        if (col.aggregation === 'count') {
          return ['count']
        }

        return [col.aggregation, ['field', col.fieldId, fieldOptions]]
      })
    }

    // Add breakouts (GROUP BY)
    if (breakoutColumns.length > 0) {
      query.breakout = breakoutColumns.map(col => {
        const table = tables.find(t => t.id === col.canvasTableId)
        const fieldOptions = table && table.id !== primaryTable.id
          ? { 'join-alias': table.alias }
          : null

        return ['field', col.fieldId, fieldOptions]
      })
    }

    // Add filters
    if (filters.length > 0) {
      const filterClauses = filters.map((filter) => {
        const table = tables.find(t => t.id === filter.canvasTableId)
        const fieldOptions = table && table.id !== primaryTable.id
          ? { 'join-alias': table.alias }
          : null

        const fieldRef = ['field', filter.fieldId, fieldOptions]

        // Handle null checks
        if (filter.operator === 'is-null') {
          return ['is-null', fieldRef]
        }
        if (filter.operator === 'not-null') {
          return ['not-null', fieldRef]
        }

        // Handle other operators
        return [filter.operator, fieldRef, filter.value]
      })

      if (filterClauses.length === 1) {
        query.filter = filterClauses[0]
      } else {
        // Combine with AND/OR logic
        // For simplicity, using AND for all for now
        query.filter = ['and', ...filterClauses]
      }
    }

    // Add order by
    if (orderBy.length > 0) {
      query['order-by'] = orderBy.map(o => {
        const table = tables.find(t => t.id === o.canvasTableId)
        const fieldOptions = table && table.id !== primaryTable.id
          ? { 'join-alias': table.alias }
          : null

        return [o.direction, ['field', o.fieldId, fieldOptions]]
      })
    }

    // Add limit
    if (limit > 0) {
      query.limit = limit
    }

    return {
      database: databaseId,
      type: 'query',
      query,
    }
  },

  // Reset
  reset: () => set(initialState),
}))
