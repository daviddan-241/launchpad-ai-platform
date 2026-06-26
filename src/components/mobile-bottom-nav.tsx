"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ChatIcon = () => (
  <svg viewBox="0 0 28 28" fill="currentColor" className="h-[22px] w-[22px]">
    <path d="M14 2C7.373 2 2 6.926 2 13c0 2.21.717 4.26 1.94 5.94L2.07 24.84a.75.75 0 0 0 .974.93l6.33-2.4A12.1 12.1 0 0 0 14 24c6.627 0 12-4.926 12-11S20.627 2 14 2Z" />
  </svg>
);

const LeadsIcon = () => (
  <svg viewBox="0 0 28 28" fill="currentColor" className="h-[22px] w-[22px]">
    <circle cx="10" cy="8" r="4.5" />
    <path d="M1.5 22c0-4.142 3.806-7.5 8.5-7.5 1.18 0 2.305.218 3.33.614A8.47 8.47 0 0 0 12 18.5c0 1.22.26 2.38.725 3.428L1.5 22Z" />
    <circle cx="19.5" cy="16.5" r="5.5" />
    <path d="M19.5 13.25v3.25H22.75" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" stroke="#0b0610" />
  </svg>
);

const DealsIcon = () => (
  <svg viewBox="0 0 28 28" fill="currentColor" className="h-[22px] w-[22px]">
    <rect x="2" y="4" width="10" height="13" rx="2" opacity="0.5" />
    <rect x="9" y="9" width="10" height="13" rx="2" opacity="0.7" />
    <rect x="16" y="6" width="10" height="13" rx="2" />
  </svg>
);

const InboxIcon = () => (
  <svg viewBox="0 0 28 28" fill="currentColor" className="h-[22px] w-[22px]">
    <path d="M3 6a2 2 0 0 1 2-2h18a2 2 0 0 1 2 2v10H17a1 1 0 0 0-.894.553L15 19h-2l-1.106-2.447A1 1 0 0 0 11 16H3V6Z" />
    <path d="M3 18v3a1 1 0 0 0 1 1h20a1 1 0 0 0 1-1v-3H17.618l-.724 1.447A2 2 0 0 1 15.118 20h-2.236a2 2 0 0 1-1.776-1.073L10.382 18H3Z" />
  </svg>
);

const PayIcon = () => (
  <svg viewBox="0 0 28 28" fill="currentColor" className="h-[22px] w-[22px]">
    <rect x="2" y="6" width="24" height="16" rx="3" />
    <rect x="2" y="11" width="24" height="4" fill="#0b0610" opacity="0.4" />
    <rect x="5" y="16.5" width="5" height="2.5" rx="1" fill="#0b0610" opacity="0.5" />
    <rect x="12" y="16.5" width="3" height="2.5" rx="1" fill="#0b0610" opacity="0.5" />
  </svg>
);

const MoreIcon = () => (
  <svg viewBox="0 0 28 28" fill="currentColor" className="h-[22px] w-[22px]">
    <circle cx="6" cy="14" r="2.5" />
    <circle cx="14" cy="14" r="2.5" />
    <circle cx="22" cy="14" r="2.5" />
  </svg>
);

const tabs = [
  { href: "/chat", label: "Chat", Icon: ChatIcon },
  { href: "/leads", label: "Leads", Icon: LeadsIcon },
  { href: "/deals", label: "Deals", Icon: DealsIcon },
  { href: "/inbox", label: "Inbox", Icon: InboxIcon },
  { href: "/payments", label: "Pay", Icon: PayIcon },
  { href: "/dashboard", label: "More", Icon: MoreIcon },
];

export function MobileBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 lg:hidden">
      <div
        className="flex items-stretch border-t border-white/8 bg-[#0a0613]/96 backdrop-blur-2xl"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        {tabs.map(({ href, label, Icon }) => {
          const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href + "/"));
          return (
            <Link
              key={href}
              href={href}
              className={`relative flex flex-1 flex-col items-center justify-center gap-[3px] py-2.5 transition-colors ${
                active ? "text-fuchsia-300" : "text-slate-600 hover:text-slate-400"
              }`}
            >
              {active && (
                <span className="absolute inset-x-2 top-0 h-[2px] rounded-b-full bg-fuchsia-400/70" />
              )}
              <Icon />
              <span className="text-[9px] font-medium tracking-wide">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
