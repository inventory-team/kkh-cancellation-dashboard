import { useState, useMemo } from 'react'
import { applyCoreFilters, getCancellations } from '../lib/dataTransform.js'

export const DEFAULT_FILTERS = {
  years:       [],
  months:      [],
  vendors:     [],
  reasons:     [],
  saleSources: [],
}

export function useFilters(allRows = []) {
  const [filters, setFilters] = useState(DEFAULT_FILTERS)

  const filteredAll = useMemo(
    () => applyCoreFilters(allRows, filters),
    [allRows, filters]
  )

  const filteredCancellations = useMemo(
    () => getCancellations(filteredAll),
    [filteredAll]
  )

  function setFilter(key, value) {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  function resetFilters() {
    setFilters(DEFAULT_FILTERS)
  }

  const activeFilterCount = Object.values(filters).reduce(
    (acc, v) => acc + (Array.isArray(v) ? v.length : 0),
    0
  )

  return {
    filters,
    setFilter,
    resetFilters,
    filteredAll,
    filteredCancellations,
    activeFilterCount,
  }
}
