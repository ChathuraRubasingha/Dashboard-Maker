import api from './api'
import type {
  Report,
  ReportListItem,
  ReportCreate,
  ReportUpdate,
  ShareResponse,
} from '../types'

export const reportService = {
  // Report CRUD
  async list(includeArchived = false): Promise<ReportListItem[]> {
    const response = await api.get<ReportListItem[]>('/reports', {
      params: { include_archived: includeArchived },
    })
    return response.data
  },

  async get(id: number): Promise<Report> {
    const response = await api.get<Report>(`/reports/${id}`)
    return response.data
  },

  async getShared(shareToken: string): Promise<Report> {
    const response = await api.get<Report>(`/reports/shared/${shareToken}`)
    return response.data
  },

  async create(data: ReportCreate): Promise<Report> {
    const response = await api.post<Report>('/reports', data)
    return response.data
  },

  async update(id: number, data: ReportUpdate): Promise<Report> {
    const response = await api.put<Report>(`/reports/${id}`, data)
    return response.data
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/reports/${id}`)
  },

  // Sharing
  async share(id: number): Promise<ShareResponse> {
    const response = await api.post<ShareResponse>(`/reports/${id}/share`)
    return response.data
  },

  async revokeShare(id: number): Promise<void> {
    await api.delete(`/reports/${id}/share`)
  },

  // Duplicate
  async duplicate(id: number, name?: string): Promise<Report> {
    const response = await api.post<Report>(`/reports/${id}/duplicate`, null, {
      params: name ? { name } : undefined,
    })
    return response.data
  },

  // Export - these will open download dialogs
  async exportPdf(id: number): Promise<Blob> {
    const response = await api.post(`/reports/${id}/export/pdf`, null, {
      responseType: 'blob',
    })
    return response.data
  },

  async exportExcel(id: number): Promise<Blob> {
    const response = await api.post(`/reports/${id}/export/excel`, null, {
      responseType: 'blob',
    })
    return response.data
  },
}
