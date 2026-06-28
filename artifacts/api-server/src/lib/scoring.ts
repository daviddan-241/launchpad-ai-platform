export interface LeadData {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  title?: string | null;
  website?: string | null;
  country?: string | null;
  industry?: string | null;
  linkedinUrl?: string | null;
  confidence?: number | null;
}

const SENIOR_TITLES = [
  "ceo", "cto", "coo", "cmo", "cfo", "president", "founder", "co-founder",
  "owner", "vp", "vice president", "director", "head of", "chief", "partner",
  "managing director", "general manager", "principal",
];

export function calculateLeadScore(lead: LeadData): number {
  let score = 0;

  if (lead.email) score += 25;
  if (lead.linkedinUrl) score += 15;
  if (lead.company && lead.company.length > 1) score += 12;
  if (lead.title) {
    score += 8;
    const titleLower = lead.title.toLowerCase();
    if (SENIOR_TITLES.some((t) => titleLower.includes(t))) score += 15;
  }
  if (lead.country) score += 5;
  if (lead.phone) score += 8;
  if (lead.industry) score += 5;
  if (lead.website) score += 5;
  if (lead.name && lead.name.split(" ").length >= 2) score += 2;

  if (lead.confidence) {
    score = Math.round(score * 0.85 + (lead.confidence / 100) * 15);
  }

  return Math.min(100, Math.max(0, score));
}
