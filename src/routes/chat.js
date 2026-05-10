/**
 * Chat Route
 * Handles user queries — retrieves relevant chunks and generates grounded answers
 */

import { Router } from "express";
import { retrieveChunks, documentExists } from "../rag/ingestion.js";
import { generateAnswer } from "../rag/generation.js";

const router = Router();

/**
 * POST /api/chat
 * Ask a question about an uploaded document
 * 
 * Body: { documentId: string, query: string }
 * Returns: { answer: string, sources: Array }
 */
router.post("/", async (req, res) => {
  try {
    const { documentId, query } = req.body;

    if (!documentId || !query) {
      return res.status(400).json({
        error: "Both 'documentId' and 'query' are required",
      });
    }

    if (!documentExists(documentId)) {
      return res.status(404).json({
        error: "Document not found. Please upload a document first.",
      });
    }

    console.log(`💬 Query for document ${documentId}: "${query}"`);

    // Step 1: Retrieve relevant chunks from the vector database
    const relevantChunks = await retrieveChunks(documentId, query, 4);

    console.log(`🔍 Retrieved ${relevantChunks.length} relevant chunks`);

    // Step 2: Generate a grounded answer using the retrieved context
    const { answer, sources } = await generateAnswer(query, relevantChunks);

    res.json({
      success: true,
      answer,
      sources,
    });
  } catch (error) {
    console.error("Chat error:", error);
    res.status(500).json({
      error: "Failed to generate answer",
      details: error.message,
    });
  }
});

export { router as chatRouter };
