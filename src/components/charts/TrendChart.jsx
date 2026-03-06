import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import { fmt$, fmtNum } from '../../lib/dataTransform.js'

const COLORS = {
  units:  '#4a5ff7',
  sales:  '#f59e0b',
  units2: '#93c5fd',
  sales2: '#fcd34d',
  '2025': '#4a5ff7',
  '2026': '#f59e0b',
}

function formatTick(value, type) {
  if (type === 'currency') return fmt$(value)
  return fmtNum(value)
}

export function DualAxisTrendChart({ data, title }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={260}>
        <ComposedChart data={data} margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#6b7280' }} />
          <YAxis yAxisId="units" orientation="left" tick={{ fontSize: 11, fill: '#6b7280' }}
            tickFormatter={(v) => fmtNum(v)} />
          <YAxis yAxisId="sales" orientation="right" tick={{ fontSize: 11, fill: '#6b7280' }}
            tickFormatter={(v) => fmt$(v)} />
          <Tooltip
            formatter={(value, name) =>
              name === 'sales' ? [fmt$(value), 'Sales'] : [fmtNum(value), 'Units']
            }
          />
          <Legend wrapperStyle={{ fontSize: '12px' }} />
          <Bar yAxisId="units" dataKey="units" fill={COLORS.units} opacity={0.85} name="Units" radius={[3, 3, 0, 0]} />
          <Line yAxisId="sales" dataKey="sales" stroke={COLORS.sales} strokeWidth={2} dot={{ r: 3 }} name="Sales" />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}

export function YoYLineChart({ data, years, title, valueKey = 'units', isCurrency = false }) {
  const yearColors = ['#4a5ff7', '#f59e0b', '#10b981', '#ef4444']

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={260}>
        <ComposedChart data={data} margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#6b7280' }} />
          <YAxis tick={{ fontSize: 11, fill: '#6b7280' }}
            tickFormatter={(v) => isCurrency ? fmt$(v) : fmtNum(v)} />
          <Tooltip
            formatter={(value, name) =>
              [isCurrency ? fmt$(value) : fmtNum(value), name]
            }
          />
          <Legend wrapperStyle={{ fontSize: '12px' }} />
          {years.map((year, i) => (
            <Line
              key={year}
              dataKey={String(year)}
              stroke={yearColors[i % yearColors.length]}
              strokeWidth={2}
              dot={{ r: 3 }}
              name={String(year)}
              connectNulls
            />
          ))}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}

export function SingleBarChart({ data, dataKey, xKey = 'label', title, color = '#4a5ff7', isCurrency = false, horizontal = false }) {
  if (horizontal) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">{title}</h3>
        <ResponsiveContainer width="100%" height={Math.max(200, data.length * 32)}>
          <ComposedChart
            layout="vertical"
            data={data}
            margin={{ top: 4, right: 16, left: 8, bottom: 4 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11, fill: '#6b7280' }}
              tickFormatter={(v) => isCurrency ? fmt$(v) : fmtNum(v)} />
            <YAxis type="category" dataKey={xKey} width={160} tick={{ fontSize: 11, fill: '#374151' }} />
            <Tooltip formatter={(v) => [isCurrency ? fmt$(v) : fmtNum(v), dataKey]} />
            <Bar dataKey={dataKey} fill={color} radius={[0, 4, 4, 0]} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={260}>
        <ComposedChart data={data} margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey={xKey} tick={{ fontSize: 11, fill: '#6b7280' }} />
          <YAxis tick={{ fontSize: 11, fill: '#6b7280' }}
            tickFormatter={(v) => isCurrency ? fmt$(v) : fmtNum(v)} />
          <Tooltip formatter={(v) => [isCurrency ? fmt$(v) : fmtNum(v), dataKey]} />
          <Bar dataKey={dataKey} fill={color} radius={[3, 3, 0, 0]} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
