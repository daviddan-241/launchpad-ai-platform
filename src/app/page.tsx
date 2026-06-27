import Image from "next/image";
import Link from "next/link";

const HERO_LEAD = {
  name: "Sarah Chen",
  title: "VP of Sales",
  company: "Vantage Cloud",
  recentSignal: "Hiring 5 BDRs and posted about pipeline velocity challenges",
  fitScore: 94,
  intentScore: 91,
};

const HERO_CAMPAIGNS = [
  { id: "1", status: "Running", name: "SaaS Outreach Sprint", channelMix: ["Email", "LinkedIn"] },
  { id: "2", status: "Running", name: "Founder Pipeline", channelMix: ["Email", "Call"] },
  { id: "3", status: "Draft", name: "RevOps Sequence", channelMix: ["Email"] },
];

const HERO_WORKFLOWS = [
  { id: "1", name: "Inbound form enrichment + routing", successRate: 96 },
  { id: "2", name: "No-reply rescue sequence", successRate: 71 },
  { id: "3", name: "Reply to CRM stage sync", successRate: 88 },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(217,70,239,0.18),_transparent_32%),linear-gradient(180deg,#110718_0%,#07050a_100%)] text-white">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6 lg:px-10">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-fuchsia-300/15 ring-1 ring-fuchsia-200/20">
            <Image src="/leadforge-icon.png" alt="LeadForge" width={48} height={48} className="h-full w-full" />
          </div>
          <Image src="/leadforge-wordmark.png" alt="LeadForge" width={180} height={40} className="h-8 w-auto" />
        </div>

        <nav className="hidden items-center gap-4 text-sm text-slate-300 md:flex">
          <a href="#features" className="hover:text-white">Features</a>
          <a href="#modules" className="hover:text-white">Modules</a>
          <Link href="/login" className="rounded-full border border-white/15 px-4 py-2 hover:bg-white/5">Login</Link>
          <Link href="/signup" className="rounded-full bg-fuchsia-300 px-4 py-2 font-semibold text-slate-950 hover:bg-fuchsia-200">Create free account</Link>
        </nav>
      </header>

      <main>
        <section className="mx-auto grid max-w-7xl gap-12 px-6 pb-16 pt-8 lg:grid-cols-[1.05fr_0.95fr] lg:px-10 lg:pb-24 lg:pt-16">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-fuchsia-300/20 bg-fuchsia-300/10 px-4 py-2 text-xs uppercase tracking-[0.25em] text-fuchsia-100">
              Unique brand · mobile-first autonomous workspace
            </div>
            <h1 className="mt-6 max-w-4xl text-5xl font-semibold leading-[1.02] tracking-tight text-white md:text-6xl lg:text-7xl">
              Run lead discovery, outreach, projects, and autonomous workflows in one original revenue workspace.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300 md:text-xl">
              LeadForge uses a custom plum, fuchsia, and amber identity with a mobile-first layout, persistent workspaces, chat-first execution, and real integration paths.
            </p>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center rounded-full bg-fuchsia-300 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-fuchsia-200"
              >
                Start free
              </Link>
              <Link
                href="/chat"
                className="inline-flex items-center justify-center rounded-full border border-white/15 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/5"
              >
                Open workspace chat
              </Link>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              {[
                { label: "Accounts", value: "Free signup + login" },
                { label: "Persistence", value: "Drafts saved across screens" },
                { label: "UI", value: "iPhone-first fit" },
              ].map((item) => (
                <div key={item.label} className="rounded-3xl border border-white/10 bg-white/5 p-4">
                  <p className="text-sm text-slate-400">{item.label}</p>
                  <p className="mt-2 text-lg font-semibold text-white">{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[32px] border border-white/10 bg-[#191027] p-5 shadow-2xl shadow-black/20">
            <div className="rounded-[28px] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] text-fuchsia-300">Dave command</p>
                  <h2 className="mt-2 text-xl font-semibold">Find high-intent companies, generate the project, and queue the next follow-up</h2>
                </div>
                <span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-xs text-amber-100">
                  live workflow ready
                </span>
              </div>

              <div className="mt-5 rounded-3xl border border-white/10 bg-[#0b0610] p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-lg font-semibold">{HERO_LEAD.name}</p>
                    <p className="text-sm text-slate-400">{HERO_LEAD.title} · {HERO_LEAD.company}</p>
                    <p className="mt-2 text-sm text-slate-300">{HERO_LEAD.recentSignal}</p>
                  </div>
                  <div className="grid gap-2 text-xs">
                    <span className="rounded-full border border-white/10 px-3 py-1 text-center">Fit {HERO_LEAD.fitScore}</span>
                    <span className="rounded-full border border-white/10 px-3 py-1 text-center">Intent {HERO_LEAD.intentScore}</span>
                  </div>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  {HERO_CAMPAIGNS.map((campaign) => (
                    <div key={campaign.id} className="rounded-2xl border border-white/8 bg-white/5 p-3">
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{campaign.status}</p>
                      <p className="mt-2 text-sm font-semibold text-white">{campaign.name}</p>
                      <p className="mt-2 text-xs text-slate-400">{campaign.channelMix.join(" · ")}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="mx-auto max-w-7xl px-6 py-10 lg:px-10">
          <div className="max-w-2xl">
            <p className="text-xs uppercase tracking-[0.25em] text-fuchsia-300">How it works</p>
            <h2 className="mt-3 text-3xl font-semibold md:text-4xl">A mobile-first workspace from search to send</h2>
          </div>

          <div className="mt-8 grid gap-5 lg:grid-cols-3">
            {[
              {
                step: "01",
                title: "Discover",
                text: "Use natural-language chat to search your saved leads, surface the strongest signals, and choose the best next move.",
              },
              {
                step: "02",
                title: "Create",
                text: "Generate project proposals, outreach copy, and MVP starter sites that can be previewed and downloaded immediately.",
              },
              {
                step: "03",
                title: "Execute",
                text: "Queue real follow-ups, monitor autonomous activity, and stay in control of payment and approval rules.",
              },
            ].map((item) => (
              <div key={item.step} className="rounded-[30px] border border-white/10 bg-white/5 p-6">
                <p className="text-sm font-semibold text-fuchsia-300">{item.step}</p>
                <h3 className="mt-4 text-2xl font-semibold">{item.title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-300">{item.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="modules" className="mx-auto max-w-7xl px-6 py-10 lg:px-10">
          <div className="grid gap-5 lg:grid-cols-2">
            {[
              {
                title: "Chat + Workers",
                bullets: ["Command-first workspace", "Worker activity visibility", "Persistent drafts", "Pricing-aware proposals"],
              },
              {
                title: "Outreach",
                bullets: ["Connected Gmail/Outlook", "Queued follow-ups", "Reply thread visibility", "Owner approval flow"],
              },
              {
                title: "Project Generation",
                bullets: ["Proposal-ready messaging", "Static MVP code output", "Preview and download", "Fast client delivery setup"],
              },
              {
                title: "Activity + Control",
                bullets: ["Timeline of Dave actions", "Running task board", "Follow-up queue", "Mobile-first navigation"],
              },
            ].map((module) => (
              <div key={module.title} className="rounded-[32px] border border-white/10 bg-[#191027] p-6">
                <p className="text-xs uppercase tracking-[0.25em] text-fuchsia-300">Module</p>
                <h3 className="mt-3 text-2xl font-semibold">{module.title}</h3>
                <ul className="mt-4 space-y-3 text-sm text-slate-300">
                  {module.bullets.map((bullet) => (
                    <li key={bullet} className="flex items-start gap-3">
                      <span className="mt-1 h-2.5 w-2.5 rounded-full bg-fuchsia-300" />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-6 py-10 pb-24 lg:px-10">
          <div className="rounded-[36px] border border-white/10 bg-white/5 p-6 lg:p-8">
            <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-fuchsia-300">Build status</p>
                <h2 className="mt-3 text-3xl font-semibold">Original brand, real workspace flow, mobile-first fit</h2>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300">
                  LeadForge now includes custom branding, saved activity, pricing control, chat-driven workspace actions, project generation, and an iPhone-friendly sidebar layout.
                </p>
              </div>

              <div className="rounded-[28px] border border-white/10 bg-[#0b0610] p-5">
                <p className="text-sm font-semibold text-white">Automation coverage</p>
                <div className="mt-4 space-y-4">
                  {HERO_WORKFLOWS.map((workflow) => (
                    <div key={workflow.id}>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-200">{workflow.name}</span>
                        <span className="text-slate-400">{workflow.successRate}%</span>
                      </div>
                      <div className="mt-2 h-2 rounded-full bg-white/10">
                        <div className="h-2 rounded-full bg-fuchsia-300" style={{ width: `${workflow.successRate}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
