// Dashboard types
export interface LayoutConfig {
  columns: number
  row_height: number
  margin: [number, number]
  container_padding: [number, number]
  breakpoints: {
    lg: number
    md: number
    sm: number
    xs: number
  }
}

export interface CardStyling {
  border_radius: number
  border_color: string
  border_width: number
  shadow: string
  background_color: string
  padding: number
}

export interface DashboardCard {
  id: number
  dashboard_id: number
  metabase_question_id: number | null
  visualization_id: number | null
  position_x: number
  position_y: number
  width: number
  height: number
  z_index: number
  custom_styling: CardStyling | null
  title_override: string | null
  show_title: boolean
  filter_mappings: FilterMapping[]
  responsive_layouts: Record<string, unknown>
  created_at: string
  updated_at: string | null
}

export interface FilterMapping {
  filter_id: number
  field_id: number
  parameter_id: string
}

export interface DashboardFilter {
  id: number
  dashboard_id: number
  name: string
  display_name: string
  filter_type: 'text' | 'number' | 'date' | 'dropdown'
  default_value: unknown
  options: unknown[]
  options_query_id: number | null
  position: number
  width: string
  is_required: boolean
  date_range_type: string | null
  created_at: string
  updated_at: string | null
}

export interface Dashboard {
  id: number
  name: string
  description: string | null
  metabase_dashboard_id: number | null
  layout_config: LayoutConfig
  theme: string
  custom_css: string | null
  background_color: string
  global_filters: unknown[]
  is_public: boolean
  public_uuid: string | null
  is_archived: boolean
  created_at: string
  updated_at: string | null
  cards: DashboardCard[]
  filters: DashboardFilter[]
}

export interface DashboardCreate {
  name: string
  description?: string
  metabase_dashboard_id?: number
  layout_config?: Partial<LayoutConfig>
  theme?: string
  custom_css?: string
  background_color?: string
  global_filters?: unknown[]
  is_public?: boolean
}

export interface DashboardUpdate extends Partial<DashboardCreate> {
  is_archived?: boolean
}

export interface DashboardCardCreate {
  metabase_question_id?: number
  visualization_id?: number
  position_x?: number
  position_y?: number
  width?: number
  height?: number
  z_index?: number
  custom_styling?: Partial<CardStyling>
  title_override?: string
  show_title?: boolean
  filter_mappings?: FilterMapping[]
  responsive_layouts?: Record<string, unknown>
}

export interface DashboardCardUpdate extends Partial<DashboardCardCreate> {}

// Visualization types
export interface VisualizationCustomization {
  id: number
  visualization_id: number
  custom_colors: string[]
  color_palette_name: string
  custom_labels: Record<string, string>
  x_axis_label: string | null
  y_axis_label: string | null
  x_axis_format: string | null
  y_axis_format: string | null
  show_legend: boolean
  legend_position: string
  show_grid: boolean
  grid_color: string
  show_data_labels: boolean
  data_label_format: string | null
  goal_lines: GoalLine[]
  reference_lines: ReferenceLine[]
  hidden_columns: string[]
  column_order: string[]
  column_widths: Record<string, number>
  conditional_formatting: ConditionalFormat[]
  enable_animations: boolean
  created_at: string
  updated_at: string | null
}

export interface GoalLine {
  value: number
  label: string
  color: string
}

export interface ReferenceLine {
  value: number
  label: string
  color: string
  axis: 'x' | 'y'
}

export interface ConditionalFormat {
  column: string
  condition: string
  value: unknown
  color: string
  backgroundColor: string
}

export interface Visualization {
  id: number
  name: string
  description: string | null
  metabase_question_id: number | null
  database_id: number | null
  query_type: 'native' | 'mbql'
  native_query: string | null
  mbql_query: MBQLQuery | null
  visualization_type: VisualizationType
  visualization_settings: Record<string, unknown>
  is_archived: boolean
  is_query_locked: boolean
  collection_id: number | null
  created_at: string
  updated_at: string | null
  customization: VisualizationCustomization | null
}

export type VisualizationType = 'table' | 'bar' | 'line' | 'area' | 'pie' | 'scatter' | 'funnel' | 'gauge'

export interface VisualizationCreate {
  name: string
  description?: string
  metabase_question_id?: number
  database_id?: number
  query_type?: 'native' | 'mbql'
  native_query?: string
  mbql_query?: object  // Full dataset query object: { database, type, query: MBQLQuery }
  visualization_type?: VisualizationType
  visualization_settings?: Record<string, unknown>
  customization?: Partial<VisualizationCustomization>
}

export interface VisualizationUpdate extends Partial<VisualizationCreate> {
  is_archived?: boolean
  is_query_locked?: boolean
  collection_id?: number
}

// MBQL Query types
export interface MBQLQuery {
  'source-table': number
  aggregation?: Aggregation[]
  breakout?: Breakout[]
  filter?: Filter
  'order-by'?: OrderBy[]
  limit?: number
  joins?: Join[]
}

export type Aggregation = ['count'] | ['sum', FieldRef] | ['avg', FieldRef] | ['max', FieldRef] | ['min', FieldRef]

export type FieldRef = ['field', number, FieldOptions | null]

export interface FieldOptions {
  'join-alias'?: string
  'source-field'?: number
}

export type Breakout = FieldRef

export type Filter = SimpleFilter | CompoundFilter

export type SimpleFilter = ['=' | '!=' | '>' | '<' | '>=' | '<=', FieldRef, unknown]

export type CompoundFilter = ['and' | 'or', ...Filter[]]

export type OrderBy = ['asc' | 'desc', FieldRef]

export interface Join {
  'source-table': number
  alias: string
  condition: Filter
  fields: 'all' | FieldRef[]
}

// Metabase types
export interface MetabaseDatabase {
  id: number
  name: string
  engine: string
  description: string | null
  is_sample: boolean
  tables: MetabaseTable[]
}

export interface MetabaseTable {
  id: number
  name: string
  display_name: string
  schema: string | null
  description: string | null
  db_id: number
  fields: MetabaseField[]
}

export interface MetabaseField {
  id: number
  name: string
  display_name: string
  base_type: string
  semantic_type: string | null
  description: string | null
  table_id: number
  fk_target_field_id: number | null
}

export interface MetabaseQuestion {
  id: number
  name: string
  display: string
  description: string | null
  dataset_query: MetabaseDatasetQuery
  visualization_settings: Record<string, unknown>
  collection_id: number | null
  created_at: string | null
  updated_at: string | null
}

export interface MetabaseDatasetQuery {
  database: number
  type: 'native' | 'query'
  native?: { query: string }
  query?: MBQLQuery
}

export interface MetabaseDashboard {
  id: number
  name: string
  description: string | null
  collection_id: number | null
  parameters: MetabaseParameter[]
  dashcards: MetabaseDashcard[]
  created_at: string | null
  updated_at: string | null
}

export interface MetabaseParameter {
  id: string
  name: string
  slug: string
  type: string
  default?: unknown
}

export interface MetabaseDashcard {
  id: number
  card_id: number
  row: number
  col: number
  size_x: number
  size_y: number
  parameter_mappings: ParameterMapping[]
}

export interface ParameterMapping {
  parameter_id: string
  card_id: number
  target: ['dimension', FieldRef]
}

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

// Grid Layout types (for react-grid-layout)
export interface GridLayout {
  i: string
  x: number
  y: number
  w: number
  h: number
  minW?: number
  minH?: number
  maxW?: number
  maxH?: number
  static?: boolean
}

export interface GridLayouts {
  lg: GridLayout[]
  md: GridLayout[]
  sm: GridLayout[]
  xs: GridLayout[]
}

// Report types
export type BlockType = 'text' | 'visualization' | 'table' | 'divider'

export interface TextBlockStyle {
  fontSize: number
  fontWeight: 'normal' | 'bold'
  fontStyle?: 'normal' | 'italic'
  textAlign: 'left' | 'center' | 'right'
  color: string
}

export interface TextBlockConfig {
  content: string
  style: TextBlockStyle
}

export interface VisualizationBlockConfig {
  visualization_id: number
  show_title: boolean
  show_description: boolean
  height: number
}

export interface TableBlockConfig {
  visualization_id: number
  show_title: boolean
  export_all_rows: boolean
  max_preview_rows: number
}

export interface DividerBlockConfig {
  style: 'solid' | 'dashed' | 'dotted'
  color: string
  margin: number
}

export interface ReportBlock {
  id: string
  type: BlockType
  order: number
  config: TextBlockConfig | VisualizationBlockConfig | TableBlockConfig | DividerBlockConfig
}

export interface PageSettings {
  page_size: 'A4' | 'Letter' | 'Legal'
  orientation: 'portrait' | 'landscape'
  margins: {
    top: number
    right: number
    bottom: number
    left: number
  }
}

export interface Report {
  id: number
  name: string
  description: string | null
  blocks: ReportBlock[]
  settings: PageSettings
  is_public: boolean
  share_token: string | null
  is_archived: boolean
  created_at: string
  updated_at: string | null
}

export interface ReportListItem {
  id: number
  name: string
  description: string | null
  block_count: number
  is_public: boolean
  is_archived: boolean
  created_at: string
  updated_at: string | null
}

export interface ReportCreate {
  name: string
  description?: string
  blocks?: ReportBlock[]
  settings?: PageSettings
}

export interface ReportUpdate {
  name?: string
  description?: string
  blocks?: ReportBlock[]
  settings?: PageSettings
  is_public?: boolean
  is_archived?: boolean
}

export interface ShareResponse {
  share_url: string
  share_token: string
  is_public: boolean
}
