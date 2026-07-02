import React from 'react'
import ReactMarkdown from 'react-markdown'

export default function MessageBubble({ role, content }) {
  const isUser = role === 'user'
  return (
    <div
      className={`flex gap-2.5 max-w-[78%] animate-msg-in ${
        isUser ? 'self-end flex-row-reverse' : 'self-start'
      }`}
    >
      <div
        className={`w-9 h-9 rounded-full flex items-center justify-center text-base shrink-0 shadow-soft ${
          isUser ? 'bg-brand-200' : 'bg-gradient-to-br from-brand-100 to-white border border-brand-100'
        }`}
      >
        {isUser ? '🧑' : '👩🏻‍⚕️'}
      </div>
      <div
        className={`px-4 py-3 rounded-2xl text-[0.94rem] leading-relaxed shadow-soft [&_p]:m-0 [&_p]:mb-2 [&_p:last-child]:mb-0 ${
          isUser
            ? 'bg-gradient-to-br from-brand-900 to-brand-800 text-white rounded-br-sm [&_strong]:text-brand-100'
            : 'bg-white border border-brand-100 rounded-bl-sm [&_strong]:text-brand-900'
        }`}
      >
        <ReactMarkdown>{content}</ReactMarkdown>
      </div>
    </div>
  )
}
