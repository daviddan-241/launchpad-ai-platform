import Link from "next/link";

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.16),_transparent_30%),linear-gradient(180deg,#110718_0%,#07050a_100%)] px-6 py-12 text-white">
      <div className="w-full max-w-lg rounded-[32px] border border-white/10 bg-[#191027] p-6 shadow-2xl shadow-black/20">
        <p className="text-xs uppercase tracking-[0.25em] text-fuchsia-300">Offline</p>
        <h1 className="mt-3 text-3xl font-semibold">LeadForge app shell is available offline</h1>
        <p className="mt-3 text-sm leading-7 text-slate-300">
          You are currently offline. Previously opened shell pages and cached assets can still work, but live integrations like OAuth and outbound email need a connection.
        </p>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <Link href="/chat" className="rounded-full bg-fuchsia-300 px-5 py-3 text-center text-sm font-semibold text-slate-950 hover:bg-fuchsia-200">
            Open chat
          </Link>
          <Link href="/projects" className="rounded-full border border-white/15 px-5 py-3 text-center text-sm font-semibold text-white hover:bg-white/5">
            Open projects
          </Link>
        </div>
      </div>
    </div>
  );
}
