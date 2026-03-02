
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

const GROQ_MODEL = "llama-3.3-70b-versatile";

/* ── 2. SYSTEM / CONTEXT PROMPT ─────────────────────────────────────────── */

const SYSTEM_CONTEXT = `
You are a portfolio support assistant representing Jam professionally.

WHO YOU ARE:
- You are Jam's AI assistant, here to answer questions about Jam's background,
  skills, experience, and work.

WHO JAM IS:
- Jam is a System Automation Engineer specializing in building intelligent workflows that scale businesses.
- Jam specializes in no-code/low-code automation systems, CRM development, and process optimization to eliminate manual work and drive revenue.
- Jam focuses on clean logic, stable integrations, and documentation to ensure systems remain maintainable.

WHAT YOU KNOW ABOUT JAM:
- Portfolio: https://james-tercenio-portfolio.vercel.app/
- Core Tech Stack & Proficiency:
    - Zapier / Make: 92% (Complex webhooks, routers, error handling)
    - Airtable CRM: 99% (Custom builds, permissions, views, and automations)
    - Jotform: 88% (Conditional logic, file uploads, data capture)
    - Google Apps Script: 86% (Sheets/Docs automation)
    - GoHighLevel: 75% (CRM & Funnel automation)
    - JavaScript / HTML: 70% (Custom utilities, dashboards, and mini-games)
    - SOP Documentation: 95% (Scaling-ready handoffs)
- Key Featured Projects:
    - End-to-End Property Sourcing CRM: A centralized Airtable system for real estate investors that automates investor onboarding, NDA tracking, and segmented deal broadcasting via GHL.
    - Modular Zapier Architecture: A scalable system using shared webhooks and sub-zaps to handle multiple workflows without duplication.
    - Lightweight Airtable CRM: A custom-built CRM providing essential functionality without the bloat of traditional platforms.
    - Tiered Access System: Automated segmentation based on subscription levels (VIP vs. Standard).
    - Jotform to Airtable Dynamic Sync: Advanced form submissions with hidden fields and conditional logic.
    - Automated Asset Packaging: A system using Google Sheets and JS to dynamically name and deliver email assets, reducing manual packaging time to zero.
- Games & Utilities:
    - Web-based browser games using HTML5 Canvas and JavaScript (Bark of Survival v1/v2, Freeworm.io).
    - Classic Logic Games: Yatzy, Memory Game, Tic Tac Toe, Rock-Paper-Scissors.
    - Utilities: SynthCalc, Barcode Generator, Currency Converter (Coinage).
- Contact: Use the "Let's Work Together" form on the portfolio for inquiries.

BEHAVIOUR RULES:
- Always respond in a friendly, concise, and professional tone.
- If you do not know something specific about Jam, say so honestly and suggest
  the visitor reaches out directly.
- Never invent facts about Jam that are not provided above.
- Keep answers short unless detail is explicitly requested.
`.trim();

/* ── 3. CONVERSATION MEMORY ─────────────────────────────────────────────── */

// System message is always first and never removed.
const conversationHistory = [
  { role: "system", content: SYSTEM_CONTEXT },
];

/* ── 4. GROQ API CALL ────────────────────────────────────────────────────── */

async function getGroqReply(userMessage) {
  conversationHistory.push({ role: "user", content: userMessage });

  const payload = {
    model: GROQ_MODEL,
    messages: conversationHistory,
    temperature: 0.7,
    max_tokens: 512,
    stream: false,
  };

  // [UPDATED] Call your Vercel serverless function (e.g., api/chat.js)
  // This keeps the API key secure on the backend.
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message || `API error ${response.status}`);
  }

  const data = await response.json();
  const replyText = data?.choices?.[0]?.message?.content || "Sorry, I couldn't generate a response.";

  conversationHistory.push({ role: "assistant", content: replyText });
  return replyText;
}

/* ── 5. DOM REFERENCES ───────────────────────────────────────────────────── */

const chatToggle = document.getElementById("chat-toggle");
const chatPanel = document.getElementById("chat-panel");
const chatMessages = document.getElementById("chat-messages");
const chatInput = document.getElementById("chat-input");
const sendBtn = document.getElementById("send-btn");
const typingIndicator = document.getElementById("typing-indicator");
const iconOpen = document.getElementById("icon-open");
const iconClose = document.getElementById("icon-close");

/* ── 6. UI HELPERS ───────────────────────────────────────────────────────── */

function appendMessage(text, role) {
  const bubble = document.createElement("div");
  bubble.classList.add("msg", role);
  bubble.textContent = text;
  chatMessages.appendChild(bubble);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function setTyping(visible) {
  typingIndicator.style.display = visible ? "flex" : "none";
  if (visible) chatMessages.scrollTop = chatMessages.scrollHeight;
}

function setInputLocked(locked) {
  chatInput.disabled = locked;
  sendBtn.disabled = locked;
}

/* ── 7. TOGGLE PANEL ─────────────────────────────────────────────────────── */

let panelOpen = false;

function openPanel() {
  panelOpen = true;
  chatPanel.classList.add("open");
  chatPanel.setAttribute("aria-hidden", "false");
  iconOpen.style.display = "none";
  iconClose.style.display = "block";
  chatInput.focus();
  if (chatMessages.children.length === 0) {
    appendMessage("Hi! I'm Jam's assistant. Ask me anything about Jam's work, skills, or availability!", "bot");
  }
}

function closePanel() {
  panelOpen = false;
  chatPanel.classList.remove("open");
  chatPanel.setAttribute("aria-hidden", "true");
  iconOpen.style.display = "block";
  iconClose.style.display = "none";
}

chatToggle.addEventListener("click", () => {
  panelOpen ? closePanel() : openPanel();
});

/* ── 8. SEND MESSAGE FLOW ────────────────────────────────────────────────── */

async function handleSend() {
  const text = chatInput.value.trim();
  if (!text) return;

  appendMessage(text, "user");
  chatInput.value = "";
  setInputLocked(true);
  setTyping(true);

  try {
    const reply = await getGroqReply(text);
    setTyping(false);
    appendMessage(reply, "bot");
  } catch (err) {
    setTyping(false);
    appendMessage("Error: " + err.message, "error");
    console.error("[SupportBot] Groq error:", err);
  } finally {
    setInputLocked(false);
    chatInput.focus();
  }
}

sendBtn.addEventListener("click", handleSend);

chatInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    handleSend();
  }
});

/* ── 9. EXTENSION POINTS ─────────────────────────────────────────────────── */
// [EXTEND] Dark mode:         document.body.dataset.theme = "dark";
// [EXTEND] Analytics:         trackEvent("chat_message_sent");
// [EXTEND] Persistence:       localStorage.setItem("chatHistory", JSON.stringify(conversationHistory));
// [EXTEND] Faster model:      Change GROQ_MODEL to "llama-3.1-8b-instant"
// [EXTEND] Streaming:         Set stream: true and handle ReadableStream