import Image from "next/image";
import Link from "next/link";
import { AuthForm } from "@/components/auth-form";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(217,70,239,0.16),_transparent_30%),linear-gradient(180deg,#110718_0%,#07050a_100%)] px-5 py-10 text-white">
      <div className="w-full max-w-md rounded-[32px] border border-white/10 bg-[#191027] p-6 shadow-2xl shadow-black/20">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 overflow-hidden rounded-2xl ring-1 ring-fuchsia-300/20">
            <Image src="/leadforge-icon.png" alt="LeadForge" width={48} height={48} className="h-full w-full" />
          </div>
          <Image src="/leadforge-wordmark.png" alt="LeadForge" width={160} height={36} className="h-7 w-auto" />
        </div>
        <p className="mt-6 text-xs uppercase tracking-[0.25em] text-fuchsia-300">Welcome back</p>
        <h1 className="mt-3 text-3xl font-semibold">Log in to your workspace</h1>
        <p className="mt-3 text-sm leading-7 text-slate-300">
          Open chat, review activity, manage outreach, and keep your pipeline moving from a single mobile-first command center.
        </p>
        <AuthForm mode="login" />
        <p className="mt-5 text-sm text-slate-400">
          No account yet? <Link href="/signup" className="text-fuchsia-300 hover:text-fuchsia-200">Create one for free</Link>
        </p>
      </div>
    </div>
  );
}
