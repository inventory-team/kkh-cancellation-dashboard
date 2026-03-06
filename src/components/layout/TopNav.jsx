import clsx from 'clsx'

const TABS = [
  { id: 'summary',      label: 'Summary' },
  { id: 'operations',   label: 'Operations' },
  { id: 'vendor',       label: 'Vendor' },
  { id: 'sku',          label: 'SKU' },
  { id: 'earlywarning', label: 'Early Warning' },
  { id: 'recs',         label: 'Recommendations' },
]

export default function TopNav({ activeTab, onTabChange, onUploadClick, uploadCount }) {
  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6">
        {/* Brand row */}
        <div className="flex items-center justify-between h-14 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center text-white font-bold text-sm">
              K
            </div>
            <span className="font-semibold text-gray-900 text-sm tracking-tight">
              KKH Cancellation Dashboard
            </span>
            <span className="hidden sm:inline-block text-xs text-gray-400 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded">
              Internal Analytics
            </span>
          </div>

          <button
            onClick={onUploadClick}
            className="flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-3 py-1.5 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M12 12V4m0 0l-3 3m3-3l3 3" />
            </svg>
            Upload CSV
            {uploadCount > 0 && (
              <span className="bg-white/20 text-white text-xs px-1.5 py-0.5 rounded-full">
                {uploadCount}
              </span>
            )}
          </button>
        </div>

        {/* Tab row */}
        <nav className="flex gap-0 overflow-x-auto scrollbar-hide">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={clsx(
                'px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors',
                activeTab === tab.id
                  ? 'border-brand-600 text-brand-600'
                  : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300'
              )}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>
    </header>
  )
}
