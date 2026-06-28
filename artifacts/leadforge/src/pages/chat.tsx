import { useState, useRef, useEffect } from "react";
import { useGetChatSessions, getGetChatSessionsQueryKey, useCreateChatSession, useGetChatMessages, useSendChatMessage, getGetChatMessagesQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Send, Plus, Loader2, Bot, User as UserIcon, MessageSquare, ChevronRight, Timer } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";

export default function Chat() {
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);
  const [inputMessage, setInputMessage] = useState("");
  const [autoProceedTimer, setAutoProceedTimer] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: sessions, isLoading: loadingSessions } = useGetChatSessions({
    query: { queryKey: getGetChatSessionsQueryKey() }
  });

  const { data: messages, isLoading: loadingMessages } = useGetChatMessages(activeSessionId!, {
    query: { 
      queryKey: getGetChatMessagesQueryKey(activeSessionId!),
      enabled: !!activeSessionId
    }
  });

  const createSession = useCreateChatSession();
  const sendMessage = useSendChatMessage();

  useEffect(() => {
    if (sessions?.length && !activeSessionId) {
      setActiveSessionId(sessions[0].id);
    }
  }, [sessions, activeSessionId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Handle auto-proceed timer
  useEffect(() => {
    if (autoProceedTimer !== null && autoProceedTimer > 0) {
      timerRef.current = setTimeout(() => {
        setAutoProceedTimer(prev => prev! - 1);
      }, 1000);
    } else if (autoProceedTimer === 0) {
      // Trigger auto-proceed
      handleSendMessage(undefined, "proceed");
      setAutoProceedTimer(null);
    }
    return () => { if (timerRef.current !== null) clearTimeout(timerRef.current); };
  }, [autoProceedTimer]);

  const handleCreateSession = () => {
    createSession.mutate({ data: { title: "New Conversation" } }, {
      onSuccess: (res) => {
        queryClient.invalidateQueries({ queryKey: getGetChatSessionsQueryKey() });
        setActiveSessionId(res.id);
      }
    });
  };

  const handleSendMessage = (e?: React.FormEvent, overrideMsg?: string) => {
    e?.preventDefault();
    const msg = overrideMsg || inputMessage;
    
    if (!msg.trim() || !activeSessionId) return;

    setInputMessage("");
    setAutoProceedTimer(null); // Clear any pending timer

    sendMessage.mutate({ 
      id: activeSessionId, 
      data: { content: msg } 
    }, {
      onSuccess: (res) => {
        queryClient.invalidateQueries({ queryKey: getGetChatMessagesQueryKey(activeSessionId) });
        if (res.autoProceeds && res.autoProceedSeconds) {
          setAutoProceedTimer(res.autoProceedSeconds);
        }
      },
      onError: (err) => {
        toast({ variant: "destructive", title: "Failed to send message", description: (err as any).data?.error || err.message });
      }
    });
  };

  const handleOptionClick = (option: string) => {
    handleSendMessage(undefined, option);
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] bg-card border rounded-xl overflow-hidden shadow-sm">
      {/* Sidebar */}
      <div className="w-64 border-r bg-sidebar/5 flex flex-col">
        <div className="p-4 border-b">
          <Button onClick={handleCreateSession} className="w-full" disabled={createSession.isPending} data-testid="button-new-chat">
            {createSession.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
            New Chat
          </Button>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {loadingSessions ? (
              <div className="flex justify-center p-4"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>
            ) : (
              sessions?.map(session => (
                <button
                  key={session.id}
                  onClick={() => setActiveSessionId(session.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors text-left ${
                    activeSessionId === session.id ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted text-muted-foreground"
                  }`}
                  data-testid={`session-${session.id}`}
                >
                  <MessageSquare className="w-4 h-4 shrink-0" />
                  <span className="truncate flex-1">{session.title}</span>
                </button>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-background relative">
        {!activeSessionId ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            Select or create a chat session to start.
          </div>
        ) : (
          <>
            <ScrollArea className="flex-1 p-4" ref={scrollRef}>
              <div className="space-y-6 max-w-3xl mx-auto pb-4">
                {loadingMessages ? (
                  <div className="flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
                ) : messages?.length === 0 ? (
                  <div className="text-center mt-20">
                    <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <Bot className="w-8 h-8 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">LeadForge AI Assistant</h3>
                    <p className="text-muted-foreground max-w-sm mx-auto">
                      I can help you find leads, write campaigns, and analyze your pipeline. What would you like to do?
                    </p>
                  </div>
                ) : (
                  messages?.map(msg => {
                    let parsedCards: any[] = [];
                    if (msg.cards) {
                      try {
                        parsedCards = JSON.parse(msg.cards);
                      } catch (e) {
                        // ignore parse errors
                      }
                    }

                    return (
                      <div key={msg.id} className={`flex gap-4 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-sidebar text-sidebar-foreground"}`}>
                          {msg.role === "user" ? <UserIcon className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                        </div>
                        <div className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"} max-w-[85%]`}>
                          <div className={`px-4 py-2.5 rounded-2xl ${
                            msg.role === "user" 
                              ? "bg-primary text-primary-foreground rounded-tr-sm" 
                              : "bg-muted text-foreground rounded-tl-sm"
                          }`}>
                            <div className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</div>
                          </div>
                          
                          {parsedCards.length > 0 && (
                            <div className="mt-3 space-y-2 w-full">
                              {parsedCards.map((card, idx) => (
                                <div key={idx} className="bg-card border rounded-lg p-3 text-sm shadow-sm">
                                  {card.title && <div className="font-semibold mb-2">{card.title}</div>}
                                  {card.options && card.options.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mt-2">
                                      {card.options.map((opt: string, oIdx: number) => (
                                        <button
                                          key={oIdx}
                                          onClick={() => handleOptionClick(opt)}
                                          className="px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-full transition-colors text-xs font-medium border border-primary/20"
                                        >
                                          {opt}
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          <span className="text-[10px] text-muted-foreground mt-1 mx-1">
                            {format(new Date(msg.createdAt), "h:mm a")}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
                {sendMessage.isPending && (
                  <div className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-sidebar text-sidebar-foreground flex items-center justify-center">
                      <Bot className="w-4 h-4" />
                    </div>
                    <div className="bg-muted text-foreground px-4 py-2.5 rounded-2xl rounded-tl-sm flex items-center gap-1">
                      <div className="w-1.5 h-1.5 bg-foreground/40 rounded-full animate-bounce" />
                      <div className="w-1.5 h-1.5 bg-foreground/40 rounded-full animate-bounce [animation-delay:0.2s]" />
                      <div className="w-1.5 h-1.5 bg-foreground/40 rounded-full animate-bounce [animation-delay:0.4s]" />
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            <div className="p-4 bg-background border-t">
              {autoProceedTimer !== null && (
                <div className="max-w-3xl mx-auto mb-2 flex items-center justify-end text-xs text-muted-foreground">
                  <Timer className="w-3 h-3 mr-1" />
                  Auto-proceeding in {autoProceedTimer}s...
                  <button 
                    onClick={() => setAutoProceedTimer(null)}
                    className="ml-2 text-primary hover:underline"
                  >
                    Cancel
                  </button>
                </div>
              )}
              <form onSubmit={handleSendMessage} className="max-w-3xl mx-auto relative flex items-center">
                <Input 
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="Ask AI to find leads or draft an email..."
                  className="pr-12 py-6 rounded-full bg-muted/50 border-muted focus-visible:ring-primary/20"
                  disabled={sendMessage.isPending || autoProceedTimer !== null}
                  data-testid="input-chat-message"
                />
                <Button 
                  type="submit" 
                  size="icon" 
                  className="absolute right-1.5 w-9 h-9 rounded-full"
                  disabled={!inputMessage.trim() || sendMessage.isPending || autoProceedTimer !== null}
                  data-testid="button-send-chat"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
