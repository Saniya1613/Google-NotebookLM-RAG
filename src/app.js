/**
 * Express Application (separated from server for Vercel compatibility)
 * 
 * This module creates and configures the Express app without starting
 * the server. This allows:
 * - Local development: index.js imports this and calls app.listen()
 * - Vercel deployment: api/index.js imports and exports this as a serverless function
 */

import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { uploadRouter } from "./routes/upload.js";
import { chatRouter } from "./routes/chat.js";
import { documentsRouter } from "./routes/documents.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

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

export default app;
