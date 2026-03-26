import { useMemo, useState } from 'react'
import {
  vendorCancellationStats,
  computeVendorRiskScores,
  monthlyTrendDual,
  fmt$,
  fmtNum,
  fmtPct,
} from '../lib/dataTransform.js'
import Badge from '../components/common/Badge.jsx'
import DataTable from '../components/tables/DataTable.jsx'
import { SingleBarChart, DualAxisTrendChart } from '../components/charts/TrendChart.jsx'

const BADGE_TIER = { HIGH: 'HIGH', MEDIUM: 'MEDIUM', LOW: 'LOW' }

const COLUMNS = [
  { key: 'rank',        label: '#',          sortable: false, className: 'w-8 text-gray-400' },
  { key: 'vendor',      label: 'Vendor',     sortable: true,  render: (v) => <span className="font-medium text-gray-800">{v}</span> },
  { key: 'riskTier',    label: 'Risk',       sortable: true,
    render: (v) => <Badge label={v} tier={BADGE_TIER[v] ?? 'INFO'} /> },
  { key: 'riskScore',   label: 'Risk Score', sortable: true,  align: 'right',
    render: (v) => (
      <div className="flex items-center gap-2 justify-end">
        <div className="w-16 bg-gray-100 rounded-full h-1.5">
          <div
            className={`h-1.5 rounded-full ${v >= 70 ? 'bg-red-500' : v >= 40 ? 'bg-amber-400' : 'bg-green-500'}`}
            style={{ width: `${v}%` }}
          />
        </div>
        <span className="text-xs font-semibold">{v}</span>
      </div>
    )
  },
  { key: 'cancelUnits', label: 'Cancel Units', sortable: true, align: 'right', render: (v) => fmtNum(v) },
  { key: 'cancelSales', label: 'Cancel Sales',  sortable: true, align: 'right', render: (v) => fmt$(v) },
  { key: 'cancelRate',  label: 'Cancel Rate',   sortable: true, align: 'right', render: (v) => fmtPct(v) },
  { key: 'uniqueSkus',  label: 'SKUs',          sortable: true, align: 'right' },
  { key: 'topReason',   label: 'Top Reason',    sortable: false },
]

export default function VendorView({ allRows, cancelledRows }) {
  const [selectedVendor, setSelectedVendor] = useState(null)

  const vendorStats = useMemo(
    () => vendorCancellationStats(allRows, cancelledRows),
    [allRows, cancelledRows]
  )
  const scored = useMemo(() => computeVendorRiskScores(vendorStats), [vendorStats])

  const topByUnits = [...scored].sort((a, b) => b.cancelUnits - a.cancelUnits).slice(0, 10).map((v) => ({ label: v.vendor, units: v.cancelUnits }))
  const topBySales = [...scored].sort((a, b) => b.cancelSales - a.cancelSales).slice(0, 10).map((v) => ({ label: v.vendor, sales: v.cancelSales }))

  const selectedData = useMemo(() => {
    if (!selectedVendor) return null
    return scored.find((v) => v.vendor === selectedVendor)
  }, [scored, selectedVendor])

  const vendorTrend = useMemo(() => {
    if (!selectedVendor) return []
    const rows = cancelledRows.filter((r) => r.vendor === selectedVendor)
    return monthlyTrendDual(rows)
  }, [cancelledRows, selectedVendor])

  // Top vendor SKUs
  const vendorSkus = useMemo(() => {
    if (!selectedVendor) return []
    const map = {}
    for (const r of cancelledRows.filter((r) => r.vendor === selectedVendor)) {
      const s = r.sku ?? 'Unknown'
      if (!map[s]) map[s] = { sku: s, productName: r.product_name ?? '', units: 0, sales: 0 }
      map[s].units += r.qty ?? 0
      map[s].sales += r.total_extended_booked_sales ?? 0
    }
    return Object.values(map).sort((a, b) => b.sales - a.sales).slice(0, 10)
  }, [cancelledRows, selectedVendor])

  if (!cancelledRows.length) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-gray-400">
        <p className="text-base font-medium">No cancellation data</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Vendor Analysis</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          {scored.length} vendors ranked by cancellation risk
        </p>
      </div>

      {/* Risk tier summary */}
      <div className="grid grid-cols-3 gap-4">
        {(['HIGH', 'MEDIUM', 'LOW']).map((tier) => {
          const count = scored.filter((v) => v.riskTier === tier).length
          return (
            <div key={tier} className={`rounded-xl border p-4 text-center ${
              tier === 'HIGH' ? 'bg-red-50 border-red-200' :
              tier === 'MEDIUM' ? 'bg-amber-50 border-amber-200' : 'bg-green-50 border-green-200'
            }`}>
              <div className={`text-2xl font-bold ${
                tier === 'HIGH' ? 'text-red-600' : tier === 'MEDIUM' ? 'text-amber-600' : 'text-green-600'
              }`}>{count}</div>
              <div className="text-xs font-semibold text-gray-500 mt-0.5">{tier} Risk Vendors</div>
            </div>
          )
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SingleBarChart data={topByUnits} dataKey="units" xKey="label"
          title="Top 10 Vendors — Cancelled Units" color="#4a5ff7" horizontal />
        <SingleBarChart data={topBySales} dataKey="sales" xKey="label"
          title="Top 10 Vendors — Cancelled Sales" color="#f59e0b" isCurrency horizontal />
      </div>

      {/* Vendor Risk Table */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">
          Vendor Risk Scoreboard — click a row to drill down
        </h3>
        <div
          onClick={(e) => {
            const tr = e.target.closest('tr[data-idx]')
            if (!tr) return
            const idx = parseInt(tr.dataset.idx)
            if (!isNaN(idx) && scored[idx]) {
              const v = scored[idx].vendor
              setSelectedVendor((prev) => (prev === v ? null : v))
            }
          }}
        >
          <DataTable
            columns={COLUMNS}
            data={scored}
            initialSort={{ key: 'riskScore', dir: 'desc' }}
          />
        </div>
      </div>

      {/* Vendor drill-down */}
      {selectedData && (
        <div className="bg-brand-50 border border-brand-200 rounded-xl p-5 space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-semibold text-gray-900">{selectedData.vendor}</h3>
              <p className="text-xs text-gray-500 mt-0.5">Vendor Drill-Down</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge label={selectedData.riskTier} tier={selectedData.riskTier} />
              <span className="text-sm font-bold text-gray-800">Score: {selectedData.riskScore}/100</span>
              <button onClick={() => setSelectedVendor(null)} className="text-gray-400 hover:text-gray-600 text-lg">×</button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Cancel Units', value: fmtNum(selectedData.cancelUnits) },
              { label: 'Cancel Sales', value: fmt$(selectedData.cancelSales) },
              { label: 'Cancel Rate',  value: fmtPct(selectedData.cancelRate) },
              { label: 'Top Reason',   value: selectedData.topReason },
            ].map((item) => (
              <div key={item.label} className="bg-white rounded-lg p-3 text-center border border-brand-100">
                <div className="text-sm font-bold text-gray-900">{item.value}</div>
                <div className="text-xs text-gray-400 mt-0.5">{item.label}</div>
              </div>
            ))}
          </div>

          {vendorTrend.length > 0 && (
            <DualAxisTrendChart data={vendorTrend} title={`${selectedData.vendor} — Monthly Cancellations`} />
          )}

          {vendorSkus.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                Top Cancelled SKUs
              </h4>
              <DataTable
                compact
                columns={[
                  { key: 'sku',         label: 'SKU',    sortable: true },
                  { key: 'productName', label: 'Product', sortable: false, className: 'max-w-[200px] truncate' },
                  { key: 'units',       label: 'Units',   sortable: true, align: 'right', render: (v) => fmtNum(v) },
                  { key: 'sales',       label: 'Sales',   sortable: true, align: 'right', render: (v) => fmt$(v) },
                ]}
                data={vendorSkus}
                initialSort={{ key: 'sales', dir: 'desc' }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
