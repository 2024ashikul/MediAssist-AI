import React from 'react'
import { BarChart4, Eye, FileText, Pill, Building2, AlertTriangle } from 'lucide-react'
import { uiStrings } from '../data/staticData.js'

const TOOLS = [
  { key: 'bmi', icon: BarChart4, labelKey: 'bmi', accent: 'text-brand-600 bg-brand-50 hover:bg-brand-100', mobile: false },
  { key: 'vision', icon: Eye, labelKey: 'visionChecker', accent: 'text-accent-500 bg-accent-50 hover:bg-brand-100', mobile: true },
  { key: 'ocr', icon: FileText, labelKey: 'ocr', accent: 'text-brand-600 bg-brand-50 hover:bg-brand-100', mobile: true },
  { key: 'medicine', icon: Pill, labelKey: 'medicineFinder', accent: 'text-success-500 bg-success-50 hover:bg-brand-100', mobile: true },
  { key: 'hospital', icon: Building2, labelKey: 'hospitalFinder', accent: 'text-warn-500 bg-warn-50 hover:bg-brand-100', mobile: false },
  { key: 'emergency', icon: AlertTriangle, labelKey: 'emergencyHelplines', accent: 'text-coral-600 bg-coral-50 hover:bg-coral-100', mobile: false },
]

export default function QuickToolsBar({ language, activeView, onSelect }) {
  const t = uiStrings[language]

  return (
    <div className="px-1 md:px-7 pt-2 pb-1 bg-white border-t border-brand-50/80">
      <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <span className="text-[0.65rem] font-bold uppercase tracking-wide text-slate-400 shrink-0 mr-0.5">
          {t.quickTools}
        </span>
        {TOOLS.map((tool) => {
          const Icon = tool.icon
          const active = activeView === tool.key
          return (
            <button
              key={tool.key}
              onClick={() => onSelect(tool.key)}
              className={`shrink-0 items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all whitespace-nowrap ${
                tool.mobile ? 'flex' : 'hidden sm:flex'
              } ${
                active
                  ? 'bg-brand-900 text-white border-brand-900 shadow-sm'
                  : `border-transparent ${tool.accent}`
              }`}
            >
              <Icon size={14} strokeWidth={2.5} />
              {t[tool.labelKey]}
            </button>
          )
        })}
      </div>
    </div>
  )
}