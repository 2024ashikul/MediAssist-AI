import React, { useEffect, useState } from 'react'
import Sidebar from './components/Sidebar.jsx'
import ChatWindow from './components/ChatWindow.jsx'
import ChatInput from './components/ChatInput.jsx'
import TriageModal from './components/TriageModal.jsx'
import { sendChat, submitTriage, getHealth } from './api.js'
import { uiStrings } from './data/staticData.js'

export default function App() {
  const [language, setLanguage] = useState('bn')
  const [messages, setMessages] = useState([])
  const [chatHistory, setChatHistory] = useState([]) // [{role:'human'|'ai', content}]
  const [visionContext, setVisionContext] = useState(null)
  const [ocrContext, setOcrContext] = useState(null)
  const [triage, setTriage] = useState(null) // {questions, originalInput}
  const [pending, setPending] = useState(false)
  const [backendWarning, setBackendWarning] = useState(null)

  const t = uiStrings[language]

  useEffect(() => {
    getHealth()
      .then((h) => {
        if (!h.rag_ready) {
          setBackendWarning(
            language === 'bn'
              ? 'ব্যাকএন্ড চালু আছে কিন্তু RAG পাইপলাইন প্রস্তুত নয় — chroma_db এবং GROQ_API_KEY চেক করুন।'
              : 'Backend is up but the RAG pipeline is not ready — check chroma_db and GROQ_API_KEY on the server.'
          )
        }
      })
      .catch(() => setBackendWarning(t.connectionError))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function pushAssistantTurn(enrichedInput, answer) {
    setMessages((prev) => [...prev, { role: 'assistant', content: answer }])
    setChatHistory((prev) => [
      ...prev,
      { role: 'human', content: enrichedInput },
      { role: 'ai', content: answer },
    ])
  }

  async function handleSend(userText) {
    setMessages((prev) => [...prev, { role: 'user', content: userText }])
    setPending(true)
    try {
      const res = await sendChat({
        message: userText,
        chatHistory,
        language,
        ocrContext,
        visionContext,
      })
      if (res.type === 'triage') {
        setTriage({ questions: res.triage_questions, originalInput: res.original_input })
      } else {
        pushAssistantTurn(res.enriched_input, res.answer)
      }
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `❌ ${e.message || t.connectionError}` },
      ])
    } finally {
      setPending(false)
    }
  }

  async function handleTriageSubmit(answers) {
    const { questions, originalInput } = triage
    setTriage(null)
    setPending(true)
    try {
      const res = await submitTriage({
        originalInput,
        questions,
        answers,
        skipped: false,
        chatHistory,
        language,
        ocrContext,
        visionContext,
      })
      pushAssistantTurn(res.enriched_input, res.answer)
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `❌ ${e.message || t.connectionError}` },
      ])
    } finally {
      setPending(false)
    }
  }

  async function handleTriageSkip() {
    const { questions, originalInput } = triage
    setTriage(null)
    setPending(true)
    try {
      const res = await submitTriage({
        originalInput,
        questions,
        answers: {},
        skipped: true,
        chatHistory,
        language,
        ocrContext,
        visionContext,
      })
      pushAssistantTurn(res.enriched_input, res.answer)
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `❌ ${e.message || t.connectionError}` },
      ])
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="app-shell">
      <Sidebar
        language={language}
        setLanguage={setLanguage}
        visionContext={visionContext}
        setVisionContext={setVisionContext}
        ocrContext={ocrContext}
        setOcrContext={setOcrContext}
      />

      <main className="main-area">
        <header className="main-header">
          <h1>👩🏻‍⚕️ {t.appName}</h1>
          <p>{t.askAnything}</p>
        </header>

        {backendWarning && <div className="banner-warning">{backendWarning}</div>}

        <ChatWindow messages={messages} pending={pending} />
        <ChatInput language={language} onSend={handleSend} disabled={pending || !!triage} />
      </main>

      {triage && (
        <TriageModal
          language={language}
          questions={triage.questions}
          onSubmit={handleTriageSubmit}
          onSkip={handleTriageSkip}
        />
      )}
    </div>
  )
}
