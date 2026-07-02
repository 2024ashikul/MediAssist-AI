import React, { useState, useEffect, useRef } from 'react'
import { searchMedicine, getMedicineDetail } from '../api.js'
import { uiStrings } from '../data/staticData.js'

// Config for every renderable field on the medicine detail object.
// `isHtml: true` means the value is trusted raw HTML and is rendered as-is
// (currently only dosage_description, per backend: it is NOT html-stripped).
// `warning: true` gives contraindications a red/alert treatment instead of the default style.
const FIELD_CONFIG = [
  { key: 'indication_description', label: 'Uses', icon: '🎯' },
  { key: 'pharmacology_description', label: 'Pharmacology', icon: '🧬' },
  { key: 'dosage_description', label: 'Dosage', icon: '💊', isHtml: true },
  { key: 'administration_description', label: 'Administration', icon: '🩺' },
  { key: 'duration_of_treatment_description', label: 'Duration of Treatment', icon: '⏳' },
  { key: 'reconstitution_description', label: 'Reconstitution', icon: '🧪' },
  { key: 'interaction_description', label: 'Interactions', icon: '🔄' },
  { key: 'contraindications_description', label: 'Contraindications', icon: '⚠️', warning: true },
  { key: 'side_effects_description', label: 'Common Side Effects', icon: '🟢' },
  { key: 'precautions_description', label: 'Precautions', icon: '🛑' },
  { key: 'pregnancy_and_lactation_description', label: 'Pregnancy & Lactation', icon: '🤰' },
  { key: 'pediatric_usage_description', label: 'Pediatric Usage', icon: '🧒' },
  { key: 'overdose_effects_description', label: 'Overdose Effects', icon: '🚨' },
  { key: 'storage_conditions_description', label: 'Storage Conditions', icon: '🗄️' },
]

function CollapsibleSection({ id, icon, label, isHtml, warning, content, isOpen, onToggle }) {
  return (
    <div className={`border rounded-xl overflow-hidden ${warning ? 'border-coral-500/30' : 'border-brand-100'}`}>
      <button
        onClick={() => onToggle(id)}
        className={`w-full flex items-center justify-between px-4 py-3 text-left transition-colors ${
          warning ? 'bg-coral-50 text-coral-600' : 'bg-brand-50/60 hover:bg-brand-50 text-brand-900'
        }`}
      >
        <span className="text-xs font-bold uppercase tracking-wide flex items-center gap-1.5">
          <span>{icon}</span> {label}
        </span>
        <span className={`text-sm transition-transform ${isOpen ? 'rotate-180' : ''}`}>▾</span>
      </button>

      {isOpen && (
        <div className={`px-4 py-3 text-sm leading-relaxed ${warning ? 'text-coral-600 bg-coral-50/40' : 'text-ink bg-white'}`}>
          {isHtml ? (
            <div dangerouslySetInnerHTML={{ __html: content }} />
          ) : (
            <p>{content}</p>
          )}
        </div>
      )}
    </div>
  )
}

export default function MedicineFinder({ language }) {
  const t = uiStrings[language]
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [recent, setRecent] = useState([])
  const [openSections, setOpenSections] = useState(() => new Set())
  const debounceRef = useRef(null)

  // realtime search-as-you-type
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    const q = query.trim()
    if (!q) {
      setSuggestions([])
      return
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await searchMedicine(q)
        setSuggestions(res.results || [])
      } catch (e) {
        setSuggestions([])
      }
    }, 300) // 300ms debounce
    return () => clearTimeout(debounceRef.current)
  }, [query])

  function toggleSection(id) {
    setOpenSections((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function selectMedicine(brandId, brandName) {
    setLoading(true)
    setError(null)
    setDetail(null)
    setSuggestions([])
    try {
      const res = await getMedicineDetail(brandId)
      setDetail(res)
      // open the first couple of sections that actually have content by default
      const defaultOpen = FIELD_CONFIG.filter((f) => res[f.key]).slice(0, 2).map((f) => f.key)
      setOpenSections(new Set(defaultOpen))
      setQuery(brandName)
      setRecent((prev) => [brandName, ...prev.filter((r) => r.toLowerCase() !== brandName.toLowerCase())].slice(0, 6))
    } catch (e) {
      setError(e.message || t.connectionError)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl relative">
      <div className="flex gap-2.5 mb-3">
        <input
          type="text"
          value={query}
          placeholder={t.medicineSearchPlaceholder}
          onChange={(e) => { setQuery(e.target.value); setDetail(null) }}
          className="flex-1 border border-brand-100 rounded-xl px-4 py-3 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-200 transition"
        />
      </div>

      {suggestions.length > 0 && !detail && (
        <div className="border border-brand-100 rounded-xl overflow-hidden mb-4 divide-y divide-brand-50">
          {suggestions.map((s) => (
            <button
              key={s.brand_id}
              onClick={() => selectMedicine(s.brand_id, s.brand_name)}
              className="w-full text-left px-4 py-2.5 hover:bg-brand-50 transition-colors"
            >
              <span className="font-semibold text-brand-900">{s.brand_name}</span>
              <span className="text-sm text-slate-500 ml-2">
                {s.generic_name} · {s.strength} · {s.dosage_form} · {s.manufacturer}
              </span>
            </button>
          ))}
        </div>
      )}

      {recent.length > 0 && !detail && suggestions.length === 0 && (
        <div className="flex flex-wrap gap-2 mb-5">
          {recent.map((r) => (
            <button key={r} onClick={() => setQuery(r)}
              className="text-xs font-semibold bg-brand-50 text-brand-700 border border-brand-100 rounded-full px-3 py-1.5 hover:bg-brand-100 transition-colors">
              {r}
            </button>
          ))}
        </div>
      )}

      {loading && (
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-4">
          <span className="spinner text-brand-500" /> {t.medicineSearching}
        </div>
      )}

      {error && !loading && (
        <div className="bg-coral-50 text-coral-600 rounded-lg px-4 py-3 text-sm mb-4">⚠️ {error}</div>
      )}

      {!detail && !loading && !error && suggestions.length === 0 && (
        <div className="text-center text-slate-400 border border-dashed border-brand-100 rounded-2xl p-10">
          <span className="text-3xl block mb-2">💊</span>
          <p className="font-semibold text-brand-900 mb-1">{t.medicineEmptyTitle}</p>
          <p className="text-sm">{t.medicineEmptySub}</p>
        </div>
      )}

      {detail && !loading && (
        <div className="bg-white border border-brand-100 rounded-2xl p-6 shadow-soft flex flex-col gap-4">
          <div>
            <h4 className="font-display text-xl text-brand-900">{detail.brand_name}</h4>
            <p className="text-sm text-slate-500 mt-0.5">
              {detail.generic_name} · {detail.strength} · {detail.dosage_form} · {detail.manufacturer}
            </p>
          </div>

          <div className="flex flex-col gap-2.5">
            {FIELD_CONFIG.filter((f) => detail[f.key]).map((f) => (
              <CollapsibleSection
                key={f.key}
                id={f.key}
                icon={f.icon}
                label={f.label}
                isHtml={f.isHtml}
                warning={f.warning}
                content={detail[f.key]}
                isOpen={openSections.has(f.key)}
                onToggle={toggleSection}
              />
            ))}
          </div>

          <div className="flex gap-2 bg-slate-50 border border-slate-200 text-slate-500 rounded-lg px-3.5 py-3 text-xs leading-relaxed mt-1">
            <span>ℹ️</span>
            <span>
              This information is general in nature and provided for reference only. It is not a substitute
              for professional medical advice. Please consult your doctor or pharmacist before starting,
              stopping, or changing any medication.
            </span>
          </div>
        </div>
      )}
    </div>
  )
}