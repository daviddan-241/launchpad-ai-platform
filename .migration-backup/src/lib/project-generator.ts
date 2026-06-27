export type GeneratedProject = {
  title: string;
  summary: string;
  proposal: string;
  features: string[];
  files: Array<{ path: string; content: string }>;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function inferProjectType(prompt: string) {
  const p = prompt.toLowerCase();
  if (p.includes("restaurant")) return "restaurant";
  if (p.includes("portfolio")) return "portfolio";
  if (p.includes("agency")) return "agency";
  if (p.includes("saas") || p.includes("software") || p.includes("app")) return "saas";
  return "business";
}

function getFeatureSet(type: string) {
  switch (type) {
    case "restaurant":
      return [
        "Menu spotlight section",
        "Reservation/contact CTA",
        "Mobile-first hero and testimonials",
        "Location and opening-hours section",
        "Fast static HTML/CSS/JS structure",
      ];
    case "portfolio":
      return [
        "Personal intro and credibility block",
        "Featured projects grid",
        "Skills and services section",
        "Contact CTA",
        "Smooth mobile interactions",
      ];
    case "agency":
      return [
        "Service positioning hero",
        "Proof and case-study section",
        "Lead capture CTA",
        "Proposal-ready offer structure",
        "Conversion-focused mobile layout",
      ];
    case "saas":
      return [
        "SaaS hero and value props",
        "Feature cards and workflow explanation",
        "Social proof and FAQ",
        "Pricing-ready layout without billing logic",
        "Mobile-first responsive UI",
      ];
    default:
      return [
        "Modern business hero",
        "Services section",
        "Credibility and testimonials",
        "Call-to-action contact area",
        "Responsive mobile-first structure",
      ];
  }
}

export function generateProject(prompt: string): GeneratedProject {
  const cleanPrompt = prompt.trim() || "Modern business website";
  const type = inferProjectType(cleanPrompt);
  const title = `${cleanPrompt.charAt(0).toUpperCase()}${cleanPrompt.slice(1)} MVP`;
  const features = getFeatureSet(type);
  const summary = `A mobile-first MVP website concept based on: ${cleanPrompt}. This starter package is ready to preview, customize, and ship as a fast static site.`;
  const proposal = `I would present this project as a focused MVP: launch quickly, communicate value clearly, and create a clean path for visitors to contact, book, or buy. The build emphasizes mobile usability, strong calls to action, and content blocks that can be expanded later into a fuller product.`;

  const headline = escapeHtml(cleanPrompt);
  const featureList = features.map((item) => `<li>${escapeHtml(item)}</li>`).join("\n");
  const cards = features
    .map(
      (item) => `
        <article class="card">
          <h3>${escapeHtml(item)}</h3>
          <p>Built to keep the experience simple, fast, and clear on mobile screens.</p>
        </article>`,
    )
    .join("\n");

  const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(title)}</title>
    <link rel="stylesheet" href="styles.css" />
  </head>
  <body>
    <main class="page">
      <section class="hero">
        <div class="eyebrow">Generated MVP</div>
        <h1>${headline}</h1>
        <p>${escapeHtml(summary)}</p>
        <div class="hero-actions">
          <a href="#contact" class="button primary">Start Project</a>
          <a href="#features" class="button secondary">View Features</a>
        </div>
      </section>

      <section id="features" class="section">
        <div class="section-heading">
          <span>Features</span>
          <h2>What this MVP includes</h2>
        </div>
        <div class="grid">${cards}
        </div>
      </section>

      <section class="section proposal">
        <div class="section-heading">
          <span>Proposal</span>
          <h2>Suggested client-facing angle</h2>
        </div>
        <p>${escapeHtml(proposal)}</p>
        <ul class="checklist">
          ${featureList}
        </ul>
      </section>

      <section id="contact" class="section contact">
        <div class="section-heading">
          <span>Next Step</span>
          <h2>Let’s ship the first version fast</h2>
        </div>
        <p>Use this starter as the foundation for a real client delivery, landing page, or service website.</p>
        <button id="ctaButton" class="button primary">Request Proposal</button>
      </section>
    </main>
    <script src="app.js"></script>
  </body>
</html>`;

  const css = `:root {
  --bg: #08111f;
  --panel: rgba(255,255,255,0.05);
  --text: #f8fafc;
  --muted: #a5b4c8;
  --accent: #67e8f9;
  --border: rgba(255,255,255,0.08);
}
* { box-sizing: border-box; }
body {
  margin: 0;
  font-family: Inter, Arial, sans-serif;
  background: radial-gradient(circle at top, rgba(103,232,249,0.14), transparent 30%), linear-gradient(180deg, #110718 0%, #07050a 100%);
  color: var(--text);
}
.page {
  max-width: 1100px;
  margin: 0 auto;
  padding: 24px 16px 64px;
}
.hero, .section {
  border: 1px solid var(--border);
  background: var(--panel);
  border-radius: 28px;
  padding: 24px;
  backdrop-filter: blur(10px);
}
.hero { margin-top: 16px; }
.section { margin-top: 20px; }
.eyebrow, .section-heading span {
  font-size: 11px;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--accent);
}
h1 {
  font-size: clamp(2rem, 7vw, 4.6rem);
  line-height: 1.02;
  margin: 12px 0 12px;
}
h2 { margin: 10px 0 0; font-size: clamp(1.4rem, 4vw, 2rem); }
p {
  color: var(--muted);
  line-height: 1.8;
  font-size: 1rem;
}
.hero-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  margin-top: 20px;
}
.button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  padding: 14px 18px;
  text-decoration: none;
  border: 1px solid var(--border);
  color: var(--text);
}
.button.primary {
  background: var(--accent);
  color: #04202a;
  font-weight: 700;
}
.grid {
  display: grid;
  gap: 14px;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  margin-top: 18px;
}
.card {
  border: 1px solid var(--border);
  background: #161022;
  border-radius: 24px;
  padding: 18px;
}
.card h3 {
  margin: 0 0 10px;
  font-size: 1rem;
}
.checklist {
  padding-left: 18px;
  color: var(--muted);
}
.contact {
  text-align: left;
}
@media (max-width: 640px) {
  .page { padding: 16px 12px 84px; }
  .hero, .section { padding: 20px; border-radius: 24px; }
  .button { width: 100%; }
}`;

  const js = `document.getElementById('ctaButton')?.addEventListener('click', () => {
  alert('Proposal request flow can be connected to your real CRM, chat, or email workflow.');
});`;

  return {
    title,
    summary,
    proposal,
    features,
    files: [
      { path: 'index.html', content: html },
      { path: 'styles.css', content: css },
      { path: 'app.js', content: js },
    ],
  };
}
