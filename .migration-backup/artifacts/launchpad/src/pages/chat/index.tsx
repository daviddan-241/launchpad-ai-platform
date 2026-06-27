import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Plus, Trash2, ArrowLeft, Bot, User, Loader2, Sparkles, Zap, Bell, BellOff, CheckCircle2, Clock, XCircle, ChevronRight } from "lucide-react";

const API = import.meta.env.BASE_URL.replace(/\/$/, "");

interface Session { id: number; title: string; messageCount: number; createdAt: string; }
interface Message { id: number; sessionId: number; role: "user" | "assistant"; content: string; createdAt: string; taskId?: number; }
interface SessionDetail extends Session { messages: Message[]; }
interface AgentTask { id: number; status: "running" | "done" | "error"; command: string; progress: Array<{ step: string; status: string; time: string }>; plan?: any; }

const AGENT_EXAMPLES = [
  "Get businesses in USA and Asia that need web development, send proposals, follow up in 20 minutes",
  "Find 15 marketing agencies in New York and London, generate outreach emails, schedule follow-ups in 1 hour",
  "Discover e-commerce companies in Southeast Asia, send a professional proposal for web services",
  "Find tech startups in California, pitch them a custom SaaS platform, auto-reply to responses",
];

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}

async function registerPush() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    const res = await fetch(`${API}/api/push/vapid-key`);
    if (!res.ok) return;
    const { publicKey } = await res.json();
    if (!publicKey) return;
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
    await fetch(`${API}/api/push/subscribe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sub),
    });
    return sub;
  } catch {}
}

function TaskStatus({ taskId }: { taskId: number }) {
  const [task, setTask] = useState<AgentTask | null>(null);
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    let active = true;
    const poll = async () => {
      try {
        const r = await fetch(`${API}/api/agent/tasks/${taskId}`);
        const t = await r.json();
        if (active) setTask(t);
        if (active && t.status === "running") setTimeout(poll, 3000);
      } catch {}
    };
    poll();
    return () => { active = false; };
  }, [taskId]);

  if (!task) return null;

  const progress = task.progress as Array<{ step: string; status: string; time: string }>;
  const isRunning = task.status === "running";

  return (
    <div className={`mt-3 rounded-xl border text-xs overflow-hidden ${isRunning ? "border-indigo-200 bg-indigo-50/60" : task.status === "done" ? "border-green-200 bg-green-50/60" : "border-red-200 bg-red-50/60"}`}>
      <button onClick={() => setExpanded(e => !e)} className="w-full flex items-center gap-2 px-3 py-2 text-left">
        {isRunning ? <Loader2 className="w-3.5 h-3.5 text-indigo-500 animate-spin flex-shrink-0" /> :
          task.status === "done" ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0" /> :
            <XCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />}
        <span className={`font-semibold ${isRunning ? "text-indigo-700" : task.status === "done" ? "text-green-700" : "text-red-700"}`}>
          {isRunning ? "Agent running..." : task.status === "done" ? "Task complete" : "Task failed"}
        </span>
        <ChevronRight className={`w-3 h-3 ml-auto text-gray-400 transition-transform ${expanded ? "rotate-90" : ""}`} />
      </button>
      {expanded && progress.length > 0 && (
        <div className="px-3 pb-2 space-y-1 border-t border-current/10">
          {progress.map((p, i) => (
            <div key={i} className="flex items-start gap-2 py-0.5">
              {p.status === "done" ? <CheckCircle2 className="w-3 h-3 text-green-500 flex-shrink-0 mt-0.5" /> :
                p.status === "error" ? <XCircle className="w-3 h-3 text-red-500 flex-shrink-0 mt-0.5" /> :
                  <Clock className="w-3 h-3 text-indigo-400 flex-shrink-0 mt-0.5" />}
              <span className="text-gray-600 leading-relaxed">{p.step}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Chat() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSession, setActiveSession] = useState<SessionDetail | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [showSessions, setShowSessions] = useState(true);
  const [creatingSession, setCreatingSession] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => { scrollToBottom(); }, [activeSession?.messages, scrollToBottom]);

  // Check push status
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.ready.then(reg => {
      reg.pushManager.getSubscription().then(sub => setPushEnabled(!!sub));
    }).catch(() => {});
  }, []);

  useEffect(() => {
    setLoadingSessions(true);
    fetch(`${API}/api/chat/sessions`)
      .then(r => r.json()).then(setSessions).catch(() => {}).finally(() => setLoadingSessions(false));
  }, []);

  const loadSession = async (id: number) => {
    const r = await fetch(`${API}/api/chat/sessions/${id}`);
    const data: SessionDetail = await r.json();
    setActiveSession(data);
    setShowSessions(false);
  };

  const createSession = async (title?: string) => {
    const t = (title ?? "").trim() || "New Command";
    setCreatingSession(true);
    try {
      const r = await fetch(`${API}/api/chat/sessions`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: t }),
      });
      const session: Session = await r.json();
      setSessions(prev => [session, ...prev]);
      await loadSession(session.id);
    } finally { setCreatingSession(false); }
  };

  const deleteSession = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    await fetch(`${API}/api/chat/sessions/${id}`, { method: "DELETE" });
    setSessions(prev => prev.filter(s => s.id !== id));
    if (activeSession?.id === id) { setActiveSession(null); setShowSessions(true); }
  };

  const sendMessage = async (content?: string) => {
    const msg = (content ?? input).trim();
    if (!msg || !activeSession || sending) return;

    const tempUserMsg: Message = { id: Date.now(), sessionId: activeSession.id, role: "user", content: msg, createdAt: new Date().toISOString() };
    setActiveSession(prev => prev ? { ...prev, messages: [...prev.messages, tempUserMsg] } : prev);
    setInput("");
    setSending(true);
    if (inputRef.current) { inputRef.current.style.height = "auto"; }

    try {
      const r = await fetch(`${API}/api/chat/sessions/${activeSession.id}/messages`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: msg }),
      });
      const assistantMsg: Message = await r.json();
      setActiveSession(prev => prev ? {
        ...prev,
        messages: [...prev.messages, assistantMsg],
        messageCount: prev.messageCount + 2,
      } : prev);
      setSessions(prev => prev.map(s => s.id === activeSession.id ? { ...s, messageCount: s.messageCount + 2 } : s));
    } catch {
      setActiveSession(prev => prev ? {
        ...prev,
        messages: [...prev.messages, { id: Date.now() + 1, sessionId: activeSession.id, role: "assistant", content: "⚠️ Failed to get response. Check your connection.", createdAt: new Date().toISOString() }],
      } : prev);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 140) + "px";
  };

  const enablePush = async () => {
    setPushLoading(true);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") return;
      await registerPush();
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      setPushEnabled(!!sub);
    } finally { setPushLoading(false); }
  };

  // ── Sessions sidebar ─────────────────────────────────────────────────────────
  const SessionsPanel = (
    <div className="flex flex-col h-full bg-[#13141a] text-white">
      <div className="px-4 py-4 border-b border-white/10 flex-shrink-0">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-sm">Dave AI Agent</span>
        </div>
        <button onClick={() => createSession()} disabled={creatingSession}
          className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium py-2 px-3 rounded-lg transition-colors">
          {creatingSession ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
          New Command
        </button>
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain py-2">
        {loadingSessions ? (
          <div className="px-4 py-8 text-center text-white/40 text-xs">Loading...</div>
        ) : sessions.length === 0 ? (
          <div className="px-4 py-8 text-center space-y-2">
            <Sparkles className="w-8 h-8 mx-auto text-white/20" />
            <p className="text-xs text-white/40">No sessions yet</p>
            <p className="text-xs text-white/30">Try a command below</p>
          </div>
        ) : (
          <div className="px-2 space-y-0.5">
            {sessions.map(s => (
              <button key={s.id} onClick={() => loadSession(s.id)}
                className={`w-full text-left px-3 py-2.5 rounded-lg flex items-center gap-2 group transition-colors ${
                  activeSession?.id === s.id ? "bg-indigo-600/30 text-white" : "text-white/60 hover:bg-white/5 hover:text-white"
                }`}>
                <Bot className="w-3.5 h-3.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{s.title}</p>
                  <p className="text-[10px] text-white/30">{s.messageCount} messages</p>
                </div>
                <button onClick={(e) => deleteSession(s.id, e)}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded hover:text-red-400 transition-all flex-shrink-0">
                  <Trash2 className="w-3 h-3" />
                </button>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Push toggle */}
      <div className="px-4 py-3 border-t border-white/10 flex-shrink-0">
        <button onClick={enablePush} disabled={pushLoading || pushEnabled}
          className={`w-full flex items-center gap-2 text-xs px-3 py-2 rounded-lg transition-colors ${
            pushEnabled ? "bg-green-500/20 text-green-400" : "bg-white/5 text-white/50 hover:bg-white/10 hover:text-white"
          }`}>
          {pushLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : pushEnabled ? <Bell className="w-3.5 h-3.5" /> : <BellOff className="w-3.5 h-3.5" />}
          {pushEnabled ? "Notifications on" : "Enable notifications"}
        </button>
      </div>
    </div>
  );

  // ── Chat/Command view ─────────────────────────────────────────────────────────
  const ChatView = (
    <div className="flex flex-col h-full bg-[#f6f8fb]">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-200 flex-shrink-0">
        <button onClick={() => setShowSessions(true)} className="md:hidden p-1 -ml-1 rounded hover:bg-gray-100">
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </button>
        <div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0">
          <Zap className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-gray-900 truncate">{activeSession?.title ?? "Dave"}</p>
          <p className="text-xs text-gray-400">AI Sales Agent · live data · autonomous execution</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 space-y-4">
        {activeSession?.messages.length === 0 && (
          <div className="max-w-2xl mx-auto space-y-6 pt-4">
            <div className="text-center space-y-3">
              <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto">
                <Zap className="w-7 h-7 text-white" />
              </div>
              <div>
                <h2 className="font-bold text-gray-900">Dave — AI Sales Agent</h2>
                <p className="text-sm text-gray-500 mt-1">Tell me what to do. I'll find leads, write emails, send them, follow up automatically, and reply to responses.</p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Example commands</p>
              {AGENT_EXAMPLES.map((ex, i) => (
                <button key={i} onClick={() => sendMessage(ex)}
                  className="w-full text-left text-sm p-3.5 rounded-xl bg-white border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/30 transition-all text-gray-700 leading-relaxed">
                  <span className="text-indigo-500 font-medium">Dave, </span>{ex}
                </button>
              ))}
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-700">
              <strong>Setup required:</strong> Add your email account in Settings → Email Accounts before sending. Set VAPID keys for push notifications.
            </div>
          </div>
        )}

        {activeSession?.messages.map((msg) => (
          <div key={msg.id} className={`flex gap-3 max-w-3xl ${msg.role === "user" ? "flex-row-reverse ml-auto" : ""}`}>
            <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
              msg.role === "user" ? "bg-indigo-600 text-white" : "bg-white border border-gray-200"
            }`}>
              {msg.role === "user" ? <User className="w-3.5 h-3.5" /> : <Zap className="w-3.5 h-3.5 text-indigo-600" />}
            </div>
            <div className={`flex-1 ${msg.role === "user" ? "items-end" : "items-start"} flex flex-col`}>
              <div className={`rounded-2xl px-4 py-3 ${
                msg.role === "user"
                  ? "bg-indigo-600 text-white rounded-tr-sm"
                  : "bg-white border border-gray-200 text-gray-800 rounded-tl-sm shadow-sm"
              }`}>
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
              </div>
              {msg.taskId && <TaskStatus taskId={msg.taskId} />}
            </div>
          </div>
        ))}

        {sending && (
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-full bg-white border border-gray-200 flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 text-indigo-600" />
            </div>
            <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1.5 shadow-sm">
              <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
              <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
              <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 bg-white border-t border-gray-200 px-4 py-3">
        <div className="flex items-end gap-3 max-w-3xl mx-auto">
          <div className="flex-1 bg-gray-50 border border-gray-200 rounded-2xl overflow-hidden focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all">
            <textarea
              ref={inputRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder='Tell Dave what to do... e.g. "Get 20 businesses in USA that need web design and send proposals"'
              rows={1}
              className="w-full resize-none bg-transparent border-0 px-4 py-3 outline-none placeholder:text-gray-400 text-gray-900 text-sm leading-relaxed min-h-[46px] max-h-[140px]"
              style={{ fontSize: 16 }}
              disabled={sending}
            />
          </div>
          <button onClick={() => sendMessage()} disabled={!input.trim() || sending}
            className="w-10 h-10 flex-shrink-0 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-full flex items-center justify-center transition-colors">
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
        <p className="text-xs text-gray-400 text-center mt-2">
          Dave can discover leads, send emails, schedule follow-ups, and auto-reply · <kbd className="bg-gray-100 px-1 py-0.5 rounded">Enter</kbd> to send
        </p>
      </div>
    </div>
  );

  // ── Welcome ──────────────────────────────────────────────────────────────────
  const WelcomeView = (
    <div className="flex-1 flex items-center justify-center bg-[#f6f8fb]">
      <div className="text-center space-y-4 p-8 max-w-md">
        <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-indigo-500/30">
          <Zap className="w-8 h-8 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Dave AI Agent</h2>
          <p className="text-sm text-gray-500 mt-2">Autonomous sales execution — finds leads, writes emails, sends them, follows up, responds to replies. You just give the command.</p>
        </div>
        <div className="space-y-2 text-left">
          {AGENT_EXAMPLES.slice(0, 3).map((ex, i) => (
            <button key={i} onClick={() => createSession(ex.slice(0, 50))}
              className="w-full text-left text-sm p-3 rounded-xl bg-white border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/30 transition-all text-gray-700">
              <span className="text-indigo-500 font-medium">Dave, </span>{ex}
            </button>
          ))}
        </div>
        <button onClick={() => createSession()} className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
          Start a new command →
        </button>
      </div>
    </div>
  );

  return (
    <div className="chat-fullscreen h-full flex overflow-hidden -mx-4 -my-4 md:-mx-8 md:-my-8">
      <div className="hidden md:flex w-64 flex-shrink-0 h-full">
        {SessionsPanel}
      </div>
      <div className="hidden md:flex flex-1 h-full">
        {activeSession ? ChatView : WelcomeView}
      </div>
      <div className="md:hidden flex-1 h-full">
        {showSessions || !activeSession ? SessionsPanel : ChatView}
      </div>
    </div>
  );
}
