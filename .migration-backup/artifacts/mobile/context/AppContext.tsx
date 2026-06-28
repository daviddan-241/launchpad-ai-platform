import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

export type LeadStage = "New" | "Researching" | "Contacted" | "Meeting" | "Qualified";

export type Lead = {
  id: string;
  name: string;
  title: string;
  company: string;
  industry: string;
  email: string;
  fitScore: number;
  intentScore: number;
  stage: LeadStage;
  nextStep: string;
  tags: string[];
  recentSignal: string;
  lastTouched: string;
  notes: string;
};

export type InboxMessage = {
  id: string;
  from: string;
  company: string;
  subject: string;
  preview: string;
  sentiment: "Positive" | "Neutral" | "At Risk";
  receivedAt: string;
  expanded?: boolean;
  replySent?: boolean;
};

export type Task = {
  id: string;
  title: string;
  priority: "High" | "Medium" | "Low";
  due: string;
  done: boolean;
};

type AppContextType = {
  leads: Lead[];
  inbox: InboxMessage[];
  tasks: Task[];
  addLead: (lead: Omit<Lead, "id" | "lastTouched">) => void;
  updateLead: (id: string, updates: Partial<Lead>) => void;
  deleteLead: (id: string) => void;
  addInboxMessage: (msg: Omit<InboxMessage, "id">) => void;
  markReplySent: (id: string) => void;
  addTask: (task: Omit<Task, "id" | "done">) => void;
  toggleTask: (id: string) => void;
};

const AppContext = createContext<AppContextType | null>(null);

const LEADS_KEY = "lf:leads";
const INBOX_KEY = "lf:inbox";
const TASKS_KEY = "lf:tasks";

function makeId(): string {
  return Date.now().toString() + Math.random().toString(36).substring(2, 7);
}

export function AppContextProvider({ children }: { children: React.ReactNode }) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [inbox, setInbox] = useState<InboxMessage[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const [l, i, t] = await Promise.all([
          AsyncStorage.getItem(LEADS_KEY),
          AsyncStorage.getItem(INBOX_KEY),
          AsyncStorage.getItem(TASKS_KEY),
        ]);
        if (l) setLeads(JSON.parse(l));
        if (i) setInbox(JSON.parse(i));
        if (t) setTasks(JSON.parse(t));
      } catch { /* ignore storage errors */ }
    })();
  }, []);

  const saveLeads = useCallback(async (data: Lead[]) => {
    setLeads(data);
    await AsyncStorage.setItem(LEADS_KEY, JSON.stringify(data));
  }, []);

  const saveInbox = useCallback(async (data: InboxMessage[]) => {
    setInbox(data);
    await AsyncStorage.setItem(INBOX_KEY, JSON.stringify(data));
  }, []);

  const saveTasks = useCallback(async (data: Task[]) => {
    setTasks(data);
    await AsyncStorage.setItem(TASKS_KEY, JSON.stringify(data));
  }, []);

  const addLead = useCallback((lead: Omit<Lead, "id" | "lastTouched">) => {
    const newLead: Lead = { ...lead, id: makeId(), lastTouched: "just now" };
    saveLeads((prev: Lead[]) => [newLead, ...prev] as unknown as Lead[]);
    setLeads(prev => {
      const updated = [newLead, ...prev];
      AsyncStorage.setItem(LEADS_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const updateLead = useCallback((id: string, updates: Partial<Lead>) => {
    setLeads(prev => {
      const updated = prev.map(l => l.id === id ? { ...l, ...updates, lastTouched: "just now" } : l);
      AsyncStorage.setItem(LEADS_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const deleteLead = useCallback((id: string) => {
    setLeads(prev => {
      const updated = prev.filter(l => l.id !== id);
      AsyncStorage.setItem(LEADS_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const addInboxMessage = useCallback((msg: Omit<InboxMessage, "id">) => {
    const newMsg: InboxMessage = { ...msg, id: makeId() };
    setInbox(prev => {
      const updated = [newMsg, ...prev];
      AsyncStorage.setItem(INBOX_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const markReplySent = useCallback((id: string) => {
    setInbox(prev => {
      const updated = prev.map(m => m.id === id ? { ...m, replySent: true } : m);
      AsyncStorage.setItem(INBOX_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const addTask = useCallback((task: Omit<Task, "id" | "done">) => {
    const newTask: Task = { ...task, id: makeId(), done: false };
    setTasks(prev => {
      const updated = [newTask, ...prev];
      AsyncStorage.setItem(TASKS_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const toggleTask = useCallback((id: string) => {
    setTasks(prev => {
      const updated = prev.map(t => t.id === id ? { ...t, done: !t.done } : t);
      AsyncStorage.setItem(TASKS_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  return (
    <AppContext.Provider value={{
      leads, inbox, tasks,
      addLead, updateLead, deleteLead,
      addInboxMessage, markReplySent,
      addTask, toggleTask,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppContextProvider");
  return ctx;
}
