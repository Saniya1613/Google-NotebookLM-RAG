# 🧠 Google NotebookLM RAG

A RAG-powered application inspired by Google NotebookLM — upload any PDF document and have an intelligent conversation with it. Answers are grounded in your document's actual content, not the LLM's general knowledge.

## Submitted By

- **Name:** Saniya Sanjiv Patil
- **Roll Number:** 2024EB02305

---

## 🚀 Live Demo

🔗 **[Live Project Link](https://google-notebooklm-rag.onrender.com)** *(Deployed on Render)*

---

## 📖 What It Does

1. **Upload** — Drop any PDF document into the app
2. **Process** — The system automatically chunks, embeds, and indexes the document
3. **Chat** — Ask natural language questions and get answers grounded in the document
4. **Cite** — Every answer includes source references with page numbers

---

## 🏗️ Architecture

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│   Web Frontend   │────▶│  Express.js API   │────▶│   Qdrant Cloud   │
│  (HTML/CSS/JS)   │◀────│   (Node.js)       │◀────│   Vector DB      │
└──────────────────┘     └───┬──────────┬───┘     └──────────────────┘
                             │          │
                   ┌─────────▼──┐  ┌────▼─────────────────┐
                   │   Groq     │  │  Google Gemini       │
                   │   LLM      │  │  Embeddings          │
                   └────────────┘  └──────────────────────┘
```

---

## 🔧 RAG Pipeline — End to End

### 1. Document Ingestion (`src/rag/ingestion.js`)

When a user uploads a PDF:

```
PDF Upload → PDF Loading → Chunking → Embedding → Vector Storage
```

### 2. Chunking Strategy: RecursiveCharacterTextSplitter

We use **RecursiveCharacterTextSplitter** from LangChain — a hierarchical text splitting strategy that preserves semantic boundaries.

**Why this strategy?**
- Splits text using multiple separators in priority order: `["\n\n", "\n", ". ", " ", ""]`
- Paragraphs are kept intact whenever possible
- Falls back to sentence-level and word-level splitting only when chunks exceed the size limit
- Produces semantically coherent chunks that improve retrieval quality

**Configuration:**
```javascript
const textSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1000,       // Each chunk ≤ 1000 characters
  chunkOverlap: 200,     // 200-char overlap to preserve context at boundaries
  separators: ["\n\n", "\n", ". ", " ", ""],
});
```

**Parameters Explained:**
| Parameter | Value | Rationale |
|-----------|-------|-----------|
| `chunkSize` | 1000 | Balances context richness with retrieval precision |
| `chunkOverlap` | 200 | Ensures no information lost at chunk boundaries |
| `separators` | `["\n\n", "\n", ". ", " ", ""]` | Prioritizes paragraph → line → sentence → word splits |

### 3. Embedding Model (`src/rag/embeddings.js`)

- **Model:** Google Gemini `text-embedding-004`
- **Dimensions:** 768
- Free cloud-based embedding API (1,500 requests/day free tier)
- LangChain-compatible via `@langchain/google-genai`
- Converts text chunks into high-dimensional vectors for semantic search

### 4. Vector Database — Qdrant Cloud

- Each uploaded document gets its own Qdrant collection
- Enables isolated, document-specific retrieval
- Cosine similarity search for finding relevant chunks

### 5. Retrieval

- User query is embedded using the same model
- Top-k (k=4) most similar chunks are retrieved from Qdrant
- Chunks include metadata: page number, chunk index, document name

### 6. Generation (`src/rag/generation.js`)

- Retrieved chunks are formatted with page references
- Strict system prompt ensures the LLM answers ONLY from the provided context
- If the answer isn't in the document, the LLM explicitly says so
- **Model:** Groq `llama-3.3-70b-versatile` with `temperature=0.3` for factual responses

---

## 🛠️ Tech Stack

| Component | Technology |
|-----------|-----------|
| Runtime | Node.js (ES Modules) |
| Server | Express.js |
| PDF Loading | LangChain PDFLoader |
| Chunking | LangChain RecursiveCharacterTextSplitter |
| Embeddings | Google Gemini text-embedding-004 (free) |
| Vector DB | Qdrant Cloud |
| LLM | Groq llama-3.3-70b-versatile |
| Frontend | HTML5, CSS3, Vanilla JavaScript |
| Deployment | Render |

---

## 📁 Project Structure

```
Google-NotebookLM-RAG/
├── public/                  # Frontend (served by Express)
│   ├── index.html           # Main HTML with chat UI
│   ├── style.css            # Premium dark theme styles
│   └── app.js               # Frontend JavaScript
├── src/
│   ├── index.js             # Express server entry point
│   ├── rag/
│   │   ├── embeddings.js    # Google Gemini embeddings integration
│   │   ├── ingestion.js     # Ingestion pipeline (load → chunk → embed → store)
│   │   └── generation.js    # LLM generation with Groq + grounding rules
│   └── routes/
│       ├── upload.js        # POST /api/upload — file upload + ingestion
│       ├── chat.js          # POST /api/chat — query + retrieval + generation
│       └── documents.js     # GET /api/documents — list uploaded docs
├── uploads/                 # Temporary file storage (gitignored)
├── .env.example             # Environment variables template
├── .gitignore
├── package.json
└── README.md
```

---

## 🚀 Local Setup

### Prerequisites

- Node.js 18+
- Groq API key (free at [console.groq.com](https://console.groq.com))
- Google AI API key (free at [ai.google.dev](https://ai.google.dev))
- Qdrant Cloud account (free tier available at [cloud.qdrant.io](https://cloud.qdrant.io))

### Steps

1. **Clone the repository**
   ```bash
   git clone https://github.com/Saniya1613/Google-NotebookLM-RAG.git
   cd Google-NotebookLM-RAG
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and add your keys:
   ```
   GROQ_API_KEY=gsk_your-groq-key-here
   GOOGLE_API_KEY=your-google-ai-key-here
   QDRANT_URL=https://your-cluster.cloud.qdrant.io
   QDRANT_API_KEY=your-qdrant-api-key
   PORT=3000
   ```

4. **Start the server**
   ```bash
   npm run dev
   ```

5. **Open in browser**
   ```
   http://localhost:3000
   ```

---

## 📡 API Endpoints

### `POST /api/upload`
Upload and ingest a PDF document.

**Request:** `multipart/form-data` with field `document` (PDF file)

**Response:**
```json
{
  "success": true,
  "message": "Document uploaded and indexed successfully",
  "document": {
    "id": "uuid",
    "name": "example.pdf",
    "collectionName": "doc_uuid",
    "chunkCount": 42,
    "pageCount": 10,
    "uploadedAt": "2026-05-10T..."
  }
}
```

### `POST /api/chat`
Ask a question about an uploaded document.

**Request:**
```json
{
  "documentId": "uuid",
  "query": "What is the main topic of this document?"
}
```

**Response:**
```json
{
  "success": true,
  "answer": "Based on the document...",
  "sources": [
    {
      "chunkIndex": 1,
      "page": 3,
      "preview": "The main topic discussed..."
    }
  ]
}
```

### `GET /api/documents`
List all uploaded documents.

### `GET /api/health`
Health check endpoint.

---

## 📝 License

MIT License — Saniya Sanjiv Patil
