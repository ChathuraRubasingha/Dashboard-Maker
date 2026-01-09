// Shared Theme Configuration for Custom Analytics Platform
// This file contains common colors, styles, and utility classes

export const themeColors = {
  // Primary brand colors for each section
  dashboards: {
    primary: 'blue',
    gradient: 'from-blue-500 via-blue-600 to-indigo-700',
    light: 'blue-50',
    text: 'blue-600',
    border: 'blue-200',
    ring: 'blue-500',
  },
  reports: {
    primary: 'purple',
    gradient: 'from-purple-500 via-purple-600 to-indigo-700',
    light: 'purple-50',
    text: 'purple-600',
    border: 'purple-200',
    ring: 'purple-500',
  },
  visualizations: {
    primary: 'emerald',
    gradient: 'from-emerald-500 via-emerald-600 to-teal-700',
    light: 'emerald-50',
    text: 'emerald-600',
    border: 'emerald-200',
    ring: 'emerald-500',
  },
  queryBuilder: {
    primary: 'amber',
    gradient: 'from-amber-500 via-amber-600 to-orange-700',
    light: 'amber-50',
    text: 'amber-600',
    border: 'amber-200',
    ring: 'amber-500',
  },
  databases: {
    primary: 'rose',
    gradient: 'from-rose-500 via-rose-600 to-pink-700',
    light: 'rose-50',
    text: 'rose-600',
    border: 'rose-200',
    ring: 'rose-500',
  },
  settings: {
    primary: 'slate',
    gradient: 'from-slate-500 via-slate-600 to-gray-700',
    light: 'slate-50',
    text: 'slate-600',
    border: 'slate-200',
    ring: 'slate-500',
  },
} as const

export type ThemeSection = keyof typeof themeColors

// Common button styles
export const buttonStyles = {
  primary: 'inline-flex items-center gap-2 px-5 py-2.5 bg-white font-medium rounded-xl hover:bg-opacity-90 transition-colors shadow-lg',
  secondary: 'inline-flex items-center gap-2 px-4 py-2 bg-gray-50 border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-100 transition-colors',
  ghost: 'inline-flex items-center gap-2 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-xl transition-colors',
  danger: 'inline-flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-200 text-red-700 font-medium rounded-xl hover:bg-red-100 transition-colors',
} as const

// Common input styles
export const inputStyles = {
  default: 'w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:border-transparent focus:bg-white transition-all',
  search: 'w-full pl-10 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:border-transparent focus:bg-white transition-all',
} as const

// Common card styles
export const cardStyles = {
  default: 'bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden',
  hover: 'bg-white rounded-xl border border-gray-200 hover:shadow-lg transition-all duration-200 cursor-pointer overflow-hidden',
  selected: 'bg-white rounded-xl border-2 border-blue-500 shadow-lg overflow-hidden',
} as const

// Common modal styles
export const modalStyles = {
  backdrop: 'fixed inset-0 z-50 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center',
  container: 'relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden',
  header: 'px-6 py-4 border-b border-gray-100',
  body: 'px-6 py-4',
  footer: 'px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3',
} as const

// Stats card styles
export const statStyles = {
  container: 'bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3',
  label: 'flex items-center gap-2 text-sm mb-1 opacity-80',
  value: 'text-2xl font-bold text-white',
} as const

// Empty state styles
export const emptyStateStyles = {
  container: 'text-center py-16 bg-white rounded-2xl border border-gray-200',
  icon: 'w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4',
  title: 'text-xl font-semibold text-gray-900 mb-2',
  description: 'text-gray-500 mb-6 max-w-sm mx-auto',
} as const

// Loading spinner component class
export const spinnerStyles = {
  container: 'flex items-center justify-center py-20',
  spinner: 'w-12 h-12 border-3 border-t-transparent rounded-full animate-spin',
  text: 'text-gray-500 text-sm mt-4',
} as const

// Badge styles
export const badgeStyles = {
  default: 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
  success: 'bg-emerald-100 text-emerald-700',
  warning: 'bg-amber-100 text-amber-700',
  error: 'bg-red-100 text-red-700',
  info: 'bg-blue-100 text-blue-700',
  neutral: 'bg-gray-100 text-gray-600',
} as const

// Dropdown styles
export const dropdownStyles = {
  trigger: 'flex items-center gap-2 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-100 transition-colors',
  menu: 'absolute mt-2 bg-white rounded-xl shadow-lg border border-gray-200 py-1 z-20 min-w-[160px]',
  item: 'w-full px-4 py-2 text-sm text-left transition-colors text-gray-700 hover:bg-gray-50',
  itemActive: 'w-full px-4 py-2 text-sm text-left transition-colors bg-gray-50',
  divider: 'border-t border-gray-100 my-1',
} as const

// Toolbar styles
export const toolbarStyles = {
  container: 'sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-gray-200/80',
  inner: 'flex items-center justify-between h-16 px-4 lg:px-6',
  title: 'text-lg font-semibold text-gray-900',
  actions: 'flex items-center gap-2',
} as const

// Page header (hero) styles
export const heroStyles = {
  container: 'relative overflow-hidden rounded-2xl',
  content: 'relative px-6 py-8 sm:px-8 sm:py-10',
  decorativeBlur1: 'absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2',
  decorativeBlur2: 'absolute bottom-0 left-0 w-64 h-64 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2 opacity-20',
  iconContainer: 'p-2.5 bg-white/20 backdrop-blur-sm rounded-xl',
  title: 'text-2xl sm:text-3xl font-bold text-white',
  description: 'max-w-lg opacity-90',
  statsGrid: 'grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8',
} as const

// Control bar (search, filters, etc.)
export const controlBarStyles = {
  container: 'bg-white rounded-xl border border-gray-200 shadow-sm p-4',
  inner: 'flex flex-col sm:flex-row gap-4',
  controls: 'flex items-center gap-2 flex-wrap',
  divider: 'w-px h-8 bg-gray-200 hidden sm:block',
  viewToggle: 'flex items-center bg-gray-100 rounded-lg p-1',
  viewButton: 'p-2 rounded-md transition-colors',
  viewButtonActive: 'bg-white shadow-sm',
} as const
