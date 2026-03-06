import { useMemo } from 'react'
import {
  computeEarlyWarnings,
  monthlyTrend,
  vendorCancellationStats,
  computeVendorRiskScores,
  skuCancellationStats,
  MONTH_NAMES,
  fmt$,
  fmtNum,
  fmtPct,
} from '../lib/dataTransform.js'
import Badge from '../components/common/Badge.jsx'
import { SingleBarChart } from '../components/charts/TrendChart.jsx'
import clsx from 'clsx'

const TYPE_CONFIG = {
  MOM_SPIKE:       { icon: '📈', bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700' },
  SKU_SPIKE:       { icon: '📦', bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700' },
  VENDOR_TREND:    { icon: '🏭', bg: 'bg-red-50',    border: 'border-red-200',    text: 'text-red-700' },
  HIGH_CANCEL_RATE:{ icon: '🚨', bg: 'bg-red-50',    border: 'border-red-200',    text: 'text-red-700' },
}

export default function EarlyWarningView({ allRows, cancelledRows }) {
  const warnings = useMemo(
    () => computeEarlyWarnings(cancelledRows, allRows),
    [cancelledRows, allRows]
  )

  const monthly = useMemo(() => monthlyTrend(cancelledRows, 'qty'), [cancelledRows])

  // MoM change per month
  const momData = useMemo(() => {
    return monthly.map((m, i) => {
      if (i === 0) return { ...m, mom: 0 }
      const prev = monthly[i - 1]
      const mom = prev.value > 0 ? ((m.value - prev.value) / prev.value) * 100 : 0
      return { ...m, mom: parseFloat(mom.toFixed(1)) }
    })
  }, [monthly])

  // SKUs with highest cancel rate in last 2 months
  const risingSkus = useMemo(() => {
    if (monthly.length < 2) return []
    const [pm, cm] = monthly.slice(-2)
    const map = {}
    for (const r of cancelledRows) {
      if (!r.sku) continue
      if (!map[r.sku]) map[r.sku] = { sku: r.sku, prev: 0, curr: 0, vendor: r.vendor }
      if (r.year === pm.year && r.month === pm.month) map[r.sku].prev += r.qty ?? 0
      if (r.year === cm.year && r.month === cm.month) map[r.sku].curr += r.qty ?? 0
    }
    return Object.values(map)
      .filter((s) => s.prev > 0 && s.curr > s.prev && s.curr >= 2)
      .sort((a, b) => (b.curr - b.prev) - (a.curr - a.prev))
      .slice(0, 10)
      .map((s) => ({ ...s, change: ((s.curr - s.prev) / s.prev * 100).toFixed(0) }))
  }, [cancelledRows, monthly])

  // Vendors with worsening trend
  const worsening = useMemo(() => {
    const stats = vendorCancellationStats(allRows, cancelledRows)
    return stats
      .filter((v) => {
        const sorted = Object.entries(v.monthlyData ?? {}).sort(([a], [b]) => a.localeCompare(b))
        if (sorted.length < 3) return false
        let streak = 0
        for (let i = 1; i < sorted.length; i++) {
          if (sorted[i][1] > sorted[i - 1][1]) streak++
          else streak = 0
          if (streak >= 2) return true
        }
        return false
      })
      .slice(0, 8)
  }, [allRows, cancelledRows])

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
        <h2 className="text-lg font-semibold text-gray-900">Early Warning</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          Automated detection of rising cancellation patterns
        </p>
      </div>

      {/* Alert cards */}
      {warnings.length === 0 ? (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
          <div className="text-3xl mb-2">✅</div>
          <p className="text-sm font-medium text-green-700">No critical warnings detected</p>
          <p className="text-xs text-green-500 mt-1">Cancellation patterns appear stable</p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-700">{warnings.length} Warning{warnings.length > 1 ? 's' : ''}</span>
            <span className="text-xs text-gray-400">sorted by severity</span>
          </div>
          {warnings.map((w, i) => {
            const cfg = TYPE_CONFIG[w.type] ?? TYPE_CONFIG.MOM_SPIKE
            return (
              <div key={i} className={clsx('rounded-xl border p-4 flex gap-3', cfg.bg, cfg.border)}>
                <span className="text-xl shrink-0">{cfg.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={clsx('text-sm font-semibold', cfg.text)}>{w.label}</span>
                    <Badge label={w.severity} tier={w.severity === 'HIGH' ? 'HIGH' : 'MEDIUM'} />
                  </div>
                  <p className="text-xs text-gray-600 mt-0.5">{w.detail}</p>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* MoM change chart */}
      {momData.length > 1 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Month-over-Month Change (%)</h3>
          <div className="space-y-2">
            {momData.slice(1).map((m) => {
              const positive = m.mom > 0
              const pct = Math.min(Math.abs(m.mom), 100)
              return (
                <div key={m.label} className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 w-20 shrink-0">{m.label}</span>
                  <div className="flex-1 flex items-center gap-1">
                    {positive ? (
                      <div className="flex-1 flex items-center">
                        <div className="w-1/2" />
                        <div
                          className="h-4 rounded-r-full bg-red-400"
                          style={{ width: `${pct / 2}%`, minWidth: '2px' }}
                        />
                      </div>
                    ) : (
                      <div className="flex-1 flex items-center justify-end">
                        <div
                          className="h-4 rounded-l-full bg-green-400"
                          style={{ width: `${pct / 2}%`, minWidth: '2px' }}
                        />
                        <div className="w-1/2" />
                      </div>
                    )}
                  </div>
                  <span className={clsx(
                    'text-xs font-medium w-14 text-right shrink-0',
                    positive ? 'text-red-500' : 'text-green-600'
                  )}>
                    {positive ? '+' : ''}{m.mom}%
                  </span>
                  <span className="text-xs text-gray-400 w-14 text-right shrink-0">{fmtNum(m.value)} u</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Rising SKUs */}
      {risingSkus.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            SKUs with Increasing Cancellations (last 2 months)
          </h3>
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {['SKU', 'Vendor', 'Prev Month', 'Current Month', 'Change'].map((h) => (
                    <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {risingSkus.map((s) => (
                  <tr key={s.sku} className="hover:bg-gray-50">
                    <td className="px-3 py-2 font-mono text-xs">{s.sku}</td>
                    <td className="px-3 py-2 text-xs text-gray-600">{s.vendor}</td>
                    <td className="px-3 py-2 text-center">{s.prev}</td>
                    <td className="px-3 py-2 text-center font-semibold text-red-600">{s.curr}</td>
                    <td className="px-3 py-2">
                      <span className="text-xs font-semibold text-red-500">+{s.change}%</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Worsening vendors */}
      {worsening.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            Vendors with Worsening Trends (2+ consecutive months rising)
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {worsening.map((v) => (
              <div key={v.vendor} className="bg-red-50 border border-red-100 rounded-lg p-3 text-center">
                <div className="text-xs font-semibold text-gray-800 truncate">{v.vendor}</div>
                <div className="text-lg font-bold text-red-600 mt-1">{fmtNum(v.cancelUnits)}</div>
                <div className="text-xs text-gray-400">{fmt$(v.cancelSales)}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
