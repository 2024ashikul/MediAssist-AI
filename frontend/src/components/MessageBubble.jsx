import React from 'react'
import ReactMarkdown from 'react-markdown'

export default function MessageBubble({ role, content }) {
  const isUser = role === 'user'
  return (
    <div className={`msg-row ${isUser ? 'msg-row-user' : 'msg-row-assistant'}`}>
      <div className={`msg-avatar ${isUser ? 'avatar-user' : 'avatar-assistant'}`}>
        {isUser ? '🧑' : '👩🏻‍⚕️'}
      </div>
      <div className={`msg-bubble ${isUser ? 'bubble-user' : 'bubble-assistant'}`}>
        <ReactMarkdown>{content}</ReactMarkdown>
      </div>
    </div>
  )
}
