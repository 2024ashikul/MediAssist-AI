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

class MedicineSearchResult(BaseModel):
    brand_id: int
    brand_name: str
    generic_name: Optional[str] = None
    strength: Optional[str] = None
    dosage_form: Optional[str] = None
    manufacturer: Optional[str] = None
    type: Optional[str] = None

class MedicineSearchResponse(BaseModel):
    query: str
    count: int
    results: list[MedicineSearchResult]


class MedicineDetail(BaseModel):
    brand_id: int
    brand_name: str
    generic_name: Optional[str] = None
    strength: Optional[str] = None
    dosage_form: Optional[str] = None
    manufacturer: Optional[str] = None
    type: Optional[str] = None
    monograph_link: Optional[str] = None
    indication_description: Optional[str] = None
    pharmacology_description: Optional[str] = None
    dosage_description: Optional[str] = None
    administration_description: Optional[str] = None
    interaction_description: Optional[str] = None
    contraindications_description: Optional[str] = None
    side_effects_description: Optional[str] = None
    pregnancy_and_lactation_description: Optional[str] = None
    precautions_description: Optional[str] = None
    pediatric_usage_description: Optional[str] = None
    overdose_effects_description: Optional[str] = None
    duration_of_treatment_description: Optional[str] = None
    reconstitution_description: Optional[str] = None
    storage_conditions_description: Optional[str] = None


class AIOverviewRequest(BaseModel):
    brand_id: int
    language : str = "en"