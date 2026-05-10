/**
 * Local Development Entry Point
 * Imports the Express app and starts the server on the configured port.
 */

import "dotenv/config";
import app from "./app.js";

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🧠 NotebookLM RAG server running at http://localhost:${PORT}`);
});
