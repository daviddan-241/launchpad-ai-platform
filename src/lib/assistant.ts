import { logActivityEvent } from "@/lib/activity";
import { generateSequencePlan, type Lead } from "@/lib/demo-data";
import { generateWorkspaceNarration } from "@/lib/ai";
import { addDealNote, addDealTask, createDeal, createDeliveryProject, moveDealStage } from "@/lib/crm";
import { createPaymentDraft } from "@/lib/payments";
import { generateProject, type GeneratedProject } from "@/lib/project-generator";
import { researchCompanyFromEmail, type CompanyResearch } from "@/lib/research";
import { processDueOutreachJobs, queueOutreachJob } from "@/lib/outreach";
import { readStore, type DealStage, type User } from "@/lib/store";
import { getUserPreference } from "@/lib/preferences";

type AssistantAction = {
  type:
    | "lead_search"
    | "campaign_plan"
    | "proposal"
    | "project_generated"
    | "outreach_draft"
    | "outreach_queued"
    | "blocked";
  title: string;
  detail: string;
  status: "done" | "pending" | "blocked";
};

type OutreachDraft = {
  subject: string;
  body: string;
  recipients: Array<{ id: string; email: string; name: string; company: string }>;
  queuedJobs?: number;
};

export type AssistantResult = {
  prompt: string;
  assistantMessage: string;
  summary: string;
  actions: AssistantAction[];
  leads: Array<{
    id: string;
    name: string;
    title: string;
    company: string;
    fitScore: number;
    intentScore: number;
    region: string;
    email: string;
  }>;
  research: CompanyResearch[];
  plan: {
    audience: string;
    objective: string;
    steps: string[];
    guardrails: string[];
  };
  proposal: {
    title: string;
    scope: string[];
    message: string;
  };
  project: GeneratedProject | null;
  outreach: OutreachDraft | null;
};

function searchStoreLeads(leads: Lead[], query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return leads.slice().sort((a, b) => b.fitScore + b.intentScore - (a.fitScore + a.intentScore));
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

function buildProposal(prompt: string, pricing: Awaited<ReturnType<typeof getUserPreference>>) {
  const lower = prompt.toLowerCase();
  const title = lower.includes("website") || lower.includes("web") || lower.includes("landing")
    ? "Custom web project proposal"
    : lower.includes("proposal")
      ? "Business proposal draft"
      : "Growth outreach proposal";

  const scope = [
    "Discovery and requirements summary",
    "Offer positioning matched to buyer pain points",
    "Clear timeline, deliverables, and next steps",
    "Follow-up email structure with professional tone",
    "CTA that moves the buyer toward a call or approval",
  ];

  const message = `Hi there — based on your request, I would frame the offer around one fast, outcome-driven first win. The proposal should start with the business pain point, explain the website or workflow value in plain language, define the MVP scope, set expectations for delivery, and close with one clear next step. For pricing, I would keep it accessible: starter ${pricing.currency} ${pricing.starterPrice}, business ${pricing.currency} ${pricing.businessPrice}, and premium ${pricing.currency} ${pricing.premiumPrice}. ${pricing.paymentInstructions}`;

  return { title, scope, message };
}

function buildOutreachDraft(
  prompt: string,
  leads: Lead[],
  pricing: Awaited<ReturnType<typeof getUserPreference>>,
) {
  const topRecipients = leads.slice(0, 3).map((lead) => ({
    id: lead.id,
    email: lead.email,
    name: lead.name,
    company: lead.company,
  }));

  const angle = prompt.toLowerCase().includes("web") || prompt.toLowerCase().includes("website")
    ? "a better-performing website and client conversion flow"
    : "a stronger outbound and follow-up system";

  const first = topRecipients[0];
  const subject = first
    ? `Idea for ${first.company}: ${angle}`
    : `Idea to improve your growth workflow`;

  const body = first
    ? `Hi ${first.name.split(" ")[0]},\n\nI noticed ${first.company} may benefit from ${angle}. I can help ship a focused MVP that improves how prospects discover, trust, and contact your business.\n\nFor budgeting, I keep the first version lean at about ${pricing.currency} ${pricing.starterPrice}. I only suggest part payment if there is clear hesitation around budget, timing, or risk. ${pricing.waitIfInactive ? "If you approve, I will wait for the owner to confirm the payment method before sharing checkout details." : pricing.paymentInstructions}\n\nIf useful, I can send a short proposal tailored to your current growth goals.\n\nBest,`
    : `Hi there,\n\nI can help shape a focused MVP and outreach workflow that gets you to a faster first result. Typical starter pricing begins around ${pricing.currency} ${pricing.starterPrice}. I only recommend part payment when the client is clearly hesitant. ${pricing.paymentInstructions}\n\nBest,`;

  return { subject, body, recipients: topRecipients };
}

export async function runAssistantCommand(prompt: string, user: User): Promise<AssistantResult> {
  const store = await readStore();
  const pricing = await getUserPreference(user.id);
  const matchedLeads = searchStoreLeads(store.leads, prompt).slice(0, 4);
  const research: CompanyResearch[] = [];
  if (/(research|analyze|analyse|proof|website|company)/i.test(prompt)) {
    for (const lead of matchedLeads.slice(0, 2)) {
      const note = await researchCompanyFromEmail(lead.email);
      if (note) research.push(note);
    }
  }
  const plan = generateSequencePlan(prompt);
  const proposal = buildProposal(prompt, pricing);
  const actions: AssistantAction[] = [];

  if (matchedLeads.length) {
    actions.push({
      type: "lead_search",
      title: `Matched ${matchedLeads.length} workspace lead(s)`,
      detail: "Ranked by fit, intent, and prompt relevance.",
      status: "done",
    });
    if (research.length) {
      actions.push({
        type: "lead_search",
        title: `Researched ${research.length} public company website(s)`,
        detail: "Pulled homepage title and description from live public pages.",
        status: "done",
      });
    }
  } else {
    actions.push({
      type: "lead_search",
      title: "No strong lead matches found in your saved workspace data",
      detail: "Import or add more leads to let the chat execute richer tasks.",
      status: "pending",
    });
  }

  actions.push({
    type: "campaign_plan",
    title: `Built a campaign plan for ${plan.audience}`,
    detail: plan.objective,
    status: "done",
  });

  actions.push({
    type: "proposal",
    title: proposal.title,
    detail: "Prepared a client-facing proposal angle and scope.",
    status: "done",
  });

  let project: GeneratedProject | null = null;
  let activeDealId: string | null = null;
  if (/(website|web|landing|html|project|mvp)/i.test(prompt)) {
    project = generateProject(prompt);
    actions.push({
      type: "project_generated",
      title: `Generated starter project: ${project.title}`,
      detail: "Includes HTML, CSS, JS, preview, and proposal framing.",
      status: "done",
    });
  }

  let outreach: OutreachDraft | null = null;
  if (/(email|outreach|follow-up|follow up|send|proposal)/i.test(prompt)) {
    outreach = buildOutreachDraft(prompt, matchedLeads, pricing);
    actions.push({
      type: "outreach_draft",
      title: "Prepared outreach draft",
      detail: outreach.recipients.length
        ? `Drafted a message for ${outreach.recipients.length} matched lead(s).`
        : "Drafted a reusable message template.",
      status: "done",
    });
  }

  if (/(deal|pipeline|opportunity)/i.test(prompt) && matchedLeads[0]) {
    const deal = await createDeal({
      user,
      clientName: matchedLeads[0].name,
      clientEmail: matchedLeads[0].email,
      company: matchedLeads[0].company,
      value: pricing.starterPrice,
      currency: pricing.currency,
      description: proposal.title,
      leadId: matchedLeads[0].id,
      nextAction: "Review proposal and schedule discovery",
    });
    activeDealId = deal.id;
    actions.push({
      type: "proposal",
      title: `Created deal for ${deal.clientName}`,
      detail: `${deal.company} entered the pipeline at ${deal.stage}.`,
      status: "done",
    });
  }

  if (/(proposal stage|move .*proposal|stage proposal)/i.test(prompt)) {
    const existingDeal = activeDealId
      ? { id: activeDealId, clientName: matchedLeads[0]?.name || "Client" }
      : store.deals.find((deal) => deal.userId === user.id);
    if (existingDeal) {
      await moveDealStage({ user, dealId: existingDeal.id, stage: "Proposal" as DealStage, nextAction: "Send proposal and wait for feedback" });
      actions.push({
        type: "proposal",
        title: `Moved deal to Proposal stage`,
        detail: existingDeal.clientName,
        status: "done",
      });
    }
  }

  if (/(start project|start delivery|delivery project|build website|begin build)/i.test(prompt) && matchedLeads[0]) {
    const deliveryProject = await createDeliveryProject({
      user,
      title: project ? project.title : `${matchedLeads[0].company} Delivery`,
      clientName: matchedLeads[0].name,
      clientEmail: matchedLeads[0].email,
      scope: project ? project.summary : "Discovery, design, build, and handoff",
      acceptanceRequired: /accept|signature/i.test(prompt),
    });
    actions.push({
      type: "project_generated",
      title: `Created delivery project ${deliveryProject.title}`,
      detail: `${deliveryProject.clientName} handoff is now tracked.`,
      status: "done",
    });
  }

  if (/(payment|invoice|part payment|monthly payment|signature)/i.test(prompt) && matchedLeads[0]) {
    const hesitant = /(hesitat|not sure|uncertain|concern|budget issue|too expensive|price issue)/i.test(prompt);
    const requestedType = /monthly/i.test(prompt)
      ? "monthly"
      : /part payment|deposit/i.test(prompt) || hesitant
        ? "part"
        : "full";

    const discountedAmount = hesitant ? Math.round(pricing.starterPrice * 0.6) : pricing.starterPrice;

    await createPaymentDraft({
      user,
      clientName: matchedLeads[0].name,
      clientEmail: matchedLeads[0].email,
      description: project ? `${project.title} delivery` : proposal.title,
      amount: discountedAmount,
      currency: pricing.currency,
      paymentType: requestedType,
      installmentCount: requestedType === "monthly" ? 3 : requestedType === "part" ? 2 : 1,
      signatureRequired: /signature/i.test(prompt),
      sourceLeadId: matchedLeads[0].id,
    });
    actions.push({
      type: "proposal",
      title: `Created payment draft for ${matchedLeads[0].name}`,
      detail: hesitant
        ? `Price reduced to 60% (${pricing.currency} ${discountedAmount}) as ${requestedType} payment due to client hesitation. Pending owner approval.`
        : `${pricing.currency} ${discountedAmount} as ${requestedType} payment, pending owner approval.`,
      status: "done",
    });
  }

  if (/(add note|note for|save note|log note)/i.test(prompt)) {
    const existingDeal = store.deals.find((deal) => deal.userId === user.id);
    if (existingDeal) {
      const noteContent = prompt.replace(/(add note|note for|save note|log note)[:\s]*/i, "").trim() || prompt;
      await addDealNote({ user, dealId: existingDeal.id, content: noteContent });
      actions.push({
        type: "proposal",
        title: `Note saved for ${existingDeal.clientName}`,
        detail: noteContent.slice(0, 80),
        status: "done",
      });
    }
  }

  const followUpMatch = prompt.match(/follow.?up in (\d+)\s*(minute|min|hour|hr|day)/i);
  if (followUpMatch && matchedLeads[0]) {
    const qty = parseInt(followUpMatch[1], 10);
    const unit = followUpMatch[2].toLowerCase();
    const msMap: Record<string, number> = { minute: 60000, min: 60000, hour: 3600000, hr: 3600000, day: 86400000 };
    const delayMs = qty * (msMap[unit] ?? 60000);
    const sendAt = new Date(Date.now() + delayMs).toISOString();

    const account = store.emailAccounts.find((item) => item.userId === user.id);
    if (account) {
      await queueOutreachJob({
        userId: user.id,
        accountId: account.id,
        provider: account.provider,
        fromEmail: account.email,
        to: matchedLeads[0].email,
        subject: `Following up — ${matchedLeads[0].company}`,
        body: `Hi ${matchedLeads[0].name.split(" ")[0]},\n\nJust checking in to see if you had a chance to review what we discussed. Happy to answer any questions or adjust the scope.\n\nBest,`,
        sendAt,
      });
      actions.push({
        type: "outreach_queued",
        title: `Follow-up queued in ${qty} ${unit}(s)`,
        detail: `Scheduled for ${matchedLeads[0].name} at ${matchedLeads[0].email}`,
        status: "done",
      });
    } else {
      actions.push({
        type: "blocked",
        title: `Could not schedule follow-up in ${qty} ${unit}(s)`,
        detail: "Connect an email account in Settings first.",
        status: "blocked",
      });
    }
  }

  if (/(create task|add task|task for)/i.test(prompt)) {
    const existingDeal = store.deals.find((deal) => deal.userId === user.id);
    if (existingDeal) {
      const taskTitle = prompt.replace(/(create task|add task|task for)[:\s]*/i, "").trim() || "Review and follow up";
      const timeMatch = prompt.match(/in (\d+)\s*(minute|min|hour|hr|day)/i);
      let dueAt: string | undefined;
      if (timeMatch) {
        const qty = parseInt(timeMatch[1], 10);
        const unit = timeMatch[2].toLowerCase();
        const msMap: Record<string, number> = { minute: 60000, min: 60000, hour: 3600000, hr: 3600000, day: 86400000 };
        dueAt = new Date(Date.now() + qty * (msMap[unit] ?? 60000)).toISOString();
      }
      await addDealTask({ user, dealId: existingDeal.id, title: taskTitle, dueAt });
      actions.push({
        type: "proposal",
        title: `Task created: ${taskTitle}`,
        detail: dueAt ? `Due at ${new Date(dueAt).toLocaleString()}` : "No deadline",
        status: "done",
      });
    }
  }

  const explicitSend = /send now|queue now|start sending|begin outreach/i.test(prompt);
  if (explicitSend) {
    const account = store.emailAccounts.find((item) => item.userId === user.id);
    if (account && outreach?.recipients.length) {
      let queued = 0;
      for (const recipient of outreach.recipients) {
        await queueOutreachJob({
          userId: user.id,
          accountId: account.id,
          provider: account.provider,
          fromEmail: account.email,
          to: recipient.email,
          subject: outreach.subject,
          body: outreach.body,
          sendAt: new Date().toISOString(),
        });
        queued += 1;
      }

      await processDueOutreachJobs();
      outreach = { ...outreach, queuedJobs: queued };
      actions.push({
        type: "outreach_queued",
        title: `Queued ${queued} real outreach job(s)`,
        detail: `Using connected ${account.provider} account ${account.email}.`,
        status: "done",
      });
    } else {
      actions.push({
        type: "blocked",
        title: "Could not queue outreach",
        detail: "Connect Gmail/Outlook in Settings and ensure your saved leads have email addresses.",
        status: "blocked",
      });
    }
  }

  const assistantMessage = await generateWorkspaceNarration({
    prompt,
    userName: user.name,
    leads: matchedLeads.map((lead) => ({
      name: lead.name,
      company: lead.company,
      title: lead.title,
      region: lead.region,
    })),
    plan,
    actionTitles: actions.map((item) => item.title),
  });

  await logActivityEvent({
    userId: user.id,
    type: project ? "project" : "assistant",
    title: `Dave processed command`,
    detail: prompt,
    status: "done",
  });

  return {
    prompt,
    assistantMessage,
    summary: `Processed your request with lead search, campaign planning, and chat-driven workspace actions for ${user.name}.`,
    actions,
    leads: matchedLeads.map((lead) => ({
      id: lead.id,
      name: lead.name,
      title: lead.title,
      company: lead.company,
      fitScore: lead.fitScore,
      intentScore: lead.intentScore,
      region: lead.region,
      email: lead.email,
    })),
    research,
    plan,
    proposal,
    project,
    outreach,
  };
}
