/**
 * Documents Route
 * Lists all uploaded and indexed documents
 */

import { Router } from "express";
import { getDocuments } from "../rag/ingestion.js";

const router = Router();

/**
 * GET /api/documents
 * Returns all uploaded documents with their metadata
 */
router.get("/", (req, res) => {
  const documents = getDocuments();
  res.json({ documents });
});

export { router as documentsRouter };
