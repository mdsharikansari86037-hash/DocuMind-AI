import os
import logging
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from google import genai

# ==========================================
# Production-Ready Logging Setup
# ==========================================
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(name)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Load Environment Variables securely
load_dotenv()

api_key = os.getenv("GEMINI_API_KEY")

if not api_key:
    logger.error("GEMINI_API_KEY not found in .env file")
    raise Exception("GEMINI_API_KEY not found in .env file. Please configure it.")

# Initialize Gemini Client
try:
    client = genai.Client(api_key=api_key)
    logger.info("Gemini API Client initialized successfully.")
except Exception as e:
    logger.error(f"Failed to initialize Gemini Client: {str(e)}")
    raise e

# Initialize FastAPI App
app = FastAPI(
    title="DocuMind AI Backend",
    description="Enterprise-Grade AI Document Analysis API",
    version="2.0.0"
)

frontend_path = os.path.join(os.path.dirname(__file__), "..", "frontend")

app.mount("/static", StaticFiles(directory=frontend_path), name="static")

@app.get("/")
async def home():
    return FileResponse(os.path.join(frontend_path, "index.html"))


# CORS Configuration for Frontend Connectivity
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==========================================
# Pydantic Data Models
# ==========================================
class DocumentRequest(BaseModel):
    text: str
    analysis_type: str = "comprehensive"

class ChatRequest(BaseModel):
    document_context: str
    question: str

# ==========================================
# Prompt Engineering & Utility Functions
# ==========================================
def get_analysis_prompt(text: str, analysis_type: str) -> str:
    """Generates the appropriate prompt based on the selected analysis type."""
    
    if analysis_type == "comprehensive":
        return f"""You are a Senior Full Stack AI Document Analyzer.
Analyze the following document comprehensively. 
Return the output STRICTLY in Markdown format, using the exact headings provided below. Do not omit any heading.

# Executive Summary
# Key Points
# Important Facts
# Action Items
# Risks
# Keywords
# Sentiment
# Suggestions
# Conclusion

Document:
{text}
"""
    elif analysis_type == "translate_hindi":
        return f"Translate the following document completely and accurately into highly professional Hindi. Maintain the original structure. Return output in Markdown.\n\nDocument:\n{text}"
    
    elif analysis_type == "translate_english":
        return f"Translate the following document completely and accurately into professional English. Maintain the original structure. Return output in Markdown.\n\nDocument:\n{text}"
    
    elif analysis_type == "rewrite_professional":
        return f"Rewrite the following document to have a highly professional, corporate, and polished tone. Enhance the vocabulary and structure. Return output in Markdown.\n\nDocument:\n{text}"
    
    elif analysis_type == "rewrite_simple":
        return f"Rewrite the following document in extremely simple, layman's terms so that a beginner or a 10-year-old could easily understand it. Avoid jargon. Return output in Markdown.\n\nDocument:\n{text}"
    
    elif analysis_type == "generate_title":
        return f"Generate 5 highly optimized, catchy, and click-worthy SEO titles for the following document. Return output as a Markdown list.\n\nDocument:\n{text}"
    
    elif analysis_type == "generate_faqs":
        return f"Generate 5 to 10 Frequently Asked Questions (FAQs) along with detailed answers based ONLY on the following document. Return output in Markdown format.\n\nDocument:\n{text}"
    
    elif analysis_type == "generate_mcqs":
        return f"Generate 5 Multiple Choice Questions (MCQs) based on the following document. For each question, provide 4 options (A, B, C, D) and clearly state the correct answer with a brief explanation. Return output in Markdown.\n\nDocument:\n{text}"
    
    elif analysis_type == "generate_flashcards":
        return f"Generate 10 educational flashcards based on the key concepts in the following document. Format them as 'Front: [Concept/Question]' and 'Back: [Explanation/Answer]'. Return output in Markdown.\n\nDocument:\n{text}"
    
    else:
        # Fallback
        return f"Analyze the following document and provide key insights in Markdown format:\n\n{text}"

# ==========================================
# Streaming Generators
# ==========================================
async def generate_analysis_stream(text: str, analysis_type: str):
    """Streams the analysis response directly from Gemini API."""
    try:
        prompt = get_analysis_prompt(text, analysis_type)
        
        # Real API streaming for faster Time-to-First-Byte (TTFB)
        response_stream = client.models.generate_content_stream(
            model="gemini-3.5-flash",
            contents=prompt,
        )

        for chunk in response_stream:
            if chunk.text:
                yield chunk.text

    except Exception as e:
        logger.error(f"Error during analysis generation: {str(e)}")
        yield f"\n\n❌ **Error Processing Document:** {str(e)}"

async def generate_chat_stream(context: str, question: str):
    """Streams the chat response ensuring strict adherence to the document context."""
    try:
        prompt = f"""You are a helpful AI document assistant. 
You MUST answer the user's question strictly and ONLY using the information provided in the Document Context below.
If the answer is NOT contained within the Document Context, you must reply exactly with: "I cannot find the answer to this question in the provided document." 
Do NOT guess, assume, or bring in outside knowledge.

Document Context:
{context}

User Question:
{question}
"""
        response_stream = client.models.generate_content_stream(
            model="gemini-3.5-flash",
            contents=prompt,
        )

        for chunk in response_stream:
            if chunk.text:
                yield chunk.text

    except Exception as e:
        logger.error(f"Error during chat generation: {str(e)}")
        yield f"\n\n❌ **Error in Chat:** {str(e)}"

# ==========================================
# API Endpoints
# ==========================================
@app.post("/api/analyze")
async def analyze_document(request: DocumentRequest):
    """Endpoint to analyze a document with various operational modes."""
    if not request.text.strip():
        logger.warning("Received empty document for analysis.")
        raise HTTPException(status_code=400, detail="Document text cannot be empty.")

    logger.info(f"Initiating document analysis. Type: {request.analysis_type}")
    
    return StreamingResponse(
        generate_analysis_stream(request.text, request.analysis_type),
        media_type="text/plain",
    )

@app.post("/api/chat")
async def chat_with_document(request: ChatRequest):
    """Endpoint to answer questions strictly based on the provided document context."""
    if not request.document_context.strip():
        logger.warning("Received empty document context for chat.")
        raise HTTPException(status_code=400, detail="Document context cannot be empty.")
    
    if not request.question.strip():
        logger.warning("Received empty question for chat.")
        raise HTTPException(status_code=400, detail="Question cannot be empty.")

    logger.info("Initiating chat with document.")
    
    return StreamingResponse(
        generate_chat_stream(request.document_context, request.question),
        media_type="text/plain",
    )