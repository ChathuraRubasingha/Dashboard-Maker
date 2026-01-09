import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus,
  Database,
  RefreshCw,
  Trash2,
  ChevronRight,
  ChevronDown,
  Table,
  Search,
  X,
  Server,
  HardDrive,
  CheckCircle2,
  AlertCircle,
  Layers,
  MoreVertical,
  Settings,
  Eye,
  Link2,
} from 'lucide-react'
import clsx from 'clsx'
import { metabaseService } from '../services/metabaseService'

const DATABASE_ENGINES = [
  { value: 'postgres', label: 'PostgreSQL', icon: '🐘' },
  { value: 'mysql', label: 'MySQL', icon: '🐬' },
  { value: 'sqlserver', label: 'SQL Server', icon: '📊' },
  { value: 'mongo', label: 'MongoDB', icon: '🍃' },
  { value: 'bigquery-cloud-sdk', label: 'BigQuery', icon: '☁️' },
  { value: 'redshift', label: 'Amazon Redshift', icon: '🔴' },
  { value: 'snowflake', label: 'Snowflake', icon: '❄️' },
]

const ENGINE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  postgres: { bg: 'bg-blue-100', text: 'text-blue-600', border: 'border-blue-200' },
  mysql: { bg: 'bg-orange-100', text: 'text-orange-600', border: 'border-orange-200' },
  sqlserver: { bg: 'bg-red-100', text: 'text-red-600', border: 'border-red-200' },
  mongo: { bg: 'bg-green-100', text: 'text-green-600', border: 'border-green-200' },
  'bigquery-cloud-sdk': { bg: 'bg-indigo-100', text: 'text-indigo-600', border: 'border-indigo-200' },
  redshift: { bg: 'bg-rose-100', text: 'text-rose-600', border: 'border-rose-200' },
  snowflake: { bg: 'bg-cyan-100', text: 'text-cyan-600', border: 'border-cyan-200' },
}

export default function DatabaseManager() {
  const queryClient = useQueryClient()

  const [isAddingDb, setIsAddingDb] = useState(false)
  const [expandedDb, setExpandedDb] = useState<number | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [menuOpenId, setMenuOpenId] = useState<number | null>(null)
  const [newDb, setNewDb] = useState({
    name: '',
    engine: 'postgres',
    host: '',
    port: '5432',
    dbname: '',
    user: '',
    password: '',
  })

  const { data: databases = [], isLoading } = useQuery({
    queryKey: ['metabase-databases'],
    queryFn: metabaseService.listDatabases,
  })

  const { data: expandedMetadata } = useQuery({
    queryKey: ['metabase-database-metadata', expandedDb],
    queryFn: () => metabaseService.getDatabaseMetadata(expandedDb!),
    enabled: !!expandedDb,
  })

  const createMutation = useMutation({
    mutationFn: metabaseService.createDatabase,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['metabase-databases'] })
      setIsAddingDb(false)
      setNewDb({
        name: '',
        engine: 'postgres',
        host: '',
        port: '5432',
        dbname: '',
        user: '',
        password: '',
      })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: metabaseService.deleteDatabase,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['metabase-databases'] })
    },
  })

  const syncMutation = useMutation({
    mutationFn: metabaseService.syncDatabase,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['metabase-databases'] })
    },
  })

  const handleCreateDatabase = () => {
    createMutation.mutate({
      name: newDb.name,
      engine: newDb.engine,
      details: {
        host: newDb.host,
        port: parseInt(newDb.port, 10),
        dbname: newDb.dbname,
        user: newDb.user,
        password: newDb.password,
      },
    })
  }

  const filteredDatabases = databases.filter((db) =>
    db.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Stats
  const totalDatabases = databases.length
  const totalTables = databases.reduce((acc, db) => acc + (db.tables?.length || 0), 0)

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-rose-500 via-rose-600 to-pink-700 rounded-2xl">
        <div className="absolute inset-0 bg-grid-white/10" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-pink-400/20 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />

        <div className="relative px-6 py-8 sm:px-8 sm:py-10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2.5 bg-white/20 backdrop-blur-sm rounded-xl">
                  <Database className="w-6 h-6 text-white" />
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white">Database Connections</h1>
              </div>
              <p className="text-rose-100 max-w-lg">
                Connect and manage your data sources. Add databases to start analyzing your data.
              </p>
            </div>
            <button
              onClick={() => setIsAddingDb(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-rose-600 font-medium rounded-xl hover:bg-rose-50 transition-colors shadow-lg shadow-rose-900/20"
            >
              <Plus className="w-5 h-5" />
              Add Database
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3">
              <div className="flex items-center gap-2 text-rose-200 text-sm mb-1">
                <Server className="w-4 h-4" />
                Databases
              </div>
              <div className="text-2xl font-bold text-white">{totalDatabases}</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3">
              <div className="flex items-center gap-2 text-rose-200 text-sm mb-1">
                <Table className="w-4 h-4" />
                Tables
              </div>
              <div className="text-2xl font-bold text-white">{totalTables}</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3">
              <div className="flex items-center gap-2 text-rose-200 text-sm mb-1">
                <CheckCircle2 className="w-4 h-4" />
                Connected
              </div>
              <div className="text-2xl font-bold text-white">{totalDatabases}</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-3">
              <div className="flex items-center gap-2 text-rose-200 text-sm mb-1">
                <HardDrive className="w-4 h-4" />
                Storage
              </div>
              <div className="text-2xl font-bold text-white">-</div>
            </div>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search databases..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent focus:bg-white transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 hover:bg-gray-200 rounded-full transition-colors"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          )}
        </div>
      </div>

      {/* Database list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-3 border-rose-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-500 text-sm">Loading databases...</p>
          </div>
        </div>
      ) : filteredDatabases.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
          <div className="w-16 h-16 bg-rose-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Database className="w-8 h-8 text-rose-600" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            {searchQuery ? 'No databases found' : 'No databases connected'}
          </h3>
          <p className="text-gray-500 mb-6 max-w-sm mx-auto">
            {searchQuery
              ? 'Try adjusting your search query'
              : 'Connect your first database to start analyzing data'}
          </p>
          {!searchQuery && (
            <button
              onClick={() => setIsAddingDb(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-rose-600 text-white font-medium rounded-xl hover:bg-rose-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Add Database
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredDatabases.map((db) => {
            const engineColors = ENGINE_COLORS[db.engine] || ENGINE_COLORS.postgres

            return (
              <div
                key={db.id}
                className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg hover:shadow-rose-100 transition-all duration-200"
              >
                <div
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
                  onClick={() => setExpandedDb(expandedDb === db.id ? null : db.id)}
                >
                  <div className="flex items-center gap-4">
                    <button className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
                      {expandedDb === db.id ? (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                      )}
                    </button>
                    <div className={clsx(
                      'flex items-center justify-center w-12 h-12 rounded-xl',
                      engineColors.bg
                    )}>
                      <Database className={clsx('w-6 h-6', engineColors.text)} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{db.name}</h3>
                      <div className="flex items-center gap-3 mt-1">
                        <span className={clsx(
                          'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium',
                          engineColors.bg, engineColors.text
                        )}>
                          {DATABASE_ENGINES.find((e) => e.value === db.engine)?.label || db.engine}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                          Connected
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        syncMutation.mutate(db.id)
                      }}
                      className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Sync schema"
                    >
                      <RefreshCw
                        className={clsx(
                          'w-4 h-4',
                          syncMutation.isPending && 'animate-spin'
                        )}
                      />
                      <span className="hidden sm:inline">Sync</span>
                    </button>

                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setMenuOpenId(menuOpenId === db.id ? null : db.id)
                        }}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <MoreVertical className="w-5 h-5 text-gray-400" />
                      </button>

                      {menuOpenId === db.id && (
                        <>
                          <div
                            className="fixed inset-0 z-10"
                            onClick={(e) => {
                              e.stopPropagation()
                              setMenuOpenId(null)
                            }}
                          />
                          <div className="absolute right-0 mt-1 w-48 bg-white rounded-xl shadow-lg border border-gray-200 py-1 z-20">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setExpandedDb(db.id)
                                setMenuOpenId(null)
                              }}
                              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                            >
                              <Eye className="w-4 h-4" />
                              View Tables
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                syncMutation.mutate(db.id)
                                setMenuOpenId(null)
                              }}
                              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                            >
                              <RefreshCw className="w-4 h-4" />
                              Sync Schema
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setMenuOpenId(null)
                              }}
                              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                            >
                              <Settings className="w-4 h-4" />
                              Settings
                            </button>
                            <div className="border-t border-gray-100 my-1" />
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                if (confirm('Are you sure you want to delete this database connection?')) {
                                  deleteMutation.mutate(db.id)
                                }
                                setMenuOpenId(null)
                              }}
                              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                              Delete Connection
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded view with tables */}
                {expandedDb === db.id && expandedMetadata && (
                  <div className="border-t border-gray-200 p-4 bg-gray-50">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                        <Layers className="w-4 h-4 text-gray-500" />
                        Tables ({expandedMetadata.tables.length})
                      </h4>
                      <div className="relative max-w-xs">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Filter tables..."
                          className="w-full pl-9 pr-4 py-1.5 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                      {expandedMetadata.tables.map((table) => (
                        <div
                          key={table.id}
                          className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-200 hover:border-rose-300 hover:shadow-md transition-all cursor-pointer group"
                        >
                          <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center group-hover:bg-rose-100 transition-colors">
                            <Table className="w-5 h-5 text-gray-500 group-hover:text-rose-600 transition-colors" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-medium text-gray-900 truncate block">
                              {table.display_name || table.name}
                            </span>
                            <span className="text-xs text-gray-500">
                              {table.fields?.length || 0} columns
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Add database modal */}
      {isAddingDb && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
            onClick={() => setIsAddingDb(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-rose-100 rounded-xl">
                  <Database className="w-5 h-5 text-rose-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Add Database Connection</h2>
                  <p className="text-sm text-gray-500">Connect a new data source</p>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Display Name
                </label>
                <input
                  type="text"
                  value={newDb.name}
                  onChange={(e) => setNewDb({ ...newDb, name: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent focus:bg-white transition-all"
                  placeholder="My Database"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Database Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {DATABASE_ENGINES.slice(0, 4).map((engine) => (
                    <button
                      key={engine.value}
                      onClick={() => setNewDb({ ...newDb, engine: engine.value })}
                      className={clsx(
                        'flex items-center gap-2 p-3 rounded-xl border-2 text-sm font-medium transition-all',
                        newDb.engine === engine.value
                          ? 'border-rose-500 bg-rose-50 text-rose-700'
                          : 'border-gray-200 hover:border-gray-300 text-gray-700'
                      )}
                    >
                      <span className="text-lg">{engine.icon}</span>
                      {engine.label}
                    </button>
                  ))}
                </div>
                <select
                  value={newDb.engine}
                  onChange={(e) => setNewDb({ ...newDb, engine: e.target.value })}
                  className="w-full mt-2 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent focus:bg-white transition-all"
                >
                  {DATABASE_ENGINES.map((engine) => (
                    <option key={engine.value} value={engine.value}>
                      {engine.icon} {engine.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Host</label>
                  <input
                    type="text"
                    value={newDb.host}
                    onChange={(e) => setNewDb({ ...newDb, host: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent focus:bg-white transition-all"
                    placeholder="localhost"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Port</label>
                  <input
                    type="text"
                    value={newDb.port}
                    onChange={(e) => setNewDb({ ...newDb, port: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent focus:bg-white transition-all"
                    placeholder="5432"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Database Name
                </label>
                <input
                  type="text"
                  value={newDb.dbname}
                  onChange={(e) => setNewDb({ ...newDb, dbname: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent focus:bg-white transition-all"
                  placeholder="mydb"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Username</label>
                <input
                  type="text"
                  value={newDb.user}
                  onChange={(e) => setNewDb({ ...newDb, user: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent focus:bg-white transition-all"
                  placeholder="postgres"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
                <input
                  type="password"
                  value={newDb.password}
                  onChange={(e) => setNewDb({ ...newDb, password: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent focus:bg-white transition-all"
                  placeholder="••••••••"
                />
              </div>

              {createMutation.isError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  Failed to connect: {(createMutation.error as Error)?.message || 'Unknown error'}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => setIsAddingDb(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateDatabase}
                disabled={createMutation.isPending || !newDb.name || !newDb.host || !newDb.dbname}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-rose-600 hover:bg-rose-700 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {createMutation.isPending ? (
                  <>
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    Connecting...
                  </>
                ) : (
                  <>
                    <Link2 className="w-4 h-4" />
                    Connect Database
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
