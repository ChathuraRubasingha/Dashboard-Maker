import api from './api'
import type {
  MetabaseDatabase,
  MetabaseTable,
  MetabaseQuestion,
  MetabaseDashboard,
  QueryResult,
  MBQLQuery,
} from '../types'

export const metabaseService = {
  // Health check
  async healthCheck(): Promise<{ status: string }> {
    const response = await api.get<{ status: string }>('/metabase/health')
    return response.data
  },

  // Databases
  async listDatabases(): Promise<MetabaseDatabase[]> {
    const response = await api.get<MetabaseDatabase[]>('/metabase/databases')
    return response.data
  },

  async getDatabase(id: number): Promise<MetabaseDatabase> {
    const response = await api.get<MetabaseDatabase>(`/metabase/databases/${id}`)
    return response.data
  },

  async getDatabaseMetadata(id: number): Promise<{ tables: MetabaseTable[] }> {
    const response = await api.get<{ tables: MetabaseTable[] }>(`/metabase/databases/${id}/metadata`)
    return response.data
  },

  async createDatabase(data: {
    name: string
    engine: string
    details: Record<string, unknown>
    is_full_sync?: boolean
    is_on_demand?: boolean
    auto_run_queries?: boolean
  }): Promise<MetabaseDatabase> {
    const response = await api.post<MetabaseDatabase>('/metabase/databases', data)
    return response.data
  },

  async updateDatabase(id: number, data: Record<string, unknown>): Promise<MetabaseDatabase> {
    const response = await api.put<MetabaseDatabase>(`/metabase/databases/${id}`, data)
    return response.data
  },

  async deleteDatabase(id: number): Promise<void> {
    await api.delete(`/metabase/databases/${id}`)
  },

  async syncDatabase(id: number): Promise<void> {
    await api.post(`/metabase/databases/${id}/sync`)
  },

  async validateDatabase(data: {
    name: string
    engine: string
    details: Record<string, unknown>
  }): Promise<{ valid: boolean; message?: string }> {
    const response = await api.post<{ valid: boolean; message?: string }>('/metabase/databases/validate', data)
    return response.data
  },

  // Queries
  async executeQuery(query: {
    database: number
    type: 'native' | 'query'
    native?: { query: string }
    query?: MBQLQuery
  }): Promise<QueryResult> {
    const response = await api.post<QueryResult>('/metabase/query', query)
    return response.data
  },

  async executeNativeQuery(databaseId: number, sql: string): Promise<QueryResult> {
    const response = await api.post<QueryResult>('/metabase/query/native', null, {
      params: { database_id: databaseId, sql },
    })
    return response.data
  },

  // Questions
  async listQuestions(collectionId?: number): Promise<MetabaseQuestion[]> {
    const response = await api.get<MetabaseQuestion[]>('/metabase/questions', {
      params: { collection_id: collectionId },
    })
    return response.data
  },

  async getQuestion(id: number): Promise<MetabaseQuestion> {
    const response = await api.get<MetabaseQuestion>(`/metabase/questions/${id}`)
    return response.data
  },

  async createQuestion(data: {
    name: string
    display: string
    dataset_query: {
      database: number
      type: 'native' | 'query'
      native?: { query: string }
      query?: MBQLQuery
    }
    visualization_settings?: Record<string, unknown>
    description?: string
    collection_id?: number
  }): Promise<MetabaseQuestion> {
    const response = await api.post<MetabaseQuestion>('/metabase/questions', data)
    return response.data
  },

  async updateQuestion(id: number, data: Record<string, unknown>): Promise<MetabaseQuestion> {
    const response = await api.put<MetabaseQuestion>(`/metabase/questions/${id}`, data)
    return response.data
  },

  async deleteQuestion(id: number): Promise<void> {
    await api.delete(`/metabase/questions/${id}`)
  },

  async executeQuestion(id: number, params?: Record<string, unknown>): Promise<QueryResult> {
    const response = await api.post<QueryResult>(`/metabase/questions/${id}/execute`, params)
    return response.data
  },

  // Metabase Dashboards
  async listMetabaseDashboards(): Promise<MetabaseDashboard[]> {
    const response = await api.get<MetabaseDashboard[]>('/metabase/mb-dashboards')
    return response.data
  },

  async getMetabaseDashboard(id: number): Promise<MetabaseDashboard> {
    const response = await api.get<MetabaseDashboard>(`/metabase/mb-dashboards/${id}`)
    return response.data
  },

  async createMetabaseDashboard(data: {
    name: string
    description?: string
    collection_id?: number
    parameters?: unknown[]
  }): Promise<MetabaseDashboard> {
    const response = await api.post<MetabaseDashboard>('/metabase/mb-dashboards', data)
    return response.data
  },

  async addCardToMetabaseDashboard(
    dashboardId: number,
    data: {
      card_id: number
      row?: number
      col?: number
      size_x?: number
      size_y?: number
      parameter_mappings?: unknown[]
    }
  ): Promise<unknown> {
    const response = await api.post(`/metabase/mb-dashboards/${dashboardId}/cards`, data)
    return response.data
  },

  // Embedding
  async getQuestionEmbedUrl(
    questionId: number,
    options?: { theme?: string; bordered?: boolean; titled?: boolean }
  ): Promise<{ embed_url: string }> {
    const response = await api.get<{ embed_url: string }>(`/metabase/embed/question/${questionId}/url`, {
      params: options,
    })
    return response.data
  },

  async getDashboardEmbedUrl(
    dashboardId: number,
    options?: { theme?: string; bordered?: boolean; titled?: boolean }
  ): Promise<{ embed_url: string }> {
    const response = await api.get<{ embed_url: string }>(`/metabase/embed/dashboard/${dashboardId}/url`, {
      params: options,
    })
    return response.data
  },

  // Collections
  async listCollections(): Promise<{ id: number; name: string }[]> {
    const response = await api.get<{ id: number; name: string }[]>('/metabase/collections')
    return response.data
  },

  async createCollection(data: { name: string; description?: string; parent_id?: number }): Promise<{ id: number; name: string }> {
    const response = await api.post<{ id: number; name: string }>('/metabase/collections', data)
    return response.data
  },
}
