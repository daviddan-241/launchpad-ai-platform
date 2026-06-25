import { useGetChatSessions } from "@workspace/api-client-react";
import { Card } from "@/components/ui/card";
import { MessageSquare, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Chat() {
  const { data: sessions, isLoading } = useGetChatSessions();

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col md:flex-row gap-6">
      {/* Sidebar */}
      <Card className="w-full md:w-80 flex flex-col overflow-hidden h-full">
        <div className="p-4 border-b flex items-center justify-between bg-muted/30">
          <h2 className="font-semibold">Chat Sessions</h2>
          <Button size="icon" variant="ghost" className="h-8 w-8"><Plus className="w-4 h-4" /></Button>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {isLoading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">Loading...</div>
          ) : sessions?.length ? (
            sessions.map(s => (
              <div key={s.id} className="p-3 hover:bg-muted rounded-md cursor-pointer flex items-center gap-3">
                <MessageSquare className="w-4 h-4 text-primary" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{s.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{s.messageCount} messages</p>
                </div>
              </div>
            ))
          ) : (
            <div className="p-4 text-center text-sm text-muted-foreground">No sessions yet.</div>
          )}
        </div>
      </Card>

      {/* Main Chat Area */}
      <Card className="flex-1 flex flex-col h-full">
        <div className="flex-1 flex items-center justify-center text-muted-foreground flex-col gap-4">
          <MessageSquare className="w-12 h-12 opacity-20" />
          <p>Select a session or start a new chat</p>
          <Button><Plus className="w-4 h-4 mr-2" /> New Chat</Button>
        </div>
      </Card>
    </div>
  );
}
