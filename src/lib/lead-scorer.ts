// Lead scoring — AI rates each prospect 1-10 based on their replies.
// Called automatically after every inbound message. Gemini primary, Groq fallback.

import { updateStore } from "@/lib/store";

type Message = { role: "assistant" | "user"; content: string; sentAt: string };

type ScoreResult = {
  score: number;         // 1–10
  reason: string;        // ≤ 20-word plain-English explanation
  signals: string[];     // e.g. ["asked about pricing", "replied within 2h"]
  urgency: "low" | "medium" | "high";
};

async function callAI(prompt: string): Promise<string> {
  const geminiKey = process.env.GEMINI_API_KEY;
  const geminiModel = process.env.GEMINI_MODEL || "gemini-1.5-flash";

  if (geminiKey) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.2, responseMimeType: "application/json" },
          }),
        },
      );
      if (res.ok) {
        const d = (await res.json()) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
        const t = d.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
        if (t) return t;
      }
    } catch { /* fall to Groq */ }
  }

  const groqKey = process.env.GROQ_API_KEY;
  const groqModel = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
  if (groqKey) {
    try {
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${groqKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: groqModel,
          temperature: 0.2,
          response_format: { type: "json_object" },
          messages: [{ role: "user", content: prompt }],
        }),
      });
      if (res.ok) {
        const d = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
        const t = d.choices?.[0]?.message?.content?.trim() ?? "";
        if (t) return t;
      }
    } catch { /* ignore */ }
  }
  return "";
}

export async function scoreLeadFromHistory(history: Message[]): Promise<ScoreResult> {
  const transcript = history
    .map((m) => `${m.role === "assistant" ? "YOU" : "PROSPECT"}: ${m.content}`)
    .join("\n\n");

  const userReplies = history.filter((m) => m.role === "user");
  if (userReplies.length === 0) {
    return { score: 1, reason: "No reply yet", signals: ["no reply received"], urgency: "low" };
  }

  const prompt = `You are a B2B sales analyst. Score this email conversation prospect from 1 (cold/uninterested) to 10 (ready to buy now).

CONVERSATION:
${transcript}

Scoring guide:
- 1-2: No reply, or "not interested", unsubscribe
- 3-4: Polite but vague ("maybe later", "not right now")  
- 5-6: Engaged, asking questions, wants more info
- 7-8: Asking about price, timeline, process — serious interest
- 9-10: "Let's do it", "send me the link", asked for next steps, urgent need

Urgency signals: asked about timeline/start date, mentioned deadline, said "ASAP", has budget approved.

Reply ONLY valid JSON, no markdown:
{
  "score": <number 1-10>,
  "reason": "<max 20 words, plain English, start with what the prospect did>",
  "signals": ["<signal 1>", "<signal 2>"],
  "urgency": "<low|medium|high>"
}`;

  try {
    const raw = await callAI(prompt);
    const json = JSON.parse(raw.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim()) as Partial<ScoreResult>;
    return {
      score: Math.max(1, Math.min(10, Math.round(Number(json.score) || 1))),
      reason: String(json.reason || "Reply received").slice(0, 120),
      signals: Array.isArray(json.signals) ? json.signals.slice(0, 4) : [],
      urgency: (["low", "medium", "high"].includes(json.urgency as string) ? json.urgency : "low") as ScoreResult["urgency"],
    };
  } catch {
    // Fallback: heuristic scoring
    return heuristicScore(history);
  }
}

function heuristicScore(history: Message[]): ScoreResult {
  const userText = history.filter((m) => m.role === "user").map((m) => m.content.toLowerCase()).join(" ");
  const signals: string[] = [];
  let score = 3;

  const buyingWords = ["price", "cost", "how much", "invoice", "payment", "pay", "let's do", "let's go", "sign up", "get started", "start", "onboard", "send me", "i'm in", "interested"];
  const negativeWords = ["not interested", "unsubscribe", "remove me", "don't contact", "no thanks", "no thank you"];
  const questionWords = ["how", "what", "when", "can you", "do you", "could you", "would you", "is it", "are you"];

  for (const w of buyingWords) {
    if (userText.includes(w)) { score += 2; signals.push(`said "${w}"`); break; }
  }
  for (const w of negativeWords) {
    if (userText.includes(w)) { score = 1; signals.push("expressed disinterest"); break; }
  }
  for (const w of questionWords) {
    if (userText.includes(w)) { score += 1; signals.push("asked a question"); break; }
  }

  const replyCount = history.filter((m) => m.role === "user").length;
  if (replyCount >= 2) { score += 1; signals.push(`${replyCount} replies sent`); }

  return {
    score: Math.max(1, Math.min(10, score)),
    reason: signals[0] ? `Prospect ${signals[0]}` : "Reply received",
    signals,
    urgency: score >= 8 ? "high" : score >= 5 ? "medium" : "low",
  };
}

export async function scoreAndPersistLead(params: {
  campaignId: string;
  leadId: string;
  history: Message[];
}): Promise<ScoreResult> {
  const result = await scoreLeadFromHistory(params.history);

  await updateStore((draft) => {
    const c = draft.autonomousCampaigns?.find((x) => x.id === params.campaignId);
    const s = c?.steps.find((x) => x.leadId === params.leadId);
    if (s) {
      s.score = result.score;
      s.scoreReason = result.reason;
      s.scoreSignals = result.signals;
      s.scoreUrgency = result.urgency;
      s.scoredAt = new Date().toISOString();
    }
  });

  return result;
}
