-- ============================================================
-- KKH Cancellation Dashboard — Supabase Schema
-- Run this in the Supabase SQL Editor (Project > SQL Editor)
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── 1. uploads ────────────────────────────────────────────────────────────────
-- Tracks each CSV upload batch

CREATE TABLE IF NOT EXISTS uploads (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name    TEXT        NOT NULL,
  upload_date  TIMESTAMPTZ DEFAULT NOW(),
  row_count    INTEGER,
  source_period TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ── 2. sales_data ─────────────────────────────────────────────────────────────
-- One row per line-item from the uploaded CSV (filtered to allowed sale sources)

CREATE TABLE IF NOT EXISTS sales_data (
  id                              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_id                       UUID    REFERENCES uploads(id) ON DELETE CASCADE,

  -- Date fields
  transaction_date                DATE,
  year                            SMALLINT,
  month                           SMALLINT,
  shipped_date                    DATE,

  -- Product fields
  product_name                    TEXT,
  sku                             TEXT,
  category                        TEXT,
  vendor                          TEXT,
  collection                      TEXT,
  department                      TEXT,
  upholstery_flag                 TEXT,

  -- Order fields
  order_id                        TEXT,
  payment_processor               TEXT,
  order_status                    TEXT,
  item_status                     TEXT,
  shipped_via                     TEXT,
  fulfillment_location            TEXT,
  bo_flag                         TEXT,
  sale_flag                       TEXT,

  -- Financials
  total_extended_booked_sales     NUMERIC(12,2),
  qty                             INTEGER,
  map_msrp                        NUMERIC(12,2),
  product_cost                    NUMERIC(12,2),
  shipping_type                   TEXT,
  shipping_charged_to_customer    NUMERIC(12,2),
  shipping_cost                   NUMERIC(12,2),
  refund                          NUMERIC(12,2),
  total_revenue                   NUMERIC(12,2),
  total_cost                      NUMERIC(12,2),
  discount                        NUMERIC(12,2),
  paid_amount                     NUMERIC(12,2),

  -- Sale source (KKH, Trade, DesignBar, Instagram, TikTok)
  sale_source                     TEXT,
  is_trade                        TEXT,

  -- Cancellation fields (NULL = not cancelled)
  cancel_code                     TEXT,
  canceled_date                   DATE,
  cancel_year                     SMALLINT,
  cancel_month                    SMALLINT,

  -- Customer (optional PII — consider RLS if needed)
  customer_name                   TEXT,
  customer_email                  TEXT,
  customer_ship_state             TEXT,

  -- Other
  sales_rep                       TEXT,
  segment                         TEXT,

  created_at                      TIMESTAMPTZ DEFAULT NOW()
);

-- ── Indexes for common query patterns ─────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_sales_upload_id      ON sales_data(upload_id);
CREATE INDEX IF NOT EXISTS idx_sales_cancel_code    ON sales_data(cancel_code) WHERE cancel_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sales_vendor         ON sales_data(vendor);
CREATE INDEX IF NOT EXISTS idx_sales_sku            ON sales_data(sku);
CREATE INDEX IF NOT EXISTS idx_sales_year_month     ON sales_data(year, month);
CREATE INDEX IF NOT EXISTS idx_sales_sale_source    ON sales_data(sale_source);
CREATE INDEX IF NOT EXISTS idx_sales_transaction_dt ON sales_data(transaction_date);

-- ── Row Level Security (optional, enable if multi-user) ───────────────────────
-- ALTER TABLE uploads    ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE sales_data ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "allow_all" ON uploads    FOR ALL USING (true);
-- CREATE POLICY "allow_all" ON sales_data FOR ALL USING (true);

-- ── Convenience views ─────────────────────────────────────────────────────────

-- Cancellations only
CREATE OR REPLACE VIEW cancellations AS
  SELECT *
  FROM   sales_data
  WHERE  cancel_code IS NOT NULL
    AND  cancel_code <> '';

-- Monthly cancellation summary
CREATE OR REPLACE VIEW monthly_cancel_summary AS
  SELECT
    year,
    month,
    sale_source,
    COUNT(*)                                 AS row_count,
    SUM(qty)                                 AS cancel_units,
    SUM(total_extended_booked_sales)         AS cancel_sales,
    COUNT(DISTINCT order_id)                 AS cancel_orders
  FROM   sales_data
  WHERE  cancel_code IS NOT NULL
    AND  cancel_code <> ''
  GROUP  BY year, month, sale_source
  ORDER  BY year, month, sale_source;

-- Vendor risk summary
CREATE OR REPLACE VIEW vendor_cancel_summary AS
  SELECT
    vendor,
    SUM(qty)                                 AS cancel_units,
    SUM(total_extended_booked_sales)         AS cancel_sales,
    COUNT(DISTINCT sku)                      AS unique_skus,
    COUNT(DISTINCT CONCAT(year,'-',month))   AS months_with_cancels
  FROM   sales_data
  WHERE  cancel_code IS NOT NULL
    AND  cancel_code <> ''
  GROUP  BY vendor
  ORDER  BY cancel_sales DESC;
