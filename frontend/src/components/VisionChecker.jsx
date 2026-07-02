import React, { useState } from 'react'
import { analyzeVisionImage } from '../api.js'
import { uiStrings } from '../data/staticData.js'

function Stepper({ step, labels }) {
  return (
    <div className="flex items-center gap-2 mb-5">
      {labels.map((label, i) => {
        const n = i + 1
        const active = step === n
        const done = step > n
        return (
          <React.Fragment key={label}>
            <div className={`flex items-center gap-1.5 text-xs font-semibold ${active ? 'text-brand-900' : done ? 'text-brand-500' : 'text-slate-300'}`}>
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[0.65rem] ${
                  active ? 'bg-brand-500 text-white' : done ? 'bg-success-500 text-white' : 'bg-brand-50 text-slate-400'
                }`}
              >
                {done ? '✓' : n}
              </span>
              <span className="hidden sm:inline">{label}</span>
            </div>
            {n < labels.length && <div className="flex-1 h-px bg-brand-100" />}
          </React.Fragment>
        )
      })}
    </div>
  )
}

export default function VisionChecker({ language, onConfirm, confirmed }) {
  const t = uiStrings[language]
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [extracted, setExtracted] = useState(null)
  const [editText, setEditText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [dragOver, setDragOver] = useState(false)

  function loadFile(f) {
    if (!f) return
    setFile(f)
    setPreview(URL.createObjectURL(f))
    setExtracted(null)
    setEditText('')
    onConfirm(null)
    setError(null)
  }

  function handleFile(e) { loadFile(e.target.files?.[0]) }
  function handleDrop(e) { e.preventDefault(); setDragOver(false); loadFile(e.dataTransfer.files?.[0]) }

  async function analyze() {
    if (!file) return
    setLoading(true)
    setError(null)
    try {
      const res = await analyzeVisionImage(file, language)
      if (res.is_error) { setError(res.result); setExtracted(null) }
      else { setExtracted(res.result); setEditText(res.result) }
    } catch (e) {
      setError(t.connectionError)
    } finally {
      setLoading(false)
    }
  }

  function clearAll() {
    setFile(null); setPreview(null); setExtracted(null); setEditText(''); setError(null); onConfirm(null)
  }

  const currentStep = extracted ? 3 : file ? 2 : 1
  const stepLabels = [t.uploadImage.split(' ')[0], t.analyze, t.confirmUse.split(' ')[0]]

  if (confirmed) {
    return (
      <div className="bg-success-50 border border-success-500/30 rounded-2xl p-6 max-w-2xl">
        <p className="text-success-500 font-bold text-sm mb-2 flex items-center gap-2">✅ {t.confirmedUsed}</p>
        <p className="text-sm text-ink whitespace-pre-wrap mb-4">{confirmed}</p>
        <button
          onClick={() => onConfirm(null)}
          className="bg-white border border-brand-200 text-brand-900 font-semibold text-sm rounded-lg px-4 py-2 hover:bg-brand-50 transition-colors"
        >
          ✏️ {t.editAgain}
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-3xl">
      <Stepper step={currentStep} labels={stepLabels} />

      <div className="grid lg:grid-cols-2 gap-6">
        <div>
          {!preview ? (
            <label
              className={`relative block border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-colors ${
                dragOver ? 'border-brand-500 bg-brand-50' : 'border-brand-200 hover:border-brand-400 hover:bg-brand-50/60'
              }`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
            >
              <input type="file" accept="image/jpeg,image/png,image/jpg" onChange={handleFile} className="absolute inset-0 opacity-0 cursor-pointer" />
              <span className="text-4xl block mb-3">🩹</span>
              <p className="font-semibold text-brand-900 mb-1">{t.uploadImage}</p>
              <p className="text-xs text-slate-400">JPG / PNG · {language === 'bn' ? 'ক্লিক করুন বা টেনে আনুন' : 'click or drag & drop'}</p>
            </label>
          ) : (
            <div className="rounded-2xl overflow-hidden border border-brand-100 shadow-soft">
              <img src={preview} alt="preview" className="w-full max-h-72 object-cover" />
              <div className="flex items-center justify-between bg-brand-900/90 text-white text-xs px-3 py-2">
                <span className="truncate">{file?.name}</span>
                <button onClick={clearAll} className="text-brand-200 underline font-semibold shrink-0 ml-2">
                  {language === 'bn' ? 'পরিবর্তন' : 'change'}
                </button>
              </div>
            </div>
          )}

          {preview && !extracted && (
            <div className="flex gap-2.5 mt-4">
              {!loading && (
                <button onClick={analyze} className="flex-1 bg-gradient-to-r from-brand-500 to-brand-700 text-white font-semibold rounded-xl py-2.5 shadow-md shadow-brand-700/25 hover:-translate-y-0.5 transition-transform">
                  🔍 {t.analyze}
                </button>
              )}
              <button onClick={clearAll} className="text-coral-500 border border-coral-500/40 rounded-xl px-4 text-sm font-semibold hover:bg-coral-50 transition-colors">
                🗑️
              </button>
            </div>
          )}
          {loading && <div className="mt-4 flex items-center gap-2 text-sm text-slate-500"><span className="spinner text-brand-500" />{t.analyzing}</div>}
          {error && <div className="mt-4 bg-coral-50 text-coral-600 rounded-lg px-3.5 py-2.5 text-sm">⚠️ {error}</div>}
        </div>

        <div>
          {extracted ? (
            <div className="bg-white border border-brand-100 rounded-2xl p-5 shadow-soft h-full flex flex-col">
              <p className="text-xs font-bold uppercase tracking-wide text-brand-500 mb-2">✏️ {t.editIfNeeded}</p>
              <textarea
                rows={8}
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                className="flex-1 border border-brand-100 rounded-lg p-3 text-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-200 transition resize-none"
              />
              <div className="flex gap-2.5 mt-3">
                <button onClick={analyze} className="flex-1 bg-brand-50 text-brand-900 border border-brand-200 font-semibold text-sm rounded-lg py-2 hover:bg-brand-100 transition-colors">
                  🔄 {t.reanalyze}
                </button>
                <button onClick={clearAll} className="flex-1 bg-brand-50 text-brand-900 border border-brand-200 font-semibold text-sm rounded-lg py-2 hover:bg-brand-100 transition-colors">
                  🗑️ {t.clear}
                </button>
              </div>
              <button
                onClick={() => onConfirm(editText)}
                className="mt-2.5 w-full bg-gradient-to-r from-brand-500 to-brand-700 text-white font-semibold rounded-lg py-2.5 shadow-md shadow-brand-700/25 hover:-translate-y-0.5 transition-transform"
              >
                ✅ {t.confirmUse}
              </button>
            </div>
          ) : (
            <div className="h-full min-h-[220px] flex items-center justify-center text-center text-slate-400 border border-dashed border-brand-100 rounded-2xl p-8">
              <div>
                <span className="text-3xl block mb-2">👁️</span>
                <p className="text-sm">{language === 'bn' ? 'ছবি বিশ্লেষণের ফলাফল এখানে দেখাবে' : 'Analysis results will appear here'}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
