import React, { useState } from 'react'
import { analyzeVisionImage } from '../api.js'
import { uiStrings } from '../data/staticData.js'

export default function VisionChecker({ language, onConfirm, confirmed }) {
  const t = uiStrings[language]
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [extracted, setExtracted] = useState(null)
  const [editText, setEditText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  function handleFile(e) {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    setPreview(URL.createObjectURL(f))
    setExtracted(null)
    setEditText('')
    onConfirm(null)
    setError(null)
  }

  async function analyze() {
    if (!file) return
    setLoading(true)
    setError(null)
    try {
      const res = await analyzeVisionImage(file, language)
      if (res.is_error) {
        setError(res.result)
        setExtracted(null)
      } else {
        setExtracted(res.result)
        setEditText(res.result)
      }
    } catch (e) {
      setError(t.connectionError)
    } finally {
      setLoading(false)
    }
  }

  function clearAll() {
    setFile(null)
    setPreview(null)
    setExtracted(null)
    setEditText('')
    setError(null)
    onConfirm(null)
  }

  if (confirmed) {
    return (
      <div className="confirmed-box">
        <p className="confirmed-tag">✅ {t.confirmedUsed}</p>
        <p className="confirmed-text">{confirmed}</p>
        <button className="btn-secondary" onClick={() => onConfirm(null)}>
          ✏️ {t.editAgain}
        </button>
      </div>
    )
  }

  return (
    <div className="uploader">
      <p className="caption">Powered by Gemini Vision</p>
      <input type="file" accept="image/jpeg,image/png,image/jpg" onChange={handleFile} />

      {preview && (
        <>
          <img src={preview} alt="preview" className="preview-img" />
          {error && <div className="error-box">{error}</div>}

          {!extracted && !loading && (
            <button className="btn-primary" onClick={analyze}>
              🔍 {t.analyze}
            </button>
          )}
          {loading && <div className="loading-text">{t.analyzing}</div>}

          {extracted && (
            <>
              <div className="btn-row">
                <button className="btn-secondary" onClick={analyze}>
                  🔄 {t.reanalyze}
                </button>
                <button className="btn-secondary" onClick={clearAll}>
                  🗑️ {t.clear}
                </button>
              </div>
              <label className="field-label">✏️ {t.editIfNeeded}</label>
              <textarea
                rows={4}
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
              />
              <button className="btn-primary" onClick={() => onConfirm(editText)}>
                ✅ {t.confirmUse}
              </button>
            </>
          )}

          {!extracted && !loading && (
            <button className="btn-tertiary" onClick={clearAll}>
              🗑️ {t.clear}
            </button>
          )}
        </>
      )}
    </div>
  )
}
