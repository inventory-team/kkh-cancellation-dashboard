/**
 * Core aggregation and transformation utilities for the dashboard.
 * All functions operate on in-memory arrays of sales_data rows.
 */

import { ALLOWED_SALE_SOURCES } from './csvParser.js'

// ── Helpers ───────────────────────────────────────────────────────────────────

export const MONTH_NAMES = [
  '', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

export function fmt$(value) {
  if (value == null) return '$0'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)
}

export function fmtNum(value) {
  if (value == null) return '0'
  return new Intl.NumberFormat('en-US').format(value)
}

export function fmtPct(value) {
  if (value == null) return '0%'
  return `${(value * 100).toFixed(1)}%`
}

function sum(arr, key) {
  return arr.reduce((acc, r) => acc + (r[key] ?? 0), 0)
}

// ── Filters ───────────────────────────────────────────────────────────────────

export function applyCoreFilters(rows, filters = {}) {
  const { years, months, vendors, reasons, saleSources } = filters

  return rows.filter((r) => {
    if (years?.length && !years.includes(r.year)) return false
    if (months?.length && !months.includes(r.month)) return false
    if (vendors?.length && !vendors.includes(r.vendor)) return false
    if (reasons?.length && !reasons.includes(r.cancel_code)) return false
    if (saleSources?.length && !saleSources.includes(r.sale_source)) return false
    return true
  })
}

export function getCancellations(rows) {
  return rows.filter((r) => r.cancel_code && r.cancel_code.trim() !== '')
}

// ── Summary KPIs ──────────────────────────────────────────────────────────────

export function computeSummaryKPIs(allRows, cancelledRows) {
  const totalUnits     = sum(allRows, 'qty')
  const totalSales     = sum(allRows, 'total_extended_booked_sales')
  const cancelUnits    = sum(cancelledRows, 'qty')
  const cancelSales    = sum(cancelledRows, 'total_extended_booked_sales')
  const cancelOrders   = new Set(cancelledRows.map((r) => r.order_id)).size
  const cancelRate     = totalUnits > 0 ? cancelUnits / totalUnits : 0
  const cancelSalesRate = totalSales > 0 ? cancelSales / totalSales : 0

  return {
    totalUnits,
    totalSales,
    cancelUnits,
    cancelSales,
    cancelOrders,
    cancelRate,
    cancelSalesRate,
  }
}

// ── Monthly trends ─────────────────────────────────────────────────────────────

export function monthlyTrend(rows, valueKey = 'qty') {
  const map = {}
  for (const r of rows) {
    const key = `${r.year}-${String(r.month).padStart(2, '0')}`
    if (!map[key]) map[key] = { year: r.year, month: r.month, label: `${MONTH_NAMES[r.month]} ${r.year}`, value: 0 }
    map[key].value += r[valueKey] ?? 0
  }
  return Object.values(map).sort((a, b) => a.year - b.year || a.month - b.month)
}

export function monthlyTrendDual(rows) {
  const map = {}
  for (const r of rows) {
    const key = `${r.year}-${String(r.month).padStart(2, '0')}`
    if (!map[key]) map[key] = {
      year: r.year, month: r.month,
      label: `${MONTH_NAMES[r.month]} ${r.year}`,
      units: 0, sales: 0,
    }
    map[key].units += r.qty ?? 0
    map[key].sales += r.total_extended_booked_sales ?? 0
  }
  return Object.values(map).sort((a, b) => a.year - b.year || a.month - b.month)
}

/**
 * Year-over-year comparison: returns an array with entries for each month (1–12),
 * containing values per year.
 */
export function yoyComparison(rows, years, valueKey = 'qty') {
  const map = {} // month → { month, [year]: value }
  for (const r of rows) {
    if (!years.includes(r.year)) continue
    if (!map[r.month]) map[r.month] = { month: r.month, label: MONTH_NAMES[r.month] }
    map[r.month][r.year] = (map[r.month][r.year] ?? 0) + (r[valueKey] ?? 0)
  }
  return Object.values(map).sort((a, b) => a.month - b.month)
}

// ── Operations ─────────────────────────────────────────────────────────────────

export function topReasons(cancelledRows, limit = 10) {
  const map = {}
  for (const r of cancelledRows) {
    const reason = r.cancel_code ?? 'Unknown'
    if (!map[reason]) map[reason] = { reason, units: 0, sales: 0 }
    map[reason].units += r.qty ?? 0
    map[reason].sales += r.total_extended_booked_sales ?? 0
  }
  return Object.values(map)
    .sort((a, b) => b.units - a.units)
    .slice(0, limit)
}

export function reasonMonthlyTrend(cancelledRows, reason) {
  const filtered = cancelledRows.filter((r) => r.cancel_code === reason)
  return monthlyTrendDual(filtered)
}

// ── Vendor ─────────────────────────────────────────────────────────────────────

export function vendorCancellationStats(allRows, cancelledRows) {
  const allMap = {}
  for (const r of allRows) {
    const v = r.vendor ?? 'Unknown'
    if (!allMap[v]) allMap[v] = { totalUnits: 0, totalSales: 0 }
    allMap[v].totalUnits += r.qty ?? 0
    allMap[v].totalSales += r.total_extended_booked_sales ?? 0
  }

  const cancelMap = {}
  for (const r of cancelledRows) {
    const v = r.vendor ?? 'Unknown'
    if (!cancelMap[v]) cancelMap[v] = {
      vendor: v,
      cancelUnits: 0,
      cancelSales: 0,
      reasons: {},
      skus: new Set(),
      monthlyData: {},
    }
    cancelMap[v].cancelUnits += r.qty ?? 0
    cancelMap[v].cancelSales += r.total_extended_booked_sales ?? 0
    const reason = r.cancel_code ?? 'Unknown'
    cancelMap[v].reasons[reason] = (cancelMap[v].reasons[reason] ?? 0) + 1
    if (r.sku) cancelMap[v].skus.add(r.sku)
    const mk = `${r.year}-${String(r.month).padStart(2, '0')}`
    cancelMap[v].monthlyData[mk] = (cancelMap[v].monthlyData[mk] ?? 0) + (r.qty ?? 0)
  }

  return Object.values(cancelMap).map((v) => {
    const all = allMap[v.vendor] ?? { totalUnits: 0, totalSales: 0 }
    return {
      vendor: v.vendor,
      cancelUnits: v.cancelUnits,
      cancelSales: v.cancelSales,
      totalUnits: all.totalUnits,
      totalSales: all.totalSales,
      cancelRate: all.totalUnits > 0 ? v.cancelUnits / all.totalUnits : 0,
      topReason: Object.entries(v.reasons).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'N/A',
      uniqueSkus: v.skus.size,
      monthlyData: v.monthlyData,
    }
  })
}

// ── Vendor Risk Score ─────────────────────────────────────────────────────────

/**
 * Risk score: 0–100. Higher = more risk.
 * Factors: cancelSales (35%), cancelUnits (25%), cancelRate (20%),
 *          uniqueSkus (10%), recurringMonths (10%)
 */
export function computeVendorRiskScores(vendorStats) {
  if (!vendorStats.length) return []

  const normalize = (arr, key) => {
    const max = Math.max(...arr.map((v) => v[key]))
    if (max === 0) return arr.map((v) => ({ ...v, [`${key}_n`]: 0 }))
    return arr.map((v) => ({ ...v, [`${key}_n`]: v[key] / max }))
  }

  // Count months with cancellations
  const withMonths = vendorStats.map((v) => ({
    ...v,
    recurringMonths: Object.keys(v.monthlyData ?? {}).length,
  }))

  let scored = normalize(withMonths, 'cancelSales')
  scored = normalize(scored, 'cancelUnits')
  scored = normalize(scored, 'cancelRate')
  scored = normalize(scored, 'uniqueSkus')
  scored = normalize(scored, 'recurringMonths')

  scored = scored.map((v) => ({
    ...v,
    riskScore: Math.round(
      v.cancelSales_n * 35 +
      v.cancelUnits_n * 25 +
      v.cancelRate_n * 20 +
      v.uniqueSkus_n * 10 +
      v.recurringMonths_n * 10
    ),
  }))

  scored.sort((a, b) => b.riskScore - a.riskScore)

  return scored.map((v, i) => ({
    ...v,
    rank: i + 1,
    riskTier: v.riskScore >= 70 ? 'HIGH' : v.riskScore >= 40 ? 'MEDIUM' : 'LOW',
  }))
}

// ── SKU View ──────────────────────────────────────────────────────────────────

export function skuCancellationStats(allRows, cancelledRows, excludeFraud = false) {
  const allMap = {}
  for (const r of allRows) {
    const s = r.sku ?? 'Unknown'
    if (!allMap[s]) allMap[s] = { sku: s, productName: r.product_name, vendor: r.vendor, totalUnits: 0 }
    allMap[s].totalUnits += r.qty ?? 0
  }

  const filtered = excludeFraud
    ? cancelledRows.filter((r) => !/fraud/i.test(r.cancel_code ?? ''))
    : cancelledRows

  const cancelMap = {}
  for (const r of filtered) {
    const s = r.sku ?? 'Unknown'
    if (!cancelMap[s]) cancelMap[s] = {
      sku: s,
      productName: r.product_name ?? '',
      vendor: r.vendor ?? '',
      cancelUnits: 0,
      cancelSales: 0,
    }
    cancelMap[s].cancelUnits += r.qty ?? 0
    cancelMap[s].cancelSales += r.total_extended_booked_sales ?? 0
  }

  return Object.values(cancelMap).map((s) => {
    const all = allMap[s.sku] ?? { totalUnits: 0 }
    const cancelRate = all.totalUnits > 0 ? s.cancelUnits / all.totalUnits : 0
    return { ...s, totalUnits: all.totalUnits, cancelRate }
  }).sort((a, b) => b.cancelSales - a.cancelSales).slice(0, 100)
}

// ── Early Warning ─────────────────────────────────────────────────────────────

export function computeEarlyWarnings(cancelledRows, allRows) {
  const warnings = []

  // 1. Month-over-month spike (>20% increase in units)
  const monthly = monthlyTrend(cancelledRows, 'qty')
  for (let i = 1; i < monthly.length; i++) {
    const prev = monthly[i - 1]
    const curr = monthly[i]
    if (prev.value > 0) {
      const change = (curr.value - prev.value) / prev.value
      if (change >= 0.2) {
        warnings.push({
          type: 'MOM_SPIKE',
          severity: change >= 0.5 ? 'HIGH' : 'MEDIUM',
          label: `Cancellation spike: ${curr.label}`,
          detail: `Units up ${(change * 100).toFixed(0)}% vs ${prev.label} (${prev.value} → ${curr.value})`,
        })
      }
    }
  }

  // 2. SKU with increasing cancel rate in last 2 months
  const lastMonths = monthly.slice(-2).map((m) => ({ year: m.year, month: m.month }))
  if (lastMonths.length === 2) {
    const [pm, cm] = lastMonths
    const skuMap = {}
    for (const r of cancelledRows) {
      if (!r.sku) continue
      const key = r.sku
      if (!skuMap[key]) skuMap[key] = { prev: 0, curr: 0 }
      if (r.year === pm.year && r.month === pm.month) skuMap[key].prev += r.qty ?? 0
      if (r.year === cm.year && r.month === cm.month) skuMap[key].curr += r.qty ?? 0
    }
    for (const [sku, vals] of Object.entries(skuMap)) {
      if (vals.prev > 0 && vals.curr > vals.prev * 1.5 && vals.curr >= 3) {
        warnings.push({
          type: 'SKU_SPIKE',
          severity: 'MEDIUM',
          label: `SKU ${sku} cancellation rising`,
          detail: `Units: ${vals.prev} → ${vals.curr} (last 2 months)`,
        })
      }
    }
  }

  // 3. Vendors with 3+ consecutive months of increasing cancellations
  const vendorMonthly = {}
  for (const r of cancelledRows) {
    const v = r.vendor ?? 'Unknown'
    const key = `${r.year}-${String(r.month).padStart(2, '0')}`
    if (!vendorMonthly[v]) vendorMonthly[v] = {}
    vendorMonthly[v][key] = (vendorMonthly[v][key] ?? 0) + (r.qty ?? 0)
  }

  for (const [vendor, data] of Object.entries(vendorMonthly)) {
    const sorted = Object.entries(data).sort(([a], [b]) => a.localeCompare(b))
    let streak = 1
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i][1] > sorted[i - 1][1]) {
        streak++
        if (streak >= 3) {
          warnings.push({
            type: 'VENDOR_TREND',
            severity: 'HIGH',
            label: `${vendor} — 3+ months of rising cancellations`,
            detail: `Consecutive months increasing: last value ${sorted[sorted.length - 1][1]} units`,
          })
          break
        }
      } else {
        streak = 1
      }
    }
  }

  // 4. Overall high cancellation rate
  const totalUnits  = sum(allRows, 'qty')
  const cancelUnits = sum(cancelledRows, 'qty')
  const rate = totalUnits > 0 ? cancelUnits / totalUnits : 0
  if (rate > 0.1) {
    warnings.push({
      type: 'HIGH_CANCEL_RATE',
      severity: 'HIGH',
      label: `Overall cancellation rate is ${(rate * 100).toFixed(1)}%`,
      detail: `${fmtNum(cancelUnits)} cancelled out of ${fmtNum(totalUnits)} total units`,
    })
  }

  return warnings.sort((a, b) => (a.severity === 'HIGH' ? -1 : 1) - (b.severity === 'HIGH' ? -1 : 1))
}

// ── Recommendations ────────────────────────────────────────────────────────────

export function generateRecommendations(allRows, cancelledRows) {
  const recs = []

  const kpis = computeSummaryKPIs(allRows, cancelledRows)
  const reasons = topReasons(cancelledRows, 5)
  const vendorStats = vendorCancellationStats(allRows, cancelledRows)
  const scoredVendors = computeVendorRiskScores(vendorStats).slice(0, 5)
  const skus = skuCancellationStats(allRows, cancelledRows).slice(0, 5)

  // 1. High cancellation rate
  if (kpis.cancelRate > 0.08) {
    recs.push({
      priority: 'CRITICAL',
      category: 'Operations',
      title: `High overall cancellation rate: ${fmtPct(kpis.cancelRate)}`,
      action: `Investigate top reasons immediately. ${fmt$(kpis.cancelSales)} in at-risk revenue.`,
    })
  }

  // 2. Top reason insight
  if (reasons[0]) {
    recs.push({
      priority: 'HIGH',
      category: 'Operations',
      title: `Top cancel reason: "${reasons[0].reason}"`,
      action: `${fmtNum(reasons[0].units)} units / ${fmt$(reasons[0].sales)} lost. Create action plan to address this root cause.`,
    })
  }

  // 3. Top at-risk vendor
  if (scoredVendors[0] && scoredVendors[0].riskTier === 'HIGH') {
    recs.push({
      priority: 'HIGH',
      category: 'Vendor',
      title: `High-risk vendor: ${scoredVendors[0].vendor}`,
      action: `Risk score ${scoredVendors[0].riskScore}/100. ${fmt$(scoredVendors[0].cancelSales)} in cancelled sales. Schedule vendor review.`,
    })
  }

  // 4. Top cancelled SKU
  if (skus[0]) {
    recs.push({
      priority: 'MEDIUM',
      category: 'SKU',
      title: `Top cancelled SKU: ${skus[0].sku}`,
      action: `${fmtNum(skus[0].cancelUnits)} units cancelled (${fmtPct(skus[0].cancelRate)} rate). Review inventory and supplier reliability.`,
    })
  }

  // 5. SKUs with very high cancel rates
  const highRateSkus = skuCancellationStats(allRows, cancelledRows)
    .filter((s) => s.cancelRate > 0.3 && s.cancelUnits >= 5)
  if (highRateSkus.length > 0) {
    recs.push({
      priority: 'HIGH',
      category: 'SKU',
      title: `${highRateSkus.length} SKU(s) with >30% cancellation rate`,
      action: `Top: ${highRateSkus[0].sku} at ${fmtPct(highRateSkus[0].cancelRate)}. Consider removing or fixing these listings.`,
    })
  }

  // 6. Vendor diversity risk
  const topVendorShare = scoredVendors[0]
    ? scoredVendors[0].cancelSales / Math.max(kpis.cancelSales, 1)
    : 0
  if (topVendorShare > 0.3) {
    recs.push({
      priority: 'MEDIUM',
      category: 'Vendor',
      title: `${fmtPct(topVendorShare)} of cancelled sales from one vendor`,
      action: `Reduce dependency on ${scoredVendors[0]?.vendor}. Diversify supplier base.`,
    })
  }

  return recs
}

// ── Filter options ─────────────────────────────────────────────────────────────

export function extractFilterOptions(rows) {
  const years       = [...new Set(rows.map((r) => r.year).filter(Boolean))].sort()
  const vendors     = [...new Set(rows.map((r) => r.vendor).filter(Boolean))].sort()
  const reasons     = [...new Set(rows.map((r) => r.cancel_code).filter(Boolean))].sort()
  const saleSources = [...new Set(rows.map((r) => r.sale_source).filter(Boolean))].sort()
  return { years, vendors, reasons, saleSources }
}
