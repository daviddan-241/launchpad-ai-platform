// Auto-detects what a business needs most and selects the best offer

export type BusinessNeed = {
  rank: number;
  need: string;
  offer: string;
  price: number;
  painPoint: string;
  hook: string; // First-line hook for outreach
};

// Static intelligence map - patterns matched from niche description
const NICHE_NEEDS_MAP: Record<string, BusinessNeed[]> = {
  restaurant: [
    { rank: 1, need: "More customers from Google", offer: "Google ranking + local SEO", price: 800, painPoint: "People can't find them when searching 'best [food] near me'", hook: "I was looking for [food type] in [city] and noticed you're not showing up on Google Maps" },
    { rank: 2, need: "Professional website with online ordering", offer: "website with menu and online ordering", price: 1200, painPoint: "Their website looks outdated or they don't have one", hook: "Checked out your place online — couldn't find a way to order ahead" },
    { rank: 3, need: "Social media content", offer: "social media management", price: 600, painPoint: "Inconsistent or no social media presence", hook: "Love what you're doing — your food looks amazing but Instagram doesn't show it" },
  ],
  "real estate": [
    { rank: 1, need: "Website to capture leads", offer: "lead-generating real estate website", price: 1500, painPoint: "No professional website to capture buyer/seller leads", hook: "Noticed your listings but couldn't find a way to contact your team directly" },
    { rank: 2, need: "Facebook ads for listings", offer: "Facebook and Instagram ads for listings", price: 900, painPoint: "Listings aren't getting enough eyes", hook: "I help agents get 10-30 qualified buyer inquiries per month through Facebook ads" },
    { rank: 3, need: "Brand identity", offer: "professional brand and logo design", price: 700, painPoint: "Inconsistent branding across materials", hook: "Strong brand = more trust. Noticed your marketing doesn't have a consistent look" },
  ],
  lawyer: [
    { rank: 1, need: "More clients from Google", offer: "local SEO and Google Business optimization", price: 1200, painPoint: "People search for lawyers online and can't find them", hook: "People looking for [law type] attorneys in [city] aren't finding your firm" },
    { rank: 2, need: "Professional website", offer: "law firm website with case intake form", price: 2000, painPoint: "Old or no website, missing case intake", hook: "Tried to find how to hire your firm online — the process isn't clear" },
  ],
  "dental": [
    { rank: 1, need: "Patient booking from Google", offer: "Google ranking + booking website", price: 1000, painPoint: "Not showing up in local Google searches for dentists", hook: "Searched for dentists in [area] — your practice didn't come up on the first page" },
    { rank: 2, need: "Patient retention emails", offer: "email marketing for patient retention", price: 500, painPoint: "No system to bring back existing patients", hook: "Most clinics lose 20-30% of patients to forgetfulness — there's a simple fix" },
  ],
  gym: [
    { rank: 1, need: "Members from social media ads", offer: "Instagram/Facebook ads for new members", price: 800, painPoint: "Slow periods and empty slots", hook: "Gyms in [city] are using Instagram ads to fill classes. Is your gym doing this?" },
    { rank: 2, need: "Website with class booking", offer: "gym website with class booking", price: 1200, painPoint: "No online booking or outdated site", hook: "Tried to find your class schedule online — couldn't book a trial session" },
  ],
  salon: [
    { rank: 1, need: "Online booking system", offer: "salon website with online booking", price: 900, painPoint: "No online booking, losing clients", hook: "Couldn't find a way to book with you online — a lot of clients prefer that now" },
    { rank: 2, need: "Instagram content strategy", offer: "social media management", price: 600, painPoint: "Not posting consistently or showing results", hook: "Your work deserves more visibility — your Instagram has potential" },
  ],
  ecommerce: [
    { rank: 1, need: "More sales from Google/ads", offer: "Google Shopping + Facebook ads", price: 1200, painPoint: "Low traffic and conversions on their store", hook: "I help ecom stores add $5k-$20k/month through paid ads — open to a quick chat?" },
    { rank: 2, need: "Email marketing automation", offer: "email marketing and cart abandonment flows", price: 700, painPoint: "Not recovering abandoned carts", hook: "Most stores leave 30% of revenue on the table by not having email flows" },
  ],
};

const DEFAULT_NEEDS: BusinessNeed[] = [
  { rank: 1, need: "Professional website", offer: "website design and development", price: 1200, painPoint: "Outdated or no website", hook: "Came across your business and thought I could help you get more clients online" },
  { rank: 2, need: "Social media presence", offer: "social media management", price: 600, painPoint: "Inconsistent or no social presence", hook: "Your business deserves more visibility online" },
  { rank: 3, need: "Local SEO", offer: "local SEO and Google ranking", price: 800, painPoint: "Not found on Google", hook: "People are searching for what you offer but finding your competitors first" },
];

function detectNicheFromText(niche: string): BusinessNeed[] {
  const lower = niche.toLowerCase();
  const keys = Object.keys(NICHE_NEEDS_MAP);
  const matched = keys.find((k) => lower.includes(k));
  return matched ? NICHE_NEEDS_MAP[matched] : DEFAULT_NEEDS;
}

export async function detectBusinessNeeds(business: {
  company: string;
  industry: string;
  niche: string;
  region: string;
}): Promise<{
  topNeed: BusinessNeed;
  allNeeds: BusinessNeed[];
}> {
  const needs = detectNicheFromText(business.niche || business.industry);
  return { topNeed: needs[0], allNeeds: needs };
}

export function getOfferList(): string[] {
  return [
    "website design and development",
    "local SEO and Google ranking",
    "social media management",
    "Facebook and Instagram ads",
    "Google Ads management",
    "email marketing automation",
    "logo and brand identity design",
    "online booking system",
    "e-commerce store setup",
    "content writing and blogging",
    "app development",
    "business automation and CRM",
  ];
}
