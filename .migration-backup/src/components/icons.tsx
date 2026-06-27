// Custom SVG icon system — replaces all emoji usage in the UI
// Each icon is a clean, minimal SVG that matches the LeadForge dark theme

type IconProps = { className?: string; size?: number };

export function IconSend({ className = "h-4 w-4", size }: IconProps) {
  const s = size ?? 16;
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <path d="M22 2L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

export function IconMoney({ className = "h-4 w-4", size }: IconProps) {
  const s = size ?? 16;
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="5" width="20" height="14" rx="3" stroke="currentColor" strokeWidth="2"/>
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
      <path d="M6 9V9.01M18 9V9.01M6 15V15.01M18 15V15.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}

export function IconFire({ className = "h-4 w-4", size }: IconProps) {
  const s = size ?? 16;
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <path d="M12 22C12 22 4 17 4 11C4 8.8 5.4 6.9 7.5 6.1C7.2 7.2 7.3 8.4 8 9.3C8.7 8 9.8 6.9 11 6.1C10.7 7.3 11 8.6 11.8 9.5C12.5 8.5 13.8 7.8 15 7.5C14.5 9 14.5 10.6 15.2 12C16 13.5 16 15 15.5 16.4C14.5 19 12 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M12 22C12 22 9 19 9 16C9 14.3 10.3 13 12 13C13.7 13 15 14.3 15 16C15 19 12 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

export function IconCheck({ className = "h-4 w-4", size }: IconProps) {
  const s = size ?? 16;
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

export function IconCard({ className = "h-4 w-4", size }: IconProps) {
  const s = size ?? 16;
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="5" width="20" height="14" rx="3" stroke="currentColor" strokeWidth="2"/>
      <path d="M2 10H22" stroke="currentColor" strokeWidth="2"/>
      <path d="M6 15H10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}

export function IconTarget({ className = "h-4 w-4", size }: IconProps) {
  const s = size ?? 16;
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
      <circle cx="12" cy="12" r="6" stroke="currentColor" strokeWidth="2"/>
      <circle cx="12" cy="12" r="2" fill="currentColor"/>
    </svg>
  );
}

export function IconZap({ className = "h-4 w-4", size }: IconProps) {
  const s = size ?? 16;
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <path d="M13 2L4.5 13.5H12L11 22L19.5 10.5H12L13 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

export function IconRocket({ className = "h-4 w-4", size }: IconProps) {
  const s = size ?? 16;
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <path d="M4.5 16.5C3 17.76 2.5 21.5 2.5 21.5C2.5 21.5 6.24 21 7.5 19.5M4.5 16.5C4.5 16.5 5.5 12.5 9 9M4.5 16.5L7.5 19.5M7.5 19.5C7.5 19.5 11.5 18.5 15 15M9 9C12 5.5 16.5 4.5 16.5 4.5L19.5 7.5C19.5 7.5 18.5 12 15 15M9 9L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="15.5" cy="8.5" r="1.5" fill="currentColor"/>
    </svg>
  );
}

export function IconUsers({ className = "h-4 w-4", size }: IconProps) {
  const s = size ?? 16;
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <path d="M17 21V19C17 17.9 16.6 16.8 15.8 16C15.1 15.2 14 14.8 13 14.8H5C4 14.8 3 15.2 2.2 16C1.4 16.8 1 17.9 1 19V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="9" cy="8" r="4" stroke="currentColor" strokeWidth="2"/>
      <path d="M23 21V19C23 17.1 21.7 15.4 20 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M16 3C17.7 3.4 19 5 19 7C19 9 17.7 10.6 16 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

export function IconActivity({ className = "h-4 w-4", size }: IconProps) {
  const s = size ?? 16;
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

export function IconMail({ className = "h-4 w-4", size }: IconProps) {
  const s = size ?? 16;
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="4" width="20" height="16" rx="3" stroke="currentColor" strokeWidth="2"/>
      <path d="M2 8L12 13L22 8" stroke="currentColor" strokeWidth="2"/>
    </svg>
  );
}

export function IconChat({ className = "h-4 w-4", size }: IconProps) {
  const s = size ?? 16;
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <path d="M21 15C21 15.5 20.8 16 20.4 16.4C20 16.8 19.5 17 19 17H7L3 21V5C3 4.5 3.2 4 3.6 3.6C4 3.2 4.5 3 5 3H19C19.5 3 20 3.2 20.4 3.6C20.8 4 21 4.5 21 5V15Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

export function IconTrending({ className = "h-4 w-4", size }: IconProps) {
  const s = size ?? 16;
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <polyline points="17 6 23 6 23 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

export function IconSettings({ className = "h-4 w-4", size }: IconProps) {
  const s = size ?? 16;
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" stroke="currentColor" strokeWidth="2"/>
    </svg>
  );
}

export function IconAutopilot({ className = "h-4 w-4", size }: IconProps) {
  const s = size ?? 16;
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

export function IconPortfolio({ className = "h-4 w-4", size }: IconProps) {
  const s = size ?? 16;
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="3" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="2"/>
      <path d="M8 21H16M12 17V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <path d="M7 8H17M7 12H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  );
}

export function IconDot({ className = "h-2 w-2", active = false }: { className?: string; active?: boolean }) {
  return (
    <span className={`inline-block rounded-full ${active ? "bg-emerald-400" : "bg-slate-500"} ${className}`} />
  );
}

// Nav icons map used in app-shell
export const NAV_ICONS: Record<string, (props: IconProps) => JSX.Element> = {
  "/chat": IconChat,
  "/activity": IconActivity,
  "/projects": IconPortfolio,
  "/dashboard": IconTrending,
  "/analytics": IconActivity,
  "/leads": IconUsers,
  "/deals": IconTarget,
  "/campaigns": IconAutopilot,
  "/conversations": IconMail,
  "/payments": IconMoney,
  "/delivery": IconRocket,
  "/inbox": IconMail,
  "/workflows": IconZap,
  "/settings": IconSettings,
};
