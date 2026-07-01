import React, { useState } from 'react'
import { uiStrings } from '../data/staticData.js'

export default function TriageModal({ language, questions, onSubmit, onSkip }) {
  const t = uiStrings[language]
  const [answers, setAnswers] = useState({})

  const answeredCount = Object.keys(answers).length
  const total = questions.length

  function selectOption(qid, option) {
    setAnswers((prev) => ({ ...prev, [qid]: option }))
  }

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <div className="modal-header">
          <h2>{t.triageTitle}</h2>
          <p className="modal-caption">{t.triageCaption}</p>
        </div>

        <div className="triage-grid">
          {questions.map((q, i) => (
            <div className="triage-question-card" key={q.id}>
              <p className="triage-q-label">
                {language === 'bn' ? `প্রশ্ন ${i + 1}` : `Question ${i + 1}`}
              </p>
              <p className="triage-q-text">{q.question}</p>
              <div className="triage-options">
                {q.options.map((opt) => (
                  <label className="triage-option" key={opt}>
                    <input
                      type="radio"
                      name={`q-${q.id}`}
                      checked={answers[q.id] === opt}
                      onChange={() => selectOption(q.id, opt)}
                    />
                    <span>{opt}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="triage-progress">
          <div className="progress-track">
            <div
              className="progress-fill"
              style={{ width: `${total ? (answeredCount / total) * 100 : 0}%` }}
            />
          </div>
          <span>
            ✅ {answeredCount} / {total} {t.answered}
          </span>
        </div>

        <div className="triage-actions">
          <button className="btn-secondary" onClick={onSkip}>
            {t.skip}
          </button>
          <button
            className="btn-primary"
            disabled={answeredCount < total}
            onClick={() => onSubmit(answers)}
          >
            {t.submit}
          </button>
        </div>
      </div>
    </div>
  )
}
