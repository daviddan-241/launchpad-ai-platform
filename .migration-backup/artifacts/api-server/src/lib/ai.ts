import Groq from "groq-sdk";
import { logger } from "./logger";

// ─── Ollama (local, free, private) ───────────────────────────────────────────
// Set OLLAMA_BASE_URL env var to use Ollama. Best model under 600 MB:
//   ollama pull qwen2.5:0.5b   (397 MB — fast, smart enough for sales tasks)
// Then: ollama serve  →  set OLLAMA_BASE_URL=http://localhost:11434

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? "qwen2.5:0.5b";
const USE_OLLAMA = Boolean(process.env.OLLAMA_BASE_URL);

async function ollamaChat(messages: Array<{ role: string; content: string }>): Promise<string> {
  const res = await fetch(`${OLLAMA_BASE_URL}/v1/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: OLLAMA_MODEL, messages, stream: false }),
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Ollama ${res.status}: ${text.slice(0, 200)}`);
  }
  const json = await res.json() as { choices: Array<{ message: { content: string } }> };
  return json.choices[0]?.message?.content ?? "";
}

// ─── Groq (cloud, free tier, fast) ───────────────────────────────────────────

let groqClient: Groq | null = null;
function getGroqClient(): Groq {
  if (!groqClient) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new Error("No AI configured. Set GROQ_API_KEY or OLLAMA_BASE_URL.");
    groqClient = new Groq({ apiKey });
  }
  return groqClient;
}

const GROQ_MODEL = "llama-3.3-70b-versatile";

async function groqChat(messages: Array<{ role: "user" | "assistant" | "system"; content: string }>): Promise<string> {
  const client = getGroqClient();
  const response = await client.chat.completions.create({ model: GROQ_MODEL, messages, max_tokens: 8192 });
  return response.choices[0]?.message?.content ?? "";
}

// ─── Public ───────────────────────────────────────────────────────────────────

export function getAIProvider(): { name: string; model: string; local: boolean } {
  if (USE_OLLAMA) return { name: "Ollama", model: OLLAMA_MODEL, local: true };
  return { name: "Groq", model: GROQ_MODEL, local: false };
}

export async function chatCompletion(
  messages: Array<{ role: "user" | "assistant" | "system"; content: string }>,
  systemPrompt?: string,
): Promise<string> {
  const all = systemPrompt
    ? [{ role: "system" as const, content: systemPrompt }, ...messages]
    : messages;

  if (USE_OLLAMA) {
    try {
      return await ollamaChat(all);
    } catch (err) {
      logger.warn({ err }, "Ollama failed — falling back to Groq");
    }
  }

  try {
    return await groqChat(all as Array<{ role: "user" | "assistant" | "system"; content: string }>);
  } catch (err) {
    logger.error({ err }, "AI completion failed");
    throw err;
  }
}

export async function generateText(prompt: string, systemPrompt?: string): Promise<string> {
  return chatCompletion([{ role: "user", content: prompt }], systemPrompt);
}
