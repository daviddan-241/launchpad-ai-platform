import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Lead, LeadStage, useApp } from "@/context/AppContext";
import { askAI, LEADFORGE_SYSTEM } from "@/lib/ai";
import { useColors } from "@/hooks/useColors";

const STAGES: LeadStage[] = ["New", "Researching", "Contacted", "Meeting", "Qualified"];
const STAGE_COLORS: Record<LeadStage, string> = {
  New: "#6b7280",
  Researching: "#3b82f6",
  Contacted: "#f59e0b",
  Meeting: "#9333ea",
  Qualified: "#059669",
};

function StageProgress({ current, colors }: { current: LeadStage; colors: ReturnType<typeof useColors> }) {
  const idx = STAGES.indexOf(current);
  return (
    <View style={stageStyles.wrap}>
      {STAGES.map((s, i) => (
        <React.Fragment key={s}>
          <View style={stageStyles.step}>
            <View style={[
              stageStyles.dot,
              {
                backgroundColor: i <= idx ? colors.primary : colors.border,
                borderColor: i === idx ? colors.primary : "transparent",
              }
            ]}>
              {i < idx && <Feather name="check" size={10} color="#fff" />}
            </View>
            <Text style={[stageStyles.label, { color: i <= idx ? colors.primary : colors.mutedForeground }]}>
              {s}
            </Text>
          </View>
          {i < STAGES.length - 1 && (
            <View style={[stageStyles.line, { backgroundColor: i < idx ? colors.primary : colors.border }]} />
          )}
        </React.Fragment>
      ))}
    </View>
  );
}

const stageStyles = StyleSheet.create({
  wrap: { flexDirection: "row", alignItems: "flex-start", paddingHorizontal: 4 },
  step: { alignItems: "center", gap: 4 },
  dot: { width: 20, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center", borderWidth: 2 },
  label: { fontSize: 9, fontWeight: "500" as const, textAlign: "center", width: 54 },
  line: { flex: 1, height: 2, marginTop: 9 },
});

export default function LeadDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { leads, updateLead, deleteLead } = useApp();

  const lead = leads.find(l => l.id === id);

  const [notes, setNotes] = useState(lead?.notes ?? "");
  const [outreach, setOutreach] = useState("");
  const [loadingOutreach, setLoadingOutreach] = useState(false);
  const [outreachType, setOutreachType] = useState<"email" | "linkedin">("email");

  const topInset = Platform.OS === "web" ? 67 : insets.top;

  const saveNotes = useCallback(() => {
    if (lead) {
      updateLead(lead.id, { notes });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [lead, notes, updateLead]);

  const generateOutreach = useCallback(async () => {
    if (!lead) return;
    setLoadingOutreach(true);
    setOutreach("");
    try {
      const prompt = `Write a ${outreachType === "email" ? "cold email" : "LinkedIn connection request"} for this lead:
Name: ${lead.name}
Title: ${lead.title}
Company: ${lead.company}
Industry: ${lead.industry}
Recent Signal: ${lead.recentSignal || "No specific signal"}
Fit Score: ${lead.fitScore}/100
Notes: ${lead.notes || "None"}

${outreachType === "email"
  ? "Write a short, personalized cold email (subject line + 3-4 sentence body). No placeholders. Reference their signal specifically."
  : "Write a short LinkedIn note (under 300 chars). Personal, not salesy. Reference their signal."}`;

      const result = await askAI({ system: LEADFORGE_SYSTEM, prompt, maxTokens: 300 });
      setOutreach(result);
    } finally {
      setLoadingOutreach(false);
    }
  }, [lead, outreachType]);

  const advanceStage = useCallback(() => {
    if (!lead) return;
    const idx = STAGES.indexOf(lead.stage);
    if (idx < STAGES.length - 1) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      updateLead(lead.id, { stage: STAGES[idx + 1] });
    }
  }, [lead, updateLead]);

  const handleDelete = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert("Delete Lead", `Remove ${lead?.name} permanently?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive", onPress: () => {
          if (lead) { deleteLead(lead.id); router.back(); }
        }
      },
    ]);
  }, [lead, deleteLead, router]);

  if (!lead) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: "center", alignItems: "center" }]}>
        <Text style={{ color: colors.mutedForeground }}>Lead not found</Text>
      </View>
    );
  }

  const stageColor = STAGE_COLORS[lead.stage];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.navBar, { paddingTop: topInset + 8, borderBottomColor: colors.border }]}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color={colors.foreground} />
        </Pressable>
        <Text style={[styles.navTitle, { color: colors.foreground }]} numberOfLines={1}>{lead.name}</Text>
        <Pressable onPress={handleDelete} hitSlop={8}>
          <Feather name="trash-2" size={18} color={colors.destructive} />
        </Pressable>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.content, { paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 20 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.avatar, { backgroundColor: colors.primary + "20" }]}>
            <Text style={[styles.avatarText, { color: colors.primary }]}>
              {lead.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
            </Text>
          </View>
          <Text style={[styles.profileName, { color: colors.foreground }]}>{lead.name}</Text>
          <Text style={[styles.profileTitle, { color: colors.mutedForeground }]}>{lead.title}</Text>
          <Text style={[styles.profileCompany, { color: colors.primary }]}>{lead.company}</Text>
          {lead.email ? <Text style={[styles.profileEmail, { color: colors.mutedForeground }]}>{lead.email}</Text> : null}

          <View style={styles.scoreRow}>
            <View style={[styles.scoreCard, { backgroundColor: colors.primary + "12" }]}>
              <Text style={[styles.scoreValue, { color: colors.primary }]}>{lead.fitScore}</Text>
              <Text style={[styles.scoreLabel, { color: colors.mutedForeground }]}>Fit Score</Text>
            </View>
            <View style={[styles.scoreCard, { backgroundColor: colors.accent + "15" }]}>
              <Text style={[styles.scoreValue, { color: colors.accent }]}>{lead.intentScore}</Text>
              <Text style={[styles.scoreLabel, { color: colors.mutedForeground }]}>Intent Score</Text>
            </View>
            <View style={[styles.scoreCard, { backgroundColor: stageColor + "15" }]}>
              <Text style={[styles.scoreValue, { color: stageColor }]}>{lead.stage}</Text>
              <Text style={[styles.scoreLabel, { color: colors.mutedForeground }]}>Stage</Text>
            </View>
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Pipeline Stage</Text>
          <StageProgress current={lead.stage} colors={colors} />
          {lead.stage !== "Qualified" && (
            <Pressable
              style={[styles.advanceBtn, { backgroundColor: colors.primary }]}
              onPress={advanceStage}
            >
              <Feather name="arrow-right" size={15} color="#fff" />
              <Text style={styles.advanceBtnText}>
                Advance to {STAGES[STAGES.indexOf(lead.stage) + 1]}
              </Text>
            </Pressable>
          )}
        </View>

        {lead.recentSignal ? (
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Recent Signal</Text>
            <Text style={[styles.signalText, { color: colors.mutedForeground }]}>{lead.recentSignal}</Text>
          </View>
        ) : null}

        {lead.nextStep ? (
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Next Step</Text>
            <Text style={[styles.signalText, { color: colors.mutedForeground }]}>{lead.nextStep}</Text>
          </View>
        ) : null}

        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Notes</Text>
          <TextInput
            style={[styles.notesInput, { backgroundColor: colors.muted, color: colors.foreground, borderColor: colors.border }]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Add notes about this lead…"
            placeholderTextColor={colors.mutedForeground}
            multiline
            textAlignVertical="top"
          />
          <Pressable style={[styles.saveBtn, { borderColor: colors.border }]} onPress={saveNotes}>
            <Feather name="save" size={14} color={colors.primary} />
            <Text style={[styles.saveBtnText, { color: colors.primary }]}>Save notes</Text>
          </Pressable>
        </View>

        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>AI Outreach</Text>
          <View style={styles.typeRow}>
            {(["email", "linkedin"] as const).map(t => (
              <Pressable
                key={t}
                style={[styles.typeBtn, {
                  backgroundColor: outreachType === t ? colors.primary : colors.muted,
                  borderColor: outreachType === t ? colors.primary : colors.border,
                }]}
                onPress={() => { setOutreachType(t); setOutreach(""); }}
              >
                <Feather
                  name={t === "email" ? "mail" : "linkedin"}
                  size={13}
                  color={outreachType === t ? "#fff" : colors.mutedForeground}
                />
                <Text style={[styles.typeBtnText, { color: outreachType === t ? "#fff" : colors.mutedForeground }]}>
                  {t === "email" ? "Cold Email" : "LinkedIn"}
                </Text>
              </Pressable>
            ))}
          </View>
          <Pressable
            style={[styles.generateBtn, { backgroundColor: colors.primary + "12", borderColor: colors.primary + "40" }]}
            onPress={generateOutreach}
            disabled={loadingOutreach}
          >
            <Feather name="zap" size={14} color={colors.primary} />
            <Text style={[styles.generateText, { color: colors.primary }]}>
              {loadingOutreach ? "Generating…" : `Draft ${outreachType === "email" ? "cold email" : "LinkedIn note"}`}
            </Text>
          </Pressable>
          {outreach ? (
            <View style={[styles.outreachBox, { backgroundColor: colors.muted, borderColor: colors.border }]}>
              <Text style={[styles.outreachText, { color: colors.foreground }]}>{outreach}</Text>
              <Pressable
                style={[styles.regenBtn, { borderColor: colors.border }]}
                onPress={generateOutreach}
              >
                <Feather name="refresh-cw" size={12} color={colors.mutedForeground} />
                <Text style={[styles.regenText, { color: colors.mutedForeground }]}>Regenerate</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  navBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  backBtn: { padding: 4 },
  navTitle: { flex: 1, fontSize: 16, fontWeight: "600", fontFamily: "Inter_600SemiBold", textAlign: "center", marginHorizontal: 8 },
  content: { padding: 16, gap: 12 },
  profileCard: { borderRadius: 20, borderWidth: 1, padding: 20, alignItems: "center", gap: 6 },
  avatar: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  avatarText: { fontSize: 24, fontWeight: "700", fontFamily: "Inter_700Bold" },
  profileName: { fontSize: 20, fontWeight: "700", fontFamily: "Inter_700Bold" },
  profileTitle: { fontSize: 14 },
  profileCompany: { fontSize: 15, fontWeight: "600" },
  profileEmail: { fontSize: 13 },
  scoreRow: { flexDirection: "row", gap: 10, marginTop: 12, width: "100%" },
  scoreCard: { flex: 1, alignItems: "center", padding: 12, borderRadius: 14, gap: 4 },
  scoreValue: { fontSize: 16, fontWeight: "700" },
  scoreLabel: { fontSize: 11 },
  section: { borderRadius: 18, borderWidth: 1, padding: 16, gap: 12 },
  sectionTitle: { fontSize: 14, fontWeight: "600", fontFamily: "Inter_600SemiBold" },
  signalText: { fontSize: 14, lineHeight: 20 },
  notesInput: { borderRadius: 12, borderWidth: 1, padding: 12, fontSize: 14, minHeight: 80 },
  saveBtn: { flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-end", borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  saveBtnText: { fontSize: 13, fontWeight: "500" },
  advanceBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: 14, paddingVertical: 10, marginTop: 4 },
  advanceBtnText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  typeRow: { flexDirection: "row", gap: 8 },
  typeBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 9, borderRadius: 12, borderWidth: 1 },
  typeBtnText: { fontSize: 13, fontWeight: "500" },
  generateBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, padding: 12, borderRadius: 14, borderWidth: 1 },
  generateText: { fontSize: 14, fontWeight: "500" },
  outreachBox: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 10 },
  outreachText: { fontSize: 14, lineHeight: 22 },
  regenBtn: { flexDirection: "row", alignItems: "center", gap: 5, alignSelf: "flex-end", borderWidth: 1, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  regenText: { fontSize: 12 },
});
