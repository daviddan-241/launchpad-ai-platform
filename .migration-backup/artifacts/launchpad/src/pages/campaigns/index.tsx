import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useGetCampaigns } from "@workspace/api-client-react";
import { Plus, Mail, Send, MailOpen, CornerUpLeft, ChevronRight, Inbox } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  Draft: "bg-gray-100 text-gray-600 border-gray-200",
  Sent: "bg-green-100 text-green-700 border-green-200",
  Scheduled: "bg-blue-100 text-blue-700 border-blue-200",
  Sending: "bg-yellow-100 text-yellow-700 border-yellow-200",
};

function fmt(n: number | null | undefined) {
  return n ?? 0;
}

export default function Campaigns() {
  const [, navigate] = useLocation();
  const { data: campaigns, isLoading } = useGetCampaigns();

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Campaigns</h1>
          <p className="text-sm text-gray-500">Email outreach sequences</p>
        </div>
        <Link href="/campaigns/new">
          <button className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
            <Plus className="w-4 h-4" /> New Campaign
          </button>
        </Link>
      </div>

      {/* Table card */}
      <div className="bg-white rounded-xl border border-gray-200">
        {/* Column headers */}
        <div className="grid grid-cols-[2fr_1fr_repeat(3,_80px)_40px] gap-4 px-5 py-3 border-b border-gray-100 bg-gray-50/60 rounded-t-xl">
          <span className="text-xs font-semibold text-gray-500">Campaign</span>
          <span className="text-xs font-semibold text-gray-500">Status</span>
          <span className="text-xs font-semibold text-gray-500 text-center">Sent</span>
          <span className="text-xs font-semibold text-gray-500 text-center hidden sm:block">Opened</span>
          <span className="text-xs font-semibold text-gray-500 text-center hidden md:block">Replies</span>
          <span />
        </div>

        {isLoading ? (
          <div className="divide-y divide-gray-50">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="grid grid-cols-[2fr_1fr_repeat(3,_80px)_40px] gap-4 px-5 py-4 animate-pulse items-center">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gray-100" />
                  <div className="space-y-1.5">
                    <div className="h-3.5 bg-gray-100 rounded w-32" />
                    <div className="h-2.5 bg-gray-100 rounded w-48" />
                  </div>
                </div>
                <div className="h-5 bg-gray-100 rounded-full w-14" />
                <div className="h-4 bg-gray-100 rounded w-8 mx-auto" />
                <div className="h-4 bg-gray-100 rounded w-8 mx-auto hidden sm:block" />
                <div className="h-4 bg-gray-100 rounded w-8 mx-auto hidden md:block" />
                <div className="w-6 h-6 bg-gray-100 rounded" />
              </div>
            ))}
          </div>
        ) : !campaigns?.length ? (
          <div className="py-20 text-center">
            <Inbox className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-500">No campaigns yet</p>
            <p className="text-xs text-gray-400 mt-1 mb-4">Create your first outreach sequence</p>
            <Link href="/campaigns/new">
              <button className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
                <Plus className="w-4 h-4" /> New Campaign
              </button>
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {campaigns.map((c: any) => (
              <div
                key={c.id}
                className="grid grid-cols-[2fr_1fr_repeat(3,_80px)_40px] gap-4 px-5 py-4 items-center hover:bg-indigo-50/30 transition-colors group cursor-pointer"
                onClick={() => navigate(`/campaigns/${c.id}`)}
              >
                {/* Name + subject */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
                    <Mail className="w-4 h-4 text-indigo-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{c.name}</p>
                    <p className="text-xs text-gray-400 truncate">{c.subject || "No subject set"}</p>
                  </div>
                </div>

                {/* Status */}
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border w-fit ${STATUS_COLORS[c.status] ?? "bg-gray-100 text-gray-600 border-gray-200"}`}>
                  {c.status}
                </span>

                {/* Sent */}
                <div className="flex flex-col items-center">
                  <span className="text-sm font-bold text-gray-900">{fmt(c.sentCount)}</span>
                  <Send className="w-2.5 h-2.5 text-gray-300 mt-0.5" />
                </div>

                {/* Opened */}
                <div className="hidden sm:flex flex-col items-center">
                  <span className="text-sm font-bold text-gray-900">{fmt(c.openCount)}</span>
                  <MailOpen className="w-2.5 h-2.5 text-gray-300 mt-0.5" />
                </div>

                {/* Replies */}
                <div className="hidden md:flex flex-col items-center">
                  <span className="text-sm font-bold text-gray-900">{fmt(c.replyCount)}</span>
                  <CornerUpLeft className="w-2.5 h-2.5 text-gray-300 mt-0.5" />
                </div>

                {/* Arrow */}
                <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-indigo-500 transition-colors justify-self-end" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
