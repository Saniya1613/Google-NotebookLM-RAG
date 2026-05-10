# 🧠 Google NotebookLM — RAG Application

> **Assignment 03** — Build your own version of Google NotebookLM: a RAG-powered document chatbot where users upload a PDF and have a grounded, intelligent conversation with it.

---

## 👩‍💻 Submitted By

| Field | Details |
|-------|---------|
| **Name** | Saniya Sanjiv Patil |
| **Roll Number** | 24BCS10246 |

---

## 🔗 Live Demo

🌐 **Deployed Application:** [https://google-notebooklm-rag.vercel.app](https://google-notebooklm-rag.vercel.app)

📦 **GitHub Repository:** [https://github.com/Saniya1613/Google-NotebookLM-RAG](https://github.com/Saniya1613/Google-NotebookLM-RAG)

---

## 📖 What This Application Does

This is a full-stack, production-ready RAG (Retrieval-Augmented Generation) application that mimics Google NotebookLM. Users can:

1. **Upload** a PDF document through a drag-and-drop web interface
2. **Process** — the system automatically chunks, embeds, and indexes the document into a vector database
3. **Chat** — ask natural language questions and receive answers grounded in the document's actual content
4. **Cite** — every answer includes source references with page numbers

> 💡 **Key Principle:** Answers come exclusively from the uploaded document — the LLM is strictly prohibited from using its general knowledge, preventing hallucination.

---

## 🏗️ System Architecture

```
┌──────────────────┐     ┌───────────────────┐     ┌──────────────────┐
│   Web Frontend   │────▶│   Express.js API   │────▶│   Qdrant Cloud   │
│  (HTML/CSS/JS)   │◀────│    (Node.js)       │◀────│   (Vector DB)    │
└──────────────────┘     └───┬──────────┬────┘     └──────────────────┘
                             │          │
                   ┌─────────▼──┐  ┌────▼──────────────┐
                   │    Groq    │  │  Google Gemini     │
                   │    LLM     │  │  Embeddings API    │
                   └────────────┘  └───────────────────┘
```

**Data Flow:**
```
User uploads PDF → PDFLoader → Chunking → Embedding (Gemini) → Qdrant Storage
User asks question → Embed query → Cosine similarity search → Retrieve top-k chunks → LLM generates grounded answer
```

---

## 🔧 RAG Pipeline — End to End

### Stage 1: Document Ingestion

**File:** `src/rag/ingestion.js`

When a user uploads a PDF, the system executes the following pipeline:

```
PDF File → Load Pages → Split into Chunks → Generate Embeddings → Store in Qdrant
```

Each uploaded document receives a **unique Qdrant collection**, ensuring isolated, document-specific retrieval.

---

### Stage 2: Chunking Strategy

**Algorithm:** `RecursiveCharacterTextSplitter` (LangChain)

This is a hierarchical text splitting strategy that preserves semantic boundaries by attempting splits in priority order:

```javascript
const textSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1000,
  chunkOverlap: 200,
  separators: ["\n\n", "\n", ". ", " ", ""],
});
```

| Parameter | Value | Rationale |
|-----------|-------|-----------|
| `chunkSize` | 1000 chars | Balances context richness with retrieval precision |
| `chunkOverlap` | 200 chars | Ensures no information is lost at chunk boundaries |
| `separators` | `["\n\n", "\n", ". ", " ", ""]` | Splits by paragraph → line → sentence → word (hierarchical) |

**Why RecursiveCharacterTextSplitter?**
- Paragraphs are kept intact whenever possible
- Falls back to finer-grained splitting only when chunks exceed the size limit
- Produces semantically coherent chunks, which significantly improves retrieval quality compared to naive fixed-size splitting

---

### Stage 3: Embedding Model

**File:** `src/rag/embeddings.js`

| Property | Value |
|----------|-------|
| **Model** | `gemini-embedding-001` |
| **Provider** | Google Gemini API |
| **Dimensions** | 768 |
| **Integration** | `@langchain/google-genai` (LangChain-compatible) |

The embedding model converts each text chunk into a 768-dimensional vector. The same model is used to embed user queries at retrieval time, ensuring consistent vector space representation.

---

### Stage 4: Vector Storage — Qdrant Cloud

| Property | Value |
|----------|-------|
| **Database** | Qdrant Cloud (free tier) |
| **Distance Metric** | Cosine Similarity |
| **Collection Strategy** | One collection per document |

Each document gets its own isolated Qdrant collection (named `doc_<uuid>`), which enables:
- Document-specific retrieval without cross-document contamination
- Clean document management (list, delete)
- Metadata storage (page number, chunk index, document name) alongside vectors

---

### Stage 5: Retrieval

When a user asks a question:

1. The query is embedded using the same Gemini embedding model
2. Cosine similarity search retrieves the **top-k (k=4)** most relevant chunks
3. Each chunk carries metadata: page number, chunk index, and document name
4. Retrieved chunks are passed to the LLM as context

---

### Stage 6: Grounded Generation

**File:** `src/rag/generation.js`

| Property | Value |
|----------|-------|
| **Model** | `llama-3.3-70b-versatile` |
| **Provider** | Groq API |
| **Temperature** | 0.3 (low — for factual, deterministic responses) |

The system prompt enforces strict grounding rules:

```
STRICT RULES:
1. ONLY answer based on the provided document context
2. If the answer cannot be found, explicitly say so
3. NEVER use general knowledge — all answers must be grounded
4. Reference page numbers when possible
5. Provide clear, well-structured answers
```

This ensures the LLM acts as a **document-grounded assistant**, not a general-purpose chatbot.

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Runtime** | Node.js (ES Modules) | Server-side JavaScript |
| **Server** | Express.js | REST API + static file serving |
| **PDF Parsing** | LangChain PDFLoader | Extract text from uploaded PDFs |
| **Chunking** | LangChain RecursiveCharacterTextSplitter | Semantic document splitting |
| **Embeddings** | Google Gemini `gemini-embedding-001` | Text → 768-dim vector conversion |
| **Vector DB** | Qdrant Cloud | Persistent vector storage + similarity search |
| **LLM** | Groq `llama-3.3-70b-versatile` | Grounded answer generation |
| **Frontend** | HTML5, CSS3, Vanilla JavaScript | Responsive web interface |
| **Deployment** | Vercel (serverless) | Production hosting |

---

## 📁 Project Structure

```
Google-NotebookLM-RAG/
├── api/
│   └── index.js               # Vercel serverless entry point
├── public/                     # Frontend (static files)
│   ├── index.html              # Main HTML — chat UI + upload interface
│   ├── style.css               # Premium dark theme with glassmorphism
│   └── app.js                  # Frontend logic (upload, chat, rendering)
├── src/
│   ├── app.js                  # Express app configuration
│   ├── index.js                # Local development server entry point
│   ├── rag/
│   │   ├── embeddings.js       # Google Gemini embedding integration
│   │   ├── ingestion.js        # Full ingestion pipeline (load → chunk → embed → store)
│   │   └── generation.js       # Groq LLM generation with grounding rules
│   └── routes/
│       ├── upload.js           # POST /api/upload — PDF upload + ingestion
│       ├── chat.js             # POST /api/chat — retrieval + generation
│       └── documents.js        # GET /api/documents — list indexed documents
├── .env.example                # Environment variables template
├── vercel.json                 # Vercel deployment configuration
├── package.json
└── README.md
```

---

## 🚀 Local Setup

### Prerequisites

- **Node.js** 18+
- **Groq API key** — free at [console.groq.com](https://console.groq.com)
- **Google AI API key** — free at [aistudio.google.com](https://aistudio.google.com/apikey)
- **Qdrant Cloud** — free tier at [cloud.qdrant.io](https://cloud.qdrant.io)

### Steps

```bash
# 1. Clone the repository
git clone https://github.com/Saniya1613/Google-NotebookLM-RAG.git
cd Google-NotebookLM-RAG

# 2. Install dependencies
npm install

# 3. Configure environment variables
cp .env.example .env
# Edit .env with your API keys:
#   GROQ_API_KEY=gsk_your-key
#   GOOGLE_API_KEY=your-google-key
#   QDRANT_URL=https://your-cluster.cloud.qdrant.io:6333
#   QDRANT_API_KEY=your-qdrant-key

# 4. Start the development server
npm run dev

# 5. Open in browser
# → http://localhost:3000
```

---

## 📡 API Reference

### `POST /api/upload`
Upload and ingest a PDF document into the RAG pipeline.

**Request:** `multipart/form-data` with field `document` (PDF file, max 10MB)

**Response:**
```json
{
  "success": true,
  "message": "Document uploaded and indexed successfully",
  "document": {
    "id": "5e9c1eab-a4f1-45e7-a42b-722f862de674",
    "name": "research-paper.pdf",
    "collectionName": "doc_5e9c1eab_a4f1_45e7_a42b_722f862de674",
    "chunkCount": 42,
    "pageCount": 10,
    "uploadedAt": "2026-05-10T15:46:21.435Z"
  }
}
```

### `POST /api/chat`
Ask a question about an uploaded document.

**Request:**
```json
{
  "documentId": "5e9c1eab-a4f1-45e7-a42b-722f862de674",
  "query": "What is the main conclusion of this paper?"
}
```

**Response:**
```json
{
  "success": true,
  "answer": "Based on Page 8 of the document, the main conclusion is...",
  "sources": [
    {
      "chunkIndex": 1,
      "page": 8,
      "preview": "In conclusion, our findings demonstrate..."
    }
  ]
}
```

### `GET /api/documents`
List all uploaded and indexed documents (reads from Qdrant — stateless).

### `GET /api/health`
Server health check endpoint.

---

## 🎨 Frontend Design

The web interface features a premium dark theme with:
- **Glassmorphism** design with frosted-glass sidebar and cards
- **Drag-and-drop** PDF upload zone with progress tracking
- **Real-time chat** interface with markdown-rendered responses
- **Source citations** displayed alongside each answer
- **Responsive layout** that works on desktop and mobile
- **Ambient gradient animations** for a polished, modern feel

---

## ⚙️ Design Decisions

| Decision | Reasoning |
|----------|-----------|
| **RecursiveCharacterTextSplitter** over fixed-size | Preserves semantic boundaries, improving retrieval quality |
| **Gemini embeddings** over local models | Cloud-based = no cold start delays, instant on serverless |
| **One Qdrant collection per document** | Isolates documents, prevents cross-contamination in retrieval |
| **Groq with low temperature (0.3)** | Prioritizes factual, deterministic responses over creativity |
| **Strict grounding prompt** | Prevents LLM hallucination — answers only from document |
| **Stateless architecture** | Works on Vercel serverless — no in-memory state between requests |

---

## 📝 License

MIT License — Saniya Sanjiv Patil
