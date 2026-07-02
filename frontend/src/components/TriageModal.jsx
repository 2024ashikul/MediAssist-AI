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
    <div className="fixed inset-0 bg-ink/60 backdrop-blur-[2px] flex items-center justify-center z-50 p-6 animate-fade-in">
      <div className="bg-white rounded-xl2 p-7 max-w-3xl w-full max-h-[88vh] overflow-y-auto shadow-pop animate-modal-pop">
        <div className="flex items-start gap-3.5 mb-5">
          <div className="w-11 h-11 rounded-full bg-gradient-to-br from-brand-200 to-brand-50 flex items-center justify-center text-xl shrink-0">
            🩺
          </div>
          <div>
            <h2 className="font-display text-xl text-brand-900 mb-0.5">{t.triageTitle}</h2>
            <p className="text-sm text-slate-500 m-0">{t.triageCaption}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {questions.map((q, i) => {
            const answered = !!answers[q.id]
            return (
              <div
                key={q.id}
                className={`border rounded-md p-4 bg-brand-50/40 transition-all ${
                  answered ? 'border-brand-500 ring-2 ring-brand-500/10 bg-white' : 'border-brand-100'
                }`}
              >
                <p className="text-xs font-bold uppercase tracking-wide text-brand-500 mb-1">
                  {language === 'bn' ? `প্রশ্ন ${i + 1}` : `Question ${i + 1}`}
                </p>
                <p className="font-semibold text-[0.94rem] text-ink mb-2.5">{q.question}</p>
                <div className="flex flex-col gap-1">
                  {q.options.map((opt) => (
                    <label
                      key={opt}
                      className="flex items-center gap-2 text-sm px-2 py-1.5 rounded-lg cursor-pointer hover:bg-brand-100/70 transition-colors"
                    >
                      <input
                        type="radio"
                        name={`q-${q.id}`}
                        checked={answers[q.id] === opt}
                        onChange={() => selectOption(q.id, opt)}
                        className="accent-brand-700 w-3.5 h-3.5"
                      />
                      <span>{opt}</span>
                    </label>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        <div className="flex items-center gap-3 mt-5 text-sm text-slate-500 font-medium">
          <div className="flex-1 h-1.5 bg-brand-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-brand-400 to-brand-600 rounded-full transition-all duration-300"
              style={{ width: `${total ? (answeredCount / total) * 100 : 0}%` }}
            />
          </div>
          <span>
            ✅ {answeredCount} / {total} {t.answered}
          </span>
        </div>

        <div className="flex gap-2.5 mt-4">
          <button
            className="px-5 py-2.5 rounded-lg text-sm font-semibold bg-brand-50 text-brand-900 border border-brand-100 hover:bg-brand-100 transition-colors"
            onClick={onSkip}
          >
            {t.skip}
          </button>
          <button
            className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-brand-500 to-brand-700 shadow-md shadow-brand-700/25 disabled:opacity-40 disabled:pointer-events-none transition-transform hover:-translate-y-0.5"
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
