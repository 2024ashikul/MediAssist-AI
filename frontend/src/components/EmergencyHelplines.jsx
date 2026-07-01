import React from 'react'
import { emergencyHelplines, uiStrings } from '../data/staticData.js'

export default function EmergencyHelplines({ language }) {
  const t = uiStrings[language]
  return (
    <div className="helplines">
      {emergencyHelplines.map((h) => (
        <div className="helpline-row" key={h.number}>
          <span className="helpline-number">{h.number}</span>
          <span className="helpline-label">{language === 'bn' ? h.bn : h.en}</span>
        </div>
      ))}
      <p className="hint-text danger-text">⚠️ {t.emergencyDial}</p>
    </div>
  )
}
