import React, { useState } from 'react'
import { uiStrings } from '../data/staticData.js'

const TONE_CLASSES = {
  ok: 'bg-success-50 text-success-500',
  warn: 'bg-warn-50 text-warn-500',
  danger: 'bg-coral-50 text-coral-600',
}

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
    <div className="grid md:grid-cols-2 gap-6">
      <div className="bg-white border border-brand-100 rounded-2xl p-6 shadow-soft">
        <h3 className="font-display text-lg text-brand-900 mb-4">{t.bmi}</h3>

        <label className="text-xs font-semibold text-slate-500">{t.weight}</label>
        <input
          type="number"
          min="10"
          max="200"
          step="0.5"
          value={weight}
          onChange={(e) => setWeight(parseFloat(e.target.value) || 0)}
          className="w-full mt-1.5 mb-4 border border-brand-100 rounded-lg px-3 py-2.5 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-200 transition"
        />

        <label className="text-xs font-semibold text-slate-500">{t.height}</label>
        <input
          type="number"
          min="50"
          max="250"
          step="1"
          value={height}
          onChange={(e) => setHeight(parseFloat(e.target.value) || 0)}
          className="w-full mt-1.5 mb-5 border border-brand-100 rounded-lg px-3 py-2.5 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-200 transition"
        />

        <button
          onClick={calculate}
          className="w-full bg-gradient-to-r from-brand-500 to-brand-700 text-white font-semibold rounded-xl py-3 shadow-md shadow-brand-700/25 transition-transform hover:-translate-y-0.5"
        >
          📊 {t.calculate}
        </button>
      </div>

      <div className="bg-white border border-brand-100 rounded-2xl p-6 shadow-soft flex flex-col justify-center">
        {result ? (
          <>
            <div className="flex gap-3 mb-4">
              <div className="flex-1 bg-brand-50 rounded-xl p-4">
                <p className="text-xs text-slate-500 mb-1">BMI</p>
                <p className="font-mono text-2xl text-brand-900">{result.bmi.toFixed(1)}</p>
              </div>
              <div className="flex-1 bg-brand-50 rounded-xl p-4">
                <p className="text-xs text-slate-500 mb-1">💧 {t.waterDay}</p>
                <p className="font-mono text-2xl text-brand-900">{result.water.toFixed(1)} L</p>
              </div>
            </div>
            {cat && (
              <span className={`inline-block w-fit px-3 py-1 rounded-full text-xs font-bold mb-3 ${TONE_CLASSES[cat.tone]}`}>
                {cat.label}
              </span>
            )}
            <p className="text-sm text-slate-500">💡 {t.dietTip}</p>
          </>
        ) : (
          <div className="text-center text-slate-400 py-6">
            <span className="text-3xl block mb-2">📊</span>
            <p className="text-sm">{language === 'bn' ? 'হিসাব করতে বাটনে চাপুন' : 'Press calculate to see your results'}</p>
          </div>
        )}
      </div>
    </div>
  )
}
