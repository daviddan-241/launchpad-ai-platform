const GEMINI_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? "";
const GEMINI_MODEL = process.env.EXPO_PUBLIC_GEMINI_MODEL ?? "gemini-1.5-flash";
const GROQ_KEY = process.env.EXPO_PUBLIC_GROQ_API_KEY ?? "";
const GROQ_MODEL = process.env.EXPO_PUBLIC_GROQ_MODEL ?? "llama-3.1-8b-instant";

export async function askAI(params: {
  system: string;
  prompt: string;
  maxTokens?: number;
}): Promise<string> {
  const { system, prompt, maxTokens = 400 } = params;

  if (GEMINI_KEY) {
    try {
      const resp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: system }] },
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.5, maxOutputTokens: maxTokens },
          }),
        },
      );
      if (resp.ok) {
        const d = (await resp.json()) as {
          candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
        };
        const text = d.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (text) return text;
      }
    } catch { /* fall through */ }
  }

  if (GROQ_KEY) {
    try {
      const resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${GROQ_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: GROQ_MODEL,
          messages: [{ role: "system", content: system }, { role: "user", content: prompt }],
          temperature: 0.5,
          max_tokens: maxTokens,
        }),
      });
      if (resp.ok) {
        const d = (await resp.json()) as {
          choices?: Array<{ message?: { content?: string } }>;
        };
        const text = d.choices?.[0]?.message?.content?.trim();
        if (text) return text;
      }
    } catch { /* fall through */ }
  }

  return "I need an AI API key to respond. Please set EXPO_PUBLIC_GEMINI_API_KEY or EXPO_PUBLIC_GROQ_API_KEY in your environment.";
}

export const LEADFORGE_SYSTEM = `You are LeadForge AI, a senior B2B sales assistant and revenue intelligence expert.
You help with: lead qualification, outreach personalization, objection handling, pipeline strategy, and sales coaching.
Be concise, actionable, and direct. Use bullet points when listing steps. Max 3-4 sentences for simple questions.`;
