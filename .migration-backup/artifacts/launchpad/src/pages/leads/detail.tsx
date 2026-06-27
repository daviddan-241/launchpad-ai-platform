import { useParams, useLocation } from "wouter";
import { useState } from "react";
import { useGetLead, getGetLeadQueryKey, useUpdateLead, useDeleteLead } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ExternalLink, Mail, Phone, Globe, MapPin, Linkedin, Pencil, Trash2, Save, X, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const STATUS_OPTS = ["New", "Warm", "Hot", "Qualified", "Cold", "Lost"];

const STATUS_COLORS: Record<string, string> = {
  Hot: "bg-red-100 text-red-700 border-red-200",
  Warm: "bg-orange-100 text-orange-700 border-orange-200",
  New: "bg-indigo-100 text-indigo-700 border-indigo-200",
  Qualified: "bg-green-100 text-green-700 border-green-200",
  Cold: "bg-gray-100 text-gray-600 border-gray-200",
  Lost: "bg-gray-100 text-gray-400 border-gray-200",
};

function initials(name: string) {
  return name.split(" ").slice(0, 2).map((p) => p[0]).join("").toUpperCase();
}
const AVATAR_COLORS = ["bg-indigo-500","bg-blue-500","bg-purple-500","bg-pink-500","bg-rose-500","bg-orange-500","bg-green-500","bg-teal-500"];
function avatarColor(name: string) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffffffff;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

export default function LeadDetail() {
  const { id } = useParams<{ id: string }>();
  const leadId = Number(id);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});

  const { data: lead, isLoading } = useGetLead(leadId, {
    query: { enabled: !!leadId, queryKey: getGetLeadQueryKey(leadId) },
  });

  const updateMutation = useUpdateLead();
  const deleteMutation = useDeleteLead();

  const startEdit = () => {
    if (!lead) return;
    const l = lead as any;
    setForm({
      companyName: l.companyName ?? "",
      contactName: l.contactName ?? "",
      email: l.email ?? "",
      phone: l.phone ?? "",
      website: l.website ?? "",
      industry: l.industry ?? "",
      location: l.location ?? "",
      status: l.status ?? "New",
      score: String(l.score ?? ""),
      notes: l.notes ?? "",
      linkedinUrl: l.linkedinUrl ?? "",
      whatsappNumber: l.whatsappNumber ?? "",
    });
    setEditing(true);
  };

  const save = () => {
    const payload: Record<string, unknown> = { ...form };
    if (form.score !== "") payload.score = Number(form.score);
    updateMutation.mutate({ id: leadId, data: payload } as any, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetLeadQueryKey(leadId) });
        toast({ title: "Lead updated" });
        setEditing(false);
      },
      onError: () => toast({ title: "Update failed", variant: "destructive" }),
    });
  };

  const del = () => {
    if (!confirm("Delete this lead? This cannot be undone.")) return;
    deleteMutation.mutate({ id: leadId } as any, {
      onSuccess: () => { toast({ title: "Lead deleted" }); navigate("/leads"); },
    });
  };

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4 max-w-3xl">
        <div className="h-6 bg-gray-100 rounded w-32" />
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-3">
          <div className="h-6 bg-gray-100 rounded w-48" />
          <div className="h-4 bg-gray-100 rounded w-64" />
        </div>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500">Lead not found</p>
        <button onClick={() => navigate("/leads")} className="mt-3 text-indigo-600 text-sm hover:underline">← Back</button>
      </div>
    );
  }

  const l = lead as any;

  function FText({ label, field, type = "text" }: { label: string; field: string; type?: string }) {
    const val = editing ? (form[field] ?? "") : (l[field] ?? "");
    return (
      <div>
        <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1">{label}</p>
        {editing ? (
          field === "notes" ? (
            <textarea
              value={form[field] ?? ""}
              onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
              rows={3}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none bg-white"
              style={{ fontSize: 16 }}
            />
          ) : field === "status" ? (
            <select
              value={form[field] ?? "New"}
              onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500/20 bg-white"
              style={{ fontSize: 16 }}
            >
              {STATUS_OPTS.map(s => <option key={s}>{s}</option>)}
            </select>
          ) : (
            <input
              type={type}
              value={form[field] ?? ""}
              onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500/20 bg-white"
              style={{ fontSize: 16 }}
            />
          )
        ) : (
          <p className="text-sm text-gray-800">{val || <span className="text-gray-300">—</span>}</p>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-4">
      {/* Back + actions */}
      <div className="flex items-center justify-between">
        <button onClick={() => navigate("/leads")} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-4 h-4" /> Leads
        </button>
        <div className="flex items-center gap-2">
          {editing ? (
            <>
              <button onClick={() => setEditing(false)} className="flex items-center gap-1.5 text-sm text-gray-500 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50">
                <X className="w-3.5 h-3.5" /> Cancel
              </button>
              <button onClick={save} disabled={updateMutation.isPending} className="flex items-center gap-1.5 text-sm text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded-lg">
                {updateMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />} Save
              </button>
            </>
          ) : (
            <>
              <button onClick={del} disabled={deleteMutation.isPending} className="flex items-center gap-1.5 text-sm text-red-500 px-3 py-1.5 rounded-lg border border-red-200 hover:bg-red-50">
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
              <button onClick={startEdit} className="flex items-center gap-1.5 text-sm text-gray-600 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50">
                <Pencil className="w-3.5 h-3.5" /> Edit
              </button>
            </>
          )}
        </div>
      </div>

      {/* Hero */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-start gap-4">
          <div className={`w-11 h-11 rounded-xl ${avatarColor(l.companyName)} flex items-center justify-center text-white font-bold text-base flex-shrink-0`}>
            {initials(l.companyName)}
          </div>
          <div className="flex-1 min-w-0">
            {editing ? (
              <input value={form.companyName} onChange={e => setForm(f => ({ ...f, companyName: e.target.value }))}
                className="text-lg font-bold text-gray-900 border-b border-indigo-300 outline-none bg-transparent w-full" style={{ fontSize: 16 }} />
            ) : (
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg font-bold text-gray-900">{l.companyName}</h1>
                {l.website && (
                  <a href={l.website} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-indigo-500">
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${STATUS_COLORS[l.status] ?? "bg-gray-100 text-gray-600 border-gray-200"}`}>
                  {l.status}
                </span>
              </div>
            )}
            <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-gray-400">
              {l.industry && <span>{l.industry}</span>}
              {l.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{l.location}</span>}
              {l.score != null && <span>Score: <strong className="text-gray-700">{l.score}/100</strong></span>}
            </div>
          </div>
        </div>

        {/* Quick contact row */}
        {!editing && (
          <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-100">
            {l.email && (
              <a href={`mailto:${l.email}`} className="flex items-center gap-1.5 text-xs text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full hover:bg-indigo-100 transition-colors">
                <Mail className="w-3.5 h-3.5" />{l.email}
              </a>
            )}
            {l.phone && (
              <a href={`tel:${l.phone}`} className="flex items-center gap-1.5 text-xs text-gray-600 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-200">
                <Phone className="w-3.5 h-3.5" />{l.phone}
              </a>
            )}
            {l.linkedinUrl && (
              <a href={l.linkedinUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full">
                <Linkedin className="w-3.5 h-3.5" />LinkedIn
              </a>
            )}
            {l.whatsappNumber && (
              <a href={`https://wa.me/${l.whatsappNumber.replace(/\D/g,"")}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-xs text-green-700 bg-green-50 px-3 py-1.5 rounded-full">
                <Phone className="w-3.5 h-3.5" />WhatsApp
              </a>
            )}
          </div>
        )}
      </div>

      {/* Fields */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Contact</p>
          <FText label="Contact Name" field="contactName" />
          <FText label="Email" field="email" type="email" />
          <FText label="Phone" field="phone" type="tel" />
          <FText label="WhatsApp" field="whatsappNumber" type="tel" />
          <FText label="LinkedIn URL" field="linkedinUrl" />
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Company</p>
          <FText label="Industry" field="industry" />
          <FText label="Location" field="location" />
          <FText label="Website" field="website" />
          <FText label="Status" field="status" />
          <FText label="Score (0–100)" field="score" type="number" />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Notes</p>
        <FText label="" field="notes" />
      </div>

      <p className="text-xs text-gray-400 text-right">
        Added {new Date(l.createdAt).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}
        {l.source ? ` · via ${l.source}` : ""}
      </p>
    </div>
  );
}
