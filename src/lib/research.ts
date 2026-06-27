function stripHtml(html: string) {
  return html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function extractTag(html: string, pattern: RegExp) {
  const match = html.match(pattern);
  return match?.[1]?.trim() || "";
}

export type CompanyResearch = {
  domain: string;
  url: string;
  title: string;
  description: string;
  summary: string;
};

export async function researchCompanyFromEmail(email: string): Promise<CompanyResearch | null> {
  const domain = email.split("@")[1]?.trim().toLowerCase();
  if (!domain) return null;

  const candidates = [`https://${domain}`, `http://${domain}`];
  for (const url of candidates) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 7000);
      const response = await fetch(url, { signal: controller.signal, redirect: "follow" });
      clearTimeout(timeout);
      if (!response.ok) continue;
      const html = await response.text();
      const title = extractTag(html, /<title>([^<]+)<\/title>/i);
      const description =
        extractTag(html, /<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i) ||
        extractTag(html, /<meta\s+property=["']og:description["']\s+content=["']([^"']+)["']/i);
      const text = stripHtml(html).slice(0, 240);
      const summary = description || text || "Public website reachable but no summary metadata was found.";
      return { domain, url, title, description, summary };
    } catch {
      continue;
    }
  }

  return null;
}
