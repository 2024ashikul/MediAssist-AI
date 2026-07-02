import React, { useRef, useState } from 'react'
import { 
  Box, 
  TextField, 
  IconButton, 
  Button, 
  Alert, 
  Typography, 
  CircularProgress,
  Tooltip 
} from '@mui/material'
import { Mic, Square, SendHorizontal } from 'lucide-react'

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

  // Determine standard dynamic action descriptions based on language contexts
  const micLabel = recording ? (t.micStop || 'Stop') : (t.micStart || 'Voice Input')

  return (
    <Box 
      sx={{ 
        px: 4, 
        pt: 1.5, 
        pb: 2.5, 
        bgcolor: 'background.paper', 
        borderTop: 1, 
        borderColor: 'divider' 
      }}
    >
      {/* Voice initialization error notices */}
      {voiceError && (
        <Alert severity="error" variant="filled" sx={{ mb: 1.5, borderRadius: 2 }}>
          {voiceError}
        </Alert>
      )}

      {/* Transcription state tracking indicators */}
      {transcribing && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
          <CircularProgress size={16} color="primary" thickness={5} />
          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
            {t.processingVoice}
          </Typography>
        </Box>
      )}

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
        {/* Dynamic Recording Action trigger */}
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
              // Continuous pulsing visual when media capture layer registers as active
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

        {/* Dynamic Multiline message interface component */}
        <TextField
          multiline
          maxRows={4}
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

        {/* Message submission control interface */}
        <Button
          variant="contained"
          color="primary"
          onClick={submit}
          disabled={disabled || !text.trim()}
          endIcon={<SendHorizontal size={14} />}
          sx={{
            flexShrink: 0,
            borderRadius: 3,
            px: 2.5,
            py: 1,
            textTransform: 'none',
            fontWeight: 600,
            fontSize: '0.875rem',
            boxShadow: 2,
            transition: 'transform 0.15s ease-in-out',
            '&:hover': {
              transform: 'translateY(-1px)'
            },
            '&:disabled': {
              bgcolor: 'action.disabledBackground',
              color: 'action.disabled'
            }
          }}
        >
          {t.send}
        </Button>
      </Box>
    </Box>
  )
}