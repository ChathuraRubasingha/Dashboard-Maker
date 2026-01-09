import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import type { QueryResult, VisualizationType } from '../types'

interface Props {
  data: QueryResult
  type: VisualizationType
  colors?: string[]
  showLegend?: boolean
  showGrid?: boolean
  xAxisLabel?: string
  yAxisLabel?: string
  customLabels?: Record<string, string> // For table column labels
}

const DEFAULT_COLORS = [
  '#509EE3',
  '#88BF4D',
  '#A989C5',
  '#EF8C8C',
  '#F9D45C',
  '#F2A86F',
  '#98D9D9',
  '#7172AD',
]

export default function ChartRenderer({
  data,
  type,
  colors = DEFAULT_COLORS,
  showLegend = true,
  showGrid = true,
  xAxisLabel,
  yAxisLabel,
  customLabels = {},
}: Props) {
  // Helper to get column display name (custom label or original)
  const getColumnLabel = (col: { name: string; display_name: string }) => {
    return customLabels[col.name] || col.display_name || col.name
  }
  // Transform data for charts
  const chartData = data.data.rows.map((row) => {
    const obj: Record<string, unknown> = {}
    data.data.cols.forEach((col, index) => {
      obj[col.display_name || col.name] = row[index]
    })
    return obj
  })

  const columns = data.data.cols
  const xKey = columns[0]?.display_name || columns[0]?.name || 'x'
  const valueKeys = columns.slice(1).map((col) => col.display_name || col.name)

  // Table view
  if (type === 'table') {
    return (
      <div className="overflow-auto h-full">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              {columns.map((col, index) => (
                <th
                  key={index}
                  className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  {getColumnLabel(col)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.data.rows.map((row, rowIndex) => (
              <tr key={rowIndex} className="hover:bg-gray-50">
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex} className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">
                    {formatCellValue(cell, columns[cellIndex]?.base_type)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {data.data.rows.length === 0 && (
          <div className="text-center py-8 text-gray-500">No data available</div>
        )}
      </div>
    )
  }

  // Bar chart
  if (type === 'bar') {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />}
          <XAxis
            dataKey={xKey}
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: '#e0e0e0' }}
            label={xAxisLabel ? { value: xAxisLabel, position: 'bottom' } : undefined}
          />
          <YAxis
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: '#e0e0e0' }}
            label={yAxisLabel ? { value: yAxisLabel, angle: -90, position: 'left' } : undefined}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e0e0e0',
              borderRadius: 8,
              fontSize: 12,
            }}
          />
          {showLegend && <Legend />}
          {valueKeys.map((key, index) => (
            <Bar
              key={key}
              dataKey={key}
              fill={colors[index % colors.length]}
              radius={[4, 4, 0, 0]}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    )
  }

  // Line chart
  if (type === 'line') {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />}
          <XAxis
            dataKey={xKey}
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: '#e0e0e0' }}
          />
          <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={{ stroke: '#e0e0e0' }} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e0e0e0',
              borderRadius: 8,
              fontSize: 12,
            }}
          />
          {showLegend && <Legend />}
          {valueKeys.map((key, index) => (
            <Line
              key={key}
              type="monotone"
              dataKey={key}
              stroke={colors[index % colors.length]}
              strokeWidth={2}
              dot={{ fill: colors[index % colors.length], strokeWidth: 0, r: 4 }}
              activeDot={{ r: 6 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    )
  }

  // Area chart
  if (type === 'area') {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
          {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />}
          <XAxis
            dataKey={xKey}
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: '#e0e0e0' }}
          />
          <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={{ stroke: '#e0e0e0' }} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e0e0e0',
              borderRadius: 8,
              fontSize: 12,
            }}
          />
          {showLegend && <Legend />}
          {valueKeys.map((key, index) => (
            <Area
              key={key}
              type="monotone"
              dataKey={key}
              stroke={colors[index % colors.length]}
              fill={colors[index % colors.length]}
              fillOpacity={0.2}
              strokeWidth={2}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    )
  }

  // Pie chart
  if (type === 'pie') {
    const pieData = chartData.map((item, index) => ({
      name: String(item[xKey]),
      value: Number(item[valueKeys[0]] || 0),
      fill: colors[index % colors.length],
    }))

    return (
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={pieData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius="80%"
            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
            labelLine={false}
          >
            {pieData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e0e0e0',
              borderRadius: 8,
              fontSize: 12,
            }}
          />
          {showLegend && <Legend />}
        </PieChart>
      </ResponsiveContainer>
    )
  }

  // Default: table
  return (
    <div className="text-center text-gray-500 py-8">
      Unsupported chart type: {type}
    </div>
  )
}

function formatCellValue(value: unknown, baseType?: string): string {
  if (value === null || value === undefined) {
    return '-'
  }

  if (baseType?.includes('DateTime') || baseType?.includes('Date')) {
    try {
      return new Date(String(value)).toLocaleString()
    } catch {
      return String(value)
    }
  }

  if (typeof value === 'number') {
    return value.toLocaleString()
  }

  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No'
  }

  return String(value)
}
