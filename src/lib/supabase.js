import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Supabase env vars not set. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env'
  )
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder'
)

// ── Upload helpers ─────────────────────────────────────────────────────────────

export async function createUploadRecord({ fileName, rowCount, sourcePeriod }) {
  const { data, error } = await supabase
    .from('uploads')
    .insert({ file_name: fileName, row_count: rowCount, source_period: sourcePeriod })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getUploadHistory() {
  const { data, error } = await supabase
    .from('uploads')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20)
  if (error) throw error
  return data
}

// ── Sales data helpers ─────────────────────────────────────────────────────────

export async function insertSalesRows(rows) {
  // Batch insert in chunks of 500 to avoid request size limits
  const CHUNK = 500
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK)
    const { error } = await supabase.from('sales_data').insert(chunk)
    if (error) throw error
  }
}

export async function deleteSalesDataByUpload(uploadId) {
  const { error } = await supabase
    .from('sales_data')
    .delete()
    .eq('upload_id', uploadId)
  if (error) throw error
}

/**
 * Fetch cancellation rows only (cancel_code is not null).
 * Applies optional filters: years, months, vendors, reasons, saleSources.
 */
export async function fetchCancellations({
  uploadId = null,
  years = [],
  months = [],
  vendors = [],
  reasons = [],
  saleSources = [],
} = {}) {
  let query = supabase
    .from('sales_data')
    .select('*')
    .not('cancel_code', 'is', null)

  if (uploadId) query = query.eq('upload_id', uploadId)
  if (years.length) query = query.in('year', years)
  if (months.length) query = query.in('month', months)
  if (vendors.length) query = query.in('vendor', vendors)
  if (reasons.length) query = query.in('cancel_code', reasons)
  if (saleSources.length) query = query.in('sale_source', saleSources)

  const { data, error } = await query
  if (error) throw error
  return data ?? []
}

export async function fetchAllSalesData({ uploadId = null } = {}) {
  let query = supabase.from('sales_data').select(
    'upload_id, transaction_date, sku, vendor, qty, cancel_code, sale_source, total_extended_booked_sales, year, month'
  )
  if (uploadId) query = query.eq('upload_id', uploadId)
  const { data, error } = await query
  if (error) throw error
  return data ?? []
}
