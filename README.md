# KKH Cancellation Dashboard

Internal analytics tool for Kathy Kuo Home — cancellation analysis across vendors, SKUs, and operations.

---

## Stack

- **React 18** + **Vite** — frontend
- **TailwindCSS** — styling
- **Recharts** — charts
- **Supabase** — data storage & backend
- **PapaParse** — CSV parsing

---

## Architecture & Data Flow

```
CSV Upload → PapaParse → Column mapping (csvParser.js)
         → Filter by Sale Source (KKH/Trade/DesignBar/Instagram/TikTok)
         → Transform rows (dataTransform.js)
         → Batch insert to Supabase (sales_data table)
         → Dashboard re-fetches and refreshes views
```

### Data Model

**`uploads`** — one row per CSV upload batch
**`sales_data`** — one row per line-item (filtered to allowed sale sources)

A row is a **cancellation** when `cancel_code IS NOT NULL`.

---

## Column Mapping (Excel → DB)

| Excel Column | DB Field |
|---|---|
| Transaction Date | `transaction_date` |
| Product Name | `product_name` |
| SKU | `sku` |
| Category | `category` |
| Vendor | `vendor` |
| Order ID | `order_id` |
| Total Extended Booked Sales $ | `total_extended_booked_sales` |
| Qty | `qty` |
| Sale Source | `sale_source` |
| Cancel Code | `cancel_code` |
| Canceled Date | `canceled_date` |
| Item Status | `item_status` |
| Fulfillment Location | `fulfillment_location` |
| IsTrade | `is_trade` |
| Customer Ship State | `customer_ship_state` |

---

## Sale Source Filter

Only rows with `Sale Source` in this list are imported:

- `KKH`
- `Trade`
- `DesignBar`
- `Instagram`
- `TikTok`

All other sources are excluded at parse time.

---

## Setup

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) → New project
2. Open **SQL Editor** → paste contents of `supabase/schema.sql` → Run

### 2. Get Credentials

In Supabase: **Settings → API**

- Copy `Project URL`
- Copy `anon public` key

### 3. Configure Environment

```bash
cp .env.example .env
```

Edit `.env`:
```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 4. Install & Run

```bash
npm install
npm run dev
```

Open `http://localhost:5173`

---

## CSV Upload Flow

1. Click **Upload CSV** in the top navigation
2. Drop or select a `.csv` file (exported from your KKH sales system)
3. App auto-maps column headers using fuzzy matching
4. Preview shows first 5 rows and column mapping
5. Click **Upload** — rows are inserted in batches of 500
6. Dashboard refreshes automatically

**Supported column name variations:**
The parser handles slight naming differences (e.g. `Cancel Code` vs `Cancellation Reason`). See `src/lib/csvParser.js` for the full alias map.

---

## Dashboard Views

| Tab | Description |
|---|---|
| **Summary** | KPI cards, monthly trends, YoY comparison, sale source breakdown |
| **Operations** | Top 10 cancel reasons, units/sales by reason, monthly trend per reason |
| **Vendor** | Risk scorecard, drill-down per vendor, monthly trend, top SKUs |
| **SKU** | Top 100 cancelled SKUs, fraud toggle, high-risk flag, category breakdown |
| **Early Warning** | MoM spikes, rising SKUs, worsening vendor trends |
| **Recommendations** | Prioritized action items, root cause breakdown, reduction playbook |

---

## Vendor Risk Score

Scored 0–100. Composed of:

| Factor | Weight |
|---|---|
| Cancelled Sales $ | 35% |
| Cancelled Units | 25% |
| Cancellation Rate | 20% |
| Unique SKUs Cancelled | 10% |
| Months with Cancellations | 10% |

Tiers: **HIGH** ≥70 · **MEDIUM** 40–69 · **LOW** <40

---

## Filters

- Year, Month (chip selectors)
- Sale Source (chip selectors)
- Vendor (multi-select dropdown)
- Cancel Reason (multi-select dropdown)

All filters are applied globally across all dashboard views.

---

## Project Structure

```
src/
├── lib/
│   ├── supabase.js          # Supabase client + query helpers
│   ├── csvParser.js         # CSV parsing, column mapping, row transformation
│   └── dataTransform.js     # Aggregations, KPIs, risk scores, recommendations
├── hooks/
│   ├── useData.js           # Data fetching from Supabase
│   └── useFilters.js        # Global filter state
├── components/
│   ├── layout/
│   │   ├── TopNav.jsx
│   │   └── FilterBar.jsx
│   ├── upload/
│   │   └── CSVUpload.jsx    # Multi-step upload modal
│   ├── cards/
│   │   └── KPICard.jsx
│   ├── charts/
│   │   └── TrendChart.jsx   # DualAxis, YoY, SingleBar charts
│   ├── tables/
│   │   └── DataTable.jsx    # Sortable, paginated table
│   └── common/
│       └── Badge.jsx        # Risk tier badges
├── pages/
│   ├── SummaryView.jsx
│   ├── OperationsView.jsx
│   ├── VendorView.jsx
│   ├── SKUView.jsx
│   ├── EarlyWarningView.jsx
│   └── RecommendationsView.jsx
├── App.jsx
├── main.jsx
└── index.css
supabase/
└── schema.sql
```

---

## Deploying

```bash
npm run build
```

Deploy the `dist/` folder to Vercel, Netlify, or any static host. Set the same env vars in your hosting platform's dashboard.
