import React, { useState } from 'react'
import { bangladeshDistricts, specialistTypes, uiStrings } from '../data/staticData.js'

export default function HospitalFinder({ language }) {
  const t = uiStrings[language]
  const [district, setDistrict] = useState(bangladeshDistricts[0])
  const [specialist, setSpecialist] = useState(specialistTypes[0])
  const [result, setResult] = useState(null)

  function search() {
    const specEn = specialist.split('(').pop().replace(')', '').trim()
    const mapsUrl = `https://www.google.com/maps/search/${specEn}+hospital+near+${district}+Bangladesh`.replace(/ /g, '+')
    setResult({ district, specialist, mapsUrl })
  }

  return (
    <div className="grid md:grid-cols-2 gap-6 max-w-3xl">
      <div className="bg-white border border-brand-100 rounded-2xl p-6 shadow-soft">
        <h3 className="font-display text-lg text-brand-900 mb-4">🏥 {t.hospitalFinder}</h3>

        <label className="text-xs font-semibold text-slate-500">{t.selectDistrict}</label>
        <select
          value={district}
          onChange={(e) => setDistrict(e.target.value)}
          className="w-full mt-1.5 mb-4 border border-brand-100 rounded-lg px-3 py-2.5 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-200 transition bg-white"
        >
          {bangladeshDistricts.map((d) => <option key={d} value={d}>{d}</option>)}
        </select>

        <label className="text-xs font-semibold text-slate-500">{t.typeOfHelp}</label>
        <select
          value={specialist}
          onChange={(e) => setSpecialist(e.target.value)}
          className="w-full mt-1.5 mb-5 border border-brand-100 rounded-lg px-3 py-2.5 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-200 transition bg-white"
        >
          {specialistTypes.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>

        <button
          onClick={search}
          className="w-full bg-gradient-to-r from-brand-500 to-brand-700 text-white font-semibold rounded-xl py-3 shadow-md shadow-brand-700/25 hover:-translate-y-0.5 transition-transform"
        >
          🔍 {t.search}
        </button>
      </div>

      <div className="bg-white border border-brand-100 rounded-2xl p-6 shadow-soft flex flex-col justify-center">
        {result ? (
          <>
            <p className="font-semibold text-brand-900 mb-1">{result.district}</p>
            <p className="text-sm text-slate-500 mb-4">{result.specialist}</p>
            <a
              href={result.mapsUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-success-500 font-semibold text-sm mb-3 hover:underline"
            >
              🗺️ {t.viewOnMaps}
            </a>
            <p className="text-sm text-slate-400">💡 {t.reviewTip}</p>
          </>
        ) : (
          <div className="text-center text-slate-400 py-6">
            <span className="text-3xl block mb-2">🏥</span>
            <p className="text-sm">{language === 'bn' ? 'খুঁজতে বাটনে চাপুন' : 'Press search to see results'}</p>
          </div>
        )}
      </div>
    </div>
  )
}
