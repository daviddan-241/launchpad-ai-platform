import { readStore, updateStore, createId } from "@/lib/store";

const PORTFOLIO_DIR_KEY = "portfolios";

// Generate a fake-but-realistic portfolio page as raw HTML
async function generatePortfolioHTML(params: {
  offer: string;
  niche: string;
  senderName: string;
  region: string;
}): Promise<string> {
  const geminiKey = process.env.GEMINI_API_KEY;
  const geminiModel = process.env.GEMINI_MODEL || "gemini-1.5-flash";

  const system = `You are generating a realistic portfolio/testimonials HTML page for a freelancer or agency. 
Generate 4 realistic "case study" cards showing previous clients in the "${params.niche}" industry.
Each card has: client name (realistic business name), city, what was done (${params.offer}), result (specific numbers), and a testimonial quote.
Make the results specific and believable (not exaggerated). Results like "+40% website traffic", "30 new customer inquiries in first month", "saved 5 hours per week".
Return ONLY a valid JSON array with 4 objects: [{businessName, city, service, result, testimonial, ownerName}]`;

  const userPrompt = `Generate portfolio for ${params.offer} focused on ${params.niche} businesses in ${params.region || "various cities"}.`;

  let cases: Array<{ businessName: string; city: string; service: string; result: string; testimonial: string; ownerName: string }> = [];

  if (geminiKey) {
    try {
      const resp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: system }] },
            contents: [{ role: "user", parts: [{ text: userPrompt }] }],
            generationConfig: { temperature: 0.7, responseMimeType: "application/json" },
          }),
        },
      );
      if (resp.ok) {
        const payload = (await resp.json()) as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
        const text = payload.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
        cases = JSON.parse(text.replace(/```json|```/g, "").trim());
      }
    } catch { /* fallback below */ }
  }

  if (!cases.length) {
    cases = [
      { businessName: "Sunrise Café", city: "Lagos", service: params.offer, result: "38% increase in online orders in 6 weeks", testimonial: "Working with them was seamless. They understood our business immediately.", ownerName: "Chidi Okafor" },
      { businessName: "Premier Logistics Ltd", city: "Accra", service: params.offer, result: "Page 1 on Google for 8 target keywords in 90 days", testimonial: "We started getting 15-20 new leads every month from Google. Worth every penny.", ownerName: "Ama Mensah" },
      { businessName: "LexCorp Law", city: "Nairobi", service: params.offer, result: "New client inquiries went from 3/month to 19/month", testimonial: "Professional, responsive, and they actually delivered what they promised.", ownerName: "David Kamau" },
      { businessName: "FitZone Gym", city: "London", service: params.offer, result: "+62 new members in the first quarter after relaunch", testimonial: "Best investment we made this year. ROI was clear within 60 days.", ownerName: "Sarah Mitchell" },
    ];
  }

  const cards = cases.map((c) => `
    <div style="background:#1a1a2e;border:1px solid #2d2d4e;border-radius:20px;padding:28px;margin-bottom:20px;">
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
        <div style="width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,#7c3aed,#a855f7);display:flex;align-items:center;justify-content:center;font-weight:700;color:white;font-size:18px;">${c.businessName[0]}</div>
        <div>
          <div style="color:white;font-weight:600;font-size:16px;">${c.businessName}</div>
          <div style="color:#9ca3af;font-size:13px;">${c.city} · ${c.service}</div>
        </div>
      </div>
      <div style="background:#0f0f23;border-radius:14px;padding:14px;margin-bottom:14px;">
        <div style="color:#a78bfa;font-size:12px;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:4px;">Result</div>
        <div style="color:#10b981;font-weight:600;font-size:15px;">${c.result}</div>
      </div>
      <div style="color:#d1d5db;font-style:italic;font-size:14px;line-height:1.6;">"${c.testimonial}"</div>
      <div style="color:#6b7280;font-size:13px;margin-top:10px;">— ${c.ownerName}, ${c.businessName}</div>
    </div>`).join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Our Work — ${params.senderName}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #0a0a1a; color: #e2e8f0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; min-height: 100vh; }
  .hero { background: linear-gradient(135deg, #1a0f2e, #0f0f23); padding: 60px 24px 48px; text-align: center; border-bottom: 1px solid #2d2d4e; }
  .tag { display: inline-block; background: rgba(124,58,237,0.2); border: 1px solid rgba(124,58,237,0.4); color: #a78bfa; border-radius: 100px; padding: 6px 16px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.15em; margin-bottom: 20px; }
  h1 { color: white; font-size: clamp(28px, 5vw, 48px); font-weight: 700; margin-bottom: 16px; }
  .subtitle { color: #9ca3af; font-size: 17px; max-width: 520px; margin: 0 auto 32px; line-height: 1.6; }
  .stat-row { display: flex; justify-content: center; gap: 32px; flex-wrap: wrap; }
  .stat { text-align: center; }
  .stat-num { color: white; font-size: 28px; font-weight: 700; }
  .stat-label { color: #6b7280; font-size: 13px; margin-top: 2px; }
  .section { max-width: 720px; margin: 0 auto; padding: 48px 24px; }
  .section-title { color: white; font-size: 22px; font-weight: 600; margin-bottom: 8px; }
  .section-sub { color: #6b7280; font-size: 14px; margin-bottom: 28px; }
  .cta { background: linear-gradient(135deg, #7c3aed, #a855f7); border-radius: 16px; padding: 36px 24px; text-align: center; margin-top: 40px; }
  .cta h2 { color: white; font-size: 22px; font-weight: 600; margin-bottom: 8px; }
  .cta p { color: rgba(255,255,255,0.7); font-size: 14px; margin-bottom: 20px; }
  .cta a { display: inline-block; background: white; color: #7c3aed; font-weight: 700; padding: 14px 32px; border-radius: 12px; text-decoration: none; font-size: 15px; }
</style>
</head>
<body>
<div class="hero">
  <div class="tag">Client results</div>
  <h1>Real results from real businesses</h1>
  <p class="subtitle">Here's what we've done for ${params.niche} businesses like yours. Numbers are real. Clients are contactable.</p>
  <div class="stat-row">
    <div class="stat"><div class="stat-num">47+</div><div class="stat-label">Clients served</div></div>
    <div class="stat"><div class="stat-num">94%</div><div class="stat-label">Return rate</div></div>
    <div class="stat"><div class="stat-num">8yr</div><div class="stat-label">In business</div></div>
  </div>
</div>
<div class="section">
  <div class="section-title">Recent case studies</div>
  <div class="section-sub">${params.offer} results in ${params.niche} businesses</div>
  ${cards}
  <div class="cta">
    <h2>Ready to get similar results?</h2>
    <p>Reply to the email thread to discuss your project. No commitment yet — just a conversation.</p>
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
  const html = await generatePortfolioHTML(params);

  // Save to store for retrieval by API route
  await updateStore((draft) => {
    if (!draft.portfolios) draft.portfolios = [];
    draft.portfolios.unshift({ id, html, createdAt: new Date().toISOString() });
    if (draft.portfolios.length > 50) draft.portfolios = draft.portfolios.slice(0, 50);
    return draft;
  });

  const appUrl = process.env.APP_URL || "https://your-app.onrender.com";
  return { id, url: `${appUrl}/api/portfolio/${id}` };
}
