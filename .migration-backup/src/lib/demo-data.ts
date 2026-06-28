// Type definitions — no fake/seed data. All data comes from user input or real AI.

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
  fromEmail?: string;
  company: string;
  subject: string;
  preview: string;
  emailBody?: string;
  sentiment: "Positive" | "Neutral" | "At Risk";
  recommendedReply: string;
  receivedAt: string;
  leadId?: string;
  campaignId?: string;
  campaignStepLeadId?: string;
  externalMessageId?: string;
  threadId?: string;
  replySent?: boolean;
  replySentAt?: string;
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

// All arrays start empty — data is added by users or real AI generation
export const leads: Lead[] = [];
export const campaigns: Campaign[] = [];
export const inbox: InboxMessage[] = [];
export const workflows: Workflow[] = [];
export const tasks: Task[] = [];
