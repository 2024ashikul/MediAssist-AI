import React, { useRef, useState, useEffect, useCallback } from 'react'
import {
  Box,
  TextField,
  IconButton,
  Button,
  Alert,
  Typography,
  CircularProgress,
  Tooltip,
  Fade
} from '@mui/material'
import { Mic, Square, SendHorizontal } from 'lucide-react'

import { transcribeVoice } from '../api.js'
import { uiStrings } from '../data/staticData.js'

// Maps your app's language codes to Web Speech API BCP-47 locale tags
const SPEECH_LANG_MAP = {
  bn: 'bn-BD',
  en: 'en-US',
}

// Detect genuine Chrome/Chromium (not Safari, which also ships webkitSpeechRecognition
// but with a much flakier implementation) — Edge/Opera/Brave are fine, they share Chrome's engine.
function isChromeSpeechCapable() {
  if (typeof window === 'undefined') return false
  const hasApi = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window
  if (!hasApi) return false
  const ua = navigator.userAgent
  const isChromium = /Chrome|Chromium|Edg|OPR|Brave/i.test(ua)
  const isSafari = /Safari/i.test(ua) && !/Chrome|Chromium|Edg|OPR/i.test(ua)
  return isChromium && !isSafari
}

export default function ChatInput({ language, onSend, disabled }) {
  const t = uiStrings[language]
  const [text, setText] = useState('')
  const [recording, setRecording] = useState(false)
  const [transcribing, setTranscribing] = useState(false)
  const [voiceError, setVoiceError] = useState(null)
  const [errorVisible, setErrorVisible] = useState(false)

  const mediaRecorderRef = useRef(null)
  const chunksRef = useRef([])
  const errorTimerRef = useRef(null)
  const recognitionRef = useRef(null)
  const baseTextRef = useRef('') // text already committed (before this recording session, plus any finalized utterances)
  const shouldKeepListeningRef = useRef(false) // true while the user wants live transcription running

  const useLiveTranscribe = isChromeSpeechCapable()

  function showVoiceError(message) {
    setVoiceError(message)
    setErrorVisible(true)
    clearTimeout(errorTimerRef.current)
    errorTimerRef.current = setTimeout(() => {
      setErrorVisible(false)
    }, 3500)
  }

  useEffect(() => {
    return () => {
      clearTimeout(errorTimerRef.current)
      shouldKeepListeningRef.current = false // otherwise onend would spin up a new session after unmount
      recognitionRef.current?.stop()
    }
  }, [])

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

  // ── Live transcription via Chrome's built-in engine ──────────────────
  //
  // NOTE: We deliberately do NOT use `continuous: true`. Chrome's continuous mode has a
  // well-known bug where its internal recognition service periodically restarts itself
  // mid-stream and re-transcribes audio it already finalized, but keeps firing onresult
  // on the same SpeechRecognition instance as if nothing happened. That's what causes
  // whole words/phrases to double up ("i have i have a fever fever").
  //
  // The reliable workaround is to run recognition in short, non-continuous sessions (each
  // session ends automatically after a brief pause), commit that session's final text
  // exactly once, and immediately start a fresh session in onend if the user still wants
  // to keep listening. This sidesteps the buggy internal restart path entirely.

  function buildRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    const recognition = new SpeechRecognition()
    recognition.lang = SPEECH_LANG_MAP[language] || 'en-US'
    recognition.continuous = false
    recognition.interimResults = true
    attachRecognitionHandlers(recognition)
    return recognition
  }

  function attachRecognitionHandlers(recognition) {
    recognition.onresult = (event) => {
      let finalChunk = ''
      let interimChunk = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          finalChunk += transcript
        } else {
          interimChunk += transcript
        }
      }
      if (finalChunk) {
        baseTextRef.current = `${baseTextRef.current}${finalChunk} `
      }
      setText(`${baseTextRef.current}${interimChunk}`)
    }

    recognition.onerror = (event) => {
      if (event.error === 'no-speech' || event.error === 'aborted') return // benign, don't alarm the user
      showVoiceError(t.voiceError)
      shouldKeepListeningRef.current = false
      setRecording(false)
    }

    recognition.onend = () => {
      if (!shouldKeepListeningRef.current) {
        setRecording(false)
        return
      }
      // The user is still holding the mic "on" — this session just ended naturally
      // (e.g. a pause was detected). Start a fresh session to keep listening.
      try {
        const next = buildRecognition()
        recognitionRef.current = next
        next.start()
      } catch (e) {
        shouldKeepListeningRef.current = false
        setRecording(false)
      }
    }
  }

  function startLiveTranscription() {
    baseTextRef.current = text ? `${text} ` : ''
    shouldKeepListeningRef.current = true
    const recognition = buildRecognition()
    recognitionRef.current = recognition
    recognition.start()
    setRecording(true)
  }

  function stopLiveTranscription() {
    shouldKeepListeningRef.current = false
    recognitionRef.current?.stop()
    recognitionRef.current = null
    setRecording(false)
  }

  // ── Fallback: record audio, send to backend Whisper endpoint ─────────
  async function startServerTranscription() {
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
          showVoiceError(t.voiceError)
        } finally {
          setTranscribing(false)
        }
      }
      mediaRecorderRef.current = recorder
      recorder.start()
      setRecording(true)
    } catch (e) {
      showVoiceError(t.voiceError)
    }
  }

  function stopServerTranscription() {
    mediaRecorderRef.current?.stop()
    setRecording(false)
  }

  async function toggleRecording() {
    if (recording) {
      useLiveTranscribe ? stopLiveTranscription() : stopServerTranscription()
      return
    }
    useLiveTranscribe ? startLiveTranscription() : await startServerTranscription()
  }

  const micLabel = recording
    ? (t.micStop || 'Stop')
    : useLiveTranscribe
      ? (t.micStartLive || t.micStart || 'Voice Input (live)')
      : (t.micStart || 'Voice Input')

  return (
    <Box
      sx={{
        px: { xs: 1.5, sm: 4 },
        pt: 1.5,
        pb: { xs: 1.5, sm: 2.5 },
        bgcolor: 'background.paper',
        borderTop: 1,
        borderColor: 'divider'
      }}
    >
      {/* Voice initialization error notices — fades out automatically */}
      <Fade
        in={errorVisible}
        timeout={{ enter: 200, exit: 500 }}
        onExited={() => setVoiceError(null)}
        unmountOnExit
      >
        <Alert
          severity="error"
          variant="filled"
          sx={{
            position: 'fixed',
            top: { xs: 16, lg: 24 },
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: (theme) => theme.zIndex.snackbar,
            borderRadius: 2,
            boxShadow: 4,
            maxWidth: { xs: 'calc(100vw - 32px)', sm: 420 },
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}
        >
          {voiceError}
        </Alert>
      </Fade>

      {/* Transcription state tracking indicators (server fallback only — live mode has no wait) */}
      
      <Fade in={transcribing} timeout={{ enter: 200, exit: 400 }} unmountOnExit>
        <Alert
          severity="info"
          variant="filled"
          icon={<CircularProgress size={16} thickness={5} sx={{ color: 'inherit' }} />}
          sx={{
            position: 'fixed',
            top: { xs: 16, lg: 24 },
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: (theme) => theme.zIndex.snackbar,
            borderRadius: 2,
            boxShadow: 4,
            maxWidth: { xs: 'calc(100vw - 32px)', sm: 420 },
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            '& .MuiAlert-icon': { alignItems: 'center' }
          }}
        >
          {t.processingVoice}
        </Alert>
      </Fade>

      {/* Primary user communication panel boundary */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-end',
          gap: 1.5,
          bgcolor: 'action.hover',
          border: 1,
          borderColor: recording ? 'error.light' : 'divider',
          borderRadius: 4,
          pl: 1.5,
          pr: 1,
          py: 1,
          transition: 'all 0.2s ease-in-out',
          '&:focus-within': {
            borderColor: recording ? 'error.main' : 'primary.main',
            boxShadow: (theme) => `0 0 0 2px ${recording ? theme.palette.error.light : theme.palette.primary.light}40`
          }
        }}
      >
        <Tooltip title={micLabel} placement="top" arrow>
          <IconButton
            onClick={toggleRecording}
            color={recording ? "error" : "default"}
            sx={{
              width: 38,
              height: 38,
              bgcolor: recording ? 'error.main' : 'background.paper',
              color: recording ? 'error.contrastText' : 'text.secondary',
              boxShadow: 1,
              flexShrink: 0,
              transition: 'transform 0.15s ease-in-out',
              '&:hover': {
                bgcolor: recording ? 'error.dark' : 'action.selected',
                transform: 'translateY(-1px)'
              },
              animation: recording ? 'pulse-border 1.5s infinite ease-in-out' : 'none',
              '@keyframes pulse-border': {
                '0%': { boxShadow: '0 0 0 0px rgba(211, 47, 47, 0.4)' },
                '70%': { boxShadow: '0 0 0 6px rgba(211, 47, 47, 0)' },
                '100%': { boxShadow: '0 0 0 0px rgba(211, 47, 47, 0)' }
              }
            }}
          >
            {recording ? <Square size={16} fill="currentColor" /> : <Mic size={18} />}
          </IconButton>
        </Tooltip>

        <TextField
          multiline
          maxRows={1}
          variant="standard"
          placeholder={t.chatPlaceholder}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          InputProps={{ disableUnderline: true }}
          sx={{
            flexGrow: 1,
            py: 0.75,
            px: 0.5,
            '& .MuiInputBase-root': {
              color: 'text.primary',
              fontSize: '0.95rem',
              lineHeight: 1.5
            }
          }}
        />

        <Button
          variant="contained"
          color="primary"
          onClick={submit}
          disabled={disabled || !text.trim()}
          sx={{
            flexShrink: 0,
            borderRadius: { xs: '50%', sm: 3 },
            minWidth: { xs: 38, sm: 64 },
            width: { xs: 38, sm: 'auto' },
            height: { xs: 38, sm: 'auto' },
            p: { xs: 0, sm: undefined },
            px: { xs: 0, sm: 2.5 },
            py: { xs: 0, sm: 1 },
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            textTransform: 'none',
            fontWeight: 600,
            fontSize: '0.875rem',
            boxShadow: 2,
            transition: 'transform 0.15s ease-in-out',
            '&:hover': { transform: 'translateY(-1px)' },
            '&:disabled': {
              bgcolor: 'action.disabledBackground',
              color: 'action.disabled'
            }
          }}
        >
          <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' }, mr: 0.5 }}>
            {t.send}
          </Box>
          <SendHorizontal size={16} />
        </Button>
      </Box>
    </Box>
  )
}