/**
 * Document Ingestion Pipeline (Stateless / Serverless-compatible)
 * 
 * This module handles the full ingestion process:
 * 1. Load PDF/Text documents
 * 2. Chunk documents using Recursive Character Text Splitting
 * 3. Generate embeddings using Google Gemini gemini-embedding-001
 * 4. Store embeddings in Qdrant vector database
 * 
 * Chunking Strategy: RecursiveCharacterTextSplitter
 * -------------------------------------------------
 * We use RecursiveCharacterTextSplitter because it:
 * - Splits text hierarchically using separators: ["\n\n", "\n", " ", ""]
 * - Preserves paragraph and sentence boundaries when possible
 * - Creates semantically coherent chunks (not arbitrary cuts)
 * - Maintains context with configurable overlap between chunks
 * 
 * Configuration:
 * - chunkSize: 1000 characters — balances context richness with retrieval precision
 * - chunkOverlap: 200 characters — ensures no information is lost at chunk boundaries
 * 
 * Note: This module is fully stateless — document metadata is stored inside
 * Qdrant alongside the vectors, so it works in serverless environments (Vercel).
 */

import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { QdrantVectorStore } from "@langchain/qdrant";
import { QdrantClient } from "@qdrant/js-client-rest";
import { v4 as uuidv4 } from "uuid";
import { getEmbeddings } from "./embeddings.js";

/**
 * Get a Qdrant REST client for direct collection operations
 */
function getQdrantClient() {
  return new QdrantClient({
    url: process.env.QDRANT_URL,
    apiKey: process.env.QDRANT_API_KEY,
  });
}

/**
 * Get or create a Qdrant vector store for a specific collection
 */
async function getVectorStore(collectionName) {
  const embeddings = getEmbeddings();
  return await QdrantVectorStore.fromExistingCollection(embeddings, {
    url: process.env.QDRANT_URL,
    apiKey: process.env.QDRANT_API_KEY,
    collectionName,
  });
}

/**
 * Ingest a PDF document into the RAG pipeline
 * 
 * @param {string} filePath - Path to the uploaded PDF file
 * @param {string} originalName - Original filename for display
 * @returns {Object} - Document metadata including ID, chunk count, and collection name
 */
export async function ingestDocument(filePath, originalName) {
  const documentId = uuidv4();
  const collectionName = `doc_${documentId.replace(/-/g, "_")}`;

  console.log(`📄 Loading document: ${originalName}`);

  // Step 1: Load the PDF document
  const loader = new PDFLoader(filePath);
  const rawDocs = await loader.load();

  console.log(`📖 Loaded ${rawDocs.length} pages from PDF`);

  // Step 2: Chunk the document using RecursiveCharacterTextSplitter
  // This strategy splits text hierarchically, preserving semantic boundaries
  const textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,     // Each chunk contains up to 1000 characters
    chunkOverlap: 200,   // 200 character overlap to maintain context between chunks
    separators: ["\n\n", "\n", ". ", " ", ""],  // Split priority: paragraphs > lines > sentences > words
  });

  const chunks = await textSplitter.splitDocuments(rawDocs);

  console.log(`✂️  Split into ${chunks.length} chunks`);

  // Add document metadata to each chunk for traceability
  const enrichedChunks = chunks.map((chunk, index) => ({
    ...chunk,
    metadata: {
      ...chunk.metadata,
      documentId,
      documentName: originalName,
      chunkIndex: index,
      totalChunks: chunks.length,
      pageCount: rawDocs.length,
    },
  }));

  // Step 3 & 4: Embed and store chunks in Qdrant vector database
  console.log(`🔢 Generating embeddings and storing in Qdrant...`);

  const embeddings = getEmbeddings();
  await QdrantVectorStore.fromDocuments(enrichedChunks, embeddings, {
    url: process.env.QDRANT_URL,
    apiKey: process.env.QDRANT_API_KEY,
    collectionName,
  });

  // Build document info from the data we just stored
  const docInfo = {
    id: documentId,
    name: originalName,
    collectionName,
    chunkCount: chunks.length,
    pageCount: rawDocs.length,
    uploadedAt: new Date().toISOString(),
  };

  console.log(`✅ Indexing complete! ${chunks.length} chunks stored in collection: ${collectionName}`);

  return docInfo;
}

/**
 * Retrieve relevant chunks for a user query from a specific document
 * 
 * @param {string} documentId - The document to search within
 * @param {string} query - The user's natural language question
 * @param {number} k - Number of top relevant chunks to retrieve (default: 4)
 * @returns {Array} - Top-k most relevant document chunks
 */
export async function retrieveChunks(documentId, query, k = 4) {
  // Derive collection name from document ID (stateless — no registry needed)
  const collectionName = `doc_${documentId.replace(/-/g, "_")}`;

  const vectorStore = await getVectorStore(collectionName);
  const retriever = vectorStore.asRetriever({ k });
  const relevantChunks = await retriever.invoke(query);

  return relevantChunks;
}

/**
 * Get all documents by querying Qdrant collections directly.
 * This is stateless — works across serverless function invocations.
 */
export async function getDocuments() {
  try {
    const client = getQdrantClient();
    const { collections } = await client.getCollections();

    const docs = [];
    for (const col of collections) {
      if (col.name.startsWith("doc_")) {
        try {
          // Retrieve one point to extract document metadata
          const result = await client.scroll(col.name, { limit: 1, with_payload: true });
          if (result.points && result.points.length > 0) {
            const meta = result.points[0].payload?.metadata || {};
            docs.push({
              id: meta.documentId || col.name.replace("doc_", "").replace(/_/g, "-"),
              name: meta.documentName || col.name,
              collectionName: col.name,
              chunkCount: meta.totalChunks || 0,
              pageCount: meta.pageCount || 0,
            });
          }
        } catch (e) {
          // Skip collections we can't read
        }
      }
    }
    return docs;
  } catch (error) {
    console.error("Error fetching documents:", error.message);
    return [];
  }
}

/**
 * Check if a document exists by verifying its Qdrant collection
 */
export async function documentExists(documentId) {
  try {
    const client = getQdrantClient();
    const collectionName = `doc_${documentId.replace(/-/g, "_")}`;
    await client.getCollection(collectionName);
    return true;
  } catch {
    return false;
  }
}
