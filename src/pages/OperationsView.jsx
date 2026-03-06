import { useMemo, useState } from 'react'
import {
  topReasons,
  reasonMonthlyTrend,
  monthlyTrendDual,
  fmt$,
  fmtNum,
} from '../lib/dataTransform.js'
import { DualAxisTrendChart, SingleBarChart } from '../components/charts/TrendChart.jsx'
import DataTable from '../components/tables/DataTable.jsx'

const COLUMNS = [
  { key: 'rank',    label: '#',             sortable: false, className: 'text-gray-400 w-8' },
  { key: 'reason',  label: 'Cancellation Reason', sortable: true },
  { key: 'units',   label: 'Units',         sortable: true, align: 'right', render: (v) => fmtNum(v) },
  { key: 'sales',   label: 'Sales Lost',    sortable: true, align: 'right', render: (v) => fmt$(v) },
  { key: 'pctUnits',label: '% of Units',    sortable: true, align: 'right',
    render: (v) => (
      <div className="flex items-center gap-2 justify-end">
        <div className="w-16 bg-gray-100 rounded-full h-1.5">
          <div className="bg-brand-500 h-1.5 rounded-full" style={{ width: `${Math.min(v, 100)}%` }} />
        </div>
        <span className="text-xs">{v?.toFixed(1)}%</span>
      </div>
    )
  },
]

export default function OperationsView({ cancelledRows }) {
  const [selectedReason, setSelectedReason] = useState(null)

  const reasons = useMemo(() => topReasons(cancelledRows, 10), [cancelledRows])
  const totalUnits = reasons.reduce((a, r) => a + r.units, 0)

  const reasonsWithPct = reasons.map((r, i) => ({
    ...r,
    rank: i + 1,
    pctUnits: totalUnits > 0 ? (r.units / totalUnits) * 100 : 0,
  }))

  const reasonTrend = useMemo(
    () => selectedReason ? reasonMonthlyTrend(cancelledRows, selectedReason) : [],
    [cancelledRows, selectedReason]
  )

  if (!cancelledRows.length) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-gray-400">
        <p className="text-base font-medium">No cancellation data</p>
        <p className="text-sm mt-1">Upload a CSV with cancellations to see operations analysis</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Operations Analysis</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          Root cause breakdown across {fmtNum(cancelledRows.length)} cancellation records
        </p>
      </div>

      {/* Horizontal bar: units by reason */}
      <SingleBarChart
        data={reasonsWithPct.map((r) => ({ label: r.reason, units: r.units }))}
        dataKey="units"
        xKey="label"
        title="Top 10 Cancellation Reasons — Units"
        color="#4a5ff7"
        horizontal
      />

      {/* Horizontal bar: sales by reason */}
      <SingleBarChart
        data={reasonsWithPct.map((r) => ({ label: r.reason, sales: r.sales }))}
        dataKey="sales"
        xKey="label"
        title="Top 10 Cancellation Reasons — Sales Lost"
        color="#f59e0b"
        isCurrency
        horizontal
      />

      {/* Table */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">
          Reason Detail — click a row to see monthly trend
        </h3>
        <div
          onClick={(e) => {
            const tr = e.target.closest('tr')
            if (!tr) return
            const idx = tr.rowIndex - 1
            if (idx >= 0 && reasonsWithPct[idx]) {
              const r = reasonsWithPct[idx].reason
              setSelectedReason((prev) => (prev === r ? null : r))
            }
          }}
        >
          <DataTable
            columns={COLUMNS}
            data={reasonsWithPct}
            initialSort={{ key: 'units', dir: 'desc' }}
          />
        </div>
      </div>

      {/* Trend for selected reason */}
      {selectedReason && reasonTrend.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            Monthly Trend — <span className="text-brand-600">{selectedReason}</span>
          </h3>
          <DualAxisTrendChart data={reasonTrend} title={`${selectedReason}: Monthly Units & Sales`} />
        </div>
      )}

      {/* Fulfillment breakdown */}
      <FulfillmentBreakdown cancelledRows={cancelledRows} />
    </div>
  )
}

function FulfillmentBreakdown({ cancelledRows }) {
  const data = useMemo(() => {
    const map = {}
    for (const r of cancelledRows) {
      const loc = r.fulfillment_location ?? 'Unknown'
      if (!map[loc]) map[loc] = { location: loc, units: 0, sales: 0 }
      map[loc].units += r.qty ?? 0
      map[loc].sales += r.total_extended_booked_sales ?? 0
    }
    return Object.values(map).sort((a, b) => b.units - a.units)
  }, [cancelledRows])

  if (!data.length) return null

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">Cancellations by Fulfillment Location</h3>
      <div className="flex flex-wrap gap-4">
        {data.map((d) => (
          <div key={d.location} className="flex-1 min-w-[140px] bg-gray-50 rounded-lg p-4 text-center">
            <div className="text-sm font-semibold text-gray-600">{d.location}</div>
            <div className="text-xl font-bold text-gray-900 mt-1">{fmtNum(d.units)}</div>
            <div className="text-xs text-gray-400">{fmt$(d.sales)}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
