import React, { useEffect, useRef } from 'react'
import MessageBubble from './MessageBubble.jsx'
import { uiStrings } from '../data/staticData.js'

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
          <p className="text-sm leading-relaxed">{t.askAnything}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto flex flex-col gap-4 px-8 py-6">
      {messages.map((m, i) => (
        <MessageBubble key={i} role={m.role} content={m.content} />
      ))}
      {pending && (
        <div className="flex gap-2.5 max-w-[78%] self-start animate-msg-in">
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-base bg-gradient-to-br from-brand-100 to-white border border-brand-100 shrink-0 shadow-soft">
            👩🏻‍⚕️
          </div>
          <div className="flex items-center gap-1.5 px-4 py-3.5 rounded-2xl rounded-bl-sm bg-white border border-brand-100 shadow-soft">
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
