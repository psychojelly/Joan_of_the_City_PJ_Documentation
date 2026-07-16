// Docs chat endpoint — answers questions about the Joan of the City project
// using the documentation site's own pages as its only knowledge.
//
// Deploy notes (see README → Docs chat):
//   - Requires the ANTHROPIC_API_KEY environment variable (set in Vercel).
//   - Optional: CHAT_PASSCODE (shared passphrase gate), CHAT_MODEL (default
//     claude-opus-4-8 — switch to e.g. claude-haiku-4-5 to trade quality for cost).
//   - Knowledge comes from api/_docs-context.json, generated from the HTML pages
//     by scripts/build-context.mjs (re-run after editing pages; deploy also runs it).
//
// The system prompt (instructions + full docs text) is cached with
// cache_control, so repeat questions only pay for the delta.

import Anthropic from "@anthropic-ai/sdk";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const MODEL = process.env.CHAT_MODEL || "claude-opus-4-8";
const MAX_QUESTION_CHARS = 2000;
const MAX_HISTORY_TURNS = 12; // user+assistant messages kept from the client
const MAX_TOKENS = 2048; // deliberately short — docs answers, not essays

// --- knowledge base (bundled with the function) ---------------------------
const { context: DOCS_CONTEXT } = JSON.parse(
  readFileSync(join(process.cwd(), "api", "_docs-context.json"), "utf8"),
);

const SYSTEM = [
  {
    type: "text",
    text:
      `You are the documentation assistant for "Joan of the City", an augmented-reality ` +
      `opera built in Unity for XR glasses by Psychojelly. Visitors to the documentation ` +
      `site ask you questions about the project.\n\n` +
      `Rules:\n` +
      `- Answer ONLY from the documentation provided below. If the docs don't cover it, ` +
      `say so plainly and suggest which page comes closest — never invent details.\n` +
      `- Keep answers short and concrete; link pages by name (e.g. "see System Overview").\n` +
      `- Technical message contracts and credentials are deliberately not in these docs; ` +
      `if asked for them, say they live with the development team.\n` +
      `- Stay on topic. For questions unrelated to this project, say you only cover ` +
      `the Joan of the City documentation.\n\n` +
      `THE DOCUMENTATION:\n${DOCS_CONTEXT}`,
    cache_control: { type: "ephemeral" },
  },
];

// --- tiny per-instance rate limit ------------------------------------------
const hits = new Map(); // ip -> [timestamps]
function rateLimited(ip) {
  const now = Date.now();
  const windowMs = 60_000, max = 10;
  const list = (hits.get(ip) || []).filter((t) => now - t < windowMs);
  list.push(now);
  hits.set(ip, list);
  if (hits.size > 5000) hits.clear(); // crude memory bound
  return list.length > max;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "POST only" });
    return;
  }

  const passcode = process.env.CHAT_PASSCODE;
  if (passcode && req.headers["x-chat-code"] !== passcode) {
    res.status(401).json({ error: "passcode required" });
    return;
  }

  const ip =
    (req.headers["x-forwarded-for"] || "").split(",")[0].trim() || "unknown";
  if (rateLimited(ip)) {
    res.status(429).json({ error: "Too many requests — wait a minute." });
    return;
  }

  const { question, history } = req.body || {};
  if (typeof question !== "string" || !question.trim()) {
    res.status(400).json({ error: "question required" });
    return;
  }
  if (question.length > MAX_QUESTION_CHARS) {
    res.status(400).json({ error: "question too long" });
    return;
  }

  // Sanitize client-supplied history: alternating {role, content} strings only.
  const messages = [];
  if (Array.isArray(history)) {
    for (const m of history.slice(-MAX_HISTORY_TURNS)) {
      if (
        m && (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string" && m.content.length <= 8000
      ) {
        messages.push({ role: m.role, content: m.content });
      }
    }
  }
  messages.push({ role: "user", content: question.trim() });

  const client = new Anthropic(); // ANTHROPIC_API_KEY from env

  res.writeHead(200, {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
  });

  try {
    const stream = client.messages.stream({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: SYSTEM,
      messages,
    });

    stream.on("text", (delta) => {
      res.write(`data: ${JSON.stringify({ text: delta })}\n\n`);
    });

    const final = await stream.finalMessage();
    res.write(`data: ${JSON.stringify({ done: true, stop: final.stop_reason })}\n\n`);
  } catch (err) {
    let msg = "Something went wrong — try again.";
    if (err instanceof Anthropic.AuthenticationError) {
      msg = "Chat is not configured on this deployment (missing API key).";
    } else if (err instanceof Anthropic.RateLimitError) {
      msg = "The assistant is busy — try again in a moment.";
    } else if (err instanceof Anthropic.APIError) {
      msg = `Assistant error (${err.status}).`;
    }
    res.write(`data: ${JSON.stringify({ error: msg })}\n\n`);
  }
  res.end();
}
