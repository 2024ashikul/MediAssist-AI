import React, { useEffect, useRef, useState } from 'react'
import MessageBubble from './MessageBubble.jsx'
import { uiStrings } from '../data/staticData.js'
import { ChevronDown, ChevronUp } from 'lucide-react'

function ConfirmationBubble({ label, content }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="flex justify-start animate-msg-in">
      <div className="bg-success-50 border border-success-500/30 text-success-700 text-xs sm:text-sm rounded-md max-w-[85%] shadow-soft overflow-hidden">
        <button
          onClick={() => setOpen((o) => !o)}
          className="w-full flex items-center justify-between gap-3 px-4 py-2 text-left"
        >
          <span className="font-bold">{label}</span>
          {open ? <ChevronUp size={14} className="shrink-0" /> : <ChevronDown size={14} className="shrink-0" />}
        </button>
        {open && (
          <div className="px-4 pb-3 pt-0 border-t border-success-500/20">
            <span className="whitespace-break-spaces">{content}</span>
          </div>
        )}
      </div>
    </div>
  )
}

export default function ChatWindow({ messages, pending, language = 'en' }) {
  const bottomRef = useRef(null)
  const t = uiStrings[language]

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, pending])

  if (messages.length === 0 && !pending) {
    return (
      <div className="flex-1 overflow-y-auto flex flex-col px-8 py-6">
        <div className="m-auto text-center max-w-md text-slate-400">
          <span className="text-5xl mb-3 block">👩🏻‍⚕️</span>
          <h3 className="font-display text-xl text-brand-900 mb-1">{t.appName}</h3>
          <p className="text-sm leading-relaxed text-left whitespace-pre-line">{t.baseState}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto flex flex-col gap-4 px-3 py-3 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
      {messages.map((m, i) => {
        if (m.type === 'confirmation') {
          return <ConfirmationBubble key={i} label={m.label} content={m.content} />
        }
        return <MessageBubble key={i} role={m.role} content={m.content} />
      })}
      {pending && (
        <div className="flex flex-col sm:flex-row gap-1.5 sm:gap-2.5 w-full sm:max-w-[100%] self-start animate-msg-in">
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-base bg-gradient-to-br from-brand-100 to-white border border-brand-100 shrink-0 shadow-soft">
            👩🏻‍⚕️
          </div>
          <div className="flex items-center gap-1.5 px-4 py-3.5 rounded-2xl rounded-bl-sm bg-white border border-brand-100 shadow-soft w-fit">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-500 typing-dot" />
            <span className="w-1.5 h-1.5 rounded-full bg-brand-500 typing-dot [animation-delay:0.15s]" />
            <span className="w-1.5 h-1.5 rounded-full bg-brand-500 typing-dot [animation-delay:0.3s]" />
          </div>
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  )
}