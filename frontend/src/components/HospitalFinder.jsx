import React, { useState } from 'react'
import { bangladeshDistricts, specialistTypes, uiStrings } from '../data/staticData.js'

export default function HospitalFinder({ language }) {
  const t = uiStrings[language]
  const [district, setDistrict] = useState(bangladeshDistricts[0])
  const [specialist, setSpecialist] = useState(specialistTypes[0])
  const [result, setResult] = useState(null)

  function search() {
    const specEn = specialist.split('(').pop().replace(')', '').trim()
    const mapsUrl = `https://www.google.com/maps/search/${specEn}+hospital+near+${district}+Bangladesh`.replace(
      / /g,
      '+'
    )
    setResult({ district, specialist, mapsUrl })
  }

  return (
    <div className="hospital-finder">
      <label className="field-label">{t.selectDistrict}</label>
      <select value={district} onChange={(e) => setDistrict(e.target.value)}>
        {bangladeshDistricts.map((d) => (
          <option key={d} value={d}>
            {d}
          </option>
        ))}
      </select>

      <label className="field-label">{t.typeOfHelp}</label>
      <select value={specialist} onChange={(e) => setSpecialist(e.target.value)}>
        {specialistTypes.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>

      <button className="btn-primary" onClick={search}>
        🔍 {t.search}
      </button>

      {result && (
        <div className="hospital-result">
          <p className="confirmed-tag">
            <strong>{result.district}</strong> — {result.specialist}
          </p>
          <a href={result.mapsUrl} target="_blank" rel="noreferrer">
            🗺️ {t.viewOnMaps}
          </a>
          <p className="hint-text">💡 {t.reviewTip}</p>
        </div>
      )}
    </div>
  )
}
