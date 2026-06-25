import { Link, useLocation } from "wouter";
import { Logo } from "./logo";
import {
  LayoutDashboard,
  Users,
  MessageSquare,
  Mail,
  Zap,
  Settings,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/", label: "Home", icon: LayoutDashboard },
  { href: "/leads", label: "Leads", icon: Users },
  { href: "/chat", label: "AI Chat", icon: MessageSquare },
  { href: "/campaigns", label: "Campaigns", icon: Mail },
  { href: "/projects", label: "Projects", icon: Zap },
];

// Bottom tab items for mobile (5 max)
const BOTTOM_TABS = NAV_ITEMS;

// Sidebar includes Settings
const SIDEBAR_ITEMS = [...NAV_ITEMS, { href: "/settings", label: "Settings", icon: Settings }];

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  // Height of mobile header (56px) and bottom tab bar (56px + safe area)
  // We use CSS variables for this so the chat page can use full remaining height

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-background">
      {/* ── Desktop Sidebar ───────────────────────────────── */}
      <aside className="hidden md:flex flex-col w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border flex-shrink-0">
        <div className="p-6 flex items-center gap-3">
          <div className="bg-primary text-primary-foreground p-2 rounded-lg">
            <Logo className="w-6 h-6" />
          </div>
          <span className="font-bold text-xl tracking-tight">LaunchPad</span>
        </div>
        <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
          {SIDEBAR_ITEMS.map((item) => {
            const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href}>
                <div className={`flex items-center gap-3 px-3 py-2.5 rounded-md cursor-pointer transition-colors ${
                  isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium"
                    : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                }`}>
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  {item.label}
                </div>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* ── Mobile + Desktop Main Area ────────────────────── */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">

        {/* Mobile header */}
        <header className="md:hidden flex items-center justify-between px-4 h-14 bg-sidebar text-sidebar-foreground flex-shrink-0 pt-[env(safe-area-inset-top)]">
          <div className="flex items-center gap-2">
            <div className="bg-primary text-primary-foreground p-1.5 rounded-md">
              <Logo className="w-4 h-4" />
            </div>
            <span className="font-bold text-base">LaunchPad</span>
          </div>
          <Link href="/settings">
            <div className={`p-2 rounded-md ${location.startsWith("/settings") ? "text-primary" : "text-sidebar-foreground/75"}`}>
              <Settings className="w-5 h-5" />
            </div>
          </Link>
        </header>

        {/* Page content — scrollable, leaves room for bottom tabs on mobile */}
        <main className="flex-1 overflow-y-auto overscroll-none [&:has(.chat-fullscreen)]:overflow-hidden">
          <div className="w-full max-w-6xl mx-auto p-4 md:p-8 pb-24 md:pb-8 space-y-6 [.chat-page_&]:p-0 [.chat-page_&]:pb-0 [.chat-page_&]:space-y-0 [.chat-page_&]:h-full">
            {children}
          </div>
        </main>

        {/* ── Mobile Bottom Tab Bar ──────────────────────── */}
        <nav className="md:hidden flex-shrink-0 flex items-center justify-around bg-card border-t border-border pb-[env(safe-area-inset-bottom)]" style={{ minHeight: 56 }}>
          {BOTTOM_TABS.map((item) => {
            const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href}>
                <div className={`flex flex-col items-center justify-center px-3 py-1.5 min-w-[52px] ${
                  isActive ? "text-primary" : "text-muted-foreground"
                }`}>
                  <item.icon className={`w-5 h-5 mb-0.5 ${isActive ? "stroke-[2.5px]" : ""}`} />
                  <span className="text-[9px] font-medium leading-none">{item.label}</span>
                </div>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
