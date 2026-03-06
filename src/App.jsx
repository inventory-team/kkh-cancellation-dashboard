import { useState, useEffect } from 'react'
import TopNav from './components/layout/TopNav.jsx'
import FilterBar from './components/layout/FilterBar.jsx'
import CSVUpload from './components/upload/CSVUpload.jsx'
import SummaryView from './pages/SummaryView.jsx'
import OperationsView from './pages/OperationsView.jsx'
import VendorView from './pages/VendorView.jsx'
import SKUView from './pages/SKUView.jsx'
import EarlyWarningView from './pages/EarlyWarningView.jsx'
import RecommendationsView from './pages/RecommendationsView.jsx'
import { useData } from './hooks/useData.js'
import { useFilters } from './hooks/useFilters.js'

export default function App() {
  const [activeTab, setActiveTab]         = useState('summary')
  const [showUpload, setShowUpload]       = useState(false)

  const {
    allRows,
    uploadHistory,
    activeUploadId,
    loading,
    error,
    loadData,
    refreshAfterUpload,
  } = useData()

  const {
    filters,
    setFilter,
    resetFilters,
    filteredAll,
    filteredCancellations,
    activeFilterCount,
  } = useFilters(allRows)

  // Load data on mount
  useEffect(() => {
    loadData()
  }, [loadData])

  function handleUploadComplete(uploadId, rowCount, skipped) {
    setShowUpload(false)
    refreshAfterUpload(uploadId)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <TopNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onUploadClick={() => setShowUpload(true)}
        uploadCount={uploadHistory.length}
      />

      <FilterBar
        allRows={allRows}
        filters={filters}
        setFilter={setFilter}
        resetFilters={resetFilters}
        activeFilterCount={activeFilterCount}
      />

      <main className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-6">
        {/* Loading state */}
        {loading && (
          <div className="flex items-center justify-center py-16 gap-3 text-gray-500">
            <div className="w-6 h-6 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm">Loading data…</span>
          </div>
        )}

        {/* Error state */}
        {!loading && error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <p className="text-red-700 font-medium text-sm">{error}</p>
            <p className="text-red-400 text-xs mt-1">
              Check your Supabase credentials in .env or upload a CSV to get started.
            </p>
            <button
              onClick={() => setShowUpload(true)}
              className="mt-3 px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 transition-colors"
            >
              Upload CSV
            </button>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && allRows.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 rounded-2xl bg-brand-50 border border-brand-100 flex items-center justify-center text-4xl mb-5">
              📊
            </div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              KKH Cancellation Dashboard
            </h2>
            <p className="text-sm text-gray-500 max-w-md mb-6">
              Upload a KKH sales CSV export to analyze cancellations across vendors, SKUs, and operations.
            </p>
            <button
              onClick={() => setShowUpload(true)}
              className="px-5 py-2.5 bg-brand-600 text-white font-medium rounded-xl hover:bg-brand-700 transition-colors"
            >
              Upload CSV to Get Started
            </button>

            {/* Upload history */}
            {uploadHistory.length > 0 && (
              <div className="mt-8 w-full max-w-md">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Previous Uploads</p>
                <div className="space-y-1">
                  {uploadHistory.slice(0, 5).map((u) => (
                    <button
                      key={u.id}
                      onClick={() => refreshAfterUpload(u.id)}
                      className="w-full text-left flex items-center justify-between bg-white border border-gray-200 rounded-lg px-4 py-2.5 text-sm hover:border-brand-300 transition-colors"
                    >
                      <span className="text-gray-700">{u.file_name}</span>
                      <span className="text-gray-400 text-xs">{new Date(u.created_at).toLocaleDateString()}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Dashboard views */}
        {!loading && allRows.length > 0 && (
          <>
            {activeTab === 'summary'      && <SummaryView      allRows={filteredAll} cancelledRows={filteredCancellations} />}
            {activeTab === 'operations'   && <OperationsView   cancelledRows={filteredCancellations} />}
            {activeTab === 'vendor'       && <VendorView       allRows={filteredAll} cancelledRows={filteredCancellations} />}
            {activeTab === 'sku'          && <SKUView          allRows={filteredAll} cancelledRows={filteredCancellations} />}
            {activeTab === 'earlywarning' && <EarlyWarningView allRows={filteredAll} cancelledRows={filteredCancellations} />}
            {activeTab === 'recs'         && <RecommendationsView allRows={filteredAll} cancelledRows={filteredCancellations} />}
          </>
        )}
      </main>

      {/* Upload footer bar */}
      {uploadHistory.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-2 flex items-center justify-between text-xs text-gray-400 z-20">
          <span>
            Active dataset: <strong className="text-gray-600">{uploadHistory[0]?.file_name}</strong>
            {' · '}uploaded {new Date(uploadHistory[0]?.created_at).toLocaleDateString()}
          </span>
          <span>{allRows.length.toLocaleString()} rows loaded</span>
        </div>
      )}

      {/* Upload modal */}
      {showUpload && (
        <CSVUpload
          onUploadComplete={handleUploadComplete}
          onClose={() => setShowUpload(false)}
        />
      )}
    </div>
  )
}
