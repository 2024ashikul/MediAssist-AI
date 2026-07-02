import React, { useState, useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import { extractOcrText } from '../api.js'
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
            <div className={`flex items-center gap-1.5 text-xs font-semibold ${active ? 'text-brand-900' : done ? 'text-warn-500' : 'text-slate-300'}`}>
              <span
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[0.65rem] ${
                  active ? 'bg-warn-500 text-white' : done ? 'bg-success-500 text-white' : 'bg-warn-50 text-slate-400'
                }`}
              >
                {done ? '✓' : n}
              </span>
              <span className="hidden sm:inline">{label}</span>
            </div>
            {n < labels.length && <div className="flex-1 h-px bg-warn-50" />}
          </React.Fragment>
        )
      })}
    </div>
  )
}

// Pulls brand names out of the "Medicines:" list the Gemini prompt produces, e.g.:
// Medicines:
// - Napa — 500mg — 2x daily — 5 days
// - [illegible] — ...
// Falls back to scanning any "- name — ..." style line if no explicit "Medicines:" header is found.
function extractBrandNames(markdown) {
  if (!markdown) return []
  const lines = markdown.split('\n')
  const names = []
  let inMedicinesSection = false
  let sawMedicinesHeader = false

  const cleanName = (raw) =>
    raw.replace(/\*\*/g, '').replace(/\*/g, '').replace(/`/g, '').trim()

  for (const rawLine of lines) {
    const line = rawLine.trim()

    if (/^medicines\s*:?\s*$/i.test(line)) {
      inMedicinesSection = true
      sawMedicinesHeader = true
      continue
    }

    if (inMedicinesSection) {
      if (line === '') continue
      if (line.startsWith('-') || line.startsWith('*')) {
        const content = line.replace(/^[-*]\s*/, '')
        const name = cleanName(content.split('—')[0] || content.split('-')[0] || content)
        if (name && !/^\[illegible\]$/i.test(name)) names.push(name)
      } else {
        inMedicinesSection = false // next section/heading reached
      }
    }
  }

  if (!sawMedicinesHeader || names.length === 0) {
    // fallback: any bullet line that looks like "- name — dosage ..."
    for (const rawLine of lines) {
      const line = rawLine.trim()
      if ((line.startsWith('-') || line.startsWith('*')) && line.includes('—')) {
        const content = line.replace(/^[-*]\s*/, '')
        const name = cleanName(content.split('—')[0])
        if (name && !/^\[illegible\]$/i.test(name)) names.push(name)
      }
    }
  }

  return [...new Set(names)]
}

export default function OcrChecker({ language, onConfirm, confirmed, onBrandClick }) {
  const t = uiStrings[language]
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [extracted, setExtracted] = useState(null)
  const [editText, setEditText] = useState('')
  const [mode, setMode] = useState('preview') // 'preview' | 'edit'
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [dragOver, setDragOver] = useState(false)

  const brandNames = useMemo(() => extractBrandNames(editText), [editText])

  function loadFile(f) {
    if (!f) return
    setFile(f)
    setPreview(URL.createObjectURL(f))
    setExtracted(null)
    setEditText('')
    setMode('preview')
    onConfirm(null)
    setError(null)
  }

  function handleFile(e) { loadFile(e.target.files?.[0]) }
  function handleDrop(e) { e.preventDefault(); setDragOver(false); loadFile(e.dataTransfer.files?.[0]) }

  async function extract() {
    if (!file) return
    setLoading(true)
    setError(null)
    try {
      const res = await extractOcrText(file, language)
      if (res.is_error) { setError(res.result); setExtracted(null) }
      else { setExtracted(res.result); setEditText(res.result); setMode('preview') }
    } catch (e) {
      setError(t.connectionError)
    } finally {
      setLoading(false)
    }
  }

  function clearAll() {
    setFile(null); setPreview(null); setExtracted(null); setEditText(''); setError(null); setMode('preview'); onConfirm(null)
  }

  const currentStep = extracted ? 3 : file ? 2 : 1
  const stepLabels = [t.uploadPrescription.split(' ')[0], t.extractText, t.confirmUse.split(' ')[0]]

  if (confirmed) {
    return (
      <div className="bg-success-50 border border-success-500/30 rounded-2xl p-6 max-w-2xl">
        <p className="text-success-500 font-bold text-sm mb-2 flex items-center gap-2">✅ {t.confirmedUsed}</p>
        <div className="text-sm text-ink mb-4 prose prose-sm max-w-none">
          <ReactMarkdown>{confirmed}</ReactMarkdown>
        </div>
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
        {/* Scanner column */}
        <div>
          {!preview ? (
            <label
              className={`relative block border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-colors ${
                dragOver ? 'border-warn-500 bg-warn-50' : 'border-brand-200 hover:border-warn-500 hover:bg-warn-50/50'
              }`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
            >
              <input type="file" accept="image/jpeg,image/png,image/jpg" onChange={handleFile} className="absolute inset-0 opacity-0 cursor-pointer" />
              <span className="text-4xl block mb-3">📄</span>
              <p className="font-semibold text-brand-900 mb-1">{t.uploadPrescription}</p>
              <p className="text-xs text-slate-400">JPG / PNG · {language === 'bn' ? 'ক্লিক করুন বা টেনে আনুন' : 'click or drag & drop'}</p>
            </label>
          ) : (
            <div className="relative rounded-2xl overflow-hidden bg-ink shadow-soft">
              <img src={preview} alt="preview" className="w-full max-h-72 object-cover opacity-90" />
              {/* scan corner frame */}
              <div className="pointer-events-none absolute inset-3 border-2 border-warn-500/70 rounded-lg">
                <span className="absolute -top-0.5 -left-0.5 w-4 h-4 border-t-4 border-l-4 border-warn-500 rounded-tl" />
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 border-t-4 border-r-4 border-warn-500 rounded-tr" />
                <span className="absolute -bottom-0.5 -left-0.5 w-4 h-4 border-b-4 border-l-4 border-warn-500 rounded-bl" />
                <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 border-b-4 border-r-4 border-warn-500 rounded-br" />
              </div>
              <div className="flex items-center justify-between bg-black/60 text-white text-xs px-3 py-2">
                <span className="truncate">{file?.name}</span>
                <button onClick={clearAll} className="text-warn-500 underline font-semibold shrink-0 ml-2">
                  {language === 'bn' ? 'পরিবর্তন' : 'change'}
                </button>
              </div>
            </div>
          )}

          {preview && !extracted && (
            <div className="flex gap-2.5 mt-4">
              {!loading && (
                <button onClick={extract} className="flex-1 bg-gradient-to-r from-warn-500 to-amber-600 text-white font-semibold rounded-xl py-2.5 shadow-md shadow-warn-500/30 hover:-translate-y-0.5 transition-transform">
                  🔍 {t.extractText}
                </button>
              )}
              <button onClick={clearAll} className="text-coral-500 border border-coral-500/40 rounded-xl px-4 text-sm font-semibold hover:bg-coral-50 transition-colors">
                🗑️
              </button>
            </div>
          )}
          {loading && <div className="mt-4 flex items-center gap-2 text-sm text-slate-500"><span className="spinner text-warn-500" />{t.analyzing}</div>}
          {error && <div className="mt-4 bg-coral-50 text-coral-600 rounded-lg px-3.5 py-2.5 text-sm">⚠️ {error}</div>}
        </div>

        {/* "Receipt" extracted-text column */}
        <div>
          {extracted ? (
            <div className="bg-[repeating-linear-gradient(white,white_27px,theme(colors.warn.50)_28px)] border border-warn-500/30 rounded-2xl p-5 shadow-soft h-full flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold uppercase tracking-wide text-warn-500 flex items-center gap-1.5">
                  🧾 {t.editIfNeeded}
                </p>
                <div className="flex rounded-lg overflow-hidden border border-warn-500/30 text-xs font-semibold">
                  <button
                    onClick={() => setMode('preview')}
                    className={`px-2.5 py-1 transition-colors ${mode === 'preview' ? 'bg-warn-500 text-white' : 'bg-white text-brand-900 hover:bg-warn-50'}`}
                  >
                    👁️ {language === 'bn' ? 'প্রিভিউ' : 'Preview'}
                  </button>
                  <button
                    onClick={() => setMode('edit')}
                    className={`px-2.5 py-1 transition-colors ${mode === 'edit' ? 'bg-warn-500 text-white' : 'bg-white text-brand-900 hover:bg-warn-50'}`}
                  >
                    ✏️ {language === 'bn' ? 'সম্পাদনা' : 'Edit'}
                  </button>
                </div>
              </div>

              {mode === 'preview' ? (
                <div
                  onClick={() => setMode('edit')}
                  className="flex-1 bg-white/70 border border-warn-500/20 rounded-lg p-3 text-sm leading-6 overflow-auto cursor-text prose prose-sm max-w-none"
                  title={language === 'bn' ? 'সম্পাদনা করতে ক্লিক করুন' : 'Click to edit'}
                >
                  <ReactMarkdown>{editText}</ReactMarkdown>
                </div>
              ) : (
                <textarea
                  rows={8}
                  autoFocus
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  className="flex-1 bg-transparent border border-warn-500/20 rounded-lg p-3 text-sm font-mono leading-6 outline-none focus:border-warn-500 focus:ring-2 focus:ring-warn-500/20 transition resize-none"
                />
              )}

              {brandNames.length > 0 && (
                <div className="mt-3">
                  <p className="text-[0.65rem] font-bold uppercase tracking-wide text-slate-400 mb-1.5">
                    💊 {language === 'bn' ? 'সনাক্ত করা ওষুধ' : 'Detected Medicines'}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {brandNames.map((name) => (
                      <button
                        key={name}
                        onClick={() => onBrandClick?.(name)}
                        className="text-xs font-semibold bg-brand-50 text-brand-700 border border-brand-100 rounded-full px-3 py-1 hover:bg-brand-100 transition-colors"
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2.5 mt-3">
                <button onClick={extract} className="flex-1 bg-warn-50 text-brand-900 border border-warn-500/30 font-semibold text-sm rounded-lg py-2 hover:bg-warn-50/70 transition-colors">
                  🔄 {t.reextract}
                </button>
                <button onClick={clearAll} className="flex-1 bg-warn-50 text-brand-900 border border-warn-500/30 font-semibold text-sm rounded-lg py-2 hover:bg-warn-50/70 transition-colors">
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
            <div className="h-full min-h-[220px] flex items-center justify-center text-center text-slate-400 border border-dashed border-warn-500/30 rounded-2xl p-8">
              <div>
                <span className="text-3xl block mb-2">🧾</span>
                <p className="text-sm">{language === 'bn' ? 'প্রেসক্রিপশনের টেক্সট এখানে দেখাবে' : 'Extracted prescription text will appear here'}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}