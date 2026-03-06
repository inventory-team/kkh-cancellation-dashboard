import { useState, useCallback } from 'react'
import { supabase, getUploadHistory } from '../lib/supabase.js'
import { getCancellations } from '../lib/dataTransform.js'
import { ALLOWED_SALE_SOURCES } from '../lib/csvParser.js'

const PAGE_SIZE = 5000

/**
 * Fetch all sales_data rows for a given uploadId (paginated).
 * Returns rows filtered to allowed sale sources.
 */
async function fetchAllRows(uploadId) {
  let allRows = []
  let from = 0

  while (true) {
    let query = supabase
      .from('sales_data')
      .select('*')
      .in('sale_source', ALLOWED_SALE_SOURCES)
      .range(from, from + PAGE_SIZE - 1)

    if (uploadId) query = query.eq('upload_id', uploadId)

    const { data, error } = await query
    if (error) throw error
    allRows = allRows.concat(data ?? [])
    if (!data || data.length < PAGE_SIZE) break
    from += PAGE_SIZE
  }

  return allRows
}

export function useData() {
  const [allRows, setAllRows] = useState([])
  const [uploadHistory, setUploadHistory] = useState([])
  const [activeUploadId, setActiveUploadId] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const loadData = useCallback(async (uploadId = null) => {
    setLoading(true)
    setError(null)
    try {
      const [rows, history] = await Promise.all([
        fetchAllRows(uploadId),
        getUploadHistory(),
      ])
      setAllRows(rows)
      setUploadHistory(history)
      if (uploadId) setActiveUploadId(uploadId)
      else if (history.length > 0) setActiveUploadId(history[0].id)
    } catch (err) {
      console.error('Failed to load data:', err)
      setError(err.message ?? 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [])

  const refreshAfterUpload = useCallback(async (newUploadId) => {
    await loadData(newUploadId)
  }, [loadData])

  return {
    allRows,
    uploadHistory,
    activeUploadId,
    setActiveUploadId,
    loading,
    error,
    loadData,
    refreshAfterUpload,
  }
}
