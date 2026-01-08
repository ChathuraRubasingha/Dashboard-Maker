import axios, { AxiosInstance } from 'axios'

const API_BASE_URL = '/api/v1'

// API Key - in production, this should come from environment variables
const API_KEY = import.meta.env.VITE_API_KEY || 'your-api-key-change-in-production'

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': API_KEY,
  },
})

export default api

// Error helper
export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.detail || error.message || 'An error occurred'
  }
  if (error instanceof Error) {
    return error.message
  }
  return 'An unknown error occurred'
}
