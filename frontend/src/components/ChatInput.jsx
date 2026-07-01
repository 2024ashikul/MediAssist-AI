import React, { useRef, useState } from 'react'
import { transcribeVoice } from '../api.js'
import { uiStrings } from '../data/staticData.js'

export default function ChatInput({ language, onSend, disabled }) {
  const t = uiStrings[language]
  const [text, setText] = useState('')
  const [recording, setRecording] = useState(false)
  const [transcribing, setTranscribing] = useState(false)
  const [voiceError, setVoiceError] = useState(null)

  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])

  function submit() {
    const trimmed = text.trim()
    if (!trimmed || disabled) return
    onSend(trimmed)
    setText('')
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  async function toggleRecording() {
    setVoiceError(null)
    if (recording) {
      mediaRecorderRef.current?.stop()
      setRecording(false)
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      chunksRef.current = []
      recorder.ondataavailable = (e) => chunksRef.current.push(e.data)
      recorder.onstop = async () => {
        stream.getTracks().forEach((tr) => tr.stop())
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        setTranscribing(true)
        try {
          const res = await transcribeVoice(blob, language)
          setText((prev) => (prev ? `${prev} ${res.text}` : res.text))
        } catch (e) {
          setVoiceError(t.voiceError)
        } finally {
          setTranscribing(false)
        }
      }
      mediaRecorderRef.current = recorder
      recorder.start()
      setRecording(true)
    } catch (e) {
      setVoiceError(t.voiceError)
    }
  }

  return (
    <div className="chat-input-wrap">
      {voiceError && <div className="error-box small-error">{voiceError}</div>}
      {transcribing && <div className="loading-text small-loading">{t.processingVoice}</div>}
      <div className="chat-input-row">
        <button
          type="button"
          className={`mic-btn ${recording ? 'mic-active' : ''}`}
          onClick={toggleRecording}
          title={recording ? t.micStop : t.micStart}
        >
          {recording ? '⏹️' : '🎙️'}
        </button>
        <textarea
          rows={1}
          value={text}
          placeholder={t.chatPlaceholder}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
        />
        <button
          type="button"
          className="send-btn"
          onClick={submit}
          disabled={disabled || !text.trim()}
        >
          {t.send}
        </button>
      </div>
    </div>
  )
}
