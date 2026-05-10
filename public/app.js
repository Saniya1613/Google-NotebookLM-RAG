/**
 * NotebookLM RAG — Frontend Application
 * 
 * Handles document upload, chat interaction, and UI state management.
 */

// ===========================
// DOM Elements
// ===========================
const dropzone = document.getElementById("dropzone");
const fileInput = document.getElementById("fileInput");
const uploadProgress = document.getElementById("uploadProgress");
const progressFill = document.getElementById("progressFill");
const progressText = document.getElementById("progressText");
const documentsList = document.getElementById("documentsList");
const emptyState = document.getElementById("emptyState");
const welcomeScreen = document.getElementById("welcomeScreen");
const messagesContainer = document.getElementById("messagesContainer");
const chatForm = document.getElementById("chatForm");
const chatInput = document.getElementById("chatInput");
const sendBtn = document.getElementById("sendBtn");
const headerTitle = document.getElementById("headerTitle");
const headerSubtitle = document.getElementById("headerSubtitle");
const headerBadge = document.getElementById("headerBadge");
const badgeText = document.getElementById("badgeText");
const menuToggle = document.getElementById("menuToggle");
const sidebar = document.getElementById("sidebar");

// ===========================
// State
// ===========================
let currentDocumentId = null;
let documents = [];
let isProcessing = false;

// ===========================
// File Upload
// ===========================

// Click to upload
dropzone.addEventListener("click", () => fileInput.click());

// File input change
fileInput.addEventListener("change", (e) => {
  if (e.target.files.length > 0) {
    handleFileUpload(e.target.files[0]);
  }
});

// Drag & drop events
dropzone.addEventListener("dragover", (e) => {
  e.preventDefault();
  dropzone.classList.add("drag-over");
});

dropzone.addEventListener("dragleave", () => {
  dropzone.classList.remove("drag-over");
});

dropzone.addEventListener("drop", (e) => {
  e.preventDefault();
  dropzone.classList.remove("drag-over");
  if (e.dataTransfer.files.length > 0) {
    handleFileUpload(e.dataTransfer.files[0]);
  }
});

/**
 * Handle file upload — send to server and trigger ingestion
 */
async function handleFileUpload(file) {
  if (file.type !== "application/pdf") {
    showNotification("Only PDF files are supported", "error");
    return;
  }

  if (isProcessing) {
    showNotification("Already processing a document, please wait", "warning");
    return;
  }

  isProcessing = true;

  // Show progress
  uploadProgress.classList.add("active");
  progressFill.style.width = "10%";
  progressText.textContent = "Uploading document...";

  const formData = new FormData();
  formData.append("document", file);

  try {
    progressFill.style.width = "30%";
    progressText.textContent = "Processing and chunking...";

    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    progressFill.style.width = "70%";
    progressText.textContent = "Generating embeddings...";

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Upload failed");
    }

    progressFill.style.width = "100%";
    progressText.textContent = "Indexing complete!";

    // Add document to the list
    documents.push(data.document);
    renderDocuments();
    selectDocument(data.document.id);

    showNotification(`"${data.document.name}" indexed successfully!`, "success");

    // Reset progress after a delay
    setTimeout(() => {
      uploadProgress.classList.remove("active");
      progressFill.style.width = "0%";
    }, 1500);
  } catch (error) {
    console.error("Upload error:", error);
    progressText.textContent = "Upload failed";
    progressFill.style.width = "0%";
    showNotification(error.message || "Failed to upload document", "error");

    setTimeout(() => {
      uploadProgress.classList.remove("active");
    }, 2000);
  } finally {
    isProcessing = false;
    fileInput.value = "";
  }
}

// ===========================
// Documents
// ===========================

function renderDocuments() {
  if (documents.length === 0) {
    emptyState.style.display = "flex";
    return;
  }

  emptyState.style.display = "none";

  // Clear existing doc items (keep empty state)
  const existingItems = documentsList.querySelectorAll(".doc-item");
  existingItems.forEach((item) => item.remove());

  documents.forEach((doc) => {
    const item = document.createElement("div");
    item.className = `doc-item ${doc.id === currentDocumentId ? "active" : ""}`;
    item.dataset.id = doc.id;
    item.innerHTML = `
      <div class="doc-icon">📄</div>
      <div class="doc-info">
        <div class="doc-name">${escapeHtml(doc.name)}</div>
        <div class="doc-meta">${doc.pageCount} pages · ${doc.chunkCount} chunks</div>
      </div>
    `;
    item.addEventListener("click", () => selectDocument(doc.id));
    documentsList.appendChild(item);
  });
}

function selectDocument(documentId) {
  currentDocumentId = documentId;
  const doc = documents.find((d) => d.id === documentId);

  if (doc) {
    // Update header
    headerTitle.textContent = doc.name;
    headerSubtitle.textContent = `${doc.pageCount} pages · ${doc.chunkCount} chunks indexed`;
    headerBadge.style.display = "flex";
    badgeText.textContent = "Ready";

    // Enable chat input
    chatInput.disabled = false;
    sendBtn.disabled = false;
    chatInput.placeholder = "Ask a question about your document...";

    // Switch to chat view
    welcomeScreen.style.display = "none";
    messagesContainer.style.display = "flex";

    // Update active state in sidebar
    document.querySelectorAll(".doc-item").forEach((item) => {
      item.classList.toggle("active", item.dataset.id === documentId);
    });

    chatInput.focus();
  }
}

// ===========================
// Chat
// ===========================

chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const query = chatInput.value.trim();
  if (!query || !currentDocumentId || isProcessing) return;

  isProcessing = true;
  chatInput.value = "";
  chatInput.style.height = "auto";
  sendBtn.disabled = true;

  // Add user message
  addMessage("user", query);

  // Add loading indicator
  const loadingId = addLoadingMessage();

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ documentId: currentDocumentId, query }),
    });

    const data = await response.json();

    // Remove loading indicator
    removeLoadingMessage(loadingId);

    if (!response.ok) {
      throw new Error(data.error || "Failed to generate answer");
    }

    // Add assistant message with sources
    addMessage("assistant", data.answer, data.sources);
  } catch (error) {
    removeLoadingMessage(loadingId);
    addMessage("assistant", `⚠️ Error: ${error.message}`);
  } finally {
    isProcessing = false;
    sendBtn.disabled = false;
    chatInput.focus();
  }
});

// Auto-resize textarea
chatInput.addEventListener("input", () => {
  chatInput.style.height = "auto";
  chatInput.style.height = Math.min(chatInput.scrollHeight, 120) + "px";
});

// Submit on Enter (Shift+Enter for new line)
chatInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    chatForm.dispatchEvent(new Event("submit"));
  }
});

// ===========================
// Message Rendering
// ===========================

function addMessage(role, content, sources = null) {
  const messageEl = document.createElement("div");
  messageEl.className = `message ${role}`;

  const avatar = role === "user" ? "👤" : "🧠";
  const roleName = role === "user" ? "You" : "NotebookLM";

  let sourcesHtml = "";
  if (sources && sources.length > 0) {
    sourcesHtml = `
      <div class="message-sources">
        <div class="sources-title">📚 Sources</div>
        ${sources
          .map(
            (s) => `
          <div class="source-item">
            <span class="source-badge">Page ${s.page}</span>
            <span class="source-preview">${escapeHtml(s.preview)}</span>
          </div>
        `
          )
          .join("")}
      </div>
    `;
  }

  messageEl.innerHTML = `
    <div class="message-avatar">${avatar}</div>
    <div class="message-content">
      <div class="message-role">${roleName}</div>
      <div class="message-text">${formatMessage(content)}</div>
      ${sourcesHtml}
    </div>
  `;

  messagesContainer.appendChild(messageEl);
  scrollToBottom();
}

function addLoadingMessage() {
  const id = "loading-" + Date.now();
  const messageEl = document.createElement("div");
  messageEl.className = "message assistant";
  messageEl.id = id;
  messageEl.innerHTML = `
    <div class="message-avatar">🧠</div>
    <div class="message-content">
      <div class="message-role">NotebookLM</div>
      <div class="typing-indicator">
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
      </div>
    </div>
  `;
  messagesContainer.appendChild(messageEl);
  scrollToBottom();
  return id;
}

function removeLoadingMessage(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
}

// ===========================
// Utilities
// ===========================

function formatMessage(text) {
  // Basic markdown-like formatting
  let html = escapeHtml(text);

  // Bold: **text**
  html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

  // Inline code: `code`
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");

  // Code blocks: ```code```
  html = html.replace(/```(\w*)\n?([\s\S]*?)```/g, "<pre><code>$2</code></pre>");

  // Line breaks
  html = html.replace(/\n/g, "<br>");

  // Bullet lists
  html = html.replace(/((?:^|\n)- .+(?:\n|$))+/g, (match) => {
    const items = match
      .split("\n")
      .filter((line) => line.startsWith("- "))
      .map((line) => `<li>${line.substring(2)}</li>`)
      .join("");
    return `<ul>${items}</ul>`;
  });

  // Numbered lists
  html = html.replace(/((?:^|\n)\d+\. .+(?:\n|$))+/g, (match) => {
    const items = match
      .split("\n")
      .filter((line) => /^\d+\. /.test(line))
      .map((line) => `<li>${line.replace(/^\d+\. /, "")}</li>`)
      .join("");
    return `<ol>${items}</ol>`;
  });

  return html;
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function scrollToBottom() {
  const chatArea = document.getElementById("chatArea");
  chatArea.scrollTop = chatArea.scrollHeight;
}

function showNotification(message, type = "info") {
  // Create a simple notification
  const notification = document.createElement("div");
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 12px 20px;
    border-radius: 12px;
    font-size: 14px;
    font-family: 'Inter', sans-serif;
    font-weight: 500;
    z-index: 1000;
    animation: slideUp 0.4s ease;
    backdrop-filter: blur(16px);
    border: 1px solid;
  `;

  const colors = {
    success: { bg: "rgba(52, 211, 153, 0.15)", border: "rgba(52, 211, 153, 0.3)", color: "#34d399" },
    error: { bg: "rgba(248, 113, 113, 0.15)", border: "rgba(248, 113, 113, 0.3)", color: "#f87171" },
    warning: { bg: "rgba(251, 191, 36, 0.15)", border: "rgba(251, 191, 36, 0.3)", color: "#fbbf24" },
    info: { bg: "rgba(129, 140, 248, 0.15)", border: "rgba(129, 140, 248, 0.3)", color: "#818cf8" },
  };

  const c = colors[type] || colors.info;
  notification.style.background = c.bg;
  notification.style.borderColor = c.border;
  notification.style.color = c.color;
  notification.textContent = message;

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.opacity = "0";
    notification.style.transform = "translateY(-10px)";
    notification.style.transition = "all 0.3s ease";
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// ===========================
// Mobile Sidebar Toggle
// ===========================

menuToggle.addEventListener("click", () => {
  sidebar.classList.toggle("open");

  // Create/remove overlay
  let overlay = document.querySelector(".sidebar-overlay");
  if (sidebar.classList.contains("open")) {
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.className = "sidebar-overlay active";
      overlay.addEventListener("click", () => {
        sidebar.classList.remove("open");
        overlay.remove();
      });
      document.body.appendChild(overlay);
    }
  } else if (overlay) {
    overlay.remove();
  }
});

// ===========================
// Initialize
// ===========================

console.log("🧠 NotebookLM RAG initialized");
