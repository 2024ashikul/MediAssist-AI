import React from 'react'
import { uiStrings } from '../data/staticData.js'

const NAV_ITEMS = [
  { key: 'chat', icon: '🏠', labelKey: 'navChat' },
  { key: 'bmi', icon: '📊', labelKey: 'bmi' },
  { key: 'vision', icon: '👁️', labelKey: 'visionChecker' },
  { key: 'ocr', icon: '📄', labelKey: 'ocr' },
  { key: 'medicine', icon: '💊', labelKey: 'medicineFinder' },
  { key: 'hospital', icon: '🏥', labelKey: 'hospitalFinder' },
  { key: 'emergency', icon: '🚨', labelKey: 'emergencyHelplines' },
]

export default function Sidebar({ language, setLanguage, activeView, setActiveView }) {
  const t = uiStrings[language]

  return (
    <aside className="w-72 min-w-[280px] h-full flex flex-col bg-gradient-to-b from-brand-950 via-brand-900 to-brand-800 text-brand-100 overflow-y-auto">
      <div className="px-5 pt-7 pb-4">
        <div className="flex items-center gap-2">
          <span className="text-2xl leading-none">👩🏻‍⚕️</span>
          <h1 className="font-display text-xl font-semibold text-white tracking-tight">{t.appName}</h1>
        </div>
        <p className="text-xs text-brand-200 mt-1">{t.tagline}</p>
      </div>

      <div className="px-5 pb-3">
        <div className="flex bg-white/10 rounded-lg p-1 gap-1">
          <button
            onClick={() => setLanguage('bn')}
            className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-colors ${
              language === 'bn' ? 'bg-white text-brand-900 shadow-soft' : 'text-brand-200 hover:text-white'
            }`}
          >
            বাংলা
          </button>
          <button
            onClick={() => setLanguage('en')}
            className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-colors ${
              language === 'en' ? 'bg-white text-brand-900 shadow-soft' : 'text-brand-200 hover:text-white'
            }`}
          >
            English
          </button>
        </div>
      </div>

      <nav className="flex-1 px-3 py-1 space-y-1">
        {NAV_ITEMS.map((item) => {
          const active = activeView === item.key
          return (
            <button
              key={item.key}
              onClick={() => setActiveView(item.key)}
              className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-medium transition-all duration-150 ${
                active
                  ? 'bg-white text-brand-900 shadow-card'
                  : 'text-brand-100/90 hover:bg-white/10'
              }`}
            >
              <span className="text-lg leading-none">{item.icon}</span>
              <span className="flex-1 text-left truncate">{t[item.labelKey]}</span>
              {item.key !== 'chat' && (
                <span
                  className={`text-sm font-bold leading-none ${
                    active ? 'text-brand-500' : 'text-brand-300/70'
                  }`}
                >
                  {active ? '−' : '+'}
                </span>
              )}
            </button>
          )
        })}
      </nav>

      <div className="p-4">
        <div className="bg-gradient-to-r from-coral-500 to-coral-600 text-white text-center text-sm font-semibold rounded-xl py-3 shadow-lg shadow-coral-500/30">
          🆘 {t.emergencyDialShort}
        </div>
      </div>
    </aside>
  )
}
