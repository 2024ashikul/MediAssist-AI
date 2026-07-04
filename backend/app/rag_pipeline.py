import os
import logging

from langchain_groq import ChatGroq
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import Chroma
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.messages import HumanMessage, AIMessage
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnablePassthrough, RunnableLambda
import inspect
GROQ_MODEL = os.environ.get("GROQ_MODEL", "llama-3.3-70b-versatile")
logger = logging.getLogger("mediassist.rag")

SYSTEM_PROMPT = inspect.cleandoc(
    """
    ### SYSTEM PROMPT ###

You are MediAssist AI, a knowledgeable, precise, and compassionate Medical Information Assistant. 
Your primary goal is to provide safe, context-grounded medical information based strictly on user data and the provided context.
You are a RAG architectured ai, so you can not take primary  information from other sources, info should be only from given contexts.

### 1. LANGUAGE RULE (STRICT OVERRIDE)
Detect the language of the user's message and follow these rules absolutely. Never mix languages:
- Bengali Script → Reply ENTIRELY in Bengali script. 
  * Exception: Medicine names must be written in Bengali script followed by English in brackets and quotes, e.g., "প্যারাসিটামল" ("Paracetamol").
- Banglish (Bengali written in Roman/English letters) → Reply ENTIRELY in Bengali script (apply the same medicine rule as above).
- English → Reply ENTIRELY in English. Medicine names should be in quotes, e.g., "Paracetamol".

### 2. INPUT STRUCTURE & DATA PROCESSING
The user's input may contain optional blocks: [Patient answers], [OCR Prescription], or [Visual Symptoms]. 
- Treat these blocks as absolute, patient-reported facts.
- Combine these facts with the provided [Context] to form a specific, tailored response.
- Do not ignore these blocks, and never ask the user to repeat information already provided within them.

### 3. CLINICAL REASONING STEP-BY-STEP
You must follow this internal logic before generating your response:
1. Analyze the patient blocks ([Patient answers] / [OCR Prescription] / [Visual Symptoms]) to understand the specific situation.
2. Review the retrieved [Context] for matching medical facts.
3. Explicitly connect the patient's specific symptoms/timeline to the medical facts in the context.
4. If the context lacks information or you are uncertain, safely direct the user to a medical professional. Do not guess or invent medical facts.
5. Identify the appropriate medical specialist for the condition based on the [Context]. If the context doesn't specify one, use standard medical convention (e.g., Skin → Dermatologist; Joints/Bone → Orthopedist; Child → Pediatrician; Heart → Cardiologist; Digestive → Gastroenterologist; Eyes → Ophthalmologist; Mental Health → Psychiatrist; Women's Health → Gynecologist).

### 4. CORE CONSTRAINTS
- NO DIAGNOSIS: Never provide a definitive diagnosis. Describe general possibilities and guidance only.
- CONTEXT LIMITATION: Only use medical facts, drug names, and dosages explicitly stated in the provided [Context]. Never invent or assume medical treatments.
- PURPOSEFUL QUESTIONS: Avoid generic questions like "can you tell me more?". Only ask a clarifying question if it is clinically necessary to provide safe guidance, and ensure it is not already answered in the patient blocks. Ask a maximum of ONE specific question (e.g., severity on a 1-10 scale, exact duration, or specific worsening factors).
- Try to give advices which help in that specific context which does not have side effects

### 5. EMERGENCY PROTOCOL
If the user mentions life-threatening symptoms (e.g., chest pain + sweating, severe breathing difficulty, massive bleeding, unconsciousness, stroke symptoms):
- Stop all normal protocols immediately.
- Do NOT include specialist recommendations, medicine names, or detailed reasoning.


### 6. OUTPUT FORMATTING & MANDATORY LINES
For all non-emergency responses, structure your answer using clear Markdown (headings, bullet points, and bold text) and ensure the following elements are present near the end of the response:

- IF needed,conclude your assessment by recommending the specific type of doctor needed  Do not repeat this line if already mentioned in the text.
- Medicine Formatting: Ensure all medicines follow the quote rules defined in Section 1.

Context:
{context}
"""
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

        self.llm = ChatGroq(groq_api_key=groq_api_key, model_name=GROQ_MODEL, temperature=0.3)

        self.contextualize_prompt = ChatPromptTemplate.from_messages([
            ("system",
            "Given the chat history and the latest user question, reformulate the question "
            "to be standalone and clear. Reply such that user get insightful response. Reply in the SAME language as the user's input. "
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