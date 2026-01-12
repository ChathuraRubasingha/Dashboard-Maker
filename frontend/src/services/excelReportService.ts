import api from './api'
import type {
  ExcelTemplateReport,
  ExcelTemplateReportListItem,
  ExcelTemplateReportCreate,
  ExcelTemplateReportUpdate,
  TemplateUploadResponse,
  DataSourceMapping,
  ShareResponse,
} from '../types'

export const excelReportService = {
  // Excel Template Report CRUD
  async list(includeArchived = false): Promise<ExcelTemplateReportListItem[]> {
    const response = await api.get<ExcelTemplateReportListItem[]>('/excel-reports', {
      params: { include_archived: includeArchived },
    })
    return response.data
  },

  async get(id: number): Promise<ExcelTemplateReport> {
    const response = await api.get<ExcelTemplateReport>(`/excel-reports/${id}`)
    return response.data
  },

  async getShared(shareToken: string): Promise<ExcelTemplateReport> {
    const response = await api.get<ExcelTemplateReport>(`/excel-reports/shared/${shareToken}`)
    return response.data
  },

  async create(data: ExcelTemplateReportCreate): Promise<ExcelTemplateReport> {
    const response = await api.post<ExcelTemplateReport>('/excel-reports', data)
    return response.data
  },

  async update(id: number, data: ExcelTemplateReportUpdate): Promise<ExcelTemplateReport> {
    const response = await api.put<ExcelTemplateReport>(`/excel-reports/${id}`, data)
    return response.data
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/excel-reports/${id}`)
  },

  // Template Upload
  async uploadTemplate(id: number, file: File): Promise<TemplateUploadResponse> {
    const formData = new FormData()
    formData.append('file', file)
    const response = await api.post<TemplateUploadResponse>(
      `/excel-reports/${id}/upload-template`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    )
    return response.data
  },

  // Mappings
  async updateMappings(
    id: number,
    mappings: Record<string, DataSourceMapping>
  ): Promise<ExcelTemplateReport> {
    const response = await api.put<ExcelTemplateReport>(`/excel-reports/${id}/mappings`, {
      mappings,
    })
    return response.data
  },

  // Generate/Download
  async generate(id: number): Promise<Blob> {
    const response = await api.post(`/excel-reports/${id}/generate`, null, {
      responseType: 'blob',
    })
    return response.data
  },

  async preview(id: number): Promise<{
    report_id: number
    name: string
    template_filename: string | null
    placeholders: unknown[]
    mappings: Record<string, unknown>
    preview_available: boolean
  }> {
    const response = await api.get(`/excel-reports/${id}/preview`)
    return response.data
  },

  // Sharing
  async share(id: number): Promise<ShareResponse> {
    const response = await api.post<ShareResponse>(`/excel-reports/${id}/share`)
    return response.data
  },

  async revokeShare(id: number): Promise<void> {
    await api.delete(`/excel-reports/${id}/share`)
  },

  // Duplicate
  async duplicate(id: number, name?: string): Promise<ExcelTemplateReport> {
    const response = await api.post<ExcelTemplateReport>(`/excel-reports/${id}/duplicate`, null, {
      params: name ? { name } : undefined,
    })
    return response.data
  },

  // Helper to download generated Excel
  downloadBlob(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  },
}
