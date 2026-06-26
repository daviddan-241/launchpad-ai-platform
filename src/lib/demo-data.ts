export type Lead = {
  id: string;
  name: string;
  title: string;
  company: string;
  industry: string;
  companySize: string;
  region: string;
  email: string;
  linkedin: string;
  fitScore: number;
  intentScore: number;
  stage: "New" | "Researching" | "Contacted" | "Meeting" | "Qualified";
  nextStep: string;
  tags: string[];
  painPoints: string[];
  recentSignal: string;
  lastTouched: string;
};

export type Campaign = {
  id: string;
  name: string;
  channelMix: string[];
  audience: string;
  status: "Draft" | "Running" | "Paused" | "Completed";
  openRate: number;
  replyRate: number;
  meetings: number;
  leads: number;
  objective: string;
};

export type InboxMessage = {
  id: string;
  from: string;
  company: string;
  subject: string;
  preview: string;
  sentiment: "Positive" | "Neutral" | "At Risk";
  recommendedReply: string;
  receivedAt: string;
};

export type Workflow = {
  id: string;
  name: string;
  trigger: string;
  actions: string[];
  status: "Active" | "Draft";
  successRate: number;
};

export type Task = {
  id: string;
  title: string;
  owner: string;
  priority: "High" | "Medium" | "Low";
  due: string;
};

export const leads: Lead[] = [
  {
    id: "LD-1024",
    name: "Amara Okafor",
    title: "Head of Growth",
    company: "MonetaPay",
    industry: "Fintech",
    companySize: "51-200",
    region: "Nigeria",
    email: "amara@monetapay.africa",
    linkedin: "linkedin.com/in/amara-okafor",
    fitScore: 94,
    intentScore: 88,
    stage: "Meeting",
    nextStep: "Send ROI snapshot and booking link",
    tags: ["outbound", "payments", "series-a"],
    painPoints: ["low SDR capacity", "manual prospect research", "pipeline inconsistency"],
    recentSignal: "Hiring 3 BDRs and launched a new merchant product",
    lastTouched: "2h ago",
  },
  {
    id: "LD-1025",
    name: "Jason Miller",
    title: "VP Sales",
    company: "ClearRoute Health",
    industry: "Healthtech",
    companySize: "201-500",
    region: "United States",
    email: "jason@clearroutehealth.com",
    linkedin: "linkedin.com/in/jason-miller",
    fitScore: 91,
    intentScore: 82,
    stage: "Qualified",
    nextStep: "Prepare tailored demo with HIPAA-safe workflow",
    tags: ["revops", "compliance", "multi-location"],
    painPoints: ["lead routing delays", "dirty CRM data", "slow follow-up"],
    recentSignal: "Visited pricing page 4 times this week",
    lastTouched: "5h ago",
  },
  {
    id: "LD-1026",
    name: "Priya Shah",
    title: "Revenue Operations Lead",
    company: "CloudBench",
    industry: "SaaS",
    companySize: "51-200",
    region: "United Kingdom",
    email: "priya@cloudbench.io",
    linkedin: "linkedin.com/in/priya-shah",
    fitScore: 89,
    intentScore: 79,
    stage: "Contacted",
    nextStep: "Trigger 4-step sequence + LinkedIn touch",
    tags: ["revops", "crm", "plg"],
    painPoints: ["enrichment gaps", "manual handoffs", "fragmented tools"],
    recentSignal: "Downloaded outbound playbook",
    lastTouched: "1d ago",
  },
  {
    id: "LD-1027",
    name: "Tunde Alabi",
    title: "Founder",
    company: "StackMint",
    industry: "B2B SaaS",
    companySize: "11-50",
    region: "Nigeria",
    email: "tunde@stackmint.co",
    linkedin: "linkedin.com/in/tunde-alabi",
    fitScore: 86,
    intentScore: 74,
    stage: "Researching",
    nextStep: "Enrich with technographics and funding signals",
    tags: ["founder-led-sales", "startup", "automation"],
    painPoints: ["small team", "need pipeline fast", "limited tooling"],
    recentSignal: "Mentioned outbound experiments on LinkedIn",
    lastTouched: "2d ago",
  },
  {
    id: "LD-1028",
    name: "Lena Hart",
    title: "Demand Generation Manager",
    company: "Northstar AI",
    industry: "AI Infrastructure",
    companySize: "201-500",
    region: "Germany",
    email: "lena@northstarai.eu",
    linkedin: "linkedin.com/in/lena-hart",
    fitScore: 84,
    intentScore: 76,
    stage: "New",
    nextStep: "Sync account to ABM list and warm via content",
    tags: ["abm", "enterprise", "events"],
    painPoints: ["event follow-up", "segmenting ICP", "slow personalization"],
    recentSignal: "Company announced expansion into EMEA",
    lastTouched: "3d ago",
  },
  {
    id: "LD-1029",
    name: "Carlos Vega",
    title: "Chief Commercial Officer",
    company: "Portline Logistics",
    industry: "Logistics",
    companySize: "500-1000",
    region: "Spain",
    email: "carlos@portline.es",
    linkedin: "linkedin.com/in/carlos-vega",
    fitScore: 80,
    intentScore: 69,
    stage: "New",
    nextStep: "Validate phone number and regional decision maker map",
    tags: ["enterprise", "field-sales", "europe"],
    painPoints: ["multi-market coordination", "long sales cycles", "rep productivity"],
    recentSignal: "Opened 2 outbound emails and clicked case study",
    lastTouched: "4d ago",
  },
];

export const campaigns: Campaign[] = [
  {
    id: "CP-201",
    name: "Fintech Expansion Sprint",
    channelMix: ["Email", "LinkedIn", "Retargeting"],
    audience: "African fintech heads of growth",
    status: "Running",
    openRate: 53,
    replyRate: 17,
    meetings: 12,
    leads: 84,
    objective: "Book demos for outbound automation",
  },
  {
    id: "CP-202",
    name: "RevOps Cleanup Offer",
    channelMix: ["Email", "Call"],
    audience: "RevOps leaders with stale CRM data",
    status: "Running",
    openRate: 48,
    replyRate: 12,
    meetings: 8,
    leads: 57,
    objective: "Sell enrichment + routing workflows",
  },
  {
    id: "CP-203",
    name: "Founder-Led Pipeline Push",
    channelMix: ["Email", "LinkedIn"],
    audience: "Seed to Series A founders",
    status: "Draft",
    openRate: 0,
    replyRate: 0,
    meetings: 0,
    leads: 34,
    objective: "Generate first outbound wins for small teams",
  },
];

export const inbox: InboxMessage[] = [
  {
    id: "MSG-1",
    from: "Amara Okafor",
    company: "MonetaPay",
    subject: "Can your AI handle Nigeria + Kenya expansion?",
    preview: "We need region-specific messaging and better routing for demo requests.",
    sentiment: "Positive",
    recommendedReply:
      "Absolutely. We can segment by country, language, and product line, then route hot leads to the right rep instantly. I can show you a live fintech workflow tomorrow.",
    receivedAt: "11 min ago",
  },
  {
    id: "MSG-2",
    from: "Priya Shah",
    company: "CloudBench",
    subject: "Question about Salesforce sync",
    preview: "Do you support bi-directional sync and prevent duplicate records?",
    sentiment: "Neutral",
    recommendedReply:
      "Yes. The recommended setup uses a source-of-truth model, dedupe rules, and incremental enrichment so only changed records sync back to Salesforce.",
    receivedAt: "1 h ago",
  },
  {
    id: "MSG-3",
    from: "Lena Hart",
    company: "Northstar AI",
    subject: "Not the right timing right now",
    preview: "Our event team is overloaded until next month.",
    sentiment: "At Risk",
    recommendedReply:
      "Totally fair. I’ll pause the heavy follow-up and send a light event-to-pipeline checklist plus a reminder next month so we reconnect when timing is better.",
    receivedAt: "4 h ago",
  },
];

export const workflows: Workflow[] = [
  {
    id: "WF-1",
    name: "Inbound form enrichment + routing",
    trigger: "New form submit",
    actions: [
      "Enrich company and contact profile",
      "Score fit + intent",
      "Route to owner by segment",
      "Send booking link within 2 minutes",
    ],
    status: "Active",
    successRate: 96,
  },
  {
    id: "WF-2",
    name: "No-reply rescue sequence",
    trigger: "Lead silent after 5 days",
    actions: [
      "Generate new angle from persona",
      "Switch to LinkedIn touch",
      "Create follow-up task for rep",
    ],
    status: "Active",
    successRate: 71,
  },
  {
    id: "WF-3",
    name: "Call summary to CRM",
    trigger: "Meeting ends",
    actions: [
      "Write AI summary",
      "Extract action items",
      "Update pipeline stage",
      "Create follow-up email draft",
    ],
    status: "Draft",
    successRate: 0,
  },
];

export const tasks: Task[] = [
  { id: "TK-1", title: "Review MonetaPay meeting brief", owner: "You", priority: "High", due: "Today" },
  { id: "TK-2", title: "Approve Fintech Expansion Sprint copy", owner: "You", priority: "High", due: "Today" },
  { id: "TK-3", title: "Clean duplicate CloudBench contacts", owner: "Ops", priority: "Medium", due: "Tomorrow" },
  { id: "TK-4", title: "Launch founder-led sequence", owner: "Agent", priority: "Low", due: "Friday" },
];

export function searchLeads(query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return leads
      .slice()
      .sort((a, b) => b.fitScore + b.intentScore - (a.fitScore + a.intentScore));
  }

  const tokens = normalized.split(/\s+/).filter(Boolean);

  return leads
    .map((lead) => {
      const haystack = [
        lead.name,
        lead.title,
        lead.company,
        lead.industry,
        lead.companySize,
        lead.region,
        lead.nextStep,
        lead.recentSignal,
        ...lead.tags,
        ...lead.painPoints,
      ]
        .join(" ")
        .toLowerCase();

      const matches = tokens.reduce((acc, token) => acc + (haystack.includes(token) ? 1 : 0), 0);
      const score = matches * 20 + lead.fitScore * 0.45 + lead.intentScore * 0.55;
      return { lead, score, matches };
    })
    .filter((item) => item.matches > 0)
    .sort((a, b) => b.score - a.score)
    .map((item) => item.lead);
}

export function generateSequencePlan(prompt: string) {
  const p = prompt.toLowerCase();
  const audience = p.includes("fintech")
    ? "Fintech growth and sales leaders"
    : p.includes("founder")
      ? "Founder-led B2B SaaS teams"
      : p.includes("revops")
        ? "Revenue operations leaders"
        : "High-fit B2B decision makers";

  const objective = p.includes("meeting") || p.includes("demo")
    ? "Book a qualified demo"
    : p.includes("enrich")
      ? "Open a data cleanup conversation"
      : "Start high-intent conversations";

  return {
    audience,
    objective,
    steps: [
      "Day 1: Personalized email built from company signal + pain point",
      "Day 3: LinkedIn visit and connection with short context line",
      "Day 5: Follow-up email with proof point and 1 clear CTA",
      "Day 7: Call task created for leads above 85 intent score",
      "Day 10: Breakup email with softer value-first offer",
    ],
    guardrails: [
      "Pause sequence on positive reply",
      "Throttle volume per domain to protect deliverability",
      "Auto-route hot replies to the account owner",
    ],
  };
}
