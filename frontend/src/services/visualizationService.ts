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
}
