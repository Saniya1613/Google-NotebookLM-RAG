/**
 * Local Embeddings using Hugging Face Transformers.js
 * 
 * Uses the all-MiniLM-L6-v2 model (~23MB) to generate embeddings locally.
 * This runs entirely on the server — no API key or external service needed.
 * 
 * Model: Xenova/all-MiniLM-L6-v2
 * Dimensions: 384
 * Why: Lightweight, fast, and produces high-quality sentence embeddings
 */

import { Embeddings } from "@langchain/core/embeddings";
import { pipeline } from "@xenova/transformers";

let embeddingPipeline = null;

/**
 * Initialize the embedding model (downloads on first run, cached after)
 */
async function getEmbeddingPipeline() {
  if (!embeddingPipeline) {
    console.log("🔄 Loading local embedding model (first time may take a moment)...");
    embeddingPipeline = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
    console.log("✅ Embedding model loaded successfully");
  }
  return embeddingPipeline;
}

/**
 * Generate embeddings for an array of texts using the local model
 */
async function generateEmbeddings(texts) {
  const pipe = await getEmbeddingPipeline();
  const results = [];

  for (const text of texts) {
    const output = await pipe(text, { pooling: "mean", normalize: true });
    results.push(Array.from(output.data));
  }

  return results;
}

/**
 * LangChain-compatible Embeddings class using local Transformers.js
 * This integrates seamlessly with LangChain's vector stores (Qdrant, etc.)
 */
export class LocalEmbeddings extends Embeddings {
  constructor() {
    super({});
  }

  /**
   * Embed multiple documents — used during ingestion
   */
  async embedDocuments(documents) {
    return await generateEmbeddings(documents);
  }

  /**
   * Embed a single query — used during retrieval
   */
  async embedQuery(text) {
    const [embedding] = await generateEmbeddings([text]);
    return embedding;
  }
}

/**
 * Preload the model (call during server startup to avoid first-request delay)
 */
export async function preloadEmbeddingModel() {
  await getEmbeddingPipeline();
}
