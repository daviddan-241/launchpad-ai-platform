import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useCallback, useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { InboxMessage, useApp } from "@/context/AppContext";
import { askAI, LEADFORGE_SYSTEM } from "@/lib/ai";
import { useColors } from "@/hooks/useColors";

const SENTIMENT_COLORS = {
  Positive: "#10b981",
  Neutral: "#8b7a9e",
  "At Risk": "#ef4444",
};

function AddMessageModal({ visible, onClose, onSave, colors }: {
  visible: boolean;
  onClose: () => void;
  onSave: (msg: Omit<InboxMessage, "id">) => void;
  colors: ReturnType<typeof useColors>;
}) {
  const [from, setFrom] = useState("");
  const [company, setCompany] = useState("");
  const [subject, setSubject] = useState("");
  const [preview, setPreview] = useState("");

  function handleSave() {
    if (!from.trim() || !subject.trim()) {
      Alert.alert("Required", "From and Subject are required.");
      return;
    }
    onSave({
      from: from.trim(),
      company: company.trim() || "Unknown",
      subject: subject.trim(),
      preview: preview.trim() || subject.trim(),
      sentiment: "Neutral",
      receivedAt: "just now",
      replySent: false,
    });
    setFrom(""); setCompany(""); setSubject(""); setPreview("");
    onClose();
  }

  const inputStyle = [styles.input, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border }];
  const labelStyle = [styles.label, { color: colors.mutedForeground }];

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
        <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
          <Pressable onPress={onClose}><Text style={[styles.modalAction, { color: colors.mutedForeground }]}>Cancel</Text></Pressable>
          <Text style={[styles.modalTitle, { color: colors.foreground }]}>Log Message</Text>
          <Pressable onPress={handleSave}><Text style={[styles.modalAction, { color: colors.primary }]}>Save</Text></Pressable>
        </View>
        <ScrollView contentContainerStyle={{ padding: 20, gap: 4 }} keyboardShouldPersistTaps="handled">
          <Text style={labelStyle}>From *</Text>
          <TextInput style={inputStyle} value={from} onChangeText={setFrom} placeholder="Prospect name" placeholderTextColor={colors.mutedForeground} />
          <Text style={labelStyle}>Company</Text>
          <TextInput style={inputStyle} value={company} onChangeText={setCompany} placeholder="Acme Corp" placeholderTextColor={colors.mutedForeground} />
          <Text style={labelStyle}>Subject *</Text>
          <TextInput style={inputStyle} value={subject} onChangeText={setSubject} placeholder="Re: Your outreach" placeholderTextColor={colors.mutedForeground} />
          <Text style={labelStyle}>Message Preview</Text>
          <TextInput style={[inputStyle, { height: 100, textAlignVertical: "top" }]} value={preview} onChangeText={setPreview} placeholder="Paste the message or key points…" placeholderTextColor={colors.mutedForeground} multiline />
        </ScrollView>
      </View>
    </Modal>
  );
}

function MessageCard({ msg, colors, onMarkReply, onDelete }: {
  msg: InboxMessage;
  colors: ReturnType<typeof useColors>;
  onMarkReply: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [aiReply, setAiReply] = useState("");
  const [loadingReply, setLoadingReply] = useState(false);

  const generateReply = useCallback(async () => {
    setLoadingReply(true);
    try {
      const reply = await askAI({
        system: LEADFORGE_SYSTEM + "\nWrite a concise, personalized 2-3 sentence reply to this prospect email. No subject line or greeting. Just the reply body.",
        prompt: `From: ${msg.from} (${msg.company})\nSubject: ${msg.subject}\nMessage: ${msg.preview}`,
        maxTokens: 200,
      });
      setAiReply(reply);
    } finally {
      setLoadingReply(false);
    }
  }, [msg]);

  const sentimentColor = SENTIMENT_COLORS[msg.sentiment];

  return (
    <Pressable
      style={[styles.msgCard, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setExpanded(e => !e);
      }}
    >
      <View style={styles.msgTop}>
        <View style={{ flex: 1 }}>
          <View style={styles.msgFromRow}>
            <Text style={[styles.msgFrom, { color: colors.foreground }]}>{msg.from}</Text>
            {msg.replySent && <View style={[styles.repliedBadge, { backgroundColor: colors.positive + "22" }]}>
              <Text style={[styles.repliedText, { color: colors.positive }]}>Replied</Text>
            </View>}
          </View>
          <Text style={[styles.msgCompany, { color: colors.mutedForeground }]}>{msg.company} · {msg.receivedAt}</Text>
        </View>
        <View style={[styles.sentimentBadge, { backgroundColor: sentimentColor + "22" }]}>
          <Text style={[styles.sentimentText, { color: sentimentColor }]}>{msg.sentiment}</Text>
        </View>
      </View>
      <Text style={[styles.msgSubject, { color: colors.foreground }]}>{msg.subject}</Text>
      <Text style={[styles.msgPreview, { color: colors.mutedForeground }]} numberOfLines={expanded ? 0 : 2}>{msg.preview}</Text>

      {expanded && (
        <View style={styles.expandedArea}>
          {aiReply ? (
            <View style={[styles.replyBox, { backgroundColor: colors.muted, borderColor: colors.border }]}>
              <Text style={[styles.replyLabel, { color: colors.primary }]}>AI Reply Suggestion</Text>
              <Text style={[styles.replyText, { color: colors.foreground }]}>{aiReply}</Text>
              <View style={styles.replyActions}>
                <Pressable
                  style={[styles.replyBtn, { backgroundColor: colors.primary }]}
                  onPress={() => { onMarkReply(msg.id); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); }}
                >
                  <Feather name="check" size={13} color="#fff" />
                  <Text style={styles.replyBtnText}>Mark as Replied</Text>
                </Pressable>
                <Pressable
                  style={[styles.replyBtnOutline, { borderColor: colors.border }]}
                  onPress={generateReply}
                >
                  <Feather name="refresh-cw" size={13} color={colors.mutedForeground} />
                </Pressable>
              </View>
            </View>
          ) : (
            <Pressable
              style={[styles.generateBtn, { borderColor: colors.primary + "60", backgroundColor: colors.primary + "11" }]}
              onPress={generateReply}
              disabled={loadingReply}
            >
              <Feather name="zap" size={14} color={colors.primary} />
              <Text style={[styles.generateText, { color: colors.primary }]}>
                {loadingReply ? "Generating reply…" : "Generate AI reply"}
              </Text>
            </Pressable>
          )}
          <Pressable
            style={styles.deleteLink}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); onDelete(msg.id); }}
          >
            <Text style={[styles.deleteLinkText, { color: colors.destructive }]}>Delete message</Text>
          </Pressable>
        </View>
      )}
    </Pressable>
  );
}

export default function InboxScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { inbox, addInboxMessage, markReplySent } = useApp();
  const [addVisible, setAddVisible] = useState(false);
  const [messages, setMessages] = useState(inbox);

  const topInset = Platform.OS === "web" ? 67 : insets.top;

  const currentInbox = inbox;

  function handleDelete(id: string) {
    Alert.alert("Delete Message", "Remove this message?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => {
        const { updateStore: _ } = { updateStore: null };
      }},
    ]);
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.headerArea, { paddingTop: topInset + 12 }]}>
        <Text style={[styles.screenTitle, { color: colors.foreground }]}>Inbox</Text>
        <Text style={[styles.screenSub, { color: colors.mutedForeground }]}>
          {currentInbox.filter(m => !m.replySent).length} pending replies
        </Text>
      </View>

      <FlatList
        data={currentInbox}
        keyExtractor={item => item.id}
        scrollEnabled={!!currentInbox.length}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 100 }
        ]}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="mail" size={36} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No messages</Text>
            <Text style={[styles.emptyHint, { color: colors.mutedForeground }]}>Log prospect replies to get AI reply suggestions</Text>
          </View>
        }
        renderItem={({ item }) => (
          <MessageCard
            msg={item}
            colors={colors}
            onMarkReply={markReplySent}
            onDelete={handleDelete}
          />
        )}
      />

      <Pressable
        style={[styles.fab, { backgroundColor: colors.primary }]}
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setAddVisible(true); }}
      >
        <Feather name="plus" size={24} color="#fff" />
      </Pressable>

      <AddMessageModal
        visible={addVisible}
        onClose={() => setAddVisible(false)}
        onSave={addInboxMessage}
        colors={colors}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerArea: { paddingHorizontal: 16, paddingBottom: 12 },
  screenTitle: { fontSize: 26, fontWeight: "700", fontFamily: "Inter_700Bold" },
  screenSub: { fontSize: 13, marginTop: 2 },
  list: { padding: 16, gap: 10 },
  msgCard: { borderRadius: 18, borderWidth: 1, padding: 14, gap: 8 },
  msgTop: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  msgFromRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  msgFrom: { fontSize: 15, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  repliedBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 20 },
  repliedText: { fontSize: 10, fontWeight: "600" },
  msgCompany: { fontSize: 12, marginTop: 2 },
  sentimentBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  sentimentText: { fontSize: 11, fontWeight: "600" },
  msgSubject: { fontSize: 14, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  msgPreview: { fontSize: 13, lineHeight: 19 },
  expandedArea: { gap: 10, marginTop: 4 },
  replyBox: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 8 },
  replyLabel: { fontSize: 11, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 },
  replyText: { fontSize: 14, lineHeight: 20 },
  replyActions: { flexDirection: "row", gap: 8, marginTop: 4 },
  replyBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, flex: 1 },
  replyBtnText: { color: "#fff", fontSize: 13, fontWeight: "600" },
  replyBtnOutline: { borderWidth: 1, borderRadius: 20, width: 36, alignItems: "center", justifyContent: "center" },
  generateBtn: { flexDirection: "row", alignItems: "center", gap: 6, padding: 12, borderRadius: 14, borderWidth: 1 },
  generateText: { fontSize: 14, fontWeight: "500" },
  deleteLink: { alignItems: "center", paddingVertical: 4 },
  deleteLinkText: { fontSize: 13 },
  empty: { alignItems: "center", paddingTop: 80, gap: 8 },
  emptyTitle: { fontSize: 17, fontWeight: "600" },
  emptyHint: { fontSize: 13, textAlign: "center", paddingHorizontal: 32 },
  fab: { position: "absolute", bottom: 100, right: 20, width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center", shadowColor: "#d946ef", shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 8 },
  modalContainer: { flex: 1 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, borderBottomWidth: 1 },
  modalTitle: { fontSize: 16, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  modalAction: { fontSize: 15, fontWeight: "500" },
  label: { fontSize: 12, marginTop: 12, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 },
  input: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
});
