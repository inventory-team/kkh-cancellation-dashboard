import Papa from 'papaparse'

// ── Sale Source whitelist ──────────────────────────────────────────────────────
export const ALLOWED_SALE_SOURCES = ['KKH', 'Trade', 'DesignBar', 'Instagram', 'TikTok']

// ── Canonical field names → fuzzy aliases (lowercased, trimmed) ────────────────
const COLUMN_MAP = {
  transaction_date:                 ['transaction date', 'trans date', 'date', 'order date'],
  product_name:                     ['product name', 'item name', 'name', 'description'],
  sku:                              ['sku', 'item sku', 'product sku', 'item code'],
  category:                         ['category', 'cat'],
  vendor:                           ['vendor', 'supplier', 'brand'],
  collection:                       ['collection'],
  department:                       ['department', 'dept'],
  upholstery_flag:                  ['upholstery flag', 'upholstery'],
  order_id:                         ['order id', 'order number', 'order #', 'orderid'],
  payment_processor:                ['payment processor', 'payment method'],
  paypal_transaction_id:            ['paypal transaction id', 'paypal id'],
  order_tax_pct:                    ['order tax %', 'order tax'],
  tax_income:                       ['tax income'],
  coupon:                           ['coupon', 'coupon code', 'promo'],
  discount_on_sale_items:           ['discount on sale items'],
  sale_flag:                        ['sale flag'],
  order_status:                     ['order status'],
  item_status:                      ['item status'],
  shipped_via:                      ['shipped via', 'carrier', 'ship method'],
  tracking_number:                  ['tracking number', 'tracking #'],
  return_tracking_number:           ['return tracking number'],
  fulfillment_location:             ['fulfillment location', 'fulfilled by'],
  total_extended_booked_sales:      ['total extended booked sales $', 'booked sales', 'sales amount', 'extended sales'],
  qty:                              ['qty', 'quantity', 'units'],
  map_msrp:                         ['total extended sales at map/msrp', 'map/msrp', 'msrp', 'map'],
  product_cost:                     ['product cost', 'cost'],
  shipping_type:                    ['shipping type', 'ship type'],
  shipping_charged_to_customer:     ['shipping charged to customer', 'ship charge'],
  shipping_cost:                    ['shipping cost'],
  replacement:                      ['replacement'],
  refund:                           ['refund'],
  return_shipping:                  ['return shipping'],
  return_store_credit:              ['return store credit'],
  product_gross_margin_pct:         ['product gross margin %', 'product gm %'],
  gross_margin_pct:                 ['gross margin %', 'gm %'],
  discount:                         ['discount'],
  discount_pct:                     ['discount %'],
  is_trade:                         ['istrade', 'is trade', 'trade'],
  total_revenue:                    ['total revenue', 'revenue'],
  total_cost:                       ['total cost'],
  assembly_income:                  ['assembly income'],
  wg_income:                        ['wg income'],
  consolidation_income:             ['consolidation income'],
  shipping_income:                  ['shipping income'],
  credit:                           ['credit'],
  inactive:                         ['inactive'],
  live_date:                        ['live date'],
  sale_source:                      ['sale source', 'sales source', 'channel'],
  bo_flag:                          ['bo flag', 'backorder flag'],
  cancel_code:                      ['cancel code', 'cancellation reason', 'cancellation code', 'cancel reason'],
  customer_name:                    ['customer name', 'customer', 'client name'],
  customer_email:                   ['customer email address', 'customer email', 'email'],
  customer_ship_state:              ['customer ship state', 'ship state', 'state'],
  customer_ship_zip:                ['customer ship zip', 'ship zip', 'zip'],
  customer_ship_address:            ['customer ship address', 'ship address', 'address'],
  paid_amount:                      ['paid amount', 'amount paid'],
  sales_rep:                        ['sales rep', 'rep'],
  sales_rep_2:                      ['sales rep 2', 'rep 2'],
  retail_channel:                   ['retail channel'],
  account_owner:                    ['account owner'],
  segment:                          ['segment'],
  trade_business_name:              ['trade business name'],
  designer:                         ['designer'],
  shipped_date:                     ['shipped date', 'ship date'],
  canceled_date:                    ['canceled date', 'cancelled date', 'cancel date', 'cancellation date'],
}

/**
 * Build a reverse lookup: normalized alias → canonical field name.
 */
function buildAliasLookup() {
  const lookup = {}
  for (const [field, aliases] of Object.entries(COLUMN_MAP)) {
    for (const alias of aliases) {
      lookup[alias] = field
    }
  }
  return lookup
}

const ALIAS_LOOKUP = buildAliasLookup()

/**
 * Map raw CSV headers to canonical field names.
 * Returns { canonical: rawHeader } for all matched columns.
 */
export function mapHeaders(rawHeaders) {
  const mapping = {} // canonical → raw
  const unmapped = []

  for (const raw of rawHeaders) {
    const normalized = raw.trim().toLowerCase()
    const canonical = ALIAS_LOOKUP[normalized]
    if (canonical) {
      // Prefer first occurrence if a duplicate exists
      if (!mapping[canonical]) mapping[canonical] = raw
    } else {
      unmapped.push(raw)
    }
  }

  return { mapping, unmapped }
}

/**
 * Parse a date string MM/DD/YYYY or YYYY-MM-DD into ISO string.
 */
function parseDate(val) {
  if (!val || val === '') return null
  const s = String(val).trim()
  // MM/DD/YYYY
  const mdy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (mdy) return `${mdy[3]}-${mdy[1].padStart(2, '0')}-${mdy[2].padStart(2, '0')}`
  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10)
  return null
}

/**
 * Parse a numeric value, stripping currency symbols and commas.
 */
function parseNum(val) {
  if (val === null || val === undefined || val === '') return null
  const n = parseFloat(String(val).replace(/[$,%]/g, '').replace(/,/g, '').trim())
  return isNaN(n) ? null : n
}

/**
 * Parse an integer quantity.
 */
function parseInt2(val) {
  if (val === null || val === undefined || val === '') return null
  const n = parseInt(String(val).replace(/,/g, '').trim(), 10)
  return isNaN(n) ? null : n
}

/**
 * Transform a raw CSV row (object with raw headers) into a canonical DB row.
 * Returns null if the row should be excluded (wrong sale source, etc.)
 */
export function transformRow(rawRow, headerMapping, uploadId) {
  // Get raw value by canonical name
  const get = (canonical) => {
    const rawKey = headerMapping[canonical]
    return rawKey !== undefined ? rawRow[rawKey] : undefined
  }

  const saleSource = String(get('sale_source') ?? '').trim()
  if (!ALLOWED_SALE_SOURCES.includes(saleSource)) return null

  const transactionDate = parseDate(get('transaction_date'))
  const canceledDate    = parseDate(get('canceled_date'))
  const cancelCode      = String(get('cancel_code') ?? '').trim() || null

  // Derive year/month for easy filtering
  const year  = transactionDate ? parseInt(transactionDate.slice(0, 4), 10) : null
  const month = transactionDate ? parseInt(transactionDate.slice(5, 7), 10) : null

  const cancelYear  = canceledDate ? parseInt(canceledDate.slice(0, 4), 10) : null
  const cancelMonth = canceledDate ? parseInt(canceledDate.slice(5, 7), 10) : null

  return {
    upload_id:                      uploadId,
    transaction_date:               transactionDate,
    year,
    month,
    product_name:                   String(get('product_name') ?? '').trim() || null,
    sku:                            String(get('sku') ?? '').trim() || null,
    category:                       String(get('category') ?? '').trim() || null,
    vendor:                         String(get('vendor') ?? '').trim() || null,
    collection:                     String(get('collection') ?? '').trim() || null,
    department:                     String(get('department') ?? '').trim() || null,
    upholstery_flag:                String(get('upholstery_flag') ?? '').trim() || null,
    order_id:                       String(get('order_id') ?? '').trim() || null,
    payment_processor:              String(get('payment_processor') ?? '').trim() || null,
    order_status:                   String(get('order_status') ?? '').trim() || null,
    item_status:                    String(get('item_status') ?? '').trim() || null,
    shipped_via:                    String(get('shipped_via') ?? '').trim() || null,
    fulfillment_location:           String(get('fulfillment_location') ?? '').trim() || null,
    total_extended_booked_sales:    parseNum(get('total_extended_booked_sales')),
    qty:                            parseInt2(get('qty')),
    map_msrp:                       parseNum(get('map_msrp')),
    product_cost:                   parseNum(get('product_cost')),
    shipping_type:                  String(get('shipping_type') ?? '').trim() || null,
    shipping_charged_to_customer:   parseNum(get('shipping_charged_to_customer')),
    shipping_cost:                  parseNum(get('shipping_cost')),
    refund:                         parseNum(get('refund')),
    is_trade:                       String(get('is_trade') ?? '').trim() || null,
    total_revenue:                  parseNum(get('total_revenue')),
    total_cost:                     parseNum(get('total_cost')),
    sale_source:                    saleSource,
    bo_flag:                        String(get('bo_flag') ?? '').trim() || null,
    cancel_code:                    cancelCode,
    canceled_date:                  canceledDate,
    cancel_year:                    cancelYear,
    cancel_month:                   cancelMonth,
    customer_name:                  String(get('customer_name') ?? '').trim() || null,
    customer_email:                 String(get('customer_email') ?? '').trim() || null,
    customer_ship_state:            String(get('customer_ship_state') ?? '').trim() || null,
    paid_amount:                    parseNum(get('paid_amount')),
    sales_rep:                      String(get('sales_rep') ?? '').trim() || null,
    segment:                        String(get('segment') ?? '').trim() || null,
    shipped_date:                   parseDate(get('shipped_date')),
    sale_flag:                      String(get('sale_flag') ?? '').trim() || null,
    discount:                       parseNum(get('discount')),
  }
}

/**
 * Parse a CSV File object. Returns { headers, rows, skipped, mappingResult }.
 */
export function parseCSV(file) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete(results) {
        const rawHeaders = results.meta.fields ?? []
        const mappingResult = mapHeaders(rawHeaders)
        resolve({ rawHeaders, results, mappingResult })
      },
      error(err) {
        reject(err)
      },
    })
  })
}

/**
 * Transform all parsed rows into canonical DB rows for a given uploadId.
 * Returns { rows: [], skipped: number }.
 */
export function transformRows(rawRows, headerMapping, uploadId) {
  const rows = []
  let skipped = 0

  for (const rawRow of rawRows) {
    const transformed = transformRow(rawRow, headerMapping, uploadId)
    if (transformed) {
      rows.push(transformed)
    } else {
      skipped++
    }
  }

  return { rows, skipped }
}
