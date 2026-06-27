export async function generateWorkspaceNarration(input: {
  prompt: string;
  userName: string;
  leads: Array<{ name: string; company: string; title: string; region: string }>;
  plan: { audience: string; objective: string; steps: string[] };
  actionTitles: string[];
}) {
  const system = [
    "You are LeadForge's in-app revenue assistant.",
    "Be concise, practical, confident, and experienced.",
    "Describe what was done inside the workspace.",
    "Never claim actions happened if they were not actually executed.",
    "If a payment link or outreach draft was prepared but not sent, say that clearly.",
  ].join(" ");

  const userPrompt = JSON.stringify(input);

  const geminiKey = process.env.GEMINI_API_KEY;
  const geminiModel = process.env.GEMINI_MODEL || "gemini-1.5-flash";
  if (geminiKey) {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: system }],
          },
          contents: [
            {
              role: "user",
              parts: [{ text: userPrompt }],
            },
          ],
          generationConfig: {
            temperature: 0.35,
          },
        }),
      },
    );

    if (response.ok) {
      const payload = (await response.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      };
      const text = payload.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("\n").trim();
      if (text) return text;
    }
  }

  const groqKey = process.env.GROQ_API_KEY;
  const groqModel = process.env.GROQ_MODEL || "llama-3.1-8b-instant";
  if (groqKey) {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${groqKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: groqModel,
        temperature: 0.3,
        messages: [
          { role: "system", content: system },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (response.ok) {
      const payload = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const text = payload.choices?.[0]?.message?.content?.trim();
      if (text) return text;
    }
  }

  const ollamaBase = process.env.OLLAMA_BASE_URL;
  const ollamaModel = process.env.OLLAMA_MODEL || "llama3.2:1b";
  if (ollamaBase) {
    const response = await fetch(`${ollamaBase.replace(/\/$/, "")}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: ollamaModel,
        prompt: `${system}\n\n${userPrompt}`,
        stream: false,
      }),
    });

    if (response.ok) {
      const payload = (await response.json()) as { response?: string };
      if (payload.response?.trim()) return payload.response.trim();
    }
  }

  return "I searched your workspace, prepared the strongest matching leads, assembled proposal-ready next steps, and updated the active workflow plan. Connect your real sending channel and payment provider to continue execution with live delivery.";
}
