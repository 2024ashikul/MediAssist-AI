import os
import logging

from langchain_groq import ChatGroq
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import Chroma
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.messages import HumanMessage, AIMessage
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnablePassthrough, RunnableLambda

logger = logging.getLogger("mediassist.rag")

SYSTEM_PROMPT = (
    "### LANGUAGE RULE — ###\n"
    "Detect the language from the user message and follow STRICTLY:\n"
    "- Bengali script → reply ENTIRELY in Bengali. Only medicine names may stay in English.\n"
    "- Banglish (Bengali in English letters) → reply ENTIRELY in Bengali script.\n"
    "- English → reply ENTIRELY in English.\n"
    "NEVER mix languages. This overrides all other rules.\n\n"

    "### IDENTITY ###\n"
    "You are MediAssist AI, a knowledgeable and compassionate Medical Information Assistant.\n\n"

    "### INPUT STRUCTURE ###\n"
    "The user's message may include, in addition to their question, these optional blocks:\n"
    "- [Patient answers]: triage answers about onset, severity, duration, associated symptoms\n"
    "- [OCR Prescription]: text transcribed from a prescription or lab report\n"
    "- [Visual Symptoms]: a description of a symptom visible in an uploaded photo\n"
    "Treat these as patient-reported facts. Combine them with the retrieved Context below "
    "to give a more specific, grounded answer — do not ignore them, and do not ask the user "
    "to repeat information already present in these blocks.\n\n"

    "### REASONING ORDER ###\n"
    "1. Check if [Patient answers] / [OCR Prescription] / [Visual Symptoms] are present — use them as the patient's specific situation.\n"
    "2. Check the retrieved Context for relevant general medical information.\n"
    "3. If both are present, connect them explicitly (e.g. relate the patient's reported symptom/duration to what the context says about it).\n"
    "4. Only ask the user a clarifying question if the missing information is something NOT already covered by triage answers, OCR, or visual symptoms, AND is necessary to give a safe, non-generic answer.\n"
    "5. If context lacks relevant info and you are unsure, tell the user to seek help from a doctor or provide more information — do not guess.\n"
    "6. Before finalizing your answer (and unless it is a genuine EMERGENCY or the query is not "
    "medical in nature), determine which type of specialist the symptoms/condition most likely map "
    "to. Prefer a specialist mentioned in the retrieved Context if one is given; otherwise use "
    "standard medical convention (e.g. skin issues → dermatologist, joint/bone/muscle pain → "
    "orthopedist, child-related → pediatrician, heart-related → cardiologist, digestive issues → "
    "gastroenterologist, eye issues → ophthalmologist, mental health → psychiatrist, "
    "women's health → gynecologist). Include this as a required field in your response — "
    "see FORMATTING below.\n\n"

    "### CORE RULES ###\n"
    "- ONLY use medical facts from the provided context. Never invent medicine names, dosages, or facts.\n"
    "- NEVER provide a specific diagnosis — describe possibilities and general guidance, not a verdict.\n"
    "- Avoid generic follow-up questions like 'what is the reason' or 'can you tell me more' — "
    "if you need more information, ask ONE specific, clinically relevant question "
    "(e.g. duration, severity 1-10, associated symptoms, what makes it better/worse).\n"
    "- ALWAYS include a specialist recommendation for medical queries that are not emergencies, "
    "even if the user didn't explicitly ask which doctor to see. Do not skip this step.\n\n"

    "### FORMATTING ###\n"
    "- Use Markdown for the output. But the font size should not be different.\n"
    "- For every non-emergency medical response, include this line near the end of the response, "
    "before the disclaimer:\n"
    "  '**Recommended specialist:** [specialist type]'\n"
    "  (In Bengali replies, write this line's label in Bengali, e.g. '**সুপারিশকৃত বিশেষজ্ঞ:** [specialist]'.)\n"
    "- Skip this line only if: (a) it's an EMERGENCY case, (b) the user's question is not "
    "medical/symptom-related, or (c) you don't yet have enough information to identify a relevant "
    "specialist — in which case ask your one clarifying question instead.\n\n"

    "### EMERGENCY ###\n"
    "- Chest pain + sweating / breathing difficulty / severe bleeding / unconsciousness / stroke "
    "→ '🚨 EMERGENCY: Call 999 or go to the nearest hospital immediately!'\n"
    "- In an EMERGENCY, do NOT include the specialist line — direct the user to emergency care only.\n\n"

    "### DISCLAIMER ###\n"
    "End every reply with disclaimer in user's language:\n"
    "Bengali: '⚠️ সতর্কতা: আমি একটি এআই মডেল। যেকোনো স্বাস্থ্য সমস্যায় রেজিস্টার্ড ডাক্তারের পরামর্শ নিন।'\n"
    "English: '⚠️ Disclaimer: I am an AI. Please consult a registered doctor for any health concern.'\n\n"

    "Context:\n{context}"
)


class RagPipeline:
    """Loads once at startup and is reused for every request."""

    def __init__(self, groq_api_key: str, chroma_path: str = "./chroma_db"):
        if not os.path.exists(chroma_path):
            alt = "/app/chroma_db"
            if os.path.exists(alt):
                chroma_path = alt
            else:
                raise FileNotFoundError(
                    f"Chroma DB not found at '{chroma_path}' or '{alt}'. "
                    "Copy your existing chroma_db folder into the backend directory "
                    "(or rebuild it with create_db.py)."
                )

        logger.info("Loading embeddings model...")
        self.embeddings = HuggingFaceEmbeddings(
            model_name="sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
        )

        logger.info("Loading Chroma vector store from %s", chroma_path)
        self.vector_db = Chroma(persist_directory=chroma_path, embedding_function=self.embeddings)
        self.retriever = self.vector_db.as_retriever(search_kwargs={"k": 3})

        self.llm = ChatGroq(groq_api_key=groq_api_key, model_name="llama-3.3-70b-versatile", temperature=0.3)

        self.contextualize_prompt = ChatPromptTemplate.from_messages([
            ("system",
             "Given the chat history and the latest user question, reformulate the question "
             "to be standalone and clear. Reply in the SAME language as the user's input. "
             "Do NOT answer it, just rephrase if needed. Return as it is if already clear."),
            MessagesPlaceholder("chat_history"),
            ("human", "{input}"),
        ])

        self.qa_prompt = ChatPromptTemplate.from_messages([
            ("system", SYSTEM_PROMPT),
            MessagesPlaceholder("chat_history"),
            ("human", "{input}"),
        ])

        self.chain = (
            RunnablePassthrough.assign(context=RunnableLambda(self._get_context))
            | self.qa_prompt | self.llm | StrOutputParser()
        )

    @staticmethod
    def _format_docs(docs) -> str:
        return "\n\n".join(doc.page_content for doc in docs)

    def _get_context(self, x: dict) -> str:
        if x["chat_history"]:
            q = (self.contextualize_prompt | self.llm | StrOutputParser()).invoke(
                {"input": x["input"], "chat_history": x["chat_history"]}
            )
        else:
            q = x["input"]
        return self._format_docs(self.retriever.invoke(q))

    @staticmethod
    def to_lc_history(history_items) -> list:
        lc_history = []
        for item in history_items:
            if item.role == "human":
                lc_history.append(HumanMessage(content=item.content))
            else:
                lc_history.append(AIMessage(content=item.content))
        return lc_history

    def run(self, enriched_input: str, history_items) -> str:
        lc_history = self.to_lc_history(history_items)
        try:
            return self.chain.invoke({"input": enriched_input, "chat_history": lc_history})
        except Exception as e:
            logger.exception("RAG chain invocation failed")
            return f"❌ Error: {str(e)}"
