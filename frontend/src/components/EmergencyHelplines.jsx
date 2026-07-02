import React from 'react'
import { emergencyHelplines, uiStrings } from '../data/staticData.js'

export default function EmergencyHelplines({ language }) {
  const t = uiStrings[language]
  return (
    <div className="max-w-3xl">
      <div className="grid sm:grid-cols-2 gap-3 mb-5">
        {emergencyHelplines.map((h) => (
          <div
            key={h.number}
            className="flex items-center gap-3 bg-white border border-brand-100 rounded-xl px-4 py-3.5 shadow-soft hover:shadow-card transition-shadow"
          >
            <span className="font-mono font-bold text-coral-500 text-lg shrink-0 min-w-[6.5rem]">{h.number}</span>
            <span className="text-sm text-ink">{language === 'bn' ? h.bn : h.en}</span>
          </div>
        ))}
      </div>
      <div className="flex gap-2.5 bg-coral-50 border border-coral-500/30 text-coral-600 rounded-xl px-4 py-3.5 text-sm font-semibold">
        ⚠️ <span>{t.emergencyDial}</span>
      </div>
    </div>
  )
}
