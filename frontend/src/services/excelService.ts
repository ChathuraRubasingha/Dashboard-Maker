import api from './api'
import type {
  ExcelTemplate,
  ExcelTemplateListItem,
  ExcelTemplateCreate,
  ExcelTemplateUpdate,
  ExcelReport,
  ExcelReportListItem,
  ExcelReportCreate,
  ExcelReportUpdate,
} from '../types'

export const excelService = {
  // ============ Template APIs ============

  async listTemplates(includeArchived = false): Promise<ExcelTemplateListItem[]> {
    const response = await api.get<ExcelTemplateListItem[]>('/excel/templates', {
      params: { include_archived: includeArchived },
    })
    return response.data
  },

  async getTemplate(id: number): Promise<ExcelTemplate> {
    const response = await api.get<ExcelTemplate>(`/excel/templates/${id}`)
    return response.data
  },

  async createTemplate(data: ExcelTemplateCreate): Promise<ExcelTemplate> {
    const response = await api.post<ExcelTemplate>('/excel/templates', data)
    return response.data
  },

  async updateTemplate(id: number, data: ExcelTemplateUpdate): Promise<ExcelTemplate> {
    const response = await api.put<ExcelTemplate>(`/excel/templates/${id}`, data)
    return response.data
  },

  async deleteTemplate(id: number): Promise<void> {
    await api.delete(`/excel/templates/${id}`)
  },

  async uploadTemplateFile(
    templateId: number,
    file: File
  ): Promise<{ message: string; template_id: number; file_name: string; structure: any }> {
    const formData = new FormData()
    formData.append('file', file)

    const response = await api.post(`/excel/templates/${templateId}/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  },

  // ============ Report APIs ============

  async listReports(includeArchived = false): Promise<ExcelReportListItem[]> {
    const response = await api.get<ExcelReportListItem[]>('/excel/reports', {
      params: { include_archived: includeArchived },
    })
    return response.data
  },

  async getReport(id: number): Promise<ExcelReport> {
    const response = await api.get<ExcelReport>(`/excel/reports/${id}`)
    return response.data
  },

  async createReport(data: ExcelReportCreate): Promise<ExcelReport> {
    const response = await api.post<ExcelReport>('/excel/reports', data)
    return response.data
  },

  async updateReport(id: number, data: ExcelReportUpdate): Promise<ExcelReport> {
    const response = await api.put<ExcelReport>(`/excel/reports/${id}`, data)
    return response.data
  },

  async deleteReport(id: number): Promise<void> {
    await api.delete(`/excel/reports/${id}`)
  },

  async shareReport(id: number): Promise<{ share_url: string; share_token: string; is_public: boolean }> {
    const response = await api.post(`/excel/reports/${id}/share`)
    return response.data
  },

  async revokeShare(id: number): Promise<void> {
    await api.delete(`/excel/reports/${id}/share`)
  },

  async downloadReport(id: number): Promise<Blob> {
    const response = await api.post(`/excel/reports/${id}/download`, null, {
      responseType: 'blob',
    })
    return response.data
  },

  async getSharedReport(shareToken: string): Promise<ExcelReport> {
    const response = await api.get<ExcelReport>(`/excel/reports/shared/${shareToken}`)
    return response.data
  },
}
