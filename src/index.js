import "dotenv/config";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { uploadRouter } from "./routes/upload.js";
import { chatRouter } from "./routes/chat.js";
import { documentsRouter } from "./routes/documents.js";
import { preloadEmbeddingModel } from "./rag/embeddings.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files
app.use(express.static(path.join(__dirname, "../public")));

// API Routes
app.use("/api/upload", uploadRouter);
app.use("/api/chat", chatRouter);
app.use("/api/documents", documentsRouter);

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "NotebookLM RAG server is running" });
});

// Serve index.html for all other routes (SPA fallback)
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/index.html"));
});

// Start server and preload embedding model
app.listen(PORT, async () => {
  console.log(`🧠 NotebookLM RAG server running at http://localhost:${PORT}`);
  
  // Preload the local embedding model so first upload is faster
  try {
    await preloadEmbeddingModel();
  } catch (err) {
    console.warn("⚠️ Could not preload embedding model:", err.message);
  }
});
