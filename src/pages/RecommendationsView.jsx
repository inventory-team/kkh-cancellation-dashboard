import { useMemo } from 'react'
import {
  generateRecommendations,
  computeSummaryKPIs,
  topReasons,
  vendorCancellationStats,
  computeVendorRiskScores,
  skuCancellationStats,
  fmt$,
  fmtNum,
  fmtPct,
} from '../lib/dataTransform.js'
import Badge from '../components/common/Badge.jsx'
import clsx from 'clsx'

const PRIORITY_CONFIG = {
  CRITICAL: { tier: 'HIGH',   bg: 'bg-red-50',    border: 'border-red-200',   icon: '🚨', text: 'text-red-700' },
  HIGH:     { tier: 'HIGH',   bg: 'bg-orange-50', border: 'border-orange-200', icon: '⚠️', text: 'text-orange-700' },
  MEDIUM:   { tier: 'MEDIUM', bg: 'bg-amber-50',  border: 'border-amber-200',  icon: '📌', text: 'text-amber-700' },
  LOW:      { tier: 'LOW',    bg: 'bg-blue-50',   border: 'border-blue-200',   icon: 'ℹ️', text: 'text-blue-700' },
}

const CATEGORY_COLORS = {
  Operations: 'bg-purple-100 text-purple-700',
  Vendor:     'bg-blue-100   text-blue-700',
  SKU:        'bg-green-100  text-green-700',
}

export default function RecommendationsView({ allRows, cancelledRows }) {
  const recs = useMemo(
    () => generateRecommendations(allRows, cancelledRows),
    [allRows, cancelledRows]
  )

  const kpis       = useMemo(() => computeSummaryKPIs(allRows, cancelledRows), [allRows, cancelledRows])
  const reasons    = useMemo(() => topReasons(cancelledRows, 3), [cancelledRows])
  const vendorStats = useMemo(() => vendorCancellationStats(allRows, cancelledRows), [allRows, cancelledRows])
  const scored     = useMemo(() => computeVendorRiskScores(vendorStats), [vendorStats])
  const topSkus    = useMemo(() => skuCancellationStats(allRows, cancelledRows, false).slice(0, 5), [allRows, cancelledRows])

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
        <h2 className="text-lg font-semibold text-gray-900">Insights & Recommendations</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          Operations-focused actions ranked by priority
        </p>
      </div>

      {/* Executive summary */}
      <div className="bg-gradient-to-br from-brand-600 to-brand-700 rounded-xl p-5 text-white">
        <h3 className="font-semibold text-base mb-3">Executive Summary</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <div className="text-2xl font-bold">{fmtPct(kpis.cancelRate)}</div>
            <div className="text-xs text-white/70 mt-0.5">Cancel Rate</div>
          </div>
          <div>
            <div className="text-2xl font-bold">{fmt$(kpis.cancelSales)}</div>
            <div className="text-xs text-white/70 mt-0.5">Revenue Lost</div>
          </div>
          <div>
            <div className="text-2xl font-bold">{fmtNum(kpis.cancelUnits)}</div>
            <div className="text-xs text-white/70 mt-0.5">Units Cancelled</div>
          </div>
          <div>
            <div className="text-2xl font-bold">{scored.filter((v) => v.riskTier === 'HIGH').length}</div>
            <div className="text-xs text-white/70 mt-0.5">High-Risk Vendors</div>
          </div>
        </div>
      </div>

      {/* Action items */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-700">Action Items ({recs.length})</h3>
        {recs.length === 0 ? (
          <div className="bg-green-50 border border-green-200 rounded-xl p-5 text-center text-sm text-green-700">
            No critical recommendations at this time.
          </div>
        ) : (
          recs.map((rec, i) => {
            const cfg = PRIORITY_CONFIG[rec.priority] ?? PRIORITY_CONFIG.LOW
            return (
              <div key={i} className={clsx('rounded-xl border p-4 flex gap-3', cfg.bg, cfg.border)}>
                <span className="text-xl shrink-0">{cfg.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={clsx('text-sm font-semibold', cfg.text)}>{rec.title}</span>
                    <span className={clsx('text-xs font-semibold px-2 py-0.5 rounded-full', CATEGORY_COLORS[rec.category] ?? 'bg-gray-100 text-gray-600')}>
                      {rec.category}
                    </span>
                    <Badge label={rec.priority} tier={cfg.tier} />
                  </div>
                  <p className="text-sm text-gray-700">{rec.action}</p>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Root cause breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Top reasons */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Top Cancel Reasons</h4>
          <div className="space-y-3">
            {reasons.map((r, i) => (
              <div key={r.reason}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-700 truncate max-w-[160px]">{r.reason}</span>
                  <span className="text-gray-500 shrink-0 ml-2">{fmtNum(r.units)} units</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-1.5">
                  <div
                    className="bg-brand-500 h-1.5 rounded-full"
                    style={{ width: `${reasons[0].units > 0 ? (r.units / reasons[0].units) * 100 : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* High risk vendors */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">High-Risk Vendors</h4>
          {scored.filter((v) => v.riskTier === 'HIGH').slice(0, 5).map((v) => (
            <div key={v.vendor} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
              <span className="text-xs text-gray-700 truncate max-w-[130px]">{v.vendor}</span>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs font-semibold text-red-600">{v.riskScore}</span>
                <div className="w-12 bg-gray-100 rounded-full h-1">
                  <div className="bg-red-500 h-1 rounded-full" style={{ width: `${v.riskScore}%` }} />
                </div>
              </div>
            </div>
          ))}
          {scored.filter((v) => v.riskTier === 'HIGH').length === 0 && (
            <p className="text-xs text-gray-400">No high-risk vendors</p>
          )}
        </div>

        {/* Top cancelled SKUs */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Top Cancelled SKUs</h4>
          {topSkus.map((s) => (
            <div key={s.sku} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
              <div className="min-w-0">
                <span className="text-xs font-mono text-gray-700 block">{s.sku}</span>
                <span className="text-xs text-gray-400 truncate block max-w-[140px]">{s.vendor}</span>
              </div>
              <div className="shrink-0 text-right ml-2">
                <span className="text-xs font-semibold text-gray-800 block">{fmt$(s.cancelSales)}</span>
                <span className="text-xs text-gray-400">{fmtPct(s.cancelRate)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Playbook */}
      <div className="bg-gray-50 rounded-xl border border-gray-200 p-5">
        <h4 className="text-sm font-semibold text-gray-700 mb-4">Cancellation Reduction Playbook</h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              step: '1',
              title: 'Identify Root Causes',
              items: ['Review top cancel reasons', 'Interview ops team', 'Map to process failures'],
            },
            {
              step: '2',
              title: 'Address Vendor Issues',
              items: ['Schedule reviews with HIGH-risk vendors', 'Enforce SLA agreements', 'Audit lead times & stock levels'],
            },
            {
              step: '3',
              title: 'Fix SKU Problems',
              items: ['Remove or fix high-cancel-rate SKUs', 'Update product info & images', 'Audit discontinued inventory'],
            },
          ].map((block) => (
            <div key={block.step} className="bg-white rounded-lg p-4 border border-gray-100">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-6 h-6 rounded-full bg-brand-600 text-white text-xs font-bold flex items-center justify-center">
                  {block.step}
                </div>
                <span className="text-sm font-semibold text-gray-800">{block.title}</span>
              </div>
              <ul className="space-y-1">
                {block.items.map((item) => (
                  <li key={item} className="flex items-start gap-1.5 text-xs text-gray-600">
                    <span className="text-brand-500 mt-0.5">›</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
