const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://ashikulislam2003-mediassistai.hf.space'

async function handle(res) {
  if (!res.ok) {
    let detail = res.statusText
    try {
      const body = await res.json()
      detail = body.detail || detail
    } catch {
      /* ignore */
    }
    throw new Error(detail)
  }
  return res.json()
}

export async function getHealth() {
  const res = await fetch(`${BASE_URL}/api/health`)
  return handle(res)
}

export async function sendChat({ message, chatHistory, language, ocrContext, visionContext }) {
  const res = await fetch(`${BASE_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      chat_history: chatHistory,
      language,
      ocr_context: ocrContext || null,
      vision_context: visionContext || null,
    }),
  })
  return handle(res)
}

export async function submitTriage({
  originalInput,
  questions,
  answers,
  skipped,
  chatHistory,
  language,
  ocrContext,
  visionContext,
}) {
  const res = await fetch(`${BASE_URL}/api/chat/triage-submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      original_input: originalInput,
      questions,
      answers,
      skipped,
      chat_history: chatHistory,
      language,
      ocr_context: ocrContext || null,
      vision_context: visionContext || null,
    }),
  })
  return handle(res)
}

export async function analyzeVisionImage(file, language) {
  const form = new FormData()
  form.append('file', file)
  form.append('language', language)
  const res = await fetch(`${BASE_URL}/api/vision/analyze`, { method: 'POST', body: form })
  return handle(res)
}

export async function extractOcrText(file, language) {
  const form = new FormData()
  form.append('file', file)
  form.append('language', language)
  const res = await fetch(`${BASE_URL}/api/ocr/extract`, { method: 'POST', body: form })
  return handle(res)
}

export async function searchMedicine(query) {
  const res = await fetch(`${BASE_URL}/api/search?${new URLSearchParams({ q: query })}`)
  return handle(res)  
}

export async function getMedicineDetail(brandId) {
  const res = await fetch(`${BASE_URL}/api/medicine/${brandId}`)
  return handle(res)  // returns MedicineDetail
}

export async function transcribeVoice(blob, language) {
  const form = new FormData()
  form.append('file', blob, 'recording.webm')
  form.append('language', language)
  const res = await fetch(`${BASE_URL}/api/voice/transcribe`, { method: 'POST', body: form })
  return handle(res)
}
