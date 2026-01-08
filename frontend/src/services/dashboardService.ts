import api from './api'
import type {
  Dashboard,
  DashboardCreate,
  DashboardUpdate,
  DashboardCard,
  DashboardCardCreate,
  DashboardCardUpdate,
  DashboardFilter,
} from '../types'

export const dashboardService = {
  // Dashboard CRUD
  async list(includeArchived = false): Promise<Dashboard[]> {
    const response = await api.get<Dashboard[]>('/dashboards', {
      params: { include_archived: includeArchived },
    })
    return response.data
  },

  async get(id: number): Promise<Dashboard> {
    const response = await api.get<Dashboard>(`/dashboards/${id}`)
    return response.data
  },

  async getPublic(uuid: string): Promise<Dashboard> {
    const response = await api.get<Dashboard>(`/dashboards/public/${uuid}`)
    return response.data
  },

  async create(data: DashboardCreate): Promise<Dashboard> {
    const response = await api.post<Dashboard>('/dashboards', data)
    return response.data
  },

  async update(id: number, data: DashboardUpdate): Promise<Dashboard> {
    const response = await api.put<Dashboard>(`/dashboards/${id}`, data)
    return response.data
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/dashboards/${id}`)
  },

  // Dashboard Cards
  async addCard(dashboardId: number, data: DashboardCardCreate): Promise<DashboardCard> {
    const response = await api.post<DashboardCard>(`/dashboards/${dashboardId}/cards`, data)
    return response.data
  },

  async updateCard(dashboardId: number, cardId: number, data: DashboardCardUpdate): Promise<DashboardCard> {
    const response = await api.put<DashboardCard>(`/dashboards/${dashboardId}/cards/${cardId}`, data)
    return response.data
  },

  async updateCardsBulk(
    dashboardId: number,
    cards: { id: number; position_x?: number; position_y?: number; width?: number; height?: number }[]
  ): Promise<DashboardCard[]> {
    const response = await api.put<DashboardCard[]>(`/dashboards/${dashboardId}/cards`, { cards })
    return response.data
  },

  async removeCard(dashboardId: number, cardId: number): Promise<void> {
    await api.delete(`/dashboards/${dashboardId}/cards/${cardId}`)
  },

  // Dashboard Filters
  async addFilter(dashboardId: number, data: Partial<DashboardFilter>): Promise<DashboardFilter> {
    const response = await api.post<DashboardFilter>(`/dashboards/${dashboardId}/filters`, data)
    return response.data
  },

  async updateFilter(dashboardId: number, filterId: number, data: Partial<DashboardFilter>): Promise<DashboardFilter> {
    const response = await api.put<DashboardFilter>(`/dashboards/${dashboardId}/filters/${filterId}`, data)
    return response.data
  },

  async removeFilter(dashboardId: number, filterId: number): Promise<void> {
    await api.delete(`/dashboards/${dashboardId}/filters/${filterId}`)
  },

  async reorderFilters(dashboardId: number, filterIds: number[]): Promise<DashboardFilter[]> {
    const response = await api.put<DashboardFilter[]>(`/dashboards/${dashboardId}/filters/reorder`, filterIds)
    return response.data
  },
}
