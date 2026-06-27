import { Link, useLocation } from "wouter";
import { Logo } from "./logo";
import {
  LayoutDashboard, Users, MessageSquare, Mail, Zap, Settings,
  ChevronRight, Bell,
} from "lucide-react";

const NAV_SECTIONS = [
  {
    label: "PLATFORM",
    items: [
      { href: "/", label: "Dashboard", icon: LayoutDashboard },
      { href: "/leads", label: "Leads", icon: Users },
      { href: "/chat", label: "AI Chat", icon: MessageSquare },
    ],
  },
  {
    label: "OUTREACH",
    items: [
      { href: "/campaigns", label: "Campaigns", icon: Mail },
      { href: "/projects", label: "Projects", icon: Zap },
    ],
  },
];

const ALL_NAV = NAV_SECTIONS.flatMap(s => s.items);
const BOTTOM_TABS = ALL_NAV; // mobile bottom bar

function isActive(href: string, location: string) {
  if (href === "/") return location === "/";
  return location === href || location.startsWith(href + "/") || location.startsWith(href + "?");
}

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-[#f6f8fb]">

      {/* ── Desktop Sidebar ─────────────────────────────────────── */}
      <aside className="hidden md:flex flex-col w-[220px] bg-[#13141a] text-white flex-shrink-0 border-r border-white/5">
        {/* Logo */}
        <div className="h-14 flex items-center gap-2.5 px-5 border-b border-white/5 flex-shrink-0">
          <div className="bg-indigo-500 text-white p-1.5 rounded-lg">
            <Logo className="w-4 h-4" />
          </div>
          <span className="font-bold text-[15px] tracking-tight text-white">LaunchPad</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5">
          {NAV_SECTIONS.map(section => (
            <div key={section.label}>
              <p className="text-[10px] font-semibold tracking-widest text-white/30 px-2 mb-1.5">
                {section.label}
              </p>
              <div className="space-y-0.5">
                {section.items.map(item => {
                  const active = isActive(item.href, location);
                  return (
                    <Link key={item.href} href={item.href}>
                      <div className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer transition-all text-[13.5px] font-medium group ${
                        active
                          ? "bg-indigo-600 text-white shadow-sm"
                          : "text-white/60 hover:bg-white/8 hover:text-white"
                      }`}>
                        <item.icon className="w-4 h-4 flex-shrink-0" />
                        <span className="flex-1">{item.label}</span>
                        {active && <ChevronRight className="w-3 h-3 opacity-60" />}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Bottom */}
        <div className="flex-shrink-0 border-t border-white/5 px-3 py-3 space-y-0.5">
          <Link href="/settings">
            <div className={`flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer transition-all text-[13.5px] font-medium ${
              isActive("/settings", location)
                ? "bg-indigo-600 text-white"
                : "text-white/60 hover:bg-white/8 hover:text-white"
            }`}>
              <Settings className="w-4 h-4 flex-shrink-0" />
              Settings
            </div>
          </Link>
        </div>
      </aside>

      {/* ── Main Area ───────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">

        {/* Desktop top bar */}
        <header className="hidden md:flex items-center justify-between h-14 px-6 bg-white border-b border-gray-200 flex-shrink-0">
          <div className="text-[13px] text-gray-500 capitalize">
            {location === "/" ? "Dashboard" : location.slice(1).split("/")[0]}
          </div>
          <div className="flex items-center gap-3">
            <button className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
              <Bell className="w-4 h-4" />
            </button>
            <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold">
              Y
            </div>
          </div>
        </header>

        {/* Mobile header */}
        <header className="md:hidden flex items-center justify-between px-4 h-14 bg-[#13141a] text-white flex-shrink-0 pt-[env(safe-area-inset-top)]">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-500 text-white p-1.5 rounded-md">
              <Logo className="w-4 h-4" />
            </div>
            <span className="font-bold text-[15px]">LaunchPad</span>
          </div>
          <Link href="/settings">
            <div className={`p-2 rounded-md ${isActive("/settings", location) ? "text-indigo-400" : "text-white/60"}`}>
              <Settings className="w-5 h-5" />
            </div>
          </Link>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto overscroll-none [&:has(.chat-fullscreen)]:overflow-hidden">
          <div className="w-full max-w-6xl mx-auto p-6 pb-24 md:pb-6 space-y-6 [.chat-page_&]:p-0 [.chat-page_&]:pb-0 [.chat-page_&]:space-y-0 [.chat-page_&]:h-full">
            {children}
          </div>
        </main>

        {/* Mobile Bottom Tab Bar */}
        <nav className="md:hidden flex-shrink-0 flex items-center justify-around bg-[#13141a] border-t border-white/5 pb-[env(safe-area-inset-bottom)]" style={{ minHeight: 56 }}>
          {BOTTOM_TABS.map((item) => {
            const active = isActive(item.href, location);
            return (
              <Link key={item.href} href={item.href}>
                <div className={`flex flex-col items-center justify-center px-3 py-1.5 min-w-[52px] transition-colors ${
                  active ? "text-indigo-400" : "text-white/40"
                }`}>
                  <item.icon className={`w-5 h-5 mb-0.5 ${active ? "stroke-[2.5px]" : ""}`} />
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
