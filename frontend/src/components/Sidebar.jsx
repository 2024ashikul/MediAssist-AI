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

export default function Sidebar({ language, setLanguage, activeView, setActiveView, isOpen, setIsOpen }) {
  const t = uiStrings[language]

  const handleNavigation = (key) => {
    setActiveView(key)
    setIsOpen(false) // Smoothly drop the sidebar backdrop drawer state container on navigation context changes
  }

  return (
    <>
      {/* BACKGROUND OVERLAY (Mobile-Only backdrop click target catcher) */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 z-40 lg:hidden backdrop-blur-sm transition-opacity duration-300"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* CORE SIDEBAR VIEW HOUSING */}
      <aside
        className={`
          /* Structural Layout Core rules */
          w-72 min-w-[280px] h-full flex flex-col bg-gradient-to-b from-brand-950 via-brand-900 to-brand-800 text-brand-100 overflow-y-auto
          
          /* Fixed layout configuration layers for mobile screen interactions */
          fixed inset-y-0 left-0 z-50 transform -translate-x-full transition-transform duration-300 ease-in-out
          
          /* Reset properties cleanly back into desktop row orientation workflows */
          lg:relative lg:translate-x-0
          
          /* Active trigger assignments generated conditionally via reactive layout properties */
          ${isOpen ? 'translate-x-0 shadow-2xl' : ''}
        `}
      >
        {/* Brand Container Header Module (Shows app title only on desktop) */}
        <div className="px-5 pt-7 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="text-2xl leading-none">👩🏻‍⚕️</span>
              <h1 className="font-display text-xl font-bold text-white tracking-tight">{t.appName}</h1>
            </div>
            
            {/* Close toggle context element (Only visible inside open drawers on mobile layout trees) */}
            <button 
              onClick={() => setIsOpen(false)} 
              className="lg:hidden text-brand-300 hover:text-white p-1.5 rounded-xl hover:bg-white/10 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-xs text-brand-200 mt-1.5 font-medium">{t.tagline}</p>
        </div>

        {/* Local Translation Language Layout Switchers */}
        <div className="px-5 pb-4">
          <div className="flex bg-brand-950/40 border border-white/5 rounded-xl p-1 gap-1">
            <button
              onClick={() => setLanguage('bn')}
              className={`flex-1 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                language === 'bn' 
                  ? 'bg-white text-brand-950 shadow-sm' 
                  : 'text-brand-200 hover:text-white hover:bg-white/5'
              }`}
            >
              বাংলা
            </button>
            <button
              onClick={() => setLanguage('en')}
              className={`flex-1 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                language === 'en' 
                  ? 'bg-white text-brand-950 shadow-sm' 
                  : 'text-brand-200 hover:text-white hover:bg-white/5'
              }`}
            >
              English
            </button>
          </div>
        </div>

        {/* Functional Main Context View Triggers stack */}
        <nav className="flex-1 px-3 py-1 space-y-1.5">
          {NAV_ITEMS.map((item) => {
            const active = activeView === item.key
            return (
              <button
                key={item.key}
                onClick={() => handleNavigation(item.key)}
                className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-150 ${
                  active
                    ? 'bg-white text-brand-950 shadow-md shadow-brand-950/20'
                    : 'text-brand-100/80 hover:bg-white/10 hover:text-white'
                }`}
              >
                <span className="text-lg leading-none shrink-0">{item.icon}</span>
                <span className="flex-1 text-left truncate">{t[item.labelKey]}</span>
                {item.key !== 'chat' && (
                  <span
                    className={`text-xs font-bold transition-colors ${
                      active ? 'text-brand-600' : 'text-brand-300/40'
                    }`}
                  >
                    {active ? '●' : '○'}
                  </span>
                )}
              </button>
            )
          })}
        </nav>

        {/* Global Action Banner Element Context Container */}
        <div className="p-4">
          <div className="bg-gradient-to-r from-coral-500 to-coral-600 text-white text-center text-sm font-bold rounded-xl py-3.5 shadow-lg shadow-coral-500/20 active:scale-[0.99] transition-transform cursor-default">
            🆘 {t.emergencyDialShort}
          </div>
        </div>
      </aside>
    </>
  )
}