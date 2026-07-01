import React, { useState } from 'react'
import { uiStrings } from '../data/staticData.js'

export default function BmiCalculator({ language }) {
  const t = uiStrings[language]
  const [weight, setWeight] = useState(70)
  const [height, setHeight] = useState(170)
  const [result, setResult] = useState(null)

  function calculate() {
    const bmi = weight / (height / 100) ** 2
    const water = (weight * 35) / 1000
    setResult({ bmi, water })
  }

  function category() {
    if (!result) return null
    if (result.bmi < 18.5) return { label: t.underweight, tone: 'warn' }
    if (result.bmi < 25) return { label: t.normalWeight, tone: 'ok' }
    if (result.bmi < 30) return { label: t.overweight, tone: 'warn' }
    return { label: t.obese, tone: 'danger' }
  }

  const cat = category()

  return (
    <div className="bmi-calc">
      <label className="field-label">{t.weight}</label>
      <input
        type="number"
        min="10"
        max="200"
        step="0.5"
        value={weight}
        onChange={(e) => setWeight(parseFloat(e.target.value) || 0)}
      />
      <label className="field-label">{t.height}</label>
      <input
        type="number"
        min="50"
        max="250"
        step="1"
        value={height}
        onChange={(e) => setHeight(parseFloat(e.target.value) || 0)}
      />
      <button className="btn-primary" onClick={calculate}>
        📊 {t.calculate}
      </button>

      {result && (
        <div className="bmi-result">
          <div className="bmi-metrics">
            <div className="metric">
              <span className="metric-label">BMI</span>
              <span className="metric-value">{result.bmi.toFixed(1)}</span>
            </div>
            <div className="metric">
              <span className="metric-label">💧 {t.waterDay}</span>
              <span className="metric-value">{result.water.toFixed(1)} L</span>
            </div>
          </div>
          {cat && <div className={`badge badge-${cat.tone}`}>{cat.label}</div>}
          <p className="hint-text">💡 {t.dietTip}</p>
        </div>
      )}
    </div>
  )
}
