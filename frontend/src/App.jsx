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
  
  // Track open state for mobile slide-out drawer layout
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

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
  }, [language, t.connectionError])

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
  const FeatureIcon = meta?.icon

  return (
    <Box 
      sx={{ 
        display: 'flex', 
        flexDirection: { xs: 'column', lg: 'row' }, 
        height: '100vh', 
        width: '100vw',
        overflow: 'hidden', 
        bgcolor: '#f8fafc', // Light slate modern background tint
        color: 'text.primary',
        fontFamily: 'Inter, sans-serif'
      }}
    >
      {/* ========================================== */}
      {/* GLOBAL MOBILE TOP BAR (HIDDEN ON DESKTOP)  */}
      {/* ========================================== */}
      <div className="lg:hidden w-full bg-gradient-to-r from-brand-950 to-brand-900 text-white px-5 py-4 flex items-center justify-between sticky top-0 z-40 shadow-md shrink-0">
        <div className="flex items-center gap-2.5">
          <span className="text-xl leading-none">👩🏻‍⚕️</span>
          <h1 className="font-display font-bold text-base tracking-tight text-white">{t.appName}</h1>
        </div>
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-2 rounded-xl bg-white/10 hover:bg-white/20 active:scale-95 focus:outline-none transition-all duration-150"
          aria-label="Menu"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* Main Structural Shared Sidebar Module */}
      <Sidebar
        language={language}
        setLanguage={setLanguage}
        activeView={activeView}
        setActiveView={setActiveView}
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
      />

      {/* ========================================== */}
      {/* APPLICATION CORE INTERFACE VIEW CONTENT    */}
      {/* ========================================== */}
      <Box 
        component="main" 
        sx={{ 
          flexGrow: 1, 
          display: 'flex', 
          flexDirection: 'column', 
          minWidth: 0,
          height: '100%',
          overflow: 'hidden',
          bgcolor: '#ffffff',
          boxShadow: { lg: '-4px 0 24px -12px rgba(0,0,0,0.08)' } // Elegant separation line for desktop
        }}
      >
        {activeView === 'chat' ? (
          <>
            {/* Main Chat Interface Header (Only shows brand title on Desktop layout) */}
            <Box sx={{ px: { xs: 3, md: 4 }, pt: 3, pb: 2, borderBottom: 1, borderColor: '#e2e8f0' }}>
              <Typography 
                variant="h5" 
                sx={{ 
                  fontWeight: 700, 
                  tracking: '-0.025em', 
                  color: '#0f172a',
                  display: { xs: 'none', lg: 'block' } // Hidden on mobile because it's already in the top bar
                }}
              >
                👩🏻‍⚕️ {t.appName}
              </Typography>
              <Typography 
                variant="body2" 
                sx={{ 
                  mt: { xs: 0, lg: 0.5 }, 
                  color: '#64748b', 
                  fontWeight: 500,
                  fontSize: { xs: '0.875rem', lg: '0.875rem' }
                }}
              >
                ✨ {t.askAnything}
              </Typography>
            </Box>

            {backendWarning && (
              <Box sx={{ mx: { xs: 3, md: 4 }, mt: 2 }}>
                <Alert severity="warning" variant="outlined" sx={{ borderRadius: '12px', fontWeight: 500 }}>
                  {backendWarning}
                </Alert>
              </Box>
            )}

            {/* Chat Interface Sub-Modules */}
            <ChatWindow messages={messages} pending={pending} language={language} />
            <ChatInput language={language} onSend={handleSend} disabled={pending || !!triage} />
          </>
        ) : (
          /* Ancillary Sub-Feature Render Container Layouts */
          <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <Box 
              sx={{ 
                px: { xs: 3, md: 4 }, 
                pt: 2.5, 
                pb: 2.5, 
                borderBottom: 1, 
                borderColor: '#e2e8f0', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between'
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar 
                  sx={{ 
                    width: 40, 
                    height: 40, 
                    background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
                    color: '#2563eb'
                  }}
                >
                  {FeatureIcon && <FeatureIcon size={20} strokeWidth={2.5} />}
                </Avatar>
                <Box>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#0f172a', tracking: '-0.02em', lineHeight: 1.2 }}>
                    {t[meta?.titleKey]}
                  </Typography>
                </Box>
              </Box>

              {/* Dynamic Back to Chat Action Link */}
              <Button
                variant="contained"
                size="small"
                startIcon={<ArrowLeft size={15} />}
                onClick={() => setActiveView('chat')}
                sx={{ 
                  borderRadius: '10px',
                  textTransform: 'none', 
                  fontWeight: 600,
                  boxShadow: 'none',
                  bgcolor: '#f1f5f9',
                  color: '#334155',
                  '&:hover': { bgcolor: '#e2e8f0', boxShadow: 'none' }
                }}
              >
                {t.navChat}
              </Button>
            </Box>

            {/* Dynamic Core Sub-Module UI Injections */}
            <Box sx={{ flexGrow: 1, overflowY: 'auto', py: 4, px: { xs: 2, sm: 3 } }}>
              <Container maxWidth="md" disableGutters>
                {renderFeature()}
              </Container>
            </Box>
          </Box>
        )}
      </Box>

      {/* Shared Modals Layer */}
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