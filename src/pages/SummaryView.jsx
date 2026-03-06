import { useMemo } from 'react'
import {
  computeSummaryKPIs,
  monthlyTrendDual,
  yoyComparison,
  extractFilterOptions,
  fmt$,
  fmtNum,
  fmtPct,
} from '../lib/dataTransform.js'
import KPICard from '../components/cards/KPICard.jsx'
import { DualAxisTrendChart, YoYLineChart } from '../components/charts/TrendChart.jsx'

export default function SummaryView({ allRows, cancelledRows }) {
  const kpis = useMemo(() => computeSummaryKPIs(allRows, cancelledRows), [allRows, cancelledRows])
  const monthlyData = useMemo(() => monthlyTrendDual(cancelledRows), [cancelledRows])

  const { years } = useMemo(() => extractFilterOptions(allRows), [allRows])
  const yoyUnits  = useMemo(() => yoyComparison(cancelledRows, years, 'qty'), [cancelledRows, years])
  const yoySales  = useMemo(() => yoyComparison(cancelledRows, years, 'total_extended_booked_sales'), [cancelledRows, years])

  if (!allRows.length) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-gray-400">
        <div className="text-5xl mb-4">📊</div>
        <p className="text-base font-medium">No data loaded</p>
        <p className="text-sm mt-1">Upload a CSV file to get started</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Summary</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          High-level cancellation KPIs across {allRows.length.toLocaleString()} rows
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Total Cancelled Units"
          value={fmtNum(kpis.cancelUnits)}
          subtext={`of ${fmtNum(kpis.totalUnits)} total units`}
          accentClass="bg-red-500"
          icon="✕"
        />
        <KPICard
          title="Cancelled Sales"
          value={fmt$(kpis.cancelSales)}
          subtext={`of ${fmt$(kpis.totalSales)} total`}
          accentClass="bg-amber-500"
          icon="$"
        />
        <KPICard
          title="Cancelled Orders"
          value={fmtNum(kpis.cancelOrders)}
          subtext="unique order IDs"
          accentClass="bg-purple-500"
          icon="#"
        />
        <KPICard
          title="Cancellation Rate"
          value={fmtPct(kpis.cancelRate)}
          subtext={`${fmtPct(kpis.cancelSalesRate)} by revenue`}
          accentClass={kpis.cancelRate > 0.1 ? 'bg-red-600' : kpis.cancelRate > 0.05 ? 'bg-amber-500' : 'bg-green-500'}
          icon="~"
        />
      </div>

      {/* Rate gauge */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Cancellation Rate Health</h3>
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="w-full bg-gray-100 rounded-full h-4 overflow-hidden">
              <div
                className={`h-4 rounded-full transition-all ${
                  kpis.cancelRate > 0.1 ? 'bg-red-500' :
                  kpis.cancelRate > 0.05 ? 'bg-amber-400' : 'bg-green-500'
                }`}
                style={{ width: `${Math.min(kpis.cancelRate * 100 * 3, 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>0%</span><span>5%</span><span>10%+</span>
            </div>
          </div>
          <div className="text-2xl font-bold text-gray-900 w-16 text-right">
            {fmtPct(kpis.cancelRate)}
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          Target: &lt;5% · Warning: 5–10% · Critical: &gt;10%
        </p>
      </div>

      {/* Monthly trend */}
      <DualAxisTrendChart data={monthlyData} title="Monthly Cancelled Units & Sales" />

      {/* YoY comparisons */}
      {years.length > 1 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <YoYLineChart
            data={yoyUnits}
            years={years}
            title="Year-over-Year: Cancelled Units"
            valueKey="units"
          />
          <YoYLineChart
            data={yoySales}
            years={years}
            title="Year-over-Year: Cancelled Sales"
            isCurrency
          />
        </div>
      )}

      {/* Sale source breakdown */}
      <SaleSourceBreakdown cancelledRows={cancelledRows} />
    </div>
  )
}

function SaleSourceBreakdown({ cancelledRows }) {
  const data = useMemo(() => {
    const map = {}
    for (const r of cancelledRows) {
      const s = r.sale_source ?? 'Unknown'
      if (!map[s]) map[s] = { source: s, units: 0, sales: 0 }
      map[s].units += r.qty ?? 0
      map[s].sales += r.total_extended_booked_sales ?? 0
    }
    return Object.values(map).sort((a, b) => b.sales - a.sales)
  }, [cancelledRows])

  if (!data.length) return null

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">Cancellations by Sale Source</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {data.map((d) => (
          <div key={d.source} className="bg-gray-50 rounded-lg p-3 text-center">
            <div className="text-sm font-semibold text-gray-700">{d.source}</div>
            <div className="text-lg font-bold text-gray-900 mt-1">{fmtNum(d.units)}</div>
            <div className="text-xs text-gray-400">{fmt$(d.sales)}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
