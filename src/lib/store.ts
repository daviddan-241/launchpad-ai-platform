import { promises as fs } from "node:fs";
import path from "node:path";
import {
  campaigns as seedCampaigns,
  inbox as seedInbox,
  leads as seedLeads,
  tasks as seedTasks,
  workflows as seedWorkflows,
  type Campaign,
  type InboxMessage,
  type Lead,
  type Task,
  type Workflow,
} from "@/lib/demo-data";

export type User = {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  createdAt: string;
  lastSeenAt?: string;
};

export type Session = {
  token: string;
  userId: string;
  createdAt: string;
};

export type EmailProvider = "google" | "microsoft" | "smtp";

export type EmailAccount = {
  id: string;
  userId: string;
  provider: EmailProvider;
  email: string;
  refreshTokenEncrypted: string;
  connectedAt: string;
  updatedAt: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpSecure?: boolean;
  smtpUsername?: string;
  smtpFromName?: string;
};

export type OutreachJobStatus = "queued" | "sending" | "sent" | "failed";

export type OutreachJob = {
  id: string;
  userId: string;
  accountId: string;
  provider: EmailProvider;
  fromEmail: string;
  to: string;
  subject: string;
  html: string;
  text: string;
  sendAt: string;
  createdAt: string;
  status: OutreachJobStatus;
  sentAt?: string;
  error?: string;
  campaignId?: string;
  leadId?: string;
};

export type ActivityEvent = {
  id: string;
  userId: string;
  type:
    | "assistant"
    | "lead"
    | "campaign"
    | "workflow"
    | "outreach"
    | "integration"
    | "project"
    | "settings"
    | "payment"
    | "presence"
    | "deal"
    | "delivery";
  title: string;
  detail: string;
  status: "done" | "pending" | "failed";
  createdAt: string;
};

export type UserPreference = {
  userId: string;
  currency: string;
  starterPrice: number;
  businessPrice: number;
  premiumPrice: number;
  paymentInstructions: string;
  waitIfInactive: boolean;
  autoPreparePaymentAfterMinutes: number;
  autoPreparePaymentEnabled: boolean;
};

export type PaymentRequestStatus =
  | "draft"
  | "awaiting_approval"
  | "link_ready"
  | "sent"
  | "paid"
  | "declined"
  | "failed";

export type PaymentRequest = {
  id: string;
  userId: string;
  clientName: string;
  clientEmail: string;
  description: string;
  amount: number;
  currency: string;
  paymentType: "full" | "part" | "monthly";
  installmentCount?: number;
  signatureRequired: boolean;
  provider: "flutterwave";
  status: PaymentRequestStatus;
  providerLink?: string;
  providerReference?: string;
  createdAt: string;
  updatedAt: string;
  sourceLeadId?: string;
  sourceCampaignId?: string;
  ownerApprovalRequired: boolean;
  approvedAt?: string;
  declinedAt?: string;
  sentAt?: string;
  paidAt?: string;
  lastError?: string;
};

export type DealStage = "Lead" | "Discovery" | "Proposal" | "Negotiation" | "Won" | "Lost";

export type DealNote = {
  id: string;
  dealId: string;
  userId: string;
  content: string;
  createdAt: string;
};

export type DealTask = {
  id: string;
  dealId: string;
  userId: string;
  title: string;
  dueAt?: string;
  done: boolean;
  createdAt: string;
};

export type Deal = {
  id: string;
  userId: string;
  leadId?: string;
  clientName: string;
  clientEmail: string;
  company: string;
  value: number;
  currency: string;
  stage: DealStage;
  description: string;
  createdAt: string;
  updatedAt: string;
  nextAction?: string;
  closedAt?: string;
  notes?: DealNote[];
  tasks?: DealTask[];
};

export type DeliveryMilestoneStatus = "Planned" | "In Progress" | "Blocked" | "Completed";

export type DeliveryMilestone = {
  id: string;
  title: string;
  due?: string;
  status: DeliveryMilestoneStatus;
  notes?: string;
};

export type DeliveryProjectStatus = "Not Started" | "Planning" | "Building" | "Review" | "Delivered";

export type DeliveryProject = {
  id: string;
  userId: string;
  dealId?: string;
  clientName: string;
  clientEmail: string;
  title: string;
  scope: string;
  status: DeliveryProjectStatus;
  acceptanceRequired: boolean;
  createdAt: string;
  updatedAt: string;
  milestones: DeliveryMilestone[];
};

export type AppStore = {
  users: User[];
  sessions: Session[];
  leads: Lead[];
  campaigns: Campaign[];
  inbox: InboxMessage[];
  workflows: Workflow[];
  tasks: Task[];
  emailAccounts: EmailAccount[];
  outreachJobs: OutreachJob[];
  activityEvents: ActivityEvent[];
  userPreferences: UserPreference[];
  paymentRequests: PaymentRequest[];
  deals: Deal[];
  deliveryProjects: DeliveryProject[];
  autonomousCampaigns: AutonomousCampaign[];
};


export type AutoCampaignStepStatus = "pending" | "emailed" | "followed_up" | "replied" | "interested" | "payment_sent" | "paid" | "declined" | "no_reply";

export type AutoCampaignStep = {
  leadId: string;
  leadName: string;
  leadEmail: string;
  company: string;
  status: AutoCampaignStepStatus;
  outreachJobId?: string;
  replyText?: string;
  paymentId?: string;
  lastActionAt: string;
};

export type AutoCampaignStatus = "running" | "paused" | "completed" | "failed";

export type AutonomousCampaign = {
  id: string;
  userId: string;
  name: string;
  niche: string;
  offer: string;
  price: number;
  currency: string;
  targetCount: number;
  region?: string;
  status: AutoCampaignStatus;
  steps: AutoCampaignStep[];
  emailAccountId: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  totalEmailed: number;
  totalReplied: number;
  totalPaid: number;
  totalRevenue: number;
};

const dataRoot = process.env.DATA_DIR || path.join(process.cwd(), "data");
const dataPath = path.join(dataRoot, "app-data.json");

function seedStore(): AppStore {
  return {
    users: [],
    sessions: [],
    leads: structuredClone(seedLeads),
    campaigns: structuredClone(seedCampaigns),
    inbox: structuredClone(seedInbox),
    workflows: structuredClone(seedWorkflows),
    tasks: structuredClone(seedTasks),
    emailAccounts: [],
    outreachJobs: [],
    activityEvents: [],
    userPreferences: [],
    paymentRequests: [],
    deals: [],
    deliveryProjects: [],
    autonomousCampaigns: [],
  };
}

async function ensureStore() {
  await fs.mkdir(path.dirname(dataPath), { recursive: true });

  try {
    const raw = await fs.readFile(dataPath, "utf8");
    const parsed = JSON.parse(raw) as Partial<AppStore>;
    const base = seedStore();

    const hydrated: AppStore = {
      users: Array.isArray(parsed.users) ? parsed.users : [],
      sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
      leads: Array.isArray(parsed.leads) && parsed.leads.length ? parsed.leads : base.leads,
      campaigns: Array.isArray(parsed.campaigns) && parsed.campaigns.length ? parsed.campaigns : base.campaigns,
      inbox: Array.isArray(parsed.inbox) && parsed.inbox.length ? parsed.inbox : base.inbox,
      workflows: Array.isArray(parsed.workflows) && parsed.workflows.length ? parsed.workflows : base.workflows,
      tasks: Array.isArray(parsed.tasks) && parsed.tasks.length ? parsed.tasks : base.tasks,
      emailAccounts: Array.isArray(parsed.emailAccounts) ? parsed.emailAccounts : [],
      outreachJobs: Array.isArray(parsed.outreachJobs) ? parsed.outreachJobs : [],
      activityEvents: Array.isArray(parsed.activityEvents) ? parsed.activityEvents : [],
      userPreferences: Array.isArray(parsed.userPreferences) ? parsed.userPreferences : [],
      paymentRequests: Array.isArray(parsed.paymentRequests) ? parsed.paymentRequests : [],
      deals: Array.isArray(parsed.deals) ? parsed.deals : [],
      deliveryProjects: Array.isArray(parsed.deliveryProjects) ? parsed.deliveryProjects : [],
      autonomousCampaigns: Array.isArray(parsed.autonomousCampaigns) ? parsed.autonomousCampaigns : [],
    };

    await fs.writeFile(dataPath, JSON.stringify(hydrated, null, 2));
  } catch {
    await fs.writeFile(dataPath, JSON.stringify(seedStore(), null, 2));
  }
}

export async function readStore(): Promise<AppStore> {
  await ensureStore();
  const raw = await fs.readFile(dataPath, "utf8");
  return JSON.parse(raw) as AppStore;
}

export async function writeStore(store: AppStore) {
  await ensureStore();
  await fs.writeFile(dataPath, JSON.stringify(store, null, 2));
}

export async function updateStore(mutator: (store: AppStore) => AppStore | void) {
  const current = await readStore();
  const copy = structuredClone(current) as AppStore;
  const next = mutator(copy) ?? copy;
  await writeStore(next);
  return next;
}

export function createId(prefix: string) {
  const stamp = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `${prefix}-${stamp}${rand}`;
}
