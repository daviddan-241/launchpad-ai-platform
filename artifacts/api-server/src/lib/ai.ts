import Groq from "groq-sdk";
import { logger } from "./logger";

let groqClient: Groq | null = null;

export function getGroqClient(): Groq {
  if (!groqClient) {
    const apiKey = process.env.GROQ_API_KEY || process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("No AI API key configured. Set GROQ_API_KEY.");
    }
    groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY || "" });
  }
  return groqClient;
}

export async function chatCompletion(
  messages: Array<{ role: "user" | "assistant" | "system"; content: string }>,
  systemPrompt?: string
): Promise<string> {
  try {
    const client = getGroqClient();
    const allMessages = systemPrompt
      ? [{ role: "system" as const, content: systemPrompt }, ...messages]
      : messages;

    const response = await client.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: allMessages,
      max_tokens: 8192,
    });

    return response.choices[0]?.message?.content ?? "";
  } catch (err) {
    logger.error({ err }, "AI completion failed");
    throw err;
  }
}

export async function generateText(prompt: string, systemPrompt?: string): Promise<string> {
  return chatCompletion([{ role: "user", content: prompt }], systemPrompt);
}
