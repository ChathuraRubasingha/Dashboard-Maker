import api from './api'
import type {
  Visualization,
  VisualizationCreate,
  VisualizationUpdate,
  VisualizationCustomization,
} from '../types'

export const visualizationService = {
  async list(includeArchived = false): Promise<Visualization[]> {
    const response = await api.get<Visualization[]>('/visualizations', {
      params: { include_archived: includeArchived },
    })
    return response.data
  },

  async get(id: number): Promise<Visualization> {
    const response = await api.get<Visualization>(`/visualizations/${id}`)
    return response.data
  },

  async getByMetabaseId(metabaseQuestionId: number): Promise<Visualization> {
    const response = await api.get<Visualization>(`/visualizations/metabase/${metabaseQuestionId}`)
    return response.data
  },

  async create(data: VisualizationCreate): Promise<Visualization> {
    const response = await api.post<Visualization>('/visualizations', data)
    return response.data
  },

  async update(id: number, data: VisualizationUpdate): Promise<Visualization> {
    const response = await api.put<Visualization>(`/visualizations/${id}`, data)
    return response.data
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/visualizations/${id}`)
  },

  // Customization
  async getCustomization(visualizationId: number): Promise<VisualizationCustomization> {
    const response = await api.get<VisualizationCustomization>(`/visualizations/${visualizationId}/customization`)
    return response.data
  },

  async updateCustomization(
    visualizationId: number,
    data: Partial<VisualizationCustomization>
  ): Promise<VisualizationCustomization> {
    const response = await api.put<VisualizationCustomization>(
      `/visualizations/${visualizationId}/customization`,
      data
    )
    return response.data
  },

  async deleteCustomization(visualizationId: number): Promise<void> {
    await api.delete(`/visualizations/${visualizationId}/customization`)
  },

  async execute(visualizationId: number): Promise<{ rows: Record<string, unknown>[] }> {
    // First get the visualization
    const viz = await this.get(visualizationId)

    let result: any = null

    // Method 1: Execute via Metabase question ID (if linked)
    if (viz.metabase_question_id) {
      const response = await api.post(`/metabase/questions/${viz.metabase_question_id}/execute`)
      result = response.data
    }
    // Method 2: Execute stored MBQL query directly (same as Widget Report)
    else if (viz.query_type === 'mbql' && viz.mbql_query && viz.database_id) {
      const storedQuery = viz.mbql_query as unknown as {
        database?: number
        type?: string
        query?: object
      }

      const queryPayload = {
        database: storedQuery.database || viz.database_id,
        type: 'query' as const,
        query: storedQuery.query || viz.mbql_query,
      }

      const response = await api.post('/metabase/query', queryPayload)
      result = response.data
    }
    // Method 3: Execute stored native SQL query directly
    else if (viz.query_type === 'native' && viz.native_query && viz.database_id) {
      const response = await api.post('/metabase/query/native', null, {
        params: { database_id: viz.database_id, sql: viz.native_query },
      })
      result = response.data
    }
    // No valid data source
    else {
      throw new Error('Visualization has no valid data source (no Metabase question, MBQL query, or native query)')
    }

    // Transform Metabase response format
    // Metabase returns: { data: { rows: [[val1, val2], ...], cols: [{name: 'col1'}, ...] } }
    // We need: { rows: [{col1: val1, col2: val2}, ...] }
    if (result?.data?.rows && result?.data?.cols) {
      const cols = result.data.cols as Array<{ name: string }>
      const rawRows = result.data.rows as unknown[][]

      const columnNames = cols.map((col, idx) => col.name || `col_${idx}`)

      const rows = rawRows.map((row) => {
        const rowObj: Record<string, unknown> = {}
        row.forEach((value, idx) => {
          if (idx < columnNames.length) {
            rowObj[columnNames[idx]] = value
          }
        })
        return rowObj
      })

      return { rows }
    }

    // If already in expected format or empty
    return result?.rows ? result : { rows: [] }
  },
}
