/**
 * Upload Route
 * Handles PDF file upload and triggers the RAG ingestion pipeline.
 * Uses /tmp for file storage on serverless (Vercel) and ./uploads locally.
 */

import { Router } from "express";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { ingestDocument } from "../rag/ingestion.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();

// Use /tmp on serverless (Vercel), ./uploads locally
const uploadDir = process.env.VERCEL ? "/tmp" : path.join(__dirname, "../../uploads");

// Ensure upload directory exists
if (!process.env.VERCEL) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for PDF file uploads
const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + "-" + file.originalname);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are supported"), false);
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit (Vercel-friendly)
});

/**
 * POST /api/upload
 * Upload a PDF document and ingest it into the RAG pipeline
 */
router.post("/", upload.single("document"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No PDF file uploaded" });
    }

    console.log(`📤 Received file: ${req.file.originalname} (${(req.file.size / 1024).toFixed(1)} KB)`);

    const docInfo = await ingestDocument(req.file.path, req.file.originalname);

    // Clean up the uploaded file after processing
    try {
      fs.unlinkSync(req.file.path);
    } catch (e) {
      // Ignore cleanup errors
    }

    res.json({
      success: true,
      message: "Document uploaded and indexed successfully",
      document: docInfo,
    });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({
      error: "Failed to process document",
      details: error.message,
    });
  }
});

export { router as uploadRouter };
