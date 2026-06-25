import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Logo } from "./logo";
import {
  LayoutDashboard,
  Users,
  MessageSquare,
  Mail,
  Zap,
  Settings,
  Menu,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/leads", label: "Leads", icon: Users },
  { href: "/chat", label: "AI Chat", icon: MessageSquare },
  { href: "/campaigns", label: "Campaigns", icon: Mail },
  { href: "/projects", label: "Projects", icon: Zap },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  return (
    <div className="min-h-[100dvh] flex flex-col md:flex-row bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-sidebar text-sidebar-foreground border-r border-sidebar-border h-screen sticky top-0">
        <div className="p-6 flex items-center gap-3">
          <div className="bg-primary text-primary-foreground p-2 rounded-lg">
            <Logo className="w-6 h-6" />
          </div>
          <span className="font-bold text-xl tracking-tight">LaunchPad</span>
        </div>

        <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href}>
                <div
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-md cursor-pointer transition-colors ${
                    isActive
                      ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium shadow-sm"
                      : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </div>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Mobile Top Header */}
      <header className="md:hidden flex items-center justify-between p-4 bg-sidebar text-sidebar-foreground sticky top-0 z-20">
        <div className="flex items-center gap-2">
          <div className="bg-primary text-primary-foreground p-1.5 rounded-md">
            <Logo className="w-5 h-5" />
          </div>
          <span className="font-bold text-lg">LaunchPad</span>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setIsMobileOpen(true)} className="text-sidebar-foreground hover:bg-sidebar-accent">
          <Menu className="w-6 h-6" />
        </Button>
      </header>

      {/* Mobile Menu Overlay */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 bg-sidebar text-sidebar-foreground md:hidden flex flex-col">
          <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
            <div className="flex items-center gap-2">
              <div className="bg-primary text-primary-foreground p-1.5 rounded-md">
                <Logo className="w-5 h-5" />
              </div>
              <span className="font-bold text-lg">LaunchPad</span>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setIsMobileOpen(false)} className="text-sidebar-foreground hover:bg-sidebar-accent">
              <X className="w-6 h-6" />
            </Button>
          </div>
          <nav className="flex-1 px-4 py-6 space-y-4 overflow-y-auto">
            {NAV_ITEMS.map((item) => {
              const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
              return (
                <Link key={item.href} href={item.href}>
                  <div
                    onClick={() => setIsMobileOpen(false)}
                    className={`flex items-center gap-4 px-4 py-3 rounded-lg text-lg ${
                      isActive
                        ? "bg-sidebar-primary text-sidebar-primary-foreground font-semibold shadow-md"
                        : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    }`}
                  >
                    <item.icon className="w-6 h-6" />
                    {item.label}
                  </div>
                </Link>
              );
            })}
          </nav>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 pb-20 md:pb-0 overflow-y-auto h-[100dvh]">
        <div className="flex-1 w-full max-w-6xl mx-auto p-4 md:p-8 space-y-6">
          {children}
        </div>
      </main>

      {/* Mobile Bottom Tab Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border flex items-center justify-around p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] z-10 shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
        {NAV_ITEMS.slice(0, 5).map((item) => {
          const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
          return (
            <Link key={item.href} href={item.href}>
              <div
                className={`flex flex-col items-center justify-center w-14 h-12 rounded-lg ${
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <item.icon className={`w-5 h-5 mb-1 ${isActive ? "fill-primary/20" : ""}`} />
                <span className="text-[10px] font-medium truncate w-full text-center">{item.label}</span>
              </div>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
