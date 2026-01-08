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
} from 'lucide-react'
import clsx from 'clsx'
import { metabaseService } from '../services/metabaseService'

const DATABASE_ENGINES = [
  { value: 'postgres', label: 'PostgreSQL' },
  { value: 'mysql', label: 'MySQL' },
  { value: 'sqlserver', label: 'SQL Server' },
  { value: 'mongo', label: 'MongoDB' },
  { value: 'bigquery-cloud-sdk', label: 'BigQuery' },
  { value: 'redshift', label: 'Amazon Redshift' },
  { value: 'snowflake', label: 'Snowflake' },
]

export default function DatabaseManager() {
  const queryClient = useQueryClient()

  const [isAddingDb, setIsAddingDb] = useState(false)
  const [expandedDb, setExpandedDb] = useState<number | null>(null)
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

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Database Connections</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage your data source connections
          </p>
        </div>
        <button
          onClick={() => setIsAddingDb(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Add Database
        </button>
      </div>

      {/* Database list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : databases.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <Database className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No databases connected</h3>
          <p className="text-gray-500 mb-4">
            Connect your first database to start analyzing data
          </p>
          <button
            onClick={() => setIsAddingDb(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-5 h-5" />
            Add Database
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {databases.map((db) => (
            <div
              key={db.id}
              className="bg-white rounded-lg border border-gray-200 overflow-hidden"
            >
              <div
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
                onClick={() => setExpandedDb(expandedDb === db.id ? null : db.id)}
              >
                <div className="flex items-center gap-4">
                  {expandedDb === db.id ? (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  )}
                  <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-lg">
                    <Database className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">{db.name}</h3>
                    <p className="text-sm text-gray-500 capitalize">{db.engine}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      syncMutation.mutate(db.id)
                    }}
                    className="p-2 hover:bg-gray-100 rounded-lg"
                    title="Sync schema"
                  >
                    <RefreshCw
                      className={clsx(
                        'w-5 h-5 text-gray-500',
                        syncMutation.isPending && 'animate-spin'
                      )}
                    />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      if (confirm('Are you sure you want to delete this database connection?')) {
                        deleteMutation.mutate(db.id)
                      }
                    }}
                    className="p-2 hover:bg-red-50 rounded-lg"
                    title="Delete"
                  >
                    <Trash2 className="w-5 h-5 text-red-500" />
                  </button>
                </div>
              </div>

              {/* Expanded view with tables */}
              {expandedDb === db.id && expandedMetadata && (
                <div className="border-t border-gray-200 p-4 bg-gray-50">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">
                    Tables ({expandedMetadata.tables.length})
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                    {expandedMetadata.tables.map((table) => (
                      <div
                        key={table.id}
                        className="flex items-center gap-2 p-2 bg-white rounded border border-gray-200"
                      >
                        <Table className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-700 truncate">
                          {table.display_name || table.name}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add database modal */}
      {isAddingDb && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setIsAddingDb(false)} />
          <div className="relative bg-white rounded-xl shadow-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Add Database Connection</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Display Name
                </label>
                <input
                  type="text"
                  value={newDb.name}
                  onChange={(e) => setNewDb({ ...newDb, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="My Database"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Database Type
                </label>
                <select
                  value={newDb.engine}
                  onChange={(e) => setNewDb({ ...newDb, engine: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {DATABASE_ENGINES.map((engine) => (
                    <option key={engine.value} value={engine.value}>
                      {engine.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Host</label>
                  <input
                    type="text"
                    value={newDb.host}
                    onChange={(e) => setNewDb({ ...newDb, host: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="localhost"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Port</label>
                  <input
                    type="text"
                    value={newDb.port}
                    onChange={(e) => setNewDb({ ...newDb, port: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="5432"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Database Name
                </label>
                <input
                  type="text"
                  value={newDb.dbname}
                  onChange={(e) => setNewDb({ ...newDb, dbname: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="mydb"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                <input
                  type="text"
                  value={newDb.user}
                  onChange={(e) => setNewDb({ ...newDb, user: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="postgres"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input
                  type="password"
                  value={newDb.password}
                  onChange={(e) => setNewDb({ ...newDb, password: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setIsAddingDb(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateDatabase}
                disabled={createMutation.isPending || !newDb.name || !newDb.host || !newDb.dbname}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50"
              >
                {createMutation.isPending ? 'Connecting...' : 'Add Database'}
              </button>
            </div>

            {createMutation.isError && (
              <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                Failed to connect: {(createMutation.error as Error)?.message || 'Unknown error'}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
