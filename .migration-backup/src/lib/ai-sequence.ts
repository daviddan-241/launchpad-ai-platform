// Real AI-powered sequence plan generation — Gemini primary, Groq fallback.

async function callAI(system: string, user: string): Promise<string> {
  const geminiKey = process.env.GEMINI_API_KEY;
  const geminiModel = process.env.GEMINI_MODEL || "gemini-1.5-flash";

  if (geminiKey) {
    try {
      const resp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: system }] },
            contents: [{ role: "user", parts: [{ text: user }] }],
            generationConfig: { temperature: 0.55, responseMimeType: "application/json" },
          }),
        },
      );
      if (resp.ok) {
        const d = (await resp.json()) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
        const t = d.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
        if (t) return t;
      }
    } catch { /* fall through */ }
  }

  const groqKey = process.env.GROQ_API_KEY;
  const groqModel = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
  if (groqKey) {
    try {
      const resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${groqKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: groqModel,
          temperature: 0.55,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
        }),
      });
      if (resp.ok) {
        const d = (await resp.json()) as { choices?: Array<{ message?: { content?: string } }> };
        const t = d.choices?.[0]?.message?.content?.trim() ?? "";
        if (t) return t;
      }
    } catch { /* no AI available */ }
  }

  return "";
}

export type SequencePlan = {
  audience: string;
  objective: string;
  steps: string[];
  guardrails: string[];
};

export async function generateSequencePlan(prompt: string): Promise<SequencePlan> {
  const system = `You are a B2B outreach strategist. Given a sales prompt, generate a smart multi-touch outreach sequence plan.

Return ONLY valid JSON matching this exact schema:
{
  "audience": "<who this targets — role, company type, pain point>",
  "objective": "<what the sequence is designed to achieve>",
  "steps": ["<Day X: action description>", ...],
  "guardrails": ["<rule to protect deliverability or prospect experience>", ...]
}

Rules:
- steps: 5-7 entries, each starting with "Day N:" — mix email, LinkedIn, and call touchpoints logically
- guardrails: 3-4 entries — deliverability, reply detection, opt-out handling, timing
- Be specific to the prompt, not generic
- No markdown, no explanation outside JSON`;

  const raw = await callAI(system, `Create an outreach sequence plan for: "${prompt}"`);

  try {
    const cleaned = raw.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned) as Partial<SequencePlan>;
    if (parsed.audience && parsed.objective && Array.isArray(parsed.steps) && parsed.steps.length) {
      return {
        audience: parsed.audience,
        objective: parsed.objective,
        steps: parsed.steps.slice(0, 7),
        guardrails: Array.isArray(parsed.guardrails) ? parsed.guardrails.slice(0, 5) : [],
      };
    }
  } catch { /* use fallback */ }

  // Last-resort structural fallback — never keyword-matched
  return {
    audience: "B2B decision makers matching the target profile",
    objective: "Open high-intent conversations that convert to qualified meetings",
    steps: [
      "Day 1: Personalised email referencing a specific company signal or pain point",
      "Day 3: LinkedIn profile visit + connection request with a short context note",
      "Day 5: Follow-up email with a relevant proof point and one clear call to action",
      "Day 7: Create a call task for leads above 80 intent score",
      "Day 10: Final email with a softer value-first offer and easy opt-out",
    ],
    guardrails: [
      "Pause sequence immediately on any positive reply",
      "Throttle sends to max 3 per domain per day to protect deliverability",
      "Auto-route hot replies (asking price, ready to pay) to account owner",
      "Honour unsubscribes within 24 hours — remove from all active sequences",
    ],
  };
}
