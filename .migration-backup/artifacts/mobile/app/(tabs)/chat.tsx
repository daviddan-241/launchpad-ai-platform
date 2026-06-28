import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useCallback, useRef, useState } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { askAI, LEADFORGE_SYSTEM } from "@/lib/ai";
import { useColors } from "@/hooks/useColors";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  ts: number;
};

const QUICK_PROMPTS = [
  "How should I qualify this lead?",
  "Write a cold email opener",
  "Objection: 'Not the right time'",
  "What's the best follow-up cadence?",
];

export default function ChatScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const listRef = useRef<FlatList<Message>>(null);

  function makeId() {
    return Date.now().toString() + Math.random().toString(36).substring(2, 6);
  }

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const userMsg: Message = { id: makeId(), role: "user", content: trimmed, ts: Date.now() };
    setMessages(prev => [userMsg, ...prev]);
    setInput("");
    setLoading(true);

    const capturedMessages = [userMsg, ...messages];
    const history = capturedMessages
      .slice(0, 10)
      .reverse()
      .map(m => `${m.role === "user" ? "User" : "LeadForge AI"}: ${m.content}`)
      .join("\n");

    const prompt = history
      ? `Previous conversation:\n${history}\n\nUser: ${trimmed}`
      : trimmed;

    try {
      const reply = await askAI({ system: LEADFORGE_SYSTEM, prompt, maxTokens: 500 });
      const assistantMsg: Message = { id: makeId(), role: "assistant", content: reply, ts: Date.now() };
      setMessages(prev => [assistantMsg, ...prev]);
    } catch {
      const errMsg: Message = { id: makeId(), role: "assistant", content: "Failed to reach AI. Check your EXPO_PUBLIC_GEMINI_API_KEY or EXPO_PUBLIC_GROQ_API_KEY.", ts: Date.now() };
      setMessages(prev => [errMsg, ...prev]);
    } finally {
      setLoading(false);
    }
  }, [loading, messages]);

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior="padding"
      keyboardVerticalOffset={0}
    >
      <View style={[styles.header, { paddingTop: topInset + 12 }]}>
        <View style={[styles.aiDot, { backgroundColor: colors.positive }]} />
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>LeadForge AI</Text>
      </View>

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={item => item.id}
        inverted
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        showsVerticalScrollIndicator={false}
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        scrollEnabled={!!messages.length}
        ListFooterComponent={
          messages.length === 0 ? (
            <View style={styles.emptyArea}>
              <View style={[styles.aiIcon, { backgroundColor: colors.primary + "22", borderColor: colors.primary + "40" }]}>
                <Feather name="zap" size={28} color={colors.primary} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>LeadForge AI</Text>
              <Text style={[styles.emptyHint, { color: colors.mutedForeground }]}>Your AI sales assistant. Ask anything about leads, outreach, and pipeline.</Text>
              <View style={styles.quickPromptsWrap}>
                {QUICK_PROMPTS.map(p => (
                  <Pressable
                    key={p}
                    style={[styles.quickPrompt, { backgroundColor: colors.card, borderColor: colors.border }]}
                    onPress={() => sendMessage(p)}
                  >
                    <Text style={[styles.quickPromptText, { color: colors.foreground }]}>{p}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : null
        }
        ListHeaderComponent={
          loading ? (
            <View style={[styles.bubble, styles.assistantBubble, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.bubbleText, { color: colors.mutedForeground }]}>Thinking…</Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <View style={[
            styles.bubble,
            item.role === "user"
              ? [styles.userBubble, { backgroundColor: colors.primary }]
              : [styles.assistantBubble, { backgroundColor: colors.card, borderColor: colors.border }]
          ]}>
            <Text style={[styles.bubbleText, { color: item.role === "user" ? "#fff" : colors.foreground }]}>
              {item.content}
            </Text>
          </View>
        )}
      />

      <View style={[styles.inputArea, { borderTopColor: colors.border, paddingBottom: bottomInset + 80 }]}>
        <View style={[styles.inputWrap, { backgroundColor: colors.muted, borderColor: colors.border }]}>
          <TextInput
            style={[styles.input, { color: colors.foreground }]}
            value={input}
            onChangeText={setInput}
            placeholder="Ask LeadForge AI…"
            placeholderTextColor={colors.mutedForeground}
            multiline
            returnKeyType="send"
            onSubmitEditing={() => sendMessage(input)}
            blurOnSubmit={false}
          />
          <Pressable
            style={[styles.sendBtn, { backgroundColor: input.trim() && !loading ? colors.primary : colors.muted }]}
            onPress={() => sendMessage(input)}
            disabled={!input.trim() || loading}
          >
            <Feather name="send" size={16} color={input.trim() && !loading ? "#fff" : colors.mutedForeground} />
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 20, paddingBottom: 12 },
  aiDot: { width: 8, height: 8, borderRadius: 4 },
  headerTitle: { fontSize: 17, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  emptyArea: { alignItems: "center", paddingTop: 40, paddingHorizontal: 24, gap: 12 },
  aiIcon: { width: 64, height: 64, borderRadius: 32, borderWidth: 1, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  emptyTitle: { fontSize: 20, fontWeight: "700", fontFamily: "Inter_700Bold" },
  emptyHint: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  quickPromptsWrap: { width: "100%", gap: 8, marginTop: 8 },
  quickPrompt: { padding: 14, borderRadius: 14, borderWidth: 1 },
  quickPromptText: { fontSize: 14, fontWeight: "500" },
  bubble: { maxWidth: "88%", borderRadius: 18, padding: 14 },
  userBubble: { alignSelf: "flex-end", borderBottomRightRadius: 4 },
  assistantBubble: { alignSelf: "flex-start", borderBottomLeftRadius: 4, borderWidth: 1 },
  bubbleText: { fontSize: 15, lineHeight: 22 },
  inputArea: { borderTopWidth: 1, paddingTop: 10, paddingHorizontal: 16 },
  inputWrap: { flexDirection: "row", alignItems: "flex-end", borderRadius: 20, borderWidth: 1, paddingLeft: 14, paddingRight: 6, paddingVertical: 6, gap: 6 },
  input: { flex: 1, fontSize: 15, maxHeight: 100, paddingVertical: 4 },
  sendBtn: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
});
