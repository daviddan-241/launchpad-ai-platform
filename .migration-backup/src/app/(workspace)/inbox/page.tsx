import { ReplyGenerator } from "@/components/reply-generator";
import { readStore } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function InboxPage() {
  const store = await readStore();

  return (
    <div className="space-y-6">
      <section>
        <p className="text-xs uppercase tracking-[0.25em] text-fuchsia-300">Inbox</p>
        <h1 className="mt-2 text-3xl font-semibold text-white">Reply intelligence + AI drafting</h1>
      </section>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <section className="space-y-4">
          {store.inbox.map((message) => (
            <div key={message.id} className="rounded-[30px] border border-white/10 bg-white/5 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-semibold text-white">{message.from}</p>
                  <p className="mt-1 text-sm text-slate-400">{message.company} · {message.receivedAt}</p>
                </div>
                <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300">{message.sentiment}</span>
              </div>
              <p className="mt-4 text-white">{message.subject}</p>
              <p className="mt-2 text-sm leading-7 text-slate-300">{message.preview}</p>
              <div className="mt-4 rounded-3xl border border-white/8 bg-[#161022] p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-fuchsia-300">Suggested reply</p>
                <p className="mt-2 text-sm leading-7 text-slate-300">{message.recommendedReply}</p>
              </div>
            </div>
          ))}
        </section>

        <ReplyGenerator />
      </div>
    </div>
  );
}
