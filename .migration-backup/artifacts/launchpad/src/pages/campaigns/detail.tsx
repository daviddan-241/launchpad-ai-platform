import { useParams, useLocation } from "wouter";
import { useGetCampaign, getGetCampaignQueryKey, useSendCampaign, useDeleteCampaign } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Send, Users, MailOpen, CornerUpLeft, Loader2, Trash2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const STATUS_COLORS: Record<string, string> = {
  Draft: "bg-gray-100 text-gray-600 border-gray-200",
  Sent: "bg-green-100 text-green-700 border-green-200",
  Scheduled: "bg-blue-100 text-blue-700 border-blue-200",
  Sending: "bg-yellow-100 text-yellow-700 border-yellow-200",
};

function StatBox({ label, value, icon: Icon, color = "text-gray-700" }: {
  label: string; value: number; icon: React.ElementType; color?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-gray-500">{label}</p>
        <Icon className={`w-4 h-4 ${color}`} />
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}

export default function CampaignDetail() {
  const { id } = useParams<{ id: string }>();
  const campaignId = Number(id);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: campaign, isLoading } = useGetCampaign(campaignId, {
    query: { enabled: !!campaignId, queryKey: getGetCampaignQueryKey(campaignId) },
  });

  const sendMutation = useSendCampaign();
  const deleteMutation = useDeleteCampaign();

  const handleSend = () => {
    sendMutation.mutate({ data: { campaignId } } as any, {
      onSuccess: (res: any) => {
        qc.invalidateQueries({ queryKey: getGetCampaignQueryKey(campaignId) });
        toast({ title: res.sent > 0 ? `Sent to ${res.sent} recipients` : "No email sent", description: res.message });
      },
      onError: () => toast({ title: "Send failed", variant: "destructive" }),
    });
  };

  const handleDelete = () => {
    if (!confirm("Delete this campaign? This cannot be undone.")) return;
    deleteMutation.mutate({ id: campaignId } as any, {
      onSuccess: () => { toast({ title: "Campaign deleted" }); navigate("/campaigns"); },
    });
  };

  if (isLoading) {
    return (
      <div className="animate-pulse max-w-3xl space-y-4">
        <div className="h-6 bg-gray-100 rounded w-32" />
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-3">
          <div className="h-6 bg-gray-100 rounded w-48" />
        </div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500">Campaign not found</p>
        <button onClick={() => navigate("/campaigns")} className="mt-3 text-indigo-600 text-sm hover:underline">← Back</button>
      </div>
    );
  }

  const c = campaign as any;
  const canSend = c.status !== "Sent" && c.status !== "Sending";
  const noEmailAccount = !c.emailAccountId;

  return (
    <div className="max-w-3xl space-y-5">
      {/* Back + actions */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <button onClick={() => navigate("/campaigns")} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-4 h-4" /> Campaigns
        </button>
        <div className="flex items-center gap-2">
          <button onClick={handleDelete} disabled={deleteMutation.isPending} className="flex items-center gap-1.5 text-sm text-red-500 px-3 py-1.5 rounded-lg border border-red-200 hover:bg-red-50">
            <Trash2 className="w-3.5 h-3.5" /> Delete
          </button>
          {canSend && (
            <button onClick={handleSend} disabled={sendMutation.isPending || !c.subject || !c.body} className="flex items-center gap-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 px-4 py-1.5 rounded-lg">
              {sendMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Send Now
            </button>
          )}
        </div>
      </div>

      {/* Hero */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg font-bold text-gray-900">{c.name}</h1>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${STATUS_COLORS[c.status] ?? "bg-gray-100 text-gray-600 border-gray-200"}`}>
                {c.status}
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-1">{c.subject || "No subject set"}</p>
          </div>
        </div>

        {/* Warning: no email account */}
        {noEmailAccount && (
          <div className="mt-4 flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-medium text-amber-700">No email account connected</p>
              <p className="text-xs text-amber-600 mt-0.5">
                Go to <button onClick={() => navigate("/settings")} className="underline">Settings</button> to connect your email before sending.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatBox label="Recipients" value={c.recipientCount ?? 0} icon={Users} />
        <StatBox label="Sent" value={c.sentCount ?? 0} icon={Send} color="text-indigo-500" />
        <StatBox label="Opened" value={c.openCount ?? 0} icon={MailOpen} color="text-green-500" />
        <StatBox label="Replies" value={c.replyCount ?? 0} icon={CornerUpLeft} color="text-blue-500" />
      </div>

      {/* Email preview */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/60">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Email Preview</p>
        </div>
        <div className="p-6">
          {c.subject || c.body ? (
            <>
              <div className="mb-4 pb-4 border-b border-gray-100">
                <p className="text-xs text-gray-400 mb-1">Subject</p>
                <p className="text-sm font-semibold text-gray-900">{c.subject || "(no subject)"}</p>
              </div>
              <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                {c.body || <span className="text-gray-300 italic">No body content</span>}
              </div>
            </>
          ) : (
            <p className="text-sm text-gray-400 text-center py-8">No email content set. Edit this campaign to add subject and body.</p>
          )}
        </div>
      </div>
    </div>
  );
}
