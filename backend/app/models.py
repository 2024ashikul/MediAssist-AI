from typing import List, Optional, Dict, Literal
from pydantic import BaseModel, Field


class ChatHistoryItem(BaseModel):
    role: Literal["human", "ai"]
    content: str


class ChatRequest(BaseModel):
    message: str
    chat_history: List[ChatHistoryItem] = Field(default_factory=list)
    language: Literal["bn", "en"] = "bn"
    ocr_context: Optional[str] = None
    vision_context: Optional[str] = None


class TriageQuestion(BaseModel):
    id: int
    question: str
    options: List[str]


class ChatResponse(BaseModel):
    type: Literal["answer", "triage"]
    answer: Optional[str] = None
    enriched_input: Optional[str] = None
    triage_questions: Optional[List[TriageQuestion]] = None
    original_input: Optional[str] = None


class TriageSubmitRequest(BaseModel):
    original_input: str
    questions: List[TriageQuestion]
    answers: Dict[str, str] = Field(default_factory=dict)
    skipped: bool = False
    chat_history: List[ChatHistoryItem] = Field(default_factory=list)
    language: Literal["bn", "en"] = "bn"
    ocr_context: Optional[str] = None
    vision_context: Optional[str] = None


class TriageSubmitResponse(BaseModel):
    answer: str
    enriched_input: str


class ImageAnalysisResponse(BaseModel):
    result: str
    is_error: bool


class TranscribeResponse(BaseModel):
    text: str


class HealthResponse(BaseModel):
    status: str
    rag_ready: bool
    groq_configured: bool
    gemini_configured: bool
