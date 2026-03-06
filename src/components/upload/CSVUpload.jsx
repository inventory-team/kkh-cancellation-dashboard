import { useState, useRef } from 'react'
import { parseCSV, transformRows, ALLOWED_SALE_SOURCES } from '../../lib/csvParser.js'
import { createUploadRecord, insertSalesRows } from '../../lib/supabase.js'
import clsx from 'clsx'

const REQUIRED_FIELDS = ['transaction_date', 'sku', 'vendor', 'qty', 'sale_source', 'total_extended_booked_sales']

const STEPS = { IDLE: 'IDLE', PARSING: 'PARSING', PREVIEW: 'PREVIEW', UPLOADING: 'UPLOADING', DONE: 'DONE', ERROR: 'ERROR' }

export default function CSVUpload({ onUploadComplete, onClose }) {
  const inputRef = useRef(null)
  const [step, setStep]           = useState(STEPS.IDLE)
  const [file, setFile]           = useState(null)
  const [parseResult, setParseResult] = useState(null)
  const [progress, setProgress]   = useState(0)
  const [errorMsg, setErrorMsg]   = useState('')
  const [dragOver, setDragOver]   = useState(false)

  async function handleFile(f) {
    if (!f) return
    if (!f.name.toLowerCase().endsWith('.csv')) {
      setErrorMsg('Please upload a .csv file.')
      setStep(STEPS.ERROR)
      return
    }
    setFile(f)
    setStep(STEPS.PARSING)
    setErrorMsg('')

    try {
      const { rawHeaders, results, mappingResult } = await parseCSV(f)
      const { mapping, unmapped } = mappingResult

      // Validate required fields
      const missing = REQUIRED_FIELDS.filter((f) => !mapping[f])

      setParseResult({
        rawHeaders,
        mapping,
        unmapped,
        missing,
        totalRows: results.data.length,
        rawRows: results.data,
        preview: results.data.slice(0, 5),
      })
      setStep(STEPS.PREVIEW)
    } catch (err) {
      setErrorMsg(`Parse error: ${err.message}`)
      setStep(STEPS.ERROR)
    }
  }

  async function handleUpload() {
    if (!parseResult || !file) return
    setStep(STEPS.UPLOADING)
    setProgress(0)

    try {
      // Create upload record
      const upload = await createUploadRecord({
        fileName: file.name,
        rowCount: parseResult.totalRows,
        sourcePeriod: `From CSV upload`,
      })

      setProgress(20)

      // Transform rows
      const { rows, skipped } = transformRows(parseResult.rawRows, parseResult.mapping, upload.id)

      setProgress(40)

      // Insert into Supabase in batches
      const CHUNK = 500
      for (let i = 0; i < rows.length; i += CHUNK) {
        await insertSalesRows(rows.slice(i, i + CHUNK))
        setProgress(40 + Math.round(((i + CHUNK) / rows.length) * 55))
      }

      setProgress(100)
      setStep(STEPS.DONE)

      if (onUploadComplete) {
        setTimeout(() => onUploadComplete(upload.id, rows.length, skipped), 800)
      }
    } catch (err) {
      setErrorMsg(err.message ?? 'Upload failed. Check your Supabase credentials.')
      setStep(STEPS.ERROR)
    }
  }

  function reset() {
    setStep(STEPS.IDLE)
    setFile(null)
    setParseResult(null)
    setProgress(0)
    setErrorMsg('')
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="font-semibold text-gray-900">Upload CSV Sales File</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Rows must include Sale Source: {ALLOWED_SALE_SOURCES.join(', ')}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        <div className="px-6 py-5 space-y-5">

          {/* IDLE: Drop zone */}
          {step === STEPS.IDLE && (
            <div
              className={clsx(
                'border-2 border-dashed rounded-xl p-10 text-center transition-colors cursor-pointer',
                dragOver ? 'border-brand-400 bg-brand-50' : 'border-gray-200 hover:border-brand-300'
              )}
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]) }}
            >
              <div className="text-4xl mb-3">📂</div>
              <p className="text-sm font-medium text-gray-700">Drop your CSV file here or click to browse</p>
              <p className="text-xs text-gray-400 mt-1">Supports KKH Sales exports (.csv)</p>
              <input
                ref={inputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => handleFile(e.target.files[0])}
              />
            </div>
          )}

          {/* PARSING */}
          {step === STEPS.PARSING && (
            <div className="flex flex-col items-center py-10 gap-3">
              <div className="w-8 h-8 border-3 border-brand-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-gray-500">Parsing file…</p>
            </div>
          )}

          {/* PREVIEW */}
          {step === STEPS.PREVIEW && parseResult && (
            <div className="space-y-4">
              {/* Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <div className="text-xl font-bold text-gray-900">{parseResult.totalRows.toLocaleString()}</div>
                  <div className="text-xs text-gray-500 mt-0.5">Total Rows</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <div className="text-xl font-bold text-green-600">{Object.keys(parseResult.mapping).length}</div>
                  <div className="text-xs text-gray-500 mt-0.5">Columns Mapped</div>
                </div>
                <div className={clsx('rounded-lg p-3 text-center', parseResult.unmapped.length > 0 ? 'bg-amber-50' : 'bg-gray-50')}>
                  <div className={clsx('text-xl font-bold', parseResult.unmapped.length > 0 ? 'text-amber-600' : 'text-gray-400')}>
                    {parseResult.unmapped.length}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">Unmapped Cols</div>
                </div>
              </div>

              {/* Missing required fields warning */}
              {parseResult.missing.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                  <strong>Missing required columns:</strong> {parseResult.missing.join(', ')}
                  <p className="text-xs mt-1 text-red-500">Upload may produce incomplete results.</p>
                </div>
              )}

              {/* Column mapping preview */}
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Column Mapping</h4>
                <div className="grid grid-cols-2 gap-1 max-h-36 overflow-auto text-xs">
                  {Object.entries(parseResult.mapping).map(([canonical, raw]) => (
                    <div key={canonical} className="flex items-center gap-1.5 bg-gray-50 rounded px-2 py-1">
                      <span className="text-green-600 font-mono">✓</span>
                      <span className="text-gray-500 truncate">{raw}</span>
                      <span className="text-gray-300 shrink-0">→</span>
                      <span className="text-gray-700 font-medium truncate">{canonical}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Data preview */}
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Data Preview (first 5 rows)</h4>
                <div className="overflow-auto rounded-lg border border-gray-100">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50">
                      <tr>
                        {['transaction_date', 'sku', 'vendor', 'sale_source', 'qty', 'cancel_code'].map((f) => (
                          <th key={f} className="px-3 py-2 text-left font-medium text-gray-500">{f}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {parseResult.preview.map((row, i) => {
                        const get = (canonical) => {
                          const rawKey = parseResult.mapping[canonical]
                          return rawKey ? row[rawKey] : '—'
                        }
                        return (
                          <tr key={i}>
                            {['transaction_date', 'sku', 'vendor', 'sale_source', 'qty', 'cancel_code'].map((f) => (
                              <td key={f} className="px-3 py-2 text-gray-700 max-w-[120px] truncate">{get(f) ?? '—'}</td>
                            ))}
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* UPLOADING */}
          {step === STEPS.UPLOADING && (
            <div className="space-y-4 py-4">
              <p className="text-sm text-center text-gray-600 font-medium">Uploading to Supabase…</p>
              <div className="w-full bg-gray-100 rounded-full h-2.5">
                <div
                  className="bg-brand-600 h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-center text-gray-400">{progress}% complete</p>
            </div>
          )}

          {/* DONE */}
          {step === STEPS.DONE && (
            <div className="flex flex-col items-center py-8 gap-3">
              <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center text-2xl">✓</div>
              <p className="text-base font-semibold text-gray-800">Upload complete!</p>
              <p className="text-sm text-gray-400">Dashboard is refreshing with new data…</p>
            </div>
          )}

          {/* ERROR */}
          {step === STEPS.ERROR && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
              <p className="font-semibold mb-1">Upload failed</p>
              <p className="text-xs">{errorMsg}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
          {step === STEPS.ERROR && (
            <button onClick={reset} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
              Try Again
            </button>
          )}
          {step === STEPS.PREVIEW && (
            <>
              <button onClick={reset} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
                Back
              </button>
              <button
                onClick={handleUpload}
                className="px-5 py-2 text-sm font-medium bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors"
              >
                Upload {parseResult.totalRows.toLocaleString()} rows
              </button>
            </>
          )}
          {(step === STEPS.IDLE || step === STEPS.DONE) && (
            <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
