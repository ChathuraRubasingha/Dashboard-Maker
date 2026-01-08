import type { MetabaseField } from './index'

// Position on the query canvas
export interface Position {
  x: number
  y: number
}

// Table placed on the canvas
export interface CanvasTable {
  id: string              // Unique canvas instance ID
  tableId: number         // Metabase table ID
  tableName: string       // Display name
  schemaName: string | null
  alias: string           // Table alias for query
  position: Position      // Position on canvas
  fields: MetabaseField[] // Available fields
  databaseId: number      // Parent database ID
}

// Join types supported
export type JoinType = 'inner' | 'left' | 'right' | 'full'

// Join definition between two tables
export interface JoinDefinition {
  id: string
  sourceTableId: string   // Canvas table ID (left side)
  targetTableId: string   // Canvas table ID (right side)
  sourceFieldId: number   // Field ID from source table
  targetFieldId: number   // Field ID from target table
  joinType: JoinType
}

// Aggregation types
export type AggregationType = 'none' | 'count' | 'sum' | 'avg' | 'min' | 'max'

// Selected column for query output
export interface SelectedColumn {
  id: string
  canvasTableId: string   // Which canvas table this comes from
  fieldId: number         // Metabase field ID
  fieldName: string       // Display name
  tableName: string       // Source table name
  baseType: string        // Data type (type/Integer, type/Text, etc.)
  aggregation: AggregationType
  alias?: string          // Custom column alias
}

// Filter operators by type
export type FilterOperator =
  | '='
  | '!='
  | '>'
  | '<'
  | '>='
  | '<='
  | 'contains'
  | 'starts-with'
  | 'ends-with'
  | 'is-null'
  | 'not-null'

// Filter condition
export interface FilterCondition {
  id: string
  canvasTableId: string
  fieldId: number
  fieldName: string
  tableName: string
  baseType: string
  operator: FilterOperator
  value: unknown
  logic: 'and' | 'or'     // How to combine with previous filter
}

// Order by direction
export type OrderDirection = 'asc' | 'desc'

// Order by definition
export interface OrderByField {
  id: string
  canvasTableId: string
  fieldId: number
  fieldName: string
  tableName: string
  direction: OrderDirection
}

// Drag item types for @dnd-kit
export type DragItemType = 'table' | 'field' | 'column'

export interface DragItem {
  type: DragItemType
  data: {
    // For table dragging
    tableId?: number
    tableName?: string
    schemaName?: string | null
    databaseId?: number
    fields?: MetabaseField[]
    // For field/column dragging
    canvasTableId?: string
    fieldId?: number
    fieldName?: string
    baseType?: string
    // For column reordering
    columnId?: string
  }
}

// Query builder state
export interface QueryBuilderState {
  // Database selection
  databaseId: number | null

  // Tables on canvas
  tables: CanvasTable[]

  // Joins between tables
  joins: JoinDefinition[]

  // Selected columns
  columns: SelectedColumn[]

  // Filter conditions
  filters: FilterCondition[]

  // Order by fields
  orderBy: OrderByField[]

  // Query limit
  limit: number

  // UI state
  activeJoinSource: { tableId: string; fieldId: number } | null
  isExecuting: boolean
  error: string | null

  // Query results
  queryResult: QueryResult | null
}

// Query result from execution
export interface QueryResult {
  data: {
    rows: unknown[][]
    cols: QueryResultColumn[]
  }
  row_count: number
  status: string
}

export interface QueryResultColumn {
  name: string
  display_name: string
  base_type: string
}

// Actions for the store
export interface QueryBuilderActions {
  // Database
  setDatabaseId: (id: number | null) => void

  // Tables
  addTable: (table: Omit<CanvasTable, 'id' | 'alias'>) => void
  removeTable: (tableId: string) => void
  updateTablePosition: (tableId: string, position: Position) => void

  // Joins
  addJoin: (join: Omit<JoinDefinition, 'id'>) => void
  updateJoin: (joinId: string, updates: Partial<JoinDefinition>) => void
  removeJoin: (joinId: string) => void
  setActiveJoinSource: (source: { tableId: string; fieldId: number } | null) => void

  // Columns
  addColumn: (column: Omit<SelectedColumn, 'id'>) => void
  updateColumn: (columnId: string, updates: Partial<SelectedColumn>) => void
  removeColumn: (columnId: string) => void
  reorderColumns: (fromIndex: number, toIndex: number) => void

  // Filters
  addFilter: (filter: Omit<FilterCondition, 'id'>) => void
  updateFilter: (filterId: string, updates: Partial<FilterCondition>) => void
  removeFilter: (filterId: string) => void

  // Order by
  addOrderBy: (orderBy: Omit<OrderByField, 'id'>) => void
  updateOrderBy: (orderById: string, updates: Partial<OrderByField>) => void
  removeOrderBy: (orderById: string) => void

  // Limit
  setLimit: (limit: number) => void

  // Execution
  setExecuting: (isExecuting: boolean) => void
  setError: (error: string | null) => void
  setQueryResult: (result: QueryResult | null) => void

  // Build MBQL query
  buildMBQLQuery: () => { database: number; type: 'query'; query: Record<string, unknown> } | null

  // Reset
  reset: () => void
}

// Helper to get operators for a field type
export function getOperatorsForType(baseType: string): FilterOperator[] {
  const numericTypes = ['type/Integer', 'type/Float', 'type/Decimal', 'type/BigInteger']
  const textTypes = ['type/Text', 'type/TextLike']
  const dateTypes = ['type/DateTime', 'type/Date', 'type/Time']

  const baseOperators: FilterOperator[] = ['=', '!=', 'is-null', 'not-null']

  if (numericTypes.some(t => baseType.includes(t))) {
    return [...baseOperators, '>', '<', '>=', '<=']
  }

  if (textTypes.some(t => baseType.includes(t))) {
    return [...baseOperators, 'contains', 'starts-with', 'ends-with']
  }

  if (dateTypes.some(t => baseType.includes(t))) {
    return [...baseOperators, '>', '<', '>=', '<=']
  }

  return baseOperators
}

// Helper to check if aggregation is valid for field type
export function canAggregate(baseType: string): boolean {
  const numericTypes = ['type/Integer', 'type/Float', 'type/Decimal', 'type/BigInteger', 'type/Number']
  return numericTypes.some(t => baseType.includes(t))
}

// Operator display labels
export const operatorLabels: Record<FilterOperator, string> = {
  '=': 'equals',
  '!=': 'not equals',
  '>': 'greater than',
  '<': 'less than',
  '>=': 'greater or equal',
  '<=': 'less or equal',
  'contains': 'contains',
  'starts-with': 'starts with',
  'ends-with': 'ends with',
  'is-null': 'is empty',
  'not-null': 'is not empty',
}

// Aggregation display labels
export const aggregationLabels: Record<AggregationType, string> = {
  'none': 'No aggregation',
  'count': 'Count',
  'sum': 'Sum',
  'avg': 'Average',
  'min': 'Minimum',
  'max': 'Maximum',
}

// Join type display labels
export const joinTypeLabels: Record<JoinType, string> = {
  'inner': 'Inner Join',
  'left': 'Left Join',
  'right': 'Right Join',
  'full': 'Full Outer Join',
}
