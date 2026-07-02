import React, { useEffect, useState } from 'react'
import {
  Box,
  Typography,
  Alert,
  Avatar,
  Button,
  Divider,
  Container
} from '@mui/material'

// Import Lucide Icons
import { 
  ArrowLeft, 
  BarChart4, 
  Eye, 
  FileText, 
  Pill, 
  Building2, 
  AlertTriangle 
} from 'lucide-react'

// Existing custom components
import Sidebar from './components/Sidebar.jsx'
import ChatWindow from './components/ChatWindow.jsx'
import ChatInput from './components/ChatInput.jsx'
import TriageModal from './components/TriageModal.jsx'
import BmiCalculator from './components/BmiCalculator.jsx'
import VisionChecker from './components/VisionChecker.jsx'
import OcrChecker from './components/OcrChecker.jsx'
import MedicineFinder from './components/MedicineFinder.jsx'
import HospitalFinder from './components/HospitalFinder.jsx'
import EmergencyHelplines from './components/EmergencyHelplines.jsx'

// API and static data assets
import { sendChat, submitTriage, getHealth } from './api.js'
import { uiStrings } from './data/staticData.js'

// Feature configuration mapping to Lucide React component tokens
const FEATURE_META = {
  bmi: { icon: BarChart4, titleKey: 'bmi' },
  vision: { icon: Eye, titleKey: 'visionChecker' },
  ocr: { icon: FileText, titleKey: 'ocr' },
  medicine: { icon: Pill, titleKey: 'medicineFinder' },
  hospital: { icon: Building2, titleKey: 'hospitalFinder' },
  emergency: { icon: AlertTriangle, titleKey: 'emergencyHelplines' },
}

export default function App() {
  const [language, setLanguage] = useState('bn')
  const [activeView, setActiveView] = useState('chat')
  const [messages, setMessages] = useState([])
  const [chatHistory, setChatHistory] = useState([]) 
  const [visionContext, setVisionContext] = useState(null)
  const [ocrContext, setOcrContext] = useState(null)
  const [triage, setTriage] = useState(null) 
  const [pending, setPending] = useState(false)
  const [backendWarning, setBackendWarning] = useState(null)

  const t = uiStrings[language]

  // RAG Pipeline verification lifecycle
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

  // Feature view dispatcher
  function renderFeature() {
    switch (activeView) {
      case 'bmi':
        return <BmiCalculator language={language} />
      case 'vision':
        return (
          <VisionChecker
            language={language}
            onConfirm={setVisionContext}
            confirmed={visionContext}
          />
        )
      case 'ocr':
        return <OcrChecker language={language} onConfirm={setOcrContext} confirmed={ocrContext} />
      case 'medicine':
        return <MedicineFinder language={language} />
      case 'hospital':
        return <HospitalFinder language={language} />
      case 'emergency':
        return <EmergencyHelplines language={language} />
      default:
        return null
    }
  }

  const meta = FEATURE_META[activeView]
  // Extracting the designated Component dynamic reference mapping
  const FeatureIcon = meta?.icon

  return (
    <Box 
      sx={{ 
        display: 'flex', 
        height: '100vh', 
        overflow: 'hidden', 
        bgcolor: 'background.paper', 
        color: 'text.primary' 
      }}
    >
      <Sidebar
        language={language}
        setLanguage={setLanguage}
        activeView={activeView}
        setActiveView={setActiveView}
      />

      <Box component="main" sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {activeView === 'chat' ? (
          <>
            {/* Main Chat Interface Header */}
            <Box sx={{ px: 4, pt: 3, pb: 1.5, borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
              <Typography variant="h5" sx={{ fontWeight: 700, tracking: '-0.025em' }}>
                👩🏻‍⚕️ {t.appName}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                {t.askAnything}
              </Typography>
            </Box>

            {backendWarning && (
              <Box sx={{ mx: 4, mt: 1.5 }}>
                <Alert severity="warning" variant="standard">
                  {backendWarning}
                </Alert>
              </Box>
            )}

            <ChatWindow messages={messages} pending={pending} language={language} />
            <ChatInput language={language} onSend={handleSend} disabled={pending || !!triage} />
          </>
        ) : (
          /* Ancillary Feature Rendering Panels */
          <Box sx={{ flexGrow: 1, overflowY: 'auto' }}>
            <Box 
              sx={{ 
                px: 4, 
                pt: 3, 
                pb: 2, 
                borderBottom: 1, 
                borderColor: 'divider', 
                bgcolor: 'background.paper', 
                display: 'flex', 
                alignItems: 'center', 
                gap: 2 
              }}
            >
              <Avatar 
                sx={{ 
                  width: 44, 
                  height: 44, 
                  background: 'linear-gradient(135deg, #f1f5f9 0%, #cbd5e1 100%)',
                  color: 'slate.700'
                }}
              >
                {/* Dynamically instantiate the registered Lucide component */}
                {FeatureIcon && <FeatureIcon size={22} strokeWidth={2} />}
              </Avatar>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700, tracking: '-0.025em', lineHeight: 1.2 }}>
                  {t[meta?.titleKey]}
                </Typography>
                <Button
                  variant="text"
                  size="small"
                  startIcon={<ArrowLeft size={14} />}
                  onClick={() => setActiveView('chat')}
                  sx={{ 
                    p: 0, 
                    minWidth: 0, 
                    mt: 0.5, 
                    textTransform: 'none', 
                    fontSize: '0.75rem', 
                    fontWeight: 600,
                    color: 'primary.main',
                    '&:hover': { background: 'transparent', textDecoration: 'underline' } 
                  }}
                >
                  {t.navChat}
                </Button>
              </Box>
            </Box>

            <Divider />

            <Container maxWidth="md" sx={{ py: 4 }}>
              {renderFeature()}
            </Container>
          </Box>
        )}
      </Box>

      {triage && (
        <TriageModal
          language={language}
          questions={triage.questions}
          onSubmit={handleTriageSubmit}
          onSkip={handleTriageSkip}
        />
      )}
    </Box>
  )
}