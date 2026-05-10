/**
 * Generation Module
 * 
 * Uses Groq's LLM (llama-3.3-70b-versatile) to generate answers
 * grounded in retrieved document context.
 * The system prompt strictly instructs the LLM to answer ONLY from
 * the provided context, preventing hallucination.
 */

import Groq from "groq-sdk";

const client = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

/**
 * Generate a grounded answer using retrieved context chunks
 * 
 * @param {string} query - The user's question
 * @param {Array} contextChunks - Retrieved document chunks from the vector store
 * @returns {Object} - The generated answer and source references
 */
export async function generateAnswer(query, contextChunks) {
  // Format context chunks with page numbers for reference
  const formattedContext = contextChunks
    .map((chunk, i) => {
      const page = chunk.metadata?.loc?.pageNumber || chunk.metadata?.page || "Unknown";
      return `[Chunk ${i + 1} | Page ${page}]\n${chunk.pageContent}`;
    })
    .join("\n\n---\n\n");

  const systemPrompt = `You are an intelligent AI assistant that answers questions based EXCLUSIVELY on the provided document context. You are part of a NotebookLM-style RAG application.

STRICT RULES:
1. ONLY answer based on the context provided below from the uploaded document.
2. If the answer cannot be found in the context, explicitly say: "I couldn't find this information in the uploaded document."
3. NEVER use your general knowledge to answer — all answers must be grounded in the document.
4. When possible, reference the page number or section where you found the information.
5. Provide clear, well-structured answers with proper formatting.
6. If the question is ambiguous, interpret it in the context of the document.

DOCUMENT CONTEXT:
${formattedContext}`;

  const response = await client.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: query },
    ],
    temperature: 0.3, // Low temperature for more factual, grounded responses
    max_tokens: 1500,
  });

  const answer = response.choices[0].message.content;

  // Extract source references from the chunks
  const sources = contextChunks.map((chunk, i) => ({
    chunkIndex: i + 1,
    page: chunk.metadata?.loc?.pageNumber || chunk.metadata?.page || "Unknown",
    preview: chunk.pageContent.substring(0, 150) + "...",
  }));

  return { answer, sources };
}
