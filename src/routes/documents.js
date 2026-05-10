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
router.get("/", async (req, res) => {
  try {
    const documents = await getDocuments();
    res.json({ documents });
  } catch (error) {
    console.error("Error fetching documents:", error);
    res.json({ documents: [] });
  }
});

export { router as documentsRouter };
