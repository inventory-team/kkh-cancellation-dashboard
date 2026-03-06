import { useMemo, useState } from 'react'
import { skuCancellationStats, fmt$, fmtNum, fmtPct } from '../lib/dataTransform.js'
import DataTable from '../components/tables/DataTable.jsx'
import Badge from '../components/common/Badge.jsx'
import clsx from 'clsx'

function RateBar({ value }) {
  const pct = Math.min(value * 100, 100)
  const color = pct > 30 ? 'bg-red-500' : pct > 15 ? 'bg-amber-400' : 'bg-green-500'
  return (
    <div className="flex items-center gap-2 justify-end">
      <div className="w-16 bg-gray-100 rounded-full h-1.5">
        <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs">{fmtPct(value)}</span>
    </div>
  )
}

const COLUMNS = [
  { key: 'rank',        label: '#',           sortable: false, className: 'w-8 text-gray-400' },
  { key: 'sku',         label: 'SKU',         sortable: true,
    render: (v) => <span className="font-mono text-xs text-gray-800">{v}</span> },
  { key: 'productName', label: 'Product',     sortable: false,
    render: (v) => <span className="text-xs text-gray-600 line-clamp-2 max-w-[220px] block">{v || '—'}</span> },
  { key: 'vendor',      label: 'Vendor',      sortable: true },
  { key: 'cancelUnits', label: 'Cancel Units',sortable: true, align: 'right', render: (v) => fmtNum(v) },
  { key: 'cancelSales', label: 'Cancel Sales', sortable: true, align: 'right', render: (v) => fmt$(v) },
  { key: 'totalUnits',  label: 'Total Units', sortable: true, align: 'right', render: (v) => fmtNum(v) },
  { key: 'cancelRate',  label: 'Cancel Rate', sortable: true, align: 'right',
    render: (v) => <RateBar value={v} /> },
  { key: 'riskFlag',    label: 'Risk',        sortable: false,
    render: (v) => v ? <Badge label="HIGH RISK" tier="HIGH" /> : null },
]

export default function SKUView({ allRows, cancelledRows }) {
  const [excludeFraud, setExcludeFraud] = useState(false)

  const skus = useMemo(
    () => skuCancellationStats(allRows, cancelledRows, excludeFraud),
    [allRows, cancelledRows, excludeFraud]
  )

  const skusWithRisk = useMemo(
    () => skus.map((s, i) => ({
      ...s,
      rank: i + 1,
      riskFlag: s.cancelRate > 0.3 && s.cancelUnits >= 5,
    })),
    [skus]
  )

  const highRisk = skusWithRisk.filter((s) => s.riskFlag)

  if (!cancelledRows.length) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-gray-400">
        <p className="text-base font-medium">No cancellation data</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">SKU Analysis</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Top 100 cancelled SKUs by sales amount
          </p>
        </div>

        <label className="flex items-center gap-2 cursor-pointer select-none">
          <div
            className={clsx(
              'w-9 h-5 rounded-full transition-colors',
              excludeFraud ? 'bg-brand-600' : 'bg-gray-200'
            )}
            onClick={() => setExcludeFraud((v) => !v)}
          >
            <div className={clsx(
              'w-4 h-4 bg-white rounded-full shadow transition-transform mt-0.5',
              excludeFraud ? 'translate-x-4.5 ml-0.5' : 'ml-0.5'
            )} />
          </div>
          <span className="text-sm text-gray-600">Exclude FRAUD</span>
        </label>
      </div>

      {/* High risk alert */}
      {highRisk.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-red-600 font-semibold text-sm">
              ⚠ {highRisk.length} High-Risk SKU{highRisk.length > 1 ? 's' : ''} Detected
            </span>
            <span className="text-xs text-red-400">(cancel rate &gt;30%, ≥5 units)</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {highRisk.slice(0, 10).map((s) => (
              <div key={s.sku} className="bg-white border border-red-200 rounded-lg px-3 py-1.5 text-xs">
                <span className="font-mono font-semibold text-red-700">{s.sku}</span>
                <span className="text-red-400 ml-2">{fmtPct(s.cancelRate)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
          <div className="text-2xl font-bold text-gray-900">{skusWithRisk.length}</div>
          <div className="text-xs text-gray-500 mt-0.5">Unique Cancelled SKUs</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
          <div className="text-2xl font-bold text-red-600">{highRisk.length}</div>
          <div className="text-xs text-gray-500 mt-0.5">High-Risk SKUs</div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
          <div className="text-2xl font-bold text-gray-900">
            {fmt$(skusWithRisk.reduce((a, s) => a + s.cancelSales, 0))}
          </div>
          <div className="text-xs text-gray-500 mt-0.5">Total Cancelled Sales</div>
        </div>
      </div>

      {/* Full table */}
      <DataTable
        columns={COLUMNS}
        data={skusWithRisk}
        initialSort={{ key: 'cancelSales', dir: 'desc' }}
        maxHeight="520px"
      />

      {/* Category breakdown */}
      <CategoryBreakdown cancelledRows={cancelledRows} />
    </div>
  )
}

function CategoryBreakdown({ cancelledRows }) {
  const data = useMemo(() => {
    const map = {}
    for (const r of cancelledRows) {
      const c = r.category ?? 'Unknown'
      if (!map[c]) map[c] = { category: c, units: 0, sales: 0 }
      map[c].units += r.qty ?? 0
      map[c].sales += r.total_extended_booked_sales ?? 0
    }
    return Object.values(map).sort((a, b) => b.sales - a.sales).slice(0, 10)
  }, [cancelledRows])

  if (!data.length) return null

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">Top Categories by Cancelled Sales</h3>
      <div className="space-y-2">
        {data.map((d) => {
          const maxSales = data[0].sales
          const pct = maxSales > 0 ? (d.sales / maxSales) * 100 : 0
          return (
            <div key={d.category} className="flex items-center gap-3">
              <div className="w-36 text-xs text-gray-600 truncate shrink-0">{d.category}</div>
              <div className="flex-1 bg-gray-100 rounded-full h-2">
                <div className="bg-brand-500 h-2 rounded-full" style={{ width: `${pct}%` }} />
              </div>
              <div className="w-20 text-xs text-right text-gray-700 shrink-0">{fmt$(d.sales)}</div>
              <div className="w-12 text-xs text-right text-gray-400 shrink-0">{fmtNum(d.units)}u</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
