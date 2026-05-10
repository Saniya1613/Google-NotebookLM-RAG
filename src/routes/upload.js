/**
 * Upload Route
 * Handles PDF file upload and triggers the RAG ingestion pipeline
 */

import { Router } from "express";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import { ingestDocument } from "../rag/ingestion.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();

// Configure multer for PDF file uploads
const storage = multer.diskStorage({
  destination: path.join(__dirname, "../../uploads"),
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
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB limit
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
