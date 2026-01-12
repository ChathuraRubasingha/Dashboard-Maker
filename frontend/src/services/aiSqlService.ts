import api from './api'

export interface GenerateSQLRequest {
  query: string
  database_id: number
}

export interface GenerateSQLResponse {
  sql: string | null
  explanation: string
  error: boolean
}

export interface SuggestQueriesRequest {
  database_id: number
  count?: number
}

export interface SuggestQueriesResponse {
  suggestions: string[]
}

export interface OllamaStatusResponse {
  available: boolean
  model?: string
  model_available?: boolean
  available_models?: string[]
  error?: string
}

export interface ExecuteGeneratedResponse {
  sql: string | null
  explanation: string
  error: boolean
  error_message?: string
  results?: {
    data: {
      rows: unknown[][]
      cols: Array<{ name: string; base_type: string }>
    }
  }
}

export const aiSqlService = {
  /**
   * Check if Ollama is running and the model is available
   */
  checkStatus: async (): Promise<OllamaStatusResponse> => {
    const response = await api.get<OllamaStatusResponse>('/ai-sql/status')
    return response.data
  },

  /**
   * Generate SQL from natural language
   */
  generateSQL: async (request: GenerateSQLRequest): Promise<GenerateSQLResponse> => {
    const response = await api.post<GenerateSQLResponse>('/ai-sql/generate', request)
    return response.data
  },

  /**
   * Get query suggestions based on database schema
   */
  suggestQueries: async (request: SuggestQueriesRequest): Promise<SuggestQueriesResponse> => {
    const response = await api.post<SuggestQueriesResponse>('/ai-sql/suggest', request)
    return response.data
  },

  /**
   * Generate SQL and execute it in one call
   */
  executeGenerated: async (request: GenerateSQLRequest): Promise<ExecuteGeneratedResponse> => {
    const response = await api.post<ExecuteGeneratedResponse>('/ai-sql/execute-generated', request)
    return response.data
  },
}
