import React from 'react'
import Panel from './Panel.jsx'
import BmiCalculator from './BmiCalculator.jsx'
import VisionChecker from './VisionChecker.jsx'
import OcrChecker from './OcrChecker.jsx'
import HospitalFinder from './HospitalFinder.jsx'
import EmergencyHelplines from './EmergencyHelplines.jsx'
import { uiStrings } from '../data/staticData.js'

export default function Sidebar({
  language,
  setLanguage,
  visionContext,
  setVisionContext,
  ocrContext,
  setOcrContext,
}) {
  const t = uiStrings[language]

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="pulse-mark" aria-hidden="true">
          <svg viewBox="0 0 120 24" className="pulse-svg">
            <polyline
              points="0,12 20,12 28,3 36,21 44,12 58,12 64,6 70,18 76,12 120,12"
              fill="none"
            />
          </svg>
        </div>
        <h1>{t.appName}</h1>
        <p className="tagline">{t.tagline}</p>
      </div>

      <Panel title={`⚙️ ${t.settings}`} defaultOpen>
        <label className="field-label">{t.language}</label>
        <div className="lang-toggle">
          <button
            className={language === 'bn' ? 'active' : ''}
            onClick={() => setLanguage('bn')}
          >
            বাংলা
          </button>
          <button
            className={language === 'en' ? 'active' : ''}
            onClick={() => setLanguage('en')}
          >
            English
          </button>
        </div>
      </Panel>

      <Panel title={`📊 ${t.bmi}`}>
        <BmiCalculator language={language} />
      </Panel>

      <Panel title={`👁️ ${t.visionChecker}`}>
        <VisionChecker language={language} onConfirm={setVisionContext} confirmed={visionContext} />
      </Panel>

      <Panel title={`📄 ${t.ocr}`}>
        <OcrChecker language={language} onConfirm={setOcrContext} confirmed={ocrContext} />
      </Panel>

      <Panel title={`🏥 ${t.hospitalFinder}`}>
        <HospitalFinder language={language} />
      </Panel>

      <Panel title={`🚨 ${t.emergencyHelplines}`}>
        <EmergencyHelplines language={language} />
      </Panel>

      <div className="sidebar-footer">🆘 {t.emergencyDialShort}</div>
    </aside>
  )
}
