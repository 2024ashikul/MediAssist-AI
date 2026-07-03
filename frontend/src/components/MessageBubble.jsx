import React from 'react'
import ReactMarkdown from 'react-markdown'
import { User, Stethoscope } from 'lucide-react'

export default function MessageBubble({ role, content }) {
  const isUser = role === 'user'
  return (
    <div
      className={`flex gap-2 sm:gap-2.5 w-full sm:w-auto sm:max-w-[78%] animate-msg-in ${
        isUser ? 'flex-row-reverse self-end' : 'self-start'
      }`}
    >
      <div
        className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center shrink-0 shadow-soft ${
          isUser ? 'bg-brand-200' : 'bg-gradient-to-br from-brand-100 to-white border border-brand-100'
        }`}
      >
        {isUser ? (
          <User size={16} className="text-brand-900" />
        ) : (
          <Stethoscope size={16} className="text-brand-500" />
        )}
      </div>
      <div
        className={`min-w-0 flex-1 sm:flex-initial px-4 py-3 rounded-2xl text-[0.82rem] sm:text-[0.94rem] leading-relaxed shadow-soft [&_p]:m-0 [&_p]:mb-2 [&_p:last-child]:mb-0 ${
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