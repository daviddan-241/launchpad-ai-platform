"use client";

import Image from "next/image";
import { NAV_ICONS, IconChat } from "@/components/icons";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { LogoutButton } from "@/components/logout-button";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";
import { UserPresencePing } from "@/components/user-presence-ping";
import type { User } from "@/lib/store";

const navItems = [
  { href: "/chat", label: "Chat" },
  { href: "/activity", label: "Activity" },
  { href: "/projects", label: "Projects" },
  { href: "/dashboard", label: "Overview" },
  { href: "/leads", label: "Leads" },
  { href: "/deals", label: "Deals" },
  { href: "/campaigns", label: "Campaigns" },
  { href: "/conversations", label: "Conversations" },
  { href: "/payments", label: "Payments" },
  { href: "/delivery", label: "Delivery" },
  { href: "/inbox", label: "Inbox" },
  { href: "/workflows", label: "Workflows" },
  { href: "/settings", label: "Settings" },
];

function Sidebar({ user, onNavigate }: { user: User; onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col bg-[#140a1e] px-5 py-6">
      <div className="flex items-center justify-between gap-3">
        <Link href="/" className="inline-flex items-center gap-3" onClick={onNavigate}>
          <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-violet-400/15 ring-1 ring-fuchsia-300/20">
            <Image src="/leadforge-icon.png" alt="LeadForge" width={48} height={48} className="h-full w-full" />
          </div>
          <Image src="/leadforge-wordmark.png" alt="LeadForge" width={168} height={40} className="h-8 w-auto" />
        </Link>
        <LogoutButton />
      </div>

      <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-4">
        <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Workspace owner</p>
        <p className="mt-2 text-sm font-semibold text-white">{user.name}</p>
        <p className="text-xs text-slate-400">{user.email}</p>
      </div>

      <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-4">
        <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Dave command</p>
        <p className="mt-2 text-sm text-slate-200">Find leads, draft proposals, generate a project, and queue follow-ups.</p>
      </div>

      <nav className="mt-8 space-y-2 overflow-y-auto">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm text-slate-300 transition hover:bg-white/8 hover:text-white"
          >
            {(() => { const Icon = NAV_ICONS[item.href] ?? IconChat; return <Icon className="h-4 w-4 flex-shrink-0 text-slate-500" />; })()}
            <span className="flex-1">{item.label}</span>
          </Link>
        ))}
      </nav>

      <div className="mt-8 rounded-3xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm text-amber-50">
        <p className="font-semibold">Active pipeline</p>
        <p className="mt-2 text-3xl font-bold">${pipelineValue.toLocaleString()}</p>
        <p className="mt-1 text-amber-100/70">deals + payment drafts</p>
      </div>
    </div>
  );
}

export function AppShell({ children, user, pipelineValue = 0 }: { children: ReactNode; user: User; pipelineValue?: number }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#110718] text-white">
      <UserPresencePing />
      <div className="mx-auto grid min-h-screen max-w-[1600px] grid-cols-1 lg:grid-cols-[280px_1fr]">
        <aside className="hidden border-r border-white/10 lg:block">
          <Sidebar user={user} />
        </aside>

        {mobileOpen ? (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} aria-label="Close navigation" />
            <aside className="relative z-10 h-full w-[86vw] max-w-[336px] border-r border-white/10 shadow-2xl shadow-black/40">
              <Sidebar user={user} onNavigate={() => setMobileOpen(false)} />
            </aside>
          </div>
        ) : null}

        <main className="bg-[radial-gradient(circle_at_top,_rgba(217,70,239,0.14),_transparent_30%),linear-gradient(180deg,#120818_0%,#09050e_100%)]">
          <header className="sticky top-0 z-30 border-b border-white/10 bg-[#120818]/88 px-4 py-3 backdrop-blur">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setMobileOpen(true)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white lg:hidden"
                  aria-label="Open sidebar"
                >
                  ☰
                </button>
                <Link href="/chat" className="flex items-center gap-3 lg:hidden">
                  <div className="h-10 w-10 overflow-hidden rounded-2xl ring-1 ring-fuchsia-300/20">
                    <Image src="/leadforge-icon.png" alt="LeadForge" width={40} height={40} className="h-full w-full" />
                  </div>
                  <Image src="/leadforge-wordmark.png" alt="LeadForge" width={140} height={32} className="h-7 w-auto" />
                </Link>
                <div className="hidden lg:block">
                  <p className="text-xs uppercase tracking-[0.22em] text-fuchsia-300">LeadForge</p>
                  <p className="text-[11px] text-slate-400">Command and activity workspace</p>
                </div>
              </div>
              <div className="lg:hidden">
                <LogoutButton />
              </div>
            </div>
          </header>

          <div className="p-4 pb-24 sm:p-6 sm:pb-24 lg:p-8 lg:pb-8">{children}</div>
        </main>
      </div>
      <MobileBottomNav />
    </div>
  );
}
