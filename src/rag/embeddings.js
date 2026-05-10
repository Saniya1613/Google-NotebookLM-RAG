/**
 * Embeddings Module
 * 
 * Uses Google Gemini's text-embedding-004 model for generating embeddings.
 * This is a free, cloud-based embedding service that provides:
 * - High-quality 768-dimensional embeddings
 * - Fast response times with no local model download
 * - Free tier: 1,500 requests/day (more than enough for this app)
 * 
 * Model: text-embedding-004
 * Dimensions: 768
 */

import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";

/**
 * Get the configured Google Gemini embeddings instance.
 * This is a LangChain-compatible embeddings class that works
 * seamlessly with Qdrant vector store.
 */
export function getEmbeddings() {
  return new GoogleGenerativeAIEmbeddings({
    apiKey: process.env.GOOGLE_API_KEY,
    model: "text-embedding-004",
  });
}
