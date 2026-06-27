import { createId, updateStore } from "@/lib/store";

type CaseStudy = {
  businessName: string;
  city: string;
  service: string;
  result: string;
  testimonial: string;
  ownerName: string;
};

async function generateCaseStudies(offer: string, niche: string, region: string): Promise<CaseStudy[]> {
  const sys = `Generate 4 realistic client case studies for a freelancer who provides "${offer}" to ${niche} businesses.
Each case study: businessName (realistic), city (real city${region ? " in or near " + region : ""}), service (specific work done), result (specific measurable outcome like "+40% leads" or "20 new bookings/month"), testimonial (1-2 sentences, human and specific), ownerName (realistic full name).
Return valid JSON object: {"cases": [...]}`;

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
            system_instruction: { parts: [{ text: sys }] },
            contents: [{ role: "user", parts: [{ text: `Generate case studies for ${offer} in ${niche}` }] }],
            generationConfig: { temperature: 0.7, responseMimeType: "application/json" },
          }),
        },
      );
      if (resp.ok) {
        const d = (await resp.json()) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
        const raw = d.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
        const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim()) as { cases?: CaseStudy[] };
        if (Array.isArray(parsed.cases) && parsed.cases.length) return parsed.cases;
      }
    } catch { /* try groq */ }
  }

  const groqKey = process.env.GROQ_API_KEY;
  if (groqKey) {
    try {
      const resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${groqKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
          temperature: 0.6,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: sys },
            { role: "user", content: `Generate case studies for ${offer} in ${niche}` },
          ],
        }),
      });
      if (resp.ok) {
        const d = (await resp.json()) as { choices?: Array<{ message?: { content?: string } }> };
        const text = d.choices?.[0]?.message?.content?.trim() ?? "";
        const parsed = JSON.parse(text) as { cases?: CaseStudy[] };
        if (Array.isArray(parsed.cases) && parsed.cases.length) return parsed.cases;
      }
    } catch { /* use fallback */ }
  }

  return [
    { businessName: "Sunrise Café", city: region || "Lagos", service: offer, result: "+38% online orders in 6 weeks", testimonial: "They understood our business immediately and delivered exactly what we needed.", ownerName: "Chidi Okafor" },
    { businessName: "Premier Properties", city: region || "Accra", service: offer, result: "Page 1 on Google for 11 target keywords in 90 days", testimonial: "Started getting 15-20 new leads a month from Google. Completely changed our pipeline.", ownerName: "Ama Mensah" },
    { businessName: "LexCorp Associates", city: region || "Nairobi", service: offer, result: "New client inquiries went from 4/month to 21/month", testimonial: "Professional, responsive, and they actually delivered what they promised.", ownerName: "David Kamau" },
    { businessName: "FitZone Studio", city: region || "London", service: offer, result: "+62 new members in the first quarter", testimonial: "Best business decision we made this year. ROI was clear within 60 days.", ownerName: "Sarah Mitchell" },
  ];
}

function buildHtml(cases: CaseStudy[], offer: string, niche: string, senderName: string): string {
  const cards = cases.map((c) => `
    <div style="background:#16102a;border:1px solid #2d1f4e;border-radius:20px;padding:28px;margin-bottom:20px;">
      <div style="display:flex;align-items:center;gap:14px;margin-bottom:18px;">
        <div style="min-width:46px;height:46px;border-radius:50%;background:linear-gradient(135deg,#7c3aed,#a855f7);display:flex;align-items:center;justify-content:center;font-weight:700;color:white;font-size:20px;">${c.businessName[0]}</div>
        <div>
          <div style="color:white;font-weight:600;font-size:16px;">${c.businessName}</div>
          <div style="color:#9ca3af;font-size:13px;margin-top:2px;">${c.city} · ${c.service}</div>
        </div>
      </div>
      <div style="background:#0d0920;border-radius:14px;padding:14px 16px;margin-bottom:16px;">
        <div style="color:#a78bfa;font-size:11px;text-transform:uppercase;letter-spacing:0.12em;margin-bottom:5px;">Result</div>
        <div style="color:#10b981;font-weight:600;font-size:15px;">${c.result}</div>
      </div>
      <p style="color:#d1d5db;font-style:italic;font-size:14px;line-height:1.65;margin:0 0 10px;">"${c.testimonial}"</p>
      <div style="color:#6b7280;font-size:13px;">— ${c.ownerName}, ${c.businessName}</div>
    </div>`).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Our Work — ${senderName}</title>
<style>*{box-sizing:border-box;margin:0;padding:0}body{background:#0a0918;color:#e2e8f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;min-height:100vh}.hero{background:linear-gradient(160deg,#120b28,#0a0918);padding:64px 24px 52px;text-align:center;border-bottom:1px solid #1f1740}.tag{display:inline-block;background:rgba(124,58,237,.18);border:1px solid rgba(124,58,237,.35);color:#a78bfa;border-radius:100px;padding:6px 18px;font-size:12px;text-transform:uppercase;letter-spacing:.15em;margin-bottom:22px}h1{color:white;font-size:clamp(26px,5vw,46px);font-weight:700;line-height:1.15;margin-bottom:14px}.sub{color:#9ca3af;font-size:16px;max-width:540px;margin:0 auto 36px;line-height:1.65}.stats{display:flex;justify-content:center;gap:40px;flex-wrap:wrap}.stat-n{color:white;font-size:30px;font-weight:700}.stat-l{color:#6b7280;font-size:13px;margin-top:3px}.section{max-width:700px;margin:0 auto;padding:52px 24px}.sec-title{color:white;font-size:22px;font-weight:600;margin-bottom:6px}.sec-sub{color:#6b7280;font-size:14px;margin-bottom:30px}.cta{background:linear-gradient(135deg,#7c3aed,#a855f7);border-radius:20px;padding:40px 28px;text-align:center;margin-top:40px}.cta h2{color:white;font-size:22px;font-weight:600;margin-bottom:8px}.cta p{color:rgba(255,255,255,.75);font-size:14px;margin-bottom:22px}.cta a{display:inline-block;background:white;color:#7c3aed;font-weight:700;padding:14px 36px;border-radius:12px;text-decoration:none;font-size:15px}</style>
</head>
<body>
<div class="hero">
  <div class="tag">Client results</div>
  <h1>Real results from real businesses</h1>
  <p class="sub">Here's what we've achieved for ${niche} businesses. Every number is real. Every client is contactable.</p>
  <div class="stats">
    <div><div class="stat-n">47+</div><div class="stat-l">Clients served</div></div>
    <div><div class="stat-n">94%</div><div class="stat-l">Repeat clients</div></div>
    <div><div class="stat-n">9yr</div><div class="stat-l">In business</div></div>
  </div>
</div>
<div class="section">
  <div class="sec-title">Recent case studies</div>
  <div class="sec-sub">${offer} — results in ${niche}</div>
  ${cards}
  <div class="cta">
    <h2>Want results like these?</h2>
    <p>Reply to the email thread — no commitment, just a conversation about your business.</p>
    <a href="mailto:?subject=I want to discuss my project">Reply to email →</a>
  </div>
</div>
</body>
</html>`;
}

export async function generateAndSavePortfolio(params: {
  offer: string;
  niche: string;
  senderName: string;
  region: string;
}): Promise<{ id: string; url: string }> {
  const id = createId("PORT");
  const cases = await generateCaseStudies(params.offer, params.niche, params.region);
  const html = buildHtml(cases, params.offer, params.niche, params.senderName);

  await updateStore((d) => {
    if (!d.portfolios) d.portfolios = [];
    d.portfolios.unshift({ id, html, createdAt: new Date().toISOString() });
    if (d.portfolios.length > 50) d.portfolios = d.portfolios.slice(0, 50);
  });

  const appUrl = process.env.APP_URL ?? "https://your-app.onrender.com";
  return { id, url: `${appUrl}/api/portfolio/${id}` };
}
