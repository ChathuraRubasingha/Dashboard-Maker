import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  BarChart3,
  Database,
  Settings,
  Menu,
  X,
  PlusSquare,
  FileText,
  ChevronRight,
  Search,
  Bell,
  HelpCircle,
  User,
  LogOut,
  Sparkles,
  Home,
  TrendingUp,
} from 'lucide-react'
import { useState, useEffect } from 'react'
import clsx from 'clsx'

const navigation = [
  {
    name: 'Dashboards',
    href: '/dashboards',
    icon: LayoutDashboard,
    description: 'Monitor KPIs',
    color: 'blue'
  },
  {
    name: 'Reports',
    href: '/reports',
    icon: FileText,
    description: 'Build & share',
    color: 'purple'
  },
  {
    name: 'Visualizations',
    href: '/visualizations',
    icon: BarChart3,
    description: 'Charts & tables',
    color: 'emerald'
  },
  {
    name: 'Query Builder',
    href: '/query-builder',
    icon: PlusSquare,
    description: 'Create queries',
    color: 'amber'
  },
  {
    name: 'Databases',
    href: '/databases',
    icon: Database,
    description: 'Data sources',
    color: 'rose'
  },
]

const colorClasses = {
  blue: {
    bg: 'bg-blue-500',
    bgLight: 'bg-blue-50',
    text: 'text-blue-600',
    border: 'border-blue-500',
  },
  purple: {
    bg: 'bg-purple-500',
    bgLight: 'bg-purple-50',
    text: 'text-purple-600',
    border: 'border-purple-500',
  },
  emerald: {
    bg: 'bg-emerald-500',
    bgLight: 'bg-emerald-50',
    text: 'text-emerald-600',
    border: 'border-emerald-500',
  },
  amber: {
    bg: 'bg-amber-500',
    bgLight: 'bg-amber-50',
    text: 'text-amber-600',
    border: 'border-amber-500',
  },
  rose: {
    bg: 'bg-rose-500',
    bgLight: 'bg-rose-50',
    text: 'text-rose-600',
    border: 'border-rose-500',
  },
}

export default function Layout() {
  const location = useLocation()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false)
  }, [location.pathname])

  // Keyboard shortcut for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(true)
      }
      if (e.key === 'Escape') {
        setSearchOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      // Could implement global search here
      setSearchOpen(false)
      setSearchQuery('')
    }
  }

  // Get current page title
  const getCurrentPageTitle = () => {
    const currentNav = navigation.find(item => location.pathname.startsWith(item.href))
    return currentNav?.name || 'Home'
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={clsx(
          'fixed inset-y-0 left-0 z-50 bg-white border-r border-gray-200 transform transition-all duration-300 ease-in-out lg:translate-x-0 flex flex-col',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
          sidebarCollapsed ? 'lg:w-20' : 'lg:w-72',
          'w-72'
        )}
      >
        {/* Logo Header */}
        <div className={clsx(
          'flex items-center h-16 border-b border-gray-100',
          sidebarCollapsed ? 'justify-center px-2' : 'justify-between px-5'
        )}>
          <Link to="/" className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/25">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-400 rounded-full border-2 border-white" />
            </div>
            {!sidebarCollapsed && (
              <div>
                <span className="text-lg font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                  Analytics
                </span>
                <span className="block text-[10px] text-gray-400 font-medium tracking-wider uppercase">
                  Platform
                </span>
              </div>
            )}
          </Link>
          <button
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Quick Actions */}
        {!sidebarCollapsed && (
          <div className="px-4 py-4">
            <button
              onClick={() => setSearchOpen(true)}
              className="w-full flex items-center gap-3 px-3 py-2.5 bg-gray-50 hover:bg-gray-100 rounded-xl text-sm text-gray-500 transition-colors group"
            >
              <Search className="w-4 h-4" />
              <span className="flex-1 text-left">Quick search...</span>
              <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 bg-white rounded-md text-[10px] font-medium text-gray-400 border border-gray-200 shadow-sm">
                <span className="text-xs">⌘</span>K
              </kbd>
            </button>
          </div>
        )}

        {/* Navigation */}
        <nav className={clsx(
          'flex-1 overflow-y-auto',
          sidebarCollapsed ? 'px-2 py-4' : 'px-3 py-2'
        )}>
          {!sidebarCollapsed && (
            <div className="px-3 mb-2">
              <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                Main Menu
              </span>
            </div>
          )}

          <div className="space-y-1">
            {navigation.map((item) => {
              const isActive = location.pathname.startsWith(item.href)
              const colors = colorClasses[item.color as keyof typeof colorClasses]

              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={clsx(
                    'group flex items-center gap-3 rounded-xl transition-all duration-200',
                    sidebarCollapsed ? 'p-3 justify-center' : 'px-3 py-2.5',
                    isActive
                      ? `${colors.bgLight} ${colors.text}`
                      : 'text-gray-600 hover:bg-gray-50'
                  )}
                  title={sidebarCollapsed ? item.name : undefined}
                >
                  <div className={clsx(
                    'flex items-center justify-center rounded-lg transition-all',
                    sidebarCollapsed ? 'w-10 h-10' : 'w-9 h-9',
                    isActive
                      ? `${colors.bg} text-white shadow-lg`
                      : 'bg-gray-100 text-gray-500 group-hover:bg-gray-200'
                  )}>
                    <item.icon className={clsx(
                      sidebarCollapsed ? 'w-5 h-5' : 'w-4 h-4'
                    )} />
                  </div>

                  {!sidebarCollapsed && (
                    <div className="flex-1 min-w-0">
                      <div className={clsx(
                        'text-sm font-medium truncate',
                        isActive ? colors.text : 'text-gray-700'
                      )}>
                        {item.name}
                      </div>
                      <div className="text-[11px] text-gray-400 truncate">
                        {item.description}
                      </div>
                    </div>
                  )}

                  {!sidebarCollapsed && isActive && (
                    <ChevronRight className={clsx('w-4 h-4', colors.text)} />
                  )}
                </Link>
              )
            })}
          </div>
        </nav>

        {/* Collapse Toggle (Desktop) */}
        <div className="hidden lg:block px-3 py-3 border-t border-gray-100">
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className={clsx(
              'w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-500 rounded-xl hover:bg-gray-50 transition-colors',
              sidebarCollapsed && 'justify-center'
            )}
          >
            <ChevronRight className={clsx(
              'w-4 h-4 transition-transform',
              sidebarCollapsed ? 'rotate-0' : 'rotate-180'
            )} />
            {!sidebarCollapsed && <span>Collapse</span>}
          </button>
        </div>

        {/* Settings & User */}
        <div className={clsx(
          'border-t border-gray-100',
          sidebarCollapsed ? 'p-2' : 'p-3'
        )}>
          <Link
            to="/settings"
            className={clsx(
              'flex items-center gap-3 text-sm font-medium text-gray-600 rounded-xl hover:bg-gray-50 transition-colors',
              sidebarCollapsed ? 'p-3 justify-center' : 'px-3 py-2.5'
            )}
            title={sidebarCollapsed ? 'Settings' : undefined}
          >
            <div className={clsx(
              'flex items-center justify-center rounded-lg bg-gray-100',
              sidebarCollapsed ? 'w-10 h-10' : 'w-9 h-9'
            )}>
              <Settings className={clsx(sidebarCollapsed ? 'w-5 h-5' : 'w-4 h-4')} />
            </div>
            {!sidebarCollapsed && <span>Settings</span>}
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <div className={clsx(
        'transition-all duration-300',
        sidebarCollapsed ? 'lg:pl-20' : 'lg:pl-72'
      )}>
        {/* Top Header Bar */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-gray-200/80">
          <div className="flex items-center justify-between h-16 px-4 lg:px-6">
            {/* Left: Mobile menu & Breadcrumb */}
            <div className="flex items-center gap-4">
              <button
                className="lg:hidden p-2 rounded-xl hover:bg-gray-100 transition-colors"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="w-5 h-5 text-gray-600" />
              </button>

              {/* Breadcrumb */}
              <div className="hidden sm:flex items-center gap-2 text-sm">
                <Link to="/" className="text-gray-400 hover:text-gray-600 transition-colors">
                  <Home className="w-4 h-4" />
                </Link>
                <ChevronRight className="w-4 h-4 text-gray-300" />
                <span className="font-medium text-gray-900">{getCurrentPageTitle()}</span>
              </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-2">
              {/* Search Button */}
              <button
                onClick={() => setSearchOpen(true)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-gray-100 transition-colors text-gray-500"
              >
                <Search className="w-5 h-5" />
                <span className="hidden md:inline text-sm">Search</span>
              </button>

              {/* Notifications */}
              <button className="relative p-2 rounded-xl hover:bg-gray-100 transition-colors text-gray-500">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
              </button>

              {/* Help */}
              <button className="p-2 rounded-xl hover:bg-gray-100 transition-colors text-gray-500">
                <HelpCircle className="w-5 h-5" />
              </button>

              {/* Divider */}
              <div className="w-px h-6 bg-gray-200 mx-2" />

              {/* User Menu */}
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-3 p-1.5 pr-3 rounded-xl hover:bg-gray-100 transition-colors"
                >
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center text-white text-sm font-medium shadow-md">
                    A
                  </div>
                  <div className="hidden md:block text-left">
                    <div className="text-sm font-medium text-gray-900">Admin</div>
                    <div className="text-[11px] text-gray-500">admin@example.com</div>
                  </div>
                </button>

                {/* User Dropdown */}
                {userMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setUserMenuOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-20">
                      <div className="px-4 py-2 border-b border-gray-100">
                        <div className="text-sm font-medium text-gray-900">Admin User</div>
                        <div className="text-xs text-gray-500">admin@example.com</div>
                      </div>
                      <div className="py-1">
                        <Link
                          to="/settings"
                          className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          <User className="w-4 h-4 text-gray-400" />
                          Profile Settings
                        </Link>
                        <button
                          className="flex items-center gap-3 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          <LogOut className="w-4 h-4" />
                          Sign Out
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-6">
          <Outlet />
        </main>
      </div>

      {/* Search Modal */}
      {searchOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]">
          <div
            className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
            onClick={() => setSearchOpen(false)}
          />
          <div className="relative w-full max-w-xl mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden">
            {/* Search Input */}
            <form onSubmit={handleSearch}>
              <div className="flex items-center gap-4 px-5 py-4 border-b border-gray-100">
                <Search className="w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search dashboards, reports, visualizations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 text-lg bg-transparent outline-none placeholder-gray-400"
                  autoFocus
                />
                <kbd className="px-2 py-1 bg-gray-100 rounded-lg text-xs text-gray-500">
                  ESC
                </kbd>
              </div>
            </form>

            {/* Quick Links */}
            <div className="p-3">
              <div className="px-2 py-1.5 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">
                Quick Links
              </div>
              <div className="space-y-1">
                {navigation.map((item) => {
                  const colors = colorClasses[item.color as keyof typeof colorClasses]
                  return (
                    <button
                      key={item.name}
                      onClick={() => {
                        navigate(item.href)
                        setSearchOpen(false)
                      }}
                      className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors text-left"
                    >
                      <div className={clsx(
                        'w-9 h-9 rounded-lg flex items-center justify-center',
                        colors.bgLight, colors.text
                      )}>
                        <item.icon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">{item.name}</div>
                        <div className="text-[11px] text-gray-500">{item.description}</div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Search Tips */}
            <div className="px-5 py-3 bg-gray-50 border-t border-gray-100">
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  Pro tip: Use
                </span>
                <kbd className="px-1.5 py-0.5 bg-white rounded border border-gray-200 font-mono">⌘K</kbd>
                <span>to open search from anywhere</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
