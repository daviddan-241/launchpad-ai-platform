import { useState, useRef, useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Send, Plus, Trash2, ArrowLeft, Bot, User, Loader2, Sparkles } from "lucide-react";

const API = import.meta.env.BASE_URL.replace(/\/$/, "");

interface Session { id: number; title: string; messageCount: number; createdAt: string; }
interface Message { id: number; sessionId: number; role: "user" | "assistant"; content: string; createdAt: string; }
interface SessionDetail extends Session { messages: Message[]; }

const QUICK_PROMPTS = [
  "Which leads should I follow up with today?",
  "Write me a cold email for SaaS companies",
  "How do I price my MVP project?",
  "Give me an outreach sequence for hot leads",
];

export default function Chat() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSession, setActiveSession] = useState<SessionDetail | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [showSessions, setShowSessions] = useState(true); // mobile: sessions list vs chat view
  const [newTitle, setNewTitle] = useState("");
  const [creatingSession, setCreatingSession] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const queryClient = useQueryClient();

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => { scrollToBottom(); }, [activeSession?.messages, scrollToBottom]);

  // Load sessions
  useEffect(() => {
    setLoadingSessions(true);
    fetch(`${API}/api/chat/sessions`)
      .then(r => r.json())
      .then(setSessions)
      .catch(() => {})
      .finally(() => setLoadingSessions(false));
  }, []);

  const loadSession = async (id: number) => {
    const r = await fetch(`${API}/api/chat/sessions/${id}`);
    const data: SessionDetail = await r.json();
    setActiveSession(data);
    setShowSessions(false); // mobile: switch to chat view
  };

  const createSession = async (title?: string) => {
    const t = (title ?? newTitle.trim()) || "Sales Strategy";
    setCreatingSession(true);
    try {
      const r = await fetch(`${API}/api/chat/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: t }),
      });
      const session: Session = await r.json();
      setSessions(prev => [session, ...prev]);
      setNewTitle("");
      await loadSession(session.id);
    } finally {
      setCreatingSession(false);
    }
  };

  const deleteSession = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    await fetch(`${API}/api/chat/sessions/${id}`, { method: "DELETE" });
    setSessions(prev => prev.filter(s => s.id !== id));
    if (activeSession?.id === id) {
      setActiveSession(null);
      setShowSessions(true);
    }
  };

  const sendMessage = async (content?: string) => {
    const msg = (content ?? input).trim();
    if (!msg || !activeSession || sending) return;

    // Optimistic user message
    const tempUserMsg: Message = { id: Date.now(), sessionId: activeSession.id, role: "user", content: msg, createdAt: new Date().toISOString() };
    setActiveSession(prev => prev ? { ...prev, messages: [...prev.messages, tempUserMsg] } : prev);
    setInput("");
    setSending(true);

    try {
      const r = await fetch(`${API}/api/chat/sessions/${activeSession.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Auto-resize textarea
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
  };

  // ── Sessions Panel ─────────────────────────────────────────────────────────
  const SessionsPanel = (
    <div className="flex flex-col h-full bg-card border-r border-border">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between flex-shrink-0">
        <h2 className="font-semibold text-sm">Chats</h2>
        <Button
          size="sm"
          onClick={() => createSession("New Chat")}
          disabled={creatingSession}
          className="h-8 px-3 text-xs"
        >
          {creatingSession ? <Loader2 className="w-3 h-3 animate-spin" /> : <><Plus className="w-3 h-3 mr-1" />New</>}
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain">
        {loadingSessions ? (
          <div className="p-4 text-center text-sm text-muted-foreground">Loading...</div>
        ) : sessions.length === 0 ? (
          <div className="p-6 text-center space-y-3">
            <Bot className="w-10 h-10 mx-auto text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No chats yet</p>
            <div className="space-y-2">
              {QUICK_PROMPTS.slice(0, 2).map(p => (
                <button key={p} onClick={() => createSession(p.slice(0, 40))}
                  className="w-full text-left text-xs p-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors">
                  {p}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {sessions.map(s => (
              <button key={s.id} onClick={() => loadSession(s.id)}
                className={`w-full text-left p-3 rounded-lg flex items-center gap-2 group transition-colors ${
                  activeSession?.id === s.id ? "bg-primary/10 text-primary" : "hover:bg-muted"
                }`}>
                <Bot className="w-4 h-4 flex-shrink-0 opacity-60" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{s.title}</p>
                  <p className="text-xs text-muted-foreground">{s.messageCount} messages</p>
                </div>
                <button onClick={(e) => deleteSession(s.id, e)}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded hover:text-destructive transition-all flex-shrink-0">
                  <Trash2 className="w-3 h-3" />
                </button>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  // ── Chat View ──────────────────────────────────────────────────────────────
  const ChatView = (
    <div className="flex flex-col h-full bg-background">
      {/* Chat header — mobile only shows back button */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border flex-shrink-0 bg-card">
        <button onClick={() => setShowSessions(true)} className="md:hidden p-1 -ml-1 rounded hover:bg-muted">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">{activeSession?.title ?? "Chat"}</p>
          <p className="text-xs text-muted-foreground">{activeSession?.messageCount ?? 0} messages · AI knows your leads & campaigns</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 space-y-4">
        {activeSession?.messages.length === 0 && (
          <div className="text-center space-y-4 pt-6">
            <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto">
              <Sparkles className="w-7 h-7 text-primary" />
            </div>
            <div>
              <p className="font-semibold">AI Sales Advisor</p>
              <p className="text-sm text-muted-foreground">Ask me anything — I can see your leads, campaigns, and projects</p>
            </div>
            <div className="grid grid-cols-1 gap-2 max-w-sm mx-auto text-left">
              {QUICK_PROMPTS.map(p => (
                <button key={p} onClick={() => sendMessage(p)}
                  className="text-sm p-3 rounded-xl bg-muted hover:bg-muted/80 transition-colors text-left">
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        {activeSession?.messages.map((msg) => (
          <div key={msg.id} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
            <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
              msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
            }`}>
              {msg.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>
            <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
              msg.role === "user"
                ? "bg-primary text-primary-foreground rounded-tr-sm"
                : "bg-muted text-foreground rounded-tl-sm"
            }`}>
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>
            </div>
          </div>
        ))}

        {sending && (
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1">
              <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.3s]" />
              <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.15s]" />
              <div className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input bar — stays at bottom even when keyboard opens on iOS */}
      <div className="flex-shrink-0 border-t border-border bg-card px-3 py-3">
        <div className="flex items-end gap-2 max-w-3xl mx-auto">
          <textarea
            ref={inputRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything about your sales..."
            rows={1}
            className="flex-1 resize-none bg-muted border-0 rounded-2xl px-4 py-2.5 outline-none placeholder:text-muted-foreground min-h-[42px] max-h-[120px] leading-relaxed"
            style={{ fontSize: 16 }}
            disabled={sending}
          />
          <Button
            onClick={() => sendMessage()}
            disabled={!input.trim() || sending}
            size="icon"
            className="rounded-full w-10 h-10 flex-shrink-0"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </div>
    </div>
  );

  // ── Welcome (no active session, desktop) ──────────────────────────────────
  const WelcomeView = (
    <div className="flex-1 flex items-center justify-center bg-background">
      <div className="text-center space-y-4 p-8">
        <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto">
          <Sparkles className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-xl font-semibold">LaunchPad AI</h2>
        <p className="text-muted-foreground text-sm max-w-xs">Your AI advisor with full access to your leads, campaigns, and projects</p>
        <div className="grid grid-cols-1 gap-2 max-w-xs mx-auto text-left">
          {QUICK_PROMPTS.map(p => (
            <button key={p} onClick={() => createSession(p.slice(0, 40))}
              className="text-sm p-3 rounded-xl bg-muted hover:bg-muted/80 transition-colors text-left">
              {p}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    // chat-fullscreen signals Layout to remove the normal padding/spacing
    <div className="chat-fullscreen h-full flex overflow-hidden -mx-4 -my-4 md:-mx-8 md:-my-8 md:mt-0">
      {/* Desktop: sidebar + chat side by side */}
      <div className="hidden md:flex w-72 flex-shrink-0 border-r border-border h-full">
        {SessionsPanel}
      </div>
      <div className="hidden md:flex flex-1 h-full">
        {activeSession ? ChatView : WelcomeView}
      </div>

      {/* Mobile: sessions list OR chat (one at a time) */}
      <div className="md:hidden flex-1 h-full">
        {showSessions || !activeSession ? SessionsPanel : ChatView}
      </div>
    </div>
  );
}
