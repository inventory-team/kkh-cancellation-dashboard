import { useMemo } from 'react'
import { MONTH_NAMES, extractFilterOptions } from '../../lib/dataTransform.js'
import { ALLOWED_SALE_SOURCES } from '../../lib/csvParser.js'
import clsx from 'clsx'

function MultiSelect({ label, options, value, onChange }) {
  const selected = new Set(value)

  function toggle(opt) {
    const next = new Set(selected)
    if (next.has(opt)) next.delete(opt)
    else next.add(opt)
    onChange([...next])
  }

  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</label>
      <div className="relative">
        <select
          multiple
          size={1}
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none min-w-[130px]"
          value={value}
          onChange={(e) => {
            const vals = [...e.target.selectedOptions].map((o) => {
              const v = o.value
              return isNaN(v) ? v : Number(v)
            })
            onChange(vals)
          }}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}

function ChipSelect({ label, options, value, onChange }) {
  const selected = new Set(value)

  function toggle(opt) {
    const next = new Set(selected)
    if (next.has(opt)) next.delete(opt)
    else next.add(opt)
    onChange([...next])
  }

  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</label>
      <div className="flex flex-wrap gap-1">
        {options.map((opt) => (
          <button
            key={opt.value}
            onClick={() => toggle(opt.value)}
            className={clsx(
              'px-2.5 py-1 rounded-full text-xs font-medium transition-colors border',
              selected.has(opt.value)
                ? 'bg-brand-600 text-white border-brand-600'
                : 'bg-white text-gray-600 border-gray-200 hover:border-brand-400'
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function FilterBar({ allRows, filters, setFilter, resetFilters, activeFilterCount }) {
  const { years, vendors, reasons, saleSources } = useMemo(
    () => extractFilterOptions(allRows),
    [allRows]
  )

  const yearOpts   = years.map((y) => ({ value: y, label: String(y) }))
  const monthOpts  = Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: MONTH_NAMES[i + 1] }))
  const vendorOpts = vendors.slice(0, 60).map((v) => ({ value: v, label: v }))
  const reasonOpts = reasons.slice(0, 40).map((r) => ({ value: r, label: r }))
  const sourceOpts = ALLOWED_SALE_SOURCES.map((s) => ({ value: s, label: s }))

  if (!allRows.length) return null

  return (
    <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4">
      <div className="max-w-screen-2xl mx-auto">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-gray-700">Filters</span>
          {activeFilterCount > 0 && (
            <button
              onClick={resetFilters}
              className="text-xs text-brand-600 hover:text-brand-700 font-medium"
            >
              Clear all ({activeFilterCount})
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-6">
          <ChipSelect
            label="Year"
            options={yearOpts}
            value={filters.years}
            onChange={(v) => setFilter('years', v)}
          />
          <ChipSelect
            label="Month"
            options={monthOpts}
            value={filters.months}
            onChange={(v) => setFilter('months', v)}
          />
          <ChipSelect
            label="Sale Source"
            options={sourceOpts}
            value={filters.saleSources}
            onChange={(v) => setFilter('saleSources', v)}
          />

          {/* Vendor select (dropdown, many options) */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Vendor</label>
            <select
              multiple
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-brand-500 outline-none min-w-[160px] max-h-20"
              value={filters.vendors}
              onChange={(e) => setFilter('vendors', [...e.target.selectedOptions].map((o) => o.value))}
            >
              {vendorOpts.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          {/* Reason select */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Cancel Reason</label>
            <select
              multiple
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-brand-500 outline-none min-w-[200px] max-h-20"
              value={filters.reasons}
              onChange={(e) => setFilter('reasons', [...e.target.selectedOptions].map((o) => o.value))}
            >
              {reasonOpts.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>

        {allRows.length > 0 && (
          <p className="text-xs text-gray-400 mt-3">
            Showing {allRows.length.toLocaleString()} total rows
            {activeFilterCount > 0 ? ` with ${activeFilterCount} active filter${activeFilterCount > 1 ? 's' : ''}` : ''}
          </p>
        )}
      </div>
    </div>
  )
}
