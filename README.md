# DocuMind AI

**Enterprise-Grade AI Document Analyzer**

DocuMind AI is a premium, high-performance SaaS application that leverages the power of Google's Gemini AI and FastAPI to instantly analyze, summarize, and intelligently chat with your documents.

---

## 👨‍💻 Developer Information

*   **Developer:** Md Sharik Ansari
*   **Email:** mdsharikansari86037@gmail.com

---

## 🚀 Key Features

### 📄 Advanced Document Handling
*   **Multi-Format Support:** Seamlessly upload `.PDF`, `.DOCX`, and `.TXT` files.
*   **Drag & Drop Interface:** Modern, intuitive file upload area.
*   **Direct Text Input:** Paste text directly for instant analysis.

### 🧠 AI-Powered Insights (Gemini 3.5 Flash)
*   **Comprehensive Analysis:** Generates Executive Summaries, Key Points, Important Facts, Action Items, Risks, and more.
*   **Dynamic Operations:** Support for Translation (Hindi/English), Rewriting (Professional/Simple), Title Generation, and MCQ/FAQ/Flashcard generation.
*   **Real-Time Streaming:** Watch the AI generate insights word-by-word with zero perceived latency.

### 💬 Chat With Document
*   **Contextual Memory:** The AI holds your uploaded document in memory.
*   **Strict Adherence:** Ask questions and get answers strictly based *only* on the uploaded text. No hallucinations.

### 🎨 Premium UI/UX
*   **Glassmorphism Design:** Beautiful, modern, translucent interface with 3D tilt effects.
*   **Responsive Layout:** Fully optimized for Desktop, Tablet, and Mobile devices.
*   **Theming:** Built-in Light and Dark mode toggle.
*   **Real-time Statistics:** Instant word count, character count, estimated reading time, and language detection.

### 🛠 Productivity Tools
*   **Export Options:** Download analysis results as PDF or TXT, or Print directly from the browser.
*   **History Management:** Automatically saves recent analyses to your browser for quick retrieval.
*   **One-Click Copy & Share:** Easily copy output or share via native device sharing capabilities.

---

## 🏗 Technology Stack

### Frontend
*   **HTML5 / CSS3 / Vanilla JavaScript**
*   **Styling:** Custom CSS Variables, Glassmorphism, CSS Grid & Flexbox
*   **Libraries:** 
    *   `pdf.js` (PDF parsing)
    *   `mammoth.js` (DOCX parsing)
    *   `marked.js` (Markdown rendering)
    *   `html2pdf.js` (PDF export)
    *   `FontAwesome` (Icons)

### Backend
*   **Framework:** FastAPI (Python)
*   **AI Engine:** Google Gemini SDK (`gemini-3.5-flash`)
*   **Architecture:** Streaming Responses, Environment Variable Security, CORS Middleware

---

## ⚙️ Local Setup & Installation

### Prerequisites
*   Python 3.10+
*   Google Gemini API Key

### Step 1: Clone the Repository
```bash
git clone <your-repository-url>
cd DocuMind-AI